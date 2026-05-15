# 作品展厅

这是一个用 Spring Boot 从 0 搭建的作品展示网站，前端静态资源放在 `src/main/resources/static`，不依赖外部 CDN。

## 已有功能

- 作品图片和文字展示
- 点击作品后用独立弹窗查看详情、留言和互动按钮
- 作品合集 / 系列筛选
- 账号密码注册、登录、退出
- 登录用户留言
- 登录用户给喜欢的作品投票
- 登录用户上传作品
- 上传者删除自己的作品
- 登录用户收藏作品
- 首页可交互 3D 作品星图，排行前十作品围成轨道，点击作品打开详情
- 作品分类筛选、站点数据概览、浏览量统计和管理员数据小看板
- 登录用户个人后台管理自己的作品和可管理留言
- 作品公开/私密设置，私密作品只对作者和管理员可见
- 留言审核，普通用户留言默认待审核，管理员通过后公开显示
- 第一个注册用户自动成为管理员
- 管理员后台编辑、删除所有作品
- 管理员后台查看用户、设置管理员、禁用或启用账号
- 管理员后台查看并删除留言
- 搜索、分类筛选和排序

## 本地 JSON 模式

默认启动时使用本地 JSON 文件保存数据，适合开发和学习。

```bash
mvn spring-boot:run
```

然后打开：

```text
http://localhost:5173
```

默认数据位置：

- `data/db.json`：账号、作品信息、留言审核状态、投票、收藏和浏览量
- `uploads/`：上传作品图片和视频

## 本地 MySQL 模式

项目已经接好 MySQL。先创建数据库：

```sql
CREATE DATABASE portfolio_gallery
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

如果你的 MySQL 账号是 `root`，密码是 `1234`，可以直接运行：

```bash
mvn spring-boot:run "-Dspring-boot.run.profiles=mysql"
```

如果账号、密码或数据库地址不同，在 PowerShell 里先输入：

```powershell
$env:MYSQL_URL="jdbc:mysql://localhost:3306/portfolio_gallery?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true"
$env:MYSQL_USERNAME="root"
$env:MYSQL_PASSWORD="你的密码"
mvn spring-boot:run "-Dspring-boot.run.profiles=mysql"
```

第一次启动时，程序会自动创建这些表：

- `portfolio_users`
- `portfolio_works`
- `portfolio_work_tags`
- `portfolio_comments`
- `portfolio_votes`
- `portfolio_favorites`
- `portfolio_work_views`
- `portfolio_meta`

如果数据库里还没有作品，系统会自动写入内置示例作品。第一个注册账号会自动成为管理员。

## 生产环境模式

正式上线建议使用 `prod` 配置，不把数据库密码写进项目文件。PowerShell 示例：

```powershell
$env:PORT="8080"
$env:MYSQL_URL="jdbc:mysql://你的数据库地址:3306/portfolio_gallery?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=true"
$env:MYSQL_USERNAME="你的数据库账号"
$env:MYSQL_PASSWORD="你的数据库密码"
$env:UPLOAD_DIR="D:/portfolio-uploads"
mvn spring-boot:run "-Dspring-boot.run.profiles=prod"
```

生产模式会启用更严格的 Cookie 设置、安全响应头和 MySQL 存储。线上还需要配好 HTTPS、域名、备案、数据库备份和上传目录备份。

详细 Linux 部署步骤见 `deploy/DEPLOY.md`。上线后可以访问 `/api/health` 检查服务、数据库和上传目录状态。

## 个人后台

登录后页面顶部会出现“个人后台”按钮。普通用户可以在这里：

- 查看自己上传的作品
- 把自己的作品切换为公开或私密
- 删除自己的作品
- 删除自己发布的留言
- 删除自己作品下的留言

私密作品不会出现在未登录用户或其他普通用户的作品列表里，作者本人和管理员仍然可以看到。

## 管理员后台

管理员后台提供独立入口 `/admin.html`，主站顶部的“管理后台”按钮会跳转到这个管理系统。

首次运行后，第一个注册的账号会自动成为管理员。管理员登录后，页面顶部会出现“管理后台”按钮，点击后会进入独立后台页面。

管理员可以修改站点作品的标题、类型、所属合集、年份、媒体类型、媒体路径、简介、详细介绍、标签、上传者显示名和排序权重，也可以删除任意作品。

管理员使用“上传作品”创建的新作品会显示为“上传者：站点”。普通用户上传的作品仍显示自己的账号名。

管理员后台还包含：

- 数据小看板：查看总浏览、最受欢迎作品、最近留言、待审核数量和收藏排行
- 用户管理：查看用户、作品数、留言数、收藏数，设置或取消管理员，禁用或启用账号
- 留言管理：查看所有作品下的留言，通过待审核留言，并删除不合适的留言

为了避免把自己锁在后台外面，系统不允许禁用当前登录的管理员，也不允许取消最后一个可用管理员。

普通用户发布的新留言默认进入“待审核”。留言作者、作品作者和管理员能看到待审核留言，其他访客只能看到已通过留言。

## 上传限制

上传作品支持图片和视频。

图片只允许：

- JPG
- PNG
- GIF
- WebP

视频只允许：

- MP4
- WebM

图片默认最大 8MB，视频默认最大 200MB。为了安全，用户上传不再允许 SVG 文件。内置静态资源里的 SVG 图标或示例图仍然可以正常显示。

如需调整大小限制，可以设置：

```properties
portfolio.upload.max-image-bytes=8388608
portfolio.upload.max-video-bytes=209715200
```

## 备份建议

如果使用 MySQL，上线后至少要备份两部分：

- MySQL 数据库 `portfolio_gallery`
- 上传目录，比如 `uploads/` 或生产环境的 `UPLOAD_DIR`

只备份数据库不够，因为用户上传的图片文件在目录里。
