#!/usr/bin/env bash
# ==============================================================================
# Script Cập Nhật & Tái Triển Khai Ứng Dụng Kids Flashcard
# Cách dùng:
#   ./deploy.sh        : Kéo code mới, build & restart container app, dọn rác
#   ./deploy.sh --seed : Tương tự như trên, kèm nạp lại dữ liệu 115 thẻ seed
# ==============================================================================
set -e

SHOULD_SEED=false
for arg in "$@"; do
  if [ "$arg" == "--seed" ]; then
    SHOULD_SEED=true
  fi
done

echo "🚀 [1/4] Đang kéo mã nguồn mới nhất từ Git..."
git pull origin main

echo "📦 [2/4] Đang build và khởi động lại container app..."
docker compose up -d --build app

if [ "$SHOULD_SEED" = true ]; then
  echo "🌱 [Seed] Đang nạp dữ liệu chuẩn (8 chủ đề & 115 thẻ từ vựng)..."
  docker compose exec app npm run seed
fi

echo "🧹 [3/4] Đang dọn dẹp các images thừa không dùng..."
docker image prune -f

echo "📊 [4/4] Kiểm tra trạng thái containers..."
docker compose ps

echo "✅ Triển khai cập nhật thành công!"
