// Simple HTTP server to serve static files
// Usage: node server-http.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
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

const server = http.createServer((req, res) => {
    // Parse the URL manually (compatible with all Node.js versions)
    let filePath = req.url.split('?')[0]; // Remove query strings
    
    console.log(`${req.method} ${req.url} -> ${filePath}`);

    // Handle root routes
    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }

    // Build full file path
    let fullPath = path.join(__dirname, filePath);
    
    // Normalize the path to avoid security issues
    fullPath = path.normalize(fullPath);
    
    // Verify the file is inside the project directory
    const projectDir = path.resolve(__dirname);
    if (!fullPath.startsWith(projectDir)) {
        console.error(`❌ Access denied: ${fullPath}`);
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 - Access denied</h1>', 'utf-8');
        return;
    }

    // Get file extension
    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // Read and serve the file
    fs.readFile(fullPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                console.error(`❌ File not found: ${fullPath}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>404 - File not found</h1>
                    <p>Requested path: ${filePath}</p>
                    <p>Full path: ${fullPath}</p>
                    <p>Base directory: ${__dirname}</p>
                `, 'utf-8');
            } else {
                console.error(`❌ Error reading file: ${error.code}`);
                res.writeHead(500);
                res.end(`Server error: ${error.code}`, 'utf-8');
            }
        } else {
            console.log(`✅ File served: ${filePath}`);
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🌐 SIMPLE HTTP SERVER');
    console.log('='.repeat(60));
    console.log(`✅ Server running at: http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`\n📝 Open in your browser:`);
    console.log(`   http://localhost:${PORT}/index.html`);
    console.log(`   http://localhost:${PORT}/app/reserve/page.html`);
    console.log('\n⚠️  Press Ctrl+C to stop the server\n');
});

