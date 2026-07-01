# Deploy CashMind Server to VPS

## 1) Prepare VPS

Install Node.js and PM2:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

## 2) Deploy Code

```bash
mkdir -p /var/www
cd /var/www
git clone <your-repo-url> cashmind
cd /var/www/cashmind
npm install
cp .env.example .env
```

Edit `.env`:
- `GEMINI_API_KEY`
- `SHORTCUT_TOKEN`
- `HOST` and `PORT`
- `VITE_API_BASE_URL` (if iOS app requests this VPS directly)

## 3) Build and Start

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Health check:

```bash
curl http://127.0.0.1:${PORT:-3000}/api/health
```

Expected response: `{"status":"ok"}`.

## 4) Nginx reverse proxy (recommended)

Create `/etc/nginx/conf.d/cashmind.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then enable HTTPS with your preferred certificate setup (e.g. Certbot).

## 5) For iOS/Capacitor App

Set app env before build:

```bash
export VITE_API_BASE_URL=https://your-domain.com
npm run build
npm run cap:sync ios
```

## 6) Common maintenance

```bash
pm2 restart cashmind
pm2 logs cashmind
```

Database file path: `/var/www/cashmind/data/cashmind.db`  
This file is mounted in project directory and should be persisted.
