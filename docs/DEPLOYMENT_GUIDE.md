# TRACEPOINT — Deployment Guide

This guide covers 3 production deployment methods:
1. **Docker Compose** (Recommended for local servers, cloud VMs, and hackathons)
2. **Cloud Free-Tier Platforms** (Render.com, Railway, Vercel)
3. **Linux VPS (Ubuntu / AWS EC2 / DigitalOcean)** with Nginx reverse proxy

---

## Method 1: Docker Compose (Fastest & Single Command)

### Prerequisites:
- Docker and Docker Compose installed.

### Steps:
```bash
# 1. Build and start both API and Web containers
docker compose up -d --build

# 2. Check container status
docker compose ps

# 3. View logs
docker compose logs -f
```

- Web UI: **`http://localhost:3000`** (or your server's public IP:3000)
- Backend Health: **`http://localhost:8000/health`**
- API Docs: **`http://localhost:8000/docs`**

To stop:
```bash
docker compose down
```

---

## Method 2: Free Cloud Deployment (Render.com / Railway)

### Option A: Render.com (Free Tier)
1. Push this code to a GitHub repository:
   ```bash
   git remote add origin https://github.com/<your-username>/tracepoint.git
   git push -u origin main
   ```
2. Log in to [Render.com](https://render.com).
3. **Deploy Backend (Web Service)**:
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repo.
   - **Environment**: Python.
   - **Build Command**: `pip install -r apps/api/requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `apps/api`
   - Set Environment Variables:
     - `PYTHONPATH`: `.`
     - `PROJECT_ROOT`: `/opt/render/project/src`
4. **Deploy Frontend (Static Site)**:
   - Click **New +** -> **Static Site**.
   - Connect your GitHub repo.
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - In Settings -> Redirects/Rewrites:
     - Rule 1: `/api/*` -> `https://your-backend.onrender.com/api/*`
     - Rule 2: `/*` -> `/index.html` (Rewrite)

---

## Method 3: Linux VPS (Ubuntu 22.04 / 24.04, AWS EC2)

### Step 1: Install Dependencies
```bash
sudo apt update && sudo apt install -y python3-pip python3-venv nodejs npm nginx
```

### Step 2: Clone & Setup Backend
```bash
git clone https://github.com/<your-username>/tracepoint.git /var/www/tracepoint
cd /var/www/tracepoint
python3 -m venv venv
./venv/bin/pip install -r apps/api/requirements.txt
```

### Step 3: Setup Systemd Service for Backend
Create `/etc/systemd/system/tracepoint.service`:
```ini
[Unit]
Description=Tracepoint Intelligence API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/tracepoint
Environment="PYTHONPATH=/var/www/tracepoint/apps/api"
ExecStart=/var/www/tracepoint/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```
Start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tracepoint
sudo systemctl status tracepoint
```

### Step 4: Build Web Frontend
```bash
cd /var/www/tracepoint/apps/web
npm install
npm run build
```

### Step 5: Configure Nginx Reverse Proxy
Edit `/etc/nginx/sites-available/default`:
```nginx
server {
    listen 80;
    server_name _;

    root /var/www/tracepoint/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```
Your application will now be live at `http://<your-vps-ip>`!
