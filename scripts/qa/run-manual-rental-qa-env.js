#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
require('dotenv').config({ path: path.join(repoRoot, '.env') });

const args = process.argv.slice(2);

function readArg(name, fallback) {
    const prefix = `${name}=`;
    const inline = args.find((arg) => arg.startsWith(prefix));
    if (inline) {
        return inline.slice(prefix.length);
    }

    const index = args.indexOf(name);
    if (index >= 0 && args[index + 1]) {
        return args[index + 1];
    }

    return fallback;
}

function hasFlag(name) {
    return args.includes(name);
}

function appendAllowedOrigins(currentValue, origins) {
    const values = new Set(
        String(currentValue || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
    );

    origins.forEach((origin) => values.add(origin));
    return Array.from(values).join(',');
}

function runBuildIfNeeded() {
    if (hasFlag('--skip-build')) {
        return;
    }

    const result = spawnSync(process.execPath, ['server/renderers/render-fleet-cards.js'], {
        cwd: repoRoot,
        env: process.env,
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

async function waitForUrl(url, label) {
    const startedAt = Date.now();
    let lastError = null;

    while (Date.now() - startedAt < 20000) {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (response.ok) {
                return;
            }
        } catch (error) {
            lastError = error;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    throw new Error(`${label} did not become ready at ${url}: ${lastError?.message || 'timeout'}`);
}

function spawnService(label, command, childArgs, env) {
    const child = spawn(command, childArgs, {
        cwd: repoRoot,
        env,
        stdio: 'inherit',
        windowsHide: true
    });

    child.on('exit', (code, signal) => {
        if (shuttingDown) {
            return;
        }

        console.error(`[qa-manual] ${label} exited unexpectedly (${signal || `code ${code}`}).`);
        shutdown(code || 1);
    });

    return child;
}

function shutdown(exitCode = 0) {
    shuttingDown = true;
    children.forEach((child) => {
        if (child.exitCode === null) {
            child.kill();
        }
    });
    process.exit(exitCode);
}

const requireDb = hasFlag('--require-db');
const frontendPort = String(readArg('--frontend-port', process.env.QA_FRONTEND_PORT || '8081'));
const backendPort = String(readArg('--backend-port', process.env.QA_BACKEND_PORT || '3000'));
const frontendUrl = `http://localhost:${frontendPort}`;
const backendUrl = `http://localhost:${backendPort}`;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const hasStripeSecret = /^sk_test_/.test(String(process.env.STRIPE_SECRET_KEY || ''));
const publicStripeKey = process.env.PGM_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY ||
    process.env.PGM_PUBLIC_STRIPE_STAGING_PUBLISHABLE_KEY ||
    process.env.PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY ||
    process.env.STRIPE_TEST_PUBLISHABLE_KEY ||
    process.env.PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    '';
const hasStripePublishable = /^pk_test_/.test(String(publicStripeKey || ''));
let shuttingDown = false;
const children = [];

if (requireDb && !hasDatabase) {
    console.error('[qa-manual] DATABASE_URL is required for qa:manual:db.');
    console.error('[qa-manual] Add a staging/local PostgreSQL DATABASE_URL to .env, or run npm run qa:manual for local JSON fallback.');
    process.exit(1);
}

runBuildIfNeeded();

const localOrigins = [
    `http://localhost:${frontendPort}`,
    `http://127.0.0.1:${frontendPort}`
];

const backendEnv = {
    ...process.env,
    PORT: backendPort,
    APP_ENV: process.env.APP_ENV || 'development',
    NODE_ENV: process.env.NODE_ENV || 'development',
    CONTACT_FORM_LOG_ONLY: process.env.CONTACT_FORM_LOG_ONLY || 'true',
    ALLOWED_ORIGINS: appendAllowedOrigins(process.env.ALLOWED_ORIGINS, localOrigins)
};

const frontendEnv = {
    ...process.env,
    PORT: frontendPort,
    PGM_RUNTIME_CONFIG_DYNAMIC: 'true',
    PGM_APP_ENV: process.env.PGM_APP_ENV || process.env.APP_ENV || 'development',
    PGM_PUBLIC_BACKEND_URL: backendUrl,
    PGM_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: publicStripeKey,
    PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY: publicStripeKey
};

console.log('[qa-manual] Starting real rental QA environment...');
console.log(`[qa-manual] Branch-safe ports: frontend ${frontendPort}, backend ${backendPort}`);
console.log(`[qa-manual] Reservation storage: ${hasDatabase ? 'PostgreSQL DATABASE_URL' : 'local JSON fallback'}`);
console.log(`[qa-manual] Stripe test checkout: ${hasStripeSecret && hasStripePublishable ? 'configured' : 'not fully configured'}`);

children.push(spawnService('backend', process.execPath, ['server/apps/backend.js'], backendEnv));
children.push(spawnService('frontend', process.execPath, ['server/apps/static-server.js'], frontendEnv));

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
    try {
        await waitForUrl(`${backendUrl}/health`, 'Backend');
        await waitForUrl(`${frontendUrl}/fleet.html`, 'Frontend');

        console.log('');
        console.log('[qa-manual] Ready.');
        console.log(`[qa-manual] Home: ${frontendUrl}/`);
        console.log(`[qa-manual] Fleet: ${frontendUrl}/fleet.html`);
        console.log(`[qa-manual] Reserve: ${frontendUrl}/app/reserve/page.html`);
        console.log(`[qa-manual] Find Booking: ${frontendUrl}/reservation-lookup.html`);
        console.log(`[qa-manual] CRM/Admin: ${backendUrl}/admin/login.html`);
        console.log('');
        console.log('[qa-manual] Recommended manual path: Fleet -> pick dates -> Reserve -> fill guest -> Stripe test payment -> CRM -> Fleet same dates.');
        console.log('[qa-manual] Use Stripe test card 4242 4242 4242 4242 if sk_test_ and pk_test_ are configured.');
        console.log('[qa-manual] Press Ctrl+C to stop both servers.');
        console.log('');
    } catch (error) {
        console.error(`[qa-manual] ${error.message}`);
        shutdown(1);
    }
})();
