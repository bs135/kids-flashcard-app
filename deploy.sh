#!/usr/bin/env bash
# ==============================================================================
# Update & Redeployment Script for Kids Flashcard App
# Usage:
#   ./deploy.sh                : Pull latest code, build & restart app container, cleanup
#   ./deploy.sh --seed         : Same as above, and re-seed default flashcards
#   ./deploy.sh --seed --reset : Backup DB, reset DB, re-seed from scratch, and rebuild
# ==============================================================================
set -e

SHOULD_SEED=false
RESET_DB=false

for arg in "$@"; do
  if [ "$arg" == "--seed" ]; then
    SHOULD_SEED=true
  elif [ "$arg" == "--reset" ]; then
    RESET_DB=true
  fi
done

# If --seed and --reset are both present, backup and reset the SQLite database
if [ "$SHOULD_SEED" = true ] && [ "$RESET_DB" = true ]; then
  echo "⚠️  [WARNING] Database reset flag detected (--seed --reset)!"
  DB_FILE="backend/data/database.sqlite"
  BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

  if [ -f "$DB_FILE" ]; then
    BACKUP_FILE="${DB_FILE}.bak_${BACKUP_TIMESTAMP}"
    echo "💾 [Backup] Creating database backup: ${BACKUP_FILE}..."
    cp "$DB_FILE" "$BACKUP_FILE"
    # Also backup journal/wal files if present
    [ -f "${DB_FILE}-wal" ] && cp "${DB_FILE}-wal" "${BACKUP_FILE}-wal" || true
    [ -f "${DB_FILE}-shm" ] && cp "${DB_FILE}-shm" "${BACKUP_FILE}-shm" || true
    
    echo "🗑️  [Reset] Removing existing database to ensure clean re-initialization..."
    rm -f "$DB_FILE" "${DB_FILE}-wal" "${DB_FILE}-shm" "${DB_FILE}-journal"
  fi
fi

echo "🚀 [1/4] Pulling latest source code from Git..."
git pull origin main

echo "📦 [2/4] Building and restarting app container..."
docker compose up -d --build app

if [ "$SHOULD_SEED" = true ]; then
  if [ "$RESET_DB" = true ]; then
    echo "🌱 [Seed Reset] Re-initializing schema and seeding all 115 standard flashcards from scratch..."
  else
    echo "🌱 [Seed] Synchronizing default data (8 topics & 115 flashcards)..."
  fi
  docker compose exec app npm run seed
fi

echo "🧹 [3/4] Cleaning up unused Docker images..."
docker image prune -f

echo "📊 [4/4] Checking container status..."
docker compose ps

echo "✅ Deployment completed successfully!"
