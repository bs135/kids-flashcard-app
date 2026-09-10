# 📐 SYSTEM SPECIFICATION & IMPLEMENTATION PLAN
**Dự án:** Kids English Flashcard Web App  
**Tài liệu:** Đặc tả kỹ thuật và Kế hoạch triển khai hệ thống (System Specification & Implementation Plan)  
**Phiên bản:** 1.0.0  

---

## 1. Kiến Trúc Hệ Thống Tổng Thể

Hệ thống được thiết kế theo mô hình Client - Server tách biệt nhẹ nhàng (*Lightweight Monolith / Decoupled Architecture*), tối ưu cho việc vận hành trên máy chủ VPS Linux (Ubuntu) với lượng tài nguyên RAM < 150MB.

```
+-------------------------------------------------------------------------+
|                              CLIENT (Trình duyệt)                       |
|  - React 18 + Vite (SPA)                                                |
|  - Tailwind CSS + Lucide Icons                                           |
|  - Framer Motion (Lật thẻ 3D, hiệu ứng sao, nổ bóng)                   |
|  - Web Audio / Howler.js / Web Speech API (Client Fallback TTS)         |
+------------------------------------+------------------------------------+
                                     | (REST API / JSON / Static Audio)
                                     v
+-------------------------------------------------------------------------+
|                        REVERSE PROXY (Caddy / Nginx)                    |
|  - Tự động cấp phát chứng chỉ HTTPS (Let's Encrypt)                     |
|  - Định tuyến /api -> Fastify Backend (Port 3001)                       |
|  - Phục vụ Static SPA Files (Dist) & Media Uploads (/uploads)           |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                        BACKEND (Node.js + Fastify)                      |
|  - Fastify Server (Port 3001) - Siêu nhẹ, tốc độ cao                   |
|  - Better-SQLite3: Truy vấn CSDL file trực tiếp (In-process DB)         |
|  - Module TTS: Edge-TTS (Phát sinh giọng đọc chuẩn AI en-US-AnaNeural)  |
|  - Module AI Auto-Generate: Google Gemini API (Flash 2.0/1.5)           |
|  - Module Image Fetcher: Pollinations.ai / Pexels API                   |
+-------------------+--------------------------------+--------------------+
                    |                                |
                    v                                v
+-------------------------------+  +--------------------------------------+
|     DATABASE (SQLite File)    |  |       MEDIA STORAGE (Disk Volume)    |
|   `./backend/data/app.db`     |  |   `./backend/uploads/audio/*.mp3`    |
|   - Topics                    |  |   `./backend/uploads/images/*.webp`  |
|   - Flashcards                |  +--------------------------------------+
|   - User Progress & Streaks   |
+-------------------------------+
```

### 1.1. Cấu Trúc Thư Mục Dự Án Khuyến Nghị (Monorepo)
```
kids-flashcard-app/
├── IDEATION_AND_FEASIBILITY.md
├── SYSTEM_SPEC_AND_PLAN.md
├── docker-compose.yml
├── Caddyfile
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── assets/            # Âm thanh game (chime, pop, win), icons
│       ├── components/        # Flashcard, BubbleQuiz, VirtualPet, Navbar
│       ├── pages/             # HomePage, TopicPage, LearnPage, GamePage, AdminPage
│       ├── services/          # api.js, speech.js, soundEffects.js
│       └── store/             # state quản lý điểm sao, thú cưng, tiến trình
└── backend/
    ├── package.json
    ├── server.js              # Entry point Fastify
    ├── .env.example
    ├── src/
    │   ├── config/            # DB setup & env variables
    │   ├── routes/            # topics.js, cards.js, generate.js, progress.js
    │   ├── services/          # geminiService.js, edgeTtsService.js, imageService.js
    │   └── utils/             # helper functions
    ├── uploads/               # Lưu file audio mp3 và hình ảnh sinh tự động
    └── data/                  # Chứa file app.db (SQLite)
```

---

## 2. Thiết Kế Cơ Sở Dữ Liệu SQLite (Database Schema)

Sử dụng thư viện `better-sqlite3` đồng bộ, tốc độ cao, không cần ORM nặng nề.

### 2.1. Bảng `topics` (Chủ đề học tập)
Lưu trữ thông tin các chủ đề (Động vật, Màu sắc, Hoa quả, v.v.).

```sql
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,               -- Slug dạng chuỗi: 'animals', 'colors', 'fruits'
    name_en TEXT NOT NULL,             -- Tên tiếng Anh: 'Animals'
    name_vi TEXT NOT NULL,             -- Tên tiếng Việt: 'Động vật'
    icon TEXT NOT NULL,                -- Icon biểu trưng (Emoji hoặc Lucide icon name)
    color_theme TEXT DEFAULT 'amber',  -- Tông màu UI (amber, emerald, rose, sky...)
    display_order INTEGER DEFAULT 0,   -- Thứ tự sắp xếp trên bản đồ/danh sách
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2. Bảng `flashcards` (Thẻ từ vựng)
Chứa thông tin chi tiết từng từ, phiên âm, hình ảnh và file phát âm.

```sql
CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT NOT NULL,            -- Khóa ngoại liên kết bảng topics(id)
    word TEXT NOT NULL,                -- Từ vựng tiếng Anh: 'elephant'
    phonetic TEXT,                     -- Phiên âm IPA: '/ˈel.ɪ.fənt/'
    meaning_vi TEXT NOT NULL,          -- Nghĩa tiếng Việt: 'con voi'
    example_en TEXT,                   -- Câu ví dụ: 'An elephant is big.'
    example_vi TEXT,                   -- Dịch câu ví dụ: 'Con voi rất to lớn.'
    image_url TEXT NOT NULL,           -- URL ảnh (Local /uploads/... hoặc Online URL)
    audio_url TEXT,                    -- URL file phát âm .mp3 cục bộ
    difficulty INTEGER DEFAULT 1,       -- Độ khó (1: Cơ bản, 2: Trung bình, 3: Nâng cao)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id);
```

### 2.3. Bảng `user_progress` (Tiến trình học tập & Thú cưng)
Lưu trữ sao thưởng, chuỗi ngày học và trạng thái thú cưng.

```sql
CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY DEFAULT 'default_kid', -- Dùng ID mặc định cho profile trên 1 thiết bị/hộ gia đình
    stars INTEGER DEFAULT 0,                   -- Tổng số sao tích lũy
    feed_count INTEGER DEFAULT 0,              -- Số lần đã cho thú cưng ăn
    pet_type TEXT DEFAULT 'dino',              -- Loại thú cưng: 'dino', 'cat', 'dog'
    pet_level INTEGER DEFAULT 1,               -- Cấp độ thú cưng (1: Baby, 2: Junior, 3: Master)
    streak_days INTEGER DEFAULT 1,             -- Số ngày học liên tiếp
    last_active_date DATE DEFAULT (DATE('now')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4. Bảng `topic_progress` (Đánh dấu trạng thái học theo chủ đề)
```sql
CREATE TABLE IF NOT EXISTS topic_progress (
    topic_id TEXT PRIMARY KEY,
    is_unlocked INTEGER DEFAULT 1,             -- 1: Đã mở khóa, 0: Đang khóa
    cards_learned INTEGER DEFAULT 0,           -- Số thẻ bé đã học xong
    quiz_high_score INTEGER DEFAULT 0,         -- Điểm kỷ lục game Bong bóng
    FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
);
```

---

## 3. Danh Sách RESTful API Endpoints

Mọi request và response đều định dạng JSON chuẩn. Đường dẫn gốc: `/api/v1`.

### 3.1. Nhóm Chủ Đề (Topics)
* `GET /api/v1/topics`
  * **Mô tả:** Lấy danh sách toàn bộ chủ đề kèm số lượng thẻ và tiến trình hoàn thành.
  * **Response 200:**
    ```json
    [
      {
        "id": "animals",
        "name_en": "Animals",
        "name_vi": "Động vật",
        "icon": "🦁",
        "color_theme": "amber",
        "total_cards": 12,
        "learned_cards": 5,
        "is_unlocked": true
      }
    ]
    ```
* `POST /api/v1/topics`
  * **Mô tả:** Tạo chủ đề mới (Admin).
  * **Body:** `{ "id": "fruits", "name_en": "Fruits", "name_vi": "Trái cây", "icon": "🍎", "color_theme": "rose" }`

### 3.2. Nhóm Flashcards
* `GET /api/v1/topics/:topicId/cards`
  * **Mô tả:** Lấy toàn bộ danh sách flashcards thuộc một chủ đề.
  * **Response 200:**
    ```json
    [
      {
        "id": 1,
        "topic_id": "animals",
        "word": "cat",
        "phonetic": "/kæt/",
        "meaning_vi": "con mèo",
        "example_en": "The cat is sleeping.",
        "example_vi": "Con mèo đang ngủ.",
        "image_url": "/uploads/images/cat.webp",
        "audio_url": "/uploads/audio/cat.mp3"
      }
    ]
    ```
* `POST /api/v1/cards`
  * **Mô tả:** Thêm một thẻ thủ công (Admin).
* `DELETE /api/v1/cards/:id`
  * **Mô tả:** Xóa một thẻ từ vựng.

### 3.3. Nhóm Tự Động Tạo Thẻ (Auto-Generate Flashcards)
* `POST /api/v1/generate/batch`
  * **Mô tả:** Nhận danh sách từ vựng thô, gọi Gemini API phân tích và tạo trọn gói (Từ + Phiên âm + Dịch nghĩa + Ảnh + TTS).
  * **Request Body:**
    ```json
    {
      "topic_id": "animals",
      "words": ["cat", "dog", "elephant", "giraffe"]
    }
    ```
  * **Quy trình xử lý tại Backend:**
    1. **Gemini API:** Gửi prompt có cấu trúc JSON Schema để lấy danh sách: `{ word, phonetic, meaning_vi, example_en, example_vi, image_keyword }`.
    2. **Image Fetcher:** Tự động tải hình ảnh hoạt hình cute từ `Pollinations.ai` hoặc lưu link URL ảnh tối ưu.
    3. **Edge-TTS Service:** Chạy tiến trình sinh file giọng đọc chuẩn `en-US-AnaNeural` (giọng trẻ em bản xứ) và lưu vào thư mục `uploads/audio/{word}.mp3`.
    4. **SQLite Insertion:** Lưu hàng loạt dữ liệu hoàn chỉnh vào bảng `flashcards`.
  * **Response 201:**
    ```json
    {
      "status": "success",
      "added_count": 4,
      "cards": [ ...danh sách thẻ vừa tạo hoàn chỉnh... ]
    }
    ```

### 3.4. Nhóm Tiến Trình & Gamification (Progress & Pet)
* `GET /api/v1/progress`
  * **Mô tả:** Lấy trạng thái sao, cấp độ thú cưng và chuỗi ngày học hiện tại.
* `POST /api/v1/progress/star`
  * **Mô tả:** Tích lũy thêm sao khi học xong thẻ hoặc thắng mini-game.
  * **Body:** `{ "amount": 2 }`
* `POST /api/v1/progress/feed-pet`
  * **Mô tả:** Dùng sao để cho thú cưng ăn và nâng cấp độ.
  * **Response 200:** `{ "success": true, "pet_level": 2, "remaining_stars": 3 }`

---

## 4. Kế Hoạch Triển Khai Chi Tiết (Milestones & Checklist)

Thứ tự ưu tiên được phân chia thành 5 Giai đoạn (Milestones) độc lập, dễ dàng phân chia cho các Subagents thực hiện:

### 🚩 Milestone 1: Khởi Tạo Hạ Tầng & Dữ Liệu Nền Tảng (Core Setup & Backend)
- [x] **Task 1.1:** Khởi tạo cấu trúc Monorepo (`frontend/`, `backend/`, thư mục `uploads/`, `data/`).
- [x] **Task 1.2:** Cài đặt Backend Fastify, cấu hình CORS, phục vụ Static Assets (`@fastify/static` cho ảnh và mp3).
- [x] **Task 1.3:** Thiết lập SQLite với `better-sqlite3`, viết script Migration khởi tạo bảng (`topics`, `flashcards`, `user_progress`, `topic_progress`).
- [x] **Task 1.4:** Tạo script Seed Data nạp sẵn dữ liệu mẫu cho các chủ đề cơ bản (Animals, Colors) gồm 10 thẻ từ vựng ban đầu.
- [x] **Task 1.5:** Triển khai các API CRUD cơ bản: `GET /api/v1/topics`, `GET /api/v1/topics/:topicId/cards`, `GET /api/v1/progress`.

### 🚩 Milestone 2: Giao Diện Trẻ Em & Trải Nghiệm Học Thẻ (Kids UI & Flashcard Player)
- [x] **Task 2.1:** Khởi tạo Frontend React + Vite + Tailwind CSS. Cấu hình bảng màu Pastel rực rỡ và font chữ tròn (*Quicksand/Fredoka*).
- [x] **Task 2.2:** Xây dựng Component **Flashcard 3D**:
  - Mặt trước: Ảnh minh họa to rõ, nút loa phát âm to tròn, từ tiếng Anh và phiên âm IPA.
  - Mặt sau: Nghĩa tiếng Việt, ví dụ minh họa song ngữ.
  - Animation: Lật thẻ 3D mượt mà bằng CSS / Framer Motion.
- [x] **Task 2.3:** Xây dựng hệ thống phát âm đa tầng (*Hybrid Audio System*):
  - Ưu tiên 1: Phát file mp3 chất lượng cao từ server (`card.audio_url`).
  - Dự phòng 2: Gọi `window.speechSynthesis` (Web Speech API) tự động nếu mất mạng hoặc chưa có mp3.
- [x] **Task 2.4:** Xây dựng trang danh mục chủ đề (Topic Grid/Map) hiển thị thanh tiến trình hoàn thành.

### 🚩 Milestone 3: Tích Hợp Gemini API & Edge-TTS (Auto-Generate Engine)
- [x] **Task 3.1:** Xây dựng Service tích hợp Google Gemini API (`@google/genai` hoặc REST) xử lý dịch nghĩa, tạo phiên âm chuẩn IPA và câu ví dụ theo định dạng JSON.
- [x] **Task 3.2:** Tích hợp engine sinh giọng đọc `edge-tts` trên Backend (Node.js) để tự động xuất file `.mp3` chất lượng giọng trẻ em `en-US-AnaNeural`.
- [x] **Task 3.3:** Xây dựng pipeline tích hợp ảnh tự động qua `Pollinations.ai` (đồng bộ style cartoon/cute).
- [x] **Task 3.4:** Xây dựng giao diện Trang Quản Trị (Admin Page) cho phụ huynh:
  - Có cổng khóa bảo vệ trẻ em (*Parental Gate* dạng phép tính đơn giản `3 x 5 = ?`).
  - Khung nhập danh sách từ (textarea: `cat, dog, lion...`) $\rightarrow$ Nút bấm 1-Click Auto Generate $\rightarrow$ Preview và lưu thẻ.

### 🚩 Milestone 4: Triển Khai Các Tính Năng Gamification (Mini-Games & Pet)
- [ ] **Task 4.1:** Phát triển Mini-game **"Bong Bóng Từ Vựng" (Bubble Pop Challenge)**:
  - Đồng hồ đếm ngược 60 giây, bóng bay trôi từ dưới lên.
  - Nghe loa phát âm $\rightarrow$ Bấm vỡ bong bóng đúng $\rightarrow$ Hiệu ứng âm thanh nổ pop + cộng sao ⭐.
- [ ] **Task 4.2:** Phát triển Mini-game **"Lật Thẻ Trí Nhớ" (Memory Matching Game)**:
  - Bàn cờ 8–12 thẻ bài ghép đôi giữa Hình ảnh và Từ vựng.
- [ ] **Task 4.3:** Xây dựng Component **"Bạn Thú Cưng Đồng Hành" (Virtual Pet Widget)**:
  - Hiển thị linh vật (Khủng long Dino con).
  - Nút "Cho ăn": Dùng sao đổi lấy đồ ăn, thú cưng nhảy múa và tăng cấp độ.
- [ ] **Task 4.4:** Tích hợp hiệu ứng pháo hoa ăn mừng (`canvas-confetti`) và thư viện âm thanh vui nhộn (`howler.js`).

### 🚩 Milestone 5: Đóng Gói Docker & Hướng Dẫn Triển Khai VPS Linux (Production Ready)
- [ ] **Task 5.1:** Viết `Dockerfile` tối ưu hóa cho Frontend (Build tĩnh) và Backend Fastify.
- [ ] **Task 5.2:** Viết file `docker-compose.yml` tích hợp sẵn Reverse Proxy Caddy và lưu trữ Volume cho SQLite DB (`/data`) và Media (`/uploads`).
- [ ] **Task 5.3:** Viết tài liệu `DEPLOY_GUIDE.md` hướng dẫn chi tiết từng câu lệnh từ khi mua VPS Ubuntu đến lúc chạy website với tên miền và HTTPS tự động.
- [ ] **Task 5.4:** Kiểm thử toàn diện hiệu năng và dung lượng tiêu thụ RAM trên môi trường máy chủ.
