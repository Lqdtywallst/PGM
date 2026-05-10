const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PUBLIC_PAGE_FILE_MAP, siteFileForPublicPath } = require('../../server/shared/public-page-map');

const projectRoot = path.resolve(__dirname, '..', '..');
const auditRoot = path.join(projectRoot, 'docs', 'audit');
const today = new Date().toISOString().slice(0, 10);
const textExtensions = new Set([
    '.css',
    '.env',
    '.example',
    '.html',
    '.js',
    '.json',
    '.md',
    '.mjs',
    '.py',
    '.svg',
    '.toml',
    '.txt',
    '.xml',
    '.yml',
    '.yaml'
]);
const previewPaths = new Set([
    'site/fleet-card-preview.html',
    'site/font-preview-options.html',
    'site/hero-lab.html',
    'site/hero-lab-layout.svg',
    'site/vehicle-template-base.html',
    'site/vehicle-template-premium.html',
    'site/css/fleet-card-preview.css',
    'site/css/hero-lab.css',
    'site/js/hero-lab.js'
]);
const archivePaths = new Set([
    'site/js/site-v2-3d.js'
]);
const archivePrefixes = [
    'site/media/models/',
    'site/vendor/three/'
];
const publicPageFiles = new Set(
    Object.values(PUBLIC_PAGE_FILE_MAP).map((relativePath) => `site/${relativePath}`)
);
const candidateDeletePaths = new Set([
    'app.lnk',
    'filter_review_focus.png',
    'site/brands/ferrari-clean.png',
    'site/brands/lamborghini-clean.png',
    'site/brands/mercedes-clean.png',
    'site/brands/porsche-clean.png',
    'site/brands/rolls-royce-badge-transparent.png',
    'site/css/home.css',
    'site/css/home/00-foundation.css',
    'site/css/home/10-header-hero.css',
    'site/css/home/20-booking.css',
    'site/css/home/30-sections.css',
    'site/css/home/40-contact-footer.css',
    'site/css/home/90-responsive.css',
    'site/icons/favicon.ico',
    'site/js/home-booking.js',
    'site/js/home.js'
]);

function toPosixPath(value) {
    return String(value).replace(/\\/g, '/');
}

function getGitLines(args) {
    const output = execFileSync('git', args, {
        cwd: projectRoot,
        encoding: 'utf8'
    });
    return output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function getGitStatusMap() {
    const output = execFileSync('git', ['status', '--porcelain'], {
        cwd: projectRoot,
        encoding: 'utf8'
    });
    const statusMap = new Map();
    for (const line of output.split(/\r?\n/)) {
        if (!line) {
            continue;
        }
        const status = line.slice(0, 2).trim() || '??';
        const rawPath = line.slice(3).trim();
        const targetPath = rawPath.includes(' -> ')
            ? rawPath.split(' -> ')[1].trim()
            : rawPath;
        statusMap.set(toPosixPath(targetPath), status);
    }
    return statusMap;
}

function listFiles(currentDir, files) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules') {
            continue;
        }
        const absolutePath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            listFiles(absolutePath, files);
            continue;
        }
        files.push(absolutePath);
    }
}

function canParseText(relativePath) {
    const extension = path.extname(relativePath).toLowerCase();
    if (textExtensions.has(extension)) {
        return true;
    }
    return path.basename(relativePath).toLowerCase() === 'procfile';
}

function normalizeReference(reference) {
    return String(reference).trim().split('#')[0].split('?')[0];
}

function isSkippableReference(reference) {
    if (!reference || reference === '#' || reference === '/') {
        return true;
    }
    return /^(?:https?:|mailto:|tel:|sms:|data:|blob:|javascript:)/i.test(reference);
}

function resolveReference(fromRelativePath, reference) {
    const cleanReference = normalizeReference(reference);
    if (isSkippableReference(cleanReference)) {
        return null;
    }

    const fromAbsolutePath = path.join(projectRoot, fromRelativePath);

    if (cleanReference.startsWith('/')) {
        const publicSiteRoot =
            fromRelativePath.startsWith('site/')
                ? path.join(projectRoot, 'site')
                : fromRelativePath.startsWith('site-legacy/')
                    ? path.join(projectRoot, 'site-legacy')
                    : projectRoot;
        const absolutePath = path.join(publicSiteRoot, cleanReference.slice(1));
        if (absolutePath.startsWith(projectRoot)) {
            return toPosixPath(path.relative(projectRoot, absolutePath));
        }
        return null;
    }

    const absolutePath = path.resolve(path.dirname(fromAbsolutePath), cleanReference);
    if (!absolutePath.startsWith(projectRoot)) {
        return null;
    }
    return toPosixPath(path.relative(projectRoot, absolutePath));
}

function extractReferences(relativePath, content) {
    const references = new Set();
    const patterns = [
        /\b(?:href|src|action|poster)=["']([^"']+)["']/gi,
        /(?:url\(|@import\s+url\()["']?([^"')]+)["']?\)?/gi,
        /\b(?:require|import)\(\s*["']([^"']+)["']\s*\)/gi,
        /\b(?:readFileSync|copyfile|copyFileSync|writeFileSync|mkdirSync)\(\s*["']([^"']+)["']/gi,
        /["']((?:\.\.?\/|\/)[^"'`]+)["']/g
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const resolved = resolveReference(relativePath, match[1]);
            if (resolved) {
                references.add(resolved);
            }
        }
    }

    return [...references].sort();
}

function parseSitemapPaths() {
    const sitemapPath = path.join(projectRoot, 'site', 'sitemap.xml');
    if (!fs.existsSync(sitemapPath)) {
        return new Set();
    }
    const xml = fs.readFileSync(sitemapPath, 'utf8');
    const matches = [...xml.matchAll(/<loc>https:\/\/prestigegoalmotion\.com\/([^<]*)<\/loc>/gi)];
    return new Set(matches.map((match) => {
        const pathname = match[1] ? `/${match[1]}` : '/';
        return path.relative(projectRoot, siteFileForPublicPath(path.join(projectRoot, 'site'), pathname)).replace(/\\/g, '/');
    }));
}

function classifyFile(relativePath, exists, incomingCount, sitemapEntries) {
    const basename = path.basename(relativePath);
    const extension = path.extname(relativePath).toLowerCase();

    if (
        archivePaths.has(relativePath) ||
        archivePrefixes.some((prefix) => relativePath.startsWith(prefix))
    ) {
        return {
            category: 'archivo',
            state: 'legacy',
            function: 'Experimento 3D retirado de la superficie publica y conservado como referencia',
            recommendedAction: 'se mueve/archiva',
            seoImpact: 'ninguno',
            deleteRisk: exists ? 'medio' : 'bajo'
        };
    }

    if (
        relativePath.startsWith('output/') ||
        relativePath.startsWith('temp/') ||
        relativePath.startsWith('test-results/') ||
        basename.endsWith('.log') ||
        basename.endsWith('.pid')
    ) {
        return {
            category: 'artefacto',
            state: 'candidato a borrar',
            function: 'Artefacto local de revision, runtime o test',
            recommendedAction: 'se elimina',
            seoImpact: 'ninguno',
            deleteRisk: 'bajo'
        };
    }

    if (relativePath === 'app.lnk' || relativePath === 'filter_review_focus.png') {
        return {
            category: 'artefacto',
            state: 'candidato a borrar',
            function: 'Archivo suelto de trabajo en la raiz',
            recommendedAction: 'se elimina',
            seoImpact: 'ninguno',
            deleteRisk: 'bajo'
        };
    }

    if (relativePath.startsWith('site-legacy/')) {
        return {
            category: 'legacy',
            state: 'legacy',
            function: 'Rastro de la version anterior del sitio',
            recommendedAction: 'se elimina',
            seoImpact: 'ninguno',
            deleteRisk: 'bajo'
        };
    }

    if (previewPaths.has(relativePath)) {
        return {
            category: 'preview',
            state: 'preview',
            function: 'Sandbox, preview o plantilla fuera del flujo publico',
            recommendedAction: 'se mueve/archiva',
            seoImpact: 'bajo',
            deleteRisk: 'medio'
        };
    }

    if (candidateDeletePaths.has(relativePath)) {
        return {
            category: 'duplicado/huella',
            state: incomingCount > 0 ? 'soporte' : 'candidato a borrar',
            function: 'Duplicado o resto de iteraciones anteriores',
            recommendedAction: incomingCount > 0 ? 'se queda' : 'se elimina',
            seoImpact: 'bajo',
            deleteRisk: incomingCount > 0 ? 'medio' : 'bajo'
        };
    }

    if (relativePath.startsWith('docs/')) {
        return {
            category: 'documentacion',
            state: 'soporte',
            function: 'Documentacion activa del proyecto',
            recommendedAction: 'se queda',
            seoImpact: 'ninguno',
            deleteRisk: 'medio'
        };
    }

    if (relativePath.startsWith('server/')) {
        return {
            category: 'backend',
            state: 'soporte',
            function: 'Backend, helpers de runtime y smoke tests',
            recommendedAction: 'se queda',
            seoImpact: 'medio',
            deleteRisk: 'alto'
        };
    }

    if (relativePath.startsWith('app/')) {
        return {
            category: 'backend',
            state: 'soporte',
            function: 'Ruta backend acoplada al servidor de reservas',
            recommendedAction: 'se queda',
            seoImpact: 'medio',
            deleteRisk: 'alto'
        };
    }

    if (relativePath.startsWith('scripts/')) {
        return {
            category: 'tooling',
            state: 'soporte',
            function: 'Script de soporte o automatizacion',
            recommendedAction: 'se queda',
            seoImpact: 'ninguno',
            deleteRisk: 'medio'
        };
    }

    if (relativePath.startsWith('site/')) {
        if (sitemapEntries.has(relativePath) || publicPageFiles.has(relativePath) || relativePath === 'site/robots.txt' || relativePath === 'site/sitemap.xml' || relativePath === 'site/manifest.json' || relativePath === 'site/favicon.ico' || relativePath === 'site/sw.js' || relativePath === 'site/_redirects' || relativePath === 'site/.htaccess') {
            return {
                category: 'produccion',
                state: 'produccion',
                function: 'Superficie publica, asset o metadata servida en produccion',
                recommendedAction: 'se queda',
                seoImpact: extension === '.html' || extension === '.xml' || extension === '.txt' ? 'alto' : 'medio',
                deleteRisk: 'alto'
            };
        }

        if (relativePath.startsWith('site/images/') || relativePath.startsWith('site/media/') || relativePath.startsWith('site/vendor/')) {
            return {
                category: 'produccion',
                state: 'produccion',
                function: 'Asset publico o dependencia estatica del sitio',
                recommendedAction: 'se queda',
                seoImpact: 'medio',
                deleteRisk: incomingCount > 0 ? 'alto' : 'medio'
            };
        }

        return {
            category: 'produccion',
            state: incomingCount > 0 ? 'soporte' : 'candidato a borrar',
            function: 'Archivo bajo la frontera publica sin evidencia clara de uso',
            recommendedAction: incomingCount > 0 ? 'se queda' : 'se elimina',
            seoImpact: 'bajo',
            deleteRisk: incomingCount > 0 ? 'medio' : 'bajo'
        };
    }

    return {
        category: 'configuracion',
        state: 'soporte',
        function: 'Configuracion o metadata de proyecto',
        recommendedAction: 'se queda',
        seoImpact: 'ninguno',
        deleteRisk: 'medio'
    };
}

function escapeCsv(value) {
    const normalized = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
    if (/[",\n]/.test(normalized)) {
        return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
}

function main() {
    const trackedFiles = new Set(getGitLines(['ls-files']));
    const deletedFiles = new Set(getGitLines(['ls-files', '--deleted']));
    const statusMap = getGitStatusMap();
    const sitemapEntries = parseSitemapPaths();
    const absoluteFiles = [];

    listFiles(projectRoot, absoluteFiles);

    const actualRelativeFiles = absoluteFiles
        .map((absolutePath) => toPosixPath(path.relative(projectRoot, absolutePath)))
        .sort();

    const allPaths = new Set([...actualRelativeFiles, ...deletedFiles]);
    const fileMap = new Map();

    for (const relativePath of allPaths) {
        const absolutePath = path.join(projectRoot, relativePath);
        const exists = fs.existsSync(absolutePath);
        const extension = path.extname(relativePath).toLowerCase();
        let outgoing = [];

        if (exists && canParseText(relativePath)) {
            const content = fs.readFileSync(absolutePath, 'utf8');
            outgoing = extractReferences(relativePath, content)
                .filter((targetPath) => allPaths.has(targetPath));
        }

        fileMap.set(relativePath, {
            path: relativePath,
            exists,
            extension,
            tracked: trackedFiles.has(relativePath),
            gitStatus: statusMap.get(relativePath) || '',
            sizeBytes: exists ? fs.statSync(absolutePath).size : 0,
            outgoing
        });
    }

    const incomingMap = new Map();
    for (const [relativePath, record] of fileMap.entries()) {
        for (const targetPath of record.outgoing) {
            if (!incomingMap.has(targetPath)) {
                incomingMap.set(targetPath, new Set());
            }
            incomingMap.get(targetPath).add(relativePath);
        }
    }

    const rows = [...fileMap.values()]
        .map((record) => {
            const incoming = [...(incomingMap.get(record.path) || new Set())].sort();
            const classification = classifyFile(record.path, record.exists, incoming.length, sitemapEntries);
            return {
                ...record,
                ...classification,
                incoming
            };
        })
        .sort((a, b) => a.path.localeCompare(b.path));

    fs.mkdirSync(auditRoot, { recursive: true });

    const csvHeaders = [
        'path',
        'exists',
        'tracked',
        'git_status',
        'category',
        'state',
        'function',
        'recommended_action',
        'seo_impact',
        'delete_risk',
        'size_bytes',
        'incoming_count',
        'incoming_from',
        'outgoing_count',
        'outgoing_to'
    ];
    const csvLines = [csvHeaders.join(',')];

    for (const row of rows) {
        csvLines.push([
            row.path,
            row.exists,
            row.tracked,
            row.gitStatus,
            row.category,
            row.state,
            row.function,
            row.recommendedAction,
            row.seoImpact,
            row.deleteRisk,
            row.sizeBytes,
            row.incoming.length,
            row.incoming,
            row.outgoing.length,
            row.outgoing
        ].map(escapeCsv).join(','));
    }

    const summary = {
        generatedAt: new Date().toISOString(),
        scannedFileCount: rows.length,
        actualFileCount: actualRelativeFiles.length,
        deletedTrackedFileCount: deletedFiles.size,
        byState: rows.reduce((acc, row) => {
            acc[row.state] = (acc[row.state] || 0) + 1;
            return acc;
        }, {}),
        byRecommendedAction: rows.reduce((acc, row) => {
            acc[row.recommendedAction] = (acc[row.recommendedAction] || 0) + 1;
            return acc;
        }, {}),
        highSeoImpactFiles: rows.filter((row) => row.seoImpact === 'alto').map((row) => row.path),
        deleteCandidates: rows
            .filter((row) => row.recommendedAction === 'se elimina')
            .map((row) => row.path)
    };

    fs.writeFileSync(
        path.join(auditRoot, `INVENTARIO-RELACIONAL-${today}.csv`),
        `${csvLines.join('\n')}\n`
    );
    fs.writeFileSync(
        path.join(auditRoot, `INVENTARIO-RELACIONAL-${today}.json`),
        `${JSON.stringify({ summary, rows }, null, 2)}\n`
    );

    const summaryLines = [
        `# Inventario relacional ${today}`,
        '',
        `- Archivos escaneados: ${summary.scannedFileCount}`,
        `- Archivos fisicos actuales: ${summary.actualFileCount}`,
        `- Archivos trackeados ya borrados en el worktree: ${summary.deletedTrackedFileCount}`,
        '',
        '## Conteo por estado',
        ''
    ];

    for (const [state, count] of Object.entries(summary.byState).sort((a, b) => a[0].localeCompare(b[0]))) {
        summaryLines.push(`- ${state}: ${count}`);
    }

    summaryLines.push('', '## Conteo por accion recomendada', '');
    for (const [action, count] of Object.entries(summary.byRecommendedAction).sort((a, b) => a[0].localeCompare(b[0]))) {
        summaryLines.push(`- ${action}: ${count}`);
    }

    summaryLines.push('', '## Archivos con impacto SEO alto', '');
    for (const relativePath of summary.highSeoImpactFiles) {
        summaryLines.push(`- ${relativePath}`);
    }

    summaryLines.push('', '## Candidatos directos a eliminar', '');
    for (const relativePath of summary.deleteCandidates) {
        summaryLines.push(`- ${relativePath}`);
    }

    fs.writeFileSync(
        path.join(auditRoot, `INVENTARIO-RELACIONAL-RESUMEN-${today}.md`),
        `${summaryLines.join('\n')}\n`
    );

    console.log(`Inventory generated for ${rows.length} files on ${today}.`);
}

main();
