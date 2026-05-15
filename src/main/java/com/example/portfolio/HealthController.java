package com.example.portfolio;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  private final Environment environment;
  private final ObjectProvider<JdbcTemplate> jdbcTemplateProvider;
  private final Path uploadRoot;

  public HealthController(
      Environment environment,
      ObjectProvider<JdbcTemplate> jdbcTemplateProvider,
      @Value("${portfolio.upload-dir:uploads}") String uploadDir) {
    this.environment = environment;
    this.jdbcTemplateProvider = jdbcTemplateProvider;
    this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
  }

  @GetMapping("/api/health")
  public ResponseEntity<Map<String, Object>> health() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("time", Instant.now().toString());
    result.put("storage", environment.getProperty("portfolio.storage", "json"));
    String databaseStatus = databaseStatus();
    boolean healthy = !"DOWN".equals(databaseStatus);
    result.put("status", healthy ? "UP" : "DOWN");
    result.put("database", databaseStatus);
    result.put("uploads", uploadStatus());
    return ResponseEntity
        .status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
        .body(result);
  }

  private String databaseStatus() {
    JdbcTemplate jdbcTemplate = jdbcTemplateProvider.getIfAvailable();
    if (jdbcTemplate == null) {
      return "NOT_CONFIGURED";
    }
    try {
      Integer value = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
      return Integer.valueOf(1).equals(value) ? "UP" : "UNKNOWN";
    } catch (RuntimeException error) {
      return "DOWN";
    }
  }

  private String uploadStatus() {
    if (Files.isDirectory(uploadRoot) && Files.isWritable(uploadRoot)) {
      return "READY";
    }

    Path parent = uploadRoot.getParent();
    if (!Files.exists(uploadRoot) && parent != null && Files.isDirectory(parent) && Files.isWritable(parent)) {
      return "CREATABLE";
    }

    return "CHECK_REQUIRED";
  }
}
