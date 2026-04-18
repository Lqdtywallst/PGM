// Simple HTTP server to serve static files
// Usage: node server/server-http.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const siteRoot = path.resolve(__dirname, '../site');
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com",
    "connect-src 'self' http://127.0.0.1:3000 http://localhost:3000 https://api.stripe.com https://pgm-production.up.railway.app https://prestigegoalmotion.com https://www.prestigegoalmotion.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.openstreetmap.org",
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

function buildCacheHeaders(filePath) {
    const normalizedPath = String(filePath || '').toLowerCase();

    if (
        normalizedPath.endsWith('.html') ||
        normalizedPath.endsWith('/sw.js') ||
        normalizedPath.endsWith('/config.js') ||
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
    return {
        'Content-Security-Policy': CONTENT_SECURITY_POLICY,
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
    };
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
    let filePath = sanitizeRequestPath(req.url);

    console.log(`${req.method} ${req.url} -> ${filePath}`);

    let fullPath = path.join(siteRoot, filePath);
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
                res.end(`
                    <h1>404 - File not found</h1>
                    <p>Requested path: ${filePath}</p>
                    <p>Full path: ${fullPath}</p>
                    <p>Base directory: ${siteRoot}</p>
                `, 'utf-8');
            } else {
                console.error(`Error reading file: ${error.code}`);
                res.writeHead(500, buildSecurityHeaders());
                res.end(`Server error: ${error.code}`, 'utf-8');
            }
        } else {
            console.log(`File served: ${filePath}`);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                ...buildCacheHeaders(filePath),
                ...buildSecurityHeaders()
            });
            res.end(content, 'utf-8');
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
