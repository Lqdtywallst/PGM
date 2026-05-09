#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const nodeBin = process.execPath;
const playwrightCli = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');

function requireUrlEnv(name) {
    const value = process.env[name];

    if (!value || !String(value).trim()) {
        throw new Error(`${name} is required. Example: ${name}=https://preprod.example.netlify.app`);
    }

    try {
        return new URL(String(value).trim()).toString().replace(/\/+$/, '');
    } catch {
        throw new Error(`${name} must be a valid absolute URL.`);
    }
}

function quoteArg(arg) {
    return /\s/.test(arg) ? `"${arg}"` : arg;
}

function renderCommand(command, args) {
    return [command, ...args].map(quoteArg).join(' ');
}

let frontendUrl;
let backendUrl;

try {
    frontendUrl = requireUrlEnv('PREPROD_FRONTEND_URL');
    backendUrl = requireUrlEnv('PREPROD_BACKEND_URL');
} catch (error) {
    console.error(error.message);
    console.error('');
    console.error('PowerShell example:');
    console.error('$env:PREPROD_FRONTEND_URL="https://your-netlify-preprod.netlify.app"');
    console.error('$env:PREPROD_BACKEND_URL="https://your-railway-staging.up.railway.app"');
    console.error('npm run audit:preprod:functional');
    process.exit(1);
}

const args = [
    playwrightCli,
    'test',
    'tests/e2e/preprod-functional-gate.spec.js',
    '--project=desktop-chromium',
    '--project=mobile-chromium',
    '--workers=1'
];

console.log('Running preproduction functional gate...');
console.log(`Frontend: ${frontendUrl}`);
console.log(`Backend: ${backendUrl}`);
console.log(`$ ${renderCommand(nodeBin, args)}`);

const result = spawnSync(nodeBin, args, {
    cwd: repoRoot,
    env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: frontendUrl,
        PREPROD_BACKEND_URL: backendUrl
    },
    stdio: 'inherit'
});

if (result.error) {
    console.error(`Preproduction gate failed before running Playwright: ${result.error.message}`);
    process.exit(1);
}

if (result.status !== 0) {
    const reason = result.signal ? `signal ${result.signal}` : `exit code ${result.status}`;
    console.error(`Preproduction gate failed (${reason}).`);
    process.exit(result.status || 1);
}

console.log('Preproduction functional gate passed.');
