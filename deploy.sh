#!/usr/bin/env bash
# ==============================================================================
# Script Cập Nhật & Tái Triển Khai Ứng Dụng Kids Flashcard
# ==============================================================================
set -e

echo "🚀 [1/4] Đang kéo mã nguồn mới nhất từ Git..."
git pull origin main

echo "📦 [2/4] Đang build và khởi động lại containers..."
docker compose up -d --build

echo "🧹 [3/4] Đang dọn dẹp các images thừa không dùng..."
docker image prune -f

echo "📊 [4/4] Kiểm tra trạng thái containers..."
docker compose ps

echo "✅ Triển khai cập nhật thành công!"
