#!/usr/bin/env bash
# Creates a bare-minimum systemd unit in the project root and links it for system install.

set -euo pipefail

SERVICE_NAME="discord-ai"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
UNIT_FILE="${PROJECT_ROOT}/${SERVICE_NAME}.service"
SYSTEMD_DIR="/etc/systemd/system"
LINK_PATH="${SYSTEMD_DIR}/${SERVICE_NAME}.service"

# Resolve Node binary for ExecStart (prefer PATH, fall back to common location).
resolve_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
  elif [[ -x /usr/bin/node ]]; then
    echo /usr/bin/node
  else
    echo "error: node not found in PATH or /usr/bin/node" >&2
    exit 1
  fi
}

# Write a minimal long-running unit for this bot into the project root.
write_unit_file() {
  local node_bin="$1"
  cat >"$UNIT_FILE" <<EOF
[Unit]
Description=Discord AI bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_ROOT}
ExecStart=${node_bin} ${PROJECT_ROOT}/src/index.js
Restart=always
RestartSec=5
EnvironmentFile=-${PROJECT_ROOT}/.env

[Install]
WantedBy=multi-user.target
EOF
}

# Symlink the project unit into systemd's unit directory (requires root).
link_unit() {
  if [[ ! -d "$SYSTEMD_DIR" ]]; then
    echo "error: ${SYSTEMD_DIR} not found (is systemd available?)" >&2
    exit 1
  fi
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "error: linking into ${SYSTEMD_DIR} requires root (re-run with sudo npm run setup-systemd)" >&2
    exit 1
  fi
  ln -sfn "$UNIT_FILE" "$LINK_PATH"
}

# Prompt whether to run systemctl daemon-reload after linking.
ask_daemon_reload() {
  local reply
  read -r -p "Run 'systemctl daemon-reload' now? [y/N] " reply
  case "$reply" in
    [yY]|[yY][eE][sS])
      systemctl daemon-reload
      echo "daemon-reload completed."
      ;;
    *)
      echo "Skipped. Run: sudo systemctl daemon-reload"
      echo "Then: sudo systemctl enable --now ${SERVICE_NAME}"
      ;;
  esac
}

NODE_BIN="$(resolve_node)"

echo "WARNING: This installs a system service that runs the Discord bot as a"
echo "         long-lived process. It will use ${PROJECT_ROOT}/.env for secrets."
echo "         Prefer a dedicated non-root User= in the unit before production use."
echo "         Linking requires root and will overwrite any existing"
echo "         ${LINK_PATH} symlink."
echo

write_unit_file "$NODE_BIN"
echo "Wrote ${UNIT_FILE}"

link_unit
echo "Linked ${LINK_PATH} -> ${UNIT_FILE}"

ask_daemon_reload
