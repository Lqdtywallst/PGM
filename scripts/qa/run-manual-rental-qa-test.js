#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const nodeBin = process.execPath;
const playwrightCli = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const frontendUrl = String(process.env.QA_FRONTEND_URL || 'http://127.0.0.1:8081').replace(/\/+$/, '');
const backendUrl = String(process.env.QA_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const args = [
    playwrightCli,
    'test',
    'tests/e2e/manual-rental-real-backend.spec.js',
    '--project=desktop-chromium',
    '--project=mobile-chromium',
    '--workers=1'
];

console.log('Running manual rental QA test against the currently running environment...');
console.log(`Frontend: ${frontendUrl}`);
console.log(`Backend: ${backendUrl}`);

const result = spawnSync(nodeBin, args, {
    cwd: repoRoot,
    env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: frontendUrl,
        QA_BACKEND_URL: backendUrl
    },
    stdio: 'inherit'
});

if (result.error) {
    console.error(`Manual rental QA test failed before running Playwright: ${result.error.message}`);
    process.exit(1);
}

process.exit(result.status || 0);
