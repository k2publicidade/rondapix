#!/bin/sh
set -e

echo "Running Prisma migrations..."
cd /app/prisma
npx prisma migrate deploy
echo "Migrations complete."

echo "Starting API..."
cd /app/apps/api
exec node dist/main.js
