# Hướng Dẫn Triển Khai Kids Flashcard App Lên VPS Linux (Production Ready)

Tài liệu này hướng dẫn từng bước thiết lập và vận hành hệ thống **Kids Flashcard App** trên máy chủ ảo VPS (Ubuntu 22.04 LTS / 24.04 LTS) sử dụng **Docker**, **Docker Compose** và **Caddy Server** (Tự động cấp và gia hạn chứng chỉ bảo mật HTTPS/SSL qua Let's Encrypt).

---

## 1. Yêu Cầu Hệ Thống & Chuẩn Bị Tên Miền

### 1.1. Cấu hình VPS tối thiểu
- **Hệ điều hành**: Ubuntu 22.04 LTS hoặc Ubuntu 24.04 LTS (x86_64 hoặc ARM64).
- **RAM**: Tối thiểu 1GB (Khuyến nghị 2GB trở lên).
- **Dung lượng đĩa**: Tối thiểu 10GB SSD trống.

### 1.2. Trỏ bản ghi DNS
Đăng nhập vào trang quản lý Domain (Cloudflare, Namecheap, v.v.) và thêm bản ghi DNS:
- **Loại**: `A`
- **Tên**: `flashcards` (hoặc `@` nếu dùng domain gốc)
- **Giá trị**: `<Địa chỉ IP Public của VPS>`
- **Proxy status**: DNS only (Tắt Cloudflare Proxy lúc đầu để Caddy dễ dàng cấp phát chứng chỉ SSL).

---

## 2. Cài Đặt Docker & Cấu Hình Tường Lửa Trên VPS

Kết nối SSH vào VPS với quyền `root` hoặc `sudo`:
```bash
ssh root@<IP_CUA_VPS>
```

### 2.1. Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw
```

### 2.2. Cài đặt Docker Engine & Docker Compose chính thức
```bash
# Tải script cài đặt tự động từ Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm người dùng hiện tại vào nhóm docker (nếu không dùng tài khoản root)
sudo usermod -aG docker $USER

# Kiểm tra phiên bản Docker & Docker Compose
docker --version
docker compose version
```

### 2.3. Cấu hình tường lửa UFW
Cho phép các cổng cần thiết và kích hoạt UFW:
```bash
sudo ufw allow 22/tcp     # Cổng SSH
sudo ufw allow 80/tcp     # HTTP (Caddy xác thực Let's Encrypt)
sudo ufw allow 443/tcp    # HTTPS bảo mật
sudo ufw allow 443/udp    # HTTP/3 (QUIC)
sudo ufw enable
sudo ufw status
```

---

## 3. Triển Khai Ứng Dụng (Deployment)

### 3.1. Clone mã nguồn
```bash
cd /opt
git clone https://github.com/bs135/kids-flashcard-app.git
cd kids-flashcard-app
```

### 3.2. Cấp quyền và tạo các thư mục dữ liệu bền vững
```bash
# Tạo các thư mục lưu database và media cục bộ
mkdir -p backend/data backend/uploads/images backend/uploads/audio

# Phân quyền cho script cập nhật
chmod +x deploy.sh
```

### 3.3. Thiết lập biến môi trường (.env)
Tạo file `.env` từ mẫu `.env.example`:
```bash
cp .env.example .env
nano .env
```

Điền các thông tin quan trọng:
```ini
# Tên miền của ứng dụng
DOMAIN_NAME=flashcards.chipfc.com

PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# Khóa API Gemini (bắt buộc để sinh flashcard)
GEMINI_API_KEY=AIzaSy...

# Feature Flags & Rate Limiting
IMAGE_AI_GENERATE_ENABLE=false
FLASHCARD_GENERATE_ENABLE=true
FLASHCARD_GENERATE_RATE_LIMIT=5
```
*(Nhấn `Ctrl + O` -> `Enter` để lưu, `Ctrl + X` để thoát nano).*

### 3.4. Khởi chạy ứng dụng

#### LỰA CHỌN A: VPS ĐÃ CÓ SẴN NGINX (Khuyến nghị khi máy chủ đang chạy Nginx)
Nếu VPS của bạn đã cài sẵn Nginx và đang chạy các website khác, chỉ cần chạy container ứng dụng (không chạy Caddy để tránh xung đột cổng 80/443):

```bash
# 1. Khởi động container ứng dụng (lắng nghe tại 127.0.0.1:3001)
docker compose up -d --build app

# 2. Tạo cấu hình VirtualHost cho Nginx từ file mẫu:
sudo cp nginx.conf.example /etc/nginx/sites-available/flashcards.chipfc.com
sudo ln -s /etc/nginx/sites-available/flashcards.chipfc.com /etc/nginx/sites-enabled/

# 3. Kiểm tra cú pháp và tải lại Nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Tự động cấp chứng chỉ SSL miễn phí qua Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d flashcards.chipfc.com
```

#### LỰA CHỌN B: VPS TRẮNG CHƯA CÓ WEB SERVER (Dùng Caddy tự động)
Nếu VPS hoàn toàn mới và chưa cài web server nào:
```bash
docker compose --profile with-caddy up -d --build
```

### 3.5. Kiểm tra trạng thái & Log hoạt động
```bash
# Xem trạng thái các containers
docker compose ps

# Xem log thời gian thực của ứng dụng
docker compose logs -f app
```

Sau khi hoàn tất, truy cập trình duyệt tại `https://flashcards.chipfc.com` để trải nghiệm ứng dụng!

---

## 4. Quy Trình Cập Nhật Ứng Dụng Nhanh

Khi bạn có các bản cập nhật mã nguồn mới trên Git, chỉ cần chạy 1 lệnh duy nhất trên VPS:
```bash
./deploy.sh
```
Script sẽ tự động:
1. Kéo mã nguồn mới nhất (`git pull`).
2. Build lại image và cập nhật containers mà không làm mất dữ liệu SQLite và media.
3. Dọn dẹp cache images thừa (`docker image prune -f`).

---

## 5. Sao Lưu & Phục Hồi Dữ Liệu (Backup & Restore)

Dữ liệu của ứng dụng được mount trực tiếp tại hai thư mục trên VPS:
- `/opt/kids-flashcard-app/backend/data/database.sqlite`: Chứa toàn bộ chủ đề, flashcard, điểm sao, thú cưng.
- `/opt/kids-flashcard-app/backend/uploads/`: Chứa hình ảnh WebP và tệp âm thanh Edge-TTS.

### 5.1. Sao lưu định kỳ (Tạo file nén tar.gz)
```bash
# Tạo bản sao lưu với timestamp ngày giờ
BACKUP_NAME="backup_flashcards_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czvf $BACKUP_NAME backend/data backend/uploads
echo "Đã tạo bản sao lưu: $BACKUP_NAME"
```

### 5.2. Phục hồi dữ liệu
Khi cần chuyển sang VPS mới hoặc khôi phục dữ liệu:
```bash
# Dừng container trước khi ghi đè dữ liệu
docker compose down

# Giải nén bản sao lưu đè vào thư mục hiện tại
tar -xzvf backup_flashcards_xxxx.tar.gz

# Khởi động lại ứng dụng
docker compose up -d
```