#!/usr/bin/env bash
# ==============================================================================
# Update & Redeployment Script for Kids Flashcard App
# Usage:
#   ./deploy.sh        : Pull latest code, build & restart app container, cleanup
#   ./deploy.sh --seed : Same as above, and re-seed 115 default flashcards
# ==============================================================================
set -e

SHOULD_SEED=false
for arg in "$@"; do
  if [ "$arg" == "--seed" ]; then
    SHOULD_SEED=true
  fi
done

echo "🚀 [1/4] Pulling latest source code from Git..."
git pull origin main

echo "📦 [2/4] Building and restarting app container..."
docker compose up -d --build app

if [ "$SHOULD_SEED" = true ]; then
  echo "🌱 [Seed] Seeding default data (8 topics & 115 flashcards)..."
  docker compose exec app npm run seed
fi

echo "🧹 [3/4] Cleaning up unused Docker images..."
docker image prune -f

echo "📊 [4/4] Checking container status..."
docker compose ps

echo "✅ Deployment completed successfully!"
