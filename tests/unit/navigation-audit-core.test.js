const test = require('node:test');
const assert = require('node:assert/strict');

const {
    assessLinkLabel,
    buildNavigationReview,
    buildStaticNavigationGraph,
    evaluateNavigationGate,
    labelDestinationAlignment,
    normalizeRoute,
    reachableRoutesFrom
} = require('../../server/navigation-audit-core');
const {
    DEFAULT_ROUTES,
    DEFAULT_VIEWPORTS,
    buildClickCandidates,
    buildRenderedRouteLinks,
    parseArgs,
    resolveReferenceToPublicRoute,
    resolveSelectedRoutes
} = require('../../scripts/run-navigation-agent');

test('navigation agent args support scoped routes, viewports, strict mode and click caps', () => {
    const args = parseArgs([
        '--route', '/index.html',
        '--viewport', 'mobile-modern',
        '--base-url', 'http://127.0.0.1:9999',
        '--output-dir', 'artifacts/navigation-custom',
        '--scope', 'critical',
        '--max-clicks-per-page', '2',
        '--strict'
    ]);

    assert.deepEqual(args.routes, ['/']);
    assert.deepEqual(args.viewports, ['mobile-modern']);
    assert.equal(args.baseUrl, 'http://127.0.0.1:9999');
    assert.equal(args.outputDir, 'artifacts/navigation-custom');
    assert.equal(args.scope, 'critical');
    assert.equal(args.maxClicksPerPage, 2);
    assert.equal(args.strict, true);
});

test('navigation route selection defaults to all public and can use critical scope', () => {
    const allRoutes = resolveSelectedRoutes({ scope: 'all-public', routes: [] });
    const criticalRoutes = resolveSelectedRoutes({ scope: 'critical', routes: [] });
    const crawlRoutes = resolveSelectedRoutes({ scope: 'crawl', routes: [] });

    assert.ok(allRoutes.includes('/'));
    assert.ok(allRoutes.includes('/lamborghini-rental-dubai.html'));
    assert.deepEqual(criticalRoutes, DEFAULT_ROUTES);
    assert.deepEqual(crawlRoutes, ['/']);
    assert.deepEqual(DEFAULT_VIEWPORTS, ['mobile-modern', 'laptop']);
});

test('deep navigation args switch to crawl scope and exhaustive page clicks by default', () => {
    const args = parseArgs(['--deep']);

    assert.equal(args.deep, true);
    assert.equal(args.scope, 'crawl');
    assert.equal(args.maxClicksPerPage, Number.MAX_SAFE_INTEGER);
    assert.equal(args.maxCrawlDepth, 6);
});

test('resolveReferenceToPublicRoute keeps only known internal routes', () => {
    assert.equal(resolveReferenceToPublicRoute('/services.html', './contact.html'), '/contact.html');
    assert.equal(resolveReferenceToPublicRoute('/services.html', 'https://example.com/fleet.html'), '');
    assert.equal(resolveReferenceToPublicRoute('/services.html', '/missing.html'), '');
});

test('link label assessment flags unnamed and generic internal links', () => {
    const unnamed = assessLinkLabel({
        href: '/fleet.html',
        targetRoute: '/fleet.html',
        text: '',
        area: 'main'
    });
    const generic = assessLinkLabel({
        href: '/lamborghini-rental-dubai.html',
        targetRoute: '/lamborghini-rental-dubai.html',
        text: 'Learn more',
        area: 'main'
    });
    const reserve = assessLinkLabel({
        href: '/app/reserve/page.html',
        targetRoute: '/app/reserve/page.html',
        text: 'Book',
        area: 'main'
    });

    assert.equal(unnamed[0].category, 'missing_link_name');
    assert.equal(unnamed[0].hardFail, true);
    assert.equal(generic[0].category, 'ambiguous_link_label');
    assert.deepEqual(reserve, []);
});

test('destination alignment accepts clear route labels and rejects vague mismatches', () => {
    const aligned = labelDestinationAlignment({
        label: 'Lamborghini rental',
        targetRoute: '/lamborghini-rental-dubai.html',
        destinationHeading: 'Rent a Lamborghini in Dubai'
    });
    const weak = labelDestinationAlignment({
        label: 'VIP arrival',
        targetRoute: '/fleet.html',
        destinationHeading: 'Luxury car fleet'
    });

    assert.equal(aligned.ok, true);
    assert.ok(aligned.overlap.includes('lamborghini'));
    assert.equal(weak.ok, false);
});

test('destination alignment accepts common customer shortcuts to fleet, reserve and legal routes', () => {
    assert.equal(labelDestinationAlignment({
        label: 'Sports',
        targetRoute: '/fleet.html',
        destinationHeading: 'Curated luxury cars for Dubai stays.'
    }).ok, true);
    assert.equal(labelDestinationAlignment({
        label: 'Book airport delivery',
        targetRoute: '/app/reserve/page.html',
        destinationHeading: 'Complete your reservation.'
    }).ok, true);
    assert.equal(labelDestinationAlignment({
        label: 'Booking T&C',
        targetRoute: '/terms-and-conditions.html',
        destinationHeading: 'Terms and conditions'
    }).ok, true);
});

test('static navigation graph reports reachability from home', () => {
    const graph = buildStaticNavigationGraph([
        { route: '/', outgoingRoutes: ['/fleet.html'] },
        { route: '/fleet.html', outgoingRoutes: ['/contact.html'] },
        { route: '/contact.html', outgoingRoutes: [] },
        { route: '/orphan.html', outgoingRoutes: [] }
    ]);

    assert.deepEqual(reachableRoutesFrom(graph, '/'), ['/', '/contact.html', '/fleet.html']);
});

test('navigation review turns blocked drawers and failed handoffs into hard failures', () => {
    const review = buildNavigationReview({
        publicRoutes: ['/fleet.html'],
        graph: buildStaticNavigationGraph([
            { route: '/', outgoingRoutes: ['/fleet.html'] },
            { route: '/fleet.html', outgoingRoutes: ['/'] }
        ]),
        destinationsByRoute: {
            '/': { heading: 'Home' },
            '/fleet.html': { heading: 'Fleet' }
        },
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                loadStatus: 'ok',
                title: 'Fleet',
                heading: { text: 'Fleet', visible: true },
                navigation: {
                    visibleInternalLinkCount: 3,
                    mobileDrawer: {
                        toggleFound: true,
                        opened: false,
                        closed: false,
                        internalLinkCount: 0
                    }
                },
                recoveryRoutes: { home: true, fleet: true, contact: true, reserve: true },
                links: [
                    { sourceRoute: '/fleet.html', targetRoute: '/', text: 'Home', area: 'mobile-drawer' }
                ],
                handoffs: [
                    {
                        label: 'Home',
                        targetRoute: '/',
                        status: 'failed',
                        message: 'Stayed on fleet'
                    }
                ],
                consoleErrors: []
            }
        ]
    });

    assert.equal(review.status, 'bad');
    assert.ok(review.reviewGates.includes('hard_navigation_failures'));
    assert.ok(review.reviewGates.includes('handoff_failures'));
    assert.ok(review.reviewGates.includes('mobile_drawer_blocked'));
    assert.ok(review.summary.hardFails >= 2);
});

test('strict navigation gate fails only when strict mode is enabled', () => {
    const summary = {
        hardFails: 1,
        bySeverity: { high: 1, medium: 0, low: 0 },
        byCategory: { nav_handoff_failure: 1 }
    };

    assert.deepEqual(evaluateNavigationGate(summary, false), {
        shouldFail: false,
        reasons: []
    });

    assert.deepEqual(evaluateNavigationGate(summary, true), {
        shouldFail: true,
        reasons: [
            'hardFails=1',
            'high=1',
            'nav_handoff_failure=1'
        ]
    });
});

test('click candidate selection prioritizes recovery and drawer/header links', () => {
    const candidates = buildClickCandidates({
        route: '/fleet.html',
        links: [
            { targetRoute: '/services.html', text: 'Services', area: 'footer' },
            { targetRoute: '/', text: 'Home', area: 'mobile-drawer', setupKind: 'mobile-drawer' },
            { targetRoute: '/contact.html', text: 'Contact', area: 'main' },
            { targetRoute: '/fleet.html', text: 'Fleet', area: 'header' }
        ]
    }, 2);

    assert.deepEqual(candidates.map((candidate) => candidate.targetRoute), ['/', '/contact.html']);
});

test('click candidate selection includes route-backed buttons', () => {
    const candidates = buildClickCandidates({
        route: '/services.html',
        links: [
            { kind: 'button', targetRoute: '/fleet.html', text: 'Open fleet', area: 'main' },
            { kind: 'link', targetRoute: '/contact.html', text: 'Contact', area: 'footer' }
        ]
    }, Number.MAX_SAFE_INTEGER);

    assert.deepEqual(candidates.map((candidate) => `${candidate.kind}:${candidate.targetRoute}`).sort(), [
        'button:/fleet.html',
        'link:/contact.html'
    ]);
});

test('rendered route graph groups links discovered across viewports', () => {
    const routeLinks = buildRenderedRouteLinks([
        {
            route: '/',
            links: [
                { targetRoute: '/fleet.html' },
                { targetRoute: '/contact.html' }
            ]
        },
        {
            route: '/',
            links: [
                { targetRoute: '/fleet.html' },
                { targetRoute: '/services.html' }
            ]
        }
    ]);

    assert.deepEqual(routeLinks, [
        {
            route: '/',
            outgoingRoutes: ['/contact.html', '/fleet.html', '/services.html']
        }
    ]);
});

test('normalizeRoute treats index as home', () => {
    assert.equal(normalizeRoute('/index.html?utm=test'), '/');
});
