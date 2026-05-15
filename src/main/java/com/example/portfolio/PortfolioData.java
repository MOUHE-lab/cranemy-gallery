package com.example.portfolio;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class PortfolioData {
  private List<UserAccount> users = new ArrayList<>();
  private List<WorkItem> works = new ArrayList<>();
  private Map<String, List<CommentEntry>> comments = new LinkedHashMap<>();
  private Map<String, String> votes = new LinkedHashMap<>();
  private Map<String, List<String>> favorites = new LinkedHashMap<>();
  private Map<String, Integer> views = new LinkedHashMap<>();
  private boolean defaultsSeeded;

  public List<UserAccount> getUsers() {
    return users;
  }

  public void setUsers(List<UserAccount> users) {
    this.users = users;
  }

  public List<WorkItem> getWorks() {
    return works;
  }

  public void setWorks(List<WorkItem> works) {
    this.works = works;
  }

  public Map<String, List<CommentEntry>> getComments() {
    return comments;
  }

  public void setComments(Map<String, List<CommentEntry>> comments) {
    this.comments = comments;
  }

  public Map<String, String> getVotes() {
    return votes;
  }

  public void setVotes(Map<String, String> votes) {
    this.votes = votes;
  }

  public Map<String, List<String>> getFavorites() {
    return favorites;
  }

  public void setFavorites(Map<String, List<String>> favorites) {
    this.favorites = favorites;
  }

  public Map<String, Integer> getViews() {
    return views;
  }

  public void setViews(Map<String, Integer> views) {
    this.views = views;
  }

  public boolean isDefaultsSeeded() {
    return defaultsSeeded;
  }

  public void setDefaultsSeeded(boolean defaultsSeeded) {
    this.defaultsSeeded = defaultsSeeded;
  }

  public void normalize() {
    if (users == null) {
      users = new ArrayList<>();
    }
    if (works == null) {
      works = new ArrayList<>();
    }
    if (!defaultsSeeded && works.isEmpty()) {
      works.addAll(WorkCatalog.defaultWorks());
      defaultsSeeded = true;
    } else if (!works.isEmpty()) {
      defaultsSeeded = true;
    }
    if (comments == null) {
      comments = new LinkedHashMap<>();
    }
    if (votes == null) {
      votes = new LinkedHashMap<>();
    }
    if (favorites == null) {
      favorites = new LinkedHashMap<>();
    }
    if (views == null) {
      views = new LinkedHashMap<>();
    }
    if (!users.isEmpty() && users.stream().noneMatch(UserAccount::isAdmin)) {
      users.get(0).setAdmin(true);
    }

    for (WorkItem work : works) {
      if (work.getTags() == null) {
        work.setTags(new ArrayList<>());
      }
      if (work.getCollectionName() == null) {
        work.setCollectionName("");
      }
      if (!"video".equals(work.getMediaType())) {
        work.setMediaType("image");
      }
      if (!"pending".equals(work.getStatus()) && !"approved".equals(work.getStatus())) {
        work.setStatus("approved");
      }
    }

    Set<String> workIds = works.stream()
        .map(WorkItem::getId)
        .collect(Collectors.toCollection(LinkedHashSet::new));

    comments.keySet().removeIf(workId -> !workIds.contains(workId));
    for (String workId : workIds) {
      comments.computeIfAbsent(workId, ignored -> new ArrayList<>());
      views.putIfAbsent(workId, 0);
    }
    for (List<CommentEntry> commentList : comments.values()) {
      for (CommentEntry comment : commentList) {
        if (!"pending".equals(comment.getStatus()) && !"approved".equals(comment.getStatus())) {
          comment.setStatus("approved");
        }
      }
    }

    votes.entrySet().removeIf(entry -> !workIds.contains(entry.getValue()));
    for (List<String> favoriteIds : favorites.values()) {
      favoriteIds.removeIf(workId -> !workIds.contains(workId));
    }
    views.entrySet().removeIf(entry -> !workIds.contains(entry.getKey()));
    views.replaceAll((ignored, count) -> Math.max(0, count == null ? 0 : count));
  }
}
