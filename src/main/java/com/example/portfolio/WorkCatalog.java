package com.example.portfolio;

import java.util.ArrayList;
import java.util.List;

final class WorkCatalog {
  private WorkCatalog() {
  }

  static List<WorkItem> defaultWorks() {
    List<WorkItem> works = new ArrayList<>();
    works.add(work(
        "morning-archive",
        "晨光档案",
        "摄影 / 文字",
        "2026",
        "./assets/work-morning-archive.svg",
        "关于旧街区、窗影和一天开始之前的安静记录。",
        "这组作品把清晨的街道当成一份私人档案：光线、墙面、路牌和短句共同组成了温和的叙事。",
        List.of("摄影", "城市", "散文"),
        1));
    works.add(work(
        "blue-room",
        "蓝色房间",
        "插画",
        "2025",
        "./assets/work-blue-room.svg",
        "一个以房间为舞台的颜色实验，保留了手绘草稿的呼吸感。",
        "画面从一张桌子和一束光开始，慢慢扩展成房间里的情绪地图。色块和线条用来记录停顿、回望和片刻的清醒。",
        List.of("插画", "色彩", "空间"),
        2));
    works.add(work(
        "salt-letter",
        "盐的来信",
        "短文",
        "2026",
        "./assets/work-salt-letter.svg",
        "一篇关于海边、记忆和亲密关系的短文。",
        "文本用书信结构写成，把海风、盐粒和没有说出口的话放在同一个段落里，语气克制但带着回声。",
        List.of("写作", "海边", "书信"),
        3));
    works.add(work(
        "paper-garden",
        "纸上花园",
        "拼贴",
        "2024",
        "./assets/work-paper-garden.svg",
        "由纸张纹理、植物形状和短诗组成的系列拼贴。",
        "作品把废旧纸张重新剪裁成植物，试图让材料本身的折痕成为时间感的一部分。",
        List.of("拼贴", "植物", "诗"),
        4));
    works.add(work(
        "signal-noon",
        "正午信号",
        "海报",
        "2025",
        "./assets/work-signal-noon.svg",
        "一张为独立放映活动设计的视觉海报。",
        "大面积留白和高对比图形让信息在远处也能被识别，细节部分保留了手工套色的轻微偏移。",
        List.of("平面", "海报", "活动"),
        5));
    works.add(work(
        "small-theater",
        "小剧场",
        "摄影 / 装置",
        "2023",
        "./assets/work-small-theater.svg",
        "用桌面物件搭建的微型场景，再以摄影保存。",
        "这组作品关注物件之间的关系：杯子、纸片、影子和边缘像演员一样站位，形成没有对白的短剧。",
        List.of("装置", "摄影", "叙事"),
        6));
    return works;
  }

  private static WorkItem work(
      String id,
      String title,
      String kind,
      String year,
      String image,
      String summary,
      String body,
      List<String> tags,
      int featured) {
    WorkItem work = new WorkItem();
    work.setId(id);
    work.setTitle(title);
    work.setKind(kind);
    work.setYear(year);
    work.setImage(image);
    work.setSummary(summary);
    work.setBody(body);
    work.setTags(new ArrayList<>(tags));
    work.setFeatured(featured);
    work.setOwnerId("system");
    work.setOwnerName("站点");
    work.setBuiltIn(true);
    work.setCreatedAt("2026-05-05T00:00:00Z");
    return work;
  }
}
