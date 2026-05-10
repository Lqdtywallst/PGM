const fs = require('fs');
const path = require('path');
const {
    countMatches,
    extractTagValue,
    fetchUrl,
    parseSitemapPaths,
    siteFileForPath,
    startStaticServer: launchStaticServer,
    stopProcess
} = require('../shared/site-audit-utils');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');
const auditPort = Number(process.env.AUDIT_STATIC_PORT || (8200 + Math.floor(Math.random() * 200)));
const auditBaseUrl = `http://127.0.0.1:${auditPort}`;

const forbiddenRootEntries = [
    'app.lnk',
    'filter_review_focus.png',
    'analytics-http.err.log',
    'analytics-http.out.log',
    'server-http.err.log',
    'server-http.out.log',
    'services-redesign-http.err.log',
    'services-redesign-http.out.log',
    'temp',
    'test-results'
];

const forbiddenPublicEntries = [
    'site/fleet-card-preview.html',
    'site/font-preview-options.html',
    'site/hero-lab.html',
    'site/hero-lab-layout.svg',
    'site/vehicle-template-base.html',
    'site/vehicle-template-premium.html',
    'site/css/fleet-card-preview.css',
    'site/css/hero-lab.css',
    'site/css/home.css',
    'site/css/home',
    'site/js/hero-lab.js',
    'site/js/home.js',
    'site/js/home-booking.js',
    'site/js/site-v2-3d.js',
    'site/vendor/three',
    'site/media/models',
    'site/brands',
    'site/icons/favicon.ico'
];

const archivedEntries = [
    'docs/previews/fleet-card-preview.html',
    'docs/previews/fleet-card-preview.css',
    'docs/previews/vehicle-template-base.html',
    'docs/previews/vehicle-template-premium.html',
    'docs/archive/README.md'
];

const publicAuditPaths = [
    '/',
    '/locations.html',
    '/services.html',
    '/contact.html',
    '/app/reserve/page.html'
];

const requiredSecurityHeaders = {
    'content-security-policy': (value) => typeof value === 'string' && value.includes("default-src 'self'"),
    'referrer-policy': (value) => value === 'strict-origin-when-cross-origin',
    'permissions-policy': (value) => typeof value === 'string' && value.includes('camera=()'),
    'x-content-type-options': (value) => value === 'nosniff',
    'x-frame-options': (value) => value === 'DENY'
};

function report(ok, message) {
    const prefix = ok ? '[PASS]' : '[FAIL]';
    console.log(`${prefix} ${message}`);
}

function assert(condition, message) {
    report(Boolean(condition), message);
    if (!condition) {
        throw new Error(message);
    }
}

async function startStaticServer() {
    return launchStaticServer({
        projectRoot,
        port: auditPort,
        baseUrl: auditBaseUrl,
        label: 'Audit static server'
    });
}

async function run() {
    console.log('\nRepo structural audit\n');

    forbiddenRootEntries.forEach((relativePath) => {
        assert(
            !fs.existsSync(path.join(projectRoot, relativePath)),
            `${relativePath} is absent from the repo root`
        );
    });

    const outputDir = path.join(projectRoot, 'output');
    if (fs.existsSync(outputDir)) {
        const outputEntries = fs.readdirSync(outputDir).sort();
        assert(
            outputEntries.every((entry) => entry === 'runtime-reservations'),
            'output only contains approved local runtime reservation data'
        );
    } else {
        assert(true, 'output is absent or limited to approved local runtime data');
    }

    forbiddenPublicEntries.forEach((relativePath) => {
        assert(
            !fs.existsSync(path.join(projectRoot, relativePath)),
            `${relativePath} stays outside the public tree`
        );
    });

    archivedEntries.forEach((relativePath) => {
        assert(
            fs.existsSync(path.join(projectRoot, relativePath)),
            `${relativePath} exists in previews/archive`
        );
    });

    const sitemapXml = fs.readFileSync(path.join(siteRoot, 'sitemap.xml'), 'utf8');
    const sitemapPaths = parseSitemapPaths(sitemapXml);
    assert(sitemapPaths.length >= 20, 'sitemap.xml keeps the expected public URL set');

    sitemapPaths.forEach((pathname) => {
        assert(
            !/preview|hero-lab|font-preview|template-base|template-premium/i.test(pathname),
            `${pathname} is not a preview or lab URL`
        );

        const siteFile = siteFileForPath(siteRoot, pathname);
        const html = fs.readFileSync(siteFile, 'utf8');
        const canonical = extractTagValue(
            html,
            /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
        );
        const robots = extractTagValue(
            html,
            /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>/i
        );
        const expectedCanonical =
            pathname === '/'
                ? 'https://prestigegoalmotion.com/'
                : `https://prestigegoalmotion.com${pathname}`;
        const h1Count = countMatches(html, /<h1\b/gi);

        assert(canonical === expectedCanonical, `${pathname} canonical matches the public URL exactly`);
        if (pathname === '/app/reserve/page.html') {
            assert(h1Count <= 1, `${pathname} keeps at most one <h1> in source`);
        } else {
            assert(h1Count === 1, `${pathname} keeps exactly one <h1> in source`);
        }
        assert(!/noindex/i.test(robots), `${pathname} is indexable in source markup`);
    });

    const vercelConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'));
    const headerKeys = new Set(
        (vercelConfig.headers || [])
            .flatMap((entry) => entry.headers || [])
            .map((entry) => entry.key)
    );

    [
        'Content-Security-Policy',
        'Referrer-Policy',
        'Permissions-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options'
    ].forEach((headerKey) => {
        assert(headerKeys.has(headerKey), `vercel.json declares ${headerKey}`);
    });

    const { child, logs } = await startStaticServer();

    try {
        for (const pathname of publicAuditPaths) {
            const response = await fetchUrl(`${auditBaseUrl}${pathname}`);
            assert(response.statusCode === 200, `${pathname} responds with HTTP 200 in the audit server`);

            for (const [headerName, validator] of Object.entries(requiredSecurityHeaders)) {
                assert(
                    validator(response.headers[headerName]),
                    `${pathname} exposes ${headerName}`
                );
            }
        }
    } catch (error) {
        throw new Error(`${error.message}\n${logs()}`);
    } finally {
        stopProcess(child);
    }

    console.log('\nStructural audit complete: all checks passed.\n');
}

run().catch((error) => {
    console.error('\nStructural audit failed.\n');
    console.error(error.message);
    process.exit(1);
});
