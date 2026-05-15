#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/portfolio-gallery}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/lib/portfolio-gallery/uploads}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-portfolio_gallery}"
MYSQL_USERNAME="${MYSQL_USERNAME:?MYSQL_USERNAME is required}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
KEEP_DAYS="${KEEP_DAYS:-14}"

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_ROOT/$STAMP"

mkdir -p "$DEST"

MYSQL_PWD="$MYSQL_PASSWORD" mysqldump \
  -h "$MYSQL_HOST" \
  -P "$MYSQL_PORT" \
  -u "$MYSQL_USERNAME" \
  --single-transaction \
  --routines \
  --triggers \
  --databases "$MYSQL_DATABASE" \
  > "$DEST/mysql.sql"

if [ -d "$UPLOAD_DIR" ]; then
  tar -C "$(dirname "$UPLOAD_DIR")" -czf "$DEST/uploads.tar.gz" "$(basename "$UPLOAD_DIR")"
fi

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +

echo "Backup saved to $DEST"
