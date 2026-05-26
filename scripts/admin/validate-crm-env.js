#!/usr/bin/env node

const { getAdminConfig } = require('../../server/admin/admin-auth');
const { getMobileNotificationDiagnostics } = require('../../server/integrations/mobile-notifications');

function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeTarget(value) {
    const raw = clean(value).toLowerCase();
    if (['prod', 'production', 'live'].includes(raw)) return 'production';
    if (['stage', 'staging', 'preprod', 'preproduction', 'preview'].includes(raw)) return 'staging';
    return raw || 'staging';
}

function parseArgs(argv = process.argv.slice(2)) {
    const options = { target: '' };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--target' && argv[index + 1]) {
            options.target = argv[index + 1];
            index += 1;
            continue;
        }

        if (arg.startsWith('--target=')) {
            options.target = arg.slice('--target='.length);
        }
    }

    return {
        target: normalizeTarget(options.target || process.env.APP_ENV || process.env.PGM_APP_ENV)
    };
}

function stripeSecretMode(value) {
    const key = clean(value);
    if (key.startsWith('sk_live_')) return 'live';
    if (key.startsWith('sk_test_')) return 'test';
    return key ? 'unknown' : 'missing';
}

function stripePublicMode(value) {
    const key = clean(value);
    if (key.startsWith('pk_live_')) return 'live';
    if (key.startsWith('pk_test_')) return 'test';
    return key ? 'unknown' : 'missing';
}

function getStripePublishableKeyForTarget(env, target) {
    if (target === 'production') {
        return clean(
            env.PGM_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY ||
            env.PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
            env.PUBLIC_STRIPE_PUBLISHABLE_KEY ||
            env.STRIPE_PUBLISHABLE_KEY
        );
    }

    return clean(
        env.PGM_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY ||
        env.PGM_PUBLIC_STRIPE_STAGING_PUBLISHABLE_KEY ||
        env.PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY ||
        env.STRIPE_TEST_PUBLISHABLE_KEY ||
        env.PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        env.PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        env.STRIPE_PUBLISHABLE_KEY
    );
}

function parsePasswordHash(value) {
    const [scheme, iterationsRaw, salt, digest] = clean(value).split('$');
    const iterations = Number.parseInt(iterationsRaw, 10);

    return {
        scheme,
        iterations,
        ok: scheme === 'pbkdf2_sha256' &&
            Number.isFinite(iterations) &&
            iterations >= 310000 &&
            Boolean(salt) &&
            Boolean(digest)
    };
}

function databaseLooksWrongForTarget(databaseUrl, target) {
    const lower = clean(databaseUrl).toLowerCase();
    if (!lower) return false;

    if (target === 'staging') {
        return ['prod', 'production', 'live'].some((marker) => lower.includes(marker));
    }

    if (target === 'production') {
        return ['staging', 'stage', 'preprod', 'preview', 'test', 'dev', 'local'].some((marker) => lower.includes(marker));
    }

    return false;
}

function addCheck(checks, id, label, status, detail) {
    checks.push({
        id,
        label,
        status,
        detail: clean(detail)
    });
}

function expectedStripeMode(target) {
    return target === 'production' ? 'live' : 'test';
}

function validateCrmEnvironment(env = process.env, options = {}) {
    const target = normalizeTarget(options.target || env.APP_ENV || env.PGM_APP_ENV);
    const checks = [];
    const expectedMode = expectedStripeMode(target);
    const appEnv = normalizeTarget(env.APP_ENV || env.PGM_APP_ENV);
    const nodeEnv = clean(env.NODE_ENV).toLowerCase();
    const databaseUrl = clean(env.DATABASE_URL);
    const admin = getAdminConfig(env);
    const passwordHash = parsePasswordHash(env.ADMIN_PASSWORD_HASH);
    const secretLength = clean(env.ADMIN_SESSION_SECRET).length;
    const mobile = getMobileNotificationDiagnostics(env);
    const allowedOrigins = clean(env.ALLOWED_ORIGINS);
    const publicBackendUrl = clean(env.PGM_PUBLIC_BACKEND_URL || env.PUBLIC_BACKEND_URL);
    const crmUrl = clean(env.RESERVATION_CRM_URL || env.CRM_PUBLIC_URL || publicBackendUrl);
    const contactLogOnly = clean(env.CONTACT_FORM_LOG_ONLY).toLowerCase() === 'true';
    const emailConfigured = Boolean(
        clean(env.SMTP_HOST) ||
        (clean(env.EMAIL_USER) && clean(env.EMAIL_PASSWORD))
    );
    const stripePublishableKey = getStripePublishableKeyForTarget(env, target);

    addCheck(
        checks,
        'app_env',
        'Application environment',
        appEnv === target ? 'pass' : 'fail',
        `expected ${target}, got ${appEnv || 'missing'}`
    );

    addCheck(
        checks,
        'node_env',
        'Node environment',
        target === 'production'
            ? (nodeEnv === 'production' ? 'pass' : 'fail')
            : (['staging', 'production'].includes(nodeEnv) ? 'pass' : 'warn'),
        nodeEnv || 'missing'
    );

    addCheck(
        checks,
        'database_url',
        'PostgreSQL reservation database',
        databaseUrl && !databaseLooksWrongForTarget(databaseUrl, target) ? 'pass' : 'fail',
        !databaseUrl
            ? 'DATABASE_URL missing.'
            : databaseLooksWrongForTarget(databaseUrl, target)
                ? 'Database URL name looks like the wrong environment.'
                : 'DATABASE_URL set.'
    );

    addCheck(
        checks,
        'stripe_secret',
        'Stripe secret mode',
        stripeSecretMode(env.STRIPE_SECRET_KEY) === expectedMode ? 'pass' : 'fail',
        `expected ${expectedMode}, got ${stripeSecretMode(env.STRIPE_SECRET_KEY)}`
    );

    addCheck(
        checks,
        'stripe_public',
        'Stripe publishable mode',
        stripePublicMode(stripePublishableKey) === expectedMode ? 'pass' : 'fail',
        `expected ${expectedMode}, got ${stripePublicMode(stripePublishableKey)}`
    );

    addCheck(
        checks,
        'stripe_webhook',
        'Stripe webhook secret',
        clean(env.STRIPE_WEBHOOK_SECRET) ? 'pass' : 'fail',
        clean(env.STRIPE_WEBHOOK_SECRET) ? 'Configured.' : 'STRIPE_WEBHOOK_SECRET missing.'
    );

    addCheck(
        checks,
        'admin_credentials',
        'CRM admin credentials',
        admin.configured && passwordHash.ok ? 'pass' : 'fail',
        admin.configured
            ? (passwordHash.ok ? 'Admin user/hash/session secret configured.' : 'ADMIN_PASSWORD_HASH is not a valid pbkdf2_sha256 hash.')
            : 'Missing ADMIN_USER, ADMIN_PASSWORD_HASH or ADMIN_SESSION_SECRET.'
    );

    addCheck(
        checks,
        'admin_session_secret',
        'CRM session secret strength',
        secretLength >= 32 ? 'pass' : 'fail',
        secretLength ? `${secretLength} characters.` : 'ADMIN_SESSION_SECRET missing.'
    );

    addCheck(
        checks,
        'admin_cookie_secure',
        'CRM secure cookie',
        admin.cookieSecure ? 'pass' : 'fail',
        admin.cookieSecure ? 'Secure cookie enabled.' : 'Set ADMIN_COOKIE_SECURE=true for online environments.'
    );

    addCheck(
        checks,
        'mobile_notifications',
        'Mobile reservation alerts',
        mobile.configured ? 'pass' : 'fail',
        mobile.configured
            ? `Configured channels: ${mobile.channels.join(', ')}.`
            : 'Configure Telegram or reservation notification webhook.'
    );

    addCheck(
        checks,
        'crm_url',
        'CRM notification URL',
        crmUrl ? 'pass' : 'warn',
        crmUrl || 'Set RESERVATION_CRM_URL so mobile alerts link to the CRM.'
    );

    addCheck(
        checks,
        'allowed_origins',
        'Allowed frontend origins',
        allowedOrigins && !/localhost|127\.0\.0\.1/i.test(allowedOrigins) ? 'pass' : 'fail',
        allowedOrigins || 'ALLOWED_ORIGINS missing.'
    );

    addCheck(
        checks,
        'email_delivery',
        'Email/contact delivery',
        emailConfigured && !contactLogOnly ? 'pass' : 'warn',
        emailConfigured && !contactLogOnly
            ? 'Email transport configured.'
            : 'Contact email is not fully configured; acceptable for early staging, not final production.'
    );

    const failCount = checks.filter((check) => check.status === 'fail').length;
    const warnCount = checks.filter((check) => check.status === 'warn').length;

    return {
        target,
        ok: failCount === 0,
        status: failCount ? 'fail' : warnCount ? 'warn' : 'pass',
        failCount,
        warnCount,
        checks
    };
}

function printReport(report) {
    console.log(`CRM environment validation: ${report.target}`);
    console.log('');

    for (const check of report.checks) {
        const marker = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
        console.log(`[${marker}] ${check.label}${check.detail ? ` - ${check.detail}` : ''}`);
    }

    console.log('');
    console.log(`Summary: ${report.checks.length - report.failCount - report.warnCount} pass, ${report.warnCount} warn, ${report.failCount} fail`);
}

if (require.main === module) {
    const options = parseArgs();
    const report = validateCrmEnvironment(process.env, options);
    printReport(report);
    process.exit(report.ok ? 0 : 1);
}

module.exports = {
    normalizeTarget,
    validateCrmEnvironment
};
