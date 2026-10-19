import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    retries: { runMode: 1, openMode: 0 },
    defaultCommandTimeout: 6000,
    env: { apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:8000/api' },
    reporter: 'cypress-multi-reporters',
    reporterOptions: {
      reporterEnabled: 'spec, mocha-junit-reporter',
      mochaJunitReporterReporterOptions: { mochaFile: 'reports/junit-[hash].xml' },
    },
    experimentalWebKitSupport: true,
  },
});
