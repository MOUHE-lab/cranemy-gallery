package com.example.portfolio;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UploadStorage {
  private static final long DEFAULT_MAX_IMAGE_BYTES = 8L * 1024L * 1024L;
  private static final long DEFAULT_MAX_VIDEO_BYTES = 200L * 1024L * 1024L;

  private final Path uploadRoot;
  private final long maxImageBytes;
  private final long maxVideoBytes;

  public UploadStorage(
      @Value("${portfolio.upload-dir:uploads}") String uploadDir,
      @Value("${portfolio.upload.max-image-bytes:${portfolio.upload.max-bytes:8388608}}") long maxImageBytes,
      @Value("${portfolio.upload.max-video-bytes:209715200}") long maxVideoBytes) {
    this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
    this.maxImageBytes = maxImageBytes > 0 ? maxImageBytes : DEFAULT_MAX_IMAGE_BYTES;
    this.maxVideoBytes = maxVideoBytes > 0 ? maxVideoBytes : DEFAULT_MAX_VIDEO_BYTES;
  }

  public StoredMedia save(MultipartFile media) {
    if (media == null || media.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请上传作品文件");
    }

    try {
      byte[] bytes = media.getBytes();
      MediaType mediaType = detectMediaType(bytes);
      if (mediaType == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "只支持 JPG、PNG、GIF、WebP、MP4、WebM 文件");
      }

      long limit = mediaType.video() ? maxVideoBytes : maxImageBytes;
      if (bytes.length > limit) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            (mediaType.video() ? "视频" : "图片") + "大小不能超过 " + readableBytes(limit));
      }

      Files.createDirectories(uploadRoot);
      String filename = UUID.randomUUID() + mediaType.extension();
      Path target = uploadRoot.resolve(filename).normalize();
      if (!target.startsWith(uploadRoot)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "文件名不合法");
      }
      Files.write(target, bytes);
      return new StoredMedia("/uploads/" + filename, mediaType.category());
    } catch (IOException error) {
      throw new IllegalStateException("无法保存上传文件", error);
    }
  }

  public void deleteIfUploaded(String mediaUrl) {
    if (mediaUrl == null || !mediaUrl.startsWith("/uploads/")) {
      return;
    }

    String filename = mediaUrl.substring("/uploads/".length());
    if (filename.contains("/") || filename.contains("\\")) {
      return;
    }

    try {
      Path target = uploadRoot.resolve(filename).normalize();
      if (target.startsWith(uploadRoot)) {
        Files.deleteIfExists(target);
      }
    } catch (IOException ignored) {
      // Metadata deletion should not fail just because a stale uploaded file is gone.
    }
  }

  private MediaType detectMediaType(byte[] bytes) {
    if (startsWith(bytes, 0xFF, 0xD8, 0xFF)) {
      return new MediaType("image", ".jpg", false);
    }
    if (startsWith(bytes, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
      return new MediaType("image", ".png", false);
    }
    if (startsWithAscii(bytes, "GIF87a") || startsWithAscii(bytes, "GIF89a")) {
      return new MediaType("image", ".gif", false);
    }
    if (bytes.length >= 12 && startsWithAscii(bytes, "RIFF") && asciiAt(bytes, 8, "WEBP")) {
      return new MediaType("image", ".webp", false);
    }
    if (looksLikeMp4(bytes)) {
      return new MediaType("video", ".mp4", true);
    }
    if (startsWith(bytes, 0x1A, 0x45, 0xDF, 0xA3)) {
      return new MediaType("video", ".webm", true);
    }
    return null;
  }

  private boolean looksLikeMp4(byte[] bytes) {
    return bytes.length >= 12
        && asciiAt(bytes, 4, "ftyp")
        && (asciiAt(bytes, 8, "isom")
            || asciiAt(bytes, 8, "iso2")
            || asciiAt(bytes, 8, "mp41")
            || asciiAt(bytes, 8, "mp42")
            || asciiAt(bytes, 8, "avc1")
            || asciiAt(bytes, 8, "M4V "));
  }

  private boolean startsWith(byte[] bytes, int... prefix) {
    if (bytes.length < prefix.length) {
      return false;
    }
    for (int index = 0; index < prefix.length; index++) {
      if ((bytes[index] & 0xFF) != prefix[index]) {
        return false;
      }
    }
    return true;
  }

  private boolean startsWithAscii(byte[] bytes, String prefix) {
    return asciiAt(bytes, 0, prefix);
  }

  private boolean asciiAt(byte[] bytes, int offset, String value) {
    if (bytes.length < offset + value.length()) {
      return false;
    }
    for (int index = 0; index < value.length(); index++) {
      if (bytes[offset + index] != (byte) value.charAt(index)) {
        return false;
      }
    }
    return true;
  }

  private String readableBytes(long bytes) {
    if (bytes % (1024L * 1024L) == 0) {
      return (bytes / (1024L * 1024L)) + "MB";
    }
    if (bytes % 1024L == 0) {
      return (bytes / 1024L) + "KB";
    }
    return bytes + "B";
  }

  private record MediaType(String category, String extension, boolean video) {
  }

  public record StoredMedia(String url, String mediaType) {
  }
}
