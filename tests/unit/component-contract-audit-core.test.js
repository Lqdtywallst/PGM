const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildComponentContractAudit,
    collectKnownClassFamilies,
    extractClassTokens,
    findPagePatternMarkers,
    findRawHexColorsInCss,
    isBrandTokensPath
} = require('../../server/component-contract-audit-core');

test('raw hex colors are detected in CSS outside brand tokens', () => {
    const findings = findRawHexColorsInCss({
        filePath: 'site/css/example.css',
        css: `
            .hero { color: #fff; }
            .card { border-color: #1a2b3c; }
            /* .ignored { color: #000; } */
        `
    });

    assert.equal(findings.length, 2);
    assert.deepEqual(findings.map((finding) => finding.value), ['#fff', '#1a2b3c']);
    assert.equal(findings[0].severity, 'low');
    assert.equal(findings[0].type, 'raw_hex_color');
});

test('brand-tokens.css is exempt from raw hex color findings', () => {
    assert.equal(isBrandTokensPath('site/css/brand-tokens.css'), true);
    assert.deepEqual(findRawHexColorsInCss({
        filePath: 'site/css/brand-tokens.css',
        css: ':root { --gold: #d6f03c; }'
    }), []);
});

test('class extraction reads HTML class attributes and CSS selectors', () => {
    const htmlTokens = extractClassTokens('<a class="btn btn-primary fleet-card__primary">Book</a>', 'html')
        .map((token) => token.className);
    const cssTokens = extractClassTokens('.btn-primary:hover, .fleet-card__secondary { color: var(--gold); }', 'css')
        .map((token) => token.className);

    assert.deepEqual(htmlTokens, ['btn', 'btn-primary', 'fleet-card__primary']);
    assert.deepEqual(cssTokens, ['btn-primary', 'fleet-card__secondary']);
});

test('known button and card classes are grouped by family', () => {
    const inventory = collectKnownClassFamilies([
        {
            filePath: 'site/fleet.html',
            type: 'html',
            content: '<article class="fleet-card"><a class="fleet-card__primary btn-primary">View</a></article>'
        },
        {
            filePath: 'site/css/fleet.css',
            type: 'css',
            content: '.fleet-card__secondary { display: flex; }'
        }
    ], {
        global: ['btn-primary'],
        fleet: ['fleet-card__primary', 'fleet-card__secondary', 'fleet-card']
    });

    assert.equal(inventory.byFamily.global.count, 1);
    assert.equal(inventory.byFamily.fleet.count, 3);
    assert.deepEqual(inventory.byFamily.fleet.classes, [
        'fleet-card',
        'fleet-card__primary',
        'fleet-card__secondary'
    ]);
});

test('page pattern markers report explicit data markers and body page classes', () => {
    const result = findPagePatternMarkers({
        filePath: 'site/contact.html',
        html: '<body class="contact-page premium-shell" data-page-pattern="contact"><main></main></body>'
    });

    assert.equal(result.present, true);
    assert.deepEqual(result.markers.map((marker) => marker.attribute), [
        'data-page-pattern',
        'body.class'
    ]);
    assert.deepEqual(result.markers.map((marker) => marker.value), [
        'contact',
        'contact-page'
    ]);
});

test('component contract audit builds an advisory report from string fixtures', () => {
    const report = buildComponentContractAudit([
        {
            filePath: 'site/index.html',
            type: 'html',
            content: '<body class="home-page"><a class="btn btn-primary">Reserve</a><article class="guide-card"></article></body>'
        },
        {
            filePath: 'site/css/site.css',
            type: 'css',
            content: '.btn-primary { color: #fff; } .guide-card { border-color: var(--gold); }'
        },
        {
            filePath: 'site/css/brand-tokens.css',
            type: 'css',
            content: ':root { --gold: #d6f03c; }'
        }
    ]);

    assert.equal(report.mode, 'advisory');
    assert.equal(report.summary.files, 3);
    assert.equal(report.summary.htmlFiles, 1);
    assert.equal(report.summary.cssFiles, 2);
    assert.equal(report.summary.total, 1);
    assert.equal(report.summary.byType.raw_hex_color, 1);
    assert.equal(report.summary.buttonFamilies, 1);
    assert.equal(report.summary.cardFamilies, 1);
    assert.equal(report.summary.pagesWithPatternMarkers, 1);
});
