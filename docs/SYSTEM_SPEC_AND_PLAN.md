# 📐 SYSTEM SPECIFICATION & IMPLEMENTATION PLAN
**Project:** Kids English Flashcard Web App  
**Document:** System Specification & Implementation Plan  
**Version:** 1.0.0  

---

## 1. Overall System Architecture

The system is designed following a lightweight decoupled monolith architecture, optimized for operation on a Linux VPS (Ubuntu) with minimal memory footprint (< 150MB RAM).

```
+-------------------------------------------------------------------------+
|                              CLIENT (Browser)                           |
|  - React 18 + Vite (SPA)                                                |
|  - Tailwind CSS + Lucide Icons                                           |
|  - Framer Motion (3D Card flips, star effects, pop animations)          |
|  - Web Audio / Howler.js / Web Speech API (Client Fallback TTS)         |
+------------------------------------+------------------------------------+
                                     | (REST API / JSON / Static Audio)
                                     v
+-------------------------------------------------------------------------+
|                        REVERSE PROXY (Caddy / Nginx)                    |
|  - Automatic Let's Encrypt HTTPS certificates                           |
|  - Routes /api -> Fastify Backend (Port 3001)                           |
|  - Serves static SPA build files (dist) & media uploads (/uploads)      |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                        BACKEND (Node.js + Fastify)                      |
|  - Fastify Server (Port 3001) - Ultra-fast, low memory footprint        |
|  - Better-SQLite3: Direct synchronous in-process database access        |
|  - TTS Module: Edge-TTS (Synthesizes en-US-AnaNeural child voice)       |
|  - AI Generation Module: Google Gemini API (Flash 2.0/1.5)              |
|  - Image Module: Pollinations.ai / Pexels API / Sharp WebP converter    |
+-------------------+--------------------------------+--------------------+
                    |                                |
                    v                                v
+-------------------------------+  +--------------------------------------+
|     DATABASE (SQLite File)    |  |       MEDIA STORAGE (Disk Volume)    |
|   `./backend/data/database.sqlite`|  |   `./backend/uploads/seed/` (Git)    |
|   - Topics                    |  |   `./backend/uploads/user/` (Uploads)|
|   - Flashcards                |  +--------------------------------------+
|   - User Progress & Streaks   |
+-------------------------------+
```

### 1.1. Monorepo Project Structure
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
│       ├── assets/            # Game audio (chime, pop, win), icons
│       ├── components/        # Flashcard, BubbleQuiz, VirtualPet, Navbar
│       ├── services/          # api.js, speech.js, soundEffects.js
│       ├── App.jsx            # Main app & navigation state
│       └── main.jsx
└── backend/
    ├── package.json
    ├── .env.example
    ├── uploads/               # Seed media (tracked) & user media (untracked)
    │   ├── seed/              # System default media (images/ & audio/)
    │   └── user/              # User-uploaded / generated media (images/ & audio/)
    ├── data/                  # SQLite database file (database.sqlite)
    └── src/
        ├── db/                # Schema, migrations & seed scripts
        ├── services/          # geminiService.js, edgeTtsService.js, imageService.js
        ├── utils/             # Helper functions
        └── server.js          # Fastify entry point
```

---

## 2. SQLite Database Schema Design

Built using `better-sqlite3` for fast, synchronous, zero-overhead database operations.

### 2.1. `topics` Table
Stores learning topic metadata (Animals, Colors, Fruits, etc.).

```sql
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,               -- Unique slug identifier: 'animals', 'colors', 'fruits'
    name_en TEXT NOT NULL,             -- English title: 'Animals'
    name_vi TEXT NOT NULL,             -- Vietnamese title: 'Động vật'
    icon TEXT NOT NULL,                -- Representative icon (Emoji or Lucide icon name)
    color_theme TEXT DEFAULT 'amber',  -- UI color scheme (amber, emerald, rose, sky...)
    display_order INTEGER DEFAULT 0,   -- Ordering sequence for maps/lists
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2. `flashcards` Table
Contains vocabulary entries, phonetics, media paths, and translations.

```sql
CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT NOT NULL,            -- Foreign key linking to topics(id)
    word TEXT NOT NULL,                -- English vocabulary word: 'elephant'
    phonetic TEXT,                     -- IPA phonetics: '/ˈel.ɪ.fənt/'
    meaning_vi TEXT NOT NULL,          -- Vietnamese definition: 'con voi'
    example_en TEXT,                   -- Contextual example: 'An elephant is big.'
    example_vi TEXT,                   -- Translated example: 'Con voi rất to lớn.'
    image_url TEXT NOT NULL,           -- Image URL (Local /uploads/... or external URL)
    audio_url TEXT,                    -- Local .mp3 audio file URL
    difficulty INTEGER DEFAULT 1,       -- Difficulty level (1: Beginner, 2: Intermediate, 3: Advanced)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id);
```

### 2.3. `user_progress` Table
Stores star counts, daily streaks, and pet progression.

```sql
CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY DEFAULT 'default_kid', -- Default household profile identifier
    stars INTEGER DEFAULT 0,                   -- Total accumulated stars
    feed_count INTEGER DEFAULT 0,              -- Times pet has been fed
    pet_type TEXT DEFAULT 'dino',              -- Pet avatar: 'dino', 'cat', 'dog'
    pet_level INTEGER DEFAULT 1,               -- Pet level (1: Baby, 2: Junior, 3: Master)
    streak_days INTEGER DEFAULT 1,             -- Consecutive days learned
    last_active_date DATE DEFAULT (DATE('now')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4. `topic_progress` Table
Tracks completion state and high scores by topic.

```sql
CREATE TABLE IF NOT EXISTS topic_progress (
    topic_id TEXT PRIMARY KEY,
    is_unlocked INTEGER DEFAULT 1,             -- 1: Unlocked, 0: Locked
    cards_learned INTEGER DEFAULT 0,           -- Completed cards count
    quiz_high_score INTEGER DEFAULT 0,         -- High score in Bubble Pop
    FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
);
```

---

## 3. RESTful API Endpoints

All requests and responses use standard JSON formatting. Base route prefix: `/api/v1`.

### 3.1. Topics Group
* `GET /api/v1/topics`
  * **Description:** Retrieve all topics along with flashcard counts and completion status.
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
  * **Description:** Create a new topic (Admin).
  * **Body:** `{ "id": "fruits", "name_en": "Fruits", "name_vi": "Trái cây", "icon": "🍎", "color_theme": "rose" }`

### 3.2. Flashcards Group
* `GET /api/v1/topics/:topicId/cards`
  * **Description:** Fetch all flashcards for a specific topic (supports `topicId = 'all'`).
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
        "image_url": "/uploads/seed/images/animals/cat.webp",
        "audio_url": "/uploads/seed/audio/animals/cat.mp3"
      }
    ]
    ```
* `POST /api/v1/cards`
  * **Description:** Manually add a flashcard (Admin).
* `DELETE /api/v1/cards/:id`
  * **Description:** Delete a custom flashcard.

### 3.3. Auto-Generate Flashcards Group
* `POST /api/v1/generate/batch`
  * **Description:** Accepts a raw list of vocabulary words, calls Gemini API to extract semantics, and generates the complete package (Word + Phonetics + Translation + Illustration + TTS audio).
  * **Request Body:**
    ```json
    {
      "topic_id": "animals",
      "words": ["cat", "dog", "elephant", "giraffe"]
    }
    ```
  * **Backend Processing Pipeline:**
    1. **Gemini API:** Sends structured JSON schema prompt to obtain: `{ word, phonetic, meaning_vi, example_en, example_vi, image_keyword }`.
    2. **Image Fetcher:** Downloads cute cartoon illustrations from `Pollinations.ai` and optimizes them with Sharp.
    3. **Edge-TTS Service:** Synthesizes native child voice audio (`en-US-AnaNeural`) and saves to `uploads/audio/{word}.mp3`.
    4. **SQLite Insertion:** Atomically writes or updates records in the `flashcards` table.
  * **Response 201:**
    ```json
    {
      "status": "success",
      "added_count": 4,
      "cards": [ ...list of created flashcards... ]
    }
    ```

### 3.4. Progress & Gamification Group
* `GET /api/v1/progress`
  * **Description:** Fetch star count, pet level, and current daily streak.
* `POST /api/v1/progress/star`
  * **Description:** Accumulate stars upon reviewing cards or winning mini-games.
  * **Body:** `{ "amount": 2 }`
* `POST /api/v1/progress/feed-pet`
  * **Description:** Consume stars to feed pet and increase pet level.
  * **Response 200:** `{ "success": true, "pet_level": 2, "remaining_stars": 3 }`

---

## 4. Implementation Milestones & Checklist

Execution was organized into 5 modular milestones:

### 🚩 Milestone 1: Core Setup & Backend Foundation
- [x] **Task 1.1:** Initialize monorepo structure (`frontend/`, `backend/`, `uploads/`, `data/`).
- [x] **Task 1.2:** Configure Fastify backend, CORS, and static asset serving (`@fastify/static`).
- [x] **Task 1.3:** Configure SQLite with `better-sqlite3`, run schema migrations (`topics`, `flashcards`, `user_progress`, `topic_progress`).
- [x] **Task 1.4:** Create seed script populating standard curriculum.
- [x] **Task 1.5:** Implement core CRUD APIs: `GET /api/v1/topics`, `GET /api/v1/topics/:topicId/cards`, `GET /api/v1/progress`.

### 🚩 Milestone 2: Kids UI & Flashcard Player
- [x] **Task 2.1:** Set up React + Vite + Tailwind CSS with vibrant pastel palettes and rounded fonts.
- [x] **Task 2.2:** Build 3D Flashcard component:
  - Front: Large illustration, audio button, English word, and IPA.
  - Back: Vietnamese definition, bilingual example sentence.
  - Animation: Smooth 3D flip using Framer Motion.
- [x] **Task 2.3:** Implement hybrid audio system:
  - Priority 1: High-fidelity server audio (`card.audio_url`).
  - Fallback 2: Browser `window.speechSynthesis` (Web Speech API).
- [x] **Task 2.4:** Build Topic Map with progress bars.

### 🚩 Milestone 3: Gemini AI & Edge-TTS Automation
- [x] **Task 3.1:** Implement Google Gemini API service for translation, phonetics, and kid-tailored bilingual examples.
- [x] **Task 3.2:** Integrate `edge-tts` engine for natural `en-US-AnaNeural` voice audio.
- [x] **Task 3.3:** Build image pipeline with `Pollinations.ai` and Sharp WebP conversion.
- [x] **Task 3.4:** Build Admin Panel with arithmetic Parental Gate (`3 x 5 = ?`), batch generator, and preview editor.

### 🚩 Milestone 4: Gamification & Mini-games
- [x] **Task 4.1:** Develop "Bubble Pop" challenge mini-game (60-second timer, floating balloons, audio prompts, pop SFX + star rewards).
- [x] **Task 4.2:** Develop "Memory Flip" matching game.
- [x] **Task 4.3:** Build Virtual Pet companion widget (feed pet, celebrate level-ups).
- [x] **Task 4.4:** Integrate confetti celebrations (`canvas-confetti`) and Howler.js audio effects.

### 🚩 Milestone 5: Docker Packaging & VPS Production Deployment
- [x] **Task 5.1:** Multi-stage `Dockerfile` optimizing frontend build and Fastify backend.
- [x] **Task 5.2:** `docker-compose.yml` supporting Caddy SSL and host Nginx reverse proxy.
- [x] **Task 5.3:** Comprehensive `DEPLOY_GUIDE.md` covering DNS, UFW, Nginx/Caddy, and backup/restore.
- [x] **Task 5.4:** CI/CD auto-deployment with GitHub Actions and SSH (`deploy.yml`).
