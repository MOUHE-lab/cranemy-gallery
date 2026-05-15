package com.example.portfolio;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> handle(ResponseStatusException error) {
    return ResponseEntity
        .status(error.getStatusCode())
        .body(body(messageOrDefault(error.getReason(), "请求处理失败")));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<Map<String, String>> handleMaxUploadSize(MaxUploadSizeExceededException error) {
    return ResponseEntity
        .status(HttpStatus.PAYLOAD_TOO_LARGE)
        .body(body("文件大小超过限制"));
  }

  @ExceptionHandler(MultipartException.class)
  public ResponseEntity<Map<String, String>> handleMultipart(MultipartException error) {
    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(body("上传文件格式不正确"));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, String>> handleUnexpected(Exception error) {
    LOGGER.error("Unhandled API error", error);
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(body("服务器暂时不可用"));
  }

  private Map<String, String> body(String message) {
    return Map.of("message", message);
  }

  private String messageOrDefault(String message, String fallback) {
    return message == null || message.isBlank() ? fallback : message;
  }
}
