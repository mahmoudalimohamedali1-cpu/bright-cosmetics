#!/usr/bin/env bash
# Bright: one-time install on an Ubuntu/Debian VPS. Run as root:
#   curl -fsSL https://raw.githubusercontent.com/mahmoudalimohamedali1-cpu/bright-cosmetics/main/deploy/install-vps.sh -o install.sh
#   sudo bash install.sh your-domain.com
# It asks for the admin email and password on the server itself (nothing is
# stored in git). Re-run later to update to the latest code: data is kept.
set -euo pipefail

DOMAIN="${1:-}"
APP=/opt/bright
DATA=/var/lib/bright
ENVF=/etc/bright.env
REPO=https://github.com/mahmoudalimohamedali1-cpu/bright-cosmetics.git

[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }

apt-get update -y
apt-get install -y curl git nginx ca-certificates
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

id bright >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin bright
mkdir -p "$DATA"

if [ -d "$APP/.git" ]; then git -C "$APP" fetch -q && git -C "$APP" reset -q --hard origin/main
else git clone -q "$REPO" "$APP"; fi
cd "$APP"
npm ci --include=dev
npm run build
chown -R bright:bright "$APP" "$DATA"

if [ ! -f "$ENVF" ]; then
  read -rp "Admin email: " AE
  read -rsp "Admin password (min 10 chars): " AP; echo
  {
    echo "NODE_ENV=production"
    echo "PORT=8787"
    echo "DATA_DIR=$DATA"
    echo "ADMIN_EMAIL=$AE"
    echo "ADMIN_PASSWORD=$AP"
    [ -n "$DOMAIN" ] && echo "APP_URL=https://$DOMAIN"
    echo "# Paymob / Bosta / WhatsApp keys go here later (see .env.example)"
  } > "$ENVF"
  chmod 600 "$ENVF"
fi

cat > /etc/systemd/system/bright.service <<EOF
[Unit]
Description=Bright store
After=network.target

[Service]
User=bright
WorkingDirectory=$APP
EnvironmentFile=$ENVF
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now bright
systemctl restart bright

if [ -n "$DOMAIN" ]; then
  cat > /etc/nginx/sites-available/bright <<EOF
server {
  listen 80;
  server_name $DOMAIN www.$DOMAIN;
  client_max_body_size 10m;
  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
  ln -sf /etc/nginx/sites-available/bright /etc/nginx/sites-enabled/bright
  nginx -t && systemctl reload nginx
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" --redirect || echo "HTTPS not issued yet: point the domain's DNS to this server, then run: certbot --nginx -d $DOMAIN"
fi

sleep 3
curl -fsS http://127.0.0.1:8787/api/health && echo && echo "Bright is running. Admin: https://${DOMAIN:-<server-ip>:8787}/admin"
