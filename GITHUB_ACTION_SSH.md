
# GitHub Actions và SSH

### Bước 1: Tạo cặp khóa SSH (SSH Key Pair) dành riêng cho deploy
Bạn nên tạo một cặp khóa SSH mới (không dùng chung với các khóa cá nhân khác) để đảm bảo tính bảo mật.

1. **Truy cập vào VPS của bạn hoặc mở Terminal máy cá nhân và chạy lệnh:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key -C "github-actions-deploy"
   ```
   *Khi được hỏi mật khẩu (passphrase), hãy nhấn **Enter** để trống (không đặt mật khẩu).*

2. Lệnh này sẽ tạo ra 2 file trong thư mục `~/.ssh/`:
   * `github_deploy_key` (đây là **Private Key** - tuyệt đối giữ bí mật).
   * `github_deploy_key.pub` (đây là **Public Key** - dùng để cấu hình trên VPS).

---

### Bước 2: Cấu hình Public Key trên VPS
Bạn cần cấp quyền cho phép bất kỳ ai sở hữu Private Key ở Bước 1 có thể đăng nhập vào VPS.

1. Đăng nhập vào VPS bằng quyền root/sudo.
2. Mở file `authorized_keys` để chỉnh sửa:
   ```bash
   nano ~/.ssh/authorized_keys
   ```
3. Copy toàn bộ nội dung của file Public Key (`github_deploy_key.pub` đã tạo ở Bước 1) và paste vào cuối file `authorized_keys`.
4. Lưu file và thoát (Nhấn `Ctrl + O` -> `Enter` để lưu, `Ctrl + X` để thoát).
5. Phân quyền chuẩn cho thư mục SSH để tránh lỗi không nhận khóa:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

---

### Bước 3: Cấu hình Secrets trên GitHub Repository
Hãy đưa các thông tin kết nối an toàn vào GitHub để workflow có thể sử dụng mà không bị lộ thông tin nhạy cảm trong mã nguồn.

1. Truy cập vào kho chứa (repository) của bạn trên GitHub.
2. Đi tới: **Settings** > **Secrets and variables** > **Actions** > Nhấn **New repository secret**.
3. Thêm lần lượt 3 biến bảo mật sau:
   * **Tên:** `SSH_HOST`  
     **Giá trị:** Địa chỉ IP Public của VPS (ví dụ: `123.45.67.89`).
   * **Tên:** `SSH_USERNAME`  
     **Giá trị:** Tên user chạy deploy trên VPS (ví dụ: `root` hoặc `ubuntu`).
   * **Tên:** `SSH_PRIVATE_KEY`  
     **Giá trị:** Copy toàn bộ nội dung file Private Key (`github_deploy_key` ở Bước 1 - bao gồm cả dòng đầu `-----BEGIN OPENSSH PRIVATE KEY-----` và dòng cuối `-----END OPENSSH PRIVATE KEY-----`).

---

### Bước 4: Tạo file Workflow GitHub Actions trong mã nguồn
Hãy tạo tệp tin cấu hình tự động hóa trong thư mục mã nguồn cục bộ của bạn.

1. Trong thư mục gốc của dự án, tạo thư mục `.github/workflows/` (nếu chưa có).
2. Tạo file tên là `deploy.yml` với nội dung dưới đây:

```yaml
name: Auto Deploy to VPS

# Kích hoạt workflow khi có sự kiện push vào nhánh main
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: 22
          script: |
            # 1. Di chuyển vào thư mục dự án trên VPS
            cd /opt/kids-flashcard-app
            
            # 2. Đảm bảo thư mục an toàn cho Git (tránh lỗi bảo mật của Git)
            git config --global --add safe.directory /opt/kids-flashcard-app
            
            # 3. Chạy script deploy.sh đã có sẵn trong dự án
            chmod +x deploy.sh
            ./deploy.sh
```

### Bước 5: Kiểm tra và vận hành
1. Hãy commit file `.github/workflows/deploy.yml` mới tạo này và push lên nhánh `main` của repo GitHub.
2. Trên giao diện GitHub, chuyển sang tab **Actions**, bạn sẽ thấy một workflow có tên `Auto Deploy to VPS` đang được chạy.
3. Khi workflow chạy xong (chuyển sang màu xanh ✅), toàn bộ quá trình: kéo code mới nhất từ Git, build lại Docker container ứng dụng, xóa rác image thừa trên VPS của bạn đã hoàn thành hoàn toàn tự động!
