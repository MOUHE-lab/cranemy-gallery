package com.example.portfolio;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.function.UnaryOperator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "portfolio.storage", havingValue = "json", matchIfMissing = true)
public class JsonPortfolioDataStore implements PortfolioDataStore {
  private final ObjectMapper objectMapper;
  private final Path databasePath;

  public JsonPortfolioDataStore(
      ObjectMapper objectMapper,
      @Value("${portfolio.data-file:data/db.json}") String databasePath) {
    this.objectMapper = objectMapper;
    this.databasePath = Path.of(databasePath);
  }

  @Override
  public synchronized PortfolioData read() {
    ensureDatabase();
    try {
      PortfolioData data = objectMapper.readValue(databasePath.toFile(), PortfolioData.class);
      data.normalize();
      return data;
    } catch (IOException error) {
      throw new IllegalStateException("无法读取数据文件", error);
    }
  }

  @Override
  public synchronized PortfolioData update(UnaryOperator<PortfolioData> updater) {
    PortfolioData data = read();
    PortfolioData updated = updater.apply(data);
    updated.normalize();
    write(updated);
    return updated;
  }

  private void ensureDatabase() {
    try {
      Path parent = databasePath.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      if (!Files.exists(databasePath)) {
        write(new PortfolioData());
      }
    } catch (IOException error) {
      throw new IllegalStateException("无法初始化数据文件", error);
    }
  }

  private void write(PortfolioData data) {
    try {
      data.normalize();
      objectMapper.writerWithDefaultPrettyPrinter().writeValue(databasePath.toFile(), data);
    } catch (IOException error) {
      throw new IllegalStateException("无法写入数据文件", error);
    }
  }
}
