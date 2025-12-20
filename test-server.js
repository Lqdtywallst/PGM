// Servidor de prueba simple
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
    let filePath = req.url.split('?')[0];
    
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log(`   -> filePath: ${filePath}`);

    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }

    const fullPath = path.join(__dirname, filePath);
    console.log(`   -> fullPath: ${fullPath}`);
    console.log(`   -> exists: ${fs.existsSync(fullPath)}`);

    fs.readFile(fullPath, (error, content) => {
        if (error) {
            console.error(`   ❌ ERROR: ${error.code}`);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>404 - Archivo no encontrado</h1>
                <p><strong>URL solicitada:</strong> ${req.url}</p>
                <p><strong>Ruta procesada:</strong> ${filePath}</p>
                <p><strong>Ruta completa:</strong> ${fullPath}</p>
                <p><strong>Directorio base:</strong> ${__dirname}</p>
                <hr>
                <h2>Archivos disponibles en la raíz:</h2>
                <ul>
                    ${fs.readdirSync(__dirname).filter(f => !f.startsWith('.')).map(f => `<li>${f}</li>`).join('')}
                </ul>
            `, 'utf-8');
        } else {
            console.log(`   ✅ OK`);
            const ext = path.extname(fullPath).toLowerCase();
            const types = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css'
            };
            res.writeHead(200, { 
                'Content-Type': types[ext] || 'text/plain',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🌐 SERVIDOR HTTP DE PRUEBA');
    console.log('='.repeat(60));
    console.log(`✅ Servidor en: http://localhost:${PORT}`);
    console.log(`📁 Directorio: ${__dirname}`);
    console.log('\n📝 Prueba estas URLs:');
    console.log(`   http://localhost:${PORT}/`);
    console.log(`   http://localhost:${PORT}/index.html`);
    console.log(`   http://localhost:${PORT}/config.js`);
    console.log(`   http://localhost:${PORT}/app/reserve/page.html`);
    console.log('\n⚠️  Presiona Ctrl+C para detener\n');
});

