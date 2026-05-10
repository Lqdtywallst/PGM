const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { PUBLIC_PAGE_FILE_MAP } = require('../../server/shared/public-page-map');

const repoRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(repoRoot, 'site');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'project-cleanup-audit');
const docsReportPath = path.join(repoRoot, 'docs', 'audit', 'PROJECT-CLEANUP-AUDIT.md');

const IGNORED_DIRS = new Set([
    '.git',
    '.codex',
    '.playwright-mcp',
    '.vercel',
    'artifacts',
    'node_modules',
    'output',
    'playwright-report',
    'test-results',
    'temp'
]);

const TEXT_EXTENSIONS = new Set([
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

const ROOT_KEEP_FILES = new Set([
    '.env.example',
    '.gitignore',
    '.vercelignore',
    'AGENTS.md',
    'netlify.toml',
    'package-lock.json',
    'package.json',
    'playwright.config.js',
    'Procfile',
    'railway.json',
    'README.md',
    'vercel.json'
]);

const ROOT_LOCAL_DELETE_PATTERNS = [
    /^contact-before-laptop\.png$/i,
    /^filter_review_focus\.png$/i,
    /^app\.lnk$/i
];

const ACTIVE_DOCS = new Set([
    'docs/README.md',
    'docs/deployment/PREPRODUCTION.md',
    'docs/qa/MANUAL_FUNCTIONAL_QA.md',
    'docs/admin/admin-reservations.md',
    'docs/design-system/design-system-brand.md',
    'docs/design-system/design-system-component-inventory.md',
    'docs/design-system/homogeneity-matrix.md',
    'docs/design-system/design-system-patterns-plan.md',
    'docs/content/premium-copy-guide.md',
    'docs/pricing/pricing-agent.md',
    'docs/qa/test-plan.md',
    'docs/audit/PROJECT-CLEANUP-AUDIT.md'
]);

const PUBLIC_SITE_FILES = new Set(
    Object.values(PUBLIC_PAGE_FILE_MAP).map((relativePath) => toPosixPath(path.join('site', relativePath)))
);

const PUBLIC_HTML_ROUTE_BY_BASENAME = new Map(
    Object.entries(PUBLIC_PAGE_FILE_MAP)
        .filter(([, relativePath]) => relativePath.endsWith('.html'))
        .map(([publicPath, relativePath]) => [
            path.basename(publicPath === '/' ? 'index.html' : publicPath),
            toPosixPath(path.join('site', relativePath))
        ])
);

function toPosixPath(value) {
    return String(value || '').replace(/\\/g, '/');
}

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function gitLines(args) {
    try {
        return execFileSync('git', args, {
            cwd: repoRoot,
            encoding: 'utf8'
        })
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map(toPosixPath);
    } catch (error) {
        return [];
    }
}

function gitStatusMap() {
    const output = execFileSync('git', ['status', '--porcelain'], {
        cwd: repoRoot,
        encoding: 'utf8'
    });
    const result = new Map();

    for (const line of output.split(/\r?\n/)) {
        if (!line) {
            continue;
        }
        const status = line.slice(0, 2);
        const rawPath = line.slice(3).trim();
        const cleanPath = rawPath.includes(' -> ')
            ? rawPath.split(' -> ').pop().trim()
            : rawPath;
        result.set(toPosixPath(cleanPath), status.trim() || '??');
    }

    return result;
}

function isIgnoredRelativePath(relativePath) {
    const segments = toPosixPath(relativePath).split('/');
    return segments.some((segment) => IGNORED_DIRS.has(segment));
}

function listFiles(dirPath, files = []) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const absolutePath = path.join(dirPath, entry.name);
        const relativePath = toPosixPath(path.relative(repoRoot, absolutePath));

        if (entry.isDirectory()) {
            if (!isIgnoredRelativePath(relativePath)) {
                listFiles(absolutePath, files);
            }
            continue;
        }

        if (entry.isFile() && !isIgnoredRelativePath(relativePath)) {
            files.push(absolutePath);
        }
    }

    return files;
}

function isTextFile(relativePath) {
    const extension = path.extname(relativePath).toLowerCase();
    return TEXT_EXTENSIONS.has(extension) || path.basename(relativePath).toLowerCase() === 'procfile';
}

function normalizeReference(value = '') {
    return String(value || '')
        .trim()
        .replace(/&amp;/g, '&')
        .split('#')[0]
        .split('?')[0]
        .trim();
}

function isExternalOrVirtualReference(value = '') {
    if (!value || value === '#' || value === '/') {
        return true;
    }
    return /^(?:https?:|mailto:|tel:|sms:|data:|blob:|javascript:|wa:)/i.test(value);
}

function isPublicSiteHtmlFile(relativePath) {
    return relativePath === 'site/index.html' ||
        relativePath === 'site/app/reserve/page.html' ||
        PUBLIC_SITE_FILES.has(relativePath);
}

function resolvePublicSiteReference(reference) {
    const cleanReference = normalizeReference(reference).replace(/^\.\//, '').replace(/^\/+/, '');

    if (!cleanReference) {
        return '';
    }

    const basename = path.basename(cleanReference);
    if (PUBLIC_HTML_ROUTE_BY_BASENAME.has(basename)) {
        return PUBLIC_HTML_ROUTE_BY_BASENAME.get(basename);
    }

    return toPosixPath(path.join('site', cleanReference));
}

function resolveReference(fromRelativePath, reference) {
    const cleanReference = normalizeReference(reference);

    if (isExternalOrVirtualReference(cleanReference)) {
        return '';
    }

    if (cleanReference.startsWith('/')) {
        return toPosixPath(path.join('site', cleanReference.slice(1)));
    }

    if (/^(?:app|docs|scripts|server|site|tests)\//.test(cleanReference)) {
        return toPosixPath(cleanReference);
    }

    if (isPublicSiteHtmlFile(fromRelativePath)) {
        return resolvePublicSiteReference(cleanReference);
    }

    const fromAbsolutePath = path.join(repoRoot, fromRelativePath);
    const absoluteTarget = path.resolve(path.dirname(fromAbsolutePath), cleanReference);

    if (!absoluteTarget.startsWith(repoRoot)) {
        return '';
    }

    return toPosixPath(path.relative(repoRoot, absoluteTarget));
}

function extractReferences(relativePath, content) {
    const references = new Set();
    const patterns = [
        /\b(?:href|src|action|poster)=["']([^"']+)["']/gi,
        /(?:url\(|@import\s+url\()["']?([^"')]+)["']?\)?/gi,
        /\b(?:require|import)\(\s*["']([^"']+)["']\s*\)/gi,
        /\bfrom\s+["']([^"']+)["']/gi,
        /\b(?:readFileSync|writeFileSync|copyFileSync|createReadStream|createWriteStream)\(\s*["']([^"']+)["']/gi,
        /["']((?:app|docs|scripts|server|site|tests)\/[^"'`]+)["']/g,
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

function packageScriptReferences(packageJson) {
    const refs = new Set();
    const scripts = packageJson.scripts || {};
    const patterns = [
        /\bnode\s+([^\s]+)/g,
        /\bplaywright\s+test\s+([^\s]+)/g
    ];

    for (const command of Object.values(scripts)) {
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(command)) !== null) {
                const candidate = normalizeReference(match[1]);
                if (!candidate || candidate.startsWith('-')) {
                    continue;
                }
                refs.add(toPosixPath(candidate));
            }
        }
    }

    return refs;
}

function buildActiveRootSet(packageJson) {
    const active = new Set(ROOT_KEEP_FILES);

    for (const relativePath of Object.values(PUBLIC_PAGE_FILE_MAP)) {
        active.add(toPosixPath(path.join('site', relativePath)));
    }

    [
        'site/robots.txt',
        'site/sitemap.xml',
        'site/manifest.json',
        'site/favicon.ico',
        'site/sw.js',
        'site/_redirects',
        'site/.htaccess',
        'app/api/reserve/route.js',
        'server/apps/backend.js',
        'server/apps/static-server.js',
        'server/shared/public-page-map.js',
        'server/design-system/design-system-components.json'
    ].forEach((filePath) => active.add(filePath));

    for (const filePath of packageScriptReferences(packageJson)) {
        active.add(filePath);
    }

    return active;
}

function extensionGroup(relativePath) {
    const extension = path.extname(relativePath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg'].includes(extension)) {
        return 'media';
    }
    if (['.mp4', '.mov', '.webm'].includes(extension)) {
        return 'video';
    }
    if (['.html', '.css', '.js', '.json', '.xml', '.md'].includes(extension)) {
        return extension.slice(1);
    }
    return extension ? extension.slice(1) : 'none';
}

function classifyDoc(relativePath) {
    if (ACTIVE_DOCS.has(relativePath)) {
        return {
            area: 'docs',
            state: 'active',
            action: 'keep',
            risk: 'low',
            reason: 'Live document or current operating guide.'
        };
    }

    if (relativePath.startsWith('docs/archive/')) {
        return {
            area: 'docs',
            state: 'archive',
            action: 'keep-archived',
            risk: 'low',
            reason: 'Already separated as historical archive.'
        };
    }

    if (relativePath.startsWith('docs/previews/')) {
        return {
            area: 'docs',
            state: 'preview',
            action: 'review-or-archive',
            risk: 'medium',
            reason: 'Useful preview/template, but it should not mix with live documentation.'
        };
    }

    if (relativePath.startsWith('docs/audits/') || relativePath.startsWith('docs/audit/')) {
        return {
            area: 'docs',
            state: 'audit-record',
            action: 'review-latest-then-archive',
            risk: 'medium',
            reason: 'Audit report; keep current records and archive historical ones.'
        };
    }

    if (relativePath.startsWith('docs/architecture/')) {
        return {
            area: 'docs',
            state: 'architecture',
            action: 'review-consolidate',
            risk: 'medium',
            reason: 'Architecture document; may overlap with the new mother system.'
        };
    }

    return {
        area: 'docs',
        state: 'support',
        action: 'review',
        risk: 'medium',
        reason: 'Support document not classified as a live guide.'
    };
}

function classifyFile(record, context) {
    const {
        activeRoots,
        incoming,
        tracked,
        gitStatus,
        relativePath,
        packageJson
    } = record;
    const basename = path.basename(relativePath);
    const incomingCount = incoming.length;
    const isRootFile = !relativePath.includes('/');
    const extension = path.extname(relativePath).toLowerCase();

    if (relativePath === '.env') {
        return {
            area: 'local-env',
            state: 'local-secret',
            action: 'keep-local-never-commit',
            risk: 'high',
            reason: 'Local sensitive variables ignored by git.'
        };
    }

    if (isRootFile && ROOT_LOCAL_DELETE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
        return {
            area: 'local-artifact',
            state: 'delete-candidate',
            action: 'delete-local',
            risk: 'low',
            reason: 'Loose local screenshot or shortcut outside the project structure.'
        };
    }

    if (relativePath.startsWith('docs/')) {
        return classifyDoc(relativePath);
    }

    if (relativePath.startsWith('test-data/') || relativePath.startsWith('tests/')) {
        return {
            area: 'tests',
            state: 'active',
            action: 'keep',
            risk: 'high',
            reason: 'Test coverage; do not clean without checking the scripts that run it.'
        };
    }

    if (relativePath.startsWith('audit-engine/')) {
        return {
            area: 'audit-engine',
            state: 'separate-tooling',
            action: 'review-boundary',
            risk: 'medium',
            reason: 'Separate tool/subproject; document whether it stays here or should be extracted.'
        };
    }

    if (relativePath.startsWith('server/data/')) {
        return {
            area: 'data',
            state: 'active',
            action: 'keep',
            risk: 'high',
            reason: 'Structured data used by renderers, admin, reservations or audits.'
        };
    }

    if (relativePath.startsWith('server/') || relativePath.startsWith('app/')) {
        return {
            area: 'backend',
            state: activeRoots.has(relativePath) || incomingCount > 0 ? 'active' : 'support',
            action: 'keep',
            risk: 'high',
            reason: 'Backend, API, renderers or audit core; deleting here can break reservations or tooling.'
        };
    }

    if (relativePath.startsWith('scripts/')) {
        return {
            area: 'scripts',
            state: activeRoots.has(relativePath) || incomingCount > 0 ? 'active' : 'support-or-manual',
            action: activeRoots.has(relativePath) || incomingCount > 0 ? 'keep' : 'review',
            risk: 'medium',
            reason: activeRoots.has(relativePath)
                ? 'Script referenced by package.json or an operating workflow.'
                : 'Script not detected in package.json; review before deleting because it may be manual tooling.'
        };
    }

    if (relativePath.startsWith('site/pages/') && extension === '.md') {
        return {
            area: 'site-docs',
            state: 'documentation-in-site-tree',
            action: 'review-move-to-docs',
            risk: 'low',
            reason: 'Documentation stored inside the public page tree; keep or move to docs instead of deleting blindly.'
        };
    }

    if (relativePath.startsWith('site/pages/') || relativePath === 'site/index.html' || relativePath.startsWith('site/app/')) {
        const isPublicPage = activeRoots.has(relativePath);
        return {
            area: 'site-html',
            state: isPublicPage ? 'active-public-page' : incomingCount > 0 ? 'linked-html' : 'orphan-candidate',
            action: isPublicPage || incomingCount > 0 ? 'keep' : 'review-delete',
            risk: isPublicPage ? 'high' : 'medium',
            reason: isPublicPage
                ? 'Public page in the route map.'
                : incomingCount > 0
                    ? 'HTML linked internally.'
                    : 'HTML under site without evidence of a public route or internal references.'
        };
    }

    if (relativePath.startsWith('site/css/') || relativePath.startsWith('site/js/')) {
        return {
            area: relativePath.startsWith('site/css/') ? 'site-css' : 'site-js',
            state: incomingCount > 0 || activeRoots.has(relativePath) ? 'active' : 'orphan-candidate',
            action: incomingCount > 0 || activeRoots.has(relativePath) ? 'keep' : 'review-delete',
            risk: incomingCount > 0 ? 'high' : 'medium',
            reason: incomingCount > 0
                ? 'Referenced by pages, CSS, JS or configuration.'
                : 'No internal references detected; review for legacy or dynamic loading before deleting.'
        };
    }

    if (relativePath.startsWith('site/images/') || relativePath.startsWith('site/media/') || relativePath.startsWith('site/icons/')) {
        return {
            area: 'site-assets',
            state: incomingCount > 0 || activeRoots.has(relativePath) ? 'active' : 'asset-review',
            action: incomingCount > 0 || activeRoots.has(relativePath) ? 'keep' : 'review-compress-or-delete',
            risk: incomingCount > 0 ? 'high' : 'medium',
            reason: incomingCount > 0
                ? 'Asset referenced by HTML, CSS, JS or structured data.'
                : 'Public asset without detected references; candidate for cleanup or compression review.'
        };
    }

    if (relativePath.startsWith('site/')) {
        return {
            area: 'site-support',
            state: activeRoots.has(relativePath) || incomingCount > 0 ? 'active' : 'review',
            action: activeRoots.has(relativePath) || incomingCount > 0 ? 'keep' : 'review',
            risk: activeRoots.has(relativePath) ? 'high' : 'medium',
            reason: 'File inside the public site boundary.'
        };
    }

    if (isRootFile) {
        return {
            area: 'root-config',
            state: ROOT_KEEP_FILES.has(relativePath) ? 'active' : tracked ? 'review' : 'delete-candidate',
            action: ROOT_KEEP_FILES.has(relativePath) ? 'keep' : tracked ? 'review' : 'delete-local',
            risk: ROOT_KEEP_FILES.has(relativePath) ? 'high' : 'medium',
            reason: ROOT_KEEP_FILES.has(relativePath)
                ? 'Known root configuration.'
                : tracked
                    ? `Tracked root file not classified (${basename}); review purpose.`
                    : 'Untracked local root file.'
        };
    }

    return {
        area: 'unknown',
        state: 'review',
        action: 'review',
        risk: 'medium',
        reason: `Not automatically classified. package scripts=${Object.keys(packageJson.scripts || {}).length}, ext=${extension || 'none'}, status=${gitStatus || 'clean'}.`
    };
}

function formatBytes(bytes = 0) {
    const value = Number(bytes) || 0;
    if (value >= 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (value >= 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${value} B`;
}

function countBy(rows, field) {
    return rows.reduce((counts, row) => {
        const key = row[field] || 'unknown';
        counts[key] = (counts[key] || 0) + 1;
        return counts;
    }, {});
}

function toMarkdownTable(rows, columns) {
    if (!rows.length) {
        return '_None._';
    }

    const header = `| ${columns.map((column) => column.label).join(' |')} |`;
    const divider = `| ${columns.map(() => '---').join(' |')} |`;
    const lines = rows.map((row) => `| ${columns.map((column) => String(column.value(row)).replace(/\|/g, '\\|')).join(' |')} |`);
    return [header, divider, ...lines].join('\n');
}

function buildMarkdownReport(report) {
    const { summary, rows } = report;
    const deleteCandidates = rows.filter((row) => row.action === 'delete-local' || row.action === 'review-delete');
    const orphanCode = rows.filter((row) => ['site-css', 'site-js', 'site-html'].includes(row.area) && row.state.includes('orphan'));
    const docsToReview = rows.filter((row) => row.area === 'docs' && !['active', 'archive'].includes(row.state));
    const largeAssets = rows
        .filter((row) => row.area === 'site-assets')
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 18);
    const scriptsToReview = rows.filter((row) => row.area === 'scripts' && row.action === 'review');
    const untracked = rows.filter((row) => row.gitStatus === '??');

    return [
        '# Project Cleanup Audit',
        '',
        `Generated: ${summary.generatedAt}`,
        '',
        '## Summary',
        '',
        `- Files scanned: ${summary.filesScanned}`,
        `- Tracked files: ${summary.trackedFiles}`,
        `- Untracked files visible to git: ${summary.untrackedFiles}`,
        `- Total scanned size: ${formatBytes(summary.totalSizeBytes)}`,
        `- Delete-local candidates: ${summary.deleteLocalCandidates}`,
        `- Review-delete candidates: ${summary.reviewDeleteCandidates}`,
        `- Asset review candidates: ${summary.assetReviewCandidates}`,
        '',
        '## Counts By Area',
        '',
        toMarkdownTable(Object.entries(summary.byArea).map(([area, count]) => ({ area, count })), [
            { label: 'Area', value: (row) => row.area },
            { label: 'Count', value: (row) => row.count }
        ]),
        '',
        '## Counts By Action',
        '',
        toMarkdownTable(Object.entries(summary.byAction).map(([action, count]) => ({ action, count })), [
            { label: 'Action', value: (row) => row.action },
            { label: 'Count', value: (row) => row.count }
        ]),
        '',
        '## Delete And Review Candidates',
        '',
        '`delete-local` items can usually be removed after visual confirmation. `review-delete` items are tracked and require a second check before deleting.',
        '',
        toMarkdownTable(deleteCandidates.slice(0, 40), [
            { label: 'Path', value: (row) => row.relativePath },
            { label: 'Action', value: (row) => row.action },
            { label: 'Risk', value: (row) => row.risk },
            { label: 'Reason', value: (row) => row.reason }
        ]),
        '',
        '## Orphan Code And Public Files To Review',
        '',
        toMarkdownTable(orphanCode.slice(0, 60), [
            { label: 'Path', value: (row) => row.relativePath },
            { label: 'Area', value: (row) => row.area },
            { label: 'Incoming', value: (row) => row.incomingCount },
            { label: 'Action', value: (row) => row.action },
            { label: 'Reason', value: (row) => row.reason }
        ]),
        '',
        '## Docs To Consolidate Or Archive',
        '',
        toMarkdownTable(docsToReview.slice(0, 80), [
            { label: 'Path', value: (row) => row.relativePath },
            { label: 'State', value: (row) => row.state },
            { label: 'Action', value: (row) => row.action },
            { label: 'Reason', value: (row) => row.reason }
        ]),
        '',
        '## Largest Site Assets',
        '',
        toMarkdownTable(largeAssets, [
            { label: 'Path', value: (row) => row.relativePath },
            { label: 'Size', value: (row) => formatBytes(row.sizeBytes) },
            { label: 'Incoming', value: (row) => row.incomingCount },
            { label: 'Action', value: (row) => row.action }
        ]),
        '',
        '## Scripts Not Referenced By package.json',
        '',
        toMarkdownTable(scriptsToReview.slice(0, 80), [
            { label: 'Path', value: (row) => row.relativePath },
            { label: 'Incoming', value: (row) => row.incomingCount },
            { label: 'Reason', value: (row) => row.reason }
        ]),
        '',
        '## Untracked Files',
        '',
        toMarkdownTable(untracked, [
            { label: 'Path', value: (row) => row.relativePath },
            { label: 'Action', value: (row) => row.action },
            { label: 'Reason', value: (row) => row.reason }
        ]),
        '',
        '## Recommended Next Steps',
        '',
        '1. Delete only `delete-local` untracked files after visual confirmation.',
        '2. Move stale audit/history docs into `docs/archive/` or merge them into current docs.',
        '3. Review orphan CSS/JS/HTML one by one before deleting because static detection can miss dynamic references.',
        '4. Compress or replace large active assets only after checking visual quality.',
        '5. Re-run `node server/audits/test-server.js`, `npm run audit:homogeneity`, `npm run audit:homogeneity:components`, and `npm run audit:seo` after any tracked deletion.',
        ''
    ].join('\n');
}

function buildCleanupAudit() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const activeRoots = buildActiveRootSet(packageJson);
    const trackedFiles = new Set(gitLines(['ls-files']));
    const status = gitStatusMap();
    const physicalFiles = listFiles(repoRoot)
        .map((absolutePath) => {
            const relativePath = toPosixPath(path.relative(repoRoot, absolutePath));
            const stat = fs.statSync(absolutePath);
            return {
                absolutePath,
                relativePath,
                sizeBytes: stat.size,
                tracked: trackedFiles.has(relativePath),
                gitStatus: status.get(relativePath) || '',
                extensionGroup: extensionGroup(relativePath)
            };
        })
        .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

    const existingPaths = new Set(physicalFiles.map((file) => file.relativePath));
    const outgoingMap = new Map();
    const incomingMap = new Map();

    for (const file of physicalFiles) {
        if (!isTextFile(file.relativePath)) {
            outgoingMap.set(file.relativePath, []);
            continue;
        }

        let content = '';
        try {
            content = fs.readFileSync(file.absolutePath, 'utf8');
        } catch (error) {
            outgoingMap.set(file.relativePath, []);
            continue;
        }

        const outgoing = extractReferences(file.relativePath, content)
            .filter((target) => existingPaths.has(target));
        outgoingMap.set(file.relativePath, outgoing);

        for (const target of outgoing) {
            if (!incomingMap.has(target)) {
                incomingMap.set(target, new Set());
            }
            incomingMap.get(target).add(file.relativePath);
        }
    }

    const rows = physicalFiles.map((file) => {
        const incoming = [...(incomingMap.get(file.relativePath) || new Set())].sort();
        const outgoing = outgoingMap.get(file.relativePath) || [];
        const classification = classifyFile({
            ...file,
            activeRoots,
            incoming,
            outgoing,
            packageJson
        }, {});

        return {
            ...file,
            ...classification,
            incoming,
            outgoing,
            incomingCount: incoming.length,
            outgoingCount: outgoing.length
        };
    });

    const summary = {
        generatedAt: new Date().toISOString(),
        filesScanned: rows.length,
        trackedFiles: rows.filter((row) => row.tracked).length,
        untrackedFiles: rows.filter((row) => row.gitStatus === '??').length,
        totalSizeBytes: rows.reduce((sum, row) => sum + row.sizeBytes, 0),
        deleteLocalCandidates: rows.filter((row) => row.action === 'delete-local').length,
        reviewDeleteCandidates: rows.filter((row) => row.action === 'review-delete').length,
        assetReviewCandidates: rows.filter((row) => row.action === 'review-compress-or-delete').length,
        byArea: countBy(rows, 'area'),
        byState: countBy(rows, 'state'),
        byAction: countBy(rows, 'action'),
        byExtensionGroup: countBy(rows, 'extensionGroup')
    };

    return {
        summary,
        rows
    };
}

function main() {
    const runDir = path.join(artifactsRoot, timestampSlug());
    ensureDir(runDir);
    ensureDir(path.dirname(docsReportPath));

    const report = buildCleanupAudit();
    const markdown = buildMarkdownReport(report);

    fs.writeFileSync(path.join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(runDir, 'report.md'), `${markdown}\n`, 'utf8');
    fs.writeFileSync(docsReportPath, `${markdown}\n`, 'utf8');

    console.log(`Project cleanup audit completed: ${runDir}`);
    console.log(`files=${report.summary.filesScanned} deleteLocal=${report.summary.deleteLocalCandidates} reviewDelete=${report.summary.reviewDeleteCandidates} assetReview=${report.summary.assetReviewCandidates}`);
    console.log(`docsReport=${toPosixPath(path.relative(repoRoot, docsReportPath))}`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error('Project cleanup audit failed.');
        console.error(error.stack || error.message || String(error));
        process.exit(1);
    }
}

module.exports = {
    buildCleanupAudit,
    buildMarkdownReport,
    extractReferences,
    classifyFile
};
