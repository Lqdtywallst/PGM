const fs = require('fs');
const net = require('net');
const path = require('path');

const { chromium } = require('@playwright/test');

const {
    PUBLIC_PAGE_FILE_MAP
} = require(path.join(__dirname, '..', 'server', 'public-page-map.js'));
const {
    getViewportCoverageMatrix
} = require(path.join(__dirname, '..', 'server', 'design-system-contract.js'));
const {
    startStaticServer,
    stopProcess
} = require(path.join(__dirname, '..', 'server', 'site-audit-utils.js'));
const {
    createConsoleTracker,
    normalizeConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require(path.join(__dirname, '..', 'tests', 'e2e', 'support', 'site-helpers.js'));
const {
    RECOVERY_ROUTES,
    buildNavigationReview,
    buildNavigationReviewMarkdownSection,
    buildRouteViewportCoverage,
    buildStaticNavigationGraph,
    evaluateNavigationGate,
    normalizeRoute,
    normalizeText
} = require(path.join(__dirname, '..', 'server', 'navigation-audit-core.js'));
const {
    compareReportToApprovedMemory,
    formatAuditMemoryRegression
} = require(path.join(__dirname, '..', 'server', 'audit-memory-core.js'));

const repoRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(repoRoot, 'site');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'navigation-agent');
const SITE_ORIGIN = 'https://prestigegoalmotion.com';
const ALL_VIEWPORTS = Object.freeze(getViewportCoverageMatrix('all'));
const DEFAULT_VIEWPORTS = Object.freeze(['mobile-modern', 'laptop']);
const FULL_NAVIGATION_VIEWPORTS = Object.freeze([
    'mobile-small',
    'mobile-modern',
    'tablet-portrait',
    'laptop',
    'desktop-wide'
]);
const DEFAULT_DEEP_CRAWL_DEPTH = 6;
const FULL_DEEP_CRAWL_DEPTH = 10;
const DEFAULT_HANDOFF_CONCURRENCY = 4;
const FULL_HANDOFF_CONCURRENCY = 6;
const CLICK_TARGET_MODES = Object.freeze(['all-actions', 'route-surfaces', 'route-edges']);
const DEFAULT_ROUTES = Object.freeze([
    '/',
    '/fleet.html',
    '/services.html',
    '/locations.html',
    '/about.html',
    '/contact.html',
    '/app/reserve/page.html',
    '/lamborghini-rental-dubai.html',
    '/mercedes-rental-dubai.html',
    '/airport-concierge-dubai.html',
    '/monthly-luxury-car-rental-dubai.html'
]);

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function routeFileStem(route) {
    return normalizeRoute(route)
        .replace(/^\//, '')
        .replace(/[\/.]+/g, '-')
        .replace(/^-+/, '') || 'home';
}

function slugify(value) {
    return String(value || 'target')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72) || 'target';
}

function formatError(error) {
    return error && (error.stack || error.message) ? String(error.stack || error.message) : String(error);
}

function parseArgs(argv = []) {
    const args = {
        routes: [],
        viewports: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        scope: 'all-public',
        maxClicksPerPage: 5,
        maxCrawlDepth: DEFAULT_DEEP_CRAWL_DEPTH,
        handoffConcurrency: DEFAULT_HANDOFF_CONCURRENCY,
        clickTargets: 'all-actions',
        deep: false,
        full: false,
        strict: false
    };
    let scopeExplicit = false;
    let maxClicksExplicit = false;
    let maxDepthExplicit = false;
    let handoffConcurrencyExplicit = false;
    let viewportsExplicit = false;

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--route' && argv[index + 1]) {
            args.routes.push(normalizeRoute(argv[index + 1]));
            index += 1;
            continue;
        }

        if (value === '--viewport' && argv[index + 1]) {
            args.viewports.push(String(argv[index + 1]).trim());
            viewportsExplicit = true;
            index += 1;
            continue;
        }

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

        if (value === '--scope' && argv[index + 1]) {
            args.scope = String(argv[index + 1]).trim() || args.scope;
            scopeExplicit = true;
            index += 1;
            continue;
        }

        if (value === '--max-clicks-per-page' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed >= 0) {
                args.maxClicksPerPage = parsed;
                maxClicksExplicit = true;
            }
            index += 1;
            continue;
        }

        if (value === '--max-depth' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed >= 0) {
                args.maxCrawlDepth = parsed;
                maxDepthExplicit = true;
            }
            index += 1;
            continue;
        }

        if (value === '--handoff-concurrency' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed >= 1) {
                args.handoffConcurrency = parsed;
                handoffConcurrencyExplicit = true;
            }
            index += 1;
            continue;
        }

        if (value === '--click-targets' && argv[index + 1]) {
            const mode = String(argv[index + 1]).trim();
            if (CLICK_TARGET_MODES.includes(mode)) {
                args.clickTargets = mode;
            }
            index += 1;
            continue;
        }

        if (value === '--deep' || value === '--exhaustive') {
            args.deep = true;
            continue;
        }

        if (value === '--full') {
            args.full = true;
            args.deep = true;
            args.strict = true;
            continue;
        }

        if (value === '--strict') {
            args.strict = true;
        }
    }

    if (args.full) {
        if (!scopeExplicit && args.routes.length === 0) {
            args.scope = 'crawl';
        }

        if (!viewportsExplicit) {
            args.viewports = [...FULL_NAVIGATION_VIEWPORTS];
        }

        if (!maxDepthExplicit) {
            args.maxCrawlDepth = FULL_DEEP_CRAWL_DEPTH;
        }

        if (!handoffConcurrencyExplicit) {
            args.handoffConcurrency = FULL_HANDOFF_CONCURRENCY;
        }
    }

    if (args.deep) {
        if (!scopeExplicit && args.routes.length === 0) {
            args.scope = 'crawl';
        }

        if (!maxClicksExplicit) {
            args.maxClicksPerPage = Number.MAX_SAFE_INTEGER;
        }
    }

    return args;
}

function resolveSelectedRoutes(args = {}) {
    if (Array.isArray(args.routes) && args.routes.length > 0) {
        return [...new Set(args.routes.map(normalizeRoute))];
    }

    if (args.scope === 'critical') {
        return [...DEFAULT_ROUTES];
    }

    if (args.scope === 'crawl') {
        return ['/'];
    }

    return Object.keys(PUBLIC_PAGE_FILE_MAP).map(normalizeRoute).sort();
}

function resolveSelectedViewports(requestedNames = []) {
    const names = Array.isArray(requestedNames) && requestedNames.length > 0
        ? requestedNames
        : [...DEFAULT_VIEWPORTS];
    const normalizedNames = names.map((value) => String(value || '').trim().toLowerCase());
    const selected = ALL_VIEWPORTS.filter((viewport) => normalizedNames.includes(viewport.name.toLowerCase()));

    if (selected.length === 0) {
        throw new Error(`Unknown viewport selection: ${names.join(', ')}`);
    }

    return selected;
}

function buildContextOptions(viewport) {
    return {
        viewport: {
            width: viewport.width,
            height: viewport.height
        },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor,
        reducedMotion: 'reduce'
    };
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
        label: 'Navigation agent static server'
    });

    return {
        baseUrl: resolvedBaseUrl,
        serverHandle
    };
}

function readHtmlForRoute(route) {
    const relativePath = PUBLIC_PAGE_FILE_MAP[normalizeRoute(route)];

    if (!relativePath) {
        return '';
    }

    return fs.readFileSync(path.join(siteRoot, relativePath), 'utf8');
}

function stripHtml(value = '') {
    return String(value || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTagText(html = '', tagName = 'h1') {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = String(html || '').match(pattern);
    return match ? stripHtml(match[1]) : '';
}

function extractHrefValues(html = '') {
    const references = new Set();
    const pattern = /\b(?:href|action)=["']([^"']+)["']/gi;
    let match;

    while ((match = pattern.exec(String(html || ''))) !== null) {
        references.add(match[1].trim());
    }

    return [...references];
}

function isSkippableReference(reference = '') {
    return (
        !reference ||
        reference === '#' ||
        /^(?:mailto:|tel:|sms:|javascript:|data:|blob:)/i.test(reference)
    );
}

function resolveReferenceToPublicRoute(sourceRoute, reference) {
    if (isSkippableReference(reference)) {
        return '';
    }

    try {
        const resolved = new URL(reference, `${SITE_ORIGIN}${sourceRoute}`);
        if (resolved.origin !== SITE_ORIGIN) {
            return '';
        }

        const route = normalizeRoute(resolved.pathname);
        return PUBLIC_PAGE_FILE_MAP[route] ? route : '';
    } catch (error) {
        return '';
    }
}

function buildDestinationCatalog() {
    const catalog = {};

    for (const route of Object.keys(PUBLIC_PAGE_FILE_MAP).map(normalizeRoute)) {
        const html = readHtmlForRoute(route);
        catalog[route] = {
            route,
            filePath: PUBLIC_PAGE_FILE_MAP[route],
            heading: extractTagText(html, 'h1'),
            title: extractTagText(html, 'title')
        };
    }

    return catalog;
}

function buildStaticRouteLinks() {
    return Object.keys(PUBLIC_PAGE_FILE_MAP).map((route) => {
        const normalizedRoute = normalizeRoute(route);
        const html = readHtmlForRoute(normalizedRoute);
        const outgoingRoutes = [...new Set(
            extractHrefValues(html)
                .map((reference) => resolveReferenceToPublicRoute(normalizedRoute, reference))
                .filter((targetRoute) => targetRoute && targetRoute !== normalizedRoute)
        )].sort();

        return {
            route: normalizedRoute,
            outgoingRoutes
        };
    });
}

function createNetworkTracker(page, baseUrl) {
    const failures = [];
    const baseOrigin = new URL(baseUrl).origin;

    function isRelevantUrl(url = '') {
        if (/favicon\.ico/i.test(url)) {
            return false;
        }

        try {
            return new URL(url).origin === baseOrigin;
        } catch (error) {
            return false;
        }
    }

    page.on('requestfailed', (request) => {
        const url = request.url();
        const resourceType = request.resourceType();
        const failureText = request.failure()?.errorText || 'request_failed';

        if (
            isRelevantUrl(url) &&
            ['document', 'stylesheet', 'script', 'image', 'media', 'xhr', 'fetch'].includes(resourceType) &&
            !/ERR_ABORTED/i.test(failureText)
        ) {
            failures.push({ url, resourceType, failureText });
        }
    });

    page.on('response', (response) => {
        const url = response.url();
        const status = response.status();
        const resourceType = response.request().resourceType();

        if (
            isRelevantUrl(url) &&
            status >= 400 &&
            ['document', 'stylesheet', 'script', 'image', 'media', 'xhr', 'fetch'].includes(resourceType)
        ) {
            failures.push({ url, resourceType, status });
        }
    });

    return failures;
}

async function collectVisibleInternalLinks(page, knownRoutes) {
    return page.evaluate(({ routes }) => {
        function normalizeRouteToken(route = '/') {
            let pathname = String(route || '/').split(/[?#]/)[0] || '/';
            if (pathname === '/index.html') {
                return '/';
            }
            if (pathname.length > 1 && pathname.endsWith('/')) {
                pathname = pathname.slice(0, -1);
            }
            return pathname || '/';
        }

        function normalizeText(value = '') {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            if (element.closest('[hidden], [inert], [aria-hidden="true"]')) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.visibility !== 'collapse' &&
                Number(style.opacity || 1) > 0 &&
                rect.width > 0 &&
                rect.height > 0
            );
        }

        function elementArea(element) {
            if (element.closest('.lab-mobile-drawer')) {
                return 'mobile-drawer';
            }
            if (element.closest('.lab-nav__panel')) {
                return 'mega-menu';
            }
            if (element.closest('[aria-label="Breadcrumb"], [aria-label="breadcrumb"], .breadcrumb, .about-breadcrumb, .locations-breadcrumb, .local-guide-breadcrumb, .service-detail-breadcrumb')) {
                return 'breadcrumb';
            }
            if (element.closest('header, .lab-header, .site-header, nav[aria-label="Main navigation"]')) {
                return 'header';
            }
            if (element.closest('footer, .site-v2-footer')) {
                return 'footer';
            }
            if (element.closest('main')) {
                return 'main';
            }
            return 'other';
        }

        function accessibleName(element) {
            return normalizeText(
                element.getAttribute('aria-label') ||
                element.textContent ||
                element.getAttribute('title') ||
                element.getAttribute('value') ||
                element.querySelector?.('img[alt]')?.getAttribute('alt') ||
                ''
            );
        }

        function resolveTargetRoute(href) {
            try {
                const url = new URL(href, window.location.href);
                if (url.origin !== window.location.origin) {
                    return '';
                }

                const route = normalizeRouteToken(url.pathname);
                return routes.includes(route) ? route : '';
            } catch (error) {
                return '';
            }
        }

        function inferControlReference(element) {
            const directReference =
                element.getAttribute('data-href') ||
                element.getAttribute('data-url') ||
                element.getAttribute('data-route') ||
                element.getAttribute('data-service-primary-href') ||
                element.getAttribute('formaction') ||
                '';

            if (directReference) {
                return directReference;
            }

            const form = element.closest('form');
            const formAction = form?.getAttribute('action') || '';
            if (formAction && formAction !== '#') {
                return formAction;
            }

            const onclick = element.getAttribute('onclick') || '';
            const match = onclick.match(/(?:location(?:\.href|\.assign|\.replace)?|window\.open)\s*(?:=|\()\s*['"]([^'"]+)['"]/i);

            return match?.[1] || '';
        }

        const anchors = Array.from(document.querySelectorAll('a[href]'))
            .filter((link) => isVisible(link))
            .map((link) => {
                const isServiceSelector = link.hasAttribute('data-service-selector') && Boolean(link.getAttribute('data-service-primary-href'));
                const href = isServiceSelector
                    ? link.getAttribute('data-service-primary-href') || ''
                    : link.getAttribute('href') || '';
                const targetRoute = resolveTargetRoute(href);
                const text = normalizeText(link.textContent);
                const ariaLabel = normalizeText(link.getAttribute('aria-label'));
                const title = normalizeText(link.getAttribute('title'));
                const imageAlt = normalizeText(link.querySelector('img[alt]')?.getAttribute('alt'));

                return {
                    kind: isServiceSelector ? 'state-control' : 'link',
                    href,
                    targetRoute,
                    text,
                    label: ariaLabel || text || title || imageAlt,
                    accessibleName: ariaLabel || text || title || imageAlt,
                    ariaLabel,
                    title,
                    area: elementArea(link),
                    setupKind: isServiceSelector ? 'service-selector' : '',
                    setupControls: isServiceSelector ? link.id || '' : ''
                };
            })
            .filter((link) => link.targetRoute);

        const controls = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]'))
            .filter((control) => isVisible(control))
            .map((control) => {
                const href = inferControlReference(control);
                const targetRoute = resolveTargetRoute(href);
                const label = accessibleName(control);

                return {
                    kind: 'button',
                    href,
                    targetRoute,
                    text: normalizeText(control.textContent || control.getAttribute('value') || ''),
                    label,
                    accessibleName: label,
                    ariaLabel: normalizeText(control.getAttribute('aria-label')),
                    title: normalizeText(control.getAttribute('title')),
                    area: elementArea(control)
                };
            })
            .filter((control) => control.targetRoute);

        return anchors.concat(controls);
    }, { routes: knownRoutes });
}

function dedupeLinks(links = []) {
    const seen = new Set();
    const result = [];

    for (const link of links) {
        const key = [
            link.kind || 'link',
            normalizeRoute(link.targetRoute || link.href),
            normalizeText(link.accessibleName || link.label || link.text).toLowerCase(),
            link.area || '',
            link.setupKind || '',
            link.setupControls || ''
        ].join('|');

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(link);
    }

    return result;
}

async function collectBasicPageState(page, knownRoutes) {
    return page.evaluate(({ routes, recoveryRoutes }) => {
        function normalizeRouteToken(route = '/') {
            let pathname = String(route || '/').split(/[?#]/)[0] || '/';
            if (pathname === '/index.html') {
                return '/';
            }
            if (pathname.length > 1 && pathname.endsWith('/')) {
                pathname = pathname.slice(0, -1);
            }
            return pathname || '/';
        }

        function normalizeText(value = '') {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            if (element.closest('[hidden], [inert], [aria-hidden="true"]')) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.visibility !== 'collapse' &&
                Number(style.opacity || 1) > 0 &&
                rect.width > 0 &&
                rect.height > 0
            );
        }

        function resolveTargetRoute(href) {
            try {
                const url = new URL(href, window.location.href);
                if (url.origin !== window.location.origin) {
                    return '';
                }

                const route = normalizeRouteToken(url.pathname);
                return routes.includes(route) ? route : '';
            } catch (error) {
                return '';
            }
        }

        const links = Array.from(document.querySelectorAll('a[href]'))
            .filter((link) => isVisible(link))
            .map((link) => resolveTargetRoute(link.getAttribute('href') || ''))
            .filter(Boolean);
        const heading = Array.from(document.querySelectorAll('h1')).find((element) => isVisible(element));
        const headerNav = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"], header nav, .lab-header .lab-nav'))
            .some((element) => isVisible(element));
        const footerNav = Array.from(document.querySelectorAll('footer a[href], .site-v2-footer a[href]'))
            .some((element) => isVisible(element));
        const uniqueTargets = [...new Set(links)];
        const recovery = {};

        for (const [key, targetRoute] of Object.entries(recoveryRoutes)) {
            recovery[key] = uniqueTargets.includes(targetRoute);
        }

        return {
            title: document.title || '',
            heading: {
                text: heading ? normalizeText(heading.textContent) : '',
                visible: Boolean(heading)
            },
            navigation: {
                hasHeaderNav: headerNav,
                hasFooterNav: footerNav,
                visibleInternalLinkCount: uniqueTargets.length
            },
            recoveryRoutes: recovery
        };
    }, {
        routes: knownRoutes,
        recoveryRoutes: RECOVERY_ROUTES
    });
}

async function exerciseMobileDrawer(page, routeDir, knownRoutes) {
    const state = {
        toggleFound: false,
        opened: false,
        closed: false,
        internalLinkCount: 0,
        links: [],
        screenshotPath: ''
    };
    const toggle = page.locator('.lab-mobile-toggle, button[aria-controls="lab-mobile-drawer"]').first();

    if (await toggle.count() === 0) {
        return state;
    }

    state.toggleFound = true;

    try {
        await toggle.click({ timeout: 5000 });
        await page.waitForFunction(() => {
            const drawer = document.querySelector('#lab-mobile-drawer, .lab-mobile-drawer');
            if (!(drawer instanceof HTMLElement)) {
                return false;
            }

            const toggleElement = document.querySelector('.lab-mobile-toggle, button[aria-controls="lab-mobile-drawer"]');
            const style = window.getComputedStyle(drawer);
            const rect = drawer.getBoundingClientRect();

            return (
                drawer.classList.contains('is-open') ||
                drawer.getAttribute('aria-hidden') === 'false' ||
                toggleElement?.getAttribute('aria-expanded') === 'true' ||
                (style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0)
            );
        }, null, { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(180);

        const drawerOpen = await page.evaluate(() => {
            const drawer = document.querySelector('#lab-mobile-drawer, .lab-mobile-drawer');
            const toggleElement = document.querySelector('.lab-mobile-toggle, button[aria-controls="lab-mobile-drawer"]');

            if (!(drawer instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(drawer);
            const rect = drawer.getBoundingClientRect();

            return (
                drawer.classList.contains('is-open') ||
                drawer.getAttribute('aria-hidden') === 'false' ||
                toggleElement?.getAttribute('aria-expanded') === 'true' ||
                (style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0)
            );
        });

        state.opened = Boolean(drawerOpen);
        state.links = (await collectVisibleInternalLinks(page, knownRoutes))
            .filter((link) => link.area === 'mobile-drawer')
            .map((link) => ({
                ...link,
                setupKind: 'mobile-drawer'
            }));
        state.internalLinkCount = new Set(state.links.map((link) => link.targetRoute)).size;

        await page.keyboard.press('Escape');
        await page.waitForTimeout(180);
        state.closed = await page.evaluate(() => {
            const drawer = document.querySelector('#lab-mobile-drawer, .lab-mobile-drawer');
            const toggleElement = document.querySelector('.lab-mobile-toggle, button[aria-controls="lab-mobile-drawer"]');

            return (
                !drawer ||
                drawer.getAttribute('aria-hidden') === 'true' ||
                toggleElement?.getAttribute('aria-expanded') === 'false' ||
                !drawer.classList.contains('is-open')
            );
        });
    } catch (error) {
        state.opened = false;
        state.closed = false;
    }

    if (!state.opened || !state.closed) {
        state.screenshotPath = path.join(routeDir, 'mobile-drawer-failure.png');
        await page.screenshot({
            path: state.screenshotPath,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        }).catch(() => {});
    }

    return state;
}

function cssAttributeValue(value = '') {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function exerciseDesktopMegaMenus(page, routeDir, knownRoutes) {
    const checks = [];
    const triggers = page.locator('.lab-nav__trigger[aria-controls]');
    const count = await triggers.count();

    for (let index = 0; index < count; index += 1) {
        const trigger = triggers.nth(index);
        const label = normalizeText(await trigger.textContent().catch(() => ''));
        const controls = await trigger.getAttribute('aria-controls').catch(() => '');
        const check = {
            label,
            controls,
            opened: false,
            internalLinkCount: 0,
            links: [],
            screenshotPath: ''
        };

        if (!controls || !(await trigger.isVisible().catch(() => false))) {
            checks.push(check);
            continue;
        }

        try {
            await trigger.click({ timeout: 5000 });
            await page.waitForTimeout(180);
            check.opened = await page.evaluate((panelId) => {
                const panel = document.getElementById(panelId);

                if (!(panel instanceof HTMLElement)) {
                    return false;
                }

                const style = window.getComputedStyle(panel);
                const rect = panel.getBoundingClientRect();

                return (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    Number(style.opacity || 1) > 0 &&
                    rect.width > 0 &&
                    rect.height > 0
                );
            }, controls);
            check.links = (await collectVisibleInternalLinks(page, knownRoutes))
                .filter((link) => link.area === 'mega-menu')
                .map((link) => ({
                    ...link,
                    setupKind: 'mega',
                    setupControls: controls
                }));
            check.internalLinkCount = new Set(check.links.map((link) => link.targetRoute)).size;
            await page.keyboard.press('Escape');
            await page.waitForTimeout(120);
        } catch (error) {
            check.opened = false;
        }

        if (!check.opened || check.internalLinkCount < 1) {
            check.screenshotPath = path.join(routeDir, `mega-menu-${slugify(label || controls)}-failure.png`);
            await page.screenshot({
                path: check.screenshotPath,
                fullPage: false,
                animations: 'disabled',
                caret: 'hide'
            }).catch(() => {});
        }

        checks.push(check);
    }

    return checks;
}

async function clickVisibleFleetFilterScrim(page) {
    const point = await page.evaluate(() => {
        const scrim = document.querySelector('.fleet-filter-scrim');
        const sheet = document.querySelector('.fleet-sidebar');

        if (!(scrim instanceof HTMLElement)) {
            return null;
        }

        const sheetRect = sheet instanceof HTMLElement
            ? sheet.getBoundingClientRect()
            : null;
        const candidates = [];

        if (sheetRect && sheetRect.top > 8) {
            candidates.push({ x: window.innerWidth / 2, y: sheetRect.top / 2 });
        }

        if (sheetRect && sheetRect.bottom < window.innerHeight - 8) {
            candidates.push({
                x: window.innerWidth / 2,
                y: sheetRect.bottom + ((window.innerHeight - sheetRect.bottom) / 2)
            });
        }

        candidates.push({ x: 16, y: 16 });

        for (const candidate of candidates) {
            const x = Math.min(window.innerWidth - 4, Math.max(4, candidate.x));
            const y = Math.min(window.innerHeight - 4, Math.max(4, candidate.y));
            const target = document.elementFromPoint(x, y);

            if (target === scrim || target?.closest?.('.fleet-filter-scrim')) {
                return { x, y };
            }
        }

        return null;
    });

    if (!point) {
        return false;
    }

    await page.mouse.click(point.x, point.y);
    return true;
}

async function exerciseFleetFilterSheet(page, routeDir) {
    const toggle = page.locator('.fleet-mobile-filter-toggle').first();

    if (await toggle.count() === 0 || !(await toggle.isVisible().catch(() => false))) {
        return null;
    }

    const screenshotPath = path.join(routeDir, 'fleet-filter-sheet-trap.png');
    const state = {
        id: 'fleet-filter-sheet',
        label: 'Fleet mobile filter sheet',
        status: 'failed',
        message: '',
        screenshotPath: ''
    };

    async function isOpen() {
        return page.locator('.fleet-browser.fleet-filters-open').count().then((count) => count > 0).catch(() => false);
    }

    async function openSheet() {
        await toggle.click({ timeout: 5000 });
        await page.waitForFunction(() => (
            document.querySelector('.fleet-browser')?.classList.contains('fleet-filters-open')
        ), null, { timeout: 5000 });
    }

    async function visibleExitLabels() {
        return page.locator('.fleet-filter-close:visible').evaluateAll((buttons) => (
            buttons.map((button) => String(button.textContent || button.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
        ));
    }

    try {
        await openSheet();
        const labels = await visibleExitLabels();
        const hasObviousExit = labels.some((label) => /\b(back to cars|show\s+\d+\s+cars?|show cars|car results)\b/i.test(label));

        if (!hasObviousExit) {
            throw new Error(`Filter sheet opened but no obvious return action was visible. labels=${labels.join(' | ') || 'none'}`);
        }

        await page.locator('.fleet-filter-close:visible').first().click({ timeout: 5000 });
        await page.waitForFunction(() => (
            !document.querySelector('.fleet-browser')?.classList.contains('fleet-filters-open')
        ), null, { timeout: 5000 });

        if (await isOpen()) {
            throw new Error('Filter sheet stayed open after tapping the visible return action.');
        }

        await openSheet();
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => (
            !document.querySelector('.fleet-browser')?.classList.contains('fleet-filters-open')
        ), null, { timeout: 5000 });

        await openSheet();
        const scrimClicked = await clickVisibleFleetFilterScrim(page);

        if (scrimClicked) {
            await page.waitForFunction(() => (
                !document.querySelector('.fleet-browser')?.classList.contains('fleet-filters-open')
            ), null, { timeout: 5000 });
        } else {
            const fullScreenSheetWithExit = await page.evaluate(() => {
                const sheet = document.querySelector('.fleet-sidebar');
                const visibleClose = Array.from(document.querySelectorAll('.fleet-filter-close'))
                    .some((button) => {
                        if (!(button instanceof HTMLElement)) {
                            return false;
                        }

                        const rect = button.getBoundingClientRect();
                        const style = window.getComputedStyle(button);
                        const label = String(button.textContent || button.getAttribute('aria-label') || '').trim();

                        return style.display !== 'none' &&
                            style.visibility !== 'hidden' &&
                            rect.width >= 44 &&
                            rect.height >= 40 &&
                            /\b(back to cars|show\s+\d+\s+cars?|show cars|car results)\b/i.test(label);
                    });

                if (!(sheet instanceof HTMLElement)) {
                    return false;
                }

                const rect = sheet.getBoundingClientRect();
                const heightRatio = rect.height / Math.max(1, window.innerHeight);
                return heightRatio >= 0.92 && visibleClose;
            });

            if (!fullScreenSheetWithExit) {
                throw new Error('Filter sheet scrim had no tappable exposed point and the sheet did not present a valid fullscreen exit state.');
            }

            await page.locator('.fleet-filter-close:visible').first().click({ timeout: 5000 });
            await page.waitForFunction(() => (
                !document.querySelector('.fleet-browser')?.classList.contains('fleet-filters-open')
            ), null, { timeout: 5000 });
        }

        const resultVisible = await page.locator('.js-fleet-card:not([hidden])').first().isVisible({ timeout: 3000 }).catch(() => false);
        if (!resultVisible) {
            throw new Error('Filter sheet closed but no fleet result was visible afterwards.');
        }

        return {
            ...state,
            status: 'passed',
            message: `Opened and escaped with visible labels: ${labels.join(' | ')}.`,
            screenshotPath: ''
        };
    } catch (error) {
        await page.screenshot({
            path: screenshotPath,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        }).catch(() => {});

        return {
            ...state,
            status: 'failed',
            message: error.message || String(error),
            screenshotPath
        };
    }
}

async function assessVehicleReturnAffordance(page, routeDir) {
    const isVehiclePage = await page.evaluate(() => {
        const body = document.body;
        const isVehicleShell = body?.classList.contains('vehicle-page');
        const isBrandLanding = Boolean(document.querySelector('.vehicle-main--brand-landing'));
        const hasPdpStructure = Boolean(document.querySelector(
            '.vehicle-pdp-hero-shell, .vehicle-pdp-summary-primary, .vehicle-pdp-intro'
        ));

        return Boolean(isVehicleShell && hasPdpStructure && !isBrandLanding);
    }).catch(() => false);

    if (!isVehiclePage) {
        return null;
    }

    const screenshotPath = path.join(routeDir, 'vehicle-return-affordance-failure.png');
    const metrics = await page.evaluate(() => {
        function normalizeRouteToken(route = '/') {
            let pathname = String(route || '/').split(/[?#]/)[0] || '/';
            if (pathname === '/index.html') {
                return '/';
            }
            if (pathname.length > 1 && pathname.endsWith('/')) {
                pathname = pathname.slice(0, -1);
            }
            return pathname || '/';
        }

        function normalizeText(value = '') {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            if (element.closest('[hidden], [inert], [aria-hidden="true"]')) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity || 1) > 0 &&
                rect.width > 0 &&
                rect.height > 0;
        }

        const links = Array.from(document.querySelectorAll('a[href]'))
            .filter((link) => isVisible(link))
            .map((link) => {
                const rect = link.getBoundingClientRect();
                let targetRoute = '';

                try {
                    targetRoute = normalizeRouteToken(new URL(link.getAttribute('href') || '', window.location.href).pathname);
                } catch (error) {
                    targetRoute = '';
                }

                return {
                    targetRoute,
                    label: normalizeText(link.textContent || link.getAttribute('aria-label') || ''),
                    className: String(link.className || ''),
                    inBreadcrumb: Boolean(link.closest('.breadcrumb, [aria-label="Breadcrumb"], [aria-label="breadcrumb"]')),
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                };
            })
            .filter((link) => link.targetRoute === '/fleet.html');
        const prominent = links.filter((link) => (
            !link.inBreadcrumb &&
            link.top >= 0 &&
            link.top <= window.innerHeight * 0.92 &&
            link.width >= Math.min(160, window.innerWidth * 0.42) &&
            link.height >= 40 &&
            /\b(back|fleet|cars|all)\b/i.test(link.label)
        ));

        return {
            fleetLinks: links,
            prominent,
            viewportHeight: window.innerHeight
        };
    });

    if (metrics.prominent.length > 0) {
        return {
            id: 'vehicle-return-to-fleet',
            label: 'Vehicle return to fleet',
            status: 'passed',
            message: `Prominent fleet return visible: ${metrics.prominent.map((link) => link.label).join(' | ')}.`,
            screenshotPath: ''
        };
    }

    await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide'
    }).catch(() => {});

    return {
        id: 'vehicle-return-to-fleet',
        label: 'Vehicle return to fleet',
        status: 'failed',
        message: `Only weak fleet return affordances found: ${metrics.fleetLinks.map((link) => `${link.label || 'unnamed'} (${link.width}x${link.height}, breadcrumb=${link.inBreadcrumb})`).join(' | ') || 'none'}`,
        screenshotPath
    };
}

async function collectRenderedNavigationState(page, route, viewport, routeDir, knownRoutes) {
    const mobileDrawer = viewport.isMobile
        ? await exerciseMobileDrawer(page, routeDir, knownRoutes)
        : null;
    const megaMenus = viewport.isMobile
        ? []
        : await exerciseDesktopMegaMenus(page, routeDir, knownRoutes);
    const localEscapes = [
        viewport.isMobile ? await exerciseFleetFilterSheet(page, routeDir) : null,
        await assessVehicleReturnAffordance(page, routeDir)
    ].filter(Boolean);
    const basic = await collectBasicPageState(page, knownRoutes);
    const visibleLinks = await collectVisibleInternalLinks(page, knownRoutes);
    const menuLinks = megaMenus.flatMap((menu) => menu.links || []);
    const links = dedupeLinks([
        ...visibleLinks,
        ...(mobileDrawer?.links || []),
        ...menuLinks
    ]).map((link) => ({
        ...link,
        sourceRoute: route
    }));
    const targetCount = new Set(links.map((link) => normalizeRoute(link.targetRoute))).size;

    return {
        ...basic,
        links,
        recoveryRoutes: Object.fromEntries(
            Object.entries(RECOVERY_ROUTES).map(([key, targetRoute]) => [
                key,
                links.some((link) => normalizeRoute(link.targetRoute) === targetRoute)
            ])
        ),
        navigation: {
            ...basic.navigation,
            visibleInternalLinkCount: Math.max(Number(basic.navigation.visibleInternalLinkCount || 0), targetCount),
            mobileDrawer,
            megaMenus,
            localEscapes
        }
    };
}

function candidatePriority(link) {
    const targetRoute = normalizeRoute(link.targetRoute || link.href);
    const label = normalizeText(link.accessibleName || link.label || link.text).toLowerCase();

    if (targetRoute === RECOVERY_ROUTES.home) {
        return 0;
    }

    if (Object.values(RECOVERY_ROUTES).includes(targetRoute)) {
        return 1;
    }

    if (link.area === 'header' || link.area === 'mobile-drawer') {
        return 2;
    }

    if (link.area === 'mega-menu') {
        return 3;
    }

    if (/(reserve|book|fleet|contact|service|location|about|brand|model|detail)/i.test(label)) {
        return 4;
    }

    return 6;
}

function candidateDedupeKey(link, targetRoute, label, clickTargets = 'all-actions') {
    const edgeBase = [
        link.kind || 'link',
        link.setupKind || 'direct',
        link.setupControls || '',
        targetRoute
    ];

    if (clickTargets === 'route-edges') {
        return targetRoute;
    }

    if (clickTargets === 'route-surfaces') {
        return [...edgeBase, link.area || ''].join('|');
    }

    return [...edgeBase, link.area || '', label.toLowerCase()].join('|');
}

function buildClickCandidates(pageState, maxClicksPerPage, clickTargets = 'all-actions') {
    if (Number(maxClicksPerPage) <= 0) {
        return [];
    }

    const route = normalizeRoute(pageState.route);
    const rawCandidates = [];

    for (const link of pageState.links || []) {
        const targetRoute = normalizeRoute(link.targetRoute || link.href);

        if (!targetRoute || targetRoute === route) {
            continue;
        }

        if (!['header', 'footer', 'breadcrumb', 'main', 'mobile-drawer', 'mega-menu'].includes(link.area)) {
            continue;
        }

        const label = normalizeText(link.accessibleName || link.label || link.text);
        rawCandidates.push({
            ...link,
            label: label || targetRoute,
            targetRoute,
            priority: candidatePriority(link)
        });
    }

    const seen = new Set();
    const deduped = [];

    for (const candidate of rawCandidates
        .sort((left, right) => (
            left.priority - right.priority ||
            String(left.area || '').localeCompare(String(right.area || '')) ||
            String(left.label || '').localeCompare(String(right.label || ''))
        ))) {
        const key = candidateDedupeKey(candidate, candidate.targetRoute, candidate.label, clickTargets);

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        deduped.push(candidate);
    }

    return deduped.slice(0, maxClicksPerPage);
}

async function setupClickTarget(page, target) {
    if (target.setupKind === 'mobile-drawer') {
        const toggle = page.locator('.lab-mobile-toggle, button[aria-controls="lab-mobile-drawer"]').first();

        if (await toggle.count() === 0) {
            throw new Error('Mobile drawer toggle was not found before clicking drawer link.');
        }

        await toggle.click({ timeout: 5000 });
        await page.waitForFunction(() => {
            const drawer = document.querySelector('#lab-mobile-drawer, .lab-mobile-drawer');
            if (!(drawer instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(drawer);
            return (
                drawer.classList.contains('is-open') &&
                drawer.getAttribute('aria-hidden') !== 'true' &&
                !drawer.hasAttribute('inert') &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                drawer.querySelectorAll('a[href]').length > 0
            );
        }, null, { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(150);
        return;
    }

    if (target.setupKind === 'service-selector') {
        const selector = target.setupControls
            ? page.locator(`[id="${cssAttributeValue(target.setupControls)}"]`).first()
            : page.locator(`[data-service-selector][data-service-primary-href]`).filter({ hasText: target.label || '' }).first();

        if (await selector.count() === 0) {
            throw new Error(`Service selector was not found: ${target.setupControls || target.label || target.targetRoute}`);
        }

        await selector.click({ timeout: 5000 });
        await page.waitForFunction((expectedRoute) => {
            function normalizeRouteToken(route = '/') {
                let pathname = String(route || '/').split(/[?#]/)[0] || '/';
                if (pathname === '/index.html') {
                    return '/';
                }
                if (pathname.length > 1 && pathname.endsWith('/')) {
                    pathname = pathname.slice(0, -1);
                }
                return pathname || '/';
            }

            const primary = document.querySelector('[data-service-primary]');
            if (!(primary instanceof HTMLAnchorElement)) {
                return false;
            }

            try {
                const url = new URL(primary.getAttribute('href') || '', window.location.href);
                return normalizeRouteToken(url.pathname) === normalizeRouteToken(expectedRoute);
            } catch (error) {
                return false;
            }
        }, target.targetRoute, { timeout: 3000 }).catch(() => null);
        await page.waitForTimeout(120);
        return;
    }

    if (target.setupKind === 'mega' && target.setupControls) {
        const trigger = page.locator(`.lab-nav__trigger[aria-controls="${cssAttributeValue(target.setupControls)}"]`).first();

        if (await trigger.count() === 0) {
            throw new Error(`Mega menu trigger was not found: ${target.setupControls}`);
        }

        await trigger.click({ timeout: 5000 });
        await page.waitForTimeout(150);
    }
}

async function clickMatchingLink(page, target) {
    return page.evaluate((candidate) => {
        function normalizeRouteToken(route = '/') {
            let pathname = String(route || '/').split(/[?#]/)[0] || '/';
            if (pathname === '/index.html') {
                return '/';
            }
            if (pathname.length > 1 && pathname.endsWith('/')) {
                pathname = pathname.slice(0, -1);
            }
            return pathname || '/';
        }

        function normalizeText(value = '') {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            if (element.closest('[hidden], [inert], [aria-hidden="true"]')) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.visibility !== 'collapse' &&
                Number(style.opacity || 1) > 0 &&
                rect.width > 0 &&
                rect.height > 0
            );
        }

        function linkArea(element) {
            if (element.closest('.lab-mobile-drawer')) {
                return 'mobile-drawer';
            }
            if (element.closest('.lab-nav__panel')) {
                return 'mega-menu';
            }
            if (element.closest('[aria-label="Breadcrumb"], [aria-label="breadcrumb"], .breadcrumb, .about-breadcrumb, .locations-breadcrumb, .local-guide-breadcrumb, .service-detail-breadcrumb')) {
                return 'breadcrumb';
            }
            if (element.closest('header, .lab-header, .site-header, nav[aria-label="Main navigation"]')) {
                return 'header';
            }
            if (element.closest('footer, .site-v2-footer')) {
                return 'footer';
            }
            if (element.closest('main')) {
                return 'main';
            }
            return 'other';
        }

        function targetRouteFor(link) {
            try {
                const url = new URL(link.getAttribute('href') || '', window.location.href);
                if (url.origin !== window.location.origin) {
                    return '';
                }
                return normalizeRouteToken(url.pathname);
            } catch (error) {
                return '';
            }
        }

        function controlReference(element) {
            const directReference =
                element.getAttribute('data-href') ||
                element.getAttribute('data-url') ||
                element.getAttribute('data-route') ||
                element.getAttribute('data-service-primary-href') ||
                element.getAttribute('formaction') ||
                '';

            if (directReference) {
                return directReference;
            }

            const formAction = element.closest('form')?.getAttribute('action') || '';
            if (formAction && formAction !== '#') {
                return formAction;
            }

            const onclick = element.getAttribute('onclick') || '';
            const match = onclick.match(/(?:location(?:\.href|\.assign|\.replace)?|window\.open)\s*(?:=|\()\s*['"]([^'"]+)['"]/i);
            return match?.[1] || '';
        }

        function controlRouteFor(element) {
            try {
                const reference = controlReference(element);
                if (!reference) {
                    return '';
                }

                const url = new URL(reference, window.location.href);
                if (url.origin !== window.location.origin) {
                    return '';
                }

                return normalizeRouteToken(url.pathname);
            } catch (error) {
                return '';
            }
        }

        function targetLabel(element) {
            return normalizeText(
                element.getAttribute('aria-label') ||
                element.textContent ||
                element.getAttribute('title') ||
                element.getAttribute('value') ||
                element.querySelector?.('img[alt]')?.getAttribute('alt') ||
                ''
            ).toLowerCase();
        }

        function labelsMatch(element) {
            if (candidate.setupKind === 'service-selector') {
                return true;
            }

            const elementLabel = targetLabel(element);
            return !label || elementLabel === label || elementLabel.includes(label) || label.includes(elementLabel);
        }

        const label = normalizeText(candidate.label).toLowerCase();
        const anchors = Array.from(document.querySelectorAll('a[href]'))
            .filter((link) => isVisible(link))
            .filter((link) => targetRouteFor(link) === candidate.targetRoute)
            .filter((link) => {
                if (candidate.setupKind === 'service-selector' && link.hasAttribute('data-service-selector')) {
                    return false;
                }

                if (candidate.area && linkArea(link) !== candidate.area) {
                    return false;
                }

                return labelsMatch(link);
            });
        const controls = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]'))
            .filter((control) => isVisible(control))
            .filter((control) => controlRouteFor(control) === candidate.targetRoute)
            .filter((control) => {
                if (candidate.area && linkArea(control) !== candidate.area) {
                    return false;
                }

                return labelsMatch(control);
            });
        const targets = candidate.kind === 'button'
            ? controls.concat(anchors)
            : anchors.concat(controls);

        if (targets.length === 0) {
            return {
                clicked: false,
                reason: 'matching_link_not_found'
            };
        }

        targets[0].click();

        return {
            clicked: true,
            href: targets[0].getAttribute('href') || controlReference(targets[0]) || '',
            label: normalizeText(targets[0].textContent || targets[0].getAttribute('value') || '')
        };
    }, target);
}

async function runClickProbe(browser, baseUrl, sourceRoute, viewport, target, routeDir) {
    const context = await browser.newContext(buildContextOptions(viewport));
    const page = await context.newPage();
    const label = normalizeText(target.label || target.accessibleName || target.text || target.targetRoute);
    const id = slugify(`${target.area}-${label}-${target.targetRoute}`);
    const screenshotPath = path.join(routeDir, `${id}-handoff-failure.png`);

    try {
        if (normalizeRoute(sourceRoute) === '/') {
            await primeHomeAnimations(page);
        }

        await page.goto(`${baseUrl}${sourceRoute}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await settlePage(page, 250);
        await setupClickTarget(page, target);

        const previousUrl = page.url();
        const clickResult = await clickMatchingLink(page, target);

        if (!clickResult.clicked) {
            throw new Error(clickResult.reason || 'click_failed');
        }

        await page.waitForURL((url) => url.href !== previousUrl, { timeout: 8000 }).catch(() => null);
        await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => null);
        await settlePage(page, 250);

        const observedUrl = page.url();
        const observedRoute = normalizeRoute(new URL(observedUrl).pathname);
        const expectedRoute = normalizeRoute(target.targetRoute);
        const h1Visible = await page.locator('h1').first().isVisible({ timeout: 3000 }).catch(() => false);
        let backRoute = '';
        let backWorked = false;

        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => null);
        await settlePage(page, 150);
        backRoute = normalizeRoute(new URL(page.url()).pathname);
        backWorked = backRoute === normalizeRoute(sourceRoute);

        if (observedRoute !== expectedRoute || !h1Visible || !backWorked) {
            await page.screenshot({
                path: screenshotPath,
                fullPage: false,
                animations: 'disabled',
                caret: 'hide'
            }).catch(() => {});

            return {
                id,
                label,
                area: target.area || '',
                targetRoute: expectedRoute,
                status: 'failed',
                message: `observed=${observedRoute}; expected=${expectedRoute}; h1Visible=${h1Visible}; backWorked=${backWorked}; backRoute=${backRoute}`,
                observedUrl,
                backWorked,
                screenshotPath
            };
        }

        return {
            id,
            label,
            area: target.area || '',
            targetRoute: expectedRoute,
            status: 'passed',
            message: `Landed on ${expectedRoute} and browser back returned to ${sourceRoute}.`,
            observedUrl,
            backWorked,
            screenshotPath: ''
        };
    } catch (error) {
        await page.screenshot({
            path: screenshotPath,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        }).catch(() => {});

        return {
            id,
            label,
            area: target.area || '',
            targetRoute: normalizeRoute(target.targetRoute || '/'),
            status: 'failed',
            message: error.message || String(error),
            observedUrl: page.url(),
            backWorked: false,
            screenshotPath
        };
    } finally {
        await context.close();
    }
}

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(Number(concurrency || 1), items.length));

    await Promise.all(Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    }));

    return results;
}

async function auditRouteViewport({ browser, baseUrl, route, viewport, runDir, knownRoutes, maxClicksPerPage, clickTargets, handoffConcurrency }) {
    const routeDir = path.join(runDir, routeFileStem(route), viewport.name);
    const context = await browser.newContext(buildContextOptions(viewport));
    const page = await context.newPage();
    const consoleErrors = createConsoleTracker(page);
    const requestFailures = createNetworkTracker(page, baseUrl);

    ensureDir(routeDir);

    let pageState = {
        route,
        viewport: viewport.name,
        loadStatus: 'ok',
        loadMessage: '',
        title: '',
        heading: { text: '', visible: false },
        navigation: {
            hasHeaderNav: false,
            hasFooterNav: false,
            visibleInternalLinkCount: 0,
            mobileDrawer: null,
            megaMenus: []
        },
        recoveryRoutes: {},
        links: [],
        handoffs: [],
        consoleErrors: [],
        requestFailures: []
    };

    try {
        if (normalizeRoute(route) === '/') {
            await primeHomeAnimations(page);
        }

        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await settlePage(page, 350);

        if (response && response.status() >= 400) {
            pageState.loadStatus = `http_${response.status()}`;
            pageState.loadMessage = `${response.status()} ${response.url()}`;
        }

        const rendered = await collectRenderedNavigationState(page, route, viewport, routeDir, knownRoutes);
        pageState = {
            ...pageState,
            ...rendered,
            route,
            viewport: viewport.name
        };
    } catch (error) {
        pageState.loadStatus = 'failed';
        pageState.loadMessage = error.message || String(error);
        pageState.screenshotPath = path.join(routeDir, 'route-load-failure.png');
        await page.screenshot({
            path: pageState.screenshotPath,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        }).catch(() => {});
    } finally {
        pageState.consoleErrors = normalizeConsoleErrors(consoleErrors);
        pageState.requestFailures = requestFailures.slice(0, 12);
        await context.close();
    }

    if (pageState.loadStatus === 'ok') {
        const allClickCandidates = buildClickCandidates(pageState, Number.MAX_SAFE_INTEGER, clickTargets);
        const clickCandidates = allClickCandidates.slice(0, Number(maxClicksPerPage || 0));
        const handoffs = await mapWithConcurrency(
            clickCandidates,
            handoffConcurrency || DEFAULT_HANDOFF_CONCURRENCY,
            (target) => runClickProbe(browser, baseUrl, route, viewport, target, routeDir)
        );

        pageState.handoffs = handoffs;
        pageState.navigation.clickCandidateCount = clickCandidates.length;
        pageState.navigation.clickableRouteActionCount = allClickCandidates.length;
        pageState.navigation.clickCoverageComplete = clickCandidates.length === allClickCandidates.length;
        pageState.navigation.clickTargetMode = clickTargets || 'all-actions';
    }

    return pageState;
}

function buildRenderedRouteLinks(pages = []) {
    const byRoute = new Map();

    for (const page of pages || []) {
        const route = normalizeRoute(page.route || '/');
        const existing = byRoute.get(route) || {
            route,
            outgoingRoutes: []
        };

        existing.outgoingRoutes = [...new Set([
            ...existing.outgoingRoutes,
            ...(page.links || [])
                .map((link) => normalizeRoute(link.targetRoute || link.href))
                .filter((targetRoute) => targetRoute && targetRoute !== route)
        ])].sort();
        byRoute.set(route, existing);
    }

    return [...byRoute.values()].sort((left, right) => left.route.localeCompare(right.route));
}

async function auditStaticRouteSet({ browser, baseUrl, selectedRoutes, selectedViewports, runDir, knownRoutes, maxClicksPerPage, clickTargets, handoffConcurrency }) {
    const pages = [];

    for (const route of selectedRoutes) {
        for (const viewport of selectedViewports) {
            pages.push(await auditRouteViewport({
                browser,
                baseUrl,
                route,
                viewport,
                runDir,
                knownRoutes,
                maxClicksPerPage: Number(maxClicksPerPage || 0),
                clickTargets,
                handoffConcurrency
            }));
        }
    }

    return {
        pages,
        crawl: {
            mode: 'static-route-set',
            seedRoutes: [...selectedRoutes],
            maxDepth: 0,
            discoveredRoutesByViewport: Object.fromEntries(
                selectedViewports.map((viewport) => [viewport.name, [...selectedRoutes]])
            )
        }
    };
}

async function auditDeepRouteGraph({ browser, baseUrl, seedRoutes, selectedViewports, runDir, knownRoutes, maxClicksPerPage, maxCrawlDepth, clickTargets, handoffConcurrency }) {
    const pages = [];
    const discoveredRoutesByViewport = {};

    for (const viewport of selectedViewports) {
        const queue = seedRoutes.map((route) => ({
            route: normalizeRoute(route),
            depth: 0,
            discoveredFrom: ''
        }));
        const queued = new Set(queue.map((entry) => entry.route));
        const visited = new Set();
        discoveredRoutesByViewport[viewport.name] = [];

        while (queue.length > 0) {
            const item = queue.shift();
            const route = normalizeRoute(item.route);

            if (visited.has(route) || !knownRoutes.includes(route)) {
                continue;
            }

            visited.add(route);
            discoveredRoutesByViewport[viewport.name].push(route);

            const pageState = await auditRouteViewport({
                browser,
                baseUrl,
                route,
                viewport,
                runDir,
                knownRoutes,
                maxClicksPerPage: Number(maxClicksPerPage || 0),
                clickTargets,
                handoffConcurrency
            });

            pageState.crawl = {
                depth: item.depth,
                discoveredFrom: item.discoveredFrom || 'seed'
            };
            pages.push(pageState);

            if (item.depth >= maxCrawlDepth) {
                continue;
            }

            for (const link of pageState.links || []) {
                const targetRoute = normalizeRoute(link.targetRoute || link.href);
                if (
                    targetRoute &&
                    knownRoutes.includes(targetRoute) &&
                    !visited.has(targetRoute) &&
                    !queued.has(targetRoute)
                ) {
                    queued.add(targetRoute);
                    queue.push({
                        route: targetRoute,
                        depth: item.depth + 1,
                        discoveredFrom: route
                    });
                }
            }
        }
    }

    return {
        pages,
        crawl: {
            mode: 'deep-dynamic-crawl',
            seedRoutes: [...seedRoutes],
            maxDepth: maxCrawlDepth,
            discoveredRoutesByViewport
        }
    };
}

function summarizeReport(pages, navigationReview, renderedGraph = [], crawl = null, coverageProfile = null) {
    const handoffs = pages.flatMap((page) => page.handoffs || []);
    const navigationTargets = pages.flatMap((page) => page.links || []);
    const graphEdges = renderedGraph.reduce((count, entry) => count + (entry.outgoingRoutes || []).length, 0);
    const clickableRouteActions = pages.reduce((count, page) => (
        count + Number(page.navigation?.clickableRouteActionCount || 0)
    ), 0);

    return {
        totalRoutes: new Set(pages.map((page) => page.route)).size,
        totalPageRuns: pages.length,
        totalViewports: new Set(pages.map((page) => page.viewport)).size,
        totalNavigationTargets: navigationTargets.length,
        totalRouteEdges: graphEdges,
        totalClickableRouteActions: clickableRouteActions,
        totalHandoffs: handoffs.length,
        passedHandoffs: handoffs.filter((handoff) => handoff.status === 'passed').length,
        failedHandoffs: handoffs.filter((handoff) => handoff.status === 'failed').length,
        handoffCoverageComplete: clickableRouteActions === handoffs.length,
        routeViewportCoverageComplete: Boolean(coverageProfile?.complete),
        expectedPageRuns: Number(coverageProfile?.expectedPageRuns || 0),
        auditedExpectedPageRuns: Number(coverageProfile?.auditedExpectedPageRuns || 0),
        missingRouteViewportPairs: Number(coverageProfile?.missingRouteViewports?.length || 0),
        deepCrawl: crawl?.mode === 'deep-dynamic-crawl',
        maxCrawlDepth: crawl?.maxDepth || 0,
        navigationStatus: navigationReview.status,
        findings: navigationReview.summary
    };
}

function buildMarkdownReport(report) {
    const lines = [
        '# Navigation Agent Report',
        '',
        `Generated at: ${report.generatedAt}`,
        `Base URL: ${report.baseUrl}`,
        `Scope: ${report.scope}`,
        `Deep crawl: ${report.summary.deepCrawl ? 'enabled' : 'disabled'}`,
        `Max crawl depth: ${report.summary.maxCrawlDepth}`,
        `Max clicks per page: ${report.maxClicksPerPage}`,
        `Click target mode: ${report.clickTargets || 'all-actions'}`,
        `Handoff concurrency: ${report.handoffConcurrency || DEFAULT_HANDOFF_CONCURRENCY}`,
        '',
        '## Summary',
        '',
        `- status: ${report.summary.navigationStatus}`,
        `- routes checked: ${report.summary.totalRoutes}`,
        `- page runs: ${report.summary.totalPageRuns}`,
        `- expected route x viewport runs: ${report.summary.auditedExpectedPageRuns}/${report.summary.expectedPageRuns}`,
        `- route x viewport coverage: ${report.summary.routeViewportCoverageComplete ? 'complete' : 'missing'}`,
        `- missing route x viewport pairs: ${report.summary.missingRouteViewportPairs}`,
        `- viewports: ${report.summary.totalViewports}`,
        `- navigation targets discovered: ${report.summary.totalNavigationTargets}`,
        `- rendered route edges: ${report.summary.totalRouteEdges}`,
        `- clickable route actions selected: ${report.summary.totalClickableRouteActions}`,
        `- handoffs: ${report.summary.totalHandoffs}`,
        `- handoff coverage: ${report.summary.handoffCoverageComplete ? 'complete' : 'sampled'}`,
        `- passed handoffs: ${report.summary.passedHandoffs}`,
        `- failed handoffs: ${report.summary.failedHandoffs}`,
        ''
    ];

    lines.push(...buildNavigationReviewMarkdownSection(report.navigationReview));
    lines.push('', '## Rendered Navigation Graph', '');

    for (const entry of (report.renderedGraph || []).slice(0, 80)) {
        lines.push(`- ${entry.route} -> ${entry.outgoingRoutes.join(', ') || '(none)'}`);
    }

    lines.push('', '## Routes');

    for (const page of report.pages) {
        const drawer = page.navigation.mobileDrawer;
        const failedHandoffs = (page.handoffs || []).filter((handoff) => handoff.status === 'failed');
        const targetSummary = [...new Set((page.links || []).map((link) => `${normalizeRoute(link.targetRoute)} [${link.kind || 'link'}:${link.area || 'unknown'}]`))]
            .slice(0, 16);

        lines.push('');
        lines.push(`### ${page.route} [${page.viewport}]`);
        lines.push('');
        lines.push(`- title: ${page.title || '(untitled)'}`);
        lines.push(`- h1: ${page.heading?.text || '(missing)'}`);
        lines.push(`- load: ${page.loadStatus}`);
        lines.push(`- visible internal routes: ${page.navigation.visibleInternalLinkCount || 0}`);
        lines.push(`- header nav: ${page.navigation.hasHeaderNav ? 'yes' : 'no'}`);
        lines.push(`- recovery: home=${Boolean(page.recoveryRoutes.home)} fleet=${Boolean(page.recoveryRoutes.fleet)} contact=${Boolean(page.recoveryRoutes.contact)} reserve=${Boolean(page.recoveryRoutes.reserve)}`);
        if (page.crawl) {
            lines.push(`- crawl: depth=${page.crawl.depth} discoveredFrom=${page.crawl.discoveredFrom}`);
        }
        if (drawer) {
            lines.push(`- mobile drawer: toggle=${drawer.toggleFound} opened=${drawer.opened} closed=${drawer.closed} links=${drawer.internalLinkCount}`);
        }
        if ((page.navigation.localEscapes || []).length > 0) {
            lines.push(`- in-page exits: ${page.navigation.localEscapes.map((entry) => `${entry.id || entry.label}:${entry.status}`).join(', ')}`);
        }
        lines.push(`- discovered targets: ${targetSummary.join(', ') || 'none'}`);
        lines.push(`- click targets: ${page.navigation.clickCandidateCount || 0}/${page.navigation.clickableRouteActionCount || 0} (${page.navigation.clickCoverageComplete ? 'complete' : 'sampled'})`);
        lines.push(`- handoffs: ${(page.handoffs || []).length} (${failedHandoffs.length} failed)`);

        if (failedHandoffs.length > 0) {
            lines.push('- failed handoffs:');
            for (const handoff of failedHandoffs.slice(0, 6)) {
                lines.push(`  - ${handoff.label} -> ${handoff.targetRoute}: ${handoff.message}`);
                if (handoff.screenshotPath) {
                    lines.push(`    screenshot: ${handoff.screenshotPath}`);
                }
            }
        }

        if ((page.consoleErrors || []).length > 0) {
            lines.push('- console errors:');
            for (const error of page.consoleErrors.slice(0, 4)) {
                lines.push(`  - ${String(error).slice(0, 220)}`);
            }
        }
    }

    return `${lines.join('\n')}\n`;
}

async function runNavigationAgent(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;
    const generatedAt = new Date().toISOString();
    const seedRoutes = resolveSelectedRoutes(args);
    const selectedViewports = resolveSelectedViewports(args.viewports);
    const knownRoutes = Object.keys(PUBLIC_PAGE_FILE_MAP).map(normalizeRoute).sort();
    const runDir = args.outputDir || path.join(artifactsRoot, timestampSlug(new Date(generatedAt)));
    const destinationsByRoute = buildDestinationCatalog();
    const staticGraph = buildStaticNavigationGraph(buildStaticRouteLinks());

    ensureDir(runDir);

    const { baseUrl, serverHandle } = await resolveBaseUrl(args.baseUrl || '');
    const browser = await chromium.launch({ headless: true });

    try {
        const auditResult = args.deep
            ? await auditDeepRouteGraph({
                browser,
                baseUrl,
                seedRoutes,
                selectedViewports,
                runDir,
                knownRoutes,
                maxClicksPerPage: Number(args.maxClicksPerPage || 0),
                maxCrawlDepth: Number(args.maxCrawlDepth ?? DEFAULT_DEEP_CRAWL_DEPTH),
                clickTargets: args.clickTargets || 'all-actions',
                handoffConcurrency: Number(args.handoffConcurrency || DEFAULT_HANDOFF_CONCURRENCY)
            })
            : await auditStaticRouteSet({
                browser,
                baseUrl,
                selectedRoutes: seedRoutes,
                selectedViewports,
                runDir,
                knownRoutes,
                maxClicksPerPage: Number(args.maxClicksPerPage || 0),
                clickTargets: args.clickTargets || 'all-actions',
                handoffConcurrency: Number(args.handoffConcurrency || DEFAULT_HANDOFF_CONCURRENCY)
            });
        const pages = auditResult.pages;
        const renderedRouteLinks = buildRenderedRouteLinks(pages);
        const renderedGraph = buildStaticNavigationGraph(renderedRouteLinks);
        const expectedRoutes = args.deep ? knownRoutes : seedRoutes;
        const coverageProfile = buildRouteViewportCoverage({
            pages,
            publicRoutes: expectedRoutes,
            viewports: selectedViewports
        });

        const navigationReview = buildNavigationReview({
            pages,
            graph: renderedGraph,
            publicRoutes: expectedRoutes,
            destinationsByRoute,
            coverageProfile
        });
        const report = {
            generatedAt,
            baseUrl,
            scope: args.scope || 'all-public',
            maxClicksPerPage: Number(args.maxClicksPerPage || 0),
            clickTargets: args.clickTargets || 'all-actions',
            handoffConcurrency: Number(args.handoffConcurrency || DEFAULT_HANDOFF_CONCURRENCY),
            maxCrawlDepth: Number(args.maxCrawlDepth ?? DEFAULT_DEEP_CRAWL_DEPTH),
            deep: Boolean(args.deep),
            full: Boolean(args.full),
            seedRoutes,
            selectedRoutes: [...new Set(pages.map((page) => page.route))].sort(),
            selectedViewports: selectedViewports.map((viewport) => viewport.name),
            summary: summarizeReport(pages, navigationReview, renderedGraph, auditResult.crawl, coverageProfile),
            navigationReview,
            coverageProfile,
            crawl: auditResult.crawl,
            renderedGraph,
            staticGraph,
            pages
        };
        report.auditMemory = compareReportToApprovedMemory(report, { kind: 'navigation' });

        fs.writeFileSync(path.join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
        fs.writeFileSync(path.join(runDir, 'report.md'), buildMarkdownReport(report));

        return {
            runDir,
            report
        };
    } finally {
        await browser.close();

        if (serverHandle?.child) {
            stopProcess(serverHandle.child);
        }
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const { runDir, report } = await runNavigationAgent(args);
    const gate = evaluateNavigationGate(report.navigationReview.summary, args.strict);

    console.log(`Navigation agent completed: ${runDir}`);
    console.log(`status=${report.summary.navigationStatus} routes=${report.summary.totalRoutes} viewports=${report.summary.totalViewports} handoffs=${report.summary.totalHandoffs} failed=${report.summary.failedHandoffs}`);
    console.log(`coverage=${report.summary.auditedExpectedPageRuns}/${report.summary.expectedPageRuns} missingRouteViewportPairs=${report.summary.missingRouteViewportPairs} clickTargets=${report.clickTargets}`);
    console.log(`findings=${report.navigationReview.summary.total} high=${report.navigationReview.summary.bySeverity.high} medium=${report.navigationReview.summary.bySeverity.medium} hardFails=${report.navigationReview.summary.hardFails}`);

    if (gate.shouldFail) {
        console.error(`Strict navigation gate failed: ${gate.reasons.join(', ')}`);
        process.exit(1);
    }

    if (report.auditMemory?.status === 'bad') {
        console.error(`Audit memory regression failed: ${report.auditMemory.message}`);
        for (const regression of report.auditMemory.regressions.slice(0, 10)) {
            console.error(`- ${formatAuditMemoryRegression(regression)}`);
        }
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Navigation agent failed.');
        console.error(formatError(error));
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_ROUTES,
    DEFAULT_VIEWPORTS,
    FULL_NAVIGATION_VIEWPORTS,
    buildClickCandidates,
    buildDestinationCatalog,
    buildMarkdownReport,
    buildRenderedRouteLinks,
    buildStaticRouteLinks,
    parseArgs,
    resolveReferenceToPublicRoute,
    resolveSelectedRoutes,
    resolveSelectedViewports,
    runNavigationAgent,
    summarizeReport
};
