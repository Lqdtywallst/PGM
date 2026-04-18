const os = require('os');
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8085';

module.exports = defineConfig({
    testDir: './tests/e2e',
    outputDir: path.join(os.tmpdir(), 'prestige-goal-motion-playwright'),
    timeout: 30000,
    fullyParallel: true,
    expect: {
        timeout: 5000
    },
    reporter: [['list']],
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off'
    },
    webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
        command: 'node server/server-http.js',
        cwd: __dirname,
        url: `${baseURL}/`,
        reuseExistingServer: true,
        timeout: 30000,
        env: {
            ...process.env,
            PORT: '8085'
        }
    },
    projects: [
        {
            name: 'desktop-chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1366, height: 900 }
            }
        },
        {
            name: 'mobile-chromium',
            use: {
                ...devices['Pixel 7']
            }
        }
    ]
});
