// Servidor HTTP simple para servir archivos estáticos
// Uso: node server-http.js

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
    // Parsear la URL manualmente (compatible con todas las versiones de Node.js)
    let filePath = req.url.split('?')[0]; // Remover query strings
    
    console.log(`${req.method} ${req.url} -> ${filePath}`);

    // Manejar rutas raíz
    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }

    // Construir ruta completa del archivo
    let fullPath = path.join(__dirname, filePath);
    
    // Normalizar la ruta para evitar problemas de seguridad
    fullPath = path.normalize(fullPath);
    
    // Verificar que el archivo esté dentro del directorio del proyecto
    const projectDir = path.resolve(__dirname);
    if (!fullPath.startsWith(projectDir)) {
        console.error(`❌ Acceso denegado: ${fullPath}`);
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 - Acceso denegado</h1>', 'utf-8');
        return;
    }

    // Obtener extensión del archivo
    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // Leer y servir el archivo
    fs.readFile(fullPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                console.error(`❌ Archivo no encontrado: ${fullPath}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>404 - Archivo no encontrado</h1>
                    <p>Ruta solicitada: ${filePath}</p>
                    <p>Ruta completa: ${fullPath}</p>
                    <p>Directorio base: ${__dirname}</p>
                `, 'utf-8');
            } else {
                console.error(`❌ Error leyendo archivo: ${error.code}`);
                res.writeHead(500);
                res.end(`Error del servidor: ${error.code}`, 'utf-8');
            }
        } else {
            console.log(`✅ Archivo servido: ${filePath}`);
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
    console.log('🌐 SERVIDOR HTTP SIMPLE');
    console.log('='.repeat(60));
    console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`📁 Sirviendo archivos desde: ${__dirname}`);
    console.log(`\n📝 Abre en tu navegador:`);
    console.log(`   http://localhost:${PORT}/index.html`);
    console.log(`   http://localhost:${PORT}/app/reserve/page.html`);
    console.log('\n⚠️  Presiona Ctrl+C para detener el servidor\n');
});

