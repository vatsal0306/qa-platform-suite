# Test results and lessons

Environment: Docker Compose on macOS, Laravel 12 API, MySQL 8, React 18 + Vite UI. Seeded build = `SEEDED_BUGS=true`
(BUG-004 switched off with `FIXED_BUGS=BUG-004` for the JUnit and Cypress runs, because with BUG-004 on and BUG-003 on,
"user B pays user A's order" returns 409 instead of the 200 that exposes BUG-003). Fixed build = `SEEDED_BUGS=false`.

## Which suite caught which bug (seeded build)

| Bug | Summary | Postman | JUnit | Cypress | Playwright |
|---|---|---|---|---|---|
| BUG-001 | Malformed e-mail accepted | yes | yes | yes | |
| BUG-002 | Quantity not range-checked | yes | yes | yes | |
| BUG-003 | Broken object-level authorization (IDOR) | yes | yes | | |
| BUG-004 | Order can be paid twice | yes (first run, all bugs on) | not run | not run | |
| BUG-005 | Unpaid order can be shipped | yes | yes | | |
| BUG-006 | Pagination repeats a row | yes | yes | yes | |
| BUG-007 | Silent 10% bulk discount | yes | yes | yes | |
| BUG-008 | Login reveals registered e-mails | yes | yes | yes | |
| BUG-009 | 101-char name gives HTTP 500 | yes | yes | yes | |
| BUG-010 | Shipped order can be cancelled | yes | yes | | |
| BUG-011 | Login inputs have no labels | | | yes | |
| BUG-012 | Status badge colour contrast | | | yes | yes |
| BUG-013 | Orders table overflows on phones | | | yes | yes |
| BUG-014 | "Pay" is a clickable div | | | yes | |
| BUG-015 | Failed login shows no message | | | yes | yes |

## What running the tests against the buggy and the fixed build taught me

These are the problems found in the *tests* and in the app by checking both directions.

1. **A passing test on the buggy build is a red flag.** Three Cypress tests (BUG-001, BUG-009, BUG-011) passed on the
   seeded build when they should have failed. Causes: the assertion ran before the server answered; an error banner appears
   for a 500 as well as for a validation error; and axe treats placeholder text as an accessible name. Fixes: wait on the
   network call and assert the status code (422); assert the label association explicitly.
2. **Test data must be unique per run.** With a persistent database, a value a bug lets through (BUG-001) made the next run
   fail differently. Tests now use unique values and assert *why* a request was rejected (for example, e-mail not "taken").
3. **Assert on the contract, not on the screen, when one bug hides another.** BUG-015 (no error shown) hid BUG-008
   (user enumeration) in a UI test, so BUG-008 is asserted on the HTTP responses.
4. **JSON int vs float.** `140` vs `140.0` made two stats tests fail for no good reason; a numeric matcher fixed it.
5. **A real, unplanted defect.** On the fixed build two phone sizes still scrolled sideways: a screen-reader-only span inside
   the scrolling table escaped its box. Fixed with `position: relative` on the wrapper.
6. **The UI flag is baked in at image build time.** Restarting the web container did not switch the UI build; it had to be
   rebuilt (`docker compose build web`).
7. **Device-specific behaviour.** On the buggy build Android Chrome could not tap the off-screen "View" button, while iOS
   Safari scrolled to it, so the same test failed on two phones and passed on two.

## Not verified

PL/SQL validation on Oracle, GitHub Actions, Terraform/AWS, and JUnit/Cypress/Playwright with BUG-004 on.
