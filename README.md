# QA Orders: Cross-Platform QA & API Testing Suite

A small order-management app (Laravel REST API + React/TypeScript UI) built **to be tested**, plus a complete QA framework
around it: API, UI, mobile, accessibility, database and cloud/CI testing. The app ships with 15 deliberate bugs, so every suite
has real defects to find, log in JIRA, and retest after a fix.

```
 React + TS UI (:5173) --/api--> Laravel REST API (:8000) --> MySQL
        ^                              ^                          |
        |                              |                          +--> /api/export/orders --> Oracle XE
 Cypress (Chrome/Firefox/Edge)   Postman/Newman, REST Assured       (snapshot)                  |
 Playwright (WebKit + devices)   (JUnit 5)                                          PL/SQL package qa_validation
```

## What is where

| Skill area | Evidence in this repo |
|---|---|
| REST API testing, Postman | [`tests/postman`](tests/postman): 70 requests, 99 assertions; positive, negative, boundary, security probes; run with Newman |
| JUnit, TDD | [`tests/api-junit`](tests/api-junit): REST Assured + JUnit 5 (36 test executions); `StatsApiTest` is the TDD example ([`docs/tdd-log.md`](docs/tdd-log.md)) |
| Cypress, TypeScript, regression | [`tests/e2e-cypress`](tests/e2e-cypress): page objects, API shortcuts, tagged specs (24 executions per browser) |
| Cross-browser / compatibility | Cypress on Chrome, Firefox and Edge in CI; 5 viewport sizes; Playwright WebKit |
| iOS / Android | [`tests/mobile`](tests/mobile): Playwright device emulation (iPhone 13, iPad Mini, Pixel 7, Galaxy S9+); real-device plan in [`docs/test-plan.md`](docs/test-plan.md) section 7 |
| WCAG accessibility | cypress-axe + Playwright axe (A/AA tags), [manual checklist](docs/wcag-checklist.md) |
| PL/SQL database validation | [`tests/db-plsql`](tests/db-plsql): `qa_validation` package on Oracle XE, loaded from an API export |
| AWS-based testing | [`infra/aws`](infra/aws) Terraform (EC2 + Compose) and the *Test deployed AWS environment* workflow |
| Agile triage, JIRA, test cases | [`docs/test-cases.xlsx`](docs/test-cases.xlsx) (129 cases), [`docs/bug-reports`](docs/bug-reports), [`docs/jira-workflow.md`](docs/jira-workflow.md), `docs/jira-import.csv` |
| JavaScript/TypeScript, React, Laravel | [`app/frontend-react`](app/frontend-react), [`app/backend-laravel`](app/backend-laravel) |

## Quick start

```bash
cp .env.example .env                  # SEEDED_BUGS=true (default) or false
docker compose up -d --build          # MySQL + Laravel API :8000 + React :5173
curl localhost:8000/api/health        # {"status":"ok"}
```
Demo users: `qa@example.com` and `other@example.com`, password `Password123!`.

Run the suites (each folder has its own README):

```bash
cd tests/postman      && npm ci && npm test                                   # Newman
cd tests/api-junit    && mvn test -Dapi.base=http://localhost:8000            # REST Assured
cd tests/e2e-cypress  && npm ci && npx cypress run --browser chrome           # also: firefox, edge
cd tests/mobile       && npm ci && npm run install-browsers && npm test       # Playwright devices
docker compose --profile db up -d oracle && cd tests/db-plsql && pip install -r requirements.txt \
  && python setup_db.py && python run_validation.py                           # PL/SQL validation
```
Or run a runner in Docker: `docker compose --profile tests run --rm newman` (also `junit`, `cypress`, `playwright`).

## The two builds and how CI uses them

| Build | How | Every suite must... |
|---|---|---|
| **Seeded** (default) | `SEEDED_BUGS=true` | **fail**: proves the suite detects the 15 bugs |
| **Fixed** | `SEEDED_BUGS=false` | **pass**: regression gate |

`FIXED_BUGS=BUG-004` fixes one API bug at a time to demonstrate the retest step. The GitHub Actions workflow
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs both builds in a matrix; `tools/expect.sh` flips the exit-code
expectation, so a green seeded build is reported as an error. Bug catalog: [`docs/seeded-bugs.md`](docs/seeded-bugs.md).

## Verification status (what was actually run)

Run on a Mac with Docker Compose (Laravel 12 + MySQL 8 + React/Vite), October 2026. Every suite was run twice: against the
seeded (buggy) build, which must fail on the planted defects, and against the fixed build, which must pass.

| Suite | Seeded build | Fixed build |
|---|---|---|
| Postman / Newman (70 requests, 100 assertions) | 15 failed with all bugs on (each traced to one bug); 14 with BUG-004 switched off | **0 failed** |
| REST Assured + JUnit 5 (35 tests) | 15 failed (BUG-004 switched off; BUG-001..010 minus 004 all caught) | **35 passed** |
| Cypress, Chrome (24 tests) | 13 failed | **24 passed** |
| Playwright device emulation (20 tests, iPhone 13, iPad Mini, Pixel 7, Galaxy S9+) | 14 failed | **20 passed** |

Per-bug detail and what the first runs taught me: [`docs/results.md`](docs/results.md).

**Not run (written but unverified):** the PL/SQL package against Oracle XE, the GitHub Actions workflows, the Terraform/AWS
deployment, and JUnit/Cypress/Playwright with BUG-004 switched on.

## Troubleshooting


**Switching between the seeded (buggy) and fixed build.** The API reads `SEEDED_BUGS` when it starts, but the UI reads it when the *web image is built*. After changing `.env`:

```bash
docker compose build web
docker compose up -d --force-recreate api web
docker compose exec web printenv VITE_SEEDED_BUGS   # must match SEEDED_BUGS
```

Restarting without `build web` leaves the UI on the old setting.

**`docker compose up --build` fails with `process "/bin/sh -c ... setup.sh" did not complete successfully`**
That line is only the wrapper; the real error is higher up. Show it with:
```bash
docker compose build --no-cache --progress=plain api 2>&1 | tail -80
```
- `Your requirements could not be resolved` / exit code 2: Composer found no allowed package version. `setup.sh` already
  pins Laravel 12 and turns off Composer's security blocking (`COMPOSER_NO_BLOCKING=1`) for this throw-away test app.
  Do not reuse that setting in a real project.
- `Could not resolve host` / timeouts: Docker has no internet access (VPN, proxy, firewall).
- After editing files, rebuild with `docker compose build --no-cache api` and then `docker compose up -d`.

## About metrics

Quote numbers this project actually produces: 129 documented cases, 20 requirements with 100% coverage, 15 seeded defects each
linked to a test, CI results per build. Do not attribute figures from your professional work (coverage gains, defect-escape
reduction, per-sprint volumes) to this project.

## Layout

```
app/backend-laravel   Laravel overlay (setup.sh builds the runnable app) | app/frontend-react   React + TypeScript
tests/{postman,api-junit,e2e-cypress,mobile,db-plsql}                   | tools/{mock-api,verify-postman.sh,expect.sh}
docs/                 test plan, test cases, bug reports, WCAG checklist, TDD log, JIRA workflow
infra/aws             Terraform                                         | .github/workflows   CI and AWS test workflow
docker-compose.yml    app + DB + test runners
```
