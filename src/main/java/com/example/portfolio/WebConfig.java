package com.example.portfolio;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final String uploadDir;

  public WebConfig(@Value("${portfolio.upload-dir:uploads}") String uploadDir) {
    this.uploadDir = uploadDir;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    String uploadLocation = Path.of(uploadDir).toAbsolutePath().normalize().toUri().toString();
    if (!uploadLocation.endsWith("/")) {
      uploadLocation = uploadLocation + "/";
    }
    registry.addResourceHandler("/uploads/**").addResourceLocations(uploadLocation);
  }
}
