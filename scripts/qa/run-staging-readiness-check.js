#!/usr/bin/env node

const vm = require('node:vm');

const frontendUrl = normalizeUrl(process.env.PREPROD_FRONTEND_URL || process.env.STAGING_FRONTEND_URL);
const backendUrl = normalizeUrl(process.env.PREPROD_BACKEND_URL || process.env.STAGING_BACKEND_URL);
const checks = [];

function normalizeUrl(value) {
    if (!value || !String(value).trim()) {
        return '';
    }

    try {
        return new URL(String(value).trim()).toString().replace(/\/+$/, '');
    } catch {
        return '';
    }
}

function urlFor(baseUrl, pathname) {
    return new URL(pathname, `${baseUrl}/`).toString();
}

function addCheck(scope, name, status, detail = '') {
    checks.push({ scope, name, status, detail });
}

function maskKey(value) {
    if (!value) return '(missing)';
    const text = String(value);
    return `${text.slice(0, 8)}...${text.slice(-4)}`;
}

function isPlaceholderPublishableKey(value) {
    const text = String(value || '').trim();
    return /^pk_test_x+$/i.test(text) || /^pk_live_x+$/i.test(text);
}

function isUsableTestPublishableKey(value) {
    const text = String(value || '').trim();
    return text.startsWith('pk_test_') && !isPlaceholderPublishableKey(text);
}

async function fetchText(url) {
    const response = await fetch(url, {
        headers: { Accept: 'text/html,application/javascript,application/json;q=0.9,*/*;q=0.8' }
    });
    const text = await response.text();
    return { response, text };
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' }
    });
    const body = await response.json().catch(() => null);
    return { response, body };
}

function evaluateFrontendConfig(runtimeJs, configJs) {
    const frontend = new URL(frontendUrl);
    const sandbox = {
        window: {
            location: {
                protocol: frontend.protocol,
                hostname: frontend.hostname,
                host: frontend.host,
                href: frontend.href
            },
            PGM_RUNTIME_CONFIG: {}
        },
        module: { exports: {} },
        process: { env: {} },
        console: {
            log() {},
            warn() {},
            error() {}
        }
    };

    if (runtimeJs) {
        vm.runInNewContext(runtimeJs, sandbox, {
            filename: 'runtime-config.js',
            timeout: 1000
        });
    }

    vm.runInNewContext(configJs, sandbox, {
        filename: 'config.js',
        timeout: 1000
    });

    return {
        runtimeConfig: sandbox.window.PGM_RUNTIME_CONFIG || {},
        appEnvironment: sandbox.window.APP_ENVIRONMENT,
        stripeConfig: sandbox.window.STRIPE_CONFIG || {}
    };
}

function addLocalEnvSnapshot() {
    const appEnv = process.env.APP_ENV || process.env.PGM_APP_ENV || '';
    const backendPublicUrl = process.env.PGM_PUBLIC_BACKEND_URL || '';
    const publishableKey = process.env.PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
    const databaseUrl = process.env.DATABASE_URL || '';
    const telegramConfigured = Boolean(
        (process.env.RESERVATION_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN) &&
        (process.env.RESERVATION_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID)
    );
    const notificationWebhookConfigured = Boolean(
        process.env.RESERVATION_NOTIFICATION_WEBHOOK_URL ||
        process.env.MOBILE_NOTIFICATION_WEBHOOK_URL
    );

    if (appEnv) {
        addCheck('local-env', 'APP_ENV/PGM_APP_ENV', normalizeEnv(appEnv) === 'staging' ? 'pass' : 'warn', appEnv);
    } else {
        addCheck('local-env', 'APP_ENV/PGM_APP_ENV', 'warn', 'Not set locally. This is OK if values live in Vercel/Railway.');
    }

    if (backendPublicUrl) {
        addCheck('local-env', 'PGM_PUBLIC_BACKEND_URL', backendPublicUrl === backendUrl ? 'pass' : 'warn', backendPublicUrl);
    } else {
        addCheck('local-env', 'PGM_PUBLIC_BACKEND_URL', 'warn', 'Not set locally. Frontend host must set it for staging builds.');
    }

    if (publishableKey) {
        addCheck('local-env', 'PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY', isUsableTestPublishableKey(publishableKey) ? 'pass' : 'fail', maskKey(publishableKey));
    } else {
        addCheck('local-env', 'PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'warn', 'Not set locally. Frontend host must set pk_test_ for staging.');
    }

    if (stripeSecret) {
        addCheck('local-env', 'STRIPE_SECRET_KEY', stripeSecret.startsWith('sk_test_') ? 'pass' : 'fail', maskKey(stripeSecret));
    } else {
        addCheck('local-env', 'STRIPE_SECRET_KEY', 'warn', 'Not set locally. Backend host must set sk_test_ for staging.');
    }

    if (databaseUrl) {
        const lowerDatabaseUrl = databaseUrl.toLowerCase();
        const looksProduction = lowerDatabaseUrl.includes('prod') || lowerDatabaseUrl.includes('production');
        addCheck('local-env', 'DATABASE_URL', looksProduction ? 'fail' : 'pass', looksProduction ? 'Looks production-like. Staging needs its own DB.' : 'SET');
    } else {
        addCheck('local-env', 'DATABASE_URL', 'warn', 'Not set locally. Backend host must set a staging Postgres URL.');
    }

    addCheck(
        'local-env',
        'Mobile notification channel',
        telegramConfigured || notificationWebhookConfigured ? 'pass' : 'warn',
        telegramConfigured
            ? 'Telegram configured locally.'
            : notificationWebhookConfigured
                ? 'Webhook configured locally.'
                : 'Not set locally. Backend host must configure Telegram or webhook for phone alerts.'
    );
}

function normalizeEnv(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['stage', 'preview', 'preprod', 'preproduction'].includes(normalized)) return 'staging';
    return normalized;
}

async function checkBackend() {
    if (!backendUrl) {
        addCheck('backend', 'PREPROD_BACKEND_URL/STAGING_BACKEND_URL', 'fail', 'Set the staging backend URL before running readiness.');
        return;
    }

    const health = await fetchJson(urlFor(backendUrl, '/health')).catch((error) => ({ error }));
    if (health.error) {
        addCheck('backend', 'Health endpoint', 'fail', health.error.message);
    } else {
        addCheck('backend', 'Health endpoint', health.response.ok ? 'pass' : 'fail', `HTTP ${health.response.status}`);
    }

    const testApi = await fetchJson(urlFor(backendUrl, '/api/test')).catch((error) => ({ error }));
    if (testApi.error) {
        addCheck('backend', 'Service diagnostics', 'fail', testApi.error.message);
        return;
    }

    addCheck('backend', 'Service diagnostics', testApi.response.ok ? 'pass' : 'fail', `HTTP ${testApi.response.status}`);

    const services = testApi.body?.services || {};
    const stripeMode = String(services.stripeMode || (services.stripeConfigured ? 'unknown' : 'missing')).trim().toLowerCase();
    addCheck(
        'backend',
        'Stripe backend is test mode',
        stripeMode === 'test' ? 'pass' : 'fail',
        stripeMode === 'test'
            ? 'STRIPE_SECRET_KEY is sk_test_.'
            : `Expected sk_test_ on staging backend, detected ${stripeMode}.`
    );
    addCheck('backend', 'Postgres reservation storage', services.databaseConfigured && services.reservationStorage === 'postgres' ? 'pass' : 'fail', `storage=${services.reservationStorage || 'unknown'}`);
    addCheck('backend', 'Mobile reservation notifications', services.mobileNotifications?.configured ? 'pass' : 'fail', services.mobileNotifications?.configured ? `channels=${(services.mobileNotifications.channels || []).join(', ')}` : 'Telegram/webhook is not configured on backend.');
    addCheck('backend', 'Email delivery', services.emailConfigured ? 'pass' : 'warn', services.contactMode || 'unknown');
}

async function checkFrontend() {
    if (!frontendUrl) {
        addCheck('frontend', 'PREPROD_FRONTEND_URL/STAGING_FRONTEND_URL', 'fail', 'Set the public staging frontend URL before running readiness.');
        return;
    }

    const page = await fetchText(frontendUrl).catch((error) => ({ error }));
    if (page.error) {
        addCheck('frontend', 'Frontend reachable', 'fail', page.error.message);
        return;
    }

    addCheck('frontend', 'Frontend reachable', page.response.ok ? 'pass' : 'fail', `HTTP ${page.response.status}`);

    const runtime = await fetchText(urlFor(frontendUrl, '/runtime-config.js')).catch(() => null);
    const config = await fetchText(urlFor(frontendUrl, '/config.js')).catch((error) => ({ error }));

    if (!config || config.error || !config.response.ok) {
        addCheck('frontend', 'config.js reachable', 'fail', config?.error?.message || `HTTP ${config?.response?.status || 'unknown'}`);
        return;
    }

    addCheck('frontend', 'config.js reachable', 'pass', `HTTP ${config.response.status}`);

    const runtimeJs = runtime?.response?.ok ? runtime.text : '';
    addCheck('frontend', 'runtime-config.js reachable', runtime?.response?.ok ? 'pass' : 'warn', runtime?.response?.ok ? `HTTP ${runtime.response.status}` : 'Missing or not public; config.js defaults will be used.');

    try {
        const result = evaluateFrontendConfig(runtimeJs, config.text);
        const stripeConfig = result.stripeConfig;
        const normalizedBackend = normalizeUrl(stripeConfig.backendUrl);

        addCheck('frontend', 'Frontend environment', stripeConfig.environment === 'staging' ? 'pass' : 'fail', `environment=${stripeConfig.environment || 'unknown'}`);
        addCheck('frontend', 'Frontend points to staging backend', normalizedBackend === backendUrl ? 'pass' : 'fail', `backendUrl=${normalizedBackend || 'missing'}`);
        addCheck('frontend', 'Stripe publishable key is usable test key', isUsableTestPublishableKey(stripeConfig.publishableKey) ? 'pass' : 'fail', maskKey(stripeConfig.publishableKey));
    } catch (error) {
        addCheck('frontend', 'Frontend config evaluation', 'fail', error.message);
    }
}

function printResults() {
    const byStatus = checks.reduce((acc, check) => {
        acc[check.status] = (acc[check.status] || 0) + 1;
        return acc;
    }, {});

    console.log('Staging/preproduction readiness check');
    console.log(`Frontend: ${frontendUrl || '(missing)'}`);
    console.log(`Backend: ${backendUrl || '(missing)'}`);
    console.log('');

    for (const check of checks) {
        const marker = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
        console.log(`[${marker}] ${check.scope}: ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
    }

    console.log('');
    console.log(`Summary: ${byStatus.pass || 0} pass, ${byStatus.warn || 0} warn, ${byStatus.fail || 0} fail`);
}

(async () => {
    if (typeof fetch !== 'function') {
        console.error('This readiness check requires Node.js 18+ with global fetch.');
        process.exit(1);
    }

    addLocalEnvSnapshot();
    await checkBackend();
    await checkFrontend();
    printResults();

    const hasFailures = checks.some((check) => check.status === 'fail');
    process.exit(hasFailures ? 1 : 0);
})().catch((error) => {
    console.error(`Staging readiness check failed: ${error.stack || error.message}`);
    process.exit(1);
});
