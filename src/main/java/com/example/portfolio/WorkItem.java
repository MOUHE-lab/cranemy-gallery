package com.example.portfolio;

import java.util.ArrayList;
import java.util.List;

public class WorkItem {
  private String id;
  private String title;
  private String kind;
  private String collectionName = "";
  private String year;
  private String image;
  private String mediaType = "image";
  private String summary;
  private String body;
  private List<String> tags = new ArrayList<>();
  private int featured;
  private String ownerId;
  private String ownerName;
  private boolean builtIn;
  private boolean privateWork;
  private String status = "approved";
  private String createdAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getKind() {
    return kind;
  }

  public void setKind(String kind) {
    this.kind = kind;
  }

  public String getCollectionName() {
    return collectionName;
  }

  public void setCollectionName(String collectionName) {
    this.collectionName = collectionName;
  }

  public String getYear() {
    return year;
  }

  public void setYear(String year) {
    this.year = year;
  }

  public String getImage() {
    return image;
  }

  public void setImage(String image) {
    this.image = image;
  }

  public String getMediaType() {
    return mediaType;
  }

  public void setMediaType(String mediaType) {
    this.mediaType = mediaType;
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String summary) {
    this.summary = summary;
  }

  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body;
  }

  public List<String> getTags() {
    return tags;
  }

  public void setTags(List<String> tags) {
    this.tags = tags;
  }

  public int getFeatured() {
    return featured;
  }

  public void setFeatured(int featured) {
    this.featured = featured;
  }

  public String getOwnerId() {
    return ownerId;
  }

  public void setOwnerId(String ownerId) {
    this.ownerId = ownerId;
  }

  public String getOwnerName() {
    return ownerName;
  }

  public void setOwnerName(String ownerName) {
    this.ownerName = ownerName;
  }

  public boolean isBuiltIn() {
    return builtIn;
  }

  public void setBuiltIn(boolean builtIn) {
    this.builtIn = builtIn;
  }

  public boolean isPrivateWork() {
    return privateWork;
  }

  public void setPrivateWork(boolean privateWork) {
    this.privateWork = privateWork;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(String createdAt) {
    this.createdAt = createdAt;
  }
}
