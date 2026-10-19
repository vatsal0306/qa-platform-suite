#!/usr/bin/env bash
set -e
cd /app
echo "Waiting for MySQL at ${DB_HOST}:${DB_PORT} ..."
until php -r "new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do sleep 2; done
php artisan migrate --force --seed
# --no-reload: without it "artisan serve" strips the container environment (DB_*, SEEDED_BUGS ...) when a .env file exists
export PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-4}"
exec php artisan serve --no-reload --host=0.0.0.0 --port=8000
