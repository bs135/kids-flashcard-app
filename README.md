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

An interactive, visual, and engaging web app for kids and toddlers learning English vocabulary. Featuring natural native audio (Edge-TTS), adorable cartoon illustrations, virtual pet gamification, reflex-building mini-games, and an intelligent AI-assisted admin panel powered by Google Gemini.

---

## 🚀 Key Features

### 🎨 Kid Experience
- **Topic Map**: Visual interface featuring 8 popular themes (Colors, Wild Animals, Pets, Sea Creatures, Fruits, Vegetables, Shapes, Foods) plus an "All Words" exploration mode.
- **Interactive Flashcard Viewer**:
  - Smooth 3D card flip animation (`Framer Motion`).
  - Child-friendly card aspect ratio with rounded, playful aesthetics.
  - 5 random words per study session to prevent cognitive fatigue.
  - Natural native American English pronunciation via Microsoft Edge-TTS.
- **Virtual Pet & Star Rewards**:
  - Collect stars after each flashcard reviewed or mini-game won.
  - Feed pets (Dino, Kitty, Puppy) to level them up and unlock fresh appearances.
- **Engaging Mini-Games**:
  - 🎈 **Bubble Pop**: Listen to audio prompts and pop the balloon matching the correct English word.
  - 🃏 **Memory Flip**: Strengthen short-term memory through image-to-word card matching.

### ⚙️ Admin Panel & AI Tools
- **Automated AI Flashcard Generation**: Enter vocabulary lists; Google Gemini automatically generates IPA phonetics, Vietnamese definitions, and kid-appropriate bilingual example sentences.
- **Feature Flags & Resource Governance**:
  - IP-based daily rate limiting for AI card generation.
  - Toggle switches for AI image generation vs. manual uploads.
- **Seed Data Protection**:
  - Full protection for the 115 initial seed cards (prevents accidental deletion).
  - Word field locked on edit to preserve media link integrity (`.webp`, `.mp3`).
  - Safe deletion of custom user-created flashcards with automatic orphaned disk file cleanup.
  - Manual image upload support with automatic Sharp compression and conversion to `.webp`.

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS | High-performance SPA with responsive cartoon UI |
| **Animation & Audio** | Framer Motion, Canvas-Confetti, Howler.js | Bouncy micro-interactions, celebration confetti, and game sound effects |
| **Icons** | Lucide React | Clean, consistent, and lightweight icon library |
| **Backend** | Node.js (ESM), Fastify 4 | High-throughput RESTful API, static file serving, and rate limiting |
| **Database** | SQLite (`better-sqlite3`) | High-speed embedded SQL database in WAL mode |
| **AI & Media** | Google Gemini API, Microsoft Edge-TTS, Sharp | Semantic AI generation, native neural speech synthesis, and WebP optimization |
| **Deployment** | Docker (Multi-stage), Docker Compose, Caddy 2 | Lightweight single-container deployment with automatic Let's Encrypt HTTPS |

---

## 📂 Project Structure

```text
kids-flashcard-app/
├── backend/
│   ├── data/                 # SQLite database file (database.sqlite)
│   ├── src/
│   │   ├── db/               # Schema, migrations & 115 seed flashcards
│   │   ├── services/         # Gemini AI, Edge-TTS, image processing & Sharp
│   │   ├── utils/            # Slugify, helpers
│   │   └── server.js         # Fastify API server & SPA fallback static handler
│   ├── uploads/              # Media storage: /seed (Git tracked) & /user (Git ignored)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Flashcard, FlashcardViewer, TopicMap, AdminPanel, MiniGames
│   │   ├── services/         # API client, sound effects, speech synthesis
│   │   ├── App.jsx           # Root layout & navigation state
│   │   └── main.jsx
│   ├── public/               # Static assets (icons, sounds)
│   └── package.json
├── Caddyfile                 # Caddy Reverse Proxy & automated SSL configuration
├── Dockerfile                # Multi-stage Docker build (Frontend + Backend)
├── docker-compose.yml        # Docker service definitions (App + Caddy)
├── deploy.sh                 # VPS automated deployment & update script
├── DEPLOY_GUIDE.md           # Production Linux VPS deployment guide
└── .env.example              # Environment variable template
```

---

## 💻 Local Development

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 1. Clone the Repository
```bash
git clone https://github.com/bs135/kids-flashcard-app.git
cd kids-flashcard-app
```

### 2. Set Up & Run Backend
```bash
cd backend
npm install

# Copy .env and configure GEMINI_API_KEY
cp .env.example .env

# Seed standard data (8 topics, 115 cards)
npm run seed

# Start backend development server (port 3001)
npm run dev
```

### 3. Set Up & Run Frontend
In a new terminal window:
```bash
cd frontend
npm install

# Start Vite dev server (port 5173)
npm run dev
```

Open your browser at: `http://localhost:5173`

---

## 🐳 Docker & Production VPS Deployment

The project is container-ready for any Linux VPS distribution (Ubuntu, Debian, etc.):

```bash
# 1. Create environment file
cp .env.example .env

# 2. Start all services (App + Caddy HTTPS)
docker compose up -d --build

# 3. View live logs
docker compose logs -f

# 4. Optional: Synchronize seed cards or clean reset
./deploy.sh --seed           # Sync default cards
./deploy.sh --seed --reset   # Auto-backup DB, reset & re-seed from scratch
```

👉 Check out the complete step-by-step DNS, firewall, deployment scripts, and backup guide in [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md).

---

## 📄 License

This project is licensed under the **MIT License**. Contributions and source code are open to the educational community.

---

<p align="center">
  Crafted with care for early childhood visual learning ❤️
</p>
