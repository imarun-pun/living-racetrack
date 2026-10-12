#!/usr/bin/env bash
# Turns a Raspberry Pi (Raspberry Pi OS with desktop) into a dedicated Lapwall display.
# Usage:  bash install/raspberry-pi-kiosk.sh            -> runs the copy in this folder, fully offline
#         bash install/raspberry-pi-kiosk.sh https://…  -> runs a hosted copy (for example your GitHub Pages URL)
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
URL="${1:-http://localhost:8080/index.html}"

echo "Installing Chromium and Node.js…"
sudo apt-get update -y
sudo apt-get install -y chromium-browser nodejs unclutter || sudo apt-get install -y chromium nodejs unclutter
BROWSER="$(command -v chromium-browser || command -v chromium)"

if [[ "$URL" == http://localhost* ]]; then
  echo "Creating a background service that serves Lapwall locally…"
  sudo tee /etc/systemd/system/lapwall.service >/dev/null <<UNIT
[Unit]
Description=Lapwall local server
After=network.target
[Service]
ExecStart=$(command -v node) $APP_DIR/tools/serve.mjs
Restart=always
User=$USER
[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl enable --now lapwall.service
fi

echo "Starting Lapwall full screen at login…"
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/lapwall.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=Lapwall
Exec=sh -c 'sleep 8; unclutter -idle 3 & $BROWSER --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --autoplay-policy=no-user-gesture-required "$URL"'
DESK

echo "Keeping the screen awake…"
sudo raspi-config nonint do_blanking 1 2>/dev/null || true

echo "Done. Reboot to start Lapwall:  sudo reboot"
