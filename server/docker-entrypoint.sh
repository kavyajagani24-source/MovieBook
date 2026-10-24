#!/bin/sh
set -e

# Stagger startup so the four containers do not create tables at the same instant.
sleep "${NODE_ID:-1}"

echo "Initializing databases for container node ${NODE_ID:-?}..."
node ./scripts/initFtDb.js

echo "Starting MovieBook node ${NODE_ID:-?} (${NODE_ROLE:-SERVER}) on port ${PORT:-5000}"
exec node index.js
