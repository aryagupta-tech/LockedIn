#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building and starting containers..."
docker compose up -d --build

echo "==> Done! Site is running on port 3000"
echo "==> View logs: docker compose logs -f"
