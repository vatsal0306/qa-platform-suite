# TDD walkthrough: `GET /api/orders/stats`

The statistics endpoint is the TDD example. The tests live in
`tests/api-junit/src/test/java/qa/api/StatsApiTest.java`; the implementation is `OrderController::stats()`.

> **Honesty note.** This repository ships the finished state (tests and implementation together), so the git history does not
> show the red phase. The steps below let you reproduce it in two minutes, and are the sequence to follow (and commit
> separately) when you build a *new* endpoint, so your own history shows red > green > refactor.

## Specification (agreed before any code)
Returns, for the authenticated user: `total_orders`, `by_status` (created, paid, shipped, cancelled) and `revenue`
(sum of totals of paid + shipped orders). Requires authentication. Other users' orders are never counted.

## Red
1. Comment out `Route::get('/orders/stats', ...)` in `app/backend-laravel/routes/api.php` and restart the API.
2. `cd tests/api-junit && mvn test -Dtest=StatsApiTest`
3. All 3 tests fail (`GET /orders/stats` is routed to `/orders/{id}`, which is restricted to numeric ids, so the response is 404).
   Commit: `test: stats endpoint (failing)`.

## Green
1. Restore the route and `stats()` (smallest implementation that satisfies the three tests).
2. Re-run `StatsApiTest`: green. Commit: `feat: stats endpoint`.

## Refactor
- Replace the four `where()` collection scans with one grouped query if the data set grows
  (`select status, count(*), sum(total) ... group by status`). Tests stay green and prove the behaviour did not change.
- Commit: `refactor: stats via a single grouped query`.

## What the tests pin down
| Test | Behaviour |
|---|---|
| `emptyStats` | New user: all zeros (no division/null errors) |
| `mixedStats` | Counts per status; revenue includes paid and shipped only (140.00 in the fixture) |
| `authAndIsolation` | 401 without a token; stats never include another user's orders |
