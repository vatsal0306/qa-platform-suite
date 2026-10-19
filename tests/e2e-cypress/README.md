# Cypress E2E (TypeScript)

```bash
cd tests/e2e-cypress && npm install
CYPRESS_BASE_URL=http://localhost:5173 CYPRESS_API_URL=http://localhost:8000/api npx cypress run
npm run cy:firefox    # or cy:chrome / cy:edge / cy:webkit (experimental)
```
Page objects live in `cypress/pages`, API shortcuts in `cypress/support/commands.ts`.
Test titles carry the seeded BUG id they detect. `@tags` in describe titles mark smoke / regression / a11y / compatibility.
