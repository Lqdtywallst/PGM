const fs = require('fs');
const path = require('path');
const { PUBLIC_PAGE_FILE_MAP } = require('../server/shared/public-page-map');

const projectRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(projectRoot, 'site');

const allowedRootEntries = new Set([
    '.codex',
    '.env',
    '.env.example',
    '.git',
    '.github',
    '.gitignore',
    '.playwright-mcp',
    'AGENTS.md',
    'app',
    'artifacts',
    'audit-engine',
    'docs',
    'netlify.toml',
    'node_modules',
    'output',
    'package-lock.json',
    'package.json',
    'playwright.config.js',
    'Procfile',
    'railway.json',
    'README.md',
    'scripts',
    'server',
    'site',
    'test-data',
    'tests',
    'vercel.json'
]);

const coreRoutes = {
    '/about.html': 'pages/core/about.html',
    '/contact.html': 'pages/core/contact.html',
    '/fleet.html': 'pages/core/fleet.html',
    '/locations.html': 'pages/core/locations.html',
    '/reservation-lookup.html': 'pages/core/reservation-lookup.html',
    '/services.html': 'pages/core/services.html'
};

const rootOnlySiteFiles = new Set([
    '.htaccess',
    '_redirects',
    'config.js',
    'favicon.ico',
    'index.html',
    'logo-dp-transparent.png',
    'manifest.json',
    'README.md',
    'robots.txt',
    'sitemap.xml',
    'sw.js'
]);

function relative(filePath) {
    return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function fail(message) {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
}

function pass(message) {
    console.log(`[PASS] ${message}`);
}

function exists(relativePath) {
    return fs.existsSync(path.join(projectRoot, relativePath));
}

const rootEntries = fs.readdirSync(projectRoot, { withFileTypes: true })
    .map((entry) => entry.name)
    .filter((name) => !allowedRootEntries.has(name));

if (rootEntries.length) {
    fail(`Unexpected root entries: ${rootEntries.sort().join(', ')}`);
} else {
    pass('Repository root contains only approved top-level entries');
}

for (const [route, expectedFile] of Object.entries(coreRoutes)) {
    if (PUBLIC_PAGE_FILE_MAP[route] !== expectedFile) {
        fail(`${route} should map to ${expectedFile}, got ${PUBLIC_PAGE_FILE_MAP[route] || 'missing'}`);
    }

    if (!exists(`site/${expectedFile}`)) {
        fail(`Missing core page file: site/${expectedFile}`);
    }
}

if (!process.exitCode) {
    pass('Core public routes map to site/pages/core');
}

for (const fileName of Object.values(coreRoutes).map((filePath) => path.basename(filePath))) {
    if (fs.existsSync(path.join(siteRoot, fileName))) {
        fail(`Core page should not live in site root: site/${fileName}`);
    }
}

const unexpectedSiteRootFiles = fs.readdirSync(siteRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !rootOnlySiteFiles.has(entry.name))
    .map((entry) => entry.name);

if (unexpectedSiteRootFiles.length) {
    fail(`Unexpected files in site root: ${unexpectedSiteRootFiles.sort().join(', ')}`);
} else {
    pass('Site root contains only homepage, metadata, and compatibility assets');
}

if (process.exitCode) {
    console.error('\nStructure audit failed. Move public hub pages to site/pages/core or archive root clutter outside the project root.');
} else {
    console.log('\nStructure audit complete: all checks passed.');
}
