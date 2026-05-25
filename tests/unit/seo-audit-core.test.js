const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    assessPage,
    parseJsonLdBlocks
} = require('../../server/audits/seo-audit-core');

function createTempSite() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pgm-seo-audit-'));
    const siteRoot = path.join(root, 'site');
    fs.mkdirSync(siteRoot, { recursive: true });
    fs.writeFileSync(path.join(siteRoot, 'logo.png'), 'fake', 'utf8');
    fs.writeFileSync(path.join(siteRoot, 'index.html'), '<html lang="en"><body><a href="/reservation-lookup.html">Find booking</a></body></html>', 'utf8');
    return { root, siteRoot };
}

function countMap(entries) {
    return new Map(entries);
}

function baseHtml({ route = '/example.html', canonical = `https://www.dynastyprestigecarrental.com${route}` } = {}) {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Luxury Booking Example | Dynasty Prestige</title>
    <meta name="description" content="Securely review premium Dynasty Prestige booking details, handover timing and support steps in Dubai.">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="Luxury Booking Example | Dynasty Prestige">
    <meta property="og:description" content="Securely review premium Dynasty Prestige booking details, handover timing and support steps in Dubai.">
    <meta property="og:image" content="https://www.dynastyprestigecarrental.com/logo.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Luxury Booking Example | Dynasty Prestige">
    <meta name="twitter:description" content="Securely review premium Dynasty Prestige booking details, handover timing and support steps in Dubai.">
    <meta name="twitter:image" content="https://www.dynastyprestigecarrental.com/logo.png">
</head>
<body>
    <h1>Luxury booking example</h1>
    <p>Dubai reservation support with secure handover details, premium guest care and clear next steps.</p>
    <a href="/">Home</a>
</body>
</html>`;
}

test('JSON-LD parser extracts schema types from @graph and arrays', () => {
    const parsed = parseJsonLdBlocks([
        JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
                { '@type': 'Service', name: 'Airport concierge' },
                { '@type': ['Product', 'Vehicle'], name: 'Lamborghini' }
            ]
        })
    ]);

    assert.deepEqual(parsed.errors, []);
    assert.ok(parsed.schemaTypes.includes('Service'));
    assert.ok(parsed.schemaTypes.includes('Product'));
    assert.ok(parsed.schemaTypes.includes('Vehicle'));
});

test('page assessment marks canonical mismatches as hard indexability failures', () => {
    const { siteRoot } = createTempSite();
    const filePath = path.join(siteRoot, 'example.html');
    const html = baseHtml({
        route: '/example.html',
        canonical: 'https://www.dynastyprestigecarrental.com/wrong.html'
    });
    fs.writeFileSync(filePath, html, 'utf8');

    const page = assessPage({
        route: '/example.html',
        filePath,
        html,
        sitemapPaths: ['/example.html'],
        titleCounts: countMap([['Luxury Booking Example | Dynasty Prestige', 1]]),
        descriptionCounts: countMap([['Securely review premium Dynasty Prestige booking details, handover timing and support steps in Dubai.', 1]]),
        incomingLinks: new Map([['/example.html', new Set(['/'])]]),
        siteRoot,
        httpResult: { statusCode: 200 }
    });

    const canonicalFinding = page.findings.find((finding) => finding.message.includes('Canonical URL'));
    assert.equal(canonicalFinding?.category, 'indexability');
    assert.equal(canonicalFinding?.severity, 'critical');
    assert.equal(canonicalFinding?.hardFail, true);
    assert.equal(page.passedGate, false);
});

test('reservation lookup orphan status is an advisory warning, not a hard SEO gate failure', () => {
    const { siteRoot } = createTempSite();
    const route = '/reservation-lookup.html';
    const filePath = path.join(siteRoot, 'reservation-lookup.html');
    const html = baseHtml({ route });
    fs.writeFileSync(filePath, html, 'utf8');

    const page = assessPage({
        route,
        filePath,
        html,
        sitemapPaths: [route, '/'],
        titleCounts: countMap([['Luxury Booking Example | Dynasty Prestige', 1]]),
        descriptionCounts: countMap([['Securely review premium Dynasty Prestige booking details, handover timing and support steps in Dubai.', 1]]),
        incomingLinks: new Map([[route, new Set()]]),
        siteRoot,
        httpResult: { statusCode: 200 }
    });

    const orphanFinding = page.findings.find((finding) => finding.message.includes('Indexable support page'));
    assert.equal(orphanFinding?.severity, 'medium');
    assert.equal(orphanFinding?.hardFail, false);
});
