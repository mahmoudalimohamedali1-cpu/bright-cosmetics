#!/usr/bin/env bash
# Bright: install or update on an Ubuntu/Debian VPS. Run as root:
#   curl -fsSL https://raw.githubusercontent.com/mahmoudalimohamedali1-cpu/bright-cosmetics/main/deploy/install-vps.sh -o install.sh
#   sudo bash install.sh your-domain.com
# First run asks for the admin email and password on the server itself (nothing
# is stored in git), unless /etc/bright.env already exists. Re-run to update to
# the latest code: the database in /var/lib/bright is kept.
set -euo pipefail

DOMAIN="${1:-}"
APP=/opt/bright
DATA=/var/lib/bright
ENVF=/etc/bright.env
REPO=https://github.com/mahmoudalimohamedali1-cpu/bright-cosmetics.git

[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx ca-certificates

# Small servers (1 GB) run out of memory during the build without swap.
if ! swapon --show | grep -q . ; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

id bright >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin bright
mkdir -p "$DATA"

# The app folder belongs to the service user; let root's git work in it, and stop on any failure.
GIT="git -c safe.directory=$APP -C $APP"
if [ -d "$APP/.git" ]; then
  $GIT fetch -q origin main
  $GIT reset -q --hard origin/main
else
  git clone -q "$REPO" "$APP"
fi
echo "Code: $($GIT log --oneline -1)"
cd "$APP"
npm ci --include=dev --no-audit --no-fund
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
    if [ -n "$DOMAIN" ]; then echo "APP_URL=https://$DOMAIN"; fi
    echo "# Paymob / Bosta / WhatsApp keys go here later (see .env.example)"
  } > "$ENVF"
  chmod 600 "$ENVF"
fi

cat > /etc/systemd/system/bright.service <<UNIT
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
UNIT
systemctl daemon-reload
systemctl enable bright >/dev/null
systemctl restart bright

# The store answers on the server IP right away, and on the domain once its DNS points here.
NAMES="_"
if [ -n "$DOMAIN" ]; then NAMES="$DOMAIN www.$DOMAIN"; fi
cat > /etc/nginx/sites-available/bright <<NGINX
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name $NAMES;
  client_max_body_size 10m;
  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/bright /etc/nginx/sites-enabled/bright
nginx -t && systemctl reload nginx
if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then ufw allow 'Nginx Full' >/dev/null; fi

if [ -n "$DOMAIN" ]; then
  apt-get install -y certbot python3-certbot-nginx
  IP=$(curl -fsS https://api.ipify.org || true)
  if [ -n "$IP" ] && getent ahostsv4 "$DOMAIN" | awk '{print $1}' | grep -qx "$IP"; then
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
      || echo "HTTPS not issued: check that www.$DOMAIN also points to $IP, then run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  else
    echo "HTTPS skipped: $DOMAIN does not point to this server ($IP) yet. After the DNS change, run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  fi
fi

for i in $(seq 1 30); do curl -fsS http://127.0.0.1:8787/api/health >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:8787/api/health && echo && echo "Bright is running."
