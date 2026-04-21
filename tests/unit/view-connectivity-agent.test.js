const test = require('node:test');
const assert = require('node:assert/strict');

const {
    determineRouteFormatStatus,
    evaluateAuditGate,
    extractPublicRouteLinks,
    inferVisualIntentFromSource,
    parseArgs,
    resolveReferenceToPublicRoute,
    summarizeAudit
} = require('../../scripts/run-view-connectivity-audit');

test('parseArgs reads base URL, viewport, output directory, and skip flag', () => {
    const args = parseArgs([
        '--base-url', 'http://127.0.0.1:9999',
        '--viewport', 'laptop',
        '--output-dir', 'artifacts/custom',
        '--skip-visual',
        '--strict'
    ]);

    assert.equal(args.baseUrl, 'http://127.0.0.1:9999');
    assert.equal(args.viewport, 'laptop');
    assert.equal(args.outputDir, 'artifacts/custom');
    assert.equal(args.skipVisual, true);
    assert.equal(args.strict, true);
});

test('resolveReferenceToPublicRoute normalizes public links and flags missing html routes', () => {
    assert.deepEqual(resolveReferenceToPublicRoute('/services.html', './contact.html'), {
        route: '/contact.html',
        broken: false
    });

    assert.deepEqual(resolveReferenceToPublicRoute('/services.html', '/missing-landing.html'), {
        route: '/missing-landing.html',
        broken: true
    });
});

test('extractPublicRouteLinks keeps public routes and broken html destinations separate', () => {
    const html = `
        <a href="./contact.html">Contact</a>
        <a href="/fleet.html">Fleet</a>
        <a href="/ghost-page.html">Ghost</a>
        <a href="https://example.com">External</a>
    `;

    const links = extractPublicRouteLinks('/services.html', html);

    assert.deepEqual(links.outgoingRoutes, ['/contact.html', '/fleet.html']);
    assert.deepEqual(links.brokenRoutes, ['/ghost-page.html']);
});

test('inferVisualIntentFromSource detects legacy orbitron shells and modern service detail shells', () => {
    const legacyHtml = `
        <link rel="stylesheet" href="./css/hub-pages.css">
        <div class="site-header"></div>
        <style>body { font-family: Orbitron; }</style>
    `;
    const darkServiceHtml = `
        <link rel="stylesheet" href="./css/site-v2.css">
        <link rel="stylesheet" href="./css/site-v2-service-detail.css">
        <section class="service-detail-hero"></section>
    `;

    assert.equal(inferVisualIntentFromSource(legacyHtml), 'legacy_dark_neon');
    assert.equal(inferVisualIntentFromSource(darkServiceHtml), 'modern_light_system');
});

test('determineRouteFormatStatus approves expected intents and flags legacy shells', () => {
    const approved = determineRouteFormatStatus({
        route: '/contact.html',
        cohort: 'contact',
        visualIntent: 'modern_light_system',
        templateFamily: 'contact_form',
        headingFontFamily: 'manrope'
    });
    const legacy = determineRouteFormatStatus({
        route: '/lamborghini-rental-dubai.html',
        cohort: 'brand_landing',
        visualIntent: 'legacy_dark_neon',
        templateFamily: 'legacy_brand_catalog',
        headingFontFamily: 'orbitron'
    });
    const review = determineRouteFormatStatus({
        route: '/about.html',
        cohort: 'hub_marketing',
        visualIntent: 'modern_light_system',
        templateFamily: 'about_hero',
        headingFontFamily: 'cormorant garamond'
    });
    const darkLightCohort = determineRouteFormatStatus({
        route: '/airport-concierge-dubai.html',
        cohort: 'service_landing',
        visualIntent: 'modern_dark_system',
        templateFamily: 'service_detail',
        headingFontFamily: 'cormorant garamond'
    });

    assert.equal(approved.status, 'approved');
    assert.equal(legacy.status, 'legacy');
    assert.equal(review.status, 'review');
    assert.equal(darkLightCohort.status, 'legacy');
});

test('summarizeAudit aggregates route status and finding counts', () => {
    const summary = summarizeAudit([
        {
            formatStatus: 'approved',
            findings: [{ severity: 'high', type: 'legacy_connection' }]
        },
        {
            formatStatus: 'legacy',
            findings: [{ severity: 'high', type: 'legacy_route' }]
        },
        {
            formatStatus: 'review',
            findings: [{ severity: 'medium', type: 'orphan_route' }]
        }
    ]);

    assert.equal(summary.totalRoutes, 3);
    assert.equal(summary.approvedRoutes, 1);
    assert.equal(summary.legacyRoutes, 1);
    assert.equal(summary.reviewRoutes, 1);
    assert.equal(summary.legacyConnections, 1);
    assert.equal(summary.orphanRoutes, 1);
    assert.equal(summary.bySeverity.high, 2);
    assert.equal(summary.bySeverity.medium, 1);
});

test('evaluateAuditGate stays green by default and fails in strict mode when issues remain', () => {
    const cleanSummary = {
        legacyRoutes: 0,
        reviewRoutes: 0,
        legacyConnections: 0,
        brokenPublicLinks: 0
    };
    const failingSummary = {
        legacyRoutes: 2,
        reviewRoutes: 1,
        legacyConnections: 3,
        brokenPublicLinks: 0
    };

    assert.deepEqual(evaluateAuditGate(cleanSummary, false), {
        shouldFail: false,
        reasons: []
    });

    assert.deepEqual(evaluateAuditGate(cleanSummary, true), {
        shouldFail: false,
        reasons: []
    });

    assert.deepEqual(evaluateAuditGate(failingSummary, true), {
        shouldFail: true,
        reasons: [
            'legacyRoutes=2',
            'reviewRoutes=1',
            'legacyConnections=3'
        ]
    });
});
