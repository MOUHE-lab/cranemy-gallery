package com.example.portfolio;

import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PortfolioService {
  private static final int PASSWORD_ITERATIONS = 120_000;
  private static final int PASSWORD_KEY_LENGTH = 512;
  private static final String COMMENT_APPROVED = "approved";
  private static final String COMMENT_PENDING = "pending";
  private static final String WORK_APPROVED = "approved";
  private static final String WORK_PENDING = "pending";
  private static final Pattern USERNAME_PATTERN = Pattern.compile("^[\\w\\-\\p{IsHan}]+$");

  private final PortfolioDataStore dataStore;
  private final UploadStorage uploadStorage;
  private final SecureRandom secureRandom = new SecureRandom();

  public PortfolioService(PortfolioDataStore dataStore, UploadStorage uploadStorage) {
    this.dataStore = dataStore;
    this.uploadStorage = uploadStorage;
  }

  public ClientState currentState(HttpSession session) {
    PortfolioData data = dataStore.read();
    return clientState(data, currentUser(data, session));
  }

  public ClientState register(String username, String password, HttpSession session) {
    String trimmedUsername = Objects.toString(username, "").trim();
    String normalizedUsername = normalizeUsername(trimmedUsername);
    validateCredentials(trimmedUsername, password);

    AtomicReference<UserAccount> createdUser = new AtomicReference<>();
    PortfolioData data = dataStore.update(existingData -> {
      boolean exists = existingData.getUsers().stream()
          .anyMatch(user -> normalizedUsername.equals(user.getUsernameKey()));
      if (exists) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "这个账号已经被注册");
      }

      PasswordHash passwordHash = createPasswordHash(password);
      UserAccount nextUser = new UserAccount();
      nextUser.setId(UUID.randomUUID().toString());
      nextUser.setUsername(trimmedUsername);
      nextUser.setUsernameKey(normalizedUsername);
      nextUser.setSalt(passwordHash.salt());
      nextUser.setPasswordHash(passwordHash.hash());
      nextUser.setAdmin(existingData.getUsers().isEmpty());
      nextUser.setDisabled(false);
      nextUser.setCreatedAt(Instant.now().toString());

      existingData.getUsers().add(nextUser);
      createdUser.set(nextUser);
      return existingData;
    });

    signIn(session, createdUser.get());
    return clientState(data, createdUser.get());
  }

  public ClientState login(String username, String password, HttpSession session) {
    PortfolioData data = dataStore.read();
    String usernameKey = normalizeUsername(username);
    UserAccount foundUser = data.getUsers().stream()
        .filter(user -> usernameKey.equals(user.getUsernameKey()))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码不正确"));

    if (!passwordMatches(password, foundUser)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码不正确");
    }
    if (foundUser.isDisabled()) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "账号已被禁用");
    }

    signIn(session, foundUser);
    return clientState(data, foundUser);
  }

  public ClientState logout(HttpSession session) {
    session.invalidate();
    return clientState(dataStore.read(), null);
  }

  public ClientState createWork(
      String title,
      String kind,
      String collectionName,
      String year,
      String summary,
      String body,
      String tags,
      Boolean privateWork,
      MultipartFile image,
      HttpSession session) {
    PortfolioData currentData = dataStore.read();
    UserAccount user = requireUser(currentData, session);
    WorkDraft draft = validateWorkDraft(title, kind, collectionName, year, summary, body, tags);
    UploadStorage.StoredMedia storedMedia = uploadStorage.save(image);

    try {
      PortfolioData updated = dataStore.update(existingData -> {
        int nextFeatured = existingData.getWorks().stream()
            .mapToInt(WorkItem::getFeatured)
            .max()
            .orElse(0) + 1;

        WorkItem work = new WorkItem();
        work.setId(UUID.randomUUID().toString());
        work.setTitle(draft.title());
        work.setKind(draft.kind());
        work.setCollectionName(draft.collectionName());
        work.setYear(draft.year());
        work.setImage(storedMedia.url());
        work.setMediaType(storedMedia.mediaType());
        work.setSummary(draft.summary());
        work.setBody(draft.body());
        work.setTags(draft.tags());
        work.setFeatured(nextFeatured);
        work.setOwnerId(user.getId());
        work.setOwnerName(user.isAdmin() ? "站点" : user.getUsername());
        work.setBuiltIn(false);
        work.setPrivateWork(Boolean.TRUE.equals(privateWork));
        work.setStatus(user.isAdmin() ? WORK_APPROVED : WORK_PENDING);
        work.setCreatedAt(Instant.now().toString());

        existingData.getWorks().add(0, work);
        existingData.getComments().put(work.getId(), new ArrayList<>());
        return existingData;
      });
      return clientState(updated, user);
    } catch (RuntimeException error) {
      uploadStorage.deleteIfUploaded(storedMedia.url());
      throw error;
    }
  }

  public ClientState updateWork(String workId, WorkUpdate update, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount admin = requireAdmin(data, session);
    WorkDraft draft = validateWorkDraft(
        update.title(),
        update.kind(),
        update.collectionName(),
        update.year(),
        update.summary(),
        update.body(),
        update.tags());
    String image = limitOptionalText(update.image(), "图片路径", 0, 300);
    String mediaType = normalizeMediaType(update.mediaType());
    String ownerName = limitText(defaultText(update.ownerName(), "站点"), "上传者", 1, 40);

    PortfolioData updated = dataStore.update(existingData -> {
      WorkItem work = findWork(existingData, workId);
      work.setTitle(draft.title());
      work.setKind(draft.kind());
      work.setCollectionName(draft.collectionName());
      work.setYear(draft.year());
      work.setSummary(draft.summary());
      work.setBody(draft.body());
      work.setTags(draft.tags());
      work.setOwnerName(ownerName);
      if (!image.isEmpty()) {
        work.setImage(image);
      }
      work.setMediaType(mediaType);
      if (update.featured() != null && update.featured() > 0) {
        work.setFeatured(update.featured());
      }
      if (update.privateWork() != null) {
        work.setPrivateWork(update.privateWork());
      }
      return existingData;
    });

    return clientState(updated, admin);
  }

  public ClientState approveWork(String workId, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount admin = requireAdmin(data, session);

    PortfolioData updated = dataStore.update(existingData -> {
      WorkItem work = findWork(existingData, workId);
      work.setStatus(WORK_APPROVED);
      return existingData;
    });

    return clientState(updated, admin);
  }

  public ClientState deleteWork(String workId, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount user = requireUser(data, session);
    WorkItem work = findWork(data, workId);

    if (!user.isAdmin() && work.isBuiltIn()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "内置示例作品只能由管理员删除");
    }
    if (!user.isAdmin() && !user.getId().equals(work.getOwnerId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能删除自己上传的作品");
    }

    String imageUrl = work.getImage();
    PortfolioData updated = dataStore.update(existingData -> {
      existingData.getWorks().removeIf(item -> workId.equals(item.getId()));
      existingData.getComments().remove(workId);
      existingData.getVotes().entrySet().removeIf(entry -> workId.equals(entry.getValue()));
      for (List<String> favorites : existingData.getFavorites().values()) {
        favorites.removeIf(item -> workId.equals(item));
      }
      existingData.getViews().remove(workId);
      return existingData;
    });
    uploadStorage.deleteIfUploaded(imageUrl);
    return clientState(updated, user);
  }

  public ClientState updateUser(String userId, UserAdminUpdate update, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount admin = requireAdmin(data, session);
    UserAccount target = findUser(data, userId);

    Boolean nextAdmin = update.admin();
    Boolean nextDisabled = update.disabled();
    if (nextDisabled != null && nextDisabled && target.getId().equals(admin.getId())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能禁用当前登录的管理员账号");
    }
    if (target.isAdmin()
        && ((nextAdmin != null && !nextAdmin) || (nextDisabled != null && nextDisabled))
        && !hasOtherActiveAdmin(data, target.getId())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "至少需要保留一个可用管理员");
    }

    PortfolioData updated = dataStore.update(existingData -> {
      UserAccount editableUser = findUser(existingData, userId);
      if (nextAdmin != null) {
        editableUser.setAdmin(nextAdmin);
      }
      if (nextDisabled != null) {
        editableUser.setDisabled(nextDisabled);
      }
      return existingData;
    });

    return clientState(updated, findUser(updated, admin.getId()));
  }

  public ClientState deleteComment(String commentId, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount admin = requireAdmin(data, session);
    findComment(data, commentId);

    PortfolioData updated = dataStore.update(existingData -> {
      for (List<CommentEntry> comments : existingData.getComments().values()) {
        comments.removeIf(comment -> commentId.equals(comment.getId()));
      }
      return existingData;
    });

    return clientState(updated, admin);
  }

  public ClientState deleteMyComment(String commentId, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount user = requireUser(data, session);
    CommentLocation location = findComment(data, commentId);
    if (!canDeleteComment(location.comment(), location.work(), user)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能删除自己的留言或自己作品下的留言");
    }

    PortfolioData updated = dataStore.update(existingData -> {
      for (List<CommentEntry> comments : existingData.getComments().values()) {
        comments.removeIf(comment -> commentId.equals(comment.getId()));
      }
      return existingData;
    });

    return clientState(updated, findUser(updated, user.getId()));
  }

  public ClientState approveComment(String commentId, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount admin = requireAdmin(data, session);
    findComment(data, commentId);

    PortfolioData updated = dataStore.update(existingData -> {
      CommentLocation location = findComment(existingData, commentId);
      location.comment().setStatus(COMMENT_APPROVED);
      return existingData;
    });

    return clientState(updated, admin);
  }

  public ClientState addComment(String workId, String text, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount user = requireUser(data, session);
    String trimmedText = Objects.toString(text, "").trim();
    findVisibleWork(data, workId, user);

    if (trimmedText.isEmpty() || trimmedText.length() > 300) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "留言需要在 1 到 300 个字符之间");
    }

    PortfolioData updated = dataStore.update(existingData -> {
      CommentEntry comment = new CommentEntry();
      comment.setId(UUID.randomUUID().toString());
      comment.setUserId(user.getId());
      comment.setUser(user.getUsername());
      comment.setText(trimmedText);
      comment.setStatus(user.isAdmin() ? COMMENT_APPROVED : COMMENT_PENDING);
      comment.setCreatedAt(Instant.now().toString());

      existingData.getComments()
          .computeIfAbsent(workId, ignored -> new ArrayList<>())
          .add(0, comment);
      return existingData;
    });

    return clientState(updated, user);
  }

  public ClientState toggleVote(String workId, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount user = requireUser(data, session);
    findVisibleWork(data, workId, user);

    PortfolioData updated = dataStore.update(existingData -> {
      if (workId.equals(existingData.getVotes().get(user.getId()))) {
        existingData.getVotes().remove(user.getId());
      } else {
        existingData.getVotes().put(user.getId(), workId);
      }
      return existingData;
    });

    return clientState(updated, user);
  }

  public ClientState toggleFavorite(String workId, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount user = requireUser(data, session);
    findVisibleWork(data, workId, user);

    PortfolioData updated = dataStore.update(existingData -> {
      List<String> favorites = existingData.getFavorites()
          .computeIfAbsent(user.getId(), ignored -> new ArrayList<>());
      if (favorites.contains(workId)) {
        favorites.remove(workId);
      } else {
        favorites.add(0, workId);
      }
      return existingData;
    });

    return clientState(updated, user);
  }

  public ClientState recordView(String workId, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount user = currentUser(data, session);
    findVisibleWork(data, workId, user);

    PortfolioData updated = dataStore.update(existingData -> {
      findVisibleWork(existingData, workId, user);
      existingData.getViews().merge(workId, 1, Integer::sum);
      return existingData;
    });

    return clientState(updated, currentUser(updated, session));
  }

  public ClientState updateMyWorkPrivacy(String workId, Boolean privateWork, HttpSession session) {
    PortfolioData data = dataStore.read();
    UserAccount user = requireUser(data, session);
    WorkItem work = findWork(data, workId);
    if (!user.isAdmin() && !user.getId().equals(work.getOwnerId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能修改自己的作品");
    }

    PortfolioData updated = dataStore.update(existingData -> {
      WorkItem editableWork = findWork(existingData, workId);
      editableWork.setPrivateWork(Boolean.TRUE.equals(privateWork));
      return existingData;
    });

    return clientState(updated, findUser(updated, user.getId()));
  }

  private ClientState clientState(PortfolioData data, UserAccount user) {
    Map<String, Integer> voteCounts = new LinkedHashMap<>();
    Map<String, Integer> favoriteCounts = new LinkedHashMap<>();
    Map<String, Integer> viewCounts = new LinkedHashMap<>();
    Map<String, List<CommentView>> comments = new LinkedHashMap<>();
    List<WorkItem> visibleWorks = data.getWorks().stream()
        .filter(work -> canSeeWork(work, user))
        .toList();

    for (WorkItem work : visibleWorks) {
      voteCounts.put(work.getId(), 0);
      favoriteCounts.put(work.getId(), 0);
      viewCounts.put(work.getId(), data.getViews().getOrDefault(work.getId(), 0));
      List<CommentView> views = data.getComments()
          .getOrDefault(work.getId(), List.of())
          .stream()
          .filter(comment -> canSeeComment(comment, work, user))
          .map(comment -> new CommentView(
              comment.getId(),
              comment.getUser(),
              comment.getText(),
              comment.getCreatedAt(),
              comment.getStatus(),
              canDeleteComment(comment, work, user),
              user != null && user.isAdmin() && COMMENT_PENDING.equals(comment.getStatus())))
          .toList();
      comments.put(work.getId(), views);
    }

    for (String votedWorkId : data.getVotes().values()) {
      voteCounts.computeIfPresent(votedWorkId, (ignored, count) -> count + 1);
    }

    for (List<String> favorites : data.getFavorites().values()) {
      for (String favoriteWorkId : favorites) {
        favoriteCounts.computeIfPresent(favoriteWorkId, (ignored, count) -> count + 1);
      }
    }

    List<String> myFavorites = user == null
        ? List.of()
        : data.getFavorites().getOrDefault(user.getId(), List.of())
            .stream()
            .filter(favoriteId -> visibleWorks.stream().anyMatch(work -> work.getId().equals(favoriteId)))
            .toList();

    return new ClientState(
        user == null ? "" : user.getUsername(),
        user != null && user.isAdmin(),
        user != null && user.isAdmin() ? adminUserViews(data) : List.of(),
        visibleWorks.stream()
            .map(work -> toWorkView(work, user))
            .toList(),
        comments,
        voteCounts,
        favoriteCounts,
        viewCounts,
        user == null ? "" : data.getVotes().getOrDefault(user.getId(), ""),
        myFavorites);
  }

  private List<AdminUserView> adminUserViews(PortfolioData data) {
    return data.getUsers().stream()
        .map(user -> new AdminUserView(
            user.getId(),
            user.getUsername(),
            user.isAdmin(),
            user.isDisabled(),
            user.getCreatedAt(),
            countUserWorks(data, user.getId()),
            countUserComments(data, user.getId()),
            data.getFavorites().getOrDefault(user.getId(), List.of()).size()))
        .toList();
  }

  private long countUserWorks(PortfolioData data, String userId) {
    return data.getWorks().stream()
        .filter(work -> userId.equals(work.getOwnerId()))
        .count();
  }

  private long countUserComments(PortfolioData data, String userId) {
    return data.getComments().values().stream()
        .flatMap(List::stream)
        .filter(comment -> userId.equals(comment.getUserId()))
        .count();
  }

  private WorkView toWorkView(WorkItem work, UserAccount user) {
    boolean admin = user != null && user.isAdmin();
    boolean owner = user != null && user.getId().equals(work.getOwnerId());
    boolean canDelete = admin || (!work.isBuiltIn() && owner);
    boolean pending = WORK_PENDING.equals(work.getStatus());
    return new WorkView(
        work.getId(),
        work.getTitle(),
        work.getKind(),
        work.getCollectionName(),
        work.getYear(),
        work.getImage(),
        work.getMediaType(),
        work.getSummary(),
        work.getBody(),
        work.getTags(),
        work.getFeatured(),
        work.getOwnerName(),
        work.isBuiltIn(),
        work.isPrivateWork(),
        work.getStatus(),
        owner,
        canDelete,
        admin,
        admin && pending,
        work.getCreatedAt());
  }

  private boolean canSeeWork(WorkItem work, UserAccount user) {
    boolean admin = user != null && user.isAdmin();
    boolean owner = user != null && user.getId().equals(work.getOwnerId());
    if (!WORK_APPROVED.equals(work.getStatus()) && !admin && !owner) {
      return false;
    }
    return !work.isPrivateWork() || admin || owner;
  }

  private boolean canSeeComment(CommentEntry comment, WorkItem work, UserAccount user) {
    if (COMMENT_APPROVED.equals(comment.getStatus())) {
      return true;
    }
    return user != null
        && (user.isAdmin()
            || user.getId().equals(comment.getUserId())
            || user.getId().equals(work.getOwnerId()));
  }

  private boolean canDeleteComment(CommentEntry comment, WorkItem work, UserAccount user) {
    return user != null
        && (user.isAdmin()
            || user.getId().equals(comment.getUserId())
            || user.getId().equals(work.getOwnerId()));
  }

  private WorkItem findWork(PortfolioData data, String workId) {
    return data.getWorks().stream()
        .filter(work -> work.getId().equals(workId))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "作品不存在"));
  }

  private WorkItem findVisibleWork(PortfolioData data, String workId, UserAccount user) {
    WorkItem work = findWork(data, workId);
    if (!canSeeWork(work, user)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "作品不存在");
    }
    return work;
  }

  private CommentLocation findComment(PortfolioData data, String commentId) {
    for (WorkItem work : data.getWorks()) {
      List<CommentEntry> comments = data.getComments().getOrDefault(work.getId(), List.of());
      for (CommentEntry comment : comments) {
        if (commentId.equals(comment.getId())) {
          return new CommentLocation(work.getId(), work, comment);
        }
      }
    }
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "留言不存在");
  }

  private UserAccount currentUser(PortfolioData data, HttpSession session) {
    Object userId = session.getAttribute("userId");
    if (!(userId instanceof String currentUserId)) {
      return null;
    }

    UserAccount user = data.getUsers().stream()
        .filter(account -> currentUserId.equals(account.getId()))
        .findFirst()
        .orElse(null);
    if (user != null && user.isDisabled()) {
      session.invalidate();
      return null;
    }
    return user;
  }

  private UserAccount findUser(PortfolioData data, String userId) {
    return data.getUsers().stream()
        .filter(user -> user.getId().equals(userId))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "用户不存在"));
  }

  private boolean hasOtherActiveAdmin(PortfolioData data, String userId) {
    return data.getUsers().stream()
        .anyMatch(user -> user.isAdmin() && !user.isDisabled() && !user.getId().equals(userId));
  }

  private UserAccount requireUser(PortfolioData data, HttpSession session) {
    UserAccount user = currentUser(data, session);
    if (user == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录");
    }
    return user;
  }

  private UserAccount requireAdmin(PortfolioData data, HttpSession session) {
    UserAccount user = requireUser(data, session);
    if (!user.isAdmin()) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "需要管理员权限");
    }
    return user;
  }

  private void signIn(HttpSession session, UserAccount user) {
    session.setAttribute("userId", user.getId());
  }

  private void validateCredentials(String username, String password) {
    if (username.length() < 3 || username.length() > 24) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "账号长度需要在 3 到 24 个字符之间");
    }
    if (!USERNAME_PATTERN.matcher(username).matches()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "账号只能包含中文、字母、数字、下划线或短横线");
    }
    if (password == null || password.length() < 6 || password.length() > 128) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "密码长度需要在 6 到 128 个字符之间");
    }
  }

  private WorkDraft validateWorkDraft(
      String title,
      String kind,
      String collectionName,
      String year,
      String summary,
      String body,
      String tags) {
    String defaultYear = String.valueOf(Instant.now().atZone(ZoneId.systemDefault()).getYear());
    String trimmedTitle = limitText(title, "作品标题", 1, 80);
    String trimmedKind = limitText(defaultText(kind, "作品"), "作品类型", 1, 40);
    String trimmedCollectionName = limitOptionalText(collectionName, "合集", 0, 60);
    String trimmedYear = limitText(defaultText(year, defaultYear), "年份", 1, 12);
    String trimmedSummary = limitText(summary, "简介", 1, 160);
    String trimmedBody = limitText(defaultText(body, trimmedSummary), "详细介绍", 1, 1200);
    List<String> parsedTags = parseTags(tags);

    return new WorkDraft(
        trimmedTitle,
        trimmedKind,
        trimmedCollectionName,
        trimmedYear,
        trimmedSummary,
        trimmedBody,
        parsedTags);
  }

  private String limitText(String value, String fieldName, int minLength, int maxLength) {
    String text = Objects.toString(value, "").trim();
    if (text.length() < minLength || text.length() > maxLength) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          fieldName + "需要在 " + minLength + " 到 " + maxLength + " 个字符之间");
    }
    return text;
  }

  private String limitOptionalText(String value, String fieldName, int minLength, int maxLength) {
    String text = Objects.toString(value, "").trim();
    if (!text.isEmpty() && (text.length() < minLength || text.length() > maxLength)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          fieldName + "需要在 " + minLength + " 到 " + maxLength + " 个字符之间");
    }
    return text;
  }

  private String defaultText(String value, String fallback) {
    String text = Objects.toString(value, "").trim();
    return text.isEmpty() ? fallback : text;
  }

  private List<String> parseTags(String tags) {
    String raw = Objects.toString(tags, "").trim();
    if (raw.isEmpty()) {
      return new ArrayList<>();
    }

    List<String> parsed = new ArrayList<>();
    for (String item : raw.split("[,，、\\s]+")) {
      String tag = item.trim();
      if (tag.isEmpty() || parsed.contains(tag)) {
        continue;
      }
      if (tag.length() > 20) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "单个标签不能超过 20 个字符");
      }
      parsed.add(tag);
      if (parsed.size() > 8) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "最多只能填写 8 个标签");
      }
    }
    return parsed;
  }

  private String normalizeUsername(String username) {
    return Objects.toString(username, "").trim().toLowerCase();
  }

  private String normalizeMediaType(String mediaType) {
    return "video".equals(mediaType) ? "video" : "image";
  }

  private PasswordHash createPasswordHash(String password) {
    byte[] salt = new byte[16];
    secureRandom.nextBytes(salt);
    String encodedSalt = Base64.getEncoder().encodeToString(salt);
    return new PasswordHash(encodedSalt, hashPassword(password, encodedSalt));
  }

  private boolean passwordMatches(String password, UserAccount user) {
    String candidateHash = hashPassword(Objects.toString(password, ""), user.getSalt());
    byte[] candidate = candidateHash.getBytes(StandardCharsets.UTF_8);
    byte[] expected = user.getPasswordHash().getBytes(StandardCharsets.UTF_8);
    return MessageDigest.isEqual(candidate, expected);
  }

  private String hashPassword(String password, String encodedSalt) {
    try {
      byte[] salt = Base64.getDecoder().decode(encodedSalt);
      PBEKeySpec spec = new PBEKeySpec(
          Objects.toString(password, "").toCharArray(),
          salt,
          PASSWORD_ITERATIONS,
          PASSWORD_KEY_LENGTH);
      byte[] hash = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512").generateSecret(spec).getEncoded();
      return Base64.getEncoder().encodeToString(hash);
    } catch (GeneralSecurityException error) {
      throw new IllegalStateException("无法处理密码", error);
    }
  }

  private record PasswordHash(String salt, String hash) {
  }

  private record WorkDraft(
      String title,
      String kind,
      String collectionName,
      String year,
      String summary,
      String body,
      List<String> tags) {
  }

  public record WorkUpdate(
      String title,
      String kind,
      String collectionName,
      String year,
      String image,
      String mediaType,
      String summary,
      String body,
      String tags,
      String ownerName,
      Boolean privateWork,
      Integer featured) {
  }

  public record UserAdminUpdate(Boolean admin, Boolean disabled) {
  }

  public record ClientState(
      String currentUser,
      boolean admin,
      List<AdminUserView> adminUsers,
      List<WorkView> works,
      Map<String, List<CommentView>> comments,
      Map<String, Integer> voteCounts,
      Map<String, Integer> favoriteCounts,
      Map<String, Integer> viewCounts,
      String myVote,
      List<String> myFavorites) {
  }

  public record AdminUserView(
      String id,
      String username,
      boolean admin,
      boolean disabled,
      String createdAt,
      long workCount,
      long commentCount,
      long favoriteCount) {
  }

  public record WorkView(
      String id,
      String title,
      String kind,
      String collectionName,
      String year,
      String image,
      String mediaType,
      String summary,
      String body,
      List<String> tags,
      int featured,
      String ownerName,
      boolean builtIn,
      boolean privateWork,
      String status,
      boolean ownedByMe,
      boolean canDelete,
      boolean canEdit,
      boolean canApprove,
      String createdAt) {
  }

  public record CommentView(
      String id,
      String user,
      String text,
      String createdAt,
      String status,
      boolean canDelete,
      boolean canApprove) {
  }

  private record CommentLocation(String workId, WorkItem work, CommentEntry comment) {
  }
}
