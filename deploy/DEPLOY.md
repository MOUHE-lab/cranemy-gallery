# 生产部署指南

下面以一台 Linux 云服务器为例，目标形态是：

- Spring Boot 运行在服务器本机 `127.0.0.1:8080`
- Nginx 对外提供 HTTPS
- MySQL 保存业务数据
- 上传文件保存在 `/var/lib/portfolio-gallery/uploads`
- systemd 负责开机自启和崩溃重启

## 1. 服务器准备

安装：

- JDK 17
- MySQL 8.x
- Nginx

创建运行用户和目录：

```bash
sudo useradd --system --home /opt/portfolio-gallery --shell /usr/sbin/nologin portfolio
sudo mkdir -p /opt/portfolio-gallery /etc/portfolio-gallery /var/lib/portfolio-gallery/uploads /var/backups/portfolio-gallery
sudo chown -R portfolio:portfolio /opt/portfolio-gallery /var/lib/portfolio-gallery
```

## 2. 创建数据库

```sql
CREATE DATABASE portfolio_gallery
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'portfolio_user'@'localhost' IDENTIFIED BY '换成强密码';
GRANT ALL PRIVILEGES ON portfolio_gallery.* TO 'portfolio_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. 打包上传

本地打包：

```bash
mvn -q -DskipTests package
```

把 `target/portfolio-gallery-1.0.0.jar` 上传到服务器：

```bash
sudo cp portfolio-gallery-1.0.0.jar /opt/portfolio-gallery/portfolio-gallery.jar
sudo chown portfolio:portfolio /opt/portfolio-gallery/portfolio-gallery.jar
```

## 4. 配置环境变量

复制 `deploy/portfolio.env.example` 到服务器：

```bash
sudo cp deploy/portfolio.env.example /etc/portfolio-gallery/portfolio.env
sudo chmod 600 /etc/portfolio-gallery/portfolio.env
```

修改里面的：

- `MYSQL_URL`
- `MYSQL_USERNAME`
- `MYSQL_PASSWORD`
- `UPLOAD_DIR`

## 5. 配置 systemd

```bash
sudo cp deploy/portfolio-gallery.service /etc/systemd/system/portfolio-gallery.service
sudo systemctl daemon-reload
sudo systemctl enable portfolio-gallery
sudo systemctl start portfolio-gallery
sudo systemctl status portfolio-gallery
```

查看日志：

```bash
sudo journalctl -u portfolio-gallery -f
```

健康检查：

```bash
curl http://127.0.0.1:8080/api/health
```

正常时应该看到 `status` 为 `UP`。

## 6. 配置 Nginx 和 HTTPS

把 `deploy/nginx-portfolio.conf` 复制到 Nginx 配置目录，然后把 `example.com` 改成你的域名，并填好证书路径。

常见路径：

```bash
sudo cp deploy/nginx-portfolio.conf /etc/nginx/conf.d/portfolio-gallery.conf
sudo nginx -t
sudo systemctl reload nginx
```

如果使用宝塔面板，可以在站点反向代理里把目标地址设为：

```text
http://127.0.0.1:8080
```

同时把上传限制调到至少 `210MB`，否则视频上传会被 Nginx 拦截。

## 7. 备份

上线后至少备份两部分：

- MySQL 数据库
- 上传目录

可以把 `deploy/backup-mysql.sh` 放到服务器：

```bash
sudo install -m 700 deploy/backup-mysql.sh /usr/local/bin/portfolio-backup
```

手动执行一次：

```bash
sudo MYSQL_USERNAME=portfolio_user MYSQL_PASSWORD='你的密码' /usr/local/bin/portfolio-backup
```

定时任务示例：

```cron
30 3 * * * MYSQL_USERNAME=portfolio_user MYSQL_PASSWORD='你的密码' /usr/local/bin/portfolio-backup >> /var/log/portfolio-backup.log 2>&1
```

## 8. 上线检查清单

- 域名已经备案并解析到服务器
- HTTPS 可以正常访问
- `https://你的域名/api/health` 返回 `UP`
- 管理员账号可以登录
- 可以上传图片和视频
- 上传目录有备份
- MySQL 有备份
- 普通用户看不到管理后台
- 管理员能进入后台、编辑作品、管理留言和用户
