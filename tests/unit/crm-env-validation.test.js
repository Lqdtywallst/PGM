const assert = require('node:assert/strict');
const test = require('node:test');

const {
    validateCrmEnvironment
} = require('../../scripts/admin/validate-crm-env');

const baseEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://pgm_staging:secret@db.example.com/pgm_staging',
    STRIPE_WEBHOOK_SECRET: 'whsec_123',
    ADMIN_USER: 'owner',
    ADMIN_PASSWORD_HASH: 'pbkdf2_sha256$310000$salt$digest',
    ADMIN_SESSION_SECRET: 'x'.repeat(40),
    RESERVATION_TELEGRAM_BOT_TOKEN: '123456:test-token',
    RESERVATION_TELEGRAM_CHAT_ID: '987654',
    RESERVATION_CRM_URL: 'https://pgm-staging.up.railway.app/crm',
    ALLOWED_ORIGINS: 'https://staging.prestigegoalmotion.com',
    SMTP_HOST: 'smtp.example.com',
    CONTACT_FORM_LOG_ONLY: 'false'
};

test('staging CRM environment accepts test Stripe keys and staging database', () => {
    const report = validateCrmEnvironment({
        ...baseEnv,
        APP_ENV: 'staging',
        STRIPE_SECRET_KEY: 'sk_test_123',
        PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_123',
        PGM_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_123'
    }, { target: 'staging' });

    assert.equal(report.ok, true);
    assert.equal(report.status, 'pass');
});

test('staging CRM environment rejects production-looking secrets and database', () => {
    const report = validateCrmEnvironment({
        ...baseEnv,
        APP_ENV: 'staging',
        DATABASE_URL: 'postgresql://pgm_prod:secret@db.example.com/pgm_production',
        STRIPE_SECRET_KEY: 'sk_live_123',
        PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_123'
    }, { target: 'staging' });

    assert.equal(report.ok, false);
    assert.equal(report.checks.some((check) => check.id === 'database_url' && check.status === 'fail'), true);
    assert.equal(report.checks.some((check) => check.id === 'stripe_secret' && check.status === 'fail'), true);
    assert.equal(report.checks.some((check) => check.id === 'stripe_public' && check.status === 'fail'), true);
});

test('production CRM environment requires live Stripe keys and secure online admin cookies', () => {
    const report = validateCrmEnvironment({
        ...baseEnv,
        APP_ENV: 'production',
        DATABASE_URL: 'postgresql://pgm_prod:secret@db.example.com/pgm_main',
        STRIPE_SECRET_KEY: 'sk_live_123',
        PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_123'
    }, { target: 'production' });

    assert.equal(report.ok, true);
    assert.equal(report.checks.some((check) => check.id === 'admin_cookie_secure' && check.status === 'pass'), true);
});
