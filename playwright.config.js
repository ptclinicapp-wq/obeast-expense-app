const {defineConfig} = require('@playwright/test');

module.exports = defineConfig({
  testDir:'./tests/e2e',
  timeout:30_000,
  fullyParallel:true,
  forbidOnly:!!process.env.CI,
  retries:process.env.CI ? 1 : 0,
  workers:process.env.CI ? 2 : undefined,
  reporter:process.env.CI ? [['line'],['html',{open:'never'}]] : 'line',
  use:{
    baseURL:'http://127.0.0.1:4173',
    browserName:'chromium',
    channel:process.env.CI ? undefined : 'msedge',
    locale:'th-TH',
    timezoneId:'Asia/Bangkok',
    screenshot:'only-on-failure',
    trace:'retain-on-failure'
  },
  webServer:{
    command:'node tests/test-server.cjs',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI
  }
});
