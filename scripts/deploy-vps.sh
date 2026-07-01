#!/usr/bin/env bash
set -euo pipefail

VPS_REPO="${VPS_REPO:-$(git remote get-url origin 2>/dev/null || true)}"

: "${VPS_HOST:?Missing VPS_HOST}"
: "${VPS_REPO:?Missing VPS_REPO. Set VPS_REPO or configure git remote.origin.url}"

VPS_USER="${VPS_USER:-root}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
VPS_DIR="${VPS_DIR:-/var/www/cashmind}"
VPS_BRANCH="${VPS_BRANCH:-main}"
VPS_PROJECT_NAME="${VPS_PROJECT_NAME:-cashmind}"
VPS_PORT="${VPS_PORT:-3000}"
VPS_HOST_BIND="${VPS_HOST_BIND:-0.0.0.0}"
VPS_KEY="${VPS_KEY:-}"
VPS_DOMAIN="${VPS_DOMAIN:-}"
SETUP_NGINX="${SETUP_NGINX:-0}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"
ACME_EMAIL="${ACME_EMAIL:-}"

if [ -z "${GEMINI_API_KEY:-}" ]; then
  read -r -s -p "Enter GEMINI_API_KEY: " GEMINI_API_KEY
  echo
fi

if [ -z "${SHORTCUT_TOKEN:-}" ]; then
  read -r -s -p "Enter SHORTCUT_TOKEN: " SHORTCUT_TOKEN
  echo
fi

SSH_OPTS=(-p "$VPS_SSH_PORT")
if [ -n "$VPS_KEY" ]; then
  SSH_OPTS+=(-i "$VPS_KEY")
fi

SSH_TARGET="$VPS_USER@$VPS_HOST"

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "VPS_DIR='$VPS_DIR' VPS_REPO='$VPS_REPO' VPS_BRANCH='$VPS_BRANCH' VPS_PROJECT_NAME='$VPS_PROJECT_NAME' \
   VPS_PORT='$VPS_PORT' VPS_HOST_BIND='$VPS_HOST_BIND' GEMINI_API_KEY='$GEMINI_API_KEY' \
   SHORTCUT_TOKEN='$SHORTCUT_TOKEN' VITE_API_BASE_URL='$VITE_API_BASE_URL' VPS_DOMAIN='$VPS_DOMAIN' \
   SETUP_NGINX='$SETUP_NGINX' ACME_EMAIL='$ACME_EMAIL' bash -s" <<'EOF'
set -euo pipefail

ensure_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    return 0
  fi

  echo "Missing required command: $1"
  if [ "$1" = "node" ] || [ "$1" = "npm" ]; then
    echo "Installing Node.js..."
    if ! command -v apt-get >/dev/null 2>&1; then
      echo "No apt-get found; please install Node.js manually."
      exit 1
    fi
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif [ "$1" = "git" ]; then
    if ! command -v apt-get >/dev/null 2>&1; then
      echo "No apt-get found; please install git manually."
      exit 1
    fi
    sudo apt-get update
    sudo apt-get install -y git
  else
    echo "Please install $1 manually."
    exit 1
  fi
}

ensure_cmd git
ensure_cmd node
ensure_cmd npm

mkdir -p "$VPS_DIR"

if [ ! -d "$VPS_DIR/.git" ]; then
  echo "Cloning repository..."
  git clone "$VPS_REPO" "$VPS_DIR"
  cd "$VPS_DIR"
else
  cd "$VPS_DIR"
  echo "Pulling latest code..."
  git fetch --all
  git checkout "$VPS_BRANCH"
  git reset --hard "origin/$VPS_BRANCH"
fi

git checkout "$VPS_BRANCH"
git pull origin "$VPS_BRANCH"

cat > .env <<ENV
HOST=$VPS_HOST_BIND
PORT=$VPS_PORT
GEMINI_API_KEY=$GEMINI_API_KEY
SHORTCUT_TOKEN=$SHORTCUT_TOKEN
VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV

npm ci
npm run build

if ! command -v pm2 >/dev/null; then
  npm install -g pm2
fi

pm2 delete "$VPS_PROJECT_NAME" >/dev/null 2>&1 || true
pm2 delete "ecosystem.config.runtime" >/dev/null 2>&1 || true
cd "$VPS_DIR"
HOST="$VPS_HOST_BIND" PORT="$VPS_PORT" NODE_ENV=production \
  pm2 start ./node_modules/.bin/tsx --name "$VPS_PROJECT_NAME" -- server.ts
pm2 save

if [ -n "$VPS_DOMAIN" ] && [ "$SETUP_NGINX" = "1" ]; then
  if ! command -v nginx >/dev/null; then
    echo "nginx not installed. Please install and re-run with SETUP_NGINX=0 if needed."
  else
    cat > /tmp/cashmind.nginx <<NGINX
server {
    listen 80;
    server_name $VPS_DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$VPS_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
    sudo cp /tmp/cashmind.nginx "/etc/nginx/conf.d/cashmind.conf"
    sudo nginx -t && sudo systemctl reload nginx
    echo "Nginx configured for $VPS_DOMAIN"
  fi
fi

echo "Deployment done. Checking health:"
health_ok=0
for i in $(seq 1 20); do
  if curl -f "http://127.0.0.1:$VPS_PORT/api/health"; then
    echo "Health check passed."
    health_ok=1
    break
  fi
  echo "Health check retry $i/20..."
  sleep 2
done
if [ "$health_ok" -ne 1 ]; then
  echo "Health check failed after retries."
fi
EOF

echo "Done."
