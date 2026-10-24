#!/bin/sh
# Rebuild the Nginx upstream from live Docker DNS.
# A stopped container disappears from DNS. Leaving its old IP in the
# upstream makes Nginx wait on a dead address instead of using the backup.
set -eu

ip_of() {
  # A stopped container name does not resolve. timeout prints "Terminated"
  # when it gives up, so both streams are discarded.
  out="$(timeout 1 getent hosts "$1" 2>/dev/null || true)" 2>/dev/null || true
  printf '%s\n' "$out" | awk 'NR==1 { print $1; exit }'
}

membership() {
  printf '%s|%s|%s|%s' "$(ip_of server1 || true)" "$(ip_of server2 || true)" "$(ip_of server3 || true)" "$(ip_of backup || true)"
}

render() {
  apps=""
  count=0
  for name in server1 server2 server3; do
    ip="$(ip_of "$name" || true)"
    if [ -n "$ip" ]; then
      apps="${apps}    server ${ip}:5000 max_fails=1 fail_timeout=15s;
"
      count=$((count + 1))
    fi
  done

  extra=""
  bip="$(ip_of backup || true)"
  if [ -n "$bip" ]; then
    if [ "$count" -gt 0 ]; then
      extra="    server ${bip}:5000 backup max_fails=1 fail_timeout=15s;
"
    else
      extra="    server ${bip}:5000 max_fails=1 fail_timeout=15s;
"
    fi
  fi

  body="${apps}${extra}"

  if [ -z "$body" ]; then
    cat > /tmp/nginx.conf <<EOF
events { worker_connections 1024; }
pid /tmp/nginx.pid;
http {
  server {
    listen 80;
    location / {
      default_type application/json;
      return 503 '{"error":"All containers are stopped","status":"OFFLINE"}';
    }
  }
}
EOF
    echo "Upstream now: none (every container is stopped)"
    return 0
  fi

  cat > /tmp/nginx.conf <<EOF
events { worker_connections 1024; }
pid /tmp/nginx.pid;
http {
  upstream moviebook_app {
${body}  }

  server {
    listen 80;

    location / {
      proxy_pass http://moviebook_app;
      proxy_http_version 1.1;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_next_upstream error timeout http_502 http_503 http_504;
      proxy_next_upstream_tries 4;
      proxy_connect_timeout 400ms;
      proxy_next_upstream_timeout 2s;
      proxy_read_timeout 10s;
      add_header X-Load-Balancer nginx always;
    }
  }
}
EOF
  echo "Upstream now:"
  printf '%s' "$body"
}

render
last="$(membership)"

(
  while true; do
    sleep 2
    now="$(membership)"
    if [ "$now" != "$last" ]; then
      echo "Upstream membership changed; reloading nginx"
      render
      nginx -s reload -c /tmp/nginx.conf || true
      last="$now"
    fi
  done
) &

exec nginx -g "daemon off;" -c /tmp/nginx.conf
