const STOP_ROUTE_TOKENS = new Set([
    'app',
    'and',
    'car',
    'conditions',
    'dubai',
    'html',
    'luxury',
    'page',
    'rental',
    'terms',
    'the',
    'uae'
]);

const GENERIC_LINK_LABELS = new Set([
    'click here',
    'details',
    'discover',
    'explore',
    'learn more',
    'more',
    'open',
    'read more',
    'see more',
    'view',
    'view details'
]);

const RECOVERY_ROUTES = Object.freeze({
    home: '/',
    fleet: '/fleet.html',
    contact: '/contact.html',
    reserve: '/app/reserve/page.html'
});

function normalizeRoute(route = '/') {
    let pathname = String(route || '/').trim();

    try {
        pathname = new URL(pathname, 'https://prestigegoalmotion.com').pathname;
    } catch (error) {
        pathname = pathname.split(/[?#]/)[0] || '/';
    }

    pathname = pathname.split(/[?#]/)[0] || '/';

    if (pathname === '/index.html') {
        return '/';
    }

    if (pathname.length > 1 && pathname.endsWith('/')) {
        return pathname.slice(0, -1);
    }

    return pathname || '/';
}

function normalizeText(value = '') {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(value = '') {
    return normalizeText(value)
        .toLowerCase()
        .replace(/&amp;/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !STOP_ROUTE_TOKENS.has(token));
}

function uniqueValues(values = []) {
    return [...new Set(values.filter(Boolean))];
}

function severityRank(severity = 'low') {
    if (severity === 'high') {
        return 3;
    }

    if (severity === 'medium') {
        return 2;
    }

    return 1;
}

function createNavigationFinding({
    route = '',
    viewport = '',
    severity = 'low',
    category = 'navigation',
    message = '',
    evidence = '',
    recommendation = '',
    hardFail = false,
    screenshotPath = ''
}) {
    return {
        route: normalizeRoute(route || '/'),
        viewport,
        severity,
        category,
        message,
        evidence,
        recommendation,
        hardFail: Boolean(hardFail),
        screenshotPath
    };
}

function isAllowedShortAction(label = '', targetRoute = '') {
    const normalizedLabel = normalizeText(label).toLowerCase();
    const normalizedRoute = normalizeRoute(targetRoute);

    if (['home', 'fleet', 'services', 'locations', 'contact', 'reserve'].includes(normalizedLabel)) {
        return true;
    }

    if (
        ['book', 'reserve', 'rent now', 'check availability'].includes(normalizedLabel) &&
        normalizedRoute === RECOVERY_ROUTES.reserve
    ) {
        return true;
    }

    if (['call', 'email', 'whatsapp'].includes(normalizedLabel)) {
        return true;
    }

    return false;
}

function destinationTokensForRoute(targetRoute = '', destinationHeading = '') {
    const normalizedRoute = normalizeRoute(targetRoute);
    const pathTokens = tokenize(normalizedRoute.replace(/^\//, '').replace(/\.html$/i, '').replace(/\//g, ' '));
    const headingTokens = tokenize(destinationHeading);
    return uniqueValues([...pathTokens, ...headingTokens]);
}

function labelDestinationAlignment({ label = '', targetRoute = '', destinationHeading = '' } = {}) {
    const normalizedLabel = normalizeText(label);
    const labelTokens = tokenize(normalizedLabel);
    const destinationTokens = destinationTokensForRoute(targetRoute, destinationHeading);

    if (isAllowedShortAction(normalizedLabel, targetRoute)) {
        return {
            ok: true,
            overlap: [],
            labelTokens,
            destinationTokens
        };
    }

    if (labelTokens.length === 0 || destinationTokens.length === 0) {
        return {
            ok: false,
            overlap: [],
            labelTokens,
            destinationTokens
        };
    }

    const destinationTokenSet = new Set(destinationTokens);
    const overlap = labelTokens.filter((token) => destinationTokenSet.has(token));
    const ratio = overlap.length / Math.max(labelTokens.length, 1);

    return {
        ok: overlap.length > 0 || ratio >= 0.34,
        overlap: uniqueValues(overlap),
        labelTokens,
        destinationTokens
    };
}

function assessLinkLabel(link = {}, destination = {}) {
    const label = normalizeText(link.accessibleName || link.label || link.text || link.ariaLabel || link.title);
    const visibleText = normalizeText(link.text || link.label);
    const assistiveText = normalizeText([link.ariaLabel, link.title].filter(Boolean).join(' '));
    const targetRoute = normalizeRoute(link.targetRoute || link.href || '/');
    const findings = [];

    if (!label) {
        findings.push({
            severity: 'high',
            category: 'missing_link_name',
            message: 'A navigable internal link has no accessible label.',
            evidence: `href=${link.href || targetRoute}`,
            recommendation: 'Add visible text or an aria-label that names the destination.',
            hardFail: true
        });
        return findings;
    }

    const lowerLabel = label.toLowerCase();
    const hasAssistiveContext = assistiveText.length > visibleText.length + 3;
    const isGeneric = GENERIC_LINK_LABELS.has(lowerLabel);

    if (isGeneric && !hasAssistiveContext && !isAllowedShortAction(label, targetRoute)) {
        findings.push({
            severity: 'medium',
            category: 'ambiguous_link_label',
            message: 'A visible internal link uses a generic label without enough context.',
            evidence: `label="${label}"; target=${targetRoute}`,
            recommendation: 'Name the destination or action directly in the visible label or aria-label.'
        });
    }

    if (link.area !== 'header' && link.area !== 'footer' && link.area !== 'breadcrumb') {
        const alignment = labelDestinationAlignment({
            label,
            targetRoute,
            destinationHeading: destination.heading || ''
        });

        if (
            !alignment.ok &&
            !isGeneric &&
            normalizeRoute(targetRoute) !== normalizeRoute(link.sourceRoute || '')
        ) {
            findings.push({
                severity: 'low',
                category: 'weak_destination_hint',
                message: 'A link label does not clearly echo the destination page.',
                evidence: `label="${label}"; target=${targetRoute}; destination="${destination.heading || 'unknown'}"`,
                recommendation: 'Use clearer copy when this link is part of a customer decision path.'
            });
        }
    }

    return findings;
}

function buildStaticNavigationGraph(routeLinks = []) {
    const graph = new Map();

    for (const entry of routeLinks || []) {
        const route = normalizeRoute(entry.route || '/');
        const outgoingRoutes = uniqueValues((entry.outgoingRoutes || []).map(normalizeRoute)).sort();

        if (!graph.has(route)) {
            graph.set(route, {
                route,
                outgoingRoutes: [],
                incomingRoutes: []
            });
        }

        graph.get(route).outgoingRoutes = uniqueValues([
            ...graph.get(route).outgoingRoutes,
            ...outgoingRoutes
        ]).sort();

        for (const outgoingRoute of outgoingRoutes) {
            if (!graph.has(outgoingRoute)) {
                graph.set(outgoingRoute, {
                    route: outgoingRoute,
                    outgoingRoutes: [],
                    incomingRoutes: []
                });
            }

            graph.get(outgoingRoute).incomingRoutes = uniqueValues([
                ...graph.get(outgoingRoute).incomingRoutes,
                route
            ]).sort();
        }
    }

    return [...graph.values()].sort((left, right) => left.route.localeCompare(right.route));
}

function reachableRoutesFrom(graph = [], startRoute = '/') {
    const byRoute = new Map(graph.map((entry) => [normalizeRoute(entry.route), entry]));
    const start = normalizeRoute(startRoute);
    const visited = new Set();
    const queue = [start];

    while (queue.length > 0) {
        const route = queue.shift();

        if (visited.has(route)) {
            continue;
        }

        visited.add(route);

        for (const outgoingRoute of byRoute.get(route)?.outgoingRoutes || []) {
            if (!visited.has(outgoingRoute)) {
                queue.push(outgoingRoute);
            }
        }
    }

    return [...visited].sort();
}

function buildGraphFindings(graph = [], publicRoutes = []) {
    const routeSet = uniqueValues((publicRoutes.length > 0 ? publicRoutes : graph.map((entry) => entry.route)).map(normalizeRoute));
    const reachable = new Set(reachableRoutesFrom(graph, '/'));
    const findings = [];

    for (const route of routeSet.sort()) {
        const graphEntry = graph.find((entry) => normalizeRoute(entry.route) === route);

        if (route !== '/' && !reachable.has(route)) {
            findings.push(createNavigationFinding({
                route,
                severity: 'medium',
                category: 'unreachable_from_home',
                message: 'This public route is not reachable from the home navigation graph.',
                evidence: 'start=/',
                recommendation: 'Add a clear internal route to this page or document why it is SEO-only.'
            }));
        }

        if (route !== '/' && graphEntry && graphEntry.incomingRoutes.length === 0) {
            findings.push(createNavigationFinding({
                route,
                severity: 'medium',
                category: 'orphan_navigation_route',
                message: 'This public route has no incoming internal links in the static map.',
                evidence: 'incomingRoutes=0',
                recommendation: 'Connect it from a relevant hub, menu, card, breadcrumb, or footer.'
            }));
        }

        if (graphEntry && graphEntry.outgoingRoutes.length === 0) {
            findings.push(createNavigationFinding({
                route,
                severity: 'high',
                category: 'static_dead_end',
                message: 'This public route has no outgoing internal links in the static map.',
                evidence: 'outgoingRoutes=0',
                recommendation: 'Add at least one route back to the main customer journey.',
                hardFail: true
            }));
        }
    }

    return findings;
}

function hasRecoveryRoute(page = {}, key = '') {
    const targetRoute = RECOVERY_ROUTES[key];
    if (!targetRoute) {
        return false;
    }

    return (page.recoveryRoutes || {})[key] ||
        (page.links || []).some((link) => normalizeRoute(link.targetRoute || link.href) === targetRoute);
}

function buildPageFindings(page = {}, destinationsByRoute = {}) {
    const findings = [];
    const route = normalizeRoute(page.route || '/');
    const viewport = page.viewport || '';
    const isMobile = /^mobile/i.test(viewport);
    const navigation = page.navigation || {};
    const handoffs = page.handoffs || [];
    const failedHandoffs = handoffs.filter((handoff) => handoff.status === 'failed');

    if (page.loadStatus && page.loadStatus !== 'ok') {
        findings.push(createNavigationFinding({
            route,
            viewport,
            severity: 'high',
            category: 'route_load_failure',
            message: 'The route did not load cleanly for navigation audit.',
            evidence: page.loadMessage || page.loadStatus,
            recommendation: 'Fix the page load before judging navigation behavior.',
            hardFail: true,
            screenshotPath: page.screenshotPath || ''
        }));
    }

    if (!page.heading?.visible) {
        findings.push(createNavigationFinding({
            route,
            viewport,
            severity: 'high',
            category: 'missing_orientation_heading',
            message: 'The page does not expose a visible H1 after navigation.',
            evidence: `title="${page.title || ''}"`,
            recommendation: 'Provide a visible page heading so users know where they landed.',
            hardFail: true,
            screenshotPath: page.screenshotPath || ''
        }));
    }

    if (isMobile) {
        const drawer = navigation.mobileDrawer || {};

        if (!drawer.toggleFound || !drawer.opened || !drawer.closed) {
            findings.push(createNavigationFinding({
                route,
                viewport,
                severity: 'high',
                category: 'mobile_drawer_blocked',
                message: 'The mobile navigation drawer cannot be opened and closed reliably.',
                evidence: `toggleFound=${Boolean(drawer.toggleFound)}; opened=${Boolean(drawer.opened)}; closed=${Boolean(drawer.closed)}`,
                recommendation: 'Make the hamburger control reachable, announce state with aria-expanded, and support Escape/close.',
                hardFail: true,
                screenshotPath: drawer.screenshotPath || page.screenshotPath || ''
            }));
        } else if (Number(drawer.internalLinkCount || 0) < 3) {
            findings.push(createNavigationFinding({
                route,
                viewport,
                severity: 'medium',
                category: 'thin_mobile_drawer',
                message: 'The mobile drawer opens but exposes too few internal routes.',
                evidence: `internalLinkCount=${drawer.internalLinkCount || 0}`,
                recommendation: 'Include the main hubs and a booking/recovery route in the drawer.'
            }));
        }
    } else if (!navigation.hasHeaderNav) {
        findings.push(createNavigationFinding({
            route,
            viewport,
            severity: 'high',
            category: 'desktop_nav_missing',
            message: 'The desktop page does not expose a visible main navigation.',
            evidence: 'hasHeaderNav=false',
            recommendation: 'Keep the primary header navigation available on desktop.',
            hardFail: true,
            screenshotPath: page.screenshotPath || ''
        }));
    }

    for (const menu of navigation.megaMenus || []) {
        if (!menu.opened || Number(menu.internalLinkCount || 0) < 1) {
            findings.push(createNavigationFinding({
                route,
                viewport,
                severity: 'high',
                category: 'desktop_menu_blocked',
                message: 'A desktop menu trigger does not expose usable destination links.',
                evidence: `label="${menu.label || ''}"; opened=${Boolean(menu.opened)}; internalLinkCount=${menu.internalLinkCount || 0}`,
                recommendation: 'Keep menu panels keyboard/click reachable and populated with internal destinations.',
                hardFail: true,
                screenshotPath: menu.screenshotPath || page.screenshotPath || ''
            }));
        }
    }

    if (!hasRecoveryRoute(page, 'home')) {
        findings.push(createNavigationFinding({
            route,
            viewport,
            severity: 'high',
            category: 'no_home_recovery',
            message: 'The page has no clear route back to Home.',
            evidence: 'home=false',
            recommendation: 'Expose Home through header, drawer, breadcrumb, logo, or footer.',
            hardFail: true
        }));
    }

    if (!hasRecoveryRoute(page, 'contact') && !hasRecoveryRoute(page, 'reserve')) {
        findings.push(createNavigationFinding({
            route,
            viewport,
            severity: 'medium',
            category: 'no_conversion_recovery',
            message: 'The page has no obvious route to contact or reserve.',
            evidence: 'contact=false; reserve=false',
            recommendation: 'Keep at least one customer support or booking route reachable.'
        }));
    }

    if (Number(navigation.visibleInternalLinkCount || 0) < 2) {
        findings.push(createNavigationFinding({
            route,
            viewport,
            severity: 'high',
            category: 'trapped_route',
            message: 'The page exposes fewer than two visible internal navigation choices.',
            evidence: `visibleInternalLinkCount=${navigation.visibleInternalLinkCount || 0}`,
            recommendation: 'Add visible recovery/navigation links so users are not trapped.',
            hardFail: true
        }));
    }

    for (const failed of failedHandoffs) {
        findings.push(createNavigationFinding({
            route,
            viewport,
            severity: 'high',
            category: 'nav_handoff_failure',
            message: 'A navigation click did not land on the expected usable page.',
            evidence: `${failed.label || 'link'} -> ${failed.targetRoute || 'unknown'}; ${failed.message || ''}`,
            recommendation: 'Fix the link target, click handler, or destination page.',
            hardFail: true,
            screenshotPath: failed.screenshotPath || ''
        }));
    }

    for (const link of page.links || []) {
        const targetRoute = normalizeRoute(link.targetRoute || link.href);
        const linkFindings = assessLinkLabel(link, destinationsByRoute[targetRoute] || {});

        for (const finding of linkFindings) {
            findings.push(createNavigationFinding({
                route,
                viewport,
                ...finding
            }));
        }
    }

    for (const entry of page.consoleErrors || []) {
        findings.push(createNavigationFinding({
            route,
            viewport,
            severity: 'medium',
            category: 'console_error',
            message: 'The route logged a console error during navigation audit.',
            evidence: String(entry).slice(0, 240),
            recommendation: 'Investigate JavaScript errors because they can silently break menus and handoffs.'
        }));
    }

    return findings.sort((left, right) => (
        severityRank(right.severity) - severityRank(left.severity) ||
        left.category.localeCompare(right.category)
    ));
}

function summarizeNavigationFindings(findings = []) {
    const bySeverity = {
        high: findings.filter((finding) => finding.severity === 'high').length,
        medium: findings.filter((finding) => finding.severity === 'medium').length,
        low: findings.filter((finding) => finding.severity === 'low').length
    };
    const byCategory = {};

    for (const finding of findings) {
        byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
    }

    return {
        total: findings.length,
        hardFails: findings.filter((finding) => finding.hardFail).length,
        bySeverity,
        byCategory
    };
}

function buildNavigationReview({ pages = [], graph = [], publicRoutes = [], destinationsByRoute = {} } = {}) {
    const pageFindings = pages.flatMap((page) => buildPageFindings(page, destinationsByRoute));
    const graphFindings = buildGraphFindings(graph, publicRoutes);
    const findings = [...pageFindings, ...graphFindings].sort((left, right) => (
        severityRank(right.severity) - severityRank(left.severity) ||
        left.route.localeCompare(right.route) ||
        left.category.localeCompare(right.category)
    ));
    const summary = summarizeNavigationFindings(findings);
    const reviewGates = [];

    if (summary.hardFails > 0) {
        reviewGates.push('hard_navigation_failures');
    }

    if ((summary.byCategory.nav_handoff_failure || 0) > 0) {
        reviewGates.push('handoff_failures');
    }

    if ((summary.byCategory.mobile_drawer_blocked || 0) > 0) {
        reviewGates.push('mobile_drawer_blocked');
    }

    if ((summary.byCategory.unreachable_from_home || 0) > 0 || (summary.byCategory.orphan_navigation_route || 0) > 0) {
        reviewGates.push('route_reachability_gap');
    }

    const status = summary.hardFails > 0 || summary.bySeverity.high > 0
        ? 'bad'
        : summary.bySeverity.medium > 0
            ? 'review'
            : 'good';

    return {
        status,
        summary,
        reviewGates,
        findings
    };
}

function evaluateNavigationGate(summary = {}, strict = false) {
    if (!strict) {
        return {
            shouldFail: false,
            reasons: []
        };
    }

    const reasons = [];
    const byCategory = summary.byCategory || {};

    if (Number(summary.hardFails || 0) > 0) {
        reasons.push(`hardFails=${summary.hardFails}`);
    }

    if (Number(summary.bySeverity?.high || 0) > 0) {
        reasons.push(`high=${summary.bySeverity.high}`);
    }

    for (const category of ['nav_handoff_failure', 'mobile_drawer_blocked', 'desktop_menu_blocked', 'trapped_route', 'route_load_failure']) {
        if (Number(byCategory[category] || 0) > 0) {
            reasons.push(`${category}=${byCategory[category]}`);
        }
    }

    return {
        shouldFail: reasons.length > 0,
        reasons
    };
}

function buildNavigationReviewMarkdownSection(review) {
    if (!review) {
        return ['## Human Navigation Review', '', '- Not available'];
    }

    const lines = [
        '## Human Navigation Review',
        '',
        `- status: ${review.status}`,
        `- findings: ${review.summary.total} (high=${review.summary.bySeverity.high}, medium=${review.summary.bySeverity.medium}, low=${review.summary.bySeverity.low})`,
        `- hard fails: ${review.summary.hardFails}`,
        `- gates: ${review.reviewGates.join(', ') || 'none'}`
    ];

    if (review.findings.length === 0) {
        lines.push('- findings detail: none');
        return lines;
    }

    lines.push('', '### Findings');

    for (const finding of review.findings.slice(0, 50)) {
        lines.push(`- [${finding.severity}] ${finding.route}${finding.viewport ? ` (${finding.viewport})` : ''} ${finding.category}: ${finding.message}`);
        if (finding.evidence) {
            lines.push(`  evidence: ${finding.evidence}`);
        }
        if (finding.recommendation) {
            lines.push(`  recommendation: ${finding.recommendation}`);
        }
        if (finding.screenshotPath) {
            lines.push(`  screenshot: ${finding.screenshotPath}`);
        }
    }

    return lines;
}

module.exports = {
    GENERIC_LINK_LABELS,
    RECOVERY_ROUTES,
    assessLinkLabel,
    buildGraphFindings,
    buildNavigationReview,
    buildNavigationReviewMarkdownSection,
    buildPageFindings,
    buildStaticNavigationGraph,
    createNavigationFinding,
    destinationTokensForRoute,
    evaluateNavigationGate,
    labelDestinationAlignment,
    normalizeRoute,
    normalizeText,
    reachableRoutesFrom,
    severityRank,
    summarizeNavigationFindings,
    tokenize
};
