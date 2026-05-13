const crypto = require('crypto');

const ADMIN_COOKIE_NAME = 'dp_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
const PASSWORD_HASH_SCHEME = 'pbkdf2_sha256';
const DEFAULT_PBKDF2_ITERATIONS = 310000;

function base64urlEncode(value) {
    return Buffer.from(value).toString('base64url');
}

function base64urlJson(value) {
    return base64urlEncode(JSON.stringify(value));
}

function parseCookies(req = {}) {
    const header = req.headers?.cookie || '';
    return header
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=');
            if (separatorIndex === -1) return cookies;

            const name = part.slice(0, separatorIndex).trim();
            const value = part.slice(separatorIndex + 1).trim();
            if (!name) return cookies;

            try {
                cookies[name] = decodeURIComponent(value);
            } catch (error) {
                cookies[name] = value;
            }

            return cookies;
        }, {});
}

function timingSafeEqualString(left, right) {
    const leftBuffer = Buffer.from(String(left || ''));
    const rightBuffer = Buffer.from(String(right || ''));

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getAdminConfig(env = process.env) {
    const user = String(env.ADMIN_USER || '').trim();
    const passwordHash = String(env.ADMIN_PASSWORD_HASH || '').trim();
    const sessionSecret = String(env.ADMIN_SESSION_SECRET || '').trim();
    const explicitSecure = String(env.ADMIN_COOKIE_SECURE || '').trim().toLowerCase();
    const appEnvironment = String(env.APP_ENV || env.PGM_APP_ENV || '').trim().toLowerCase();
    const onlineEnvironment = ['production', 'prod', 'staging', 'stage', 'preprod', 'preproduction'].includes(appEnvironment);
    const cookieSecure = explicitSecure
        ? explicitSecure !== 'false'
        : onlineEnvironment || String(env.NODE_ENV || '').toLowerCase() === 'production';

    return {
        user,
        passwordHash,
        sessionSecret,
        cookieSecure,
        configured: Boolean(user && passwordHash && sessionSecret)
    };
}

function digestFromEncodedValue(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return null;

    if (/^[a-f0-9]+$/i.test(normalized) && normalized.length % 2 === 0) {
        return Buffer.from(normalized, 'hex');
    }

    try {
        return Buffer.from(normalized, 'base64url');
    } catch (error) {
        try {
            return Buffer.from(normalized, 'base64');
        } catch (fallbackError) {
            return null;
        }
    }
}

function hashAdminPassword(password, options = {}) {
    const iterations = Math.max(Number(options.iterations || DEFAULT_PBKDF2_ITERATIONS), 100000);
    const salt = options.salt || crypto.randomBytes(18).toString('base64url');
    const digest = crypto.pbkdf2Sync(String(password || ''), salt, iterations, 32, 'sha256');

    return `${PASSWORD_HASH_SCHEME}$${iterations}$${salt}$${digest.toString('base64url')}`;
}

function verifyPasswordHash(password, encodedHash) {
    const [scheme, iterationsRaw, salt, digestValue] = String(encodedHash || '').split('$');
    if (scheme !== PASSWORD_HASH_SCHEME || !iterationsRaw || !salt || !digestValue) {
        return false;
    }

    const iterations = Number.parseInt(iterationsRaw, 10);
    if (!Number.isFinite(iterations) || iterations < 100000) {
        return false;
    }

    const expectedDigest = digestFromEncodedValue(digestValue);
    if (!expectedDigest || expectedDigest.length < 16) {
        return false;
    }

    const actualDigest = crypto.pbkdf2Sync(
        String(password || ''),
        salt,
        iterations,
        expectedDigest.length,
        'sha256'
    );

    return crypto.timingSafeEqual(actualDigest, expectedDigest);
}

function signPayload(encodedPayload, secret) {
    return crypto
        .createHmac('sha256', String(secret || ''))
        .update(encodedPayload)
        .digest('base64url');
}

function createAdminSessionToken(username, options = {}) {
    const config = getAdminConfig(options.env);
    const secret = options.secret || config.sessionSecret;
    if (!secret) {
        throw new Error('ADMIN_SESSION_SECRET is required to create an admin session');
    }

    const nowSeconds = Math.floor((options.now ? new Date(options.now).getTime() : Date.now()) / 1000);
    const ttlSeconds = Number(options.ttlSeconds || ADMIN_SESSION_TTL_SECONDS);
    const payload = {
        sub: String(username || config.user || '').trim(),
        iat: nowSeconds,
        exp: nowSeconds + ttlSeconds,
        nonce: options.nonce || crypto.randomBytes(16).toString('hex')
    };

    const encodedPayload = base64urlJson(payload);
    return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

function verifyAdminSessionToken(token, options = {}) {
    const config = getAdminConfig(options.env);
    const secret = options.secret || config.sessionSecret;
    const expectedUser = String(options.expectedUser || config.user || '').trim();
    const [encodedPayload, signature] = String(token || '').split('.');

    if (!encodedPayload || !signature || !secret || !expectedUser) {
        return null;
    }

    const expectedSignature = signPayload(encodedPayload, secret);
    if (!timingSafeEqualString(signature, expectedSignature)) {
        return null;
    }

    let payload;
    try {
        payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch (error) {
        return null;
    }

    const nowSeconds = Math.floor((options.now ? new Date(options.now).getTime() : Date.now()) / 1000);
    if (!payload?.sub || !payload.exp || payload.exp <= nowSeconds) {
        return null;
    }

    if (!timingSafeEqualString(payload.sub, expectedUser)) {
        return null;
    }

    return {
        user: payload.sub,
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: new Date(payload.exp * 1000).toISOString()
    };
}

function getAdminSessionFromRequest(req, options = {}) {
    const cookies = parseCookies(req);
    return verifyAdminSessionToken(cookies[ADMIN_COOKIE_NAME], options);
}

function verifyAdminCredentials({ username, password } = {}, options = {}) {
    const config = getAdminConfig(options.env);
    if (!config.configured) {
        return { ok: false, reason: 'not_configured' };
    }

    if (!timingSafeEqualString(String(username || '').trim(), config.user)) {
        return { ok: false, reason: 'invalid_credentials' };
    }

    if (!verifyPasswordHash(password, config.passwordHash)) {
        return { ok: false, reason: 'invalid_credentials' };
    }

    return { ok: true, user: config.user };
}

function serializeAdminCookie(value, options = {}) {
    const maxAge = Number(options.maxAgeSeconds ?? ADMIN_SESSION_TTL_SECONDS);
    const pieces = [
        `${ADMIN_COOKIE_NAME}=${encodeURIComponent(value || '')}`,
        'HttpOnly',
        'SameSite=Lax',
        'Path=/',
        `Max-Age=${maxAge}`
    ];

    if (options.secure) {
        pieces.push('Secure');
    }

    return pieces.join('; ');
}

function setAdminSessionCookie(res, token, options = {}) {
    const config = getAdminConfig(options.env);
    res.setHeader('Set-Cookie', serializeAdminCookie(token, {
        secure: options.secure ?? config.cookieSecure,
        maxAgeSeconds: options.maxAgeSeconds
    }));
}

function clearAdminSessionCookie(res, options = {}) {
    const config = getAdminConfig(options.env);
    res.setHeader('Set-Cookie', serializeAdminCookie('', {
        secure: options.secure ?? config.cookieSecure,
        maxAgeSeconds: 0
    }));
}

function requireAdminSession(options = {}) {
    return (req, res, next) => {
        const config = getAdminConfig(options.env);
        if (!config.configured) {
            if (options.redirectToLogin) {
                return res.redirect('/admin/login.html?setup=required');
            }

            return res.status(503).json({
                error: 'Admin access is not configured',
                requiredEnv: ['ADMIN_USER', 'ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET']
            });
        }

        const session = getAdminSessionFromRequest(req, options);
        if (!session) {
            if (options.redirectToLogin) {
                const nextPath = encodeURIComponent(req.originalUrl || req.url || '/admin/reservations.html');
                return res.redirect(`/admin/login.html?next=${nextPath}`);
            }

            return res.status(401).json({ error: 'Admin session required' });
        }

        req.adminSession = session;
        return next();
    };
}

module.exports = {
    ADMIN_COOKIE_NAME,
    ADMIN_SESSION_TTL_SECONDS,
    DEFAULT_PBKDF2_ITERATIONS,
    createAdminSessionToken,
    clearAdminSessionCookie,
    getAdminConfig,
    getAdminSessionFromRequest,
    hashAdminPassword,
    parseCookies,
    requireAdminSession,
    setAdminSessionCookie,
    verifyAdminCredentials,
    verifyAdminSessionToken,
    verifyPasswordHash
};
