#!/usr/bin/env bash
# Tailscale helpers for serving the web app on this machine's tailnet address.
#
#   scripts/tailscale.sh url     # print https://<machine>.<tailnet>.ts.net (empty if Tailscale is down)
#   scripts/tailscale.sh up      # proxy https://<machine>.<tailnet>.ts.net -> http://127.0.0.1:$PORT
#   scripts/tailscale.sh down    # remove that proxy
#   scripts/tailscale.sh status
#
# Uses `tailscale serve` (tailnet-only), NOT `funnel` (public internet).
set -euo pipefail

PORT="${PORT:-3000}"

ts() {
  if command -v tailscale >/dev/null 2>&1; then
    tailscale "$@"
  elif [ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ]; then
    /Applications/Tailscale.app/Contents/MacOS/Tailscale "$@"
  else
    echo "tailscale CLI not found" >&2
    return 127
  fi
}

# MagicDNS name of this machine, without the trailing dot. Empty if not connected.
host() {
  ts status --json 2>/dev/null |
    sed -n 's/^[[:space:]]*"DNSName":[[:space:]]*"\([^"]*\)\.".*/\1/p' |
    head -n 1
}

case "${1:-}" in
  url)
    # Never fail: varlock calls this at load time and falls back to localhost.
    h="$(host || true)"
    [ -n "$h" ] && printf 'https://%s\n' "$h" || true
    ;;
  up)
    h="$(host)"
    [ -n "$h" ] || { echo "Tailscale is not connected" >&2; exit 1; }
    ts serve --bg --https=443 "http://127.0.0.1:${PORT}" >/dev/null
    echo "Serving https://${h} -> http://127.0.0.1:${PORT} (tailnet only)"
    ;;
  down)
    ts serve --https=443 off
    ;;
  status)
    ts serve status
    ;;
  *)
    echo "usage: $0 {url|up|down|status}" >&2
    exit 2
    ;;
esac
