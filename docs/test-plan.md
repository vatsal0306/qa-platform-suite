# Test plan: QA Orders platform

| | |
|---|---|
| Version | 1.0 |
| Scope | Orders web app (React) + REST API (Laravel) + MySQL, with a PL/SQL data-integrity layer on Oracle XE |
| Test cases | [`test-cases.xlsx`](test-cases.xlsx), generated from `docs/tools/data.py` |
| Defects | [`seeded-bugs.md`](seeded-bugs.md), [`bug-reports/`](bug-reports), JIRA workflow in [`jira-workflow.md`](jira-workflow.md) |

## 1. Purpose and scope

Verify that users can register, log in and manage orders through a created > paid > shipped (or cancelled) workflow, on the
web and on mobile browsers, with correct data, correct access control, and an accessible UI.

**In scope:** functional, integration, regression, compatibility (browsers, viewports, device emulation), REST API,
security basics (authentication, authorization, enumeration, injection/XSS probes), accessibility (WCAG 2.1 A/AA), data integrity.
**Out of scope:** load/performance testing, real payment gateways (payment is a state change), e-mail, i18n.

## 2. Requirements

| ID | Requirement |
|---|---|
| R-01 | User registration |
| R-02 | Password and profile field rules (password 8-72 chars, name max 100) |
| R-03 | Login (generic failure message) |
| R-04 | Token authentication and logout |
| R-05 | Create order |
| R-06 | Order input validation (qty 1-1000, price 0.01-100000, name max 100, 1-20 items, SKU max 32) |
| R-07 | Order totals = sum of quantity x unit price, no undocumented discounts |
| R-08 | View order |
| R-09 | List orders with pagination (per_page max 100) |
| R-10 | Edit order (only while `created`) |
| R-11 | Delete order (only while `created`) |
| R-12 | Pay order (only from `created`, exactly once) |
| R-13 | Ship order (only from `paid`) |
| R-14 | Cancel order (only from `created` or `paid`) |
| R-15 | Per-user data isolation |
| R-16 | Order statistics (counts per status; revenue from paid + shipped) |
| R-17 | Responsive UI |
| R-18 | Accessibility (WCAG 2.1 AA) |
| R-19 | Supported browsers / devices / environments |
| R-20 | Stored data integrity |

Order state machine: `created --pay--> paid --ship--> shipped`; `created|paid --cancel--> cancelled`. Everything else returns 409.

## 3. Test strategy

| Type | Approach | Where |
|---|---|---|
| Functional (API) | Positive, negative and boundary cases per endpoint | Postman, REST Assured |
| Functional (UI) | Page-object based specs through the real UI | Cypress |
| Integration | Multi-step workflows across API, UI and DB (create > pay > ship; cross-user checks) | Postman folders 06/07, JUnit, Cypress |
| Regression | Whole suite on every push; the fixed build must be green | GitHub Actions |
| Compatibility | Chrome, Firefox, Edge via Cypress; WebKit and 4 emulated phones/tablets via Playwright; 5 viewport sizes | Cypress, Playwright |
| REST API | Status codes, schema/shape, headers, auth, error handling, response time | Postman (Newman), REST Assured |
| Security (basic) | BOLA/IDOR, user enumeration, SQL-injection and XSS probes, token revocation | Postman, JUnit |
| Accessibility | axe-core (WCAG 2.1 A/AA tags) automated; manual checklist for what tools cannot judge | cypress-axe, Playwright axe, [`wcag-checklist.md`](wcag-checklist.md) |
| Data validation | PL/SQL package checks the data the suites created | Oracle XE |
| TDD | `GET /orders/stats`: tests written first | [`tdd-log.md`](tdd-log.md) |

Boundary value analysis is applied to every bounded field (0/1, 1000/1001, 7/8, 100/101 ...).

## 4. Environments

| Environment | How | Purpose |
|---|---|---|
| Local | `docker compose up -d --build` (MySQL, API :8000, React :5173) | Development, debugging |
| CI | GitHub Actions, same compose file, Oracle XE container | Regression gate on every push |
| AWS | Terraform: one EC2 instance running the compose stack ([`infra/aws`](../infra/aws)) | Cloud environment; suites run against its URLs |

Two builds of the app exist (switchable at run time):
- **Seeded build** (default): 15 deliberate defects. Every suite must *fail* here, which proves it can detect those defects.
- **Fixed build** (`SEEDED_BUGS=false`): every suite must *pass*.

CI runs both and treats an unexpectedly green seeded build as an error.

## 5. Entry and exit criteria

**Entry:** requirements agreed, environment up (`/api/health` returns ok, UI reachable), test data strategy in place.
**Exit (release candidate):**
- 100% of requirements have at least one test case; all P1 cases executed.
- Fixed build: 0 failing automated tests in every suite and browser; 0 DB-validation violations.
- No open Blocker/Critical defects; Major defects triaged with a decision.
- Accessibility: 0 axe violations (A/AA) and the manual checklist completed.

## 6. Test data

Each automated test registers its own throw-away user (unique e-mail) and creates its own orders, so tests are independent and
can run in parallel or in any order. Seed users `qa@example.com` / `other@example.com` (password `Password123!`) exist for manual testing.
The data created by the suites is what the PL/SQL layer validates afterwards.

**Repeatability rule:** the database persists between runs, so every value that a seeded bug lets through must be unique per run
(for example the malformed e-mail in BUG-001 tests). Otherwise the first run creates the record and later runs fail validation for a
different reason (duplicate), which makes the test pass without detecting the bug. Such tests also assert *why* the request was rejected.

## 7. Mobile and real-device strategy

- **Automated (this repo):** Playwright device emulation. WebKit stands in for iOS Safari, Chromium for Android Chrome (iPhone 13, iPad Mini, Pixel 7, Galaxy S9+), plus Cypress viewport tests.
- **Limits:** emulation does not reproduce real touch/keyboard behaviour, OS-level browser quirks, or hardware. True iOS testing needs a Mac or a device cloud.
- **Real devices:** run the smoke flow (register > create order > pay > ship) manually or through a device cloud (BrowserStack, Sauce Labs, AWS Device Farm).
  The Playwright specs can be pointed at such a service with its Playwright integration, without changing the tests.
  Cases TC-COMP-* tagged Manual cover this.

## 8. Defect management

Defects are logged in JIRA (see [`jira-workflow.md`](jira-workflow.md)). Severity describes impact, priority describes urgency:

| Severity | Meaning | Example |
|---|---|---|
| Blocker | Data loss, money, or security breach; no workaround | BUG-003 IDOR, BUG-004 double charge |
| Critical | Core flow wrong or inaccessible | BUG-007 hidden discount, BUG-014 unreachable Pay |
| Major | Important feature degraded, workaround exists | BUG-006 pagination, BUG-013 mobile overflow |
| Minor | Cosmetic or low impact | BUG-012 contrast |

## 9. Risks and assumptions

| Risk | Mitigation |
|---|---|
| Emulated devices miss real-device defects | Manual real-device smoke tests (section 7) |
| E2E tests are slower and flakier than API tests | Test pyramid: most checks at API level; UI tests use API shortcuts for set-up; one retry in CI |
| Oracle XE is a heavy container | Only the DB-validation job needs it; it works from an API export so the app stays on MySQL |
| Seeded vulnerabilities on a cloud host | AWS security group allows only the tester's IP; destroy the stack after use |
| Mock/reference API drifting from the Laravel app | Used only as a sanity check for the suites (`tools/verify-postman.sh`); Laravel stays the source of truth |

## 10. Metrics this project produces

Requirement coverage; number of test cases by type, layer and priority (Summary sheet in `test-cases.xlsx`);
seeded defects found vs seeded (15/15 target); automated vs manual share; CI pass rate on the fixed build and
detection rate on the seeded build. These are the numbers to quote about *this* project.

## 11. Deliverables

Test plan (this document), test cases (`test-cases.xlsx`), automation code (`tests/`), bug reports, WCAG checklist,
CI configuration, AWS infrastructure code, HTML/JUnit reports uploaded as CI artifacts.
