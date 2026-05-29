const assert = require('node:assert/strict');
const test = require('node:test');

const {
    ADMIN_COOKIE_NAME,
    createAdminSessionToken,
    getAdminConfig,
    hashAdminPassword,
    parseCookies,
    verifyAdminCredentials,
    verifyAdminSessionToken,
    verifyPasswordHash
} = require('../../server/admin/admin-auth');
const { renderAdminLoginPage } = require('../../server/admin/admin-pages');

test('admin password hashes verify with PBKDF2 and reject wrong passwords', () => {
    const passwordHash = hashAdminPassword('safe-password', {
        iterations: 100000,
        salt: 'test-salt'
    });

    assert.equal(verifyPasswordHash('safe-password', passwordHash), true);
    assert.equal(verifyPasswordHash('wrong-password', passwordHash), false);
    assert.equal(verifyPasswordHash('safe-password', 'plain-text'), false);
});

test('admin credentials require all environment variables', () => {
    const passwordHash = hashAdminPassword('safe-password', {
        iterations: 100000,
        salt: 'credential-salt'
    });

    assert.deepEqual(
        verifyAdminCredentials({ username: 'owner', password: 'safe-password' }, {
            env: {
                ADMIN_USER: 'owner',
                ADMIN_PASSWORD_HASH: passwordHash,
                ADMIN_SESSION_SECRET: 'session-secret'
            }
        }),
        { ok: true, user: 'owner' }
    );

    assert.equal(
        verifyAdminCredentials({ username: 'owner', password: 'wrong' }, {
            env: {
                ADMIN_USER: 'owner',
                ADMIN_PASSWORD_HASH: passwordHash,
                ADMIN_SESSION_SECRET: 'session-secret'
            }
        }).reason,
        'invalid_credentials'
    );

    assert.equal(
        verifyAdminCredentials({ username: 'owner', password: 'safe-password' }, {
            env: {
                ADMIN_USER: 'owner',
                ADMIN_PASSWORD_HASH: passwordHash
            }
        }).reason,
        'not_configured'
    );
});

test('admin session tokens are signed and expire', () => {
    const env = {
        ADMIN_USER: 'owner',
        ADMIN_PASSWORD_HASH: 'not-used-here',
        ADMIN_SESSION_SECRET: 'session-secret'
    };
    const token = createAdminSessionToken('owner', {
        env,
        now: '2026-04-25T10:00:00.000Z',
        ttlSeconds: 60,
        nonce: 'test-nonce'
    });

    assert.equal(
        verifyAdminSessionToken(token, {
            env,
            now: '2026-04-25T10:00:30.000Z'
        }).user,
        'owner'
    );

    assert.equal(
        verifyAdminSessionToken(token.slice(0, -1) + (token.endsWith('x') ? 'y' : 'x'), {
            env,
            now: '2026-04-25T10:00:30.000Z'
        }),
        null
    );

    assert.equal(
        verifyAdminSessionToken(token, {
            env,
            now: '2026-04-25T10:01:01.000Z'
        }),
        null
    );
});

test('admin cookie parsing reads signed session cookie safely', () => {
    const cookies = parseCookies({
        headers: {
            cookie: `${ADMIN_COOKIE_NAME}=abc.def; theme=dark`
        }
    });

    assert.equal(cookies[ADMIN_COOKIE_NAME], 'abc.def');
    assert.equal(cookies.theme, 'dark');
});

test('admin cookies default to secure in hosted staging and production', () => {
    assert.equal(getAdminConfig({ APP_ENV: 'staging' }).cookieSecure, true);
    assert.equal(getAdminConfig({ APP_ENV: 'production' }).cookieSecure, true);
    assert.equal(getAdminConfig({ APP_ENV: 'development' }).cookieSecure, false);
    assert.equal(getAdminConfig({ APP_ENV: 'staging', ADMIN_COOKIE_SECURE: 'false' }).cookieSecure, false);
});

test('admin login page sends the browser request verification header', () => {
    const html = renderAdminLoginPage();

    assert.match(html, /fetch\('\/api\/admin\/login'/);
    assert.match(html, /'X-Admin-Request': 'XMLHttpRequest'/);
});
