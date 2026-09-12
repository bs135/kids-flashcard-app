# Kids Flashcard App Linux VPS Deployment Guide (Production Ready)

This guide provides step-by-step instructions to set up and run the **Kids Flashcard App** on a Linux VPS (Ubuntu 22.04 LTS / 24.04 LTS) using **Docker**, **Docker Compose**, and **Caddy Server** (automatic HTTPS/SSL certificates via Let's Encrypt), or with an existing **Host Nginx**.

---

## 1. System Requirements & Domain Preparation

### 1.1. Minimum VPS Requirements
- **Operating System**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (x86_64 or ARM64).
- **RAM**: Minimum 1GB (2GB or more recommended).
- **Disk Space**: Minimum 10GB free SSD storage.

### 1.2. Configure DNS Records
Log into your DNS provider (Cloudflare, Namecheap, etc.) and add an `A` record:
- **Type**: `A`
- **Name**: `flashcards` (or `@` for apex domain)
- **Value**: `<Your_VPS_Public_IP>`
- **Proxy status**: DNS only (Turn off Cloudflare Proxy initially so Caddy/Certbot can easily issue the SSL certificate).

---

## 2. Install Docker & Configure Firewall on VPS

Connect to your VPS via SSH as `root` or a `sudo` user:
```bash
ssh root@<YOUR_VPS_IP>
```

### 2.1. Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw
```

### 2.2. Install Official Docker Engine & Docker Compose
```bash
# Download official Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (if not using root)
sudo usermod -aG docker $USER

# Verify Docker and Docker Compose versions
docker --version
docker compose version
```

### 2.3. Configure UFW Firewall
Allow required ports and enable UFW:
```bash
sudo ufw allow 22/tcp     # SSH port
sudo ufw allow 80/tcp     # HTTP (Let's Encrypt verification)
sudo ufw allow 443/tcp    # HTTPS secure traffic
sudo ufw allow 443/udp    # HTTP/3 (QUIC)
sudo ufw enable
sudo ufw status
```

---

## 3. Application Deployment

### 3.1. Clone the Source Code
```bash
cd /opt
git clone https://github.com/bs135/kids-flashcard-app.git
cd kids-flashcard-app
```

### 3.2. Grant Permissions and Create Persistent Storage Directories
```bash
# Create directories for SQLite database and local media (seed and user directories)
mkdir -p backend/data backend/uploads/seed/images backend/uploads/seed/audio backend/uploads/user/images backend/uploads/user/audio

# Make deployment script executable
chmod +x deploy.sh
```

### 3.3. Configure Environment Variables (.env)
Create the `.env` file from the example `.env.example`:
```bash
cp .env.example .env
nano .env
```

Configure the following variables:
```ini
# Application Domain Name
DOMAIN_NAME=flashcards.chipfc.com

PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# Gemini API Key (required for flashcard generation)
GEMINI_API_KEY=AIzaSy...

# Feature Flags & Rate Limiting
IMAGE_AI_GENERATE_ENABLE=false
FLASHCARD_GENERATE_ENABLE=true
FLASHCARD_GENERATE_RATE_LIMIT=5
```
*(Press `Ctrl + O` -> `Enter` to save, `Ctrl + X` to exit nano).*

### 3.4. Launch the Application

#### OPTION A: VPS ALREADY HAS NGINX INSTALLED (Recommended when server is running Nginx)
If your VPS already has Nginx installed and is running other websites, run only the application container (do not run Caddy to prevent port 80/443 conflicts):

```bash
# 1. Start application container (bound to 127.0.0.1:3001)
docker compose up -d --build app

# 2. Configure VirtualHost for Nginx using the provided template:
sudo cp nginx.conf.example /etc/nginx/sites-available/flashcards.chipfc.com
sudo ln -s /etc/nginx/sites-available/flashcards.chipfc.com /etc/nginx/sites-enabled/

# 3. Test syntax and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Issue free SSL certificate via Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d flashcards.chipfc.com
```

#### OPTION B: CLEAN VPS WITHOUT WEB SERVER (Automatic Caddy Setup)
If the VPS is clean and has no web server installed:
```bash
docker compose --profile with-caddy up -d --build
```

### 3.5. Verify Status & Logs
```bash
# View container status
docker compose ps

# View real-time application logs
docker compose logs -f app
```

### 3.6. Populate Initial Seed Data (Seed Database)
If this is the first deployment or the database contains no cards yet, run the following command to populate 8 standard topics and 115 vocabulary cards (with WebP images and Edge-TTS audio):
```bash
docker compose exec app npm run seed
```

Once completed, open your browser and navigate to `https://flashcards.chipfc.com` to explore the app!

---

## 4. Update & Automated Deployment Workflow (CI/CD Auto-Deploy)

The system supports two update methods: **Automated via GitHub Actions (CI/CD)** and **Manual via bash script on the VPS**.

### 4.1. Automated Deployment via GitHub Actions (Recommended)
The workflow at `.github/workflows/deploy.yml` is configured so that each time you `git push` to the `main` branch, GitHub Actions automatically SSHs into the VPS and executes `./deploy.sh`.

#### Setup Steps for GitHub Secrets:
1. Go to your GitHub repository: **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ Click **New repository secret**.
2. Add the following 3 Secrets:
   - `SSH_HOST`: VPS Public IP address (e.g., `123.45.67.89`).
   - `SSH_USERNAME`: SSH username (typically `root` or a user with sudo/docker permissions).
   - `SSH_PRIVATE_KEY`: Content of your private SSH key (`id_rsa` or `id_ed25519`) used to connect to the VPS.
     > **Note:** Copy the entire private key content, including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`. Ensure the matching public key is added to `~/.ssh/authorized_keys` on the VPS.

3. **How it works:**
   - Every time code is pushed to `main`, GitHub Actions runs the `Auto Deploy to VPS` job.
   - The script sets `safe.directory` for Git, marks `./deploy.sh` as executable, and executes it.
   - You can monitor progress under the **Actions** tab on GitHub.

---

### 4.2. Manual Deployment via VPS Script
To update directly on the VPS without pushing code, synchronize seed cards, or perform a clean database reset:

- **Standard code update and container rebuild:**
  ```bash
  ./deploy.sh
  ```
  The script automatically:
  1. Pulls the latest source code (`git pull origin main`).
  2. Rebuilds images and restarts the `app` container.
  3. Prunes dangling Docker images (`docker image prune -f`).
  4. Displays container status.

- **Update code and synchronize 115 default seed flashcards:**
  ```bash
  ./deploy.sh --seed
  ```
  Synchronizes database topics and default flashcards without wiping existing progress or user cards.

- **Full clean reset and re-seed from scratch (with automatic backup):**
  ```bash
  ./deploy.sh --seed --reset
  ```
  When both `--seed` and `--reset` are provided, the script safely:
  1. Creates an automatic timestamped backup of your SQLite database:
     `backend/data/database.sqlite.bak_YYYYMMDD_HHMMSS` (including `-wal` and `-shm` files if present).
  2. Cleans up the old SQLite database files to guarantee a fresh initialization.
  3. Pulls latest code and rebuilds the `app` container.
  4. Re-initializes tables and seeds all 115 standard flashcards from scratch using local assets in `backend/uploads/seed/`.

---

## 5. Media Storage Architecture & Disaster Recovery

### 5.1. Media Storage Directory Architecture
The application separates system seed assets from user-generated or uploaded media under `backend/uploads/`:

```
backend/uploads/
├── seed/                              # Default system assets (Tracked by Git)
│   ├── images/
│   │   ├── default-placeholder.webp   # System fallback placeholder image
│   │   └── {topic_slug}/              # Subdirectories by topic (e.g. colors/red.webp, food/chicken.webp)
│   │       └── {word_slug}.webp
│   └── audio/                         # Global deduplicated pronunciation audio
│       └── {word_slug}.mp3            # (e.g. chicken.mp3, orange.mp3)
│
└── user/                              # User-generated / uploaded assets (Ignored by Git)
    ├── images/
    │   └── {topic_slug}/              # Future-proofed for optional multi-tenant user profiles
    │       └── {word_slug}.webp
    └── audio/
        └── {word_slug}.mp3
```

- **`seed/`**: Bundled with the repository so new deployments instantly have high-quality WebP images and Edge-TTS audio without querying external APIs.
- **`user/`**: Isolated for runtime uploads and AI generation. Never overwritten by Git updates.

### 5.2. Persistent Storage Host Mounts
Application state is mounted directly to host directories in `docker-compose.yml`:
- `/opt/kids-flashcard-app/backend/data/`: SQLite database files (`database.sqlite`, `-wal`, `-shm`).
- `/opt/kids-flashcard-app/backend/uploads/`: Both `seed/` and `user/` media files.

### 5.3. Regular Backup (Create compressed tar.gz archive)
```bash
# Create timestamped backup archive
BACKUP_NAME="backup_flashcards_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czvf $BACKUP_NAME backend/data backend/uploads
echo "Backup created: $BACKUP_NAME"
```

### 5.4. Data Restoration
To restore data or migrate to a new VPS:
```bash
# Stop containers before overwriting data
docker compose down

# Extract backup archive over the current directory
tar -xzvf backup_flashcards_xxxx.tar.gz

# Restart application
docker compose up -d
```
