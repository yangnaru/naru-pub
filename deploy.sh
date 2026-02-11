#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Pulling latest changes..."
git pull

echo "Building images..."
docker compose build

echo "Restarting services..."
docker compose up -d

echo "Deployment complete!"
