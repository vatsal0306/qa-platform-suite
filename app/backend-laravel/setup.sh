#!/usr/bin/env bash
# Builds the runnable Laravel app: stock Laravel + Sanctum, overlaid with this folder's files.
# Usage: ./setup.sh [target_dir]   (default: this folder)
#   LARAVEL_VERSION=^12.0 ./setup.sh     (default ^12.0; Laravel 11 no longer receives security fixes)
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
TARGET="$(mkdir -p "${1:-$SRC}" && cd "${1:-$SRC}" && pwd)"
TMP="$(mktemp -d)"
LARAVEL_VERSION="${LARAVEL_VERSION:-^12.0}"

# Recent Composer versions refuse package versions that have security advisories (or are brand new).
# This is a disposable local test target, so do not let that block the install. Both names are set because
# COMPOSER_NO_SECURITY_BLOCKING is the older, now-deprecated spelling of COMPOSER_NO_BLOCKING.
export COMPOSER_NO_BLOCKING=1 COMPOSER_NO_SECURITY_BLOCKING=1 COMPOSER_ALLOW_SUPERUSER=1

for tool in composer rsync php; do
  command -v "$tool" >/dev/null || { echo "ERROR: '$tool' is required but not installed"; exit 1; }
done

echo "==> [1/4] composer create-project laravel/laravel $LARAVEL_VERSION"
composer create-project laravel/laravel "$TMP/app" "$LARAVEL_VERSION" --no-interaction

echo "==> [2/4] php artisan install:api (Sanctum)"
( cd "$TMP/app" && php artisan install:api --no-interaction )

echo "==> [3/4] merging overlay into $TARGET (overlay files win, stock files fill the gaps)"
[ "$SRC" = "$TARGET" ] || rsync -a --exclude vendor "$SRC"/ "$TARGET"/
rsync -a --ignore-existing "$TMP/app"/ "$TARGET"/

echo "==> [4/4] app key"
cd "$TARGET"
[ -f .env ] || cp .env.example .env
php artisan key:generate --force
echo "Laravel app ready in $TARGET"
