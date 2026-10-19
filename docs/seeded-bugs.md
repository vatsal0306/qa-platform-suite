# Seeded bug catalog

The app under test ships with 15 deliberate defects so the suites have something real to find.
Each bug has a JIRA-style report in [`bug-reports/`](bug-reports) and is detected by at least one automated test.

| ID | Summary | Layer | Severity | Priority | Reference |
|---|---|---|---|---|---|
| [BUG-001](bug-reports/BUG-001.md) | Registration accepts malformed e-mail addresses | API | Major | High | Input validation |
| [BUG-002](bug-reports/BUG-002.md) | Order quantity not range-checked (0, negative and >1000 accepted) | API / DB | Critical | High | Input validation / data integrity |
| [BUG-003](bug-reports/BUG-003.md) | Broken object-level authorization: any user can access any order (IDOR) | API | Blocker | Highest | OWASP API1:2023 BOLA |
| [BUG-004](bug-reports/BUG-004.md) | Order can be paid more than once (double charge) | API / DB | Blocker | Highest | Business logic |
| [BUG-005](bug-reports/BUG-005.md) | Unpaid order can be shipped | API / DB | Blocker | Highest | Business logic |
| [BUG-006](bug-reports/BUG-006.md) | Pagination repeats the last row of the previous page | API / UI | Major | Medium | Off-by-one |
| [BUG-007](bug-reports/BUG-007.md) | Silent 10% discount on lines with quantity >= 10 | API / DB | Critical | High | Business logic / revenue leakage |
| [BUG-008](bug-reports/BUG-008.md) | Login reveals whether an e-mail is registered (user enumeration) | API | Major | Medium | OWASP API2:2023 / ASVS 2.2 |
| [BUG-009](bug-reports/BUG-009.md) | customer_name longer than 100 chars causes HTTP 500 | API | Major | Medium | Input validation / error handling |
| [BUG-010](bug-reports/BUG-010.md) | Shipped orders can be cancelled | API / DB | Critical | High | Business logic |
| [BUG-011](bug-reports/BUG-011.md) | Login / register inputs have no accessible labels | UI | Major | Medium | WCAG 2.1: 1.3.1, 3.3.2, 4.1.2 (A) |
| [BUG-012](bug-reports/BUG-012.md) | Status badge text fails colour-contrast requirement | UI | Minor | Low | WCAG 2.1: 1.4.3 Contrast (AA) |
| [BUG-013](bug-reports/BUG-013.md) | Orders table forces horizontal scrolling on small screens | UI | Major | Medium | WCAG 2.1: 1.4.10 Reflow (AA) / compatibility |
| [BUG-014](bug-reports/BUG-014.md) | 'Pay' action is a clickable <div>, not a button | UI | Critical | High | WCAG 2.1: 2.1.1 Keyboard, 4.1.2 Name/Role/Value (A) |
| [BUG-015](bug-reports/BUG-015.md) | Failed login shows no feedback | UI | Major | Medium | WCAG 2.1: 3.3.1 Error Identification (A) |

## Switches

| What | How |
|---|---|
| All API bugs (BUG-001..010) on / off | `SEEDED_BUGS=true` or `false` (env of the `api` container, or `.env` for docker compose) |
| Turn off individual API bugs (retest) | `FIXED_BUGS=BUG-003,BUG-004` |
| UI bugs (BUG-011..015) on / off | `VITE_SEEDED_BUGS=true` or `false` (set at build/start of the `web` container; compose passes `SEEDED_BUGS` to it) |

Typical demo: run the suites on the seeded build (red), log the failures in JIRA from the bug reports,
set `FIXED_BUGS` for one bug, re-run the same tests (green), close the ticket.
