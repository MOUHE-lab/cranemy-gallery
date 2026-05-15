package com.example.portfolio;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.UnaryOperator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionTemplate;

@Repository
@ConditionalOnProperty(name = "portfolio.storage", havingValue = "mysql")
public class MySqlPortfolioDataStore implements PortfolioDataStore {
  private final JdbcTemplate jdbcTemplate;
  private final TransactionTemplate transactionTemplate;

  public MySqlPortfolioDataStore(JdbcTemplate jdbcTemplate, TransactionTemplate transactionTemplate) {
    this.jdbcTemplate = jdbcTemplate;
    this.transactionTemplate = transactionTemplate;
    ensureSchema();
  }

  @Override
  public synchronized PortfolioData read() {
    ensureSchema();
    PortfolioData data = transactionTemplate.execute(status -> readSnapshot());
    if (data == null) {
      data = new PortfolioData();
    }

    boolean hadNoWorks = data.getWorks().isEmpty();
    data.normalize();
    if (hadNoWorks && !data.getWorks().isEmpty()) {
      PortfolioData seeded = data;
      transactionTemplate.executeWithoutResult(status -> replaceAll(seeded));
    }
    return data;
  }

  @Override
  public synchronized PortfolioData update(UnaryOperator<PortfolioData> updater) {
    ensureSchema();
    return transactionTemplate.execute(status -> {
      PortfolioData data = readSnapshot();
      data.normalize();
      PortfolioData updated = updater.apply(data);
      updated.normalize();
      replaceAll(updated);
      return updated;
    });
  }

  private PortfolioData readSnapshot() {
    PortfolioData data = new PortfolioData();
    data.setDefaultsSeeded(readDefaultsSeeded());
    data.setUsers(jdbcTemplate.query(
        "select id, username, username_key, salt, password_hash, admin, disabled, created_at from portfolio_users order by created_at",
        (rs, rowNum) -> mapUser(rs)));
    data.setWorks(jdbcTemplate.query(
        "select id, title, kind, collection_name, year_value, image, media_type, summary, body, featured, owner_id, owner_name, built_in, private_work, status, created_at from portfolio_works order by featured, created_at",
        (rs, rowNum) -> mapWork(rs)));

    Map<String, WorkItem> worksById = new LinkedHashMap<>();
    for (WorkItem work : data.getWorks()) {
      worksById.put(work.getId(), work);
    }
    jdbcTemplate.query(
        "select work_id, tag from portfolio_work_tags order by work_id, tag_order",
        (RowCallbackHandler) rs -> {
          WorkItem work = worksById.get(rs.getString("work_id"));
          if (work != null) {
            work.getTags().add(rs.getString("tag"));
          }
        });

    Map<String, List<CommentEntry>> comments = new LinkedHashMap<>();
    jdbcTemplate.query(
        "select id, work_id, user_id, user_name, text, status, created_at from portfolio_comments order by created_at desc",
        (RowCallbackHandler) rs -> {
          CommentEntry comment = new CommentEntry();
          comment.setId(rs.getString("id"));
          comment.setUserId(rs.getString("user_id"));
          comment.setUser(rs.getString("user_name"));
          comment.setText(rs.getString("text"));
          comment.setStatus(rs.getString("status"));
          comment.setCreatedAt(rs.getString("created_at"));
          comments.computeIfAbsent(rs.getString("work_id"), ignored -> new ArrayList<>()).add(comment);
        });
    data.setComments(comments);

    data.setVotes(new LinkedHashMap<>());
    jdbcTemplate.query(
        "select user_id, work_id from portfolio_votes order by user_id",
        (RowCallbackHandler) rs -> data.getVotes().put(rs.getString("user_id"), rs.getString("work_id")));

    data.setFavorites(new LinkedHashMap<>());
    jdbcTemplate.query(
        "select user_id, work_id from portfolio_favorites order by user_id, favorite_order",
        (RowCallbackHandler) rs -> data.getFavorites()
            .computeIfAbsent(rs.getString("user_id"), ignored -> new ArrayList<>())
            .add(rs.getString("work_id")));

    data.setViews(new LinkedHashMap<>());
    jdbcTemplate.query(
        "select work_id, view_count from portfolio_work_views order by work_id",
        (RowCallbackHandler) rs -> data.getViews().put(rs.getString("work_id"), rs.getInt("view_count")));

    return data;
  }

  private UserAccount mapUser(ResultSet rs) throws SQLException {
    UserAccount user = new UserAccount();
    user.setId(rs.getString("id"));
    user.setUsername(rs.getString("username"));
    user.setUsernameKey(rs.getString("username_key"));
    user.setSalt(rs.getString("salt"));
    user.setPasswordHash(rs.getString("password_hash"));
    user.setAdmin(rs.getBoolean("admin"));
    user.setDisabled(rs.getBoolean("disabled"));
    user.setCreatedAt(rs.getString("created_at"));
    return user;
  }

  private WorkItem mapWork(ResultSet rs) throws SQLException {
    WorkItem work = new WorkItem();
    work.setId(rs.getString("id"));
    work.setTitle(rs.getString("title"));
    work.setKind(rs.getString("kind"));
    work.setCollectionName(rs.getString("collection_name"));
    work.setYear(rs.getString("year_value"));
    work.setImage(rs.getString("image"));
    work.setMediaType(rs.getString("media_type"));
    work.setSummary(rs.getString("summary"));
    work.setBody(rs.getString("body"));
    work.setFeatured(rs.getInt("featured"));
    work.setOwnerId(rs.getString("owner_id"));
    work.setOwnerName(rs.getString("owner_name"));
    work.setBuiltIn(rs.getBoolean("built_in"));
    work.setPrivateWork(rs.getBoolean("private_work"));
    work.setStatus(rs.getString("status"));
    work.setCreatedAt(rs.getString("created_at"));
    work.setTags(new ArrayList<>());
    return work;
  }

  private boolean readDefaultsSeeded() {
    List<String> values = jdbcTemplate.query(
        "select meta_value from portfolio_meta where meta_key = 'defaults_seeded'",
        (rs, rowNum) -> rs.getString("meta_value"));
    return !values.isEmpty() && Boolean.parseBoolean(values.get(0));
  }

  private void replaceAll(PortfolioData data) {
    jdbcTemplate.update("delete from portfolio_favorites");
    jdbcTemplate.update("delete from portfolio_votes");
    jdbcTemplate.update("delete from portfolio_comments");
    jdbcTemplate.update("delete from portfolio_work_tags");
    jdbcTemplate.update("delete from portfolio_work_views");
    jdbcTemplate.update("delete from portfolio_works");
    jdbcTemplate.update("delete from portfolio_users");
    jdbcTemplate.update("delete from portfolio_meta");

    jdbcTemplate.update(
        "insert into portfolio_meta (meta_key, meta_value) values (?, ?)",
        "defaults_seeded",
        String.valueOf(data.isDefaultsSeeded()));

    batchUsers(data.getUsers());
    batchWorks(data.getWorks());
    batchTags(data.getWorks());
    batchViews(data.getViews());
    batchComments(data.getComments());
    batchVotes(data.getVotes());
    batchFavorites(data.getFavorites());
  }

  private void batchUsers(List<UserAccount> users) {
    jdbcTemplate.batchUpdate(
        "insert into portfolio_users (id, username, username_key, salt, password_hash, admin, disabled, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
        new BatchPreparedStatementSetter() {
          @Override
          public void setValues(PreparedStatement ps, int index) throws SQLException {
            UserAccount user = users.get(index);
            ps.setString(1, user.getId());
            ps.setString(2, user.getUsername());
            ps.setString(3, user.getUsernameKey());
            ps.setString(4, user.getSalt());
            ps.setString(5, user.getPasswordHash());
            ps.setBoolean(6, user.isAdmin());
            ps.setBoolean(7, user.isDisabled());
            ps.setString(8, user.getCreatedAt());
          }

          @Override
          public int getBatchSize() {
            return users.size();
          }
        });
  }

  private void batchWorks(List<WorkItem> works) {
    jdbcTemplate.batchUpdate(
        """
            insert into portfolio_works
            (id, title, kind, collection_name, year_value, image, media_type, summary, body, featured, owner_id, owner_name, built_in, private_work, status, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        new BatchPreparedStatementSetter() {
          @Override
          public void setValues(PreparedStatement ps, int index) throws SQLException {
            WorkItem work = works.get(index);
            ps.setString(1, work.getId());
            ps.setString(2, work.getTitle());
            ps.setString(3, work.getKind());
            ps.setString(4, work.getCollectionName());
            ps.setString(5, work.getYear());
            ps.setString(6, work.getImage());
            ps.setString(7, work.getMediaType());
            ps.setString(8, work.getSummary());
            ps.setString(9, work.getBody());
            ps.setInt(10, work.getFeatured());
            ps.setString(11, work.getOwnerId());
            ps.setString(12, work.getOwnerName());
            ps.setBoolean(13, work.isBuiltIn());
            ps.setBoolean(14, work.isPrivateWork());
            ps.setString(15, work.getStatus());
            ps.setString(16, work.getCreatedAt());
          }

          @Override
          public int getBatchSize() {
            return works.size();
          }
        });
  }

  private void batchTags(List<WorkItem> works) {
    List<TagRow> rows = new ArrayList<>();
    for (WorkItem work : works) {
      List<String> tags = work.getTags() == null ? List.of() : work.getTags();
      for (int index = 0; index < tags.size(); index++) {
        rows.add(new TagRow(work.getId(), index, tags.get(index)));
      }
    }
    jdbcTemplate.batchUpdate(
        "insert into portfolio_work_tags (work_id, tag_order, tag) values (?, ?, ?)",
        new BatchPreparedStatementSetter() {
          @Override
          public void setValues(PreparedStatement ps, int index) throws SQLException {
            TagRow row = rows.get(index);
            ps.setString(1, row.workId());
            ps.setInt(2, row.order());
            ps.setString(3, row.tag());
          }

          @Override
          public int getBatchSize() {
            return rows.size();
          }
        });
  }

  private void batchComments(Map<String, List<CommentEntry>> comments) {
    List<CommentRow> rows = new ArrayList<>();
    for (Map.Entry<String, List<CommentEntry>> entry : comments.entrySet()) {
      for (CommentEntry comment : entry.getValue()) {
        rows.add(new CommentRow(entry.getKey(), comment));
      }
    }
    jdbcTemplate.batchUpdate(
        "insert into portfolio_comments (id, work_id, user_id, user_name, text, status, created_at) values (?, ?, ?, ?, ?, ?, ?)",
        new BatchPreparedStatementSetter() {
          @Override
          public void setValues(PreparedStatement ps, int index) throws SQLException {
            CommentRow row = rows.get(index);
            ps.setString(1, row.comment().getId());
            ps.setString(2, row.workId());
            ps.setString(3, row.comment().getUserId());
            ps.setString(4, row.comment().getUser());
            ps.setString(5, row.comment().getText());
            ps.setString(6, row.comment().getStatus());
            ps.setString(7, row.comment().getCreatedAt());
          }

          @Override
          public int getBatchSize() {
            return rows.size();
          }
        });
  }

  private void batchVotes(Map<String, String> votes) {
    List<Map.Entry<String, String>> rows = new ArrayList<>(votes.entrySet());
    jdbcTemplate.batchUpdate(
        "insert into portfolio_votes (user_id, work_id) values (?, ?)",
        new BatchPreparedStatementSetter() {
          @Override
          public void setValues(PreparedStatement ps, int index) throws SQLException {
            Map.Entry<String, String> row = rows.get(index);
            ps.setString(1, row.getKey());
            ps.setString(2, row.getValue());
          }

          @Override
          public int getBatchSize() {
            return rows.size();
          }
        });
  }

  private void batchFavorites(Map<String, List<String>> favorites) {
    List<FavoriteRow> rows = new ArrayList<>();
    for (Map.Entry<String, List<String>> entry : favorites.entrySet()) {
      for (int index = 0; index < entry.getValue().size(); index++) {
        rows.add(new FavoriteRow(entry.getKey(), entry.getValue().get(index), index));
      }
    }
    jdbcTemplate.batchUpdate(
        "insert into portfolio_favorites (user_id, work_id, favorite_order) values (?, ?, ?)",
        new BatchPreparedStatementSetter() {
          @Override
          public void setValues(PreparedStatement ps, int index) throws SQLException {
            FavoriteRow row = rows.get(index);
            ps.setString(1, row.userId());
            ps.setString(2, row.workId());
            ps.setInt(3, row.order());
          }

          @Override
          public int getBatchSize() {
            return rows.size();
          }
        });
  }

  private void batchViews(Map<String, Integer> views) {
    List<Map.Entry<String, Integer>> rows = new ArrayList<>(views.entrySet());
    jdbcTemplate.batchUpdate(
        "insert into portfolio_work_views (work_id, view_count) values (?, ?)",
        new BatchPreparedStatementSetter() {
          @Override
          public void setValues(PreparedStatement ps, int index) throws SQLException {
            Map.Entry<String, Integer> row = rows.get(index);
            ps.setString(1, row.getKey());
            ps.setInt(2, Math.max(0, row.getValue() == null ? 0 : row.getValue()));
          }

          @Override
          public int getBatchSize() {
            return rows.size();
          }
        });
  }

  private void ensureSchema() {
    jdbcTemplate.execute("""
        create table if not exists portfolio_meta (
          meta_key varchar(80) primary key,
          meta_value text not null
        ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
        """);
    jdbcTemplate.execute("""
        create table if not exists portfolio_users (
          id varchar(64) primary key,
          username varchar(80) not null,
          username_key varchar(80) not null unique,
          salt varchar(160) not null,
          password_hash varchar(260) not null,
          admin boolean not null default false,
          disabled boolean not null default false,
          created_at varchar(40) not null
        ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
        """);
    ensureColumn(
        "portfolio_users",
        "disabled",
        "alter table portfolio_users add column disabled boolean not null default false after admin");
    jdbcTemplate.execute("""
        create table if not exists portfolio_works (
          id varchar(64) primary key,
          title varchar(120) not null,
          kind varchar(80) not null,
          collection_name varchar(120) not null default '',
          year_value varchar(24) not null,
          image varchar(500) not null,
          media_type varchar(20) not null default 'image',
          summary varchar(500) not null,
          body text not null,
          featured int not null,
          owner_id varchar(64) not null,
          owner_name varchar(80) not null,
          built_in boolean not null default false,
          private_work boolean not null default false,
          status varchar(20) not null default 'approved',
          created_at varchar(40) not null
        ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
        """);
    ensureColumn(
        "portfolio_works",
        "collection_name",
        "alter table portfolio_works add column collection_name varchar(120) not null default '' after kind");
    ensureColumn(
        "portfolio_works",
        "media_type",
        "alter table portfolio_works add column media_type varchar(20) not null default 'image' after image");
    ensureColumn(
        "portfolio_works",
        "private_work",
        "alter table portfolio_works add column private_work boolean not null default false after built_in");
    ensureColumn(
        "portfolio_works",
        "status",
        "alter table portfolio_works add column status varchar(20) not null default 'approved' after private_work");
    jdbcTemplate.execute("""
        create table if not exists portfolio_work_views (
          work_id varchar(64) primary key,
          view_count int not null default 0,
          constraint fk_work_views_work foreign key (work_id) references portfolio_works(id) on delete cascade
        ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
        """);
    jdbcTemplate.execute("""
        create table if not exists portfolio_work_tags (
          work_id varchar(64) not null,
          tag_order int not null,
          tag varchar(80) not null,
          primary key (work_id, tag_order),
          constraint fk_work_tags_work foreign key (work_id) references portfolio_works(id) on delete cascade
        ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
        """);
    jdbcTemplate.execute("""
        create table if not exists portfolio_comments (
          id varchar(64) primary key,
          work_id varchar(64) not null,
          user_id varchar(64) not null,
          user_name varchar(80) not null,
          text varchar(1000) not null,
          status varchar(20) not null default 'approved',
          created_at varchar(40) not null,
          constraint fk_comments_work foreign key (work_id) references portfolio_works(id) on delete cascade
        ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
        """);
    ensureColumn(
        "portfolio_comments",
        "status",
        "alter table portfolio_comments add column status varchar(20) not null default 'approved' after text");
    jdbcTemplate.execute("""
        create table if not exists portfolio_votes (
          user_id varchar(64) primary key,
          work_id varchar(64) not null,
          constraint fk_votes_work foreign key (work_id) references portfolio_works(id) on delete cascade
        ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
        """);
    jdbcTemplate.execute("""
        create table if not exists portfolio_favorites (
          user_id varchar(64) not null,
          work_id varchar(64) not null,
          favorite_order int not null,
          primary key (user_id, work_id),
          constraint fk_favorites_work foreign key (work_id) references portfolio_works(id) on delete cascade
        ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
        """);
  }

  private void ensureColumn(String tableName, String columnName, String alterSql) {
    Integer count = jdbcTemplate.queryForObject(
        """
            select count(*)
            from information_schema.columns
            where table_schema = database()
              and table_name = ?
              and column_name = ?
            """,
        Integer.class,
        tableName,
        columnName);
    if (count == null || count == 0) {
      jdbcTemplate.execute(alterSql);
    }
  }

  private record TagRow(String workId, int order, String tag) {
  }

  private record CommentRow(String workId, CommentEntry comment) {
  }

  private record FavoriteRow(String userId, String workId, int order) {
  }
}
