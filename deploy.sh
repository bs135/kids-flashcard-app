#!/usr/bin/env bash
# ==============================================================================
# Update & Redeployment Script for Kids Flashcard App
# Usage:
#   ./deploy.sh                : Pull latest code, build & restart app container, cleanup
#   ./deploy.sh --seed         : Same as above, and seed default flashcards into database
#   ./deploy.sh --reset        : Backup existing data/uploads, wipe runtime DB, and rebuild
#   ./deploy.sh --reset --seed : Backup & reset, rebuild, then re-seed standard flashcards
# ==============================================================================
set -e

SHOULD_SEED=false
RESET_DB=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--seed)
      SHOULD_SEED=true
      shift
      ;;
    -r|--reset)
      RESET_DB=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -r, --reset   Backup and clean SQLite database and user uploads"
      echo "  -s, --seed    Seed default topics and standard flashcards"
      echo "  -h, --help    Display this help message and exit"
      exit 0
      ;;
    *)
      echo "❌ [ERROR] Unknown option: $1"
      echo "Run './deploy.sh --help' to see available options."
      exit 1
      ;;
  esac
done

# ==============================================================================
# Block 1: Independent Database & User Uploads Reset (--reset)
# ==============================================================================
if [ "$RESET_DB" = true ]; then
  echo "⚠️  [WARNING] Database reset flag detected (--reset)!"
  BACKUP_DIR="backend/backup"
  mkdir -p "$BACKUP_DIR"
  BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

  # 1. Backup & reset database directory (backend/data/)
  if [ -d "backend/data" ]; then
    DATA_BACKUP_FILE="$BACKUP_DIR/data.bak_${BACKUP_TIMESTAMP}.tar.gz"
    echo "💾 [Backup] Archiving backend/data to ${DATA_BACKUP_FILE}..."
    if tar -czf "$DATA_BACKUP_FILE" -C backend data; then
      ARCHIVE_SIZE=$(du -h "$DATA_BACKUP_FILE" | cut -f1)
      echo "   ✓ Successfully created data archive: ${DATA_BACKUP_FILE} (${ARCHIVE_SIZE})"

      echo "🗑️  [Reset] Cleaning SQLite database runtime files..."
      rm -f backend/data/database.sqlite backend/data/database.sqlite-wal backend/data/database.sqlite-shm backend/data/database.sqlite-journal
      echo "   ✓ Database runtime files removed for fresh initialization."
    else
      echo "❌ [ERROR] Failed to archive backend/data! Aborting database removal."
      exit 1
    fi
  fi

  # 2. Backup & reset user uploads (backend/uploads/user)
  USER_UPLOADS_DIR="backend/uploads/user"
  if [ -d "$USER_UPLOADS_DIR" ]; then
    if [ "$(ls -A "$USER_UPLOADS_DIR" 2>/dev/null)" ]; then
      UPLOADS_BACKUP_FILE="$BACKUP_DIR/user_uploads.bak_${BACKUP_TIMESTAMP}.tar.gz"
      echo "💾 [Backup] Archiving user uploads to ${UPLOADS_BACKUP_FILE}..."
      if tar -czf "$UPLOADS_BACKUP_FILE" -C backend/uploads user; then
        ARCHIVE_SIZE=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
        echo "   ✓ Successfully created user uploads archive: ${UPLOADS_BACKUP_FILE} (${ARCHIVE_SIZE})"
      else
        echo "❌ [ERROR] Failed to archive user uploads! Aborting uploads reset."
        exit 1
      fi
    else
      echo "ℹ️  [Backup] No user uploads found in ${USER_UPLOADS_DIR}, skipping archive."
    fi

    echo "🗑️  [Reset] Cleaning and recreating ${USER_UPLOADS_DIR}..."
    rm -rf "$USER_UPLOADS_DIR" && mkdir -p "$USER_UPLOADS_DIR"
    echo "   ✓ Recreated empty user uploads directory."
  fi
fi

echo "🚀 [1/4] Pulling latest source code from Git..."
git pull origin main

echo "📦 [2/4] Building and restarting app container..."
docker compose up -d --build app

# ==============================================================================
# Block 2: Independent Seed Data Ingestion (--seed)
# ==============================================================================
if [ "$SHOULD_SEED" = true ]; then
  echo "🌱 [Seed] Populating default data (8 topics & 115 standard flashcards)..."
  docker compose exec app npm run seed
  echo "   ✓ Default seed data loaded successfully."
fi

echo "🧹 [3/4] Cleaning up unused Docker images..."
docker image prune -f

echo "📊 [4/4] Checking container status..."
docker compose ps

echo "✅ Deployment completed successfully!"
