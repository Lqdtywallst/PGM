const test = require('node:test');
const assert = require('node:assert/strict');

const {
    assessLinkLabel,
    buildNavigationReview,
    buildRouteViewportCoverage,
    buildStaticNavigationGraph,
    evaluateNavigationGate,
    labelDestinationAlignment,
    normalizeRoute,
    reachableRoutesFrom
} = require('../../server/navigation-audit-core');
const {
    DEFAULT_ROUTES,
    DEFAULT_VIEWPORTS,
    FULL_NAVIGATION_VIEWPORTS,
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
        '--handoff-concurrency', '7',
        '--click-targets', 'route-edges',
        '--strict'
    ]);

    assert.deepEqual(args.routes, ['/']);
    assert.deepEqual(args.viewports, ['mobile-modern']);
    assert.equal(args.baseUrl, 'http://127.0.0.1:9999');
    assert.equal(args.outputDir, 'artifacts/navigation-custom');
    assert.equal(args.scope, 'critical');
    assert.equal(args.maxClicksPerPage, 2);
    assert.equal(args.handoffConcurrency, 7);
    assert.equal(args.clickTargets, 'route-edges');
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
    assert.equal(args.handoffConcurrency, 4);
    assert.equal(args.clickTargets, 'all-actions');
});

test('full navigation args enforce crawl, strict gate and broad viewport coverage', () => {
    const args = parseArgs(['--full']);

    assert.equal(args.deep, true);
    assert.equal(args.full, true);
    assert.equal(args.strict, true);
    assert.equal(args.scope, 'crawl');
    assert.deepEqual(args.viewports, FULL_NAVIGATION_VIEWPORTS);
    assert.equal(args.maxClicksPerPage, Number.MAX_SAFE_INTEGER);
    assert.equal(args.maxCrawlDepth, 10);
    assert.equal(args.handoffConcurrency, 6);
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

test('navigation review treats tablet portrait as compact drawer navigation', () => {
    const review = buildNavigationReview({
        publicRoutes: ['/'],
        graph: buildStaticNavigationGraph([
            { route: '/', outgoingRoutes: ['/fleet.html', '/contact.html', '/app/reserve/page.html'] },
            { route: '/fleet.html', outgoingRoutes: ['/'] },
            { route: '/contact.html', outgoingRoutes: ['/'] },
            { route: '/app/reserve/page.html', outgoingRoutes: ['/'] }
        ]),
        pages: [
            {
                route: '/',
                viewport: 'tablet-portrait',
                loadStatus: 'ok',
                title: 'Home',
                heading: { text: 'Home', visible: true },
                navigation: {
                    hasHeaderNav: false,
                    visibleInternalLinkCount: 4,
                    mobileDrawer: {
                        toggleFound: true,
                        opened: true,
                        closed: true,
                        internalLinkCount: 4
                    },
                    megaMenus: []
                },
                recoveryRoutes: { home: true, fleet: true, contact: true, reserve: true },
                links: [
                    { sourceRoute: '/', targetRoute: '/fleet.html', text: 'Fleet', area: 'mobile-drawer' },
                    { sourceRoute: '/', targetRoute: '/contact.html', text: 'Contact', area: 'mobile-drawer' },
                    { sourceRoute: '/', targetRoute: '/app/reserve/page.html', text: 'Reserve', area: 'mobile-drawer' }
                ],
                handoffs: [],
                consoleErrors: []
            }
        ]
    });

    assert.equal(review.summary.byCategory.desktop_nav_missing || 0, 0);
    assert.equal(review.summary.byCategory.mobile_drawer_blocked || 0, 0);
});

test('navigation review treats missing route viewport coverage as a hard failure', () => {
    const coverageProfile = buildRouteViewportCoverage({
        publicRoutes: ['/', '/fleet.html'],
        viewports: ['mobile-modern', 'laptop'],
        pages: [
            { route: '/', viewport: 'mobile-modern' },
            { route: '/', viewport: 'laptop' },
            { route: '/fleet.html', viewport: 'mobile-modern' }
        ]
    });
    const review = buildNavigationReview({
        publicRoutes: ['/', '/fleet.html'],
        graph: buildStaticNavigationGraph([
            { route: '/', outgoingRoutes: ['/fleet.html'] },
            { route: '/fleet.html', outgoingRoutes: ['/'] }
        ]),
        pages: [],
        coverageProfile
    });

    assert.equal(coverageProfile.complete, false);
    assert.deepEqual(coverageProfile.missingRouteViewports, [
        { route: '/fleet.html', viewport: 'laptop' }
    ]);
    assert.equal(review.status, 'bad');
    assert.ok(review.reviewGates.includes('navigation_coverage_gap'));
    assert.equal(review.summary.byCategory.navigation_coverage_gap, 1);
});

test('navigation review fails in-page traps such as filter sheets without an obvious exit', () => {
    const review = buildNavigationReview({
        publicRoutes: ['/fleet.html'],
        graph: buildStaticNavigationGraph([
            { route: '/', outgoingRoutes: ['/fleet.html'] },
            { route: '/fleet.html', outgoingRoutes: ['/'] }
        ]),
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                loadStatus: 'ok',
                title: 'Fleet',
                heading: { text: 'Fleet', visible: true },
                navigation: {
                    visibleInternalLinkCount: 4,
                    mobileDrawer: {
                        toggleFound: true,
                        opened: true,
                        closed: true,
                        internalLinkCount: 4
                    },
                    localEscapes: [
                        {
                            id: 'fleet-filter-sheet',
                            label: 'Fleet mobile filter sheet',
                            status: 'failed',
                            message: 'no obvious return action'
                        }
                    ]
                },
                recoveryRoutes: { home: true, fleet: true, contact: true, reserve: true },
                links: [
                    { sourceRoute: '/fleet.html', targetRoute: '/', text: 'Home', area: 'mobile-drawer' },
                    { sourceRoute: '/fleet.html', targetRoute: '/contact.html', text: 'Contact', area: 'mobile-drawer' },
                    { sourceRoute: '/fleet.html', targetRoute: '/app/reserve/page.html', text: 'Reserve', area: 'mobile-drawer' }
                ],
                handoffs: [],
                consoleErrors: []
            }
        ]
    });

    assert.equal(review.status, 'bad');
    assert.ok(review.reviewGates.includes('local_navigation_trap'));
    assert.equal(review.summary.byCategory.local_navigation_trap, 1);
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

test('route-edge click mode dedupes repeated labels to one target per route edge', () => {
    const candidates = buildClickCandidates({
        route: '/services.html',
        links: [
            { kind: 'link', targetRoute: '/fleet.html', text: 'Sports', area: 'main' },
            { kind: 'link', targetRoute: '/fleet.html', text: 'Supercars', area: 'main' },
            { kind: 'link', targetRoute: '/fleet.html', text: 'Fleet', area: 'footer' }
        ]
    }, Number.MAX_SAFE_INTEGER, 'route-edges');

    assert.deepEqual(candidates.map((candidate) => `${candidate.area}:${candidate.targetRoute}`), [
        'footer:/fleet.html'
    ]);
});

test('route-surface click mode keeps one target per rendered surface', () => {
    const candidates = buildClickCandidates({
        route: '/services.html',
        links: [
            { kind: 'link', targetRoute: '/fleet.html', text: 'Sports', area: 'main' },
            { kind: 'link', targetRoute: '/fleet.html', text: 'Supercars', area: 'main' },
            { kind: 'link', targetRoute: '/fleet.html', text: 'Fleet', area: 'footer' }
        ]
    }, Number.MAX_SAFE_INTEGER, 'route-surfaces');

    assert.deepEqual(candidates.map((candidate) => `${candidate.area}:${candidate.targetRoute}`), [
        'footer:/fleet.html',
        'main:/fleet.html'
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
