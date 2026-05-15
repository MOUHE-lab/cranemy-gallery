package com.example.portfolio;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class PortfolioController {
  private final PortfolioService portfolioService;

  public PortfolioController(PortfolioService portfolioService) {
    this.portfolioService = portfolioService;
  }

  @GetMapping("/state")
  public PortfolioService.ClientState state(HttpSession session) {
    return portfolioService.currentState(session);
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public PortfolioService.ClientState register(
      @RequestBody CredentialsRequest request,
      HttpSession session) {
    return portfolioService.register(request.username(), request.password(), session);
  }

  @PostMapping("/login")
  public PortfolioService.ClientState login(
      @RequestBody CredentialsRequest request,
      HttpSession session) {
    return portfolioService.login(request.username(), request.password(), session);
  }

  @PostMapping("/logout")
  public PortfolioService.ClientState logout(HttpSession session) {
    return portfolioService.logout(session);
  }

  @PostMapping(value = "/works", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public PortfolioService.ClientState createWork(
      @RequestParam String title,
      @RequestParam(required = false) String kind,
      @RequestParam(required = false) String collectionName,
      @RequestParam(required = false) String year,
      @RequestParam String summary,
      @RequestParam(required = false) String body,
      @RequestParam(required = false) String tags,
      @RequestParam(required = false) Boolean privateWork,
      @RequestParam MultipartFile image,
      HttpSession session) {
    return portfolioService.createWork(title, kind, collectionName, year, summary, body, tags, privateWork, image, session);
  }

  @DeleteMapping("/works/{workId}")
  public PortfolioService.ClientState deleteWork(
      @PathVariable String workId,
      HttpSession session) {
    return portfolioService.deleteWork(workId, session);
  }

  @PostMapping("/works/{workId}/views")
  public PortfolioService.ClientState recordWorkView(
      @PathVariable String workId,
      HttpSession session) {
    return portfolioService.recordView(workId, session);
  }

  @PutMapping("/me/works/{workId}/privacy")
  public PortfolioService.ClientState updateMyWorkPrivacy(
      @PathVariable String workId,
      @RequestBody WorkPrivacyRequest request,
      HttpSession session) {
    return portfolioService.updateMyWorkPrivacy(workId, request.privateWork(), session);
  }

  @PutMapping("/admin/works/{workId}")
  public PortfolioService.ClientState updateWork(
      @PathVariable String workId,
      @RequestBody PortfolioService.WorkUpdate request,
      HttpSession session) {
    return portfolioService.updateWork(workId, request, session);
  }

  @PutMapping("/admin/works/{workId}/approval")
  public PortfolioService.ClientState approveWork(
      @PathVariable String workId,
      HttpSession session) {
    return portfolioService.approveWork(workId, session);
  }

  @PutMapping("/admin/users/{userId}")
  public PortfolioService.ClientState updateUser(
      @PathVariable String userId,
      @RequestBody PortfolioService.UserAdminUpdate request,
      HttpSession session) {
    return portfolioService.updateUser(userId, request, session);
  }

  @DeleteMapping("/admin/comments/{commentId}")
  public PortfolioService.ClientState deleteComment(
      @PathVariable String commentId,
      HttpSession session) {
    return portfolioService.deleteComment(commentId, session);
  }

  @PutMapping("/admin/comments/{commentId}")
  public PortfolioService.ClientState moderateComment(
      @PathVariable String commentId,
      @RequestBody CommentModerationRequest request,
      HttpSession session) {
    if (Boolean.TRUE.equals(request.approved())) {
      return portfolioService.approveComment(commentId, session);
    }
    return portfolioService.deleteComment(commentId, session);
  }

  @DeleteMapping("/comments/{commentId}")
  public PortfolioService.ClientState deleteMyComment(
      @PathVariable String commentId,
      HttpSession session) {
    return portfolioService.deleteMyComment(commentId, session);
  }

  @PostMapping("/comments")
  @ResponseStatus(HttpStatus.CREATED)
  public PortfolioService.ClientState comment(
      @RequestBody CommentRequest request,
      HttpSession session) {
    return portfolioService.addComment(request.workId(), request.text(), session);
  }

  @PostMapping("/votes")
  public PortfolioService.ClientState vote(
      @RequestBody VoteRequest request,
      HttpSession session) {
    return portfolioService.toggleVote(request.workId(), session);
  }

  @PostMapping("/favorites")
  public PortfolioService.ClientState favorite(
      @RequestBody FavoriteRequest request,
      HttpSession session) {
    return portfolioService.toggleFavorite(request.workId(), session);
  }

  public record CredentialsRequest(String username, String password) {
  }

  public record CommentRequest(String workId, String text) {
  }

  public record VoteRequest(String workId) {
  }

  public record FavoriteRequest(String workId) {
  }

  public record WorkPrivacyRequest(Boolean privateWork) {
  }

  public record CommentModerationRequest(Boolean approved) {
  }
}
