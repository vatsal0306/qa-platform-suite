# REST Assured + JUnit 5

```bash
cd tests/api-junit
mvn test -Dapi.base=http://localhost:8000      # or API_BASE_URL=... mvn test
```
`StatsApiTest` is the TDD example (tests first, endpoint after). Test names reference seeded bug IDs,
so a failing test points straight at a defect.
