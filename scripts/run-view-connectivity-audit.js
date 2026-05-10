const fs = require('fs');
const net = require('net');
const path = require('path');

const { chromium } = require('playwright');

const { PUBLIC_PAGE_FILE_MAP } = require('../server/shared/public-page-map');
const { DESIGN_SYSTEM_CONTRACT } = require('../server/design-system/design-system-contract');
const {
    classifyRouteCohort,
    classifyRouteProfile,
    getCohortConfig,
    normalizeRoute
} = require('../server/audits/visual-audit-core');
const { startStaticServer, stopProcess } = require('../server/shared/site-audit-utils');
const { runVisualAgent } = require('./run-visual-agent');

const repoRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(repoRoot, 'site');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'view-connectivity-agent');
const DEFAULT_VIEWPORT = 'desktop-wide';
const SITE_ORIGIN = 'https://prestigegoalmotion.com';
const MODERN_VISUAL_INTENTS = new Set([
    'modern_dark_system',
    'modern_light_system'
]);

const PRIMARY_ROUTES = new Set([
    '/',
    '/fleet.html',
    '/services.html',
    '/locations.html',
    '/about.html',
    '/contact.html',
    '/app/reserve/page.html'
]);

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

async function findAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();

            server.close(() => {
                if (!address || typeof address === 'string') {
                    reject(new Error('Could not resolve a free TCP port.'));
                    return;
                }

                resolve(address.port);
            });
        });
    });
}

function parseArgs(argv) {
    const args = {
        baseUrl: '',
        outputDir: '',
        viewport: DEFAULT_VIEWPORT,
        skipVisual: false,
        strict: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--base-url' && argv[index + 1]) {
            args.baseUrl = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--output-dir' && argv[index + 1]) {
            args.outputDir = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--viewport' && argv[index + 1]) {
            args.viewport = String(argv[index + 1]).trim() || DEFAULT_VIEWPORT;
            index += 1;
            continue;
        }

        if (value === '--skip-visual') {
            args.skipVisual = true;
        }

        if (value === '--strict') {
            args.strict = true;
        }
    }

    return args;
}

function readHtmlForRoute(route) {
    const relativePath = PUBLIC_PAGE_FILE_MAP[route];

    if (!relativePath) {
        throw new Error(`Unknown public route: ${route}`);
    }

    return fs.readFileSync(path.join(siteRoot, relativePath), 'utf8');
}

function extractHrefValues(html) {
    const references = new Set();
    const pattern = /\b(?:href|action)=["']([^"']+)["']/gi;
    let match;

    while ((match = pattern.exec(String(html || ''))) !== null) {
        references.add(match[1].trim());
    }

    return [...references];
}

function isSkippableReference(reference) {
    return (
        !reference ||
        reference === '#' ||
        /^(?:https?:|mailto:|tel:|sms:|javascript:|data:|blob:)/i.test(reference)
    );
}

function normalizeResolvedPath(pathname = '/') {
    const cleanPath = String(pathname || '/').split(/[?#]/)[0] || '/';

    if (cleanPath === '/index.html') {
        return '/';
    }

    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
        return cleanPath.slice(0, -1);
    }

    return cleanPath;
}

function resolveReferenceToPublicRoute(sourceRoute, reference) {
    if (isSkippableReference(reference)) {
        return { route: '', broken: false };
    }

    let resolvedPath = '';

    try {
        resolvedPath = normalizeResolvedPath(new URL(reference, `${SITE_ORIGIN}${sourceRoute}`).pathname);
    } catch (error) {
        return { route: '', broken: false };
    }

    if (PUBLIC_PAGE_FILE_MAP[resolvedPath]) {
        return { route: resolvedPath, broken: false };
    }

    if (/\.html$/i.test(resolvedPath)) {
        return { route: resolvedPath, broken: true };
    }

    return { route: '', broken: false };
}

function extractPublicRouteLinks(route, html) {
    const outgoingRoutes = new Set();
    const brokenRoutes = new Set();

    for (const reference of extractHrefValues(html)) {
        const resolved = resolveReferenceToPublicRoute(route, reference);

        if (resolved.route && !resolved.broken) {
            if (normalizeRoute(resolved.route) !== normalizeRoute(route)) {
                outgoingRoutes.add(resolved.route);
            }
            continue;
        }

        if (resolved.route && resolved.broken) {
            brokenRoutes.add(resolved.route);
        }
    }

    return {
        outgoingRoutes: [...outgoingRoutes].sort(),
        brokenRoutes: [...brokenRoutes].sort()
    };
}

function inferVisualIntentFromSource(html) {
    const source = String(html || '');
    const hasOrbitron = /orbitron/i.test(source);
    const hasLegacyShell = /class=["'][^"']*site-header[^"']*["']/i.test(source) || /hub-pages\.css/i.test(source);
    const hasModernBase = /(?:site-v2|reserve-shell)\.css/i.test(source);
    const hasVehicleOrLandingShell = /(vehicle-pdp-summary-primary|vehicle-booking|local-guide-hero|service-detail-hero|about-hero|services-hero|locations-hero|hero-lab|reserve-container)/i.test(source);
    const hasLegalShell = /(dp-legal-hero|dp-bridge|site-v2-legal\.css)/i.test(source);

    if (hasOrbitron || hasLegacyShell) {
        return 'legacy_dark_neon';
    }

    if (hasModernBase && hasLegalShell) {
        return 'modern_dark_system';
    }

    if (hasModernBase && hasVehicleOrLandingShell) {
        return 'modern_light_system';
    }

    if (hasModernBase) {
        return 'modern_dark_system';
    }

    return 'unknown';
}

function getExpectedVisualIntents(cohort) {
    const expected = DESIGN_SYSTEM_CONTRACT.cohorts?.[cohort]?.visualIntents;
    return Array.isArray(expected) ? expected : [];
}

function determineRouteFormatStatus({ route, cohort, visualIntent = '', templateFamily = '', headingFontFamily = '', sourceVisualIntent = '' }) {
    const expectedVisualIntents = getExpectedVisualIntents(cohort);
    const effectiveIntent = visualIntent || sourceVisualIntent || 'unknown';
    const usesLegacyTemplate = templateFamily === 'legacy_brand_catalog' || /orbitron/i.test(String(headingFontFamily || ''));
    const lightCohortForcedDark =
        expectedVisualIntents.includes('modern_light_system') &&
        effectiveIntent === 'modern_dark_system';

    if (effectiveIntent === 'legacy_dark_neon' || usesLegacyTemplate || lightCohortForcedDark) {
        return {
            status: 'legacy',
            effectiveIntent,
            expectedVisualIntents
        };
    }

    if (expectedVisualIntents.includes(effectiveIntent)) {
        return {
            status: 'approved',
            effectiveIntent,
            expectedVisualIntents
        };
    }

    if (expectedVisualIntents.length === 0 && MODERN_VISUAL_INTENTS.has(effectiveIntent)) {
        return {
            status: 'approved',
            effectiveIntent,
            expectedVisualIntents
        };
    }

    if (MODERN_VISUAL_INTENTS.has(effectiveIntent)) {
        return {
            status: 'review',
            effectiveIntent,
            expectedVisualIntents
        };
    }

    return {
        status: 'review',
        effectiveIntent,
        expectedVisualIntents
    };
}

function normalizeHeaderSignature(value = '') {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function normalizeHeaderFontToken(value = '') {
    return String(value || '')
        .split(',')[0]
        .replace(/["']/g, '')
        .trim()
        .toLowerCase();
}

function compareHeaderSystems(sourceRouteSummary, destinationRouteSummary) {
    const mismatches = [];

    if (
        sourceRouteSummary?.headerVariant &&
        destinationRouteSummary?.headerVariant &&
        sourceRouteSummary.headerVariant !== destinationRouteSummary.headerVariant
    ) {
        mismatches.push(`headerVariant=${sourceRouteSummary.headerVariant}->${destinationRouteSummary.headerVariant}`);
    }

    if (
        sourceRouteSummary?.headerBrandFontFamily &&
        destinationRouteSummary?.headerBrandFontFamily &&
        normalizeHeaderFontToken(sourceRouteSummary.headerBrandFontFamily) !==
            normalizeHeaderFontToken(destinationRouteSummary.headerBrandFontFamily)
    ) {
        mismatches.push(
            `headerBrandFontFamily=${normalizeHeaderFontToken(sourceRouteSummary.headerBrandFontFamily)}->${normalizeHeaderFontToken(destinationRouteSummary.headerBrandFontFamily)}`
        );
    }

    if (
        sourceRouteSummary?.headerPrimaryNavSignature &&
        destinationRouteSummary?.headerPrimaryNavSignature &&
        normalizeHeaderSignature(sourceRouteSummary.headerPrimaryNavSignature) !==
            normalizeHeaderSignature(destinationRouteSummary.headerPrimaryNavSignature)
    ) {
        mismatches.push(
            `headerPrimaryNavSignature=${sourceRouteSummary.headerPrimaryNavSignature}->${destinationRouteSummary.headerPrimaryNavSignature}`
        );
    }

    if (
        Number.isFinite(sourceRouteSummary?.headerNavRowCount) &&
        Number.isFinite(destinationRouteSummary?.headerNavRowCount) &&
        sourceRouteSummary.headerNavRowCount > 0 &&
        destinationRouteSummary.headerNavRowCount > 0 &&
        sourceRouteSummary.headerNavRowCount !== destinationRouteSummary.headerNavRowCount
    ) {
        mismatches.push(`headerNavRowCount=${sourceRouteSummary.headerNavRowCount}->${destinationRouteSummary.headerNavRowCount}`);
    }

    return {
        mismatches,
        severity: mismatches.some((entry) => (
            entry.includes('headerVariant=') ||
            entry.includes('headerBrandFontFamily=') ||
            entry.includes('headerPrimaryNavSignature=')
        )) ? 'high' : 'medium'
    };
}

function buildRouteSummary(route, html, visualPage) {
    const cohort = classifyRouteCohort(route);
    const profile = classifyRouteProfile(route);
    const cohortConfig = getCohortConfig(cohort);
    const linkGraph = extractPublicRouteLinks(route, html);
    const sourceVisualIntent = inferVisualIntentFromSource(html);
    const format = determineRouteFormatStatus({
        route,
        cohort,
        visualIntent: visualPage?.metrics?.visualIntent || '',
        templateFamily: visualPage?.metrics?.templateFamily || '',
        headingFontFamily: visualPage?.metrics?.headingFontFamily || '',
        sourceVisualIntent
    });

    return {
        route,
        filePath: PUBLIC_PAGE_FILE_MAP[route],
        cohort,
        profile,
        referenceRoute: cohortConfig.referenceRoute || '',
        visualIntent: visualPage?.metrics?.visualIntent || '',
        sourceVisualIntent,
        templateFamily: visualPage?.metrics?.templateFamily || '',
        headerVariant: visualPage?.metrics?.headerVariant || '',
        headerBrandFontFamily: visualPage?.metrics?.headerBrandFontFamily || '',
        headerPrimaryNavFontFamily: visualPage?.metrics?.headerPrimaryNavFontFamily || '',
        headerPrimaryNavSignature: visualPage?.metrics?.headerPrimaryNavSignature || '',
        headerNavRowCount: Number(visualPage?.metrics?.headerNavRowCount || 0),
        headingFontFamily: visualPage?.metrics?.headingFontFamily || '',
        formatStatus: format.status,
        effectiveVisualIntent: format.effectiveIntent,
        expectedVisualIntents: format.expectedVisualIntents,
        outgoingRoutes: linkGraph.outgoingRoutes,
        brokenRoutes: linkGraph.brokenRoutes,
        incomingRoutes: [],
        findings: []
    };
}

function pushFinding(routeSummary, finding) {
    routeSummary.findings.push({
        route: routeSummary.route,
        severity: finding.severity,
        type: finding.type,
        message: finding.message,
        evidence: finding.evidence || '',
        recommendation: finding.recommendation || ''
    });
}

function applyConnectivityFindings(routeSummariesByRoute) {
    const routeSummaries = [...routeSummariesByRoute.values()];

    for (const routeSummary of routeSummaries) {
        if (routeSummary.formatStatus === 'legacy') {
            pushFinding(routeSummary, {
                severity: 'high',
                type: 'legacy_route',
                message: 'La vista sigue usando el formato legacy oscuro/amarillo.',
                evidence: `intent=${routeSummary.effectiveVisualIntent || 'unknown'}; template=${routeSummary.templateFamily || 'unknown'}`,
                recommendation: routeSummary.referenceRoute
                    ? `Alinear esta vista con la referencia ${routeSummary.referenceRoute}.`
                    : 'Refactorizar esta vista para que use el sistema visual actual.'
            });
        } else if (
            routeSummary.expectedVisualIntents.length > 0 &&
            !routeSummary.expectedVisualIntents.includes(routeSummary.effectiveVisualIntent)
        ) {
            pushFinding(routeSummary, {
                severity: 'medium',
                type: 'cohort_drift',
                message: 'La vista no coincide del todo con la intenciÃ³n visual esperada para su cohorte.',
                evidence: `intent=${routeSummary.effectiveVisualIntent || 'unknown'}; expected=${routeSummary.expectedVisualIntents.join(', ') || 'n/a'}`,
                recommendation: routeSummary.referenceRoute
                    ? `Comparar esta vista con ${routeSummary.referenceRoute} y unificar shell, tipografÃ­a y superficies.`
                    : 'Revisar shell, tipografÃ­a y superficies de esta vista.'
            });
        }

        if (routeSummary.brokenRoutes.length > 0) {
            pushFinding(routeSummary, {
                severity: 'high',
                type: 'broken_public_links',
                message: 'La vista contiene enlaces HTML hacia rutas pÃºblicas que ya no existen en el mapa activo.',
                evidence: routeSummary.brokenRoutes.join(', '),
                recommendation: 'Corregir o redirigir estos enlaces antes de seguir ampliando la navegaciÃ³n.'
            });
        }

        if (routeSummary.incomingRoutes.length === 0 && !PRIMARY_ROUTES.has(routeSummary.route)) {
            pushFinding(routeSummary, {
                severity: 'medium',
                type: 'orphan_route',
                message: 'La vista no recibe enlaces internos desde otras vistas pÃºblicas auditadas.',
                evidence: 'incomingRoutes=0',
                recommendation: 'Decidir si debe enlazarse desde otra vista viva, mantenerse solo por SEO o retirarse.'
            });
        }

        for (const destinationRoute of routeSummary.outgoingRoutes) {
            const destination = routeSummariesByRoute.get(destinationRoute);

            if (!destination) {
                continue;
            }

            if (destination.formatStatus === 'legacy') {
                pushFinding(routeSummary, {
                    severity: routeSummary.formatStatus === 'approved' ? 'high' : 'medium',
                    type: 'legacy_connection',
                    message: 'Esta vista enlaza hacia una vista en formato legacy.',
                    evidence: `${routeSummary.route} -> ${destinationRoute}`,
                    recommendation: destination.referenceRoute
                        ? `Sustituir el destino por ${destination.referenceRoute} o migrar ${destinationRoute}.`
                        : `Migrar o retirar ${destinationRoute}.`
                });
            } else if (
                destination.formatStatus === 'review' &&
                (
                    destination.effectiveVisualIntent === 'unknown' ||
                    destination.brokenRoutes.length > 0
                )
            ) {
                pushFinding(routeSummary, {
                    severity: 'medium',
                    type: 'uncertain_connection',
                    message: 'Esta vista enlaza hacia una vista que todavÃ­a no queda clara como formato aprobado.',
                    evidence: `${routeSummary.route} -> ${destinationRoute}; intent=${destination.effectiveVisualIntent || 'unknown'}`,
                    recommendation: 'Revisar la vista destino antes de consolidar este handoff.'
                });
            }
        }

        for (const destinationRoute of routeSummary.outgoingRoutes) {
            const destination = routeSummariesByRoute.get(destinationRoute);

            if (
                !destination ||
                !PRIMARY_ROUTES.has(routeSummary.route) ||
                routeSummary.formatStatus !== 'approved' ||
                destination.formatStatus !== 'approved'
            ) {
                continue;
            }

            const headerComparison = compareHeaderSystems(routeSummary, destination);

            if (headerComparison.mismatches.length > 0) {
                pushFinding(routeSummary, {
                    severity: headerComparison.severity,
                    type: 'header_handoff_drift',
                    message: 'Esta navegacion cambia el sistema de header entre la vista origen y la vista destino.',
                    evidence: `${routeSummary.route} -> ${destinationRoute}; ${headerComparison.mismatches.join('; ')}`,
                    recommendation: 'Unificar variante, tipografia de marca y orden principal de navegacion entre estas vistas conectadas.'
                });
            }
        }

        routeSummary.findings.sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || left.type.localeCompare(right.type));
    }
}

function severityRank(severity) {
    if (severity === 'high') {
        return 3;
    }

    if (severity === 'medium') {
        return 2;
    }

    return 1;
}

function summarizeAudit(routeSummaries) {
    const allFindings = routeSummaries.flatMap((routeSummary) => routeSummary.findings);

    return {
        totalRoutes: routeSummaries.length,
        approvedRoutes: routeSummaries.filter((routeSummary) => routeSummary.formatStatus === 'approved').length,
        legacyRoutes: routeSummaries.filter((routeSummary) => routeSummary.formatStatus === 'legacy').length,
        reviewRoutes: routeSummaries.filter((routeSummary) => routeSummary.formatStatus === 'review').length,
        legacyConnections: allFindings.filter((finding) => finding.type === 'legacy_connection').length,
        brokenPublicLinks: allFindings.filter((finding) => finding.type === 'broken_public_links').length,
        orphanRoutes: allFindings.filter((finding) => finding.type === 'orphan_route').length,
        headerHandoffDrift: allFindings.filter((finding) => finding.type === 'header_handoff_drift').length,
        totalFindings: allFindings.length,
        bySeverity: {
            high: allFindings.filter((finding) => finding.severity === 'high').length,
            medium: allFindings.filter((finding) => finding.severity === 'medium').length,
            low: allFindings.filter((finding) => finding.severity === 'low').length
        }
    };
}

function evaluateAuditGate(summary, strict = false) {
    if (!strict) {
        return {
            shouldFail: false,
            reasons: []
        };
    }

    const reasons = [];

    if (summary.legacyRoutes > 0) {
        reasons.push(`legacyRoutes=${summary.legacyRoutes}`);
    }

    if (summary.reviewRoutes > 0) {
        reasons.push(`reviewRoutes=${summary.reviewRoutes}`);
    }

    if (summary.legacyConnections > 0) {
        reasons.push(`legacyConnections=${summary.legacyConnections}`);
    }

    if (summary.brokenPublicLinks > 0) {
        reasons.push(`brokenPublicLinks=${summary.brokenPublicLinks}`);
    }

    return {
        shouldFail: reasons.length > 0,
        reasons
    };
}

function buildMarkdownReport(report) {
    const lines = [
        '# View Connectivity Agent',
        '',
        `Generated at: ${report.generatedAt}`,
        `Viewport: ${report.viewport}`,
        `Visual pass: ${report.visualPass}`,
        report.visualFallbackReason ? `Visual fallback: ${report.visualFallbackReason}` : null,
        report.baseUrl ? `Base URL: ${report.baseUrl}` : 'Base URL: local static server',
        '',
        '## Summary',
        '',
        `- routes audited: ${report.summary.totalRoutes}`,
        `- approved routes: ${report.summary.approvedRoutes}`,
        `- legacy routes: ${report.summary.legacyRoutes}`,
        `- review routes: ${report.summary.reviewRoutes}`,
        `- legacy connections: ${report.summary.legacyConnections}`,
        `- broken public links: ${report.summary.brokenPublicLinks}`,
        `- orphan routes: ${report.summary.orphanRoutes}`,
        `- header handoff drift: ${report.summary.headerHandoffDrift}`,
        `- findings: ${report.summary.totalFindings} (high=${report.summary.bySeverity.high}, medium=${report.summary.bySeverity.medium}, low=${report.summary.bySeverity.low})`,
        '',
        '## Routes',
        ''
    ].filter(Boolean);

    for (const routeSummary of report.routes) {
        lines.push(`### ${routeSummary.route}`);
        lines.push('');
        lines.push(`- cohort: ${routeSummary.cohort}`);
        lines.push(`- profile: ${routeSummary.profile}`);
        lines.push(`- status: ${routeSummary.formatStatus}`);
        lines.push(`- effective intent: ${routeSummary.effectiveVisualIntent || 'unknown'}`);
        lines.push(`- expected intents: ${routeSummary.expectedVisualIntents.join(', ') || 'n/a'}`);
        lines.push(`- template: ${routeSummary.templateFamily || 'unknown'}`);
        lines.push(`- header: ${routeSummary.headerVariant || 'unknown'}`);
        lines.push(`- incoming: ${routeSummary.incomingRoutes.length}`);
        lines.push(`- outgoing: ${routeSummary.outgoingRoutes.length}`);

        if (routeSummary.findings.length === 0) {
            lines.push('- findings: none');
            lines.push('');
            continue;
        }

        lines.push('- findings:');
        for (const finding of routeSummary.findings.slice(0, 6)) {
            lines.push(`  - [${finding.severity}] ${finding.type}: ${finding.message}`);
            if (finding.evidence) {
                lines.push(`    evidence: ${finding.evidence}`);
            }
            if (finding.recommendation) {
                lines.push(`    recommendation: ${finding.recommendation}`);
            }
        }
        lines.push('');
    }

    return `${lines.join('\n')}\n`;
}

async function resolveBaseUrl(baseUrl) {
    if (baseUrl) {
        return {
            baseUrl,
            serverHandle: null
        };
    }

    const port = await findAvailablePort();
    const resolvedBaseUrl = `http://127.0.0.1:${port}`;
    const serverHandle = await startStaticServer({
        projectRoot: repoRoot,
        port,
        baseUrl: resolvedBaseUrl,
        label: 'View connectivity agent static server'
    });

    return {
        baseUrl: resolvedBaseUrl,
        serverHandle
    };
}

async function collectVisualPagesFallback({ baseUrl, viewport, fallbackReason = '' }) {
    const resolved = await resolveBaseUrl(baseUrl);
    const browser = await chromium.launch({ headless: true });
    const visualPageMap = new Map();

    try {
        for (const route of Object.keys(PUBLIC_PAGE_FILE_MAP).map((entry) => normalizeRoute(entry)).sort()) {
            const context = await browser.newContext({
                viewport: viewport === 'desktop-wide'
                    ? { width: 1707, height: 893 }
                    : viewport === 'laptop'
                        ? { width: 1366, height: 768 }
                        : viewport === 'tablet-portrait'
                            ? { width: 768, height: 1024 }
                            : { width: 390, height: 844 }
            });
            const page = await context.newPage();

            try {
                await page.goto(`${resolved.baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
                await page.waitForTimeout(350);

                const metrics = await page.evaluate(() => {
                    function normalizedFontFamily(value) {
                        return String(value || '')
                            .split(',')
                            .map((entry) => entry.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
                            .filter(Boolean)
                            .join(', ');
                    }

                    function normalizeText(value) {
                        return String(value || '').replace(/\s+/g, ' ').trim();
                    }

                    function parseColorChannels(value) {
                        const match = String(value || '').match(/rgba?\(([^)]+)\)/i);

                        if (!match) {
                            return [0, 0, 0];
                        }

                        return match[1]
                            .split(',')
                            .slice(0, 3)
                            .map((entry) => Math.max(0, Math.min(255, Number.parseFloat(entry.trim()) || 0)));
                    }

                    function relativeLuminance(channels) {
                        const [red, green, blue] = channels.map((channel) => {
                            const normalized = channel / 255;
                            return normalized <= 0.03928
                                ? normalized / 12.92
                                : ((normalized + 0.055) / 1.055) ** 2.4;
                        });

                        return Number((0.2126 * red + 0.7152 * green + 0.0722 * blue).toFixed(4));
                    }

                    function inferTemplateFamily() {
                        if (document.querySelector('.vehicle-pdp-summary-primary') || document.querySelector('#vehicle-booking')) {
                            return 'vehicle_pdp_split';
                        }

                        if (document.querySelector('.vehicle-hero') && document.querySelector('.vehicle-booking')) {
                            return 'premium_vehicle_split';
                        }

                        if (document.querySelector('.site-header') && document.querySelector('.trust-row') && document.querySelector('.model-grid')) {
                            return 'legacy_brand_catalog';
                        }

                        if (document.querySelector('.services-hero')) {
                            return 'services_premium';
                        }

                        if (document.querySelector('.locations-hero')) {
                            return 'locations_premium';
                        }

                        if (document.querySelector('.service-detail-hero')) {
                            return 'service_detail';
                        }

                        if (document.querySelector('.local-guide-hero')) {
                            return 'local_guide';
                        }

                        if (document.querySelector('.about-hero')) {
                            return 'about_hero';
                        }

                        if (document.querySelector('.hero-lab')) {
                            return 'home_lab';
                        }

                        if (document.querySelector('.reserve-container')) {
                            return 'reserve_flow';
                        }

                        if (document.querySelector('#contactForm')) {
                            return 'contact_form';
                        }

                        if (document.querySelector('.dp-legal-hero') || document.querySelector('.dp-bridge')) {
                            return 'legal_shell';
                        }

                        return 'generic';
                    }

                    function topLevelNavTargets(navElement) {
                        if (!(navElement instanceof HTMLElement)) {
                            return [];
                        }

                        return Array.from(navElement.children)
                            .map((child) => {
                                if (!(child instanceof HTMLElement)) {
                                    return null;
                                }

                                if (child.matches('a, button')) {
                                    return child;
                                }

                                return child.querySelector(':scope > .lab-nav__trigger, :scope > a, :scope > button');
                            })
                            .filter((element) => element instanceof HTMLElement);
                    }

                    function navLabelSignature(labels) {
                        return (labels || []).map((entry) => normalizeText(entry)).filter(Boolean).join('|');
                    }

                    function inferHeaderVariant(headerElement) {
                        if (!(headerElement instanceof HTMLElement)) {
                            return document.querySelector('.site-header')
                                ? 'site_header'
                                : document.querySelector('header')
                                    ? 'generic_header'
                                    : 'none';
                        }

                        const hasMegaNav = Boolean(document.querySelector('.lab-nav__panel'));
                        const utilityCount = headerElement.querySelectorAll('.lab-header__utility-link').length;

                        if (headerElement.classList.contains('lab-header--vehicle') && hasMegaNav) {
                            return 'lab_vehicle_mega';
                        }

                        if (hasMegaNav && utilityCount > 0) {
                            return 'lab_mega_utility';
                        }

                        if (hasMegaNav) {
                            return 'lab_mega';
                        }

                        if (utilityCount > 0) {
                            return 'lab_simple_utility';
                        }

                        return 'lab_simple';
                    }

                    const body = document.body;
                    const heading = document.querySelector('h1');
                    const bookingCard = document.querySelector('.vehicle-booking');
                    const header = document.querySelector('.lab-header, .site-header, header');
                    const headerBrand = document.querySelector('.lab-brand, .header-brand');
                    const mainNav = document.querySelector('nav[aria-label="Main navigation"], .lab-header .lab-nav');
                    const headerPrimaryNavTargets = topLevelNavTargets(mainNav);
                    const headerPrimaryNavLabels = headerPrimaryNavTargets.map((element) => normalizeText(element.textContent)).filter(Boolean);
                    const bodyStyle = window.getComputedStyle(body);
                    const headingStyle = heading ? window.getComputedStyle(heading) : null;
                    const bookingStyle = bookingCard ? window.getComputedStyle(bookingCard) : null;
                    const headerBrandStyle = headerBrand ? window.getComputedStyle(headerBrand) : null;
                    const templateFamily = inferTemplateFamily();
                    const headingFontFamily = normalizedFontFamily(headingStyle?.fontFamily || '');
                    const bodyBackgroundLuminance = relativeLuminance(parseColorChannels(bodyStyle.backgroundColor || ''));
                    const headingColorLuminance = relativeLuminance(parseColorChannels(headingStyle?.color || 'rgb(255,255,255)'));
                    const bookingBackgroundLuminance = relativeLuminance(parseColorChannels(bookingStyle?.backgroundColor || 'rgba(0,0,0,0)'));
                    const usesLabHeader = Boolean(document.querySelector('.lab-header'));
                    const usesLegacyHeader = Boolean(document.querySelector('.site-header'));
                    const usesLegalShell = templateFamily === 'legal_shell';
                    const isMotherBaseVehicle = body.classList.contains('vehicle-page--mother-base');
                    const isPremiumPilotVehicle = body.classList.contains('vehicle-page--premium-pilot');

                    let visualIntent = 'unknown';

                    if (templateFamily === 'legacy_brand_catalog' || headingFontFamily.includes('orbitron')) {
                        visualIntent = 'legacy_dark_neon';
                    } else if (isMotherBaseVehicle || isPremiumPilotVehicle) {
                        visualIntent = 'modern_light_system';
                    } else if (usesLabHeader && (bodyBackgroundLuminance >= 0.68 || headingColorLuminance < 0.22)) {
                        visualIntent = 'modern_light_system';
                    } else if (usesLabHeader && bodyBackgroundLuminance < 0.68) {
                        visualIntent = 'modern_dark_system';
                    } else if (usesLegalShell) {
                        visualIntent = 'modern_dark_system';
                    } else if (usesLegacyHeader) {
                        visualIntent = 'legacy_dark_neon';
                    }

                    return {
                        visualIntent,
                        templateFamily,
                        headingFontFamily,
                        headerVariant: inferHeaderVariant(header),
                        headerBrandFontFamily: normalizedFontFamily(headerBrandStyle?.fontFamily || ''),
                        headerPrimaryNavSignature: navLabelSignature(headerPrimaryNavLabels),
                        headerNavRowCount: headerPrimaryNavTargets.length > 0
                            ? [...new Set(headerPrimaryNavTargets.map((element) => Math.round(element.getBoundingClientRect().top)))].length
                            : 0,
                        bodyBackgroundLuminance,
                        bookingBackgroundLuminance
                    };
                });

                visualPageMap.set(route, {
                    route,
                    viewport,
                    metrics
                });
            } finally {
                await context.close();
            }
        }
    } finally {
        await browser.close();

        if (resolved.serverHandle?.child) {
            stopProcess(resolved.serverHandle.child);
        }
    }

    return {
        runDir: '',
        visualPageMap,
        visualMode: 'fallback',
        fallbackReason
    };
}

async function collectVisualPages({ baseUrl, viewport, outputDir }) {
    try {
        const visualResult = await runVisualAgent({
            baseUrl,
            scope: 'all-public',
            includeFleetClicks: false,
            viewports: [viewport],
            outputDir
        });

        const visualPageMap = new Map();

        for (const page of visualResult.report.pages) {
            if (page.viewport === viewport) {
                visualPageMap.set(normalizeRoute(page.route), page);
            }
        }

        return {
            runDir: visualResult.runDir,
            visualPageMap,
            visualMode: 'full'
        };
    } catch (error) {
        return collectVisualPagesFallback({
            baseUrl,
            viewport,
            fallbackReason: error.message || 'visual_agent_failed'
        });
    }
}

async function runViewConnectivityAudit(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;
    const generatedAt = new Date().toISOString();
    const viewport = args.viewport || DEFAULT_VIEWPORT;
    const runDir = args.outputDir || path.join(artifactsRoot, timestampSlug(new Date(generatedAt)));

    ensureDir(runDir);

    let visualRunDir = '';
    let visualPageMap = new Map();
    let visualMode = args.skipVisual ? 'skipped' : 'full';
    let visualFallbackReason = '';

    if (!args.skipVisual) {
        const visual = await collectVisualPages({
            baseUrl: args.baseUrl || '',
            viewport,
            outputDir: path.join(runDir, 'visual-pass')
        });

        visualRunDir = visual.runDir;
        visualPageMap = visual.visualPageMap;
        visualMode = visual.visualMode || 'fallback';
        visualFallbackReason = visual.fallbackReason || '';
    }

    const routeSummariesByRoute = new Map();

    for (const route of Object.keys(PUBLIC_PAGE_FILE_MAP).map((entry) => normalizeRoute(entry)).sort()) {
        const html = readHtmlForRoute(route);
        const visualPage = visualPageMap.get(route);
        routeSummariesByRoute.set(route, buildRouteSummary(route, html, visualPage));
    }

    for (const routeSummary of routeSummariesByRoute.values()) {
        for (const destinationRoute of routeSummary.outgoingRoutes) {
            const destination = routeSummariesByRoute.get(destinationRoute);

            if (destination) {
                destination.incomingRoutes.push(routeSummary.route);
            }
        }
    }

    for (const routeSummary of routeSummariesByRoute.values()) {
        routeSummary.incomingRoutes = [...new Set(routeSummary.incomingRoutes)].sort();
    }

    applyConnectivityFindings(routeSummariesByRoute);

    const routes = [...routeSummariesByRoute.values()].sort((left, right) => {
        const severityDelta =
            (severityRank(right.findings[0]?.severity || 'low') - severityRank(left.findings[0]?.severity || 'low'));

        if (severityDelta !== 0) {
            return severityDelta;
        }

        const findingDelta = right.findings.length - left.findings.length;
        if (findingDelta !== 0) {
            return findingDelta;
        }

        return left.route.localeCompare(right.route);
    });

    const report = {
        generatedAt,
        viewport,
        baseUrl: args.baseUrl || '',
        visualPass: visualMode,
        visualRunDir,
        visualFallbackReason,
        summary: summarizeAudit(routes),
        routes
    };

    fs.writeFileSync(path.join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(runDir, 'report.md'), buildMarkdownReport(report));

    return {
        runDir,
        report
    };
}

async function main() {
    const { runDir, report } = await runViewConnectivityAudit({ argv: process.argv.slice(2) });
    const args = parseArgs(process.argv.slice(2));
    const gate = evaluateAuditGate(report.summary, args.strict);

    console.log(`View connectivity agent completed: ${runDir}`);
    console.log(
        `approved=${report.summary.approvedRoutes} legacy=${report.summary.legacyRoutes} review=${report.summary.reviewRoutes} legacyConnections=${report.summary.legacyConnections}`
    );

    if (gate.shouldFail) {
        console.error(`Strict connectivity gate failed: ${gate.reasons.join(', ')}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('View connectivity agent failed.');
        console.error(error.stack || error.message);
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_VIEWPORT,
    buildRouteSummary,
    compareHeaderSystems,
    determineRouteFormatStatus,
    extractPublicRouteLinks,
    evaluateAuditGate,
    inferVisualIntentFromSource,
    normalizeResolvedPath,
    parseArgs,
    resolveReferenceToPublicRoute,
    runViewConnectivityAudit,
    summarizeAudit
};
