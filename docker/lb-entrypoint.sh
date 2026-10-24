#!/bin/sh
# Nginx resolves upstream names once, at startup. Recreated app containers
# get new IP addresses, and a stale address can belong to the backup.
# Reload whenever Docker DNS changes so round-robin stays on containers 1–3.
set -eu

snapshot() {
  getent hosts server1 server2 server3 backup 2>/dev/null | sort | tr '\n' ' '
}

(
  sleep 2
  last="$(snapshot || true)"
  while true; do
    sleep 2
    now="$(snapshot || true)"
    if [ -n "$now" ] && [ -n "$last" ] && [ "$now" != "$last" ]; then
      echo "Upstream addresses changed; reloading nginx"
      nginx -s reload || true
    fi
    if [ -n "$now" ]; then
      last="$now"
    fi
  done
) &

exec nginx -g "daemon off;"
