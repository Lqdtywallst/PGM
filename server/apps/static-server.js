// Simple HTTP server to serve static files
// Usage: node server/apps/static-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { siteFileForPublicPath } = require('../shared/public-page-map');

const PORT = Number(process.env.PORT || 8080);
const siteRoot = path.resolve(__dirname, '..', '..', 'site');
const REDIRECTS = {
    '/downtown-dubai-supercar-rental.html': '/supercar-rental-dubai.html',
    '/ferrari-rental-downtown-dubai.html': '/ferrari-rental-dubai.html',
    '/g63-rental-dubai.html': '/mercedes-g63-amg-rental-dubai.html',
    '/g63-rental-dubai-marina.html': '/mercedes-g63-amg-rental-dubai.html',
    '/lamborghini-rental-palm-jumeirah.html': '/lamborghini-rental-dubai.html'
};
const FRAME_ANCESTORS = String(
    process.env.PREVIEW_FRAME_ANCESTORS ||
    "'none'"
).trim();
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `frame-ancestors ${FRAME_ANCESTORS}`,
    "form-action 'self' https://checkout.stripe.com",
    "img-src 'self' data: https: https://*.stripe.com",
    "font-src 'self' data: https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com",
    "connect-src 'self' http://127.0.0.1:3000 http://localhost:3000 https://api.stripe.com https://checkout.stripe.com https://web-production-3d323.up.railway.app https://pgm-preproduccion.up.railway.app https://pgm-staging.up.railway.app https://dynastyprestigecarrental.com https://www.dynastyprestigecarrental.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
    "frame-src 'self' https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://www.openstreetmap.org https://www.google.com",
    "media-src 'self' https:",
    "manifest-src 'self'",
    "worker-src 'self' blob:"
].join('; ');
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};
const COMPRESSIBLE_TYPES = new Set([
    'application/javascript',
    'application/json',
    'image/svg+xml',
    'text/css',
    'text/html'
]);
const ALLOWED_STATIC_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function buildCacheHeaders(filePath) {
    const normalizedPath = String(filePath || '').toLowerCase();

    if (
        normalizedPath.endsWith('.html') ||
        normalizedPath.endsWith('/sw.js') ||
        normalizedPath.endsWith('/config.js') ||
        normalizedPath.endsWith('/runtime-config.js') ||
        normalizedPath.endsWith('/manifest.json')
    ) {
        return {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0'
        };
    }

    return {
        'Cache-Control': 'public, max-age=300'
    };
}

function buildSecurityHeaders() {
    const headers = {
        'Content-Security-Policy': CONTENT_SECURITY_POLICY,
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
        'X-Content-Type-Options': 'nosniff'
    };

    if (FRAME_ANCESTORS === "'none'") {
        headers['X-Frame-Options'] = 'DENY';
    }

    if (normalizeRuntimeEnvironment(process.env.APP_ENV || process.env.PGM_APP_ENV) === 'production') {
        headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
    }

    return headers;
}

function readPublicEnv(...names) {
    for (const name of names) {
        const value = process.env[name];

        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return '';
}

function normalizeRuntimeEnvironment(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (['development', 'dev', 'local'].includes(normalized)) {
        return 'development';
    }

    if (['staging', 'stage', 'preview', 'preprod', 'preproduction'].includes(normalized)) {
        return 'staging';
    }

    if (['production', 'prod'].includes(normalized)) {
        return 'production';
    }

    return '';
}

function resolvePublishableKeyForEnvironment(appEnv) {
    if (appEnv === 'staging') {
        return readPublicEnv(
            'PGM_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY',
            'PGM_PUBLIC_STRIPE_STAGING_PUBLISHABLE_KEY',
            'PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY',
            'STRIPE_TEST_PUBLISHABLE_KEY',
            'PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY',
            'PUBLIC_STRIPE_PUBLISHABLE_KEY',
            'STRIPE_PUBLISHABLE_KEY'
        );
    }

    if (appEnv === 'production') {
        return readPublicEnv(
            'PGM_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY',
            'PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY',
            'PUBLIC_STRIPE_PUBLISHABLE_KEY',
            'STRIPE_PUBLISHABLE_KEY'
        );
    }

    return readPublicEnv(
        'PGM_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY',
        'PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY',
        'PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'STRIPE_TEST_PUBLISHABLE_KEY',
        'STRIPE_PUBLISHABLE_KEY'
    );
}

function buildDynamicRuntimeConfig() {
    const appEnv = normalizeRuntimeEnvironment(readPublicEnv('PGM_APP_ENV', 'APP_ENV'));
    const backendUrl = readPublicEnv('PGM_PUBLIC_BACKEND_URL', 'PUBLIC_BACKEND_URL');
    const publishableKey = resolvePublishableKeyForEnvironment(appEnv);
    const runtimeConfig = {};

    if (appEnv) {
        runtimeConfig.appEnv = appEnv;
    }

    if (backendUrl) {
        runtimeConfig.backendUrl = backendUrl.replace(/\/+$/, '');
    }

    if (
        /^pk_(test|live)_[A-Za-z0-9_]+$/.test(publishableKey) &&
        !(appEnv === 'staging' && publishableKey.startsWith('pk_live_'))
    ) {
        runtimeConfig.publishableKey = publishableKey;
    }

    return runtimeConfig;
}

function renderDynamicRuntimeConfig() {
    return `// Dynamic local runtime config served by server/apps/static-server.js.
(function () {
    const runtimeConfig = ${JSON.stringify(buildDynamicRuntimeConfig(), null, 4)};

    window.PGM_RUNTIME_CONFIG = Object.assign({}, window.PGM_RUNTIME_CONFIG || {}, runtimeConfig);

    if (runtimeConfig.appEnv) {
        window.__APP_ENV__ = runtimeConfig.appEnv;
    }
}());
`;
}

function getPreferredCompression(requestHeaders = {}, contentType = '', contentLength = 0) {
    const acceptEncoding = String(requestHeaders['accept-encoding'] || '');

    if (!COMPRESSIBLE_TYPES.has(contentType) || contentLength < 1024) {
        return null;
    }

    if (/\bbr\b/i.test(acceptEncoding)) {
        return 'br';
    }

    if (/\bgzip\b/i.test(acceptEncoding)) {
        return 'gzip';
    }

    return null;
}

function compressContent(content, encoding, callback) {
    if (encoding === 'br') {
        zlib.brotliCompress(content, {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 5
            }
        }, callback);
        return;
    }

    if (encoding === 'gzip') {
        zlib.gzip(content, callback);
        return;
    }

    callback(null, content);
}

function sanitizeRequestPath(rawUrl) {
    let filePath = String(rawUrl || '').split('?')[0];

    if (filePath === '/' || filePath === '') {
        return '/index.html';
    }

    const sanitizedPath = filePath.replace(/(?<=\.[a-z0-9]{1,8})\.+$/i, '');

    if (sanitizedPath !== filePath) {
        console.log(`Sanitized path: ${filePath} -> ${sanitizedPath}`);
    }

    return sanitizedPath;
}

const server = http.createServer((req, res) => {
    if (!ALLOWED_STATIC_METHODS.has(req.method)) {
        res.writeHead(405, {
            Allow: 'GET, HEAD, OPTIONS',
            ...buildSecurityHeaders()
        });
        res.end();
        return;
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            Allow: 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            ...buildSecurityHeaders()
        });
        res.end();
        return;
    }

    let filePath = sanitizeRequestPath(req.url);

    console.log(`${req.method} ${req.url} -> ${filePath}`);

    if (REDIRECTS[filePath]) {
        const location = REDIRECTS[filePath];
        console.log(`Redirecting ${filePath} -> ${location}`);
        res.writeHead(301, {
            Location: location,
            ...buildCacheHeaders(filePath),
            ...buildSecurityHeaders()
        });
        res.end();
        return;
    }

    if (filePath === '/runtime-config.js' && process.env.PGM_RUNTIME_CONFIG_DYNAMIC === 'true') {
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            ...buildCacheHeaders(filePath),
            ...buildSecurityHeaders()
        });
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        res.end(renderDynamicRuntimeConfig(), 'utf-8');
        return;
    }

    let fullPath = siteFileForPublicPath(siteRoot, filePath);
    fullPath = path.normalize(fullPath);

    if (!fullPath.startsWith(siteRoot)) {
        console.error(`Access denied: ${fullPath}`);
        res.writeHead(403, { 'Content-Type': 'text/html', ...buildSecurityHeaders() });
        res.end('<h1>403 - Access denied</h1>', 'utf-8');
        return;
    }

    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(fullPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                console.error(`File not found: ${fullPath}`);
                res.writeHead(404, { 'Content-Type': 'text/html', ...buildSecurityHeaders() });
                res.end('<h1>404 - File not found</h1>', 'utf-8');
            } else {
                console.error(`Error reading file: ${error.code}`);
                res.writeHead(500, buildSecurityHeaders());
                res.end('Server error', 'utf-8');
            }
        } else {
            console.log(`File served: ${filePath}`);
            const compression = getPreferredCompression(req.headers, contentType, content.length);
            const baseHeaders = {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                ...buildCacheHeaders(filePath),
                ...buildSecurityHeaders()
            };

            if (req.method === 'HEAD') {
                res.writeHead(200, baseHeaders);
                res.end();
                return;
            }

            if (!compression) {
                res.writeHead(200, baseHeaders);
                res.end(content);
                return;
            }

            compressContent(content, compression, (compressionError, compressedContent) => {
                if (compressionError) {
                    console.error(`Compression failed for ${filePath}: ${compressionError.code || compressionError.message}`);
                    res.writeHead(200, baseHeaders);
                    res.end(content);
                    return;
                }

                res.writeHead(200, {
                    ...baseHeaders,
                    'Content-Encoding': compression,
                    Vary: 'Accept-Encoding'
                });
                res.end(compressedContent);
            });
        }
    });
});

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('SIMPLE HTTP SERVER');
    console.log('='.repeat(60));
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log(`Serving files from: ${siteRoot}`);
    console.log('\nOpen in your browser:');
    console.log(`   http://localhost:${PORT}/index.html`);
    console.log(`   http://localhost:${PORT}/app/reserve/page.html`);
    console.log('\nPress Ctrl+C to stop the server\n');
});
