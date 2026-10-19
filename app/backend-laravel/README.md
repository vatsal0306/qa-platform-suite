# Laravel API (app under test)

This folder is an **overlay**: only the files that differ from stock Laravel (routes, controllers, models,
migration, seeder, seeded-bug config). `setup.sh` downloads Laravel 11, runs `install:api` (Sanctum) and merges
everything into a runnable app.

```bash
cd app/backend-laravel
./setup.sh                      # needs PHP 8.2+, Composer, rsync
# set DB_* in .env (MySQL), then:
php artisan migrate --seed
php artisan serve               # http://localhost:8000
```

Laravel version: `LARAVEL_VERSION` (default `^12.0`). `setup.sh` turns off Composer's security-advisory blocking
(`COMPOSER_NO_BLOCKING=1`) because this is a disposable test target. It also overlays `bootstrap/app.php` (JSON errors for
`/api/*`) and `app/Models/User.php` (adds `HasApiTokens`), which are the only stock files this project replaces.

Env switches: `SEEDED_BUGS=true|false`, `FIXED_BUGS=BUG-003,BUG-004`, `QA_EXPORT_KEY=...`.
Demo users (password `Password123!`): `qa@example.com`, `other@example.com`.
