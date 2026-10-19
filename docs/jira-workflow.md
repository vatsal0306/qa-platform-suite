# JIRA setup and defect lifecycle

## Project
- Template: **Scrum** software project, key `QAS` ("QA Orders").
- Issue types: Bug, Task, Story, Epic. Components: Auth, Orders, Order workflow, Orders list, Order detail, Auth form.
- Labels: `seeded-bug`, `api`, `ui`, `a11y`, `security`, `regression`.
- Fields: Severity (custom select: Blocker / Critical / Major / Minor), Priority (Highest..Lowest), Affects Version, Environment.

## Bug workflow
```
Open -> In Progress -> Ready for QA -> Closed
          ^                |
          +---- Reopened <-+     (also: Open -> Won't Fix / Duplicate with a resolution)
```
| Transition | Rule |
|---|---|
| Open -> In Progress | Triage done: severity, priority, component, owner set |
| In Progress -> Ready for QA | Fix merged; build with the fix deployed |
| Ready for QA -> Closed | The linked automated test(s) pass on the fixed build **and** the regression suite is green |
| Ready for QA -> Reopened | Test still fails, or a new failure is caused by the fix |

## Triage (Agile)
1. Run the suites on the seeded build; each failing test names its bug id (e.g. "... (BUG-004)").
2. Create one JIRA bug per defect from [`bug-reports/`](bug-reports) (or import [`jira-import.csv`](jira-import.csv)).
3. Triage in the backlog-refinement meeting: Blockers/Critical go into the current sprint, the rest are ranked.
4. Link each bug to the test case ids in `test-cases.xlsx` (column "Seeded bug").
5. Retest: set `FIXED_BUGS=BUG-00X`, restart the API (or rebuild the web container for UI bugs), re-run the named tests, then transition the ticket.

## Importing the seeded bugs
JIRA > Settings > System > External System Import > CSV > upload `docs/jira-import.csv`
(map *Summary, Issue Type, Priority, Component/s, Labels, Description*).

## Useful JQL
```
project = QAS AND issuetype = Bug AND status != Closed ORDER BY priority DESC, created ASC
project = QAS AND labels = seeded-bug AND status = "Ready for QA"
project = QAS AND issuetype = Bug AND created >= -7d AND priority in (Highest, High)
```

## Suggested sprint plan
| Sprint | Goal | Bugs |
|---|---|---|
| 1 | Security and money | BUG-003, 004, 005, 007, 010 |
| 2 | Validation and API correctness | BUG-001, 002, 006, 008, 009 |
| 3 | Accessibility and mobile | BUG-011..015 |

## Metrics to track from JIRA
Defects found vs. seeded, defect age, reopen rate, defects per component, and escaped defects (found after "Closed"; should stay 0 here).
