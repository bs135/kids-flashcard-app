# 🌟 Kids Flashcard App

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Fastify-4-000000?logo=fastify&logoColor=white" alt="Fastify 4" />
  <img src="https://img.shields.io/badge/SQLite-WAL_Mode-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
</p>

Ứng dụng web học từ vựng tiếng Anh tương tác, trực quan và sinh động dành riêng cho trẻ em (Kids & Toddlers). Kết hợp âm thanh chuẩn bản xứ (Edge-TTS), hình ảnh hoạt hình ngộ nghĩnh, hệ thống thú cưng ảo (Virtual Pet Gamification), các mini-game rèn luyện phản xạ và công cụ quản trị thông minh hỗ trợ sinh thẻ bằng AI (Google Gemini).

---

## 🚀 Tính Năng Nổi Bật (Key Features)

### 🎨 Dành Cho Bé Học & Chơi (Kid Experience)
- **Bản Đồ Chủ Đề (Topic Map)**: Giao diện trực quan với 8 chủ đề quen thuộc (Màu sắc, Động vật hoang dã, Thú cưng, Sinh vật biển, Trái cây, Rau củ, Hình dạng, Món ăn) kèm chế độ "Tất Cả Từ Vựng".
- **Học Thẻ Tương Tác (Flashcard Viewer)**:
  - Hiệu ứng lật thẻ 3D mượt mà (`Framer Motion`).
  - Tỉ lệ thẻ bài chuẩn (`aspect ratio`), giao diện bo tròn ngộ nghĩnh.
  - Mỗi lượt học phân bổ ngẫu nhiên 5 từ vựng, tránh gây quá tải nhận thức cho bé.
  - Phát âm chuẩn giọng Anh - Mỹ tự nhiên bằng Microsoft Edge-TTS.
- **Hệ Thống Thú Cưng & Phần Thưởng (Virtual Pet & Stars)**:
  - Thu thập ngôi sao sau mỗi thẻ học hoặc mini-game.
  - Cho thú cưng (Khủng long Dino, Mèo Kitty, Cún cưng) ăn để tăng cấp và mở khóa diện mạo mới.
- **Mini-Game Vui Nhộn**:
  - 🎈 **Bong Bóng Từ Vựng (Bubble Pop)**: Luyện nghe và bấm nổ bong bóng chứa từ tiếng Anh chính xác.
  - 🃏 **Lật Thẻ Trí Nhớ (Memory Flip)**: Rèn luyện trí nhớ qua trò chơi ghép cặp từ vựng - hình ảnh.

### ⚙️ Trang Quản Trị & Công Cụ AI (Admin Panel)
- **Sinh Thẻ Tự Động Bằng AI**: Nhập danh sách từ vựng bất kỳ, AI (Google Gemini) tự động tạo phiên âm quốc tế (IPA), dịch nghĩa tiếng Việt và đặt câu ví dụ song ngữ chuẩn ngữ cảnh trẻ em.
- **Kiểm Soát Tính Năng & Bảo Vệ Tài Nguyên (Feature Flags & Rate Limiting)**:
  - Giới hạn hạn ngạch tạo từ AI theo địa chỉ IP mỗi ngày.
  - Bật/tắt chế độ tạo ảnh AI hoặc tải ảnh thủ công từ máy tính.
- **Bảo Vệ Dữ Liệu Gốc (Seed Protection)**:
  - Bảo vệ tuyệt đối 115 thẻ từ vựng chuẩn ban đầu của hệ thống (chống xóa nhầm).
  - Khóa trường từ vựng gốc (`Word`) khi sửa thẻ để giữ nguyên tính toàn vẹn của tệp ảnh `.webp` và âm thanh `.mp3`.
  - Hỗ trợ xóa an toàn các thẻ do người dùng tự tạo kèm dọn dẹp file rác trên ổ đĩa.
  - Hỗ trợ tải ảnh thủ công từ máy tính (tự động nén và chuyển đổi sang chuẩn `.webp` chất lượng cao với Sharp).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS | Single Page Application tốc độ cao, giao diện hoạt hình chuẩn responsive |
| **Animation & Audio** | Framer Motion, Canvas-Confetti, Howler.js | Hiệu ứng chuyển động nảy, pháo hoa ăn mừng và âm thanh tương tác |
| **Icons** | Lucide React | Bộ biểu tượng hiện đại, nhẹ và đồng bộ |
| **Backend** | Node.js (ESM), Fastify 4 | RESTful API hiệu năng cao, static file serving, rate limiting |
| **Database** | SQLite (`better-sqlite3`) | Cơ sở dữ liệu nhúng siêu nhanh, bật chế độ WAL Mode |
| **AI & Media** | Google Gemini API, Microsoft Edge-TTS, Sharp | Sinh ngữ nghĩa bằng AI, tạo giọng đọc bản xứ và nén ảnh WebP |
| **Deployment** | Docker (Multi-stage), Docker Compose, Caddy 2 | Đóng gói 1 container siêu nhẹ, tự động cấp HTTPS/SSL qua Let's Encrypt |

---

## 📂 Cấu Trúc Dự Án (Project Structure)

```text
kids-flashcard-app/
├── backend/
│   ├── data/                 # File database SQLite (database.sqlite)
│   ├── src/
│   │   ├── db/               # Schema, migrations & dữ liệu seed gốc (115 thẻ)
│   │   ├── services/         # Gemini AI, Edge-TTS, Image processing & Sharp
│   │   ├── utils/            # Slugify, helpers
│   │   └── server.js         # Fastify API server & SPA fallback static handler
│   ├── uploads/              # Thư mục lưu media cục bộ (/images, /audio)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Flashcard, FlashcardViewer, TopicMap, AdminPanel, MiniGames
│   │   ├── services/         # API Client, Sound Effects, Speech synthesis
│   │   ├── App.jsx           # Root layout & navigation state
│   │   └── main.jsx
│   ├── public/               # Static assets (icon, sounds)
│   └── package.json
├── Caddyfile                 # Cấu hình Reverse Proxy & SSL tự động
├── Dockerfile                # Multi-stage Docker build (Frontend + Backend)
├── docker-compose.yml        # Định nghĩa services App + Caddy
├── deploy.sh                 # Script cập nhật ứng dụng tự động trên VPS
├── DEPLOY_GUIDE.md           # Hướng dẫn triển khai VPS Linux chi tiết
└── .env.example              # Mẫu biến môi trường
```

---

## 💻 Cài Đặt & Chạy Cục Bộ (Local Development)

### Yêu Cầu Cài Đặt
- Node.js >= 20.x
- npm >= 10.x

### 1. Clone Kho Mã Nguồn
```bash
git clone https://github.com/bs135/kids-flashcard-app.git
cd kids-flashcard-app
```

### 2. Cài Đặt & Chạy Backend
```bash
cd backend
npm install

# Tạo file .env và điền GEMINI_API_KEY
cp .env.example .env

# Nạp dữ liệu seed chuẩn (8 chủ đề, 115 thẻ từ vựng)
npm run seed

# Khởi động Backend server (cổng 3001)
npm run dev
```

### 3. Cài Đặt & Chạy Frontend
Mở một cửa sổ terminal mới:
```bash
cd frontend
npm install

# Khởi chạy Vite dev server (cổng 5173)
npm run dev
```

Mở trình duyệt tại: `http://localhost:5173`

---

## 🐳 Triển Khai Với Docker & Production VPS

Hệ thống đã được đóng gói sẵn sàng cho môi trường Production trên bất kỳ VPS Linux nào (Ubuntu, Debian, CentOS, v.v.):

```bash
# 1. Tạo file môi trường
cp .env.example .env

# 2. Khởi chạy toàn bộ hệ thống (App + Caddy HTTPS)
docker compose up -d --build

# 3. Xem log hoạt động
docker compose logs -f
```

👉 Xem toàn bộ tài liệu hướng dẫn cấu hình DNS, Firewall, Sao lưu dữ liệu tại: [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md).

---

## 📄 Giấy Phép (License)

Dự án được phân phối dưới giấy phép **MIT License**. Mọi đóng góp và mã nguồn đều hoàn toàn mở cho cộng đồng giáo dục.

---

<p align="center">
  Phát triển với sự tận tâm dành cho việc học tập trực quan của trẻ thơ ❤️
</p>