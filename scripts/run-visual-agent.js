const fs = require('fs');
const net = require('net');
const path = require('path');

const { chromium } = require('playwright');
const pixelmatchModule = require('pixelmatch');
const { PNG } = require('pngjs');

const {
    createConsoleTracker,
    normalizeConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require(path.join(__dirname, '..', 'tests', 'e2e', 'support', 'site-helpers.js'));
const {
    startStaticServer,
    stopProcess
} = require(path.join(__dirname, '..', 'server', 'site-audit-utils.js'));
const {
    BRAND_REFERENCE_ROUTE,
    VEHICLE_REFERENCE_ROUTE,
    classifyRouteCohort,
    classifyRouteProfile,
    createVisualFinding,
    getDefaultVisualRoutes,
    getVehicleVisualRoutes,
    getProfileConfig,
    normalizeRoute,
    scoreVisualPage,
    shouldEscalateToVision,
    summarizeVisualFindings
} = require(path.join(__dirname, '..', 'server', 'visual-audit-core.js'));
const {
    DESIGN_SYSTEM_CONTRACT,
    getFirstViewportContract,
    getSectionRhythmContract
} = require(path.join(__dirname, '..', 'server', 'design-system-contract.js'));

const repoRoot = path.resolve(__dirname, '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'visual-agent');
const baselineRoot = path.join(repoRoot, 'tests', 'visual-baselines');
const baselineManifestPath = path.join(baselineRoot, 'manifest.json');
const pixelmatch = pixelmatchModule.default || pixelmatchModule;

const VIEWPORTS = Object.freeze([
    { name: 'mobile-small', width: 360, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { name: 'mobile-modern', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    { name: 'tablet-portrait', width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { name: 'laptop', width: 1366, height: 768, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
    { name: 'desktop-wide', width: 1707, height: 893, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }
]);

const SNAPSHOT_THRESHOLDS = Object.freeze({
    viewport: 0.015,
    region: 0.008
});

const SHARED_LAB_HEADER_PROFILES = new Set([
    'home',
    'hub_marketing',
    'fleet',
    'vehicle_pdp',
    'contact',
    'reserve'
]);

const PROFILE_REFERENCE_ROUTES = Object.freeze({
    hub_marketing: '/about.html',
    contact: '/about.html'
});

const COHORT_REFERENCE_ROUTES = Object.freeze({
    home: '/',
    hub_marketing: '/about.html',
    guide_landing: '/luxury-car-rental-dubai.html',
    service_landing: '/airport-concierge-dubai.html',
    brand_landing: BRAND_REFERENCE_ROUTE,
    vehicle_pdp: VEHICLE_REFERENCE_ROUTE,
    reserve: '/app/reserve/page.html',
    fleet: '/fleet.html',
    legal: '/terms-and-conditions.html'
});

const TEMPLATE_FAMILY_REFERENCE_ROUTES = Object.freeze({
    'guide_landing::local_guide': '/luxury-car-rental-dubai.html',
    'service_landing::service_detail': '/airport-concierge-dubai.html',
    'brand_landing::vehicle_pdp_split': '/lamborghini-rental-dubai.html',
    'hub_marketing::services_premium': '/services.html',
    'hub_marketing::locations_premium': '/locations.html',
    'hub_marketing::about_hero': '/about.html'
});

const PROFILE_SELECTORS = Object.freeze({
    home: {
        heroSelectors: ['.hero-lab'],
        cropSelectors: ['.hero-lab'],
        primaryCtaSelectors: ['.hero-lab__cta--primary'],
        firstUsefulSelectors: ['.hero-lab h1', '.hero-lab__cta--primary'],
        headerSelectors: ['.lab-header', 'header'],
        navSelectors: ['nav[aria-label="Main navigation"]', 'header nav', 'nav'],
        mediaSelectors: ['.hero-lab img', '.hero-lab video', '.hero-lab picture img'],
        keySelectors: ['h1', '.hero-lab__cta--primary', '.hero-lab__lead', '.hero-lab__signal-row li'],
        formSelectors: ['#hero-lab-overlay', '.hero-lab-overlay__form'],
        statusSelectors: ['[role="status"]'],
        priceSelectors: []
    },
    hub_marketing: {
        heroSelectors: ['.service-detail-hero', '.local-guide-hero', '.about-hero', '.services-hero', '.locations-hero', '.vehicle-hero'],
        cropSelectors: ['.service-detail-hero', '.local-guide-hero', '.about-hero', '.services-hero', '.locations-hero', '.vehicle-hero'],
        primaryCtaSelectors: [
            '.service-detail-button--primary',
            '.local-guide-button--primary',
            '.about-button--primary',
            '.services-button--primary',
            '.locations-button--primary',
            '.vehicle-hero__actions a'
        ],
        firstUsefulSelectors: [
            'h1',
            '.service-detail-button--primary',
            '.local-guide-button--primary',
            '.about-button--primary',
            '.services-button--primary',
            '.locations-button--primary',
            '.vehicle-hero__actions a'
        ],
        headerSelectors: ['.lab-header', 'header'],
        navSelectors: ['nav[aria-label="Main navigation"]', 'header nav', 'nav'],
        mediaSelectors: [
            '.service-detail-hero img',
            '.service-detail-hero video',
            '.local-guide-hero img',
            '.about-hero img',
            '.about-media img',
            '.services-hero img',
            '.services-hero video',
            '.locations-hero img',
            '.vehicle-hero img',
            '.vehicle-hero video'
        ],
        keySelectors: [
            'h1',
            '.service-detail-button--primary',
            '.local-guide-button--primary',
            '.about-button--primary',
            '.services-button--primary',
            '.locations-button--primary',
            '.vehicle-hero__actions a',
            '.local-guide-hero__aside',
            '.service-detail-hero__panel',
            '.services-hero__feature',
            '.locations-map-card',
            '.vehicle-hero__copy'
        ],
        clipSelectors: [
            'h1',
            '.service-detail-button--primary',
            '.local-guide-button--primary',
            '.about-button--primary',
            '.services-button--primary',
            '.locations-button--primary',
            '.vehicle-hero__actions a'
        ],
        formSelectors: [],
        statusSelectors: ['[role="status"]'],
        priceSelectors: []
    },
    fleet: {
        heroSelectors: ['main section:first-of-type', '.fleet-browser', '.js-fleet-grid'],
        cropSelectors: ['.js-fleet-card', '.js-fleet-grid'],
        primaryCtaSelectors: ['.js-fleet-card .fleet-card__primary'],
        firstUsefulSelectors: ['.js-fleet-card', '.js-fleet-grid'],
        headerSelectors: ['.lab-header', 'header'],
        navSelectors: ['nav[aria-label="Main navigation"]', 'header nav', 'nav'],
        mediaSelectors: ['.js-fleet-card img'],
        keySelectors: [
            '.js-fleet-card .fleet-card__title',
            '.js-fleet-card .fleet-card__price-value',
            '.js-fleet-card .fleet-card__primary',
            '.js-fleet-card .fleet-card__spec'
        ],
        cardSelectors: ['.js-fleet-card'],
        formSelectors: ['.fleet-browser form'],
        statusSelectors: ['[role="status"]'],
        priceSelectors: ['.js-fleet-card .fleet-card__price-value']
    },
    vehicle_pdp: {
        heroSelectors: ['.vehicle-pdp-hero-shell', '.vehicle-pdp-summary-primary', '.vehicle-page main'],
        cropSelectors: ['.vehicle-pdp-hero-shell', '#vehicle-booking', '.vehicle-pdp-summary-primary'],
        primaryCtaSelectors: ['.vehicle-booking__submit'],
        firstUsefulSelectors: ['h1', '#vehicle-booking', '.vehicle-booking__submit'],
        headerSelectors: ['.lab-header', 'header'],
        navSelectors: ['nav[aria-label="Main navigation"]', 'header nav', 'nav'],
        mediaSelectors: ['main img', 'main picture img', 'main video'],
        keySelectors: [
            'h1',
            '#vehicle-booking',
            '.vehicle-booking__price',
            '.vehicle-booking__submit',
            '.vehicle-booking__field',
            '.vehicle-booking__input'
        ],
        clipSelectors: [
            '.vehicle-booking__price',
            '.vehicle-booking__submit',
            '.vehicle-booking__field',
            '.vehicle-booking__input'
        ],
        formSelectors: ['.vehicle-booking__form'],
        statusSelectors: ['[role="status"]'],
        priceSelectors: ['.vehicle-booking__price']
    },
    reserve: {
        heroSelectors: ['.reserve-container'],
        cropSelectors: ['.reserve-container', '.step1-layout'],
        primaryCtaSelectors: ['.reserve-mobile-bar__primary', 'button[type="submit"]', '#toStep2', '#toStep3'],
        firstUsefulSelectors: ['.reserve-container h1', '#fullName', '#startDate', '.reserve-mobile-summary', '.step1-layout'],
        headerSelectors: ['.lab-header', 'header'],
        navSelectors: ['nav[aria-label="Main navigation"]', '.lab-header .lab-nav', 'header nav', 'nav'],
        mediaSelectors: [],
        keySelectors: [
            '.reserve-page-heading',
            '.reserve-container h1',
            '.reserve-mobile-summary',
            '.reserve-mobile-bar__primary',
            '.step.active .step-header',
            '.step.active .step-title',
            '.step.active .input-group label',
            '.reserve-container button',
            '#selectedCarRate',
            '#reserveMobileAction',
            '#contactFormStatus',
            '#payment-message',
            '[role="alert"]',
            '[role="status"]'
        ],
        clipSelectors: [
            '.reserve-page-heading',
            '.reserve-container h1',
            '.reserve-mobile-summary',
            '.reserve-mobile-bar__primary',
            '.step.active .step-header',
            '.step.active .step-title',
            '.step.active .input-group label',
            '.reserve-container button',
            '#selectedCarRate',
            '#reserveMobileAction',
            '#contactFormStatus',
            '#payment-message',
            '[role="alert"]',
            '[role="status"]'
        ],
        formSelectors: ['.reserve-container form', '.step1-layout', '.step2-layout'],
        statusSelectors: ['#contactFormStatus', '#payment-message', '[role="alert"]', '[role="status"]'],
        priceSelectors: ['#selectedCarRate', '#reserveMobileRate']
    },
    contact: {
        heroSelectors: ['.hero-grid', '.form-layout'],
        cropSelectors: ['#contactForm', '.hero-grid'],
        primaryCtaSelectors: ['#contactForm button[type="submit"]'],
        firstUsefulSelectors: ['h1', '#contactForm'],
        headerSelectors: ['header'],
        navSelectors: ['nav[aria-label="Main navigation"]', 'header nav', 'nav'],
        mediaSelectors: [],
        keySelectors: ['h1', '#contactForm label', '#contactForm input', '#contactForm textarea', '#contactForm button', '#contactFormStatus'],
        clipSelectors: ['h1', '#contactForm label', '#contactForm input', '#contactForm textarea', '#contactForm button', '#contactFormStatus'],
        formSelectors: ['#contactForm'],
        statusSelectors: ['#contactFormStatus', '[role="status"]'],
        priceSelectors: []
    },
    legal: {
        heroSelectors: ['.dp-legal-hero', '.container', 'main'],
        cropSelectors: ['.dp-legal-hero', '.container', 'main'],
        primaryCtaSelectors: ['.dp-legal-actions .dp-legal-button--primary', '.dp-bridge a[href*="reserve"]'],
        firstUsefulSelectors: ['h1', '.dp-legal-hero', '.container'],
        headerSelectors: ['.lab-header', 'header', '.dp-bridge'],
        navSelectors: ['nav[aria-label="Main navigation"]', '.dp-bridge', 'header nav', 'nav'],
        mediaSelectors: ['.dp-legal-hero img', '.dp-legal-hero picture img'],
        keySelectors: ['h1', '.dp-legal-actions a', '.dp-legal-panel', '.back-link', '.dp-bridge a'],
        clipSelectors: ['h1', '.dp-legal-actions a', '.dp-legal-panel', '.back-link', '.dp-bridge a'],
        formSelectors: [],
        statusSelectors: [],
        priceSelectors: []
    }
});

function parseArgs(argv) {
    const args = {
        routes: [],
        viewports: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        updateBaselines: false,
        approveBaselinesFrom: '',
        approveLatestClean: false,
        approveCohorts: [],
        approveProfiles: [],
        approveViewports: [],
        allowFindingBaselines: false,
        outputDir: '',
        scope: 'landings',
        includeFleetClicks: true
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--route' && argv[index + 1]) {
            args.routes.push(normalizeRoute(argv[index + 1]));
            index += 1;
            continue;
        }

        if (value === '--viewport' && argv[index + 1]) {
            args.viewports.push(String(argv[index + 1]).trim());
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
            args.scope = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--update-baselines') {
            args.updateBaselines = true;
            continue;
        }

        if (value === '--approve-baselines-from' && argv[index + 1]) {
            args.approveBaselinesFrom = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--approve-latest-clean') {
            args.approveLatestClean = true;
            continue;
        }

        if (value === '--approve-cohort' && argv[index + 1]) {
            args.approveCohorts.push(argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--approve-profile' && argv[index + 1]) {
            args.approveProfiles.push(argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--approve-viewport' && argv[index + 1]) {
            args.approveViewports.push(argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--allow-finding-baselines') {
            args.allowFindingBaselines = true;
            continue;
        }

        if (value === '--no-fleet-clicks') {
            args.includeFleetClicks = false;
        }
    }

    return args;
}

function resolveSelectedViewports(requestedNames) {
    if (!Array.isArray(requestedNames) || requestedNames.length === 0) {
        return VIEWPORTS;
    }

    const normalizedNames = requestedNames.map((value) => String(value || '').trim().toLowerCase());
    const selected = VIEWPORTS.filter((viewport) => normalizedNames.includes(viewport.name.toLowerCase()));

    if (selected.length === 0) {
        throw new Error(`Unknown viewport selection: ${requestedNames.join(', ')}`);
    }

    return selected;
}

function routeFileStem(route) {
    return normalizeRoute(route)
        .replace(/^\//, '')
        .replace(/[\/.]+/g, '-')
        .replace(/^-+/, '') || 'home';
}

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
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

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function readJsonFile(filePath, fallbackValue) {
    if (!filePath || !fs.existsSync(filePath)) {
        return fallbackValue;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function latestVisualAgentRunDir() {
    if (!fs.existsSync(artifactsRoot)) {
        return '';
    }

    const candidates = fs.readdirSync(artifactsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .reverse();

    return candidates.length > 0 ? path.join(artifactsRoot, candidates[0]) : '';
}

function resolveBaselineApprovalRunDir(args = {}) {
    if (args.approveBaselinesFrom) {
        return path.resolve(args.approveBaselinesFrom);
    }

    if (args.approveLatestClean) {
        return latestVisualAgentRunDir();
    }

    return '';
}

function baselineArtifactPath(route, viewport, kind) {
    return path.join(baselineRoot, routeFileStem(route), viewport, `${kind}.png`);
}

function copyFileIfPresent(sourcePath, destinationPath) {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
        return false;
    }

    ensureDir(path.dirname(destinationPath));
    fs.copyFileSync(sourcePath, destinationPath);
    return true;
}

function isOnlyBaselineBootstrapGate(gate) {
    return ['missing_approved_baseline', 'vision_not_configured', 'human_review_required'].includes(gate);
}

function canApprovePageBaseline(page, args = {}) {
    const findings = page.assessment?.findings || [];
    const hardFailCount = (page.assessment?.hardFails || []).length;
    const reviewGates = page.assessment?.reviewGates || [];

    if (hardFailCount > 0 || page.assessment?.status === 'bad') {
        return false;
    }

    if (args.allowFindingBaselines) {
        return true;
    }

    if (findings.length > 0) {
        return false;
    }

    return reviewGates.every((gate) => isOnlyBaselineBootstrapGate(gate));
}

function matchesBaselineApprovalFilters(page, args = {}) {
    if (args.routes?.length > 0 && !args.routes.includes(normalizeRoute(page.route))) {
        return false;
    }

    if (args.approveProfiles?.length > 0 && !args.approveProfiles.includes(page.profile)) {
        return false;
    }

    if (args.approveCohorts?.length > 0 && !args.approveCohorts.includes(classifyRouteCohort(page.route))) {
        return false;
    }

    if (args.approveViewports?.length > 0 && !args.approveViewports.includes(page.viewport)) {
        return false;
    }

    return true;
}

function loadBaselineManifest() {
    return readJsonFile(baselineManifestPath, {
        version: 1,
        updatedAt: '',
        approvals: []
    });
}

function writeBaselineManifest(manifest) {
    ensureDir(path.dirname(baselineManifestPath));
    fs.writeFileSync(baselineManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function approveBaselinesFromRun(args = {}) {
    const sourceRunDir = resolveBaselineApprovalRunDir(args);

    if (!sourceRunDir) {
        throw new Error('No visual agent run directory was provided for baseline approval.');
    }

    const reportPath = path.join(sourceRunDir, 'report.json');
    const report = readJsonFile(reportPath, null);

    if (!report) {
        throw new Error(`Could not read report.json from ${sourceRunDir}`);
    }

    const manifest = loadBaselineManifest();
    const approvalEntries = new Map(
        (manifest.approvals || []).map((entry) => [pageKey(entry.route, entry.viewport), entry])
    );
    const approvedPages = [];
    const skippedPages = [];

    for (const page of report.pages || []) {
        if (!matchesBaselineApprovalFilters(page, args)) {
            continue;
        }

        if (!canApprovePageBaseline(page, args)) {
            skippedPages.push({
                route: page.route,
                viewport: page.viewport,
                reason: 'page_not_clean_enough_for_baseline'
            });
            continue;
        }

        const viewportBaselinePath = baselineArtifactPath(page.route, page.viewport, 'viewport');
        const regionBaselinePath = baselineArtifactPath(page.route, page.viewport, 'region');
        const copiedViewport = copyFileIfPresent(page.artifacts?.viewportScreenshot, viewportBaselinePath);
        const copiedRegion = copyFileIfPresent(page.artifacts?.regionScreenshot, regionBaselinePath);

        if (!copiedViewport) {
            skippedPages.push({
                route: page.route,
                viewport: page.viewport,
                reason: 'missing_viewport_artifact'
            });
            continue;
        }

        approvalEntries.set(pageKey(page.route, page.viewport), {
            route: normalizeRoute(page.route),
            viewport: page.viewport,
            profile: page.profile,
            cohort: classifyRouteCohort(page.route),
            approvedAt: new Date().toISOString(),
            sourceRunDir,
            findingsCount: (page.assessment?.findings || []).length,
            reviewGates: page.assessment?.reviewGates || [],
            viewportBaselinePath,
            regionBaselinePath: copiedRegion ? regionBaselinePath : '',
            sourceViewportScreenshot: page.artifacts?.viewportScreenshot || '',
            sourceRegionScreenshot: page.artifacts?.regionScreenshot || ''
        });

        approvedPages.push({
            route: page.route,
            viewport: page.viewport,
            profile: page.profile,
            cohort: classifyRouteCohort(page.route),
            copiedRegion
        });
    }

    const updatedManifest = {
        version: manifest.version || 1,
        updatedAt: new Date().toISOString(),
        approvals: [...approvalEntries.values()].sort((left, right) => (
            pageKey(left.route, left.viewport).localeCompare(pageKey(right.route, right.viewport))
        ))
    };

    writeBaselineManifest(updatedManifest);

    return {
        mode: 'approve_baselines',
        sourceRunDir,
        baselineRoot,
        approvedCount: approvedPages.length,
        skippedCount: skippedPages.length,
        approvedPages,
        skippedPages
    };
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

function createNetworkTracker(page) {
    const requestFailures = [];
    const criticalResponses = [];

    page.on('requestfailed', (request) => {
        const resourceType = request.resourceType();

        if (['document', 'stylesheet', 'script', 'image', 'media', 'xhr', 'fetch'].includes(resourceType)) {
            requestFailures.push({
                url: request.url(),
                resourceType,
                failureText: request.failure()?.errorText || 'request_failed'
            });
        }
    });

    page.on('response', (response) => {
        if (response.status() >= 400) {
            const request = response.request();
            const resourceType = request.resourceType();

            if (['document', 'stylesheet', 'script', 'image', 'media', 'xhr', 'fetch'].includes(resourceType)) {
                criticalResponses.push({
                    url: response.url(),
                    resourceType,
                    status: response.status()
                });
            }
        }
    });

    return {
        requestFailures,
        criticalResponses
    };
}

async function captureRegionScreenshot(page, selectors, outputPath) {
    for (const selector of selectors || []) {
        const locator = page.locator(selector).first();

        try {
            if (await locator.count() === 0) {
                continue;
            }

            if (!(await locator.isVisible())) {
                continue;
            }

            await locator.screenshot({
                path: outputPath,
                animations: 'disabled',
                caret: 'hide'
            });

            return {
                selector,
                path: outputPath
            };
        } catch (error) {
            if (!/Target closed|captureScreenshot|element is not visible/i.test(String(error && error.message))) {
                throw error;
            }
        }
    }

    return null;
}

function serviceStateScreenshotPath(pageDir, tabId = '') {
    const safeId = String(tabId || 'state')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'state';
    return path.join(pageDir, 'states', `${safeId}.png`);
}

async function collectServiceSelectorStates(page, pageDir) {
    const tabLocator = page.locator('[data-service-selector]');
    const tabCount = await tabLocator.count();

    if (tabCount < 2) {
        return null;
    }

    const stateDir = path.join(pageDir, 'states');
    ensureDir(stateDir);
    const initialActiveId = await page.evaluate(() => (
        document.querySelector('[data-service-selector].is-active')?.id ||
        document.querySelector('[data-service-selector][aria-selected="true"]')?.id ||
        ''
    ));
    const states = [];

    for (let index = 0; index < tabCount; index += 1) {
        const tab = tabLocator.nth(index);
        const tabId = String(await tab.getAttribute('id') || `service-tab-${index}`);
        const tabHref = String(await tab.getAttribute('href') || '');

        await tab.click();
        await page.waitForFunction((expectedId) => {
            const activeTab = document.querySelector('[data-service-selector].is-active') ||
                document.querySelector('[data-service-selector][aria-selected="true"]');
            const panel = document.querySelector('[data-service-panel]');
            return Boolean(
                activeTab &&
                panel &&
                activeTab.id === expectedId &&
                panel.getAttribute('aria-labelledby') === expectedId
            );
        }, tabId);
        await settlePage(page, 60);

        const stateMetrics = await page.evaluate((expectedId) => {
            function rectData(element) {
                if (!element) {
                    return null;
                }

                const rect = element.getBoundingClientRect();
                return {
                    top: Number(rect.top.toFixed(2)),
                    right: Number(rect.right.toFixed(2)),
                    bottom: Number(rect.bottom.toFixed(2)),
                    left: Number(rect.left.toFixed(2)),
                    width: Number(rect.width.toFixed(2)),
                    height: Number(rect.height.toFixed(2))
                };
            }

            const panel = document.querySelector('[data-service-panel]');
            const copy = panel?.querySelector('[data-service-copy]') || null;
            const title = panel?.querySelector('[data-service-title]') || null;
            const primary = panel?.querySelector('[data-service-primary]') || null;
            const side = panel?.querySelector('.services-hero__feature-side') || null;
            const copyBlock = panel?.querySelector('.services-hero__feature-copy') || null;
            const points = Array.from(panel?.querySelectorAll('[data-service-point]') || []);
            const activeTab = document.querySelector('[data-service-selector].is-active') ||
                document.querySelector('[data-service-selector][aria-selected="true"]');
            const visiblePoints = points.filter((element) => !element.hidden && String(element.textContent || '').trim().length > 0);
            const viewportHeight = window.innerHeight || 1;
            const copyRect = rectData(copyBlock);
            const sideRect = rectData(side);
            const panelRect = rectData(panel);
            const featureGapPx = copyRect && sideRect ? Math.max(0, sideRect.left - copyRect.right) : 0;
            const featureGapRatio = panelRect?.width ? featureGapPx / panelRect.width : 0;

            return {
                tabId: expectedId,
                activeTabId: activeTab?.id || '',
                titleText: String(title?.textContent || '').trim(),
                copyText: String(copy?.textContent || '').trim(),
                primaryHref: String(primary?.getAttribute('href') || ''),
                pointCount: visiblePoints.length,
                panelRect,
                copyRect,
                sideRect,
                headingTopRatio: title ? Number((title.getBoundingClientRect().top / viewportHeight).toFixed(3)) : 0,
                featureGapRatio: Number(featureGapRatio.toFixed(3))
            };
        }, tabId);

        const screenshotPath = serviceStateScreenshotPath(pageDir, tabId);
        await page.screenshot({
            path: screenshotPath,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        });

        states.push({
            ...stateMetrics,
            tabHref,
            screenshotPath
        });
    }

    if (initialActiveId && states[states.length - 1]?.tabId !== initialActiveId) {
        await page.locator(`#${initialActiveId}`).click();
        await page.waitForFunction((expectedId) => {
            const activeTab = document.querySelector('[data-service-selector].is-active') ||
                document.querySelector('[data-service-selector][aria-selected="true"]');
            return activeTab?.id === expectedId;
        }, initialActiveId);
        await settlePage(page, 60);
    }

    return {
        initialActiveId,
        states
    };
}

function buildServiceInteractionFindings({ route, viewportName, serviceSelectorStates, screenshotPath }) {
    const findings = [];
    const states = serviceSelectorStates?.states || [];

    if (states.length < 2) {
        return findings;
    }

    const inactiveState = states.find((state) => state.activeTabId !== state.tabId);
    if (inactiveState) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'Clicking a service circle did not activate the matching state.',
            evidence: `tabId=${inactiveState.tabId}; activeTabId=${inactiveState.activeTabId}`,
            likelyCause: 'The selector state is not updating reliably after interaction.',
            screenshotPath: inactiveState.screenshotPath || screenshotPath,
            source: 'interaction'
        }));
    }

    const missingContentState = states.find((state) => (
        !state.titleText ||
        !state.copyText ||
        !state.primaryHref ||
        state.pointCount < 2
    ));
    if (missingContentState) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'A service selector state is missing key panel content after interaction.',
            evidence: `tabId=${missingContentState.tabId}; title=${Boolean(missingContentState.titleText)}; copy=${Boolean(missingContentState.copyText)}; primaryHref=${missingContentState.primaryHref || 'missing'}; pointCount=${missingContentState.pointCount}`,
            likelyCause: 'One of the selector states is not fully wired to the shared panel content.',
            screenshotPath: missingContentState.screenshotPath || screenshotPath,
            source: 'interaction'
        }));
    }

    const uniqueTitleCount = uniqueValues(states.map((state) => state.titleText)).length;
    const normalizedPrimaryHrefs = states.map((state) => normalizeServiceStateHref(state.primaryHref));
    const uniqueHrefCount = uniqueValues(normalizedPrimaryHrefs).length;
    const hrefMismatch = states.find((state) => (
        state.tabHref &&
        state.primaryHref &&
        normalizeServiceStateHref(state.tabHref) !== normalizeServiceStateHref(state.primaryHref)
    ));

    if (uniqueTitleCount < states.length || uniqueHrefCount < states.length || hrefMismatch) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: hrefMismatch ? 'high' : 'medium',
            category: 'interaction_state',
            message: 'Different service circles are not switching the panel to clearly distinct destinations.',
            evidence: [
                uniqueTitleCount < states.length ? `uniqueTitles=${uniqueTitleCount}/${states.length}` : '',
                uniqueHrefCount < states.length ? `uniquePrimaryHrefs=${uniqueHrefCount}/${states.length}` : '',
                hrefMismatch ? `hrefMismatch=${hrefMismatch.tabId}:${hrefMismatch.tabHref}->${hrefMismatch.primaryHref}` : ''
            ].filter(Boolean).join('; '),
            likelyCause: 'Multiple circles are resolving to duplicated content or the primary CTA is not following the selected service.',
            screenshotPath: hrefMismatch?.screenshotPath || screenshotPath,
            source: 'interaction'
        }));
    }

    const panelHeights = states.map((state) => Number(state.panelRect?.height || 0)).filter((value) => value > 0);
    const headingRatios = states.map((state) => Number(state.headingTopRatio || 0)).filter((value) => value > 0);
    const gapRatios = states.map((state) => Number(state.featureGapRatio || 0)).filter((value) => value >= 0);
    const panelHeightSpread = panelHeights.length ? Math.max(...panelHeights) - Math.min(...panelHeights) : 0;
    const headingSpread = headingRatios.length ? Math.max(...headingRatios) - Math.min(...headingRatios) : 0;
    const maxGapRatio = gapRatios.length ? Math.max(...gapRatios) : 0;

    if (panelHeightSpread > 32 || headingSpread > 0.08 || maxGapRatio > 0.18) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: maxGapRatio > 0.22 ? 'high' : 'medium',
            category: 'interaction_state',
            message: 'Service selector states are not visually homogeneous after clicking through the circles.',
            evidence: `panelHeightSpread=${panelHeightSpread.toFixed(2)}; headingSpread=${headingSpread.toFixed(3)}; maxGapRatio=${maxGapRatio.toFixed(3)}`,
            likelyCause: 'At least one service state has drifted away from the shared panel rhythm and no longer matches the others cleanly.',
            screenshotPath: states.find((state) => Number(state.featureGapRatio || 0) === maxGapRatio)?.screenshotPath || screenshotPath,
            source: 'interaction'
        }));
    }

    return findings;
}

async function collectVisualMetrics(page, profile) {
    const profileSelectors = PROFILE_SELECTORS[profile] || PROFILE_SELECTORS.hub_marketing;

    return page.evaluate(({ profileName, selectors }) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const root = document.documentElement;
        const body = document.body;

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) {
                return false;
            }

            return rect.width >= 4 && rect.height >= 4;
        }

        function selectorElements(selectorList, limit = 20) {
            const collected = [];
            const seen = new Set();

            for (const selector of selectorList || []) {
                const elements = Array.from(document.querySelectorAll(selector));

                for (const element of elements) {
                    if (!(element instanceof HTMLElement) || !isVisible(element) || seen.has(element)) {
                        continue;
                    }

                    seen.add(element);
                    collected.push(element);

                    if (collected.length >= limit) {
                        return collected;
                    }
                }
            }

            return collected;
        }

        function firstVisible(selectorList) {
            return selectorElements(selectorList, 1)[0] || null;
        }

        function rectData(element) {
            if (!element) {
                return null;
            }

            const rect = element.getBoundingClientRect();
            return {
                top: Number(rect.top.toFixed(2)),
                right: Number(rect.right.toFixed(2)),
                bottom: Number(rect.bottom.toFixed(2)),
                left: Number(rect.left.toFixed(2)),
                width: Number(rect.width.toFixed(2)),
                height: Number(rect.height.toFixed(2))
            };
        }

        function collectFleetFirstRowMetrics() {
            const cards = selectorElements(['.js-fleet-card'], 12)
                .map((element) => {
                    const rect = element.getBoundingClientRect();
                    return {
                        top: rect.top,
                        right: rect.right,
                        bottom: rect.bottom,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    };
                })
                .filter((card) => card.width >= 40 && card.height >= 40 && card.bottom > 0 && card.top < viewportHeight);

            if (cards.length === 0) {
                return null;
            }

            const firstRowTop = Math.min(...cards.map((card) => card.top));
            const firstRow = cards.filter((card) => Math.abs(card.top - firstRowTop) <= 24);

            if (firstRow.length === 0) {
                return null;
            }

            const left = Math.min(...firstRow.map((card) => card.left));
            const right = Math.max(...firstRow.map((card) => card.right));
            const topSpreadPx = Math.max(...firstRow.map((card) => card.top)) - Math.min(...firstRow.map((card) => card.top));

            return {
                rowCount: firstRow.length,
                rowSpanPx: Number((right - left).toFixed(2)),
                rowSpanRatio: Number(((right - left) / viewportWidth).toFixed(3)),
                topSpreadPx: Number(topSpreadPx.toFixed(2)),
                bottomRatio: Number((Math.max(...firstRow.map((card) => card.bottom)) / viewportHeight).toFixed(3))
            };
        }

        function buildLabel(element) {
            const tagName = element.tagName.toLowerCase();
            const idPart = element.id ? `#${element.id}` : '';
            const classPart = String(element.className || '')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 3)
                .map((token) => `.${token}`)
                .join('');
            const text = (element.innerText || element.textContent || '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 80);

            return `${tagName}${idPart}${classPart}${text ? ` :: ${text}` : ''}`;
        }

        function classSignature(element) {
            if (!(element instanceof HTMLElement)) {
                return 'none';
            }

            const classTokens = String(element.className || '')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 4)
                .join('.');

            return `${element.tagName.toLowerCase()}${classTokens ? `.${classTokens}` : ''}`;
        }

        function normalizeHref(href) {
            if (!href) {
                return '';
            }

            try {
                const url = new URL(href, window.location.href);
                return url.pathname === '/index.html' ? '/' : url.pathname;
            } catch (error) {
                return '';
            }
        }

        function collectRoutes(selectorList, limit = 20) {
            const routes = [];
            const seen = new Set();

            for (const selector of selectorList || []) {
                const elements = Array.from(document.querySelectorAll(selector));

                for (const element of elements) {
                    const anchor = element instanceof HTMLAnchorElement
                        ? element
                        : element.querySelector('a[href]');
                    const route = normalizeHref(anchor?.getAttribute('href') || anchor?.href || '');

                    if (!route || seen.has(route)) {
                        continue;
                    }

                    seen.add(route);
                    routes.push(route);

                    if (routes.length >= limit) {
                        return routes;
                    }
                }
            }

            return routes;
        }

        function primaryText(element) {
            return String(element?.innerText || element?.textContent || '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 80);
        }

        function normalizedFontFamily(value) {
            return String(value || '')
                .split(',')[0]
                .replace(/["']/g, '')
                .trim()
                .toLowerCase();
        }

        function uniqueValues(list) {
            return [...new Set((list || []).filter(Boolean))];
        }

        function parsePx(value) {
            const parsed = Number.parseFloat(String(value || '').replace('px', '').trim());
            return Number.isFinite(parsed) ? parsed : 0;
        }

        function styleValue(element, propertyName) {
            return element instanceof HTMLElement ? window.getComputedStyle(element)[propertyName] : '';
        }

        function parseColorChannels(value) {
            const match = String(value || '').match(/rgba?\(([^)]+)\)/i);

            if (!match) {
                return null;
            }

            const parts = match[1]
                .split(',')
                .map((part) => Number.parseFloat(part.trim()))
                .filter((part) => Number.isFinite(part));

            if (parts.length < 3) {
                return null;
            }

            return parts.slice(0, 3);
        }

        function toLinearChannel(channel) {
            const normalized = channel / 255;
            return normalized <= 0.03928
                ? normalized / 12.92
                : Math.pow((normalized + 0.055) / 1.055, 2.4);
        }

        function relativeLuminance(channels) {
            if (!channels) {
                return 0;
            }

            const [red, green, blue] = channels;
            return (
                (0.2126 * toLinearChannel(red)) +
                (0.7152 * toLinearChannel(green)) +
                (0.0722 * toLinearChannel(blue))
            );
        }

        function looksLikeNeonLime(channels) {
            if (!channels) {
                return false;
            }

            const [red, green, blue] = channels;
            return red >= 165 && green >= 205 && blue <= 120;
        }

        function luminanceBucket(value) {
            if (!Number.isFinite(value)) {
                return 'unknown';
            }

            if (value >= 0.82) {
                return 'very_light';
            }

            if (value >= 0.62) {
                return 'light';
            }

            if (value >= 0.32) {
                return 'mid';
            }

            if (value > 0.08) {
                return 'dark';
            }

            return 'very_dark';
        }

        function borderRadiusPx(element) {
            if (!(element instanceof HTMLElement)) {
                return 0;
            }

            const style = window.getComputedStyle(element);
            return Number(parsePx(style.borderTopLeftRadius).toFixed(2));
        }

        function firstStyleMatch(selectorList) {
            for (const selector of selectorList || []) {
                const match = firstVisible([selector]);

                if (match) {
                    return match;
                }
            }

            return null;
        }

        function buttonStyleFingerprint(element) {
            if (!(element instanceof HTMLElement) || !isVisible(element)) {
                return '';
            }

            const style = window.getComputedStyle(element);
            const borderWidth = parsePx(style.borderTopWidth);
            const backgroundLuminance = relativeLuminance(parseColorChannels(style.backgroundColor));

            return [
                normalizedFontFamily(style.fontFamily),
                Math.round(parsePx(style.fontSize)),
                Number(parsePx(style.letterSpacing).toFixed(2)),
                String(style.textTransform || 'none').toLowerCase(),
                Math.round(borderRadiusPx(element)),
                borderWidth > 0 ? 'bordered' : 'plain',
                luminanceBucket(backgroundLuminance)
            ].join('|');
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

            return 'generic';
        }

        function inferHeaderFamily() {
            if (document.querySelector('.lab-header')) {
                return 'lab-header';
            }

            if (document.querySelector('.site-header')) {
                return 'site-header';
            }

            if (document.querySelector('header')) {
                return 'header';
            }

            return 'none';
        }

        function metricsRatio(element, dimension, divisor) {
            if (!(element instanceof HTMLElement) || !divisor) {
                return 0;
            }

            const rect = element.getBoundingClientRect();
            const value = typeof rect[dimension] === 'number' ? rect[dimension] : 0;
            return Number((value / divisor).toFixed(4));
        }

        function clipDetails(element) {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const horizontalOutsidePx = Math.max(0, -rect.left) + Math.max(0, rect.right - viewportWidth);
            const intersectsViewportVertically = rect.bottom > 0 && rect.top < viewportHeight;
            const verticalOutsidePx = intersectsViewportVertically
                ? Math.max(0, -rect.top) + Math.max(0, rect.bottom - viewportHeight)
                : 0;
            const outsideViewportPx = horizontalOutsidePx + verticalOutsidePx;
            const overflowStyle = `${style.overflow} ${style.overflowX} ${style.overflowY}`.toLowerCase();
            const allowsClipping = /(hidden|clip)/.test(overflowStyle) || style.textOverflow === 'ellipsis';
            const singleLine = String(style.whiteSpace || '').includes('nowrap');
            const lineClamp = Number.parseInt(style.webkitLineClamp || '0', 10);
            const textOverflow = (
                allowsClipping &&
                (
                    (singleLine && element.scrollWidth > element.clientWidth + 2) ||
                    (lineClamp > 0 && element.scrollHeight > element.clientHeight + 2)
                )
            );

            return {
                selectorLabel: buildLabel(element),
                outsideViewportPx: Number(outsideViewportPx.toFixed(2)),
                textOverflow,
                rect: rectData(element)
            };
        }

        function overlapDetails(elements) {
            const overlaps = [];

            for (let leftIndex = 0; leftIndex < elements.length; leftIndex += 1) {
                const left = elements[leftIndex];
                const leftRect = left.getBoundingClientRect();

                for (let rightIndex = leftIndex + 1; rightIndex < elements.length; rightIndex += 1) {
                    const right = elements[rightIndex];

                    if (left.contains(right) || right.contains(left)) {
                        continue;
                    }

                    const rightRect = right.getBoundingClientRect();
                    const overlapWidth = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
                    const overlapHeight = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);

                    if (overlapWidth > 8 && overlapHeight > 8) {
                        overlaps.push({
                            left: buildLabel(left),
                            right: buildLabel(right),
                            overlapWidth: Number(overlapWidth.toFixed(2)),
                            overlapHeight: Number(overlapHeight.toFixed(2))
                        });
                    }
                }
            }

            return overlaps.slice(0, 12);
        }

        function hasBackgroundVisualSignal(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const nodes = [element, ...Array.from(element.querySelectorAll('*')).slice(0, 12)];

            return nodes.some((node) => {
                if (!(node instanceof HTMLElement) || !isVisible(node)) {
                    return false;
                }

                const style = window.getComputedStyle(node);
                return Boolean(style.backgroundImage && style.backgroundImage !== 'none');
            });
        }

        function brokenMediaDetails(elements) {
            const details = [];

            for (const element of elements) {
                if (element instanceof HTMLImageElement) {
                    if (element.complete && element.naturalWidth === 0) {
                        details.push({
                            label: buildLabel(element),
                            type: 'image',
                            src: element.currentSrc || element.getAttribute('src') || '',
                            reason: 'naturalWidth=0'
                        });
                    }
                    continue;
                }

                if (element instanceof HTMLVideoElement) {
                    const sourceElement = element.querySelector('source');
                    const source = element.currentSrc || sourceElement?.getAttribute('src') || '';

                    if (source && element.readyState === 0) {
                        details.push({
                            label: buildLabel(element),
                            type: 'video',
                            src: source,
                            reason: 'readyState=0'
                        });
                    }
                }
            }

            return details;
        }

        function isImmediateHeroAction(element) {
            if (!(element instanceof HTMLElement) || !isVisible(element)) {
                return false;
            }

            if (element.closest(
                '.breadcrumb, .about-breadcrumb, .locations-breadcrumb, .local-guide-breadcrumb, .service-detail-breadcrumb, [aria-label=\"Breadcrumb\"], [aria-label=\"breadcrumb\"], .locations-hero__zone-list, .lab-nav__panel, .services-hero__selector, .services-hero__note, [role=\"tablist\"]'
            )) {
                return false;
            }

            if (element.matches('button')) {
                return true;
            }

            const className = String(element.className || '');
            const hasActionClass = /(btn|button|action|cta|primary|secondary|ghost)/i.test(className);
            const insideActionGroup = Boolean(element.closest(
                '.about-hero__actions, .locations-hero__actions, .services-hero__feature-actions, .local-guide-hero__actions, .service-detail-actions, .hero-lab__actions, .vehicle-hero__actions'
            ));

            return hasActionClass || insideActionGroup;
        }

        const header = firstVisible(selectors.headerSelectors);
        const nav = firstVisible(selectors.navSelectors);
        const hero = firstVisible(selectors.heroSelectors);
        const firstUseful = firstVisible(selectors.firstUsefulSelectors);
        const primaryCta = firstVisible(selectors.primaryCtaSelectors);
        const price = firstVisible(selectors.priceSelectors);
        const form = firstVisible(selectors.formSelectors);
        const status = firstVisible(selectors.statusSelectors);
        const visibleH1 = selectorElements(['h1'], 6);
        const mediaElements = selectorElements(selectors.mediaSelectors, 12);
        const keyElements = selectorElements([
            ...(selectors.clipSelectors || selectors.keySelectors || []),
            ...selectors.primaryCtaSelectors,
            ...selectors.priceSelectors,
            ...selectors.statusSelectors
        ], 24);
        const cardElements = selectorElements(selectors.cardSelectors || [], 8);
        const heroActions = hero ? Array.from(hero.querySelectorAll('a[href], button')).filter((element) => isImmediateHeroAction(element)) : [];
        const hasBackgroundVisual = hasBackgroundVisualSignal(hero);
        const clippedElements = keyElements
            .map((element) => clipDetails(element))
            .filter((entry) => entry.outsideViewportPx > 4 || entry.textOverflow)
            .slice(0, 16);
        const brokenMedia = brokenMediaDetails(mediaElements);
        const cardHeights = cardElements.map((card) => Number(card.getBoundingClientRect().height.toFixed(2)));
        const missingCardPriceCount = cardElements.filter((card) => !card.querySelector('.fleet-card__price-value')).length;
        const missingCardPrimaryCount = cardElements.filter((card) => !card.querySelector('.fleet-card__primary')).length;
        const navBrandRoutes = collectRoutes(['.lab-nav__card--brand'], 16);
        const navTypeRoutes = collectRoutes(['.lab-nav__card--type'], 16);
        const homeCategoryRoutes = collectRoutes(['.fleet-category a', '.fleet-categories a'], 16);
        const fleetCardRoutes = collectRoutes(['.js-fleet-card .fleet-card__title a', '.js-fleet-card .fleet-card__media'], 16);
        const templateFamily = inferTemplateFamily();
        const headerFamily = inferHeaderFamily();
        const headingStyle = visibleH1[0] ? window.getComputedStyle(visibleH1[0]) : null;
        const primaryCtaStyle = primaryCta ? window.getComputedStyle(primaryCta) : null;
        const bodyTextElement = firstStyleMatch([
            '.hero-lab__lead',
            '.about-hero__lead',
            '.locations-hero__lead',
            '.services-hero__lead',
            '.local-guide-hero__lead',
            '.service-detail-hero__lead',
            '.vehicle-hero__lead',
            '.contact-hero__lead',
            '.lead',
            '.sublead',
            'main p',
            'main li',
            'main label'
        ]);
        const inputElement = firstStyleMatch([
            '#contactForm input',
            '#contactForm select',
            '#contactForm textarea',
            '.reserve-container input',
            '.reserve-container select',
            '.reserve-container textarea',
            'main input:not([type="hidden"])',
            'main select',
            'main textarea'
        ]);
        const cardElement = firstStyleMatch([
            '.contact-form-card',
            '.info-card',
            '.fleet-visual-card',
            '.catalog-card',
            '.vehicle-booking',
            '.about-proof',
            '.about-media',
            '.service-card',
            '.location-card',
            'article[class*="card"]',
            'div[class*="card"]'
        ]);
        const servicesSelector = firstVisible(['.services-hero__selector']);
        const servicesFeature = firstVisible(['.services-hero__feature']);
        const servicesFeatureMain = firstVisible(['.services-hero__feature-main']);
        const servicesFeatureCopy = firstVisible(['.services-hero__feature-copy']);
        const servicesFeatureList = firstVisible(['.services-hero__feature-list']);
        const servicesFeatureSide = firstVisible(['.services-hero__feature-side']);
        const servicesDirectoryShell = firstVisible(['.services-directory__shell']);
        const servicesFlowShell = firstVisible(['.services-flow__shell']);
        const servicesFaqShell = firstVisible(['.services-faq__shell']);
        const servicesOrbMediaRects = selectorElements(['.services-lane-orb__media'], 8)
            .map((element) => rectData(element))
            .filter(Boolean);
        const locationsSummary = firstVisible(['.locations-hero__summary']);
        const locationsMapCard = firstVisible(['.locations-map-card']);
        const locationsHeroShell = firstVisible(['.locations-hero__shell']);
        const homeContentBox = firstVisible(['.hero-lab__content-box']);
        const homeHeroShell = firstVisible(['.hero-lab__shell']);
        const contactIntro = firstVisible(['.contact-hero__intro']);
        const contactFormCard = firstVisible(['.contact-form-card']);
        const contactHeroShell = firstVisible(['.contact-hero__shell']);
        const reserveStep1Layout = firstVisible([
            '#step1.step-content.active .step2-layout',
            '#step1 .step2-layout',
            '.step2-layout',
            '.step1-layout'
        ]);
        const reserveStep1Main = firstVisible([
            '#step1.step-content.active .step2-main',
            '#step1 .step2-main',
            '.step2-main',
            '.step1-main'
        ]);
        const reserveStep1Side = firstVisible([
            '#step1.step-content.active .step2-side',
            '#step1 .step2-side',
            '.step2-side',
            '.step1-side'
        ]);
        const reserveIntro = firstVisible(['.reserve-page-intro']);
        const reserveIntroCopy = firstVisible(['.reserve-page-intro__copy']);
        const reserveIntroPanel = firstVisible(['.reserve-page-panel']);
        const reservePageHeading = firstVisible(['.reserve-page-heading']);
        const reserveStartDate = firstVisible(['#startDate']);
        const reservePickupLocation = firstVisible(['#pickupLocation']);
        const vehicleHeroMedia = firstVisible(['.vehicle-hero__media', '.vehicle-pdp-gallery-top__stage']);
        const vehicleHeroSupport = firstVisible(['.vehicle-pdp-hero-support', '.vehicle-booking']);
        const vehicleBooking = firstVisible(['.vehicle-booking']);
        const fleetGrid = firstVisible(['.js-fleet-grid']);
        const fleetFirstRowMetrics = collectFleetFirstRowMetrics();
        const mainNav = firstVisible(['nav[aria-label="Main navigation"]', '.lab-header .lab-nav']);
        const buttonElements = selectorElements([
            '.hero-lab__actions a',
            '.hero-lab__actions button',
            '.about-hero__actions a',
            '.services-hero__feature-actions a',
            '.locations-hero__actions a',
            '.local-guide-hero__actions a',
            '.service-detail-actions a',
            '.vehicle-hero__actions a',
            '.contact-hero__actions a',
            '#contactForm button',
            '#contactForm a',
            '.reserve-container button',
            '.reserve-container a[href]',
            'main a.btn',
            'main button'
        ], 24).filter((element) => (
            isVisible(element) &&
            !element.closest('header, nav, .breadcrumb, .about-breadcrumb, .locations-breadcrumb, .local-guide-breadcrumb, .service-detail-breadcrumb, [aria-label="Breadcrumb"], [aria-label="breadcrumb"], .lab-nav__panel')
        ));
        const bodyTextStyle = bodyTextElement ? window.getComputedStyle(bodyTextElement) : null;
        const inputStyle = inputElement ? window.getComputedStyle(inputElement) : null;
        const cardStyle = cardElement ? window.getComputedStyle(cardElement) : null;
        const bookingCardStyle = vehicleBooking ? window.getComputedStyle(vehicleBooking) : null;
        const headingFontFamily = normalizedFontFamily(headingStyle?.fontFamily || '');
        const bodyFontFamily = normalizedFontFamily(bodyTextStyle?.fontFamily || '');
        const headingColorChannels = parseColorChannels(headingStyle?.color || '');
        const bodyTextColorChannels = parseColorChannels(bodyTextStyle?.color || '');
        const primaryCtaBackgroundChannels = parseColorChannels(primaryCtaStyle?.backgroundColor || '');
        const bodyBackgroundChannels = parseColorChannels(styleValue(body, 'backgroundColor'));
        const heroBackgroundChannels = parseColorChannels(styleValue(hero, 'backgroundColor'));
        const inputBackgroundChannels = parseColorChannels(inputStyle?.backgroundColor || '');
        const cardBackgroundChannels = parseColorChannels(cardStyle?.backgroundColor || '');
        const bookingBackgroundChannels = parseColorChannels(bookingCardStyle?.backgroundColor || '');
        const bodyBackgroundLuminance = relativeLuminance(bodyBackgroundChannels);
        const heroBackgroundLuminance = relativeLuminance(heroBackgroundChannels);
        const headingColorLuminance = relativeLuminance(headingColorChannels);
        const bodyTextColorLuminance = relativeLuminance(bodyTextColorChannels);
        const inputBackgroundLuminance = relativeLuminance(inputBackgroundChannels);
        const cardBackgroundLuminance = relativeLuminance(cardBackgroundChannels);
        const bookingBackgroundLuminance = relativeLuminance(bookingBackgroundChannels);
        const usesOrbitron = headingFontFamily.includes('orbitron');
        const usesSharedLabHeader = headerFamily === 'lab-header';
        const darkBody = bodyBackgroundLuminance > 0 && bodyBackgroundLuminance < 0.22;
        const lightBody = bodyBackgroundLuminance >= 0.72;
        const isMotherBaseVehicle = body.classList.contains('vehicle-page--mother-base');
        const isPremiumPilotVehicle = body.classList.contains('vehicle-page--premium-pilot');
        const uppercaseHeading = String(headingStyle?.textTransform || '').toLowerCase() === 'uppercase';
        const buttonStyleFingerprints = uniqueValues(buttonElements.map((element) => buttonStyleFingerprint(element))).slice(0, 8);
        const headingInsideHeroMedia = Boolean(
            visibleH1[0]?.closest(
                '.vehicle-hero__media, .services-hero, .services-hero__media, .hero-lab, .hero-lab__media, .about-hero, .about-hero__media, .locations-hero, .locations-hero__media, .local-guide-hero, .local-guide-hero__media, .service-detail-hero, .service-detail-hero__media'
            )
        );
        const neonSignalCount = [
            usesOrbitron,
            looksLikeNeonLime(headingColorChannels),
            looksLikeNeonLime(primaryCtaBackgroundChannels),
            darkBody,
            !usesSharedLabHeader && ['contact_form', 'generic'].includes(templateFamily),
            uppercaseHeading
        ].filter(Boolean).length;

        let visualIntent = 'unknown';

        if (templateFamily === 'legacy_brand_catalog' || neonSignalCount >= 4) {
            visualIntent = 'legacy_dark_neon';
        } else if (isMotherBaseVehicle || isPremiumPilotVehicle) {
            visualIntent = 'modern_light_system';
        } else if (
            usesSharedLabHeader &&
            (bodyBackgroundLuminance >= 0.68 || headingColorLuminance < 0.22)
        ) {
            visualIntent = 'modern_light_system';
        } else if (
            usesSharedLabHeader &&
            bodyBackgroundLuminance < 0.68
        ) {
            visualIntent = 'modern_dark_system';
        } else if (templateFamily === 'contact_form' && neonSignalCount >= 3) {
            visualIntent = 'legacy_dark_neon';
        }

        let headerOcclusionPx = 0;

        if (header && firstUseful) {
            const headerStyle = window.getComputedStyle(header);

            if (/(sticky|fixed)/.test(headerStyle.position)) {
                headerOcclusionPx = Math.max(0, header.getBoundingClientRect().bottom - firstUseful.getBoundingClientRect().top);
            }
        }

        return {
            profile: profileName,
            viewportWidth,
            viewportHeight,
            horizontalOverflowPx: Math.max(
                0,
                root.scrollWidth - viewportWidth,
                (body ? body.scrollWidth : 0) - viewportWidth
            ),
            h1Count: document.querySelectorAll('h1').length,
            visibleH1Count: visibleH1.length,
            hasNav: Boolean(nav),
            mainNavLinkCount: mainNav ? mainNav.querySelectorAll('a[href], button').length : 0,
            hasVisualMedia: (mediaElements.length > 0 && brokenMedia.length < mediaElements.length) || hasBackgroundVisual,
            heroActionCount: heroActions.length,
            heroActionLabels: heroActions.map((element) => primaryText(element)).filter(Boolean).slice(0, 4),
            heroRect: rectData(hero),
            headingRect: rectData(visibleH1[0] || null),
            primaryCtaRect: rectData(primaryCta),
            primaryCtaLabel: primaryText(primaryCta),
            priceRect: rectData(price),
            firstUsefulRect: rectData(firstUseful),
            formRect: rectData(form),
            statusRect: rectData(status),
            headerOcclusionPx: Number(headerOcclusionPx.toFixed(2)),
            clippedElements,
            overlaps: overlapDetails(keyElements.slice(0, 12)),
            brokenMedia,
            cardHeightSpread: cardHeights.length ? Number((Math.max(...cardHeights) - Math.min(...cardHeights)).toFixed(2)) : 0,
            visibleCardCount: cardElements.length,
            missingCardPriceCount,
            missingCardPrimaryCount,
            templateFamily,
            headerFamily,
            headerSignature: classSignature(header),
            heroSignature: classSignature(hero),
            primaryCtaSignature: classSignature(primaryCta),
            bodyClassSignature: body ? String(body.className || '').split(/\s+/).filter(Boolean).slice(0, 6).join('.') : '',
            headingColor: headingStyle?.color || '',
            headingFontFamily,
            headingTextTransform: headingStyle?.textTransform || '',
            bodyFontFamily,
            bodyFontSizePx: Number(parsePx(bodyTextStyle?.fontSize).toFixed(2)),
            bodyLineHeightPx: Number(parsePx(bodyTextStyle?.lineHeight).toFixed(2)),
            bodyLetterSpacingPx: Number(parsePx(bodyTextStyle?.letterSpacing).toFixed(2)),
            bodyTextColor: bodyTextStyle?.color || '',
            primaryCtaBackground: primaryCtaStyle?.backgroundColor || '',
            primaryCtaBorderColor: primaryCtaStyle?.borderColor || '',
            primaryCtaColor: primaryCtaStyle?.color || '',
            primaryCtaRadiusPx: Number(borderRadiusPx(primaryCta).toFixed(2)),
            primaryCtaFontFamily: normalizedFontFamily(primaryCtaStyle?.fontFamily || ''),
            primaryCtaLetterSpacingPx: Number(parsePx(primaryCtaStyle?.letterSpacing).toFixed(2)),
            primaryCtaTextTransform: primaryCtaStyle?.textTransform || '',
            bodyBackground: styleValue(body, 'backgroundColor'),
            heroBackground: styleValue(hero, 'backgroundColor'),
            bodyBackgroundLuminance: Number(bodyBackgroundLuminance.toFixed(4)),
            bookingBackgroundLuminance: Number(bookingBackgroundLuminance.toFixed(4)),
            heroBackgroundLuminance: Number(heroBackgroundLuminance.toFixed(4)),
            headingColorLuminance: Number(headingColorLuminance.toFixed(4)),
            bodyTextColorLuminance: Number(bodyTextColorLuminance.toFixed(4)),
            inputRadiusPx: Number(borderRadiusPx(inputElement).toFixed(2)),
            inputBackground: inputStyle?.backgroundColor || '',
            inputBackgroundLuminance: Number(inputBackgroundLuminance.toFixed(4)),
            cardRadiusPx: Number(borderRadiusPx(cardElement).toFixed(2)),
            cardBackground: cardStyle?.backgroundColor || '',
            cardBackgroundLuminance: Number(cardBackgroundLuminance.toFixed(4)),
            buttonFamilyCount: buttonStyleFingerprints.length,
            buttonStyleFingerprints,
            usesOrbitron,
            usesSharedLabHeader,
            visualIntent,
            headingInsideHeroMedia,
            headingTopRatio: metricsRatio(visibleH1[0] || null, 'top', viewportHeight),
            heroCoverageRatio: metricsRatio(hero, 'height', viewportHeight),
            primaryCtaTopRatio: metricsRatio(primaryCta, 'top', viewportHeight),
            servicesSelectorRect: rectData(servicesSelector),
            servicesOrbMetrics: servicesOrbMediaRects.length ? {
                count: servicesOrbMediaRects.length,
                minWidthPx: Number(Math.min(...servicesOrbMediaRects.map((rect) => rect.width)).toFixed(2)),
                averageWidthPx: Number((servicesOrbMediaRects.reduce((sum, rect) => sum + rect.width, 0) / servicesOrbMediaRects.length).toFixed(2)),
                maxWidthPx: Number(Math.max(...servicesOrbMediaRects.map((rect) => rect.width)).toFixed(2))
            } : null,
            servicesFeatureRect: rectData(servicesFeature),
            servicesFeatureMainRect: rectData(servicesFeatureMain),
            servicesFeatureCopyRect: rectData(servicesFeatureCopy),
            servicesFeatureListRect: rectData(servicesFeatureList),
            servicesFeatureSideRect: rectData(servicesFeatureSide),
            servicesDirectoryShellRect: rectData(servicesDirectoryShell),
            servicesFlowShellRect: rectData(servicesFlowShell),
            servicesFaqShellRect: rectData(servicesFaqShell),
            locationsSummaryRect: rectData(locationsSummary),
            locationsMapRect: rectData(locationsMapCard),
            locationsHeroShellRect: rectData(locationsHeroShell),
            homeContentBoxRect: rectData(homeContentBox),
            homeHeroShellRect: rectData(homeHeroShell),
            contactIntroRect: rectData(contactIntro),
            contactFormCardRect: rectData(contactFormCard),
            contactHeroShellRect: rectData(contactHeroShell),
            reserveStep1LayoutRect: rectData(reserveStep1Layout),
            reserveStep1MainRect: rectData(reserveStep1Main),
            reserveStep1SideRect: rectData(reserveStep1Side),
            reserveIntroRect: rectData(reserveIntro),
            reserveIntroCopyRect: rectData(reserveIntroCopy),
            reserveIntroPanelRect: rectData(reserveIntroPanel),
            reservePageHeadingRect: rectData(reservePageHeading),
            reserveStartDateRect: rectData(reserveStartDate),
            reservePickupLocationRect: rectData(reservePickupLocation),
            vehicleHeroMediaRect: rectData(vehicleHeroMedia),
            vehicleHeroSupportRect: rectData(vehicleHeroSupport),
            vehicleBookingRect: rectData(vehicleBooking),
            fleetGridRect: rectData(fleetGrid),
            fleetFirstRowMetrics,
            hasBookingAside: Boolean(firstVisible(['.vehicle-booking'])),
            hasTrustRow: Boolean(firstVisible(['.trust-row'])),
            hasModelGrid: Boolean(firstVisible(['.model-grid'])),
            hasMegaNav: Boolean(firstVisible(['.lab-nav__panel'])),
            navBrandRoutes,
            navTypeRoutes,
            homeCategoryRoutes,
            fleetCardRoutes
        };
    }, {
        profileName: profile,
        selectors: profileSelectors
    });
}

async function collectSurfaceCardMetrics(page, selector) {
    return page.evaluate((cardSelector) => {
        function normalizeHref(href) {
            if (!href) {
                return '';
            }

            try {
                const url = new URL(href, window.location.href);
                return url.pathname === '/index.html' ? '/' : url.pathname;
            } catch (error) {
                return '';
            }
        }

        function normalizeHrefToken(href) {
            if (!href) {
                return '';
            }

            try {
                const url = new URL(href, window.location.href);
                const pathname = url.pathname === '/index.html' ? '/' : url.pathname;
                return `${pathname}${url.search || ''}`;
            } catch (error) {
                return '';
            }
        }

        const elements = Array.from(document.querySelectorAll(cardSelector))
            .filter((element) => element instanceof HTMLElement);
        const cards = elements
            .map((element) => {
                const rect = element.getBoundingClientRect();
                const link = element instanceof HTMLAnchorElement
                    ? element
                    : element.querySelector('a[href]');
                const rawHref = String(link?.getAttribute('href') || link?.href || '').trim();
                const image = element.querySelector('img');
                const primary = element.querySelector('.fleet-card__primary, .btn, [role="button"]');
                const label = element.querySelector('strong, h2, h3, .fleet-card__title, .lab-nav__card-copy');

                return {
                    width: Number(rect.width.toFixed(2)),
                    height: Number(rect.height.toFixed(2)),
                    route: normalizeHref(rawHref),
                    routeToken: normalizeHrefToken(rawHref),
                    rawHref,
                    isLocalAnchor: rawHref.startsWith('#'),
                    hasImage: Boolean(image),
                    imageLoaded: image ? Boolean(image.complete && image.naturalWidth > 0) : false,
                    label: String(label?.textContent || '').replace(/\s+/g, ' ').trim(),
                    primaryLabel: String(primary?.textContent || '').replace(/\s+/g, ' ').trim()
                };
            })
            .filter((card) => card.width >= 24 && card.height >= 24);

        const widths = cards.map((card) => card.width);
        const heights = cards.map((card) => card.height);
        const currentRoute = normalizeHref(window.location.pathname || '/');
        const routeCounts = new Map();

        for (const card of cards) {
            const routeKey = card.routeToken || card.route;

            if (!routeKey) {
                continue;
            }

            routeCounts.set(routeKey, (routeCounts.get(routeKey) || 0) + 1);
        }

        const duplicateRouteCount = [...routeCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);

        return {
            count: cards.length,
            routes: cards.map((card) => card.route).filter(Boolean),
            routeTokens: cards.map((card) => card.routeToken || card.route).filter(Boolean),
            labels: cards.map((card) => card.label).filter(Boolean).slice(0, 12),
            primaryLabels: cards.map((card) => card.primaryLabel).filter(Boolean).slice(0, 12),
            missingImageCount: cards.filter((card) => !card.hasImage || !card.imageLoaded).length,
            missingLabelCount: cards.filter((card) => !card.label).length,
            missingRouteCount: cards.filter((card) => !card.route).length,
            localAnchorCount: cards.filter((card) => card.isLocalAnchor).length,
            samePageRouteCount: cards.filter((card) => card.route && card.route === currentRoute).length,
            duplicateRouteCount,
            uniqueRouteCount: routeCounts.size,
            widthSpread: widths.length ? Number((Math.max(...widths) - Math.min(...widths)).toFixed(2)) : 0,
            heightSpread: heights.length ? Number((Math.max(...heights) - Math.min(...heights)).toFixed(2)) : 0
        };
    }, selector);
}

async function collectInteractiveSurfaceMetrics(page, profile, viewport) {
    if (viewport.width < 1200) {
        return {};
    }

    const surfaces = {};

    async function maybeCollectPanel(buttonName, key, selector) {
        const trigger = page.getByRole('button', { name: buttonName }).first();

        if (await trigger.count() === 0 || !(await trigger.isVisible())) {
            return;
        }

        await trigger.click();
        await page.waitForTimeout(120);
        surfaces[key] = await collectSurfaceCardMetrics(page, selector);
        await trigger.click().catch(() => {});
        await page.waitForTimeout(80);
    }

    if (profile === 'home' || profile === 'fleet' || profile === 'hub_marketing' || profile === 'vehicle_pdp') {
        await maybeCollectPanel(/cars brands/i, 'brandsNav', '.lab-nav__panel--brands .lab-nav__card--brand');
        await maybeCollectPanel(/cars types/i, 'typesNav', '.lab-nav__panel--types .lab-nav__card--type');
    }

    if (profile === 'home') {
        surfaces.homeCategories = await collectSurfaceCardMetrics(page, '.fleet-category');
    }

    if (profile === 'fleet') {
        surfaces.fleetCards = await collectSurfaceCardMetrics(page, '.js-fleet-card');
    }

    return surfaces;
}

async function resetInteractiveChrome(page) {
    await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }).catch(() => {});

    const viewportSize = page.viewportSize();
    const safeY = viewportSize ? Math.max(12, viewportSize.height - 12) : 12;

    await page.mouse.move(12, safeY).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(80);
}

function createFirstViewportLayoutFinding({ route, viewportName, screenshotPath, message, evidence, likelyCause }) {
    return createVisualFinding({
        route,
        viewport: viewportName,
        severity: 'medium',
        category: 'first_viewport_layout',
        message,
        evidence,
        likelyCause,
        screenshotPath
    });
}

function evaluateTwoColumnSplit({ primaryRect, secondaryRect, primaryCtaRect, viewportWidth, viewportHeight, containerRect, rules }) {
    if (!primaryRect || !secondaryRect || !viewportWidth || !rules) {
        return [];
    }

    const effectiveWidth = Math.max(1, Number(containerRect?.width || viewportWidth));
    const primaryWidthRatio = primaryRect.width / effectiveWidth;
    const secondaryWidthRatio = secondaryRect.width / effectiveWidth;
    const combinedWidthRatio = (primaryRect.width + secondaryRect.width) / effectiveWidth;
    const topOffsetPx = Math.abs(primaryRect.top - secondaryRect.top);
    const bottomOffsetPx = Math.abs(primaryRect.bottom - secondaryRect.bottom);
    const heightDeltaRatio = Math.max(
        Math.abs(primaryRect.height - secondaryRect.height) / Math.max(1, primaryRect.height),
        Math.abs(primaryRect.height - secondaryRect.height) / Math.max(1, secondaryRect.height)
    );
    const failures = [];

    if (topOffsetPx > rules.maxTopOffsetPx) {
        failures.push(`topOffsetPx=${topOffsetPx.toFixed(2)}`);
    }

    if (
        Number.isFinite(rules.maxBottomOffsetPx) &&
        bottomOffsetPx > rules.maxBottomOffsetPx
    ) {
        failures.push(`bottomOffsetPx=${bottomOffsetPx.toFixed(2)}`);
    }

    if (
        Number.isFinite(rules.maxHeightDeltaRatio) &&
        heightDeltaRatio > rules.maxHeightDeltaRatio
    ) {
        failures.push(`heightDeltaRatio=${heightDeltaRatio.toFixed(3)}`);
    }

    if (primaryWidthRatio < rules.minPrimaryWidthRatio) {
        failures.push(`primaryWidthRatio=${primaryWidthRatio.toFixed(3)}`);
    }

    if (secondaryWidthRatio < rules.minSecondaryWidthRatio) {
        failures.push(`secondaryWidthRatio=${secondaryWidthRatio.toFixed(3)}`);
    }

    if (combinedWidthRatio < rules.minCombinedWidthRatio) {
        failures.push(`combinedWidthRatio=${combinedWidthRatio.toFixed(3)}`);
    }

    if (Number.isFinite(rules.maxBlockBottomRatio) && viewportHeight) {
        const primaryBottomRatio = primaryRect.bottom / viewportHeight;
        const secondaryBottomRatio = secondaryRect.bottom / viewportHeight;

        if (primaryBottomRatio > rules.maxBlockBottomRatio) {
            failures.push(`primaryBottomRatio=${primaryBottomRatio.toFixed(3)}`);
        }

        if (secondaryBottomRatio > rules.maxBlockBottomRatio) {
            failures.push(`secondaryBottomRatio=${secondaryBottomRatio.toFixed(3)}`);
        }
    }

    if (
        Number.isFinite(rules.maxPrimaryCtaTopRatio) &&
        primaryCtaRect &&
        viewportHeight &&
        primaryCtaRect.top > ((rules.maxPrimaryCtaTopRatio * viewportHeight) + Number(rules.maxPrimaryCtaOverflowPx || 0))
    ) {
        failures.push(`primaryCtaTopRatio=${(primaryCtaRect.top / viewportHeight).toFixed(3)}`);
    }

    return failures;
}

function evaluateSinglePanelFill({ primaryRect, primaryCtaRect, viewportWidth, viewportHeight, containerRect, rules }) {
    if (!primaryRect || !viewportWidth || !viewportHeight || !rules) {
        return [];
    }

    const effectiveWidth = Math.max(1, Number(containerRect?.width || viewportWidth));
    const primaryWidthRatio = primaryRect.width / effectiveWidth;
    const primaryBottomRatio = primaryRect.bottom / viewportHeight;
    const failures = [];

    if (primaryWidthRatio < rules.minPrimaryWidthRatio) {
        failures.push(`primaryWidthRatio=${primaryWidthRatio.toFixed(3)}`);
    }

    if (primaryWidthRatio > rules.maxPrimaryWidthRatio) {
        failures.push(`primaryWidthRatio=${primaryWidthRatio.toFixed(3)}`);
    }

    if (primaryBottomRatio > rules.maxPrimaryBottomRatio) {
        failures.push(`primaryBottomRatio=${primaryBottomRatio.toFixed(3)}`);
    }

    if (
        Number.isFinite(rules.maxPrimaryCtaTopRatio) &&
        primaryCtaRect &&
        primaryCtaRect.top / viewportHeight > rules.maxPrimaryCtaTopRatio
    ) {
        failures.push(`primaryCtaTopRatio=${(primaryCtaRect.top / viewportHeight).toFixed(3)}`);
    }

    return failures;
}

function evaluateFleetFirstRowFill({ fleetFirstRowMetrics, containerRect, rules }) {
    if (!fleetFirstRowMetrics || !rules) {
        return [];
    }

    const effectiveWidth = Math.max(1, Number(containerRect?.width || 0));
    const failures = [];
    const rowSpanRatio = effectiveWidth > 0
        ? fleetFirstRowMetrics.rowSpanPx / effectiveWidth
        : fleetFirstRowMetrics.rowSpanRatio;

    if (fleetFirstRowMetrics.rowCount < rules.minRowCount) {
        failures.push(`rowCount=${fleetFirstRowMetrics.rowCount}`);
    }

    if (rowSpanRatio < rules.minRowSpanRatio) {
        failures.push(`rowSpanRatio=${rowSpanRatio.toFixed(3)}`);
    }

    if (fleetFirstRowMetrics.topSpreadPx > rules.maxTopSpreadPx) {
        failures.push(`topSpreadPx=${fleetFirstRowMetrics.topSpreadPx.toFixed(2)}`);
    }

    return failures;
}

function evaluateSectionRhythm({ leadRect, peerRects = [], rules = {} }) {
    if (!leadRect || !Array.isArray(peerRects) || peerRects.length === 0 || !rules) {
        return [];
    }

    const peerWidths = peerRects
        .map((rect) => Number(rect?.width || 0))
        .filter((width) => Number.isFinite(width) && width > 0);

    if (peerWidths.length === 0) {
        return [];
    }

    const failures = [];
    const averagePeerWidth = average(peerWidths);
    const leadToPeerWidthRatio = averagePeerWidth > 0 ? leadRect.width / averagePeerWidth : 0;
    const peerWidthSpreadRatio = averagePeerWidth > 0
        ? (Math.max(...peerWidths) - Math.min(...peerWidths)) / averagePeerWidth
        : 0;

    if (
        Number.isFinite(rules.minLeadToPeerWidthRatio) &&
        leadToPeerWidthRatio < rules.minLeadToPeerWidthRatio
    ) {
        failures.push(`leadToPeerWidthRatio=${leadToPeerWidthRatio.toFixed(3)}`);
    }

    if (
        Number.isFinite(rules.maxPeerWidthSpreadRatio) &&
        peerWidthSpreadRatio > rules.maxPeerWidthSpreadRatio
    ) {
        failures.push(`peerWidthSpreadRatio=${peerWidthSpreadRatio.toFixed(3)}`);
    }

    return failures;
}

function buildDeterministicFindings({ route, viewport, profile, metrics, consoleErrors, networkErrors, artifacts }) {
    const findings = [];
    const profileConfig = getProfileConfig(profile);
    const viewportName = viewport.name;
    const screenshotPath = artifacts.viewportScreenshot;
    const normalizedRoute = normalizeRoute(route);
    const firstViewportContract = getFirstViewportContract({
        route: normalizedRoute,
        cohort: classifyRouteCohort(normalizedRoute),
        viewportName,
        viewportWidth: metrics.viewportWidth
    });
    const sectionRhythmContract = getSectionRhythmContract({
        route: normalizedRoute,
        viewportName,
        viewportWidth: metrics.viewportWidth
    });
    let heroHeadingRuleSatisfiedByComposition = false;

    if (metrics.horizontalOverflowPx > 4) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'overflow',
            message: 'The page creates horizontal overflow beyond the allowed 4px budget.',
            evidence: `horizontalOverflowPx=${metrics.horizontalOverflowPx}`,
            likelyCause: 'A layout container or child element is wider than the viewport.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (profileConfig.expectedVisibleH1 === 'exactly_one' && metrics.visibleH1Count !== 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'heading',
            message: 'The page should expose exactly one visible H1.',
            evidence: `visibleH1Count=${metrics.visibleH1Count}`,
            likelyCause: 'Heading hierarchy drifted or the main title is hidden or duplicated.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (profileConfig.expectedVisibleH1 === 'zero_or_one' && metrics.visibleH1Count > 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'heading',
            message: 'The page exposes more than one visible H1.',
            evidence: `visibleH1Count=${metrics.visibleH1Count}`,
            likelyCause: 'The reserve flow is rendering multiple primary headings at once.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (firstViewportContract?.check === 'single_panel_fill') {
        const singlePanelFailures = evaluateSinglePanelFill({
            primaryRect: metrics.homeContentBoxRect,
            primaryCtaRect: metrics.primaryCtaRect,
            viewportWidth: metrics.viewportWidth,
            viewportHeight: metrics.viewportHeight,
            containerRect: metrics.homeHeroShellRect,
            rules: firstViewportContract
        });

        if (singlePanelFailures.length > 0) {
            findings.push(createFirstViewportLayoutFinding({
                route,
                viewportName,
                screenshotPath,
                message: 'The main hero panel no longer holds a clean, dominant share of the first viewport.',
                evidence: singlePanelFailures.join('; '),
                likelyCause: 'The first screen is either under-filled, oversized, or dropping too low to preserve a clear dominant zone.'
            }));
        } else {
            heroHeadingRuleSatisfiedByComposition = true;
        }
    }

    if (firstViewportContract?.check === 'service_tabs_split') {
        const selectorBottomRatio = metrics.servicesSelectorRect ? metrics.servicesSelectorRect.bottom / metrics.viewportHeight : 0;
        const selectorWidthRatio = metrics.servicesSelectorRect ? metrics.servicesSelectorRect.width / metrics.viewportWidth : 0;
        const selectorSlotWidth = metrics.servicesSelectorRect && metrics.servicesOrbMetrics?.count
            ? metrics.servicesSelectorRect.width / metrics.servicesOrbMetrics.count
            : 0;
        const orbSlotFillRatio = selectorSlotWidth > 0 && metrics.servicesOrbMetrics
            ? metrics.servicesOrbMetrics.minWidthPx / selectorSlotWidth
            : 0;
        const featureTopRatio = metrics.servicesFeatureRect ? metrics.servicesFeatureRect.top / metrics.viewportHeight : 0;
        const featureBottomRatio = metrics.servicesFeatureRect ? metrics.servicesFeatureRect.bottom / metrics.viewportHeight : 0;
        const selectorFeatureOverlapPx = metrics.servicesSelectorRect && metrics.servicesFeatureRect
            ? Math.max(0, metrics.servicesSelectorRect.bottom - metrics.servicesFeatureRect.top)
            : 0;
        const featureUsedRightEdge = Math.max(
            Number(metrics.servicesFeatureCopyRect?.right || 0),
            Number(metrics.servicesFeatureListRect?.right || 0),
            Number(metrics.servicesFeatureMainRect?.left || 0)
        );
        const featureContentGapPx = metrics.servicesFeatureSideRect
            ? Math.max(0, metrics.servicesFeatureSideRect.left - featureUsedRightEdge)
            : 0;
        const featureContentGapRatio = metrics.servicesFeatureRect?.width
            ? featureContentGapPx / metrics.servicesFeatureRect.width
            : 0;
        const splitFailures = [];

        if (!metrics.servicesSelectorRect || !metrics.servicesFeatureRect) {
            splitFailures.push('missingServicesHeroRegions');
        } else {
            if (selectorBottomRatio > firstViewportContract.selectorBottomRatio.max) {
                splitFailures.push(`selectorBottomRatio=${selectorBottomRatio.toFixed(3)}`);
            }

            if (
                Number.isFinite(firstViewportContract.minSelectorWidthRatio) &&
                selectorWidthRatio < firstViewportContract.minSelectorWidthRatio
            ) {
                splitFailures.push(`selectorWidthRatio=${selectorWidthRatio.toFixed(3)}`);
            }

            if (
                Number.isFinite(firstViewportContract.minOrbSlotFillRatio) &&
                orbSlotFillRatio < firstViewportContract.minOrbSlotFillRatio
            ) {
                splitFailures.push(`orbSlotFillRatio=${orbSlotFillRatio.toFixed(3)}`);
            }

            if (
                featureTopRatio < firstViewportContract.featureTopRatio.min ||
                featureTopRatio > firstViewportContract.featureTopRatio.max
            ) {
                splitFailures.push(`featureTopRatio=${featureTopRatio.toFixed(3)}`);
            }

            if (featureBottomRatio < firstViewportContract.featureBottomRatio.min) {
                splitFailures.push(`featureBottomRatio=${featureBottomRatio.toFixed(3)}`);
            }

            if (
                Number.isFinite(firstViewportContract.featureBottomRatio.max) &&
                featureBottomRatio > firstViewportContract.featureBottomRatio.max
            ) {
                splitFailures.push(`featureBottomRatio=${featureBottomRatio.toFixed(3)}`);
            }

            if (selectorFeatureOverlapPx > firstViewportContract.maxSelectorFeatureOverlapPx) {
                splitFailures.push(`selectorFeatureOverlapPx=${selectorFeatureOverlapPx.toFixed(2)}`);
            }

            if (Number.isFinite(firstViewportContract.minOrbMediaWidthPx)) {
                if (!metrics.servicesOrbMetrics) {
                    splitFailures.push('missingServicesOrbMetrics');
                } else if (metrics.servicesOrbMetrics.minWidthPx < firstViewportContract.minOrbMediaWidthPx) {
                    splitFailures.push(`orbMinWidthPx=${metrics.servicesOrbMetrics.minWidthPx.toFixed(2)}`);
                }
            }

            if (
                Number.isFinite(firstViewportContract.maxFeatureContentGapRatio) &&
                featureContentGapRatio > firstViewportContract.maxFeatureContentGapRatio
            ) {
                splitFailures.push(`featureContentGapRatio=${featureContentGapRatio.toFixed(3)}`);
            }

            if (
                Number.isFinite(firstViewportContract.maxHeadingTopRatio) &&
                Number.isFinite(metrics.headingTopRatio) &&
                metrics.headingTopRatio > firstViewportContract.maxHeadingTopRatio
            ) {
                splitFailures.push(`headingTopRatio=${metrics.headingTopRatio.toFixed(3)}`);
            }
        }

        if (splitFailures.length > 0) {
            findings.push(createFirstViewportLayoutFinding({
                route,
                viewportName,
                screenshotPath,
                message: 'The services first viewport is no longer split cleanly between the tab circles and the lower feature panel.',
                evidence: splitFailures.join('; '),
                likelyCause: 'The selector row and feature panel are drifting away from the intended top-half / bottom-half composition.'
            }));
        } else {
            heroHeadingRuleSatisfiedByComposition = true;
        }
    }

    if (firstViewportContract?.check === 'two_column_alignment') {
        const alignmentFailures = evaluateTwoColumnSplit({
            primaryRect: metrics.locationsSummaryRect,
            secondaryRect: metrics.locationsMapRect,
            primaryCtaRect: metrics.primaryCtaRect,
            viewportWidth: metrics.viewportWidth,
            viewportHeight: metrics.viewportHeight,
            containerRect: metrics.locationsHeroShellRect,
            rules: {
                maxTopOffsetPx: firstViewportContract.maxTopOffsetPx,
                minPrimaryWidthRatio: firstViewportContract.minColumnWidthRatio,
                minSecondaryWidthRatio: firstViewportContract.minColumnWidthRatio,
                minCombinedWidthRatio: firstViewportContract.minCombinedWidthRatio,
                maxBlockBottomRatio: firstViewportContract.maxBlockBottomRatio,
                maxPrimaryCtaTopRatio: firstViewportContract.maxPrimaryCtaTopRatio
            }
        });

        if (alignmentFailures.length > 0) {
            findings.push(createFirstViewportLayoutFinding({
                route,
                viewportName,
                screenshotPath,
                message: 'The locations first viewport no longer keeps the left and right blocks aligned and screen-filling.',
                evidence: alignmentFailures.join('; '),
                likelyCause: 'The hero columns have drifted in width or vertical alignment and no longer read as one balanced split layout.'
            }));
        } else {
            heroHeadingRuleSatisfiedByComposition = true;
        }
    }

    if (firstViewportContract?.check === 'hero_support_split') {
        const splitTargets = {
            contact: {
                primaryRect: metrics.contactIntroRect,
                secondaryRect: metrics.contactFormCardRect,
                containerRect: metrics.contactHeroShellRect,
                label: 'contact'
            },
            reserve: {
                primaryRect: metrics.reserveStep1MainRect,
                secondaryRect: metrics.reserveStep1SideRect,
                containerRect: metrics.reserveStep1LayoutRect,
                label: 'reserve'
            },
            vehicle: {
                primaryRect: metrics.vehicleHeroMediaRect,
                secondaryRect: metrics.vehicleHeroSupportRect || metrics.vehicleBookingRect,
                containerRect: metrics.heroRect,
                label: 'vehicle'
            }
        };
        const target = splitTargets.contact.primaryRect && splitTargets.contact.secondaryRect
            ? splitTargets.contact
            : splitTargets.reserve.primaryRect && splitTargets.reserve.secondaryRect
                ? splitTargets.reserve
                : splitTargets.vehicle.primaryRect && splitTargets.vehicle.secondaryRect
                    ? splitTargets.vehicle
                    : null;
        const splitFailures = evaluateTwoColumnSplit({
            primaryRect: target?.primaryRect,
            secondaryRect: target?.secondaryRect,
            primaryCtaRect: metrics.primaryCtaRect,
            viewportWidth: metrics.viewportWidth,
            viewportHeight: metrics.viewportHeight,
            containerRect: target?.containerRect,
            rules: firstViewportContract
        });

        if (splitFailures.length > 0 || !target) {
            findings.push(createFirstViewportLayoutFinding({
                route,
                viewportName,
                screenshotPath,
                message: 'The main and support blocks no longer share the first viewport in a balanced split.',
                evidence: target ? splitFailures.join('; ') : 'missingPrimaryOrSupportRegion',
                likelyCause: 'The dominant visual block and its support panel are no longer aligned or no longer fill the screen as one composition.'
            }));
        } else if (profileConfig.heroLed) {
            heroHeadingRuleSatisfiedByComposition = true;
        }
    }

    if (firstViewportContract?.check === 'fleet_first_row_fill') {
        const fleetFailures = evaluateFleetFirstRowFill({
            fleetFirstRowMetrics: metrics.fleetFirstRowMetrics,
            containerRect: metrics.fleetGridRect,
            rules: firstViewportContract
        });

        if (fleetFailures.length > 0) {
            findings.push(createFirstViewportLayoutFinding({
                route,
                viewportName,
                screenshotPath,
                message: 'The fleet first row no longer distributes the visible cards cleanly across the first screen.',
                evidence: fleetFailures.join('; '),
                likelyCause: 'The opening fleet grid is under-filling, collapsing, or losing row alignment.'
            }));
        }
    }

    if (sectionRhythmContract?.check === 'lead_panel_vs_following_sections') {
        const sectionRhythmFailures = evaluateSectionRhythm({
            leadRect: metrics.servicesFeatureRect,
            peerRects: [
                metrics.servicesDirectoryShellRect,
                metrics.servicesFlowShellRect,
                metrics.servicesFaqShellRect
            ].filter(Boolean),
            rules: sectionRhythmContract
        });

        if (sectionRhythmFailures.length > 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'medium',
                category: 'section_rhythm',
                message: 'The first section no longer matches the width rhythm used by the sections below.',
                evidence: sectionRhythmFailures.join('; '),
                likelyCause: 'The lead panel is using a noticeably different shell width than the rest of the page, so the vertical rhythm feels inconsistent.',
                screenshotPath
            }));
        }
    }

    if (
        profileConfig.heroLed &&
        metrics.headingRect &&
        metrics.headingRect.top > metrics.viewportHeight * 0.6 &&
        !heroHeadingRuleSatisfiedByComposition
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'heading',
            message: 'The main heading drops too low in the first viewport.',
            evidence: `headingTop=${metrics.headingRect.top}; viewportHeight=${metrics.viewportHeight}`,
            likelyCause: 'Hero spacing or stacked support content is pushing the entry point down.',
            screenshotPath
        }));
    }

    if (
        profileConfig.heroLed &&
        metrics.headingInsideHeroMedia &&
        metrics.heroBackgroundLuminance > 0 &&
        metrics.heroBackgroundLuminance < 0.28 &&
        metrics.headingColorLuminance < 0.35
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'contrast',
            message: 'The hero heading uses a dark text color on a dark visual surface.',
            evidence: `headingColor=${metrics.headingColor}; headingColorLuminance=${metrics.headingColorLuminance}; heroBackgroundLuminance=${metrics.heroBackgroundLuminance}`,
            likelyCause: 'A page-level heading override is defeating the intended hero contrast.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (profileConfig.heroLed && metrics.heroActionCount > 2) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'cta_hierarchy',
            message: 'The hero exposes more than two immediate actions.',
            evidence: `heroActionCount=${metrics.heroActionCount}`,
            likelyCause: 'The first viewport is asking the user to choose too many next steps.',
            screenshotPath
        }));
    }

    if (profileConfig.heroLed && (!metrics.primaryCtaRect || metrics.primaryCtaRect.top > metrics.viewportHeight)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'primary_cta',
            message: 'The primary CTA is not visible within the first viewport.',
            evidence: metrics.primaryCtaRect ? `ctaTop=${metrics.primaryCtaRect.top}` : 'primary CTA not found',
            likelyCause: 'The hero stack is too tall or the CTA is hidden by layout drift.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (profileConfig.heroLed && !metrics.hasVisualMedia) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'media_load',
            message: 'The first viewport lacks a healthy visual media anchor.',
            evidence: `brokenMedia=${metrics.brokenMedia.length}; hasVisualMedia=${metrics.hasVisualMedia}`,
            likelyCause: 'Hero media failed to load or was removed from the visible composition.',
            screenshotPath
        }));
    }

    if (metrics.headerOcclusionPx > 12) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'header_occlusion',
            message: 'A sticky or fixed header is covering the first useful content.',
            evidence: `headerOcclusionPx=${metrics.headerOcclusionPx}`,
            likelyCause: 'Sticky header offset is larger than the content top spacing.',
            hardFail: true,
            screenshotPath
        }));
    }

    for (const overlap of metrics.overlaps || []) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'overlap',
            selector: `${overlap.left} <> ${overlap.right}`,
            message: 'Key elements overlap with more than 8px of shared area.',
            evidence: `overlapWidth=${overlap.overlapWidth}; overlapHeight=${overlap.overlapHeight}`,
            likelyCause: 'Responsive spacing or absolute positioning is collapsing critical content.',
            hardFail: true,
            screenshotPath
        }));
    }

    for (const clipped of metrics.clippedElements || []) {
        const severeClip = clipped.outsideViewportPx > 12 || clipped.textOverflow;

        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: severeClip ? 'high' : 'medium',
            category: 'clipping',
            selector: clipped.selectorLabel,
            message: 'Key content is clipped, overflowing, or text-truncated.',
            evidence: `outsideViewportPx=${clipped.outsideViewportPx}; textOverflow=${clipped.textOverflow}`,
            likelyCause: 'Responsive width, min-size, or typography constraints are too aggressive.',
            hardFail: severeClip,
            screenshotPath
        }));
    }

    for (const brokenMedium of metrics.brokenMedia || []) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'media_load',
            selector: brokenMedium.label,
            message: 'A visible image or video failed to load correctly.',
            evidence: `${brokenMedium.type} ${brokenMedium.reason} (${brokenMedium.src})`,
            likelyCause: 'Media source is broken, blocked, or not hydrating in time.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (profile === 'fleet') {
        if (metrics.visibleCardCount === 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'grid_stability',
                message: 'No visible fleet cards were detected.',
                evidence: 'visibleCardCount=0',
                likelyCause: 'The fleet grid failed to render or was pushed outside the viewport.',
                hardFail: true,
                screenshotPath
            }));
        }

        if (metrics.cardHeightSpread > 240) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'medium',
                category: 'grid_stability',
                message: 'Fleet cards vary too much in height within the first visible set.',
                evidence: `cardHeightSpread=${metrics.cardHeightSpread}`,
                likelyCause: 'Copy length or media framing is destabilizing the card grid.',
                screenshotPath
            }));
        }

        if (metrics.missingCardPriceCount > 0 || metrics.missingCardPrimaryCount > 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'grid_stability',
                message: 'Some fleet cards are missing a visible price or primary CTA.',
                evidence: `missingCardPriceCount=${metrics.missingCardPriceCount}; missingCardPrimaryCount=${metrics.missingCardPrimaryCount}`,
                likelyCause: 'Card rendering is incomplete or content is being hidden by layout changes.',
                hardFail: true,
                screenshotPath
            }));
        }
    }

    if (profile === 'vehicle_pdp' && (!metrics.primaryCtaRect || !metrics.priceRect)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'The booking block is missing a visible price or submit action.',
            evidence: `hasPrice=${Boolean(metrics.priceRect)}; hasPrimaryCta=${Boolean(metrics.primaryCtaRect)}`,
            likelyCause: 'The vehicle booking card is not rendering in the visible layout.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (profile === 'reserve' && !metrics.formRect) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'The reserve flow does not expose a visible form or active step container.',
            evidence: 'No visible reserve form block detected.',
            likelyCause: 'The step layout is hidden, collapsed, or blocked by runtime errors.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (
        profile === 'reserve' &&
        !metrics.reserveIntroRect &&
        !metrics.reservePageHeadingRect
    ) {
        findings.push(createFirstViewportLayoutFinding({
            route,
            viewportName,
            screenshotPath,
            message: 'The reserve flow has lost its branded entry context before the scheduling form begins.',
            evidence: 'reserveIntroRect=missing; reservePageHeadingRect=missing',
            likelyCause: 'The reserve intro shell is hidden or collapsed, so the page no longer transitions in a way that feels consistent with the rest of the site.'
        }));
    }

    if (
        profile === 'reserve' &&
        !metrics.hasVisualMedia &&
        !metrics.reserveIntroRect &&
        !metrics.reserveIntroPanelRect
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'media_load',
            message: 'The reserve entry lacks a visible visual anchor or branded background treatment.',
            evidence: `hasVisualMedia=${metrics.hasVisualMedia}; reserveIntroRect=${Boolean(metrics.reserveIntroRect)}; reserveIntroPanelRect=${Boolean(metrics.reserveIntroPanelRect)}`,
            likelyCause: 'The reserve route opens straight into utility blocks and loses the visual continuity used by the rest of the booking journey.',
            screenshotPath
        }));
    }

    if (
        profile === 'reserve' &&
        (
            !metrics.reserveStartDateRect ||
            metrics.reserveStartDateRect.top > (metrics.viewportHeight * 0.85)
        )
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'The first date field is below the initial viewport even though this step is schedule-first.',
            evidence: metrics.reserveStartDateRect
                ? `startDateTop=${metrics.reserveStartDateRect.top}; viewportHeight=${metrics.viewportHeight}; threshold=${(metrics.viewportHeight * 0.85).toFixed(2)}`
                : 'reserveStartDateRect=missing',
            likelyCause: 'Selected-car context and support panels are pushing the scheduling controls too far down the page.',
            hardFail: true,
            screenshotPath
        }));
    }

    if (profile === 'contact' && metrics.formRect && metrics.formRect.top > metrics.viewportHeight * 0.95) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'form_visibility',
            message: 'The contact form starts too low in the initial viewport.',
            evidence: `formTop=${metrics.formRect.top}; viewportHeight=${metrics.viewportHeight}`,
            likelyCause: 'Hero/support content is pushing the main form too far down.',
            screenshotPath
        }));
    }

    if (SHARED_LAB_HEADER_PROFILES.has(profile) && metrics.headerFamily !== 'lab-header') {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'legacy_template',
            message: 'The page is not using the shared modern site header shell.',
            evidence: `headerFamily=${metrics.headerFamily || 'none'}; visualIntent=${metrics.visualIntent || 'unknown'}`,
            likelyCause: 'This route is still using a standalone or legacy header instead of the shared lab-header system.',
            screenshotPath
        }));
    }

    if (metrics.visualIntent === 'legacy_dark_neon') {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'legacy_template',
            message: 'The page is still using the legacy neon dark shell instead of the current premium system.',
            evidence: `templateFamily=${metrics.templateFamily}; headingFontFamily=${metrics.headingFontFamily}; bodyBackgroundLuminance=${metrics.bodyBackgroundLuminance}`,
            likelyCause: 'Older neon-dark styling is still active on this route while the rest of the product has moved to the newer shell.',
            screenshotPath
        }));
    }

    for (const errorMessage of normalizeConsoleErrors(consoleErrors).slice(0, 5)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'console_error',
            message: 'The page emitted a console error during render.',
            evidence: errorMessage,
            likelyCause: 'A runtime script error is affecting rendering or interactivity.',
            hardFail: true,
            screenshotPath
        }));
    }

    for (const failedRequest of networkErrors.requestFailures.slice(0, 5)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'request_failure',
            message: 'A critical request failed while rendering the page.',
            evidence: `${failedRequest.resourceType} ${failedRequest.failureText} ${failedRequest.url}`,
            likelyCause: 'A required asset or API call failed during render.',
            hardFail: true,
            screenshotPath
        }));
    }

    for (const responseFailure of networkErrors.criticalResponses.slice(0, 5)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: responseFailure.status >= 500 ? 'high' : 'medium',
            category: 'request_failure',
            message: 'A critical request returned an error status.',
            evidence: `${responseFailure.resourceType} ${responseFailure.status} ${responseFailure.url}`,
            likelyCause: 'An asset or API route is returning an unexpected error.',
            hardFail: responseFailure.status >= 500,
            screenshotPath
        }));
    }

    return findings;
}

function readPng(filePath) {
    return PNG.sync.read(fs.readFileSync(filePath));
}

function comparePngFiles({ currentPath, baselinePath, diffPath, threshold, kind }) {
    if (!fs.existsSync(baselinePath)) {
        return {
            kind,
            status: 'missing',
            ratio: null,
            threshold,
            diffPath: '',
            message: 'Baseline not found.'
        };
    }

    const current = readPng(currentPath);
    const baseline = readPng(baselinePath);

    if (current.width !== baseline.width || current.height !== baseline.height) {
        return {
            kind,
            status: 'bad',
            ratio: 1,
            threshold,
            diffPath: '',
            message: `Image size changed from ${baseline.width}x${baseline.height} to ${current.width}x${current.height}.`
        };
    }

    const diff = new PNG({ width: current.width, height: current.height });
    const mismatchedPixels = pixelmatch(
        baseline.data,
        current.data,
        diff.data,
        current.width,
        current.height,
        { threshold: 0.1 }
    );
    const totalPixels = current.width * current.height;
    const ratio = totalPixels === 0 ? 0 : mismatchedPixels / totalPixels;

    if (ratio > 0) {
        ensureDir(path.dirname(diffPath));
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    let status = 'pass';

    if (ratio > threshold * 2) {
        status = 'bad';
    } else if (ratio > threshold) {
        status = 'review';
    }

    return {
        kind,
        status,
        ratio: Number(ratio.toFixed(6)),
        threshold,
        diffPath: ratio > 0 ? diffPath : '',
        message: `Mismatch ratio ${ratio.toFixed(6)} against threshold ${threshold.toFixed(6)}.`
    };
}

function mergeBaselineResults(results) {
    const actionableResults = results.filter((entry) => entry && entry.status !== 'missing' && entry.status !== 'updated');

    if (actionableResults.some((entry) => entry.status === 'bad')) {
        return actionableResults.find((entry) => entry.status === 'bad');
    }

    if (actionableResults.some((entry) => entry.status === 'review')) {
        return actionableResults.find((entry) => entry.status === 'review');
    }

    if (actionableResults.some((entry) => entry.status === 'pass')) {
        return actionableResults.find((entry) => entry.status === 'pass');
    }

    const updated = results.find((entry) => entry && entry.status === 'updated');
    if (updated) {
        return updated;
    }

    return results.find((entry) => entry && entry.status === 'missing') || null;
}

function mimeTypeForImage(filePath) {
    const extension = path.extname(filePath || '').toLowerCase();

    if (extension === '.jpg' || extension === '.jpeg') {
        return 'image/jpeg';
    }

    if (extension === '.webp') {
        return 'image/webp';
    }

    return 'image/png';
}

function imageFileToDataUrl(filePath) {
    const mimeType = mimeTypeForImage(filePath);
    const buffer = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function extractResponseText(payload = {}) {
    if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text.trim();
    }

    const textChunks = [];

    for (const item of payload.output || []) {
        for (const contentItem of item.content || []) {
            const textValue = (
                contentItem.text ||
                contentItem.output_text ||
                contentItem.value ||
                ''
            );

            if (typeof textValue === 'string' && textValue.trim()) {
                textChunks.push(textValue.trim());
            }
        }
    }

    return textChunks.join('\n').trim();
}

function extractJsonObject(text) {
    if (!text) {
        return null;
    }

    const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
    const candidate = fenceMatch ? fenceMatch[1] : text;
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }

    return candidate.slice(firstBrace, lastBrace + 1);
}

function normalizeVisionVerdict(parsed = {}) {
    const rawStatus = String(parsed.status || parsed.visual_verdict || '').trim().toLowerCase();
    const summary = String(parsed.summary || parsed.rationale || '').trim();
    const confidence = String(parsed.confidence || '').trim().toLowerCase() || 'medium';
    const issues = Array.isArray(parsed.issues) ? parsed.issues.map((entry) => String(entry || '').trim()).filter(Boolean) : [];
    const allowedStatuses = new Set(['good', 'review', 'bad', 'requires_human_review']);
    const status = allowedStatuses.has(rawStatus) ? rawStatus : 'requires_human_review';

    return {
        status,
        summary,
        confidence,
        issues,
        requiresHumanReview: status !== 'good' || Boolean(parsed.requires_human_review)
    };
}

function buildVisionPrompt({ route, viewport, profile, metrics, findings, baselineDiff }) {
    const findingsSummary = (findings || []).slice(0, 8).map((finding) => ({
        severity: finding.severity,
        category: finding.category,
        message: finding.message,
        evidence: finding.evidence
    }));
    const compactMetrics = {
        visualIntent: metrics.visualIntent,
        templateFamily: metrics.templateFamily,
        headingFontFamily: metrics.headingFontFamily,
        bodyFontFamily: metrics.bodyFontFamily,
        bodyFontSizePx: metrics.bodyFontSizePx,
        bodyLineHeightPx: metrics.bodyLineHeightPx,
        primaryCtaRadiusPx: metrics.primaryCtaRadiusPx,
        inputRadiusPx: metrics.inputRadiusPx,
        cardRadiusPx: metrics.cardRadiusPx,
        headingTopRatio: metrics.headingTopRatio,
        headerFamily: metrics.headerFamily
    };

    return [
        'You are reviewing one screenshot of a luxury car rental web page for visual QA.',
        'Judge only professional UI quality and consistency, not copywriting taste.',
        'Return JSON only with this exact shape:',
        '{"status":"good|review|bad|requires_human_review","confidence":"low|medium|high","summary":"...","issues":["..."],"requires_human_review":true|false}',
        'Rules:',
        '- If you are uncertain, use "requires_human_review".',
        '- Never return "good" if the structured findings already imply a serious issue.',
        '- Use "review" for noticeable inconsistency, weak hierarchy, legacy feel, bad balance, or visual mismatch.',
        '- Use "bad" only for clearly broken or clearly outdated/premium-inconsistent presentation.',
        `Route: ${route}`,
        `Viewport: ${viewport}`,
        `Profile: ${profile}`,
        `Baseline status: ${baselineDiff?.status || 'none'}`,
        `Metrics: ${JSON.stringify(compactMetrics)}`,
        `Structured findings: ${JSON.stringify(findingsSummary)}`
    ].join('\n');
}

async function runOpenAIVisionReview({ route, viewport, profile, metrics, findings, baselineDiff, artifacts, visionOutputPath }) {
    const model = process.env.VISUAL_AGENT_VISION_MODEL || 'gpt-4.1';
    const content = [
        {
            type: 'input_text',
            text: buildVisionPrompt({ route, viewport, profile, metrics, findings, baselineDiff })
        }
    ];

    for (const imagePath of [
        artifacts.viewportScreenshot,
        artifacts.regionScreenshot,
        baselineDiff?.diffPath
    ].filter(Boolean)) {
        if (!fs.existsSync(imagePath)) {
            continue;
        }

        content.push({
            type: 'input_image',
            image_url: imageFileToDataUrl(imagePath)
        });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'X-Client-Request-Id': `visual-agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        },
        body: JSON.stringify({
            model,
            input: [
                {
                    role: 'user',
                    content
                }
            ]
        })
    });

    const payload = await response.json();

    if (visionOutputPath) {
        ensureDir(path.dirname(visionOutputPath));
        fs.writeFileSync(visionOutputPath, `${JSON.stringify(payload, null, 2)}\n`);
    }

    if (!response.ok) {
        throw new Error(`OpenAI vision request failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    const responseText = extractResponseText(payload);
    const jsonText = extractJsonObject(responseText);

    if (!jsonText) {
        throw new Error('OpenAI vision response did not contain a JSON object.');
    }

    return normalizeVisionVerdict(JSON.parse(jsonText));
}

async function maybeRunVisionReview({ route, viewport, profile, metrics, findings, baselineDiff, artifacts, pageDir }) {
    const decision = shouldEscalateToVision({
        profile,
        assessment: scoreVisualPage(profile, metrics, findings, { baselineDiff }),
        baselineDiff,
        findings
    });

    if (!decision.required) {
        return {
            findings: [],
            status: 'not_required',
            reason: decision.reason,
            requiresHumanReview: false
        };
    }

    const hasMeaningfulFinding = (findings || []).length > 0 || baselineDiff?.status === 'review' || baselineDiff?.status === 'bad';

    if (decision.reason === 'missing_approved_baseline' && !hasMeaningfulFinding) {
        return {
            findings: [],
            status: 'deferred_until_baseline_approved',
            reason: decision.reason,
            requiresHumanReview: false
        };
    }

    if (!process.env.OPENAI_API_KEY) {
        return {
            findings: [],
            status: 'skipped_not_configured',
            reason: decision.reason,
            requiresHumanReview: true
        };
    }

    try {
        const verdict = await runOpenAIVisionReview({
            route,
            viewport,
            profile,
            metrics,
            findings,
            baselineDiff,
            artifacts,
            visionOutputPath: path.join(pageDir, 'vision-response.json')
        });
        const extraFindings = [];

        if (verdict.status === 'review' || verdict.status === 'bad' || verdict.status === 'requires_human_review') {
            extraFindings.push(createVisualFinding({
                route,
                viewport,
                severity: verdict.status === 'bad' ? 'high' : 'medium',
                category: 'vision_review',
                message: verdict.summary || 'Vision review detected a visual inconsistency that needs attention.',
                evidence: verdict.issues.join('; ') || `confidence=${verdict.confidence}`,
                likelyCause: 'The screenshot looks visually inconsistent or uncertain under model review.',
                screenshotPath: artifacts.regionScreenshot || artifacts.viewportScreenshot,
                source: 'vision'
            }));
        }

        return {
            findings: extraFindings,
            status: 'completed',
            reason: decision.reason,
            confidence: verdict.confidence,
            summary: verdict.summary,
            requiresHumanReview: verdict.requiresHumanReview
        };
    } catch (error) {
        return {
            findings: [],
            status: 'failed',
            reason: decision.reason,
            error: String(error && error.message ? error.message : error),
            requiresHumanReview: true
        };
    }
}

function buildVisionGateDecision({ profile, assessment, baselineDiff }) {
    const decision = shouldEscalateToVision({
        profile,
        assessment,
        baselineDiff,
        findings: assessment.findings
    });

    if (!decision.required) {
        return {
            status: 'not_required',
            reason: decision.reason,
            requiresHumanReview: false
        };
    }

    const hasMeaningfulFinding = (assessment.findings || []).length > 0 || baselineDiff?.status === 'review' || baselineDiff?.status === 'bad';

    if (decision.reason === 'missing_approved_baseline' && !hasMeaningfulFinding) {
        return {
            status: 'deferred_until_baseline_approved',
            reason: decision.reason,
            requiresHumanReview: false
        };
    }

    if (!process.env.OPENAI_API_KEY) {
        return {
            status: 'skipped_not_configured',
            reason: decision.reason,
            requiresHumanReview: true
        };
    }

    return {
        status: 'required',
        reason: decision.reason,
        requiresHumanReview: true
    };
}

function pageKey(route, viewport) {
    return `${normalizeRoute(route)}::${viewport}`;
}

function mode(values = []) {
    const counts = new Map();

    for (const value of values.filter(Boolean)) {
        counts.set(value, (counts.get(value) || 0) + 1);
    }

    let bestValue = '';
    let bestCount = -1;

    for (const [value, count] of counts.entries()) {
        if (count > bestCount) {
            bestValue = value;
            bestCount = count;
        }
    }

    return bestValue;
}

function average(values = []) {
    const filtered = values.filter((value) => Number.isFinite(value));

    if (filtered.length === 0) {
        return 0;
    }

    return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function uniqueValues(values = []) {
    return [...new Set(values.filter(Boolean))];
}

function normalizeServiceStateHref(value = '') {
    const rawValue = String(value || '').trim();

    if (!rawValue) {
        return '';
    }

    try {
        const url = new URL(rawValue, 'https://visual-agent.local/');
        return `${url.pathname}${url.search}`;
    } catch {
        return rawValue;
    }
}

function hasLegacyVisualIntent(metrics = {}) {
    return String(metrics?.visualIntent || '').startsWith('legacy');
}

function pageScreenshotPath(page) {
    return page.artifacts?.regionScreenshot || page.artifacts?.viewportScreenshot || '';
}

function normalizeMetricToken(value) {
    return String(value || '').trim().toLowerCase();
}

function matchesAllowedTokens(value, allowedValues = []) {
    const normalizedValue = normalizeMetricToken(value);
    const normalizedAllowedValues = (allowedValues || []).map((entry) => normalizeMetricToken(entry)).filter(Boolean);

    if (!normalizedValue || normalizedAllowedValues.length === 0) {
        return true;
    }

    return normalizedAllowedValues.includes(normalizedValue);
}

function normalizeRangeSpecs(rangeSpec) {
    if (!rangeSpec) {
        return [];
    }

    return Array.isArray(rangeSpec) ? rangeSpec : [rangeSpec];
}

function metricWithinRanges(value, rangeSpec) {
    const ranges = normalizeRangeSpecs(rangeSpec);

    if (ranges.length === 0) {
        return true;
    }

    if (!Number.isFinite(value) || value <= 0) {
        return true;
    }

    return ranges.some((range) => {
        const min = Number.isFinite(range?.min) ? range.min : Number.NEGATIVE_INFINITY;
        const max = Number.isFinite(range?.max) ? range.max : Number.POSITIVE_INFINITY;
        return value >= min && value <= max;
    });
}

function formatRangeSpec(rangeSpec) {
    return normalizeRangeSpecs(rangeSpec)
        .map((range) => {
            const min = Number.isFinite(range?.min) ? range.min : '-inf';
            const max = Number.isFinite(range?.max) ? range.max : 'inf';
            return `[${min}, ${max}]`;
        })
        .join(' or ');
}

function getDesignContractForPage(page) {
    const cohort = classifyRouteCohort(page.route);
    return DESIGN_SYSTEM_CONTRACT.cohorts[cohort] || null;
}

function collectForbiddenFontMismatches(metrics = {}) {
    const mismatches = [];
    const forbiddenFonts = DESIGN_SYSTEM_CONTRACT.global?.forbiddenFonts || [];
    const fontEntries = [
        ['headingFontFamily', metrics.headingFontFamily],
        ['bodyFontFamily', metrics.bodyFontFamily],
        ['primaryCtaFontFamily', metrics.primaryCtaFontFamily]
    ];

    for (const [label, value] of fontEntries) {
        const normalizedValue = normalizeMetricToken(value);

        if (!normalizedValue) {
            continue;
        }

        for (const forbiddenFont of forbiddenFonts) {
            const normalizedForbiddenFont = normalizeMetricToken(forbiddenFont);

            if (normalizedForbiddenFont && normalizedValue.includes(normalizedForbiddenFont)) {
                mismatches.push(`${label}=${normalizedValue} forbidden=${normalizedForbiddenFont}`);
            }
        }
    }

    return mismatches;
}

function buildContractDesignSystemFindings(page, contract) {
    const findings = [];
    const metrics = page.metrics || {};
    const fontMismatches = collectForbiddenFontMismatches(metrics);
    const surfaceMismatches = [];
    const shapeMismatches = [];
    const buttonMismatches = [];

    if (
        Array.isArray(contract.headingFontFamilies) &&
        contract.headingFontFamilies.length > 0 &&
        metrics.headingFontFamily &&
        !matchesAllowedTokens(metrics.headingFontFamily, contract.headingFontFamilies)
    ) {
        fontMismatches.push(
            `headingFontFamily=${metrics.headingFontFamily} expected=${contract.headingFontFamilies.join('|')}`
        );
    }

    if (
        Array.isArray(contract.bodyFontFamilies) &&
        contract.bodyFontFamilies.length > 0 &&
        metrics.bodyFontFamily &&
        !matchesAllowedTokens(metrics.bodyFontFamily, contract.bodyFontFamilies)
    ) {
        fontMismatches.push(
            `bodyFontFamily=${metrics.bodyFontFamily} expected=${contract.bodyFontFamilies.join('|')}`
        );
    }

    if (!metricWithinRanges(metrics.bodyFontSizePx, contract.bodyFontSizePx)) {
        fontMismatches.push(
            `bodyFontSizePx=${metrics.bodyFontSizePx} expected=${formatRangeSpec(contract.bodyFontSizePx)}`
        );
    }

    if (!metricWithinRanges(metrics.bodyLineHeightPx, contract.bodyLineHeightPx)) {
        fontMismatches.push(
            `bodyLineHeightPx=${metrics.bodyLineHeightPx} expected=${formatRangeSpec(contract.bodyLineHeightPx)}`
        );
    }

    if (
        Array.isArray(contract.visualIntents) &&
        contract.visualIntents.length > 0 &&
        metrics.visualIntent &&
        !matchesAllowedTokens(metrics.visualIntent, contract.visualIntents)
    ) {
        surfaceMismatches.push(
            `visualIntent=${metrics.visualIntent} expected=${contract.visualIntents.join('|')}`
        );
    }

    if (!metricWithinRanges(metrics.primaryCtaRadiusPx, contract.primaryCtaRadiusPx)) {
        shapeMismatches.push(
            `primaryCtaRadiusPx=${metrics.primaryCtaRadiusPx} expected=${formatRangeSpec(contract.primaryCtaRadiusPx)}`
        );
    }

    if (!metricWithinRanges(metrics.inputRadiusPx, contract.inputRadiusPx)) {
        shapeMismatches.push(
            `inputRadiusPx=${metrics.inputRadiusPx} expected=${formatRangeSpec(contract.inputRadiusPx)}`
        );
    }

    if (!metricWithinRanges(metrics.cardRadiusPx, contract.cardRadiusPx)) {
        shapeMismatches.push(
            `cardRadiusPx=${metrics.cardRadiusPx} expected=${formatRangeSpec(contract.cardRadiusPx)}`
        );
    }

    if (
        Number.isFinite(metrics.buttonFamilyCount) &&
        Number(metrics.buttonFamilyCount) > 0 &&
        Number.isFinite(contract.maxButtonFamilyCount) &&
        Number(metrics.buttonFamilyCount) > Number(contract.maxButtonFamilyCount)
    ) {
        buttonMismatches.push(
            `buttonFamilyCount=${metrics.buttonFamilyCount} expected<=${contract.maxButtonFamilyCount}`
        );
    }

    if (fontMismatches.length > 0) {
        findings.push(createVisualFinding({
            route: page.route,
            viewport: page.viewport,
            severity: fontMismatches.some((entry) => (
                entry.includes('forbidden=') ||
                entry.includes('headingFontFamily=') ||
                entry.includes('bodyFontFamily=')
            )) ? 'high' : 'medium',
            category: 'font_drift',
            message: 'This page breaks the explicit typography contract for its page family.',
            evidence: fontMismatches.join('; '),
            likelyCause: 'The route is using a legacy font stack or a type scale outside the approved standard.',
            screenshotPath: pageScreenshotPath(page),
            source: 'design_contract'
        }));
    }

    if (surfaceMismatches.length > 0) {
        findings.push(createVisualFinding({
            route: page.route,
            viewport: page.viewport,
            severity: surfaceMismatches.some((entry) => entry.includes('visualIntent=')) ? 'high' : 'medium',
            category: 'surface_drift',
            message: 'This page breaks the explicit surface/theme contract for its page family.',
            evidence: surfaceMismatches.join('; '),
            likelyCause: 'The route is using a legacy dark shell or the wrong light/dark system for this cohort.',
            screenshotPath: pageScreenshotPath(page),
            source: 'design_contract'
        }));
    }

    if (shapeMismatches.length > 0) {
        findings.push(createVisualFinding({
            route: page.route,
            viewport: page.viewport,
            severity: 'medium',
            category: 'shape_drift',
            message: 'This page breaks the explicit radius/shape contract for its page family.',
            evidence: shapeMismatches.join('; '),
            likelyCause: 'Buttons, inputs, or cards are still using a legacy rounding system.',
            screenshotPath: pageScreenshotPath(page),
            source: 'design_contract'
        }));
    }

    if (buttonMismatches.length > 0) {
        findings.push(createVisualFinding({
            route: page.route,
            viewport: page.viewport,
            severity: 'medium',
            category: 'button_variant_sprawl',
            message: 'This page exceeds the allowed CTA/button variety for its page family.',
            evidence: buttonMismatches.join('; '),
            likelyCause: 'The page is accumulating extra button treatments instead of reusing the shared component set.',
            screenshotPath: pageScreenshotPath(page),
            source: 'design_contract'
        }));
    }

    return findings;
}

function destinationPagesForRoutes(pages, routes, viewport) {
    const routeSet = new Set((routes || []).map((route) => normalizeRoute(route)));
    return pages.filter((page) => page.viewport === viewport && routeSet.has(normalizeRoute(page.route)));
}

function getSurfaceDestinationPolicy(surfaceKey) {
    if (surfaceKey === 'brandsNav') {
        return {
            label: 'Cars Brands',
            category: 'card_consistency',
            expectedCohorts: ['brand_landing'],
            requireSingleCohort: true
        };
    }

    if (surfaceKey === 'typesNav') {
        return {
            label: 'Cars Types',
            category: 'card_consistency',
            expectedCohorts: ['guide_landing', 'brand_landing', 'fleet'],
            requireSingleCohort: true
        };
    }

    if (surfaceKey === 'homeCategories') {
        return {
            label: 'Homepage categories',
            category: 'card_consistency',
            expectedCohorts: ['guide_landing', 'brand_landing', 'fleet'],
            requireSingleCohort: true
        };
    }

    if (surfaceKey === 'fleetCards') {
        return {
            label: 'Fleet cards',
            category: 'fleet_handoff',
            expectedCohorts: ['vehicle_pdp'],
            requireSingleCohort: true
        };
    }

    return null;
}

function buildCohortFindings(pages) {
    const groups = new Map();
    const findings = [];
    const comparableCohorts = new Set(['brand_landing', 'guide_landing', 'service_landing', 'vehicle_pdp']);
    const referenceRoutes = {
        brand_landing: BRAND_REFERENCE_ROUTE,
        vehicle_pdp: VEHICLE_REFERENCE_ROUTE
    };

    for (const page of pages) {
        const cohort = classifyRouteCohort(page.route);

        if (!comparableCohorts.has(cohort)) {
            continue;
        }

        const key = `${cohort}::${page.viewport}`;
        const group = groups.get(key) || [];
        group.push({ ...page, cohort });
        groups.set(key, group);
    }

    for (const [groupKey, groupPages] of groups.entries()) {
        if (groupPages.length < 2) {
            continue;
        }

        const [cohort] = groupKey.split('::');
        const referenceRoute = referenceRoutes[cohort] || '';
        const referencePage = referenceRoute
            ? groupPages.find((page) => normalizeRoute(page.route) === normalizeRoute(referenceRoute))
            : null;
        const templateReference = referencePage?.metrics?.templateFamily || mode(groupPages.map((page) => page.metrics?.templateFamily));
        const headerReference = referencePage?.metrics?.headerFamily || mode(groupPages.map((page) => page.metrics?.headerFamily));
        const bookingReference = referencePage
            ? Boolean(referencePage.metrics?.hasBookingAside)
            : mode(groupPages.map((page) => String(Boolean(page.metrics?.hasBookingAside)))) === 'true';
        const trustReference = referencePage
            ? Boolean(referencePage.metrics?.hasTrustRow)
            : mode(groupPages.map((page) => String(Boolean(page.metrics?.hasTrustRow)))) === 'true';
        const headingReference = referencePage?.metrics?.headingTopRatio ?? average(groupPages.map((page) => page.metrics?.headingTopRatio));
        const actionReference = referencePage?.metrics?.heroActionCount ?? average(groupPages.map((page) => page.metrics?.heroActionCount));

        for (const page of groupPages) {
            if (referencePage && normalizeRoute(page.route) === normalizeRoute(referencePage.route)) {
                continue;
            }

            const mismatches = [];
            const templateMismatch = Boolean(page.metrics?.templateFamily) && page.metrics.templateFamily !== templateReference;
            const headerMismatch = Boolean(page.metrics?.headerFamily) && page.metrics.headerFamily !== headerReference;
            const bookingMismatch = Boolean(page.metrics?.hasBookingAside) !== bookingReference;
            const trustMismatch = Boolean(page.metrics?.hasTrustRow) !== trustReference;
            const headingShift = Math.abs((page.metrics?.headingTopRatio || 0) - headingReference) > 0.18;
            const actionShift = Math.abs((page.metrics?.heroActionCount || 0) - actionReference) > 1.25;

            if (templateMismatch) {
                mismatches.push(`templateFamily=${page.metrics.templateFamily} reference=${templateReference}`);
            }

            if (headerMismatch) {
                mismatches.push(`headerFamily=${page.metrics.headerFamily} reference=${headerReference}`);
            }

            if (bookingMismatch && (cohort === 'brand_landing' || cohort === 'vehicle_pdp')) {
                mismatches.push(`hasBookingAside=${Boolean(page.metrics?.hasBookingAside)} reference=${bookingReference}`);
            }

            if (trustMismatch && cohort === 'brand_landing') {
                mismatches.push(`hasTrustRow=${Boolean(page.metrics?.hasTrustRow)} reference=${trustReference}`);
            }

            if (headingShift && !referencePage) {
                mismatches.push(`headingTopRatio=${page.metrics?.headingTopRatio} reference=${headingReference.toFixed(3)}`);
            }

            if (actionShift && cohort !== 'vehicle_pdp') {
                mismatches.push(`heroActionCount=${page.metrics?.heroActionCount} reference=${Number(actionReference.toFixed(2))}`);
            }

            if (mismatches.length === 0) {
                continue;
            }

            const severeMismatch = templateMismatch || headerMismatch;
            const category = cohort === 'brand_landing' && severeMismatch ? 'legacy_template' : 'cohort_mismatch';
            const message = cohort === 'brand_landing' && referencePage
                ? 'This brand landing does not match the current Ferrari reference shell.'
                : cohort === 'vehicle_pdp'
                    ? 'This vehicle detail page drifts away from the shared fleet handoff template.'
                    : 'This page is a visual outlier inside its cohort.';

            findings.push(createVisualFinding({
                route: page.route,
                viewport: page.viewport,
                severity: severeMismatch ? 'high' : 'medium',
                category,
                message,
                evidence: mismatches.join('; '),
                likelyCause: cohort === 'brand_landing'
                    ? 'The route is still using an older landing shell instead of the current premium brand template.'
                    : 'This route diverged from the dominant structure inside the same landing family.',
                screenshotPath: pageScreenshotPath(page),
                source: 'cohort'
            }));
        }
    }

    return findings;
}

function buildProfileReferenceFindings(pages) {
    const findings = [];

    for (const page of pages) {
        const referenceRoute = PROFILE_REFERENCE_ROUTES[page.profile];

        if (!referenceRoute || normalizeRoute(page.route) === normalizeRoute(referenceRoute)) {
            continue;
        }

        const referencePage = pages.find((candidate) => (
            candidate.viewport === page.viewport &&
            normalizeRoute(candidate.route) === normalizeRoute(referenceRoute)
        ));

        if (!referencePage) {
            continue;
        }

        const mismatches = [];
        const legacyMismatch = hasLegacyVisualIntent(page.metrics) && !hasLegacyVisualIntent(referencePage.metrics);
        const headerMismatch = Boolean(page.metrics?.headerFamily) && Boolean(referencePage.metrics?.headerFamily) &&
            page.metrics.headerFamily !== referencePage.metrics.headerFamily;
        const orbitronMismatch = String(page.metrics?.headingFontFamily || '').includes('orbitron') &&
            !String(referencePage.metrics?.headingFontFamily || '').includes('orbitron');
        const luminanceDelta = Math.abs(
            Number(page.metrics?.bodyBackgroundLuminance || 0) -
            Number(referencePage.metrics?.bodyBackgroundLuminance || 0)
        );

        if (legacyMismatch) {
            mismatches.push(`visualIntent=${page.metrics?.visualIntent} reference=${referencePage.metrics?.visualIntent}`);
        }

        if (headerMismatch) {
            mismatches.push(`headerFamily=${page.metrics?.headerFamily} reference=${referencePage.metrics?.headerFamily}`);
        }

        if (orbitronMismatch) {
            mismatches.push(`headingFontFamily=${page.metrics?.headingFontFamily} reference=${referencePage.metrics?.headingFontFamily}`);
        }

        if (legacyMismatch && luminanceDelta > 0.45) {
            mismatches.push(`bodyBackgroundLuminance=${page.metrics?.bodyBackgroundLuminance} reference=${referencePage.metrics?.bodyBackgroundLuminance}`);
        }

        if (mismatches.length === 0) {
            continue;
        }

        findings.push(createVisualFinding({
            route: page.route,
            viewport: page.viewport,
            severity: legacyMismatch || orbitronMismatch || headerMismatch ? 'high' : 'medium',
            category: legacyMismatch ? 'legacy_template' : 'cohort_mismatch',
            message: page.profile === 'contact'
                ? 'This contact page does not match the current premium marketing shell.'
                : 'This marketing page drifts away from the approved modern shell.',
            evidence: mismatches.join('; '),
            likelyCause: 'This route still uses an older visual language than the rest of the shared marketing experience.',
            screenshotPath: pageScreenshotPath(page),
            source: 'profile_reference'
        }));
    }

    return findings;
}

function numericDifference(left, right) {
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return 0;
    }

    return Math.abs(left - right);
}

function radiusBucket(value) {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    return Math.round(value / 2) * 2;
}

function safeRatio(value, total) {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
        return null;
    }

    return value / total;
}

function rectWidthRatio(rect, containerRect, viewportWidth) {
    const effectiveWidth = Number(containerRect?.width || viewportWidth || 0);
    return rect ? safeRatio(rect.width, effectiveWidth) : null;
}

function rectTopRatio(rect, viewportHeight) {
    return rect ? safeRatio(rect.top, viewportHeight) : null;
}

function rectBottomRatio(rect, viewportHeight) {
    return rect ? safeRatio(rect.bottom, viewportHeight) : null;
}

function buildDesignSystemFindings(pages) {
    const findings = [];
    const cohortGroups = new Map();
    const contractBackedPages = new Set();
    const strictHeadingCohorts = new Set(['brand_landing', 'vehicle_pdp', 'guide_landing', 'service_landing']);

    for (const page of pages) {
        const contract = getDesignContractForPage(page);
        const globalForbiddenFonts = collectForbiddenFontMismatches(page.metrics || {});

        if (contract) {
            contractBackedPages.add(pageKey(page.route, page.viewport));
            findings.push(...buildContractDesignSystemFindings(page, contract));
        } else if (globalForbiddenFonts.length > 0) {
            findings.push(createVisualFinding({
                route: page.route,
                viewport: page.viewport,
                severity: 'high',
                category: 'font_drift',
                message: 'This page uses a forbidden legacy font outside the approved app standard.',
                evidence: globalForbiddenFonts.join('; '),
                likelyCause: 'Legacy typography is still active on this route.',
                screenshotPath: pageScreenshotPath(page),
                source: 'design_contract'
            }));
        }
    }

    for (const page of pages) {
        const cohort = classifyRouteCohort(page.route);
        const key = `${cohort}::${page.viewport}`;
        const group = cohortGroups.get(key) || [];
        group.push({ ...page, cohort });
        cohortGroups.set(key, group);
    }

    for (const [groupKey, groupPages] of cohortGroups.entries()) {
        if (groupPages.length < 2) {
            continue;
        }

        const [cohort, viewport] = groupKey.split('::');
        const referenceRoute = COHORT_REFERENCE_ROUTES[cohort] || '';
        const referencePage = referenceRoute
            ? pages.find((page) => page.viewport === viewport && normalizeRoute(page.route) === normalizeRoute(referenceRoute))
            : null;
        const fallbackReference = groupPages.find((page) => page.metrics?.templateFamily === mode(groupPages.map((entry) => entry.metrics?.templateFamily))) || groupPages[0];
        const resolvedReference = referencePage || fallbackReference;
        const referenceMetrics = resolvedReference?.metrics || {};

        for (const page of groupPages) {
            if (
                !resolvedReference ||
                normalizeRoute(page.route) === normalizeRoute(resolvedReference.route) ||
                contractBackedPages.has(pageKey(page.route, page.viewport))
            ) {
                continue;
            }

            const fontMismatches = [];
            const surfaceMismatches = [];
            const shapeMismatches = [];
            const buttonMismatches = [];

            if (
                strictHeadingCohorts.has(cohort) &&
                page.metrics?.headingFontFamily &&
                referenceMetrics.headingFontFamily &&
                page.metrics.headingFontFamily !== referenceMetrics.headingFontFamily
            ) {
                fontMismatches.push(`headingFontFamily=${page.metrics.headingFontFamily} reference=${referenceMetrics.headingFontFamily}`);
            }

            if (
                page.metrics?.bodyFontFamily &&
                referenceMetrics.bodyFontFamily &&
                page.metrics.bodyFontFamily !== referenceMetrics.bodyFontFamily
            ) {
                fontMismatches.push(`bodyFontFamily=${page.metrics.bodyFontFamily} reference=${referenceMetrics.bodyFontFamily}`);
            }

            if (numericDifference(page.metrics?.bodyFontSizePx, referenceMetrics.bodyFontSizePx) > 3.5) {
                fontMismatches.push(`bodyFontSizePx=${page.metrics?.bodyFontSizePx} reference=${referenceMetrics.bodyFontSizePx}`);
            }

            if (numericDifference(page.metrics?.bodyLineHeightPx, referenceMetrics.bodyLineHeightPx) > 6) {
                fontMismatches.push(`bodyLineHeightPx=${page.metrics?.bodyLineHeightPx} reference=${referenceMetrics.bodyLineHeightPx}`);
            }

            if (
                page.metrics?.visualIntent &&
                referenceMetrics.visualIntent &&
                page.metrics.visualIntent !== referenceMetrics.visualIntent &&
                !hasLegacyVisualIntent(page.metrics) &&
                !hasLegacyVisualIntent(referenceMetrics)
            ) {
                surfaceMismatches.push(`visualIntent=${page.metrics.visualIntent} reference=${referenceMetrics.visualIntent}`);
            }

            if (numericDifference(page.metrics?.bodyBackgroundLuminance, referenceMetrics.bodyBackgroundLuminance) > 0.24) {
                surfaceMismatches.push(`bodyBackgroundLuminance=${page.metrics?.bodyBackgroundLuminance} reference=${referenceMetrics.bodyBackgroundLuminance}`);
            }

            if (
                Number(page.metrics?.cardBackgroundLuminance || 0) > 0 &&
                Number(referenceMetrics.cardBackgroundLuminance || 0) > 0 &&
                numericDifference(page.metrics?.cardBackgroundLuminance, referenceMetrics.cardBackgroundLuminance) > 0.24
            ) {
                surfaceMismatches.push(`cardBackgroundLuminance=${page.metrics?.cardBackgroundLuminance} reference=${referenceMetrics.cardBackgroundLuminance}`);
            }

            if (
                Number(page.metrics?.primaryCtaRadiusPx || 0) > 0 &&
                Number(referenceMetrics.primaryCtaRadiusPx || 0) > 0 &&
                Number(page.metrics?.primaryCtaRadiusPx || 0) <= 48 &&
                Number(referenceMetrics.primaryCtaRadiusPx || 0) <= 48 &&
                numericDifference(page.metrics?.primaryCtaRadiusPx, referenceMetrics.primaryCtaRadiusPx) > 8
            ) {
                shapeMismatches.push(`primaryCtaRadiusPx=${page.metrics?.primaryCtaRadiusPx} reference=${referenceMetrics.primaryCtaRadiusPx}`);
            }

            if (
                Number(page.metrics?.inputRadiusPx || 0) > 0 &&
                Number(referenceMetrics.inputRadiusPx || 0) > 0 &&
                Number(page.metrics?.inputRadiusPx || 0) <= 48 &&
                numericDifference(page.metrics?.inputRadiusPx, referenceMetrics.inputRadiusPx) > 8
            ) {
                shapeMismatches.push(`inputRadiusPx=${page.metrics?.inputRadiusPx} reference=${referenceMetrics.inputRadiusPx}`);
            }

            if (
                Number(page.metrics?.cardRadiusPx || 0) > 0 &&
                Number(referenceMetrics.cardRadiusPx || 0) > 0 &&
                Number(page.metrics?.cardRadiusPx || 0) <= 48 &&
                numericDifference(page.metrics?.cardRadiusPx, referenceMetrics.cardRadiusPx) > 8
            ) {
                shapeMismatches.push(`cardRadiusPx=${page.metrics?.cardRadiusPx} reference=${referenceMetrics.cardRadiusPx}`);
            }

            if (
                Number(page.metrics?.buttonFamilyCount || 0) > Math.max(5, Number(referenceMetrics.buttonFamilyCount || 0) + 2)
            ) {
                buttonMismatches.push(`buttonFamilyCount=${page.metrics?.buttonFamilyCount} reference=${referenceMetrics.buttonFamilyCount || 0}`);
            }

            if (fontMismatches.length > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: fontMismatches.some((entry) => entry.includes('headingFontFamily') || entry.includes('bodyFontFamily')) ? 'high' : 'medium',
                    category: 'font_drift',
                    message: 'This page drifts away from its cohort typography system.',
                    evidence: fontMismatches.join('; '),
                    likelyCause: 'The route is using a different font family or type scale than the approved page family.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'design_system'
                }));
            }

            if (surfaceMismatches.length > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: surfaceMismatches.some((entry) => entry.includes('visualIntent=')) ? 'high' : 'medium',
                    category: 'surface_drift',
                    message: 'This page uses a surface/background treatment outside its cohort standard.',
                    evidence: surfaceMismatches.join('; '),
                    likelyCause: 'A route is mixing a different background or theme treatment than the rest of the family.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'design_system'
                }));
            }

            if (shapeMismatches.length > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'shape_drift',
                    message: 'This page uses radius values outside its cohort shape scale.',
                    evidence: shapeMismatches.join('; '),
                    likelyCause: 'Buttons, inputs, or cards are using a different rounding system than the rest of the app.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'design_system'
                }));
            }

            if (buttonMismatches.length > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'button_variant_sprawl',
                    message: 'This page introduces more button treatment variety than its cohort standard.',
                    evidence: buttonMismatches.join('; '),
                    likelyCause: 'The page is accumulating extra button styles instead of reusing the shared CTA system.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'design_system'
                }));
            }
        }
    }

    const viewportGroups = new Map();

    for (const page of pages) {
        if (
            !page.metrics?.usesSharedLabHeader ||
            hasLegacyVisualIntent(page.metrics) ||
            page.metrics?.templateFamily === 'generic'
        ) {
            continue;
        }

        const group = viewportGroups.get(page.viewport) || [];
        group.push(page);
        viewportGroups.set(page.viewport, group);
    }

    for (const [viewport, viewportPages] of viewportGroups.entries()) {
        if (viewportPages.length < 3) {
            continue;
        }

        const bodyFontReference = mode(viewportPages.map((page) => page.metrics?.bodyFontFamily));

        for (const page of viewportPages) {
            if (contractBackedPages.has(pageKey(page.route, viewport))) {
                continue;
            }

            if (
                bodyFontReference &&
                page.metrics?.bodyFontFamily &&
                page.metrics.bodyFontFamily !== bodyFontReference
            ) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport,
                    severity: 'medium',
                    category: 'font_drift',
                    message: 'This page does not use the app-wide body type standard.',
                    evidence: `bodyFontFamily=${page.metrics.bodyFontFamily} reference=${bodyFontReference}`,
                    likelyCause: 'A page-level stylesheet changed the base reading font away from the shared system.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'design_system'
                }));
            }

        }
    }

    return findings;
}

function buildTemplateFamilyFindings(pages) {
    const findings = [];
    const groups = new Map();
    const comparableFamilies = new Set([
        'local_guide',
        'service_detail',
        'vehicle_pdp_split'
    ]);

    for (const page of pages) {
        const cohort = classifyRouteCohort(page.route);
        const templateFamily = page.metrics?.templateFamily || '';

        if (!comparableFamilies.has(templateFamily)) {
            continue;
        }

        const key = `${cohort}::${templateFamily}::${page.viewport}`;
        const group = groups.get(key) || [];
        group.push({ ...page, cohort, templateFamily });
        groups.set(key, group);
    }

    for (const [groupKey, groupPages] of groups.entries()) {
        if (groupPages.length < 2) {
            continue;
        }

        const [cohort, templateFamily] = groupKey.split('::');
        const referenceRoute = TEMPLATE_FAMILY_REFERENCE_ROUTES[`${cohort}::${templateFamily}`] || '';
        const referencePage = referenceRoute
            ? groupPages.find((page) => normalizeRoute(page.route) === normalizeRoute(referenceRoute))
            : groupPages[0];
        const resolvedReference = referencePage || groupPages[0];
        const referenceMetrics = resolvedReference?.metrics || {};

        for (const page of groupPages) {
            if (!resolvedReference || normalizeRoute(page.route) === normalizeRoute(resolvedReference.route)) {
                continue;
            }

            const mismatches = [];
            const headingShift = numericDifference(page.metrics?.headingTopRatio, referenceMetrics.headingTopRatio);
            const ctaShift = numericDifference(page.metrics?.primaryCtaTopRatio, referenceMetrics.primaryCtaTopRatio);
            const actionShift = numericDifference(page.metrics?.heroActionCount, referenceMetrics.heroActionCount);

            if (headingShift > 0.14) {
                mismatches.push(`headingTopRatio=${page.metrics?.headingTopRatio} reference=${referenceMetrics.headingTopRatio}`);
            }

            if (ctaShift > 0.14) {
                mismatches.push(`primaryCtaTopRatio=${page.metrics?.primaryCtaTopRatio} reference=${referenceMetrics.primaryCtaTopRatio}`);
            }

            if (actionShift > 1.25) {
                mismatches.push(`heroActionCount=${page.metrics?.heroActionCount} reference=${referenceMetrics.heroActionCount}`);
            }

            if (templateFamily === 'local_guide') {
                const pageBottomRatio = rectBottomRatio(page.metrics?.heroRect, page.metrics?.viewportHeight);
                const referenceBottomRatio = rectBottomRatio(referenceMetrics?.heroRect, referenceMetrics?.viewportHeight);

                if (numericDifference(pageBottomRatio, referenceBottomRatio) > 0.14) {
                    mismatches.push(`heroBottomRatio=${pageBottomRatio} reference=${referenceBottomRatio}`);
                }
            }

            if (templateFamily === 'service_detail') {
                const pageHeadingInsideHero = Boolean(page.metrics?.headingInsideHeroMedia);
                const referenceHeadingInsideHero = Boolean(referenceMetrics?.headingInsideHeroMedia);

                if (pageHeadingInsideHero !== referenceHeadingInsideHero) {
                    mismatches.push(`headingInsideHeroMedia=${pageHeadingInsideHero} reference=${referenceHeadingInsideHero}`);
                }
            }

            if (templateFamily === 'vehicle_pdp_split') {
                const pagePrimaryRatio = rectWidthRatio(page.metrics?.vehicleHeroMediaRect, page.metrics?.heroRect, page.metrics?.viewportWidth);
                const referencePrimaryRatio = rectWidthRatio(referenceMetrics?.vehicleHeroMediaRect, referenceMetrics?.heroRect, referenceMetrics?.viewportWidth);
                const pageSecondaryRatio = rectWidthRatio(
                    page.metrics?.vehicleHeroSupportRect || page.metrics?.vehicleBookingRect,
                    page.metrics?.heroRect,
                    page.metrics?.viewportWidth
                );
                const referenceSecondaryRatio = rectWidthRatio(
                    referenceMetrics?.vehicleHeroSupportRect || referenceMetrics?.vehicleBookingRect,
                    referenceMetrics?.heroRect,
                    referenceMetrics?.viewportWidth
                );

                if (pagePrimaryRatio === null || referencePrimaryRatio === null) {
                    mismatches.push(`primaryRegionDetected=${pagePrimaryRatio !== null} reference=${referencePrimaryRatio !== null}`);
                } else if (numericDifference(pagePrimaryRatio, referencePrimaryRatio) > 0.1) {
                    mismatches.push(`primaryWidthRatio=${pagePrimaryRatio.toFixed(3)} reference=${referencePrimaryRatio.toFixed(3)}`);
                }

                if (pageSecondaryRatio === null || referenceSecondaryRatio === null) {
                    mismatches.push(`supportRegionDetected=${pageSecondaryRatio !== null} reference=${referenceSecondaryRatio !== null}`);
                } else if (numericDifference(pageSecondaryRatio, referenceSecondaryRatio) > 0.08) {
                    mismatches.push(`supportWidthRatio=${pageSecondaryRatio.toFixed(3)} reference=${referenceSecondaryRatio.toFixed(3)}`);
                }
            }

            if (mismatches.length === 0) {
                continue;
            }

            findings.push(createVisualFinding({
                route: page.route,
                viewport: page.viewport,
                severity: mismatches.some((entry) => entry.includes('RegionDetected=')) ? 'high' : 'medium',
                category: 'family_layout_drift',
                message: 'This page drifts away from the first-viewport pattern used by the rest of its template family.',
                evidence: mismatches.join('; '),
                likelyCause: 'The route no longer follows the shared spatial rhythm of its family and needs either a deliberate exception or a layout update.',
                screenshotPath: pageScreenshotPath(page),
                source: 'family_reference'
            }));
        }
    }

    return findings;
}

function buildSurfaceFindings(pages) {
    const findings = [];
    const surfaceLabels = {
        brandsNav: 'Cars Brands',
        typesNav: 'Cars Types',
        homeCategories: 'Homepage categories',
        fleetCards: 'Fleet cards'
    };

    for (const page of pages) {
        const surfaces = page.surfaceMetrics || {};

        for (const [surfaceKey, surface] of Object.entries(surfaces)) {
            if (!surface) {
                continue;
            }

            const surfaceLabel = surfaceLabels[surfaceKey] || surfaceKey;
            const surfacePolicy = getSurfaceDestinationPolicy(surfaceKey);

            if (surface.count === 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'high',
                    category: 'card_consistency',
                    message: `${surfaceLabel} did not expose any measurable cards.`,
                    evidence: `${surfaceKey}.count=0`,
                    likelyCause: 'The surface is hidden, collapsed, or not rendering its cards.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
                continue;
            }

            if (surface.missingImageCount > 0 || surface.missingLabelCount > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'high',
                    category: 'card_consistency',
                    message: `${surfaceLabel} has cards with missing media or labels.`,
                    evidence: `missingImageCount=${surface.missingImageCount}; missingLabelCount=${surface.missingLabelCount}`,
                    likelyCause: 'A card surface is rendering incomplete content.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }

            if ((surface.missingRouteCount || 0) > 0 || (surface.localAnchorCount || 0) > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: surfacePolicy?.category || 'card_consistency',
                    message: `${surfaceLabel} includes cards without a real destination page.`,
                    evidence: `missingRouteCount=${surface.missingRouteCount || 0}; localAnchorCount=${surface.localAnchorCount || 0}; samePageRouteCount=${surface.samePageRouteCount || 0}`,
                    likelyCause: 'A visible card is still acting like a local jump or placeholder instead of leading to its own page.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }

            if ((surface.duplicateRouteCount || 0) > 0 && (surface.uniqueRouteCount || 0) < surface.count) {
                const duplicateSeverity = (surface.uniqueRouteCount || 0) <= 1 ? 'high' : 'medium';

                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: duplicateSeverity,
                    category: surfacePolicy?.category || 'card_consistency',
                    message: `${surfaceLabel} collapses multiple cards onto the same destination.`,
                    evidence: `duplicateRouteCount=${surface.duplicateRouteCount || 0}; uniqueRouteCount=${surface.uniqueRouteCount || 0}; routes=${(surface.routeTokens || surface.routes || []).join(', ')}`,
                    likelyCause: 'Different visible cards are reusing the same page, so the surface looks broader than the destination experience really is.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }

            if (surface.heightSpread > 72 || surface.widthSpread > 72) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'card_consistency',
                    message: `${surfaceLabel} has unstable card sizing.`,
                    evidence: `widthSpread=${surface.widthSpread}; heightSpread=${surface.heightSpread}`,
                    likelyCause: 'Card copy length or media framing is making the surface visually uneven.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }

            if (surfacePolicy && surface.routes?.length > 0) {
                const linkedCohorts = uniqueValues(surface.routes.map((route) => classifyRouteCohort(route)));
                const unexpectedCohorts = linkedCohorts.filter((cohort) => !surfacePolicy.expectedCohorts.includes(cohort));

                if (unexpectedCohorts.length > 0) {
                    findings.push(createVisualFinding({
                        route: page.route,
                        viewport: page.viewport,
                        severity: 'medium',
                        category: surfacePolicy.category,
                        message: `${surfacePolicy.label} points to routes outside its expected destination family.`,
                        evidence: `linkedCohorts=${linkedCohorts.join(', ')}; unexpectedCohorts=${unexpectedCohorts.join(', ')}`,
                        likelyCause: 'One or more cards still lead to a route that belongs to a different product family or a placeholder page.',
                        screenshotPath: pageScreenshotPath(page),
                        source: 'surface'
                    }));
                }

                if (surfacePolicy.requireSingleCohort && linkedCohorts.length > 1) {
                    findings.push(createVisualFinding({
                        route: page.route,
                        viewport: page.viewport,
                        severity: 'medium',
                        category: surfacePolicy.category,
                        message: `${surfacePolicy.label} mixes multiple destination families.`,
                        evidence: `linkedCohorts=${linkedCohorts.join(', ')}; routes=${(surface.routes || []).join(', ')}`,
                        likelyCause: 'The cards look like one curated family, but they hand off into pages built with different visual intents.',
                        screenshotPath: pageScreenshotPath(page),
                        source: 'surface'
                    }));
                }
            }
        }

        if ((page.route === '/' || page.route === '/fleet.html') && page.surfaceMetrics?.brandsNav?.routes?.length > 1) {
            const destinations = destinationPagesForRoutes(pages, page.surfaceMetrics.brandsNav.routes, page.viewport);
            const families = uniqueValues(destinations.map((destination) => destination.metrics?.templateFamily));

            if (destinations.length < page.surfaceMetrics.brandsNav.routes.length) {
                const missingRoutes = page.surfaceMetrics.brandsNav.routes.filter((route) => !destinations.some((destination) => normalizeRoute(destination.route) === normalizeRoute(route)));

                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'card_consistency',
                    message: 'Some Cars Brands destinations were not audited in this run.',
                    evidence: `missingRoutes=${missingRoutes.join(', ')}`,
                    likelyCause: 'The run scope skipped one or more brand landings linked from the navigation.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }

            if (families.length > 1) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'card_consistency',
                    message: 'Cars Brands cards lead to visually mixed landing families.',
                    evidence: `templateFamilies=${families.join(', ')}; routes=${destinations.map((destination) => normalizeRoute(destination.route)).join(', ')}`,
                    likelyCause: 'Some brand landings still use an older shell while others already use the new reference design.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }
        }

        if ((page.route === '/' || page.route === '/fleet.html') && page.surfaceMetrics?.typesNav?.routes?.length > 0) {
            const typeDestinations = destinationPagesForRoutes(pages, page.surfaceMetrics.typesNav.routes, page.viewport);
            const missingRoutes = uniqueValues(page.surfaceMetrics.typesNav.routes).filter((route) => !typeDestinations.some((destination) => normalizeRoute(destination.route) === normalizeRoute(route)));
            const typeFamilies = uniqueValues(typeDestinations.map((destination) => destination.metrics?.templateFamily));
            const typeCohorts = uniqueValues(typeDestinations.map((destination) => classifyRouteCohort(destination.route)));

            if (missingRoutes.length > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'card_consistency',
                    message: 'Some Cars Types destinations were not audited in this run.',
                    evidence: `missingRoutes=${missingRoutes.join(', ')}`,
                    likelyCause: 'The run scope skipped one or more type destinations linked from the navigation.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }

            if (typeFamilies.length > 1 && typeCohorts.length <= 1) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'card_consistency',
                    message: 'Cars Types cards hand off into mixed destination families.',
                    evidence: `destinationCohorts=${typeCohorts.join(', ') || 'n/a'}; templateFamilies=${typeFamilies.join(', ') || 'n/a'}`,
                    likelyCause: 'Type cards still send users into a mix of guide, brand, or generic pages instead of one coherent experience family.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }
        }

        if (page.route === '/' && page.surfaceMetrics?.homeCategories?.routes?.length > 0) {
            const categoryDestinations = destinationPagesForRoutes(pages, page.surfaceMetrics.homeCategories.routes, page.viewport);
            const missingRoutes = uniqueValues(page.surfaceMetrics.homeCategories.routes).filter((route) => !categoryDestinations.some((destination) => normalizeRoute(destination.route) === normalizeRoute(route)));
            const categoryFamilies = uniqueValues(categoryDestinations.map((destination) => destination.metrics?.templateFamily));
            const categoryCohorts = uniqueValues(categoryDestinations.map((destination) => classifyRouteCohort(destination.route)));

            if (missingRoutes.length > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'card_consistency',
                    message: 'Some homepage category destinations were not audited in this run.',
                    evidence: `missingRoutes=${missingRoutes.join(', ')}`,
                    likelyCause: 'The run scope skipped one or more category destinations linked from the homepage.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }

            if (categoryFamilies.length > 1 && categoryCohorts.length <= 1) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'card_consistency',
                    message: 'Homepage categories hand off into mixed destination families.',
                    evidence: `destinationCohorts=${categoryCohorts.join(', ') || 'n/a'}; templateFamilies=${categoryFamilies.join(', ') || 'n/a'}`,
                    likelyCause: 'The homepage categories are mixing guide, brand, or local-anchor destinations instead of one consistent landing family.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }
        }

        if (page.profile === 'fleet' && page.surfaceMetrics?.fleetCards?.routes?.length > 0) {
            const fleetDestinations = destinationPagesForRoutes(pages, page.surfaceMetrics.fleetCards.routes, page.viewport);
            const missingRoutes = page.surfaceMetrics.fleetCards.routes.filter((route) => !fleetDestinations.some((destination) => normalizeRoute(destination.route) === normalizeRoute(route)));
            const destinationFamilies = uniqueValues(fleetDestinations.map((destination) => destination.metrics?.templateFamily));
            const nonGoodDestinations = fleetDestinations.filter((destination) => destination.assessment?.status !== 'good');

            if (missingRoutes.length > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: 'medium',
                    category: 'fleet_handoff',
                    message: 'Some fleet card destinations were not audited.',
                    evidence: `missingRoutes=${missingRoutes.join(', ')}`,
                    likelyCause: 'The run scope skipped one or more vehicle pages linked from fleet.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }

            if (destinationFamilies.length > 1 || nonGoodDestinations.length > 0) {
                findings.push(createVisualFinding({
                    route: page.route,
                    viewport: page.viewport,
                    severity: nonGoodDestinations.some((destination) => destination.assessment?.status === 'bad') ? 'high' : 'medium',
                    category: 'fleet_handoff',
                    message: 'Fleet card destinations are not fully homogeneous.',
                    evidence: `templateFamilies=${destinationFamilies.join(', ') || 'n/a'}; nonGoodRoutes=${nonGoodDestinations.map((destination) => `${normalizeRoute(destination.route)}:${destination.assessment.status}`).join(', ') || 'none'}`,
                    likelyCause: 'At least one vehicle detail page drifts away from the expected fleet-to-PDP handoff.',
                    screenshotPath: pageScreenshotPath(page),
                    source: 'surface'
                }));
            }
        }
    }

    return findings;
}

function applyCrossPageFindings(pages, extraFindings = []) {
    const findingsByPage = new Map();

    for (const finding of extraFindings) {
        const key = pageKey(finding.route, finding.viewport);
        const list = findingsByPage.get(key) || [];
        list.push(finding);
        findingsByPage.set(key, list);
    }

    return pages.map((page) => {
        const additions = findingsByPage.get(pageKey(page.route, page.viewport)) || [];

        if (additions.length === 0) {
            return page;
        }

        const mergedFindings = [...page.findings, ...additions];
        const provisionalAssessment = scoreVisualPage(page.profile, page.metrics, mergedFindings, {
            baselineDiff: page.baselineDiff
        });
        const vision = buildVisionGateDecision({
            profile: page.profile,
            assessment: provisionalAssessment,
            baselineDiff: page.baselineDiff
        });
        const assessment = scoreVisualPage(page.profile, page.metrics, mergedFindings, {
            baselineDiff: page.baselineDiff,
            vision
        });

        return {
            ...page,
            findings: assessment.findings,
            assessment,
            vision
        };
    });
}

function summarizeCohorts(pages) {
    const summary = {};

    for (const page of pages) {
        const cohort = classifyRouteCohort(page.route);
        const existing = summary[cohort] || {
            pages: 0,
            statuses: { good: 0, review: 0, bad: 0 },
            templateFamilies: []
        };

        existing.pages += 1;
        existing.statuses[page.assessment.status] = (existing.statuses[page.assessment.status] || 0) + 1;
        existing.templateFamilies.push(page.metrics?.templateFamily || 'unknown');
        summary[cohort] = existing;
    }

    for (const cohort of Object.keys(summary)) {
        summary[cohort].templateFamilies = uniqueValues(summary[cohort].templateFamilies);
    }

    return summary;
}

function buildMarkdownReport(report) {
    const lines = [
        '# Visual Agent Report',
        '',
        `Generated at: ${report.generatedAt}`,
        `Base URL: ${report.baseUrl}`,
        `Scope: ${report.scope || 'landings'}`,
        `Fleet click coverage: ${report.includeFleetClicks ? 'enabled' : 'disabled'}`,
        `Routes: ${report.summary.totalRoutes}`,
        `Pages checked: ${report.summary.totalPages}`,
        '',
        '## Summary',
        '',
        `- good: ${report.summary.byStatus.good}`,
        `- review: ${report.summary.byStatus.review}`,
        `- bad: ${report.summary.byStatus.bad}`,
        `- hard fails: ${report.summary.hardFailCount}`,
        '',
        '## Cohorts',
        ''
    ];

    for (const [cohort, details] of Object.entries(report.cohorts || {})) {
        lines.push(`- ${cohort}: ${details.pages} pages, good=${details.statuses.good || 0}, review=${details.statuses.review || 0}, bad=${details.statuses.bad || 0}, templates=${details.templateFamilies.join(', ')}`);
    }

    lines.push(
        '',
        '## Findings'
    );

    for (const page of report.pages) {
        lines.push('');
        lines.push(`### ${page.route} (${page.viewport})`);
        lines.push('');
        lines.push(`- Profile: ${page.profile}`);
        lines.push(`- Status: ${page.assessment.status}`);
        lines.push(`- Score: ${page.assessment.score}`);
        lines.push(`- Baseline: ${page.baselineDiff ? page.baselineDiff.status : 'n/a'}`);
        lines.push(`- Vision: ${page.vision.status}`);
        if ((page.assessment.reviewGates || []).length > 0) {
            lines.push(`- Review gates: ${page.assessment.reviewGates.join(', ')}`);
        }

        if (page.assessment.findings.length === 0) {
            lines.push('- Findings: none');
        } else {
            lines.push('- Findings:');

            for (const finding of page.assessment.findings.slice(0, 6)) {
                lines.push(`  - [${finding.severity}] ${finding.category}: ${finding.message}`);
            }
        }

        lines.push(`- Viewport screenshot: ${page.artifacts.viewportScreenshot}`);

        if (page.artifacts.regionScreenshot) {
            lines.push(`- Region screenshot: ${page.artifacts.regionScreenshot}`);
        }

        if (page.baselineDiff?.diffPath) {
            lines.push(`- Diff image: ${page.baselineDiff.diffPath}`);
        }
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
        label: 'Visual agent static server'
    });

    return {
        baseUrl: resolvedBaseUrl,
        serverHandle
    };
}

async function runPageAudit({ browser, baseUrl, route, viewport, runDir, updateBaselines }) {
    const profile = classifyRouteProfile(route);
    const context = await browser.newContext(buildContextOptions(viewport));
    const page = await context.newPage();
    const consoleErrors = createConsoleTracker(page);
    const networkErrors = createNetworkTracker(page);
    const routeStem = routeFileStem(route);
    const pageDir = path.join(runDir, routeStem, viewport.name);
    const baselineDir = path.join(baselineRoot, routeStem, viewport.name);
    const artifacts = {
        viewportScreenshot: path.join(pageDir, 'viewport.png'),
        regionScreenshot: '',
        regionSelector: '',
        diffPath: ''
    };

    ensureDir(pageDir);
    ensureDir(baselineDir);

    try {
        if (route === '/') {
            await primeHomeAnimations(page);
        }

        await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
        await settlePage(page, 500);
        const metrics = await collectVisualMetrics(page, profile);
        const surfaceMetrics = await collectInteractiveSurfaceMetrics(page, profile, viewport);
        const serviceSelectorStates = route === '/services.html'
            ? await collectServiceSelectorStates(page, pageDir)
            : null;
        await resetInteractiveChrome(page);
        await page.screenshot({
            path: artifacts.viewportScreenshot,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        });

        const regionCapture = await captureRegionScreenshot(
            page,
            PROFILE_SELECTORS[profile]?.cropSelectors || [],
            path.join(pageDir, 'region.png')
        );

        if (regionCapture) {
            artifacts.regionScreenshot = regionCapture.path;
            artifacts.regionSelector = regionCapture.selector;
        }
        let findings = buildDeterministicFindings({
            route,
            viewport,
            profile,
            metrics,
            consoleErrors,
            networkErrors,
            artifacts
        });
        findings = findings.concat(buildServiceInteractionFindings({
            route,
            viewportName: viewport.name,
            serviceSelectorStates,
            screenshotPath: artifacts.viewportScreenshot
        }));

        const baselineResults = [];
        const viewportBaseline = path.join(baselineDir, 'viewport.png');

        if (updateBaselines) {
            fs.copyFileSync(artifacts.viewportScreenshot, viewportBaseline);
            baselineResults.push({
                kind: 'viewport',
                status: 'updated',
                ratio: 0,
                threshold: SNAPSHOT_THRESHOLDS.viewport,
                diffPath: '',
                message: 'Viewport baseline updated.'
            });
        } else {
            baselineResults.push(comparePngFiles({
                currentPath: artifacts.viewportScreenshot,
                baselinePath: viewportBaseline,
                diffPath: path.join(pageDir, 'viewport-diff.png'),
                threshold: SNAPSHOT_THRESHOLDS.viewport,
                kind: 'viewport'
            }));
        }

        if (artifacts.regionScreenshot) {
            const regionBaseline = path.join(baselineDir, 'region.png');

            if (updateBaselines) {
                fs.copyFileSync(artifacts.regionScreenshot, regionBaseline);
                baselineResults.push({
                    kind: 'region',
                    status: 'updated',
                    ratio: 0,
                    threshold: SNAPSHOT_THRESHOLDS.region,
                    diffPath: '',
                    message: 'Region baseline updated.'
                });
            } else {
                baselineResults.push(comparePngFiles({
                    currentPath: artifacts.regionScreenshot,
                    baselinePath: regionBaseline,
                    diffPath: path.join(pageDir, 'region-diff.png'),
                    threshold: SNAPSHOT_THRESHOLDS.region,
                    kind: 'region'
                }));
            }
        }

        const baselineDiff = mergeBaselineResults(baselineResults);

        if (baselineDiff && (baselineDiff.status === 'review' || baselineDiff.status === 'bad')) {
            findings.push(createVisualFinding({
                route,
                viewport: viewport.name,
                severity: baselineDiff.status === 'bad' ? 'high' : 'medium',
                category: 'unexpected_diff',
                message: 'The current screenshot diverges from the approved baseline.',
                evidence: baselineDiff.message,
                likelyCause: 'A visual regression changed a stable viewport or critical region.',
                hardFail: baselineDiff.status === 'bad',
                screenshotPath: baselineDiff.diffPath || artifacts.viewportScreenshot,
                source: 'baseline'
            }));
        }

        const vision = await maybeRunVisionReview({
            route,
            viewport: viewport.name,
            profile,
            metrics,
            findings,
            baselineDiff,
            artifacts,
            pageDir
        });
        const mergedFindings = findings.concat(vision.findings || []);
        const assessment = scoreVisualPage(profile, metrics, mergedFindings, {
            baselineDiff,
            vision
        });

        return {
            route,
            viewport: viewport.name,
            profile,
            metrics,
            surfaceMetrics,
            serviceSelectorStates,
            findings: assessment.findings,
            assessment,
            baselineDiff,
            vision,
            artifacts
        };
    } finally {
        await context.close();
    }
}

async function runVisualAgent(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;
    const baselineApprovalRunDir = resolveBaselineApprovalRunDir(args);

    if (baselineApprovalRunDir) {
        return {
            runDir: baselineApprovalRunDir,
            approval: approveBaselinesFromRun(args),
            report: null
        };
    }

    const selectedRoutes = uniqueValues(
        [
            ...((args.routes && args.routes.length > 0) ? args.routes : getDefaultVisualRoutes(args.scope || 'landings')),
            ...((args.includeFleetClicks ?? true) ? getVehicleVisualRoutes() : [])
        ].map((route) => normalizeRoute(route))
    );
    const selectedViewports = resolveSelectedViewports(args.viewports);
    const generatedAt = new Date().toISOString();
    const runDir = args.outputDir || path.join(artifactsRoot, timestampSlug(new Date(generatedAt)));

    ensureDir(runDir);

    const { baseUrl, serverHandle } = await resolveBaseUrl(args.baseUrl || '');
    const browser = await chromium.launch({ headless: true });

    try {
        const pages = [];

        for (const route of selectedRoutes) {
            for (const viewport of selectedViewports) {
                pages.push(await runPageAudit({
                    browser,
                    baseUrl,
                    route,
                    viewport,
                    runDir,
                    updateBaselines: Boolean(args.updateBaselines)
                }));
            }
        }

        const crossPageFindings = [
            ...buildCohortFindings(pages),
            ...buildProfileReferenceFindings(pages),
            ...buildDesignSystemFindings(pages),
            ...buildTemplateFamilyFindings(pages),
            ...buildSurfaceFindings(pages)
        ];
        const enrichedPages = applyCrossPageFindings(pages, crossPageFindings);
        const findingsSummary = summarizeVisualFindings(enrichedPages.flatMap((page) => page.findings));
        const summary = {
            totalRoutes: selectedRoutes.length,
            totalPages: enrichedPages.length,
            byStatus: {
                good: enrichedPages.filter((page) => page.assessment.status === 'good').length,
                review: enrichedPages.filter((page) => page.assessment.status === 'review').length,
                bad: enrichedPages.filter((page) => page.assessment.status === 'bad').length
            },
            hardFailCount: findingsSummary.counts.hardFails,
            findings: findingsSummary.counts
        };
        const report = {
            generatedAt,
            baseUrl,
            updateBaselines: Boolean(args.updateBaselines),
            scope: args.scope || 'landings',
            includeFleetClicks: Boolean(args.includeFleetClicks ?? true),
            summary,
            cohorts: summarizeCohorts(enrichedPages),
            pages: enrichedPages
        };

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
    const { runDir, report, approval } = await runVisualAgent({ argv: process.argv.slice(2) });

    if (approval) {
        console.log(`Baseline approval completed from: ${approval.sourceRunDir}`);
        console.log(`approved=${approval.approvedCount} skipped=${approval.skippedCount}`);
        return;
    }

    console.log(`Visual agent completed: ${runDir}`);
    console.log(`good=${report.summary.byStatus.good} review=${report.summary.byStatus.review} bad=${report.summary.byStatus.bad}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Visual agent failed.');
        console.error(error.stack || error.message);
        process.exit(1);
    });
}

module.exports = {
    SNAPSHOT_THRESHOLDS,
    VIEWPORTS,
    approveBaselinesFromRun,
    applyCrossPageFindings,
    buildCohortFindings,
    buildDesignSystemFindings,
    buildDeterministicFindings,
    buildServiceInteractionFindings,
    buildMarkdownReport,
    buildProfileReferenceFindings,
    buildSurfaceFindings,
    buildTemplateFamilyFindings,
    comparePngFiles,
    parseArgs,
    routeFileStem,
    summarizeCohorts,
    runVisualAgent
};
