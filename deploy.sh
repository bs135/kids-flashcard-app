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

echo "🚀 [1/4] Pulling latest source code from Git..."
git pull origin main

# ==============================================================================
# Block 1: Independent Database & User Uploads Reset (--reset)
# ==============================================================================
if [ "$RESET_DB" = true ]; then
  echo "⚠️  [WARNING] Database reset flag detected (--reset)!"
  BACKUP_DIR="backend/backup"
  mkdir -p "$BACKUP_DIR"
  BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

  # Check if app container was running, and capture compose exit status cleanly
  APP_CONTAINER_ID=""
  if ! APP_CONTAINER_ID=$(docker compose ps -q app 2>/dev/null); then
    echo "❌ [ERROR] Failed to query Docker container status! Aborting reset for safety."
    exit 1
  fi

  WAS_APP_RUNNING=false
  if [ -n "$APP_CONTAINER_ID" ]; then
    echo "⏸️  [Quiesce] Stopping running app container to ensure consistent backup..."
    if docker compose stop app; then
      WAS_APP_RUNNING=true
    else
      echo "❌ [ERROR] Failed to stop running app container! Aborting reset to prevent file corruption."
      exit 1
    fi
  fi

  # Trap unexpected errors during reset to restore running service if it was running
  cleanup_reset_failure() {
    local exit_code=$?
    if [ "$WAS_APP_RUNNING" = true ]; then
      echo "⚠️  [Rollback] Script interrupted or encountered an error. Restarting app container..."
      docker compose start app || true
    fi
    exit "$exit_code"
  }
  trap cleanup_reset_failure ERR INT TERM

  DATA_BACKUP_FILE="$BACKUP_DIR/data.bak_${BACKUP_TIMESTAMP}.tar.gz"
  UPLOADS_BACKUP_FILE="$BACKUP_DIR/user_uploads.bak_${BACKUP_TIMESTAMP}.tar.gz"
  DATA_NEEDS_CLEAN=false
  UPLOADS_NEEDS_CLEAN=false

  # Step 1: Create backup archives atomically before performing any destructive deletions
  if [ -d "backend/data" ]; then
    echo "💾 [Backup 1/2] Archiving backend/data to ${DATA_BACKUP_FILE}..."
    if tar -czf "$DATA_BACKUP_FILE" -C backend data; then
      ARCHIVE_SIZE=$(du -h "$DATA_BACKUP_FILE" | cut -f1)
      echo "   ✓ Successfully created data archive: ${DATA_BACKUP_FILE} (${ARCHIVE_SIZE})"
      DATA_NEEDS_CLEAN=true
    else
      echo "❌ [ERROR] Failed to archive backend/data! Aborting reset to protect data."
      exit 1
    fi
  fi

  USER_UPLOADS_DIR="backend/uploads/user"
  if [ -d "$USER_UPLOADS_DIR" ]; then
    echo "💾 [Backup 2/2] Archiving user uploads to ${UPLOADS_BACKUP_FILE}..."
    if tar -czf "$UPLOADS_BACKUP_FILE" -C backend/uploads user; then
      ARCHIVE_SIZE=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
      echo "   ✓ Successfully created user uploads archive: ${UPLOADS_BACKUP_FILE} (${ARCHIVE_SIZE})"
      UPLOADS_NEEDS_CLEAN=true
    else
      echo "❌ [ERROR] Failed to archive user uploads! Aborting reset to protect uploads."
      exit 1
    fi
  fi

  # Step 2: Now that all archives have been successfully validated, execute cleanups
  if [ "$DATA_NEEDS_CLEAN" = true ]; then
    echo "🗑️  [Reset] Cleaning SQLite database runtime files..."
    rm -f backend/data/database.sqlite backend/data/database.sqlite-wal backend/data/database.sqlite-shm backend/data/database.sqlite-journal
    echo "   ✓ Database runtime files removed for fresh initialization."
  fi

  if [ "$UPLOADS_NEEDS_CLEAN" = true ]; then
    echo "🗑️  [Reset] Cleaning and recreating ${USER_UPLOADS_DIR}..."
    rm -rf "$USER_UPLOADS_DIR" && mkdir -p "$USER_UPLOADS_DIR"
    echo "   ✓ Recreated empty user uploads directory."
  fi

  # Remove error trap as reset phase completed safely
  trap - ERR INT TERM
fi

echo "📦 [2/4] Building and restarting app container..."
docker compose up -d --build app

# ==============================================================================
# Block 2: Independent Seed Data Ingestion (--seed)
# ==============================================================================
if [ "$SHOULD_SEED" = true ]; then
  echo "🌱 [Seed] Populating default data (11 topics & 154 standard flashcards)..."
  docker compose exec app npm run seed
  echo "   ✓ Default seed data loaded successfully."
fi

echo "🧹 [3/4] Cleaning up unused Docker images..."
docker image prune -f

echo "📊 [4/4] Checking container status..."
docker compose ps

echo "✅ Deployment completed successfully!"
