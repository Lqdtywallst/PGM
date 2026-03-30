// Simple HTTP server to serve static files
// Usage: node server/server-http.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const siteRoot = path.resolve(__dirname, '../site');
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
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

const server = http.createServer((req, res) => {
    let filePath = req.url.split('?')[0];

    console.log(`${req.method} ${req.url} -> ${filePath}`);

    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }

    let fullPath = path.join(siteRoot, filePath);
    fullPath = path.normalize(fullPath);

    if (!fullPath.startsWith(siteRoot)) {
        console.error(`Access denied: ${fullPath}`);
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 - Access denied</h1>', 'utf-8');
        return;
    }

    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(fullPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                console.error(`File not found: ${fullPath}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>404 - File not found</h1>
                    <p>Requested path: ${filePath}</p>
                    <p>Full path: ${fullPath}</p>
                    <p>Base directory: ${siteRoot}</p>
                `, 'utf-8');
            } else {
                console.error(`Error reading file: ${error.code}`);
                res.writeHead(500);
                res.end(`Server error: ${error.code}`, 'utf-8');
            }
        } else {
            console.log(`File served: ${filePath}`);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                ...buildCacheHeaders(filePath)
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
