# Mock API (reference implementation)

Dependency-free Node server that follows the same contract and the same seeded-bug switches as the Laravel app.
Use it to sanity-check test suites on a machine without PHP/MySQL/Docker. **It is not the app under test.**

```bash
node server.js                      # all seeded bugs active, port 8000
SEEDED_BUGS=false node server.js    # correct behaviour
```
