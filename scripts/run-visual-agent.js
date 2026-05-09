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
    evaluateMobileHeroHeadingBalance,
    evaluatePremiumHeaderSurface,
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
    getMobileInteractionContract,
    getSectionRhythmContract,
    getViewportCoverageMatrix
} = require(path.join(__dirname, '..', 'server', 'design-system-contract.js'));
const {
    compareReportToApprovedMemory,
    formatAuditMemoryRegression
} = require(path.join(__dirname, '..', 'server', 'audit-memory-core.js'));

const repoRoot = path.resolve(__dirname, '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'visual-agent');
const baselineRoot = path.join(repoRoot, 'tests', 'visual-baselines');
const baselineManifestPath = path.join(baselineRoot, 'manifest.json');
const pixelmatch = pixelmatchModule.default || pixelmatchModule;

const SELECTABLE_VIEWPORTS = Object.freeze(getViewportCoverageMatrix('all'));
const VIEWPORTS = Object.freeze(getViewportCoverageMatrix('visualAgent'));

const SNAPSHOT_THRESHOLDS = Object.freeze({
    viewport: 0.015,
    region: 0.008
});

const HUMAN_SCENARIO_VALUES = Object.freeze({
    contact: Object.freeze({
        contactName: 'Alex Morgan',
        contactEmail: 'alex.morgan@example.com',
        contactPhone: '+971500000001',
        contactSubject: 'reservation',
        contactMessage: 'I need a two-day Dubai rental with airport delivery and a calm handover.'
    }),
    reserve: Object.freeze({
        startDate: '2026-08-20',
        endDate: '2026-08-22',
        pickupTime: '10:00',
        dropoffTime: '18:00',
        pickupLocation: 'Atlantis The Royal, Palm Jumeirah',
        fullName: 'Sofia Bennett',
        passport: 'XK938271',
        phone: '+971501234567',
        email: 'sofia.bennett@example.com'
    })
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
            '.services-lane-orb',
            '.services-button--primary',
            '.locations-button--primary',
            '.vehicle-hero__actions a'
        ],
        firstUsefulSelectors: [
            'h1',
            '.service-detail-button--primary',
            '.local-guide-button--primary',
            '.about-button--primary',
            '.services-lane-orb',
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
            '.services-lane-orb',
            '.services-button--primary',
            '.locations-button--primary',
            '.vehicle-hero__actions a',
            '.local-guide-hero__aside',
            '.service-detail-hero__panel',
            '.services-hero__selector',
            '.locations-map-card',
            '.vehicle-hero__copy'
        ],
        clipSelectors: [
            'h1',
            '.service-detail-button--primary',
            '.local-guide-button--primary',
            '.about-button--primary',
            '.services-lane-orb',
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
        heroSelectors: ['.hero-grid', '.form-layout', '.lookup-hero__shell'],
        cropSelectors: ['#contactForm', '.lookup-form', '.hero-grid'],
        primaryCtaSelectors: ['.lookup-hero__actions .contact-button--primary', '#contactForm button[type="submit"]', '.lookup-form button[type="submit"]'],
        firstUsefulSelectors: ['h1', '#contactForm', '.lookup-card'],
        headerSelectors: ['header'],
        navSelectors: ['nav[aria-label="Main navigation"]', 'header nav', 'nav'],
        mediaSelectors: [],
        keySelectors: ['h1', '#contactForm label', '#contactForm input', '#contactForm textarea', '#contactForm button', '.lookup-form label', '.lookup-form input', '.lookup-form button', '#contactFormStatus', '#reservationLookupStatus'],
        clipSelectors: ['h1', '#contactForm label', '#contactForm input', '#contactForm textarea', '#contactForm button', '.lookup-form label', '.lookup-form input', '.lookup-form button', '#contactFormStatus', '#reservationLookupStatus'],
        formSelectors: ['#contactForm', '.lookup-form'],
        statusSelectors: ['#contactFormStatus', '#reservationLookupStatus', '[role="status"]'],
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
    const selected = SELECTABLE_VIEWPORTS.filter((viewport) => normalizedNames.includes(viewport.name.toLowerCase()));

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

function slugify(value) {
    return String(value || 'item')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'item';
}

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function formatLocalDateIso(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addLocalDaysIso(offsetDays, baseDate = new Date()) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offsetDays);
    return formatLocalDateIso(date);
}

function normalizeIsoDate(value) {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
        return '';
    }

    const [, year, month, day] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

    if (
        parsed.getUTCFullYear() !== Number(year) ||
        parsed.getUTCMonth() + 1 !== Number(month) ||
        parsed.getUTCDate() !== Number(day)
    ) {
        return '';
    }

    return `${year}-${month}-${day}`;
}

function formatDisplayDateFromIso(value) {
    const normalized = normalizeIsoDate(value);

    if (!normalized) {
        return '';
    }

    const [year, month, day] = normalized.split('-');
    return `${day}/${month}/${year}`;
}

function dateIsoToDayNumber(value) {
    const isoDate = normalizeIsoDate(value);

    if (!isoDate) {
        return NaN;
    }

    const [year, month, day] = isoDate.split('-').map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function parseVisualDateValue(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();

    if (!text) {
        return '';
    }

    const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    const isoDate = normalizeIsoDate(isoMatch?.[0]);

    if (isoDate) {
        return isoDate;
    }

    const dayFirstMatch = text.match(/\b(\d{1,2})\s*[/. -]\s*(\d{1,2})\s*[/. -]\s*(\d{4})\b/);

    if (!dayFirstMatch) {
        return '';
    }

    const day = Number(dayFirstMatch[1]);
    const month = Number(dayFirstMatch[2]);
    const year = Number(dayFirstMatch[3]);

    if (day < 1 || day > 31 || month < 1 || month > 12) {
        return '';
    }

    if (day <= 12 && month <= 12) {
        return '';
    }

    return normalizeIsoDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
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

function extensionForScreenshot(sourcePath) {
    const extension = path.extname(sourcePath || '').toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp'].includes(extension) ? extension : '.png';
}

function buildVisualHumanReviewArtifacts(pages, runDir) {
    const reviewDir = path.join(runDir, 'human-review', 'visual-findings');
    const entries = [];
    let index = 0;

    const enrichedPages = pages.map((page) => {
        const findings = (page.findings || []).map((finding) => {
            index += 1;
            const sourceScreenshot = finding.screenshotPath ||
                page.artifacts?.regionScreenshot ||
                page.artifacts?.viewportScreenshot ||
                '';
            const filename = `${String(index).padStart(3, '0')}-${slugify(page.route)}-${slugify(page.viewport)}-${slugify(finding.category)}${extensionForScreenshot(sourceScreenshot)}`;
            const reviewScreenshotPath = path.join(reviewDir, filename);
            const copied = copyFileIfPresent(sourceScreenshot, reviewScreenshotPath);
            const entry = {
                id: `visual-${String(index).padStart(3, '0')}`,
                route: page.route,
                viewport: page.viewport,
                severity: finding.severity,
                category: finding.category,
                message: finding.message,
                evidence: finding.evidence || '',
                sourceScreenshotPath: sourceScreenshot,
                reviewScreenshotPath: copied ? reviewScreenshotPath : '',
                screenshotMissing: !copied
            };

            entries.push(entry);

            return {
                ...finding,
                humanReviewScreenshotPath: entry.reviewScreenshotPath,
                humanReviewId: entry.id
            };
        });
        const assessmentFindings = (page.assessment?.findings || []).map((finding, findingIndex) => ({
            ...finding,
            humanReviewScreenshotPath: findings[findingIndex]?.humanReviewScreenshotPath || finding.humanReviewScreenshotPath || '',
            humanReviewId: findings[findingIndex]?.humanReviewId || finding.humanReviewId || ''
        }));

        return {
            ...page,
            findings,
            assessment: {
                ...page.assessment,
                findings: assessmentFindings
            }
        };
    });

    const manifest = {
        generatedAt: new Date().toISOString(),
        kind: 'visual',
        totalFindings: entries.length,
        screenshots: entries.filter((entry) => entry.reviewScreenshotPath).length,
        missingScreenshots: entries.filter((entry) => entry.screenshotMissing).length,
        directory: reviewDir,
        entries
    };

    ensureDir(reviewDir);
    fs.writeFileSync(path.join(reviewDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    return {
        pages: enrichedPages,
        manifest
    };
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
        const failureText = request.failure()?.errorText || 'request_failed';

        if (resourceType === 'media' && /ERR_ABORTED/i.test(failureText)) {
            return;
        }

        if (['document', 'stylesheet', 'script', 'image', 'media', 'xhr', 'fetch'].includes(resourceType)) {
            requestFailures.push({
                url: request.url(),
                resourceType,
                failureText
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
    const hasPreviewPanel = await page.locator('[data-service-panel]').count();

    if (tabCount < 2 || hasPreviewPanel === 0) {
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

async function collectFleetMobileFilterState(page, pageDir, viewport) {
    if (!viewport?.width || viewport.width > 960) {
        return null;
    }

    const toggle = page.locator('.fleet-mobile-filter-toggle').first();

    if ((await toggle.count()) === 0 || !(await toggle.isVisible().catch(() => false))) {
        return {
            available: false,
            reason: 'mobileFilterToggleMissing'
        };
    }

    await page.evaluate(({ pickupDate, returnDate }) => {
        const setControlValue = (selector, value) => {
            const element = document.querySelector(selector);

            if (!element) {
                return;
            }

            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setControlValue('#fleet-pickup-date', pickupDate);
        setControlValue('#fleet-return-date', returnDate);
        setControlValue('#fleet-pickup-time', '10:00');
        setControlValue('#fleet-return-time', '18:00');
        setControlValue('.js-fleet-brand-select', 'lamborghini');
        setControlValue('.js-fleet-type-select', 'convertible');
    }, {
        pickupDate: formatLocalDateIso(),
        returnDate: addLocalDaysIso(2)
    });

    await toggle.click();
    await page.waitForFunction(() => (
        document.querySelector('.fleet-browser')?.classList.contains('fleet-filters-open')
    ), null, { timeout: 1800 }).catch(() => {});
    await settlePage(page, 160);

    const state = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const sidebar = document.querySelector('.fleet-sidebar');
        const browser = document.querySelector('.fleet-browser');
        const toolbar = document.querySelector('.fleet-mobile-toolbar');

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity) >= 0.05 &&
                rect.width >= 4 &&
                rect.height >= 4;
        }

        function rectData(element) {
            if (!(element instanceof HTMLElement)) {
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

        function textFor(element) {
            if (!element) {
                return '';
            }

            if (element instanceof HTMLSelectElement) {
                return String(element.selectedOptions[0]?.textContent || element.value || '').replace(/\s+/g, ' ').trim();
            }

            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                return String(element.value || element.placeholder || '').replace(/\s+/g, ' ').trim();
            }

            return String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function clipData(element) {
            if (!(element instanceof HTMLElement)) {
                return { clipX: 0, clipY: 0 };
            }

            return {
                clipX: Number(Math.max(0, element.scrollWidth - element.clientWidth).toFixed(2)),
                clipY: Number(Math.max(0, element.scrollHeight - element.clientHeight).toFixed(2))
            };
        }

        function paintedRectData(element) {
            const rect = rectData(element);

            if (!(element instanceof HTMLElement) || !rect) {
                return {
                    width: 0,
                    height: 0,
                    clipPx: 0,
                    ratio: 0
                };
            }

            let top = Math.max(rect.top, 0);
            let right = Math.min(rect.right, viewportWidth);
            let bottom = Math.min(rect.bottom, viewportHeight);
            let left = Math.max(rect.left, 0);

            let current = element.parentElement;
            while (current && current !== document.documentElement) {
                const style = window.getComputedStyle(current);
                const clipsX = /(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflow}`);
                const clipsY = /(auto|scroll|hidden|clip)/.test(`${style.overflowY} ${style.overflow}`);

                if (clipsX || clipsY) {
                    const currentRect = current.getBoundingClientRect();

                    if (clipsY) {
                        top = Math.max(top, currentRect.top);
                        bottom = Math.min(bottom, currentRect.bottom);
                    }

                    if (clipsX) {
                        left = Math.max(left, currentRect.left);
                        right = Math.min(right, currentRect.right);
                    }
                }

                current = current.parentElement;
            }

            const width = Math.max(0, right - left);
            const height = Math.max(0, bottom - top);
            const area = Math.max(1, rect.width * rect.height);
            const paintedArea = width * height;

            return {
                width: Number(width.toFixed(2)),
                height: Number(height.toFixed(2)),
                clipPx: Number(Math.max(0, rect.height - height, rect.width - width).toFixed(2)),
                ratio: Number((paintedArea / area).toFixed(3))
            };
        }

        function controlData(element, key, kind, textElement = element) {
            const rect = rectData(element);
            const sheetRect = rectData(sidebar);
            const text = textFor(textElement);
            const clip = clipData(textElement instanceof HTMLElement ? textElement : element);
            const paintedRect = paintedRectData(element);
            const visibleIntersectionHeight = rect
                ? Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
                : 0;
            const visibleIntersectionWidth = rect
                ? Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0))
                : 0;

            return {
                key,
                kind,
                text,
                rect,
                visible: isVisible(element),
                visibleIntersectionHeight: Number(visibleIntersectionHeight.toFixed(2)),
                visibleIntersectionWidth: Number(visibleIntersectionWidth.toFixed(2)),
                paintedVisibleHeight: paintedRect.height,
                paintedVisibleWidth: paintedRect.width,
                paintedVisibilityRatio: paintedRect.ratio,
                paintClipPx: paintedRect.clipPx,
                visibleInViewport: Boolean(visibleIntersectionHeight > 8 && visibleIntersectionWidth > 8),
                fullyVisibleInViewport: Boolean(rect && rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth),
                fullyPaintedInViewport: Boolean(rect && paintedRect.height >= rect.height - 2 && paintedRect.width >= rect.width - 2),
                viewportClipPx: rect ? Number(Math.max(
                    0,
                    -rect.top,
                    -rect.left,
                    rect.bottom - viewportHeight,
                    rect.right - viewportWidth
                ).toFixed(2)) : 0,
                widthRatio: Number((rect && sheetRect?.width ? rect.width / sheetRect.width : 0).toFixed(3)),
                clipX: clip.clipX,
                clipY: clip.clipY
            };
        }

        function verticalGap(fromElement, toElement) {
            const fromRect = rectData(fromElement);
            const toRect = rectData(toElement);

            if (!fromRect || !toRect) {
                return null;
            }

            return Number((toRect.top - fromRect.bottom).toFixed(2));
        }

        const dateTimeFields = Array.from(document.querySelectorAll('.fleet-sidebar__field'))
            .map((field, index) => {
                const label = field.querySelector(':scope > span:not(.fleet-sidebar__field-shell)');
                const shell = field.querySelector('.fleet-sidebar__field-shell');
                const display = field.querySelector('.fleet-sidebar__field-display');
                const input = field.querySelector('input');
                const base = controlData(shell, input?.id || `fleet-field-${index}`, 'date_time_field', display || shell);

                return {
                    ...base,
                    label: textFor(label),
                    value: textFor(input),
                    displayText: textFor(display),
                    labelToControlGapPx: verticalGap(label, shell)
                };
            });

        const selects = Array.from(document.querySelectorAll('.fleet-sidebar select'))
            .map((select) => controlData(select, select.className || select.getAttribute('aria-label') || 'select', 'select', select));
        const buttons = Array.from(document.querySelectorAll('.fleet-sidebar button, .fleet-filter-close'))
            .map((button) => controlData(button, button.className || textFor(button), 'button', button));
        const rangeInputs = Array.from(document.querySelectorAll('.fleet-price-range__input'))
            .map((input) => controlData(input, input.className || input.getAttribute('aria-label') || 'range', 'range', input));
        const selectedFilterLabels = selects.map((select) => select.text).filter(Boolean);
        const visibleSelectedFilterLabels = selects
            .filter((select) => select.visibleInViewport && select.fullyVisibleInViewport && select.fullyPaintedInViewport)
            .map((select) => select.text)
            .filter(Boolean);
        const displayTexts = dateTimeFields.map((field) => field.displayText).filter(Boolean);
        const visibleFilledFieldCount = dateTimeFields.filter((field) => field.displayText && field.visibleInViewport).length;
        const visibleFilterSelectCount = selects.filter((select) => select.visibleInViewport && select.fullyVisibleInViewport && select.fullyPaintedInViewport).length;
        const visibleInlineApplyButtonCount = buttons
            .filter((button) => String(button.key || '').includes('fleet-filter-close--inline') && button.visibleInViewport)
            .length;
        const sheetRect = rectData(sidebar);
        const toolbarStyle = toolbar instanceof HTMLElement ? window.getComputedStyle(toolbar) : null;
        const toolbarRect = rectData(toolbar);
        const sheetHeader = document.querySelector('.fleet-filter-sheet-head');
        const topbar = document.querySelector('.fleet-sidebar__topbar');
        const visibleModules = Array.from(document.querySelectorAll('.fleet-sidebar__module'))
            .map((module) => {
                const rect = rectData(module);
                const summary = module.querySelector('.fleet-sidebar__summary');
                const firstBodyControl = module.querySelector('.fleet-sidebar__body .fleet-sidebar__control, .fleet-sidebar__body .fleet-sidebar__field-grid, .fleet-sidebar__body .fleet-price-range');

                return {
                    id: module.getAttribute('aria-labelledby') || '',
                    rect,
                    summaryToControlGapPx: verticalGap(summary, firstBodyControl)
                };
            })
            .filter((module) => module.rect && module.rect.height > 4)
            .sort((left, right) => left.rect.top - right.rect.top);
        const firstModule = visibleModules[0] || null;
        const spacingMetrics = {
            headerToTopbarGapPx: verticalGap(sheetHeader, topbar),
            topbarToFirstModuleGapPx: firstModule ? verticalGap(topbar, document.getElementById(firstModule.id)) : null,
            fieldLabelControlGapsPx: dateTimeFields
                .map((field) => field.labelToControlGapPx)
                .filter((gap) => Number.isFinite(gap)),
            moduleHeadingControlGapsPx: visibleModules
                .map((module) => module.summaryToControlGapPx)
                .filter((gap) => Number.isFinite(gap))
        };

        return {
            available: Boolean(sidebar),
            isOpen: Boolean(browser?.classList.contains('fleet-filters-open')),
            viewportWidth,
            viewportHeight,
            toolbarPosition: toolbarStyle?.position || '',
            toolbarRect,
            sheetRect,
            sheetHeightRatio: Number((sheetRect?.height ? sheetRect.height / Math.max(1, viewportHeight) : 0).toFixed(3)),
            sheetHorizontalOverflowPx: sidebar ? Number(Math.max(0, sidebar.scrollWidth - sidebar.clientWidth).toFixed(2)) : 0,
            sheetScrollOverflowPx: sidebar ? Number(Math.max(0, sidebar.scrollHeight - sidebar.clientHeight).toFixed(2)) : 0,
            displayTexts,
            selectedFilterLabels,
            visibleSelectedFilterLabels,
            visibleFilledFieldCount,
            visibleFilterSelectCount,
            visibleInlineApplyButtonCount,
            spacingMetrics,
            dateTimeFields,
            controls: [...dateTimeFields, ...selects, ...buttons, ...rangeInputs]
        };
    });

    const screenshotPath = path.join(pageDir, 'fleet-mobile-filters-filled.png');
    await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide'
    });

    await page.locator('.fleet-filter-close').first().click().catch(() => {});
    await page.waitForTimeout(80);

    return {
        ...state,
        screenshotPath
    };
}

async function collectMobileNavDrawerState(page, pageDir, viewport) {
    if (Number(viewport?.width || 0) > 860) {
        return null;
    }

    const toggle = page.locator('.lab-mobile-toggle').first();
    const toggleCount = await toggle.count().catch(() => 0);

    if (toggleCount === 0 || !(await toggle.isVisible().catch(() => false))) {
        return {
            available: false,
            reason: 'toggle_missing'
        };
    }

    await toggle.click();
    await page.waitForTimeout(260);

    const state = await page.evaluate(() => {
        const viewportWidth = window.innerWidth || 1;
        const viewportHeight = window.innerHeight || 1;

        function rectData(element) {
            if (!(element instanceof HTMLElement)) {
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

        function textFor(element) {
            return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity || 1) > 0.01 &&
                rect.width > 1 &&
                rect.height > 1;
        }

        function rowKey(rect) {
            return String(Math.round(Number(rect?.top || 0) / 2) * 2);
        }

        function childMetrics(group) {
            const children = Array.from(group.children)
                .filter((child) => child instanceof HTMLElement && isVisible(child))
                .map((child) => {
                    const rect = rectData(child);
                    const visualIcon = Array.from(child.querySelectorAll('svg, img, [class*="icon"]'))
                        .find((icon) => icon instanceof HTMLElement || icon instanceof SVGElement);
                    const iconRect = visualIcon?.getBoundingClientRect?.();
                    const hasVisualIcon = Boolean(
                        iconRect &&
                        iconRect.width >= 12 &&
                        iconRect.height >= 12 &&
                        iconRect.bottom > 0 &&
                        iconRect.top < viewportHeight &&
                        iconRect.right > 0 &&
                        iconRect.left < viewportWidth
                    );
                    return {
                        text: textFor(child),
                        rect,
                        width: rect?.width || 0,
                        height: rect?.height || 0,
                        hasVisualIcon,
                        iconWidth: iconRect ? Number(iconRect.width.toFixed(2)) : 0,
                        iconHeight: iconRect ? Number(iconRect.height.toFixed(2)) : 0,
                        viewportClipPx: rect ? Number(Math.max(
                            0,
                            -rect.top,
                            -rect.left,
                            rect.right - viewportWidth,
                            rect.bottom - viewportHeight
                        ).toFixed(2)) : 0,
                        partiallyVisible: Boolean(rect && rect.bottom > 0 && rect.top < viewportHeight && (
                            rect.top < 0 ||
                            rect.left < 0 ||
                            rect.right > viewportWidth ||
                            rect.bottom > viewportHeight
                        ))
                    };
                });
            const widths = children.map((child) => Number(child.width || 0)).filter((value) => value > 0);
            const heights = children.map((child) => Number(child.height || 0)).filter((value) => value > 0);
            const rowCounts = children.reduce((counts, child) => {
                const key = rowKey(child.rect);
                counts[key] = (counts[key] || 0) + 1;
                return counts;
            }, {});

            return {
                children,
                visibleChildCount: children.length,
                rowCounts: Object.values(rowCounts),
                widthSpreadPx: widths.length ? Number((Math.max(...widths) - Math.min(...widths)).toFixed(2)) : 0,
                heightSpreadPx: heights.length ? Number((Math.max(...heights) - Math.min(...heights)).toFixed(2)) : 0,
                minChildHeight: heights.length ? Number(Math.min(...heights).toFixed(2)) : 0,
                visualIconCount: children.filter((child) => child.hasVisualIcon).length,
                partiallyVisibleChildren: children.filter((child) => child.partiallyVisible)
            };
        }

        function groupData(target, key) {
            const group = typeof target === 'string' ? document.querySelector(target) : target;

            if (!(group instanceof HTMLElement)) {
                return {
                    key,
                    available: false,
                    children: [],
                    partiallyVisibleChildren: []
                };
            }

            const style = window.getComputedStyle(group);
            return {
                key,
                available: true,
                selector: typeof target === 'string' ? target : `.${Array.from(group.classList || []).join('.')}`,
                display: style.display,
                gridTemplateColumns: style.gridTemplateColumns,
                rect: rectData(group),
                ...childMetrics(group)
            };
        }

        function disclosureData(key) {
            const disclosure = document.querySelector(`[data-mobile-drawer-disclosure="${key}"]`);

            if (!(disclosure instanceof HTMLElement)) {
                return {
                    key,
                    available: false,
                    linkCount: 0,
                    visibleLinkCount: 0
                };
            }

            const summary = disclosure.querySelector('summary');
            const links = disclosure.querySelector('.lab-mobile-drawer__links');
            const anchors = Array.from(links?.querySelectorAll('a[href]') || [])
                .filter((link) => link instanceof HTMLElement);
            const visibleAnchors = anchors.filter((link) => isVisible(link));
            const leakedClosedAnchors = !disclosure.open
                ? visibleAnchors.filter((link) => !link.closest('details:not([open])'))
                : [];
            const summaryRect = summary instanceof HTMLElement ? rectData(summary) : null;

            return {
                key,
                available: true,
                isOpen: Boolean(disclosure.open),
                summaryText: textFor(summary),
                summaryRect,
                summaryHeight: summaryRect?.height || 0,
                linkCount: anchors.length,
                visibleLinkCount: disclosure.open ? visibleAnchors.length : 0,
                visibleWhileClosed: Boolean(leakedClosedAnchors.length > 0),
                contentDisplay: links instanceof HTMLElement ? window.getComputedStyle(links).display : '',
                contentGridTemplateColumns: links instanceof HTMLElement ? window.getComputedStyle(links).gridTemplateColumns : ''
            };
        }

        const drawer = document.querySelector('.lab-mobile-drawer');
        const panel = document.querySelector('.lab-mobile-drawer__panel');
        const groups = [
            groupData('.lab-mobile-drawer__quick', 'quick'),
            groupData('.lab-mobile-drawer__links--nav', 'nav'),
            groupData('.lab-mobile-drawer__actions', 'actions')
        ];
        const disclosures = [
            disclosureData('brands'),
            disclosureData('browse')
        ];
        const actions = Array.from(document.querySelectorAll('.lab-mobile-drawer__action'))
            .filter((action) => action instanceof HTMLElement && isVisible(action))
            .map((action) => ({
                text: textFor(action),
                isPrimary: action.classList.contains('lab-mobile-drawer__action--primary'),
                isSecondary: action.classList.contains('lab-mobile-drawer__action--secondary'),
                rect: rectData(action)
            }));
        const panelRect = rectData(panel);

        return {
            available: Boolean(drawer && panel),
            isOpen: Boolean(drawer?.classList.contains('is-open')),
            viewportWidth,
            viewportHeight,
            panelRect,
            panelHorizontalOverflowPx: panel ? Number(Math.max(0, panel.scrollWidth - panel.clientWidth).toFixed(2)) : 0,
            panelInitialScrollOverflowPx: panel ? Number(Math.max(0, panel.scrollHeight - panel.clientHeight).toFixed(2)) : 0,
            visibleSecondaryActionCount: actions.filter((action) => action.isSecondary).length,
            visiblePrimaryActionCount: actions.filter((action) => action.isPrimary).length,
            groups,
            disclosures,
            actions
        };
    });

    const screenshotPath = path.join(pageDir, 'mobile-nav-drawer-open.png');
    await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide'
    });

    await page.keyboard.press('Escape').catch(() => {});
    await page.evaluate(() => {
        const drawer = document.querySelector('.lab-mobile-drawer');
        const toggle = document.querySelector('.lab-mobile-toggle');

        document.body.classList.remove('lab-mobile-nav-open');
        drawer?.classList.remove('is-open');
        drawer?.setAttribute('aria-hidden', 'true');
        drawer?.setAttribute('inert', '');
        toggle?.classList.remove('is-open');
        toggle?.setAttribute('aria-expanded', 'false');
    }).catch(() => {});
    await page.waitForTimeout(80);

    return {
        ...state,
        screenshotPath
    };
}

function buildMobileNavDrawerFindings({ route, viewportName, viewportWidth, state, screenshotPath }) {
    const findings = [];
    const contract = getMobileInteractionContract({
        interaction: 'mobile_nav_drawer',
        viewportName,
        viewportWidth
    });
    const stateScreenshotPath = state?.screenshotPath || screenshotPath;

    if (!contract || Number(viewportWidth || 0) > 860) {
        return findings;
    }

    if (!state?.available) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'The mobile navigation drawer is not available from the header.',
            evidence: `state=${state?.reason || 'missing'}`,
            likelyCause: 'The mobile menu toggle or drawer shell is missing in this viewport.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
        return findings;
    }

    if (!state.isOpen) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'The mobile navigation toggle did not open the drawer.',
            evidence: 'lab-mobile-drawer.is-open=false',
            likelyCause: 'The mobile menu button is no longer wired to the drawer state.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (Number(state.panelHorizontalOverflowPx || 0) > Number(contract.maxHorizontalOverflowPx || 0)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'overflow',
            message: 'The mobile navigation drawer creates horizontal overflow.',
            evidence: `panelHorizontalOverflowPx=${state.panelHorizontalOverflowPx}; max=${contract.maxHorizontalOverflowPx}`,
            likelyCause: 'A drawer button or panel width is escaping the mobile viewport.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const shouldFitInitialDrawerViewport = Number(state.viewportHeight || 0) >= 760;

    if (
        shouldFitInitialDrawerViewport &&
        Number(state.panelInitialScrollOverflowPx || 0) > Number(contract.maxInitialScrollOverflowPx || 0)
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'spacing',
            message: 'The opened mobile navigation drawer pushes key actions below the initial viewport.',
            evidence: `panelInitialScrollOverflowPx=${state.panelInitialScrollOverflowPx}; max=${contract.maxInitialScrollOverflowPx}`,
            likelyCause: 'The drawer is carrying duplicate CTAs or loose spacing, so the menu no longer fits cleanly when opened.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const missingGroups = (contract.requiredGroups || [])
        .filter((key) => !(state.groups || []).some((group) => group.key === key && group.available && group.visibleChildCount > 0));

    if (missingGroups.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'The mobile navigation drawer is missing expected link groups.',
            evidence: `missingGroups=${missingGroups.join(', ')}`,
            likelyCause: 'The shared drawer builder did not collect one of the navigation, brand, browse, or action groups.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const missingDisclosures = (contract.requiredDisclosures || [])
        .filter((key) => !(state.disclosures || []).some((disclosure) => (
            disclosure.key === key &&
            disclosure.available &&
            Number(disclosure.linkCount || 0) >= Number(contract.minDisclosureLinkCount || 1)
        )));

    if (missingDisclosures.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'The mobile navigation drawer is missing scalable dropdowns for brands or car types.',
            evidence: `missingDisclosures=${missingDisclosures.join(', ')}`,
            likelyCause: 'Brands and car-type links are rendered as fixed button grids or are missing instead of living inside drawer disclosures.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const openDisclosures = (state.disclosures || [])
        .filter((disclosure) => disclosure.available && disclosure.isOpen);

    if (openDisclosures.length > Number(contract.maxDefaultOpenDisclosureCount || 0)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'layout_homogeneity',
            message: 'The mobile navigation drawer expands brand or car-type lists by default.',
            evidence: `openDisclosures=${openDisclosures.map((disclosure) => disclosure.key).join(', ')}; max=${contract.maxDefaultOpenDisclosureCount}`,
            likelyCause: 'The drawer is exposing scalable link lists before the customer asks for them, making future brands or types bloat the mobile menu.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const weakDisclosures = (state.disclosures || [])
        .filter((disclosure) => disclosure.available)
        .filter((disclosure) => (
            Number(disclosure.summaryHeight || 0) < Number(contract.minDisclosureSummaryHeightPx || 0) ||
            disclosure.visibleWhileClosed
        ));

    if (weakDisclosures.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'The mobile navigation dropdown controls are not behaving like useful collapsed tap targets.',
            evidence: weakDisclosures.map((disclosure) => `${disclosure.key}:summaryHeight=${disclosure.summaryHeight},visibleWhileClosed=${Boolean(disclosure.visibleWhileClosed)}`).join('; '),
            likelyCause: 'A disclosure summary is too small to tap or its links remain visible while the accordion is closed.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const quickGroup = (state.groups || []).find((group) => group.key === 'quick');
    if (
        quickGroup?.available &&
        Number.isFinite(Number(contract.minQuickActionVisualIconCount)) &&
        Number(quickGroup.visualIconCount || 0) < Number(contract.minQuickActionVisualIconCount)
    ) {
        const missingIconLabels = (quickGroup.children || [])
            .filter((child) => !child.hasVisualIcon)
            .map((child) => child.text || 'unlabelled')
            .slice(0, 4)
            .join(', ');

        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'visual_affordance',
            message: 'The mobile navigation quick actions need visible icons, not plain text buttons.',
            evidence: `quickVisualIconCount=${quickGroup.visualIconCount || 0}; min=${contract.minQuickActionVisualIconCount}; missing=${missingIconLabels || 'none'}`,
            likelyCause: 'The drawer quick actions regressed to text-only controls, making Call, Email and WhatsApp harder to scan on mobile.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const unstableGroups = (state.groups || [])
        .filter((group) => group.available && group.visibleChildCount > 1)
        .filter((group) => (
            group.display !== 'grid' ||
            Number(group.widthSpreadPx || 0) > Number(contract.maxButtonWidthSpreadPx || 0) ||
            Number(group.heightSpreadPx || 0) > Number(contract.maxButtonHeightSpreadPx || 0)
        ));

    if (unstableGroups.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'layout_homogeneity',
            message: 'The mobile navigation drawer uses uneven button rows.',
            evidence: unstableGroups.map((group) => `${group.key}:display=${group.display},widthSpreadPx=${group.widthSpreadPx},heightSpreadPx=${group.heightSpreadPx},columns=${group.gridTemplateColumns || 'none'}`).join('; '),
            likelyCause: 'The drawer link groups are wrapping by intrinsic text width instead of using stable mobile grid tracks.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const undersizedGroups = (state.groups || [])
        .filter((group) => group.available && Number(group.minChildHeight || 0) > 0 && Number(group.minChildHeight || 0) < Number(contract.minTapTargetPx || 0));

    if (undersizedGroups.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'The mobile navigation drawer has tap targets below the locked minimum size.',
            evidence: undersizedGroups.map((group) => `${group.key}:minChildHeight=${group.minChildHeight}; min=${contract.minTapTargetPx}`).join('; '),
            likelyCause: 'A compact drawer style reduced button height below a reliable touch target.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (Number(state.visibleSecondaryActionCount || 0) > Number(contract.maxVisibleSecondaryActionCount || 0)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'cta_hierarchy',
            message: 'The mobile navigation drawer shows duplicate secondary CTAs below the link groups.',
            evidence: `visibleSecondaryActionCount=${state.visibleSecondaryActionCount}; max=${contract.maxVisibleSecondaryActionCount}`,
            likelyCause: 'Call and WhatsApp are already available as quick actions, so repeating them at the bottom pushes the primary Reserve action area out of balance.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const partiallyVisibleChildren = (state.groups || [])
        .flatMap((group) => (group.partiallyVisibleChildren || []).map((child) => ({ ...child, group: group.key })))
        .filter((child) => (
            shouldFitInitialDrawerViewport &&
            Number(child.viewportClipPx || 0) > Number(contract.maxPartiallyVisibleButtonClipPx || 0)
        ));

    if (partiallyVisibleChildren.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'clipping',
            message: 'The mobile navigation drawer leaves buttons partially visible at the viewport edge.',
            evidence: partiallyVisibleChildren.slice(0, 5).map((child) => `${child.group}:"${child.text}" clip=${child.viewportClipPx}`).join('; '),
            likelyCause: 'Drawer spacing or duplicate bottom actions are making buttons peek out instead of appearing as complete controls.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    return findings;
}

function buildFleetMobileFilterFindings({ route, viewportName, viewportWidth, state, screenshotPath }) {
    const findings = [];
    const normalizedRoute = normalizeRoute(route);
    const contract = getMobileInteractionContract({
        interaction: 'fleet_filter_sheet',
        viewportName,
        viewportWidth
    });
    const stateScreenshotPath = state?.screenshotPath || screenshotPath;
    const isShortHeightViewport = String(viewportName || '').includes('short');
    const isCompactFullscreenViewport = isShortHeightViewport || (
        Number(state?.viewportHeight || 0) > 0 &&
        Number(state.viewportHeight) <= 860 &&
        Number(state.sheetHeightRatio || 0) >= 0.98
    );

    if (normalizedRoute !== '/fleet.html' || !contract) {
        return findings;
    }

    if (!state?.available) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'The mobile fleet filter sheet cannot be reached from the visible toolbar.',
            evidence: `state=${state?.reason || 'missing'}`,
            likelyCause: 'The mobile filters toggle, sheet, or Fleet controls are not rendering in the mobile layout.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
        return findings;
    }

    if (!state.isOpen) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'The mobile fleet filter toggle did not open the filter sheet.',
            evidence: 'fleet-filters-open=false',
            likelyCause: 'The mobile filter interaction is not wiring the toolbar button to the sheet state.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (
        Boolean(contract.forbidPinnedClosedToolbar) &&
        /^(fixed|sticky)$/i.test(String(state.toolbarPosition || ''))
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'visual_affordance',
            message: 'The closed mobile fleet filter bar is pinned over scrolling car content.',
            evidence: `toolbarPosition=${state.toolbarPosition}; toolbarTop=${state.toolbarRect?.top ?? 'unknown'}`,
            likelyCause: 'The Fleet mobile toolbar is using sticky/fixed positioning, so it floats over vehicle imagery and competes with the back affordance while scrolling.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const spacingMetrics = state.spacingMetrics || {};
    const fieldLabelGaps = (spacingMetrics.fieldLabelControlGapsPx || [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
    const moduleHeadingGaps = (spacingMetrics.moduleHeadingControlGapsPx || [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
    const minFieldLabelGap = fieldLabelGaps.length ? Math.min(...fieldLabelGaps) : Infinity;
    const minModuleHeadingGap = moduleHeadingGaps.length ? Math.min(...moduleHeadingGaps) : Infinity;
    const topbarGap = Number(spacingMetrics.topbarToFirstModuleGapPx);
    const crampedSpacingEvidence = [
        Number.isFinite(minFieldLabelGap) && minFieldLabelGap < Number(contract.minFieldLabelControlGapPx || 0)
            ? `minFieldLabelControlGapPx=${minFieldLabelGap.toFixed(2)}`
            : '',
        Number.isFinite(minModuleHeadingGap) && minModuleHeadingGap < Number(contract.minModuleHeadingControlGapPx || 0)
            ? `minModuleHeadingControlGapPx=${minModuleHeadingGap.toFixed(2)}`
            : '',
        Number.isFinite(topbarGap) && topbarGap < Number(contract.minTopbarToFirstModuleGapPx || 0)
            ? `topbarToFirstModuleGapPx=${topbarGap.toFixed(2)}`
            : ''
    ].filter(Boolean);

    if (crampedSpacingEvidence.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'spacing',
            message: 'The mobile fleet filter sheet feels cramped because labels and controls do not have enough breathing room.',
            evidence: `${crampedSpacingEvidence.join('; ')}; minField=${contract.minFieldLabelControlGapPx}; minHeading=${contract.minModuleHeadingControlGapPx}; minTopbar=${contract.minTopbarToFirstModuleGapPx}`,
            likelyCause: 'Compact mobile sheet spacing was reduced too aggressively, making headings, labels and input boxes visually stick together.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (Number(state.sheetHorizontalOverflowPx || 0) > contract.maxHorizontalOverflowPx) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'overflow',
            message: 'The mobile fleet filter sheet creates horizontal overflow.',
            evidence: `sheetHorizontalOverflowPx=${state.sheetHorizontalOverflowPx}; max=${contract.maxHorizontalOverflowPx}`,
            likelyCause: 'A date field, filter select, or price control is wider than the mobile sheet.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (
        !isCompactFullscreenViewport &&
        Number.isFinite(contract.maxSheetHeightRatio) &&
        Number(state.sheetHeightRatio || 0) > contract.maxSheetHeightRatio
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'form_visibility',
            message: 'The mobile fleet filter sheet is too tall for a comfortable bottom-sheet interaction.',
            evidence: `sheetHeightRatio=${state.sheetHeightRatio}; max=${contract.maxSheetHeightRatio}`,
            likelyCause: 'The filter sheet is occupying nearly the entire mobile viewport and leaving little orientation context.',
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (
        Number.isFinite(Number(contract.maxInlineApplyButtonCount)) &&
        Number(state.visibleInlineApplyButtonCount || 0) > Number(contract.maxInlineApplyButtonCount)
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'cta_hierarchy',
            message: 'The mobile fleet filter sheet shows a duplicate apply CTA inside the filter body.',
            evidence: `visibleInlineApplyButtonCount=${state.visibleInlineApplyButtonCount}; max=${contract.maxInlineApplyButtonCount}`,
            likelyCause: 'An intermediate Show cars button is visible between sorting and rental-period controls, pushing the date and select fields down.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const displayTexts = state.displayTexts || [];
    const selectedFilterLabels = state.selectedFilterLabels || [];
    const visibleSelectedFilterLabels = state.visibleSelectedFilterLabels || [];
    const expectedSyncedFieldValues = contract.requireDateTimeDisplaySync
        ? (state.dateTimeFields || [])
            .map((field) => {
                const value = String(field?.value || '').trim();

                if (!value) {
                    return '';
                }

                return formatDisplayDateFromIso(value) || value;
            })
            .filter(Boolean)
        : [];
    const requiredFilledValues = Array.from(new Set([
        ...(contract.requiredFilledValues || []),
        ...expectedSyncedFieldValues
    ]));
    const missingFilledValues = requiredFilledValues
        .filter((value) => !displayTexts.includes(value));
    const missingFilterLabels = (contract.requiredFilterLabels || [])
        .filter((label) => !selectedFilterLabels.includes(label));
    const missingVisibleFilterLabels = (contract.requiredFilterLabels || [])
        .filter((label) => !visibleSelectedFilterLabels.includes(label));

    if (missingFilledValues.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'Filled mobile date and time values are not visibly reflected in the fleet filter sheet.',
            evidence: `missingValues=${missingFilledValues.join(', ')}; visibleValues=${displayTexts.join(' | ') || 'none'}`,
            likelyCause: 'The real inputs may be hidden without a reliable visible display layer, or the display layer is not syncing after input.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (missingFilterLabels.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'Selected mobile fleet filters are not visibly reflected after interaction.',
            evidence: `missingFilters=${missingFilterLabels.join(', ')}; selectedFilters=${selectedFilterLabels.join(' | ') || 'none'}`,
            likelyCause: 'The brand/type select state is not updating, or the selected option is not readable in the mobile sheet.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (
        Number(state.visibleFilterSelectCount || 0) < Number(contract.minVisibleFilterSelectCount || 0) ||
        missingVisibleFilterLabels.length > 0
    ) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'Selected mobile fleet filters are not fully visible in the opened sheet.',
            evidence: `visibleFilterSelectCount=${state.visibleFilterSelectCount}; min=${contract.minVisibleFilterSelectCount}; missingVisibleFilters=${missingVisibleFilterLabels.join(', ') || 'none'}; visibleFilters=${visibleSelectedFilterLabels.join(' | ') || 'none'}`,
            likelyCause: 'The filter sheet opens with brand/type controls pushed too low or clipped, so the customer cannot clearly confirm the active filters.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (Number(state.visibleFilledFieldCount || 0) < contract.minVisibleFilledFieldCount) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'Too few filled schedule controls are visible when the mobile filter sheet opens.',
            evidence: `visibleFilledFieldCount=${state.visibleFilledFieldCount}; min=${contract.minVisibleFilledFieldCount}`,
            likelyCause: 'The date/time controls are pushed too far down or compressed out of the first mobile sheet view.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const compactScheduleMinWidth = Number(contract.minCompactScheduleControlWidthPx || 0);
    const narrowFields = (state.dateTimeFields || [])
        .filter((field) => (
            Number(field.widthRatio || 0) < contract.minFilledFieldWidthRatio &&
            Number(field.rect?.width || 0) < compactScheduleMinWidth
        ));

    if (narrowFields.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'Mobile date/time fields are too narrow to read or tap comfortably after values are entered.',
            evidence: narrowFields.map((field) => `${field.key}:${field.widthRatio}`).join('; '),
            likelyCause: 'The schedule controls are still using a desktop-style multi-column grid on a narrow mobile sheet.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const smallTargets = (state.controls || [])
        .filter((control) => control.visible !== false)
        .filter((control) => {
            const rect = control.rect || {};

            if (Number(rect.width || 0) < 6 || Number(rect.height || 0) < 6) {
                return false;
            }

            if (control.kind === 'range') {
                return Number(rect.width || 0) < contract.minUsefulControlWidthPx;
            }

            const isCompactIconControl = /(?:close--top|icon|toggle)$/i.test(String(control.key || '')) ||
                /fleet-filter-close--top/i.test(String(control.key || ''));
            if (
                isCompactIconControl &&
                Number(rect.width || 0) >= Number(contract.minTapTargetPx || 0) &&
                Number(rect.height || 0) >= Number(contract.minTapTargetPx || 0)
            ) {
                return false;
            }

            return Number(rect.width || 0) < contract.minTapTargetPx ||
                Number(rect.height || 0) < contract.minTapTargetPx ||
                (
                    control.kind !== 'range' &&
                    Number(rect.width || 0) < contract.minUsefulControlWidthPx
                );
        });

    if (smallTargets.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'Some mobile fleet filter controls are below the usable tap/readability size.',
            evidence: smallTargets.slice(0, 5).map((control) => `${control.key}:${control.rect?.width}x${control.rect?.height}`).join('; '),
            likelyCause: 'Mobile controls are being squeezed into columns or inheriting desktop sizing.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const clippedControls = (state.controls || [])
        .filter((control) => control.visible !== false)
        .filter((control) => (
            Number(control.clipX || 0) > contract.maxTextClipPx ||
            Number(control.clipY || 0) > contract.maxTextClipPx
        ));

    if (clippedControls.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'clipping',
            message: 'Mobile fleet filter control text is clipped after entering values.',
            evidence: clippedControls.slice(0, 5).map((control) => `${control.key}:clipX=${control.clipX},clipY=${control.clipY},text="${control.text || control.displayText || ''}"`).join('; '),
            likelyCause: 'A value display, select, or button has fixed sizing that cannot hold its real mobile content.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const viewportClippedControls = (state.controls || [])
        .filter((control) => control.visible !== false)
        .filter((control) => (
            (
                control.visibleInViewport ||
                Number(control.visibleIntersectionHeight || 0) > 0 ||
                Number(control.visibleIntersectionWidth || 0) > 0
            ) &&
            !control.fullyVisibleInViewport &&
            Number(control.viewportClipPx || 0) > Number(contract.maxViewportClipPx || 2)
        ));

    if (viewportClippedControls.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'clipping',
            message: 'Mobile fleet filter controls are partially cut by the short viewport after the sheet opens.',
            evidence: viewportClippedControls.slice(0, 5).map((control) => `${control.key}:viewportClipPx=${control.viewportClipPx},text="${control.text || control.displayText || ''}"`).join('; '),
            likelyCause: 'The bottom sheet is too tall or the internal scroll position is not reset for short mobile screens.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const peekingControls = (state.controls || [])
        .filter((control) => control.visible !== false)
        .filter((control) => (
            (
                (
                    Number(control.visibleIntersectionHeight || 0) > 0 &&
                    Number(control.visibleIntersectionHeight || 0) < Number(control.rect?.height || 0) &&
                    Number(control.viewportClipPx || 0) > Number(contract.maxPartiallyVisibleControlClipPx || contract.maxViewportClipPx || 2)
                ) ||
                (
                    Number(control.paintedVisibleHeight || 0) > 0 &&
                    Number(control.paintedVisibleHeight || 0) < Number(control.rect?.height || 0) &&
                    Number(control.paintClipPx || 0) > Number(contract.maxPartiallyVisibleControlClipPx || contract.maxViewportClipPx || 2)
                )
            )
        ));

    if (peekingControls.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'clipping',
            message: 'Mobile fleet filter controls are only partially visible at the viewport edge.',
            evidence: peekingControls.slice(0, 5).map((control) => `${control.key}:visibleHeight=${control.visibleIntersectionHeight}/${control.rect?.height},paintedHeight=${control.paintedVisibleHeight}/${control.rect?.height},viewportClipPx=${control.viewportClipPx},paintClipPx=${control.paintClipPx},text="${control.text || control.displayText || ''}"`).join('; '),
            likelyCause: 'The filter sheet content or an overflow-hidden parent is leaving active controls half-cut instead of cleanly visible or cleanly below the fold.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    return findings;
}

async function collectContactFormState(page, pageDir) {
    const form = page.locator('#contactForm').first();

    if ((await form.count()) === 0 || !(await form.isVisible().catch(() => false))) {
        return {
            available: false,
            reason: 'contactFormMissing'
        };
    }

    await page.evaluate((values) => {
        const setControlValue = (id, value) => {
            const element = document.getElementById(id);

            if (!element) {
                return;
            }

            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        };

        for (const [id, value] of Object.entries(values)) {
            setControlValue(id, value);
        }
    }, HUMAN_SCENARIO_VALUES.contact);

    await settlePage(page, 120);

    const state = await page.evaluate((expectedValues) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const root = document.documentElement;
        const body = document.body;

        function rectData(element) {
            if (!(element instanceof HTMLElement)) {
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

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity) >= 0.05 &&
                rect.width >= 4 &&
                rect.height >= 4;
        }

        function textFor(element) {
            if (element instanceof HTMLSelectElement) {
                return String(element.selectedOptions[0]?.textContent || element.value || '').replace(/\s+/g, ' ').trim();
            }

            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                return String(element.value || '').replace(/\s+/g, ' ').trim();
            }

            return String(element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function controlData(id) {
            const element = document.getElementById(id);
            const rect = rectData(element);
            const visibleIntersectionHeight = rect
                ? Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
                : 0;
            const visibleIntersectionWidth = rect
                ? Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0))
                : 0;

            return {
                key: id,
                text: textFor(element),
                value: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
                    ? String(element.value || '').trim()
                    : textFor(element),
                expectedText: expectedValues[id] || '',
                rect,
                visible: isVisible(element),
                visibleInViewport: Boolean(visibleIntersectionHeight > 8 && visibleIntersectionWidth > 8),
                fullyVisibleInViewport: Boolean(rect && rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth),
                viewportClipPx: rect ? Number(Math.max(
                    0,
                    -rect.top,
                    -rect.left,
                    rect.bottom - viewportHeight,
                    rect.right - viewportWidth
                ).toFixed(2)) : 0,
                clipX: element instanceof HTMLElement ? Number(Math.max(0, element.scrollWidth - element.clientWidth).toFixed(2)) : 0
            };
        }

        const fieldKeys = ['contactName', 'contactEmail', 'contactPhone', 'contactSubject', 'contactMessage', 'contactSubmitButton'];
        const controls = fieldKeys.map(controlData);
        const form = document.getElementById('contactForm');

        return {
            available: Boolean(form),
            viewportWidth,
            viewportHeight,
            formRect: rectData(form),
            horizontalOverflowPx: Math.max(
                0,
                root.scrollWidth - viewportWidth,
                (body ? body.scrollWidth : 0) - viewportWidth
            ),
            controls
        };
    }, HUMAN_SCENARIO_VALUES.contact);

    const screenshotPath = path.join(pageDir, 'contact-form-filled.png');
    await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide'
    });

    return {
        ...state,
        screenshotPath
    };
}

async function collectReserveBookingIntentState(page, pageDir) {
    const startDate = page.locator('#startDate').first();

    if ((await startDate.count()) === 0 || !(await startDate.isVisible().catch(() => false))) {
        return {
            available: false,
            reason: 'reserveScheduleMissing'
        };
    }

    await page.evaluate((values) => {
        const setControlValue = (id, value) => {
            const element = document.getElementById(id);

            if (!element) {
                return false;
            }

            if (element instanceof HTMLSelectElement) {
                const hasOption = Array.from(element.options).some((option) => option.value === value);

                if (!hasOption) {
                    return false;
                }
            }

            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        };

        for (const key of ['startDate', 'endDate', 'pickupTime', 'dropoffTime', 'pickupLocation']) {
            setControlValue(key, values[key]);
        }

        if (typeof window.updateCalendarFromInputs === 'function') {
            window.updateCalendarFromInputs();
        }

        if (typeof window.updatePricing === 'function') {
            window.updatePricing();
        }
    }, HUMAN_SCENARIO_VALUES.reserve);

    await settlePage(page, 180);

    const scheduleState = await page.evaluate((expectedValues) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const root = document.documentElement;
        const body = document.body;

        function rectData(element) {
            if (!(element instanceof HTMLElement)) {
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

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity) >= 0.05 &&
                rect.width >= 4 &&
                rect.height >= 4;
        }

        function textFor(element) {
            if (element instanceof HTMLSelectElement) {
                return String(element.value || element.selectedOptions[0]?.textContent || '').replace(/\s+/g, ' ').trim();
            }

            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                return String(element.value || '').replace(/\s+/g, ' ').trim();
            }

            return String(element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function controlData(id) {
            const element = document.getElementById(id);
            const rect = rectData(element);
            const visibleIntersectionHeight = rect
                ? Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
                : 0;
            const visibleIntersectionWidth = rect
                ? Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0))
                : 0;

            return {
                key: id,
                text: textFor(element),
                value: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
                    ? String(element.value || '').trim()
                    : textFor(element),
                expectedText: expectedValues[id] || '',
                rect,
                visible: isVisible(element),
                visibleInViewport: Boolean(visibleIntersectionHeight > 8 && visibleIntersectionWidth > 8),
                fullyVisibleInViewport: Boolean(rect && rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth),
                viewportClipPx: rect ? Number(Math.max(
                    0,
                    -rect.top,
                    -rect.left,
                    rect.bottom - viewportHeight,
                    rect.right - viewportWidth
                ).toFixed(2)) : 0,
                clipX: element instanceof HTMLElement ? Number(Math.max(0, element.scrollWidth - element.clientWidth).toFixed(2)) : 0
            };
        }

        const continueButtons = Array.from(document.querySelectorAll('#continueToPaymentBtn, #reserveMobileAction'))
            .filter((button) => button instanceof HTMLButtonElement);
        const visibleContinueButton = continueButtons.find((button) => isVisible(button));

        return {
            horizontalOverflowPx: Math.max(
                0,
                root.scrollWidth - viewportWidth,
                (body ? body.scrollWidth : 0) - viewportWidth
            ),
            continueEnabledAfterSchedule: visibleContinueButton ? !visibleContinueButton.disabled : false,
            scheduleControls: ['startDate', 'endDate', 'pickupTime', 'dropoffTime', 'pickupLocation'].map(controlData)
        };
    }, HUMAN_SCENARIO_VALUES.reserve);

    const continueButtons = page.locator('#continueToPaymentBtn, #reserveMobileAction');
    let continueButton = null;

    for (let index = 0; index < await continueButtons.count(); index += 1) {
        const candidate = continueButtons.nth(index);

        if ((await candidate.isVisible().catch(() => false)) && !(await candidate.isDisabled().catch(() => true))) {
            continueButton = candidate;
            break;
        }
    }

    const canAdvance = Boolean(continueButton);

    if (canAdvance) {
        await continueButton.click().catch(() => {});
        await settlePage(page, 220);
    }

    await page.evaluate((values) => {
        const setControlValue = (id, value) => {
            const element = document.getElementById(id);

            if (!element) {
                return;
            }

            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        };

        for (const key of ['fullName', 'passport', 'phone', 'email']) {
            setControlValue(key, values[key]);
        }
    }, HUMAN_SCENARIO_VALUES.reserve);

    await settlePage(page, 120);

    const state = await page.evaluate((expectedValues) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const root = document.documentElement;
        const body = document.body;

        function rectData(element) {
            if (!(element instanceof HTMLElement)) {
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

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity) >= 0.05 &&
                rect.width >= 4 &&
                rect.height >= 4;
        }

        function textFor(element) {
            if (element instanceof HTMLSelectElement) {
                return String(element.value || element.selectedOptions[0]?.textContent || '').replace(/\s+/g, ' ').trim();
            }

            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                return String(element.value || '').replace(/\s+/g, ' ').trim();
            }

            return String(element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function controlData(id) {
            const element = document.getElementById(id);
            const rect = rectData(element);
            const visibleIntersectionHeight = rect
                ? Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
                : 0;
            const visibleIntersectionWidth = rect
                ? Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0))
                : 0;

            return {
                key: id,
                text: textFor(element),
                value: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
                    ? String(element.value || '').trim()
                    : textFor(element),
                expectedText: expectedValues[id] || '',
                rect,
                visible: isVisible(element),
                visibleInViewport: Boolean(visibleIntersectionHeight > 8 && visibleIntersectionWidth > 8),
                fullyVisibleInViewport: Boolean(rect && rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth),
                viewportClipPx: rect ? Number(Math.max(
                    0,
                    -rect.top,
                    -rect.left,
                    rect.bottom - viewportHeight,
                    rect.right - viewportWidth
                ).toFixed(2)) : 0,
                clipX: element instanceof HTMLElement ? Number(Math.max(0, element.scrollWidth - element.clientWidth).toFixed(2)) : 0
            };
        }

        const scheduleKeys = ['startDate', 'endDate', 'pickupTime', 'dropoffTime', 'pickupLocation'];
        const guestKeys = ['fullName', 'passport', 'phone', 'email'];
        const scheduleControls = scheduleKeys.map(controlData);
        const guestControls = guestKeys.map(controlData);
        const continueButton = document.getElementById('continueToPaymentBtn') || document.getElementById('reserveMobileAction');
        const activeStep = document.querySelector('.step-content.active');
        const step2 = document.getElementById('step2');
        const summaryTotal = document.getElementById('summaryTotal');

        return {
            available: Boolean(document.getElementById('startDate')),
            viewportWidth,
            viewportHeight,
            activeStepId: activeStep?.id || '',
            step2Visible: isVisible(step2),
            continueEnabledAfterSchedule: continueButton instanceof HTMLButtonElement ? !continueButton.disabled : false,
            summaryTotalText: textFor(summaryTotal),
            horizontalOverflowPx: Math.max(
                0,
                root.scrollWidth - viewportWidth,
                (body ? body.scrollWidth : 0) - viewportWidth
            ),
            scheduleControls,
            guestControls,
            controls: [...scheduleControls, ...guestControls]
        };
    }, HUMAN_SCENARIO_VALUES.reserve);

    const screenshotPath = path.join(pageDir, 'reserve-booking-intent-filled.png');
    await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide'
    });

    return {
        ...state,
        canAdvanceFromSchedule: canAdvance,
        continueEnabledAfterSchedule: scheduleState.continueEnabledAfterSchedule,
        horizontalOverflowPx: Math.max(
            Number(state.horizontalOverflowPx || 0),
            Number(scheduleState.horizontalOverflowPx || 0)
        ),
        scheduleControls: scheduleState.scheduleControls,
        controls: [...(scheduleState.scheduleControls || []), ...(state.guestControls || [])],
        screenshotPath
    };
}

function buildFilledControlFindings({ route, viewportName, viewportWidth, contract, state, requiredKeys, controls, screenshotPath, noun }) {
    const findings = [];
    const stateScreenshotPath = state?.screenshotPath || screenshotPath;
    const controlList = controls || [];
    const byKey = new Map(controlList.map((control) => [control.key, control]));
    const missingKeys = (requiredKeys || [])
        .filter((key) => {
            const control = byKey.get(key);
            return !control || !control.visible || !String(control.text || '').trim();
        });

    if (missingKeys.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: `Filled ${noun} fields are missing, hidden, or not preserving user-entered values.`,
            evidence: `missingKeys=${missingKeys.join(', ')}`,
            likelyCause: 'The filled form state is not visually stable after a realistic user interaction.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const mismatchedValues = controlList
        .filter((control) => (
            control.expectedText &&
            control.visible &&
            String(control.value || control.text || '').trim() !== String(control.expectedText).trim()
        ));

    if (mismatchedValues.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: `Filled ${noun} values are not preserved after realistic input.`,
            evidence: mismatchedValues.slice(0, 5).map((control) => `${control.key}:expected="${control.expectedText}",actual="${control.value || control.text || ''}"`).join('; '),
            likelyCause: 'The form may be ignoring typed values, failing to populate select options, or resetting state during render.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const smallControls = controlList
        .filter((control) => {
            const rect = control.rect || {};
            const key = String(control.key || '');
            const baseMinUsefulWidth = /button|submit|action/i.test(key)
                ? Math.min(Number(contract.minUsefulControlWidthPx || 0), 120)
                : Number(contract.minUsefulControlWidthPx || 0);
            const viewportRatioMin = Number.isFinite(Number(contract.minUsefulControlWidthRatio)) && Number(viewportWidth || 0) > 0
                ? Number(viewportWidth) * Number(contract.minUsefulControlWidthRatio)
                : baseMinUsefulWidth;
            const compactScheduleMin = /reserve schedule/i.test(noun || '') && /date|time/i.test(key)
                ? Number(contract.minCompactScheduleControlWidthPx || baseMinUsefulWidth)
                : baseMinUsefulWidth;
            const minUsefulWidth = Math.min(baseMinUsefulWidth, viewportRatioMin, compactScheduleMin);

            return Number(rect.width || 0) < minUsefulWidth ||
                Number(rect.height || 0) < contract.minTapTargetPx;
        });

    if (smallControls.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: `Filled ${noun} controls are below the usable tap/readability size.`,
            evidence: smallControls.slice(0, 5).map((control) => `${control.key}:${control.rect?.width}x${control.rect?.height}`).join('; '),
            likelyCause: 'Responsive form controls are being squeezed after realistic user data is entered.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const clippedControls = controlList
        .filter((control) => Number(control.clipX || 0) > contract.maxTextClipPx);

    if (clippedControls.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'clipping',
            message: `Filled ${noun} values are horizontally clipped.`,
            evidence: clippedControls.slice(0, 5).map((control) => `${control.key}:clipX=${control.clipX},text="${control.text}"`).join('; '),
            likelyCause: 'A fixed-width input, select, or textarea cannot hold realistic booking copy.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    const viewportClippedControls = controlList
        .filter((control) => (
            control.visibleInViewport &&
            !control.fullyVisibleInViewport &&
            Number(control.viewportClipPx || 0) > Number(contract.maxViewportClipPx || 2)
        ));

    if (viewportClippedControls.length > 0) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'clipping',
            message: `Filled ${noun} controls are partially cut by the viewport.`,
            evidence: viewportClippedControls.slice(0, 5).map((control) => `${control.key}:viewportClipPx=${control.viewportClipPx}`).join('; '),
            likelyCause: 'The form state is visible but the current viewport clips its useful controls.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    return findings;
}

function buildContactFormStateFindings({ route, viewportName, viewportWidth, state, screenshotPath }) {
    const findings = [];
    const normalizedRoute = normalizeRoute(route);
    const contract = getMobileInteractionContract({
        interaction: 'contact_form_filled',
        viewportName,
        viewportWidth
    });
    const stateScreenshotPath = state?.screenshotPath || screenshotPath;

    if (normalizedRoute !== '/contact.html' || !contract) {
        return findings;
    }

    if (!state?.available) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'The contact form cannot be reached for a filled human-state visual audit.',
            evidence: `state=${state?.reason || 'missing'}`,
            likelyCause: 'The contact form route no longer exposes the expected form shell.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
        return findings;
    }

    if (Number(state.horizontalOverflowPx || 0) > contract.maxHorizontalOverflowPx) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'overflow',
            message: 'The filled contact form creates horizontal overflow.',
            evidence: `horizontalOverflowPx=${state.horizontalOverflowPx}; max=${contract.maxHorizontalOverflowPx}`,
            likelyCause: 'A filled input, textarea, or button is wider than the viewport.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    return findings.concat(buildFilledControlFindings({
        route,
        viewportName,
        viewportWidth,
        contract,
        state,
        requiredKeys: contract.requiredFieldKeys,
        controls: state.controls,
        screenshotPath,
        noun: 'contact form'
    }));
}

function buildReserveBookingIntentFindings({ route, viewportName, viewportWidth, state, screenshotPath }) {
    const findings = [];
    const normalizedRoute = normalizeRoute(route);
    const contract = getMobileInteractionContract({
        interaction: 'reserve_booking_intent',
        viewportName,
        viewportWidth
    });
    const stateScreenshotPath = state?.screenshotPath || screenshotPath;

    if (normalizedRoute !== '/app/reserve/page.html' || !contract) {
        return findings;
    }

    if (!state?.available) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'form_visibility',
            message: 'The reserve flow cannot receive a realistic booking intent.',
            evidence: `state=${state?.reason || 'missing'}`,
            likelyCause: 'The reserve scheduling controls are missing, hidden, or not rendering.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
        return findings;
    }

    if (Number(state.horizontalOverflowPx || 0) > contract.maxHorizontalOverflowPx) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'overflow',
            message: 'The filled reserve flow creates horizontal overflow.',
            evidence: `horizontalOverflowPx=${state.horizontalOverflowPx}; max=${contract.maxHorizontalOverflowPx}`,
            likelyCause: 'A filled schedule, location, or guest field is wider than the viewport.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    if (!state.canAdvanceFromSchedule || !state.step2Visible) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'interaction_state',
            message: 'A realistic reserve schedule does not advance cleanly into guest details.',
            evidence: `canAdvanceFromSchedule=${Boolean(state.canAdvanceFromSchedule)}; step2Visible=${Boolean(state.step2Visible)}; activeStepId=${state.activeStepId || 'unknown'}`,
            likelyCause: 'Schedule validation, button state, or deferred step rendering is broken after realistic date/location input.',
            hardFail: true,
            screenshotPath: stateScreenshotPath,
            source: 'interaction'
        }));
    }

    return findings
        .concat(buildFilledControlFindings({
            route,
            viewportName,
            viewportWidth,
            contract,
            state,
            requiredKeys: contract.requiredScheduleFieldKeys,
            controls: state.scheduleControls,
            screenshotPath,
            noun: 'reserve schedule'
        }))
        .concat(buildFilledControlFindings({
            route,
            viewportName,
            viewportWidth,
            contract,
            state,
            requiredKeys: contract.requiredGuestFieldKeys,
            controls: state.guestControls,
            screenshotPath,
            noun: 'reserve guest'
        }));
}

async function collectPageDepthScanState(page, pageDir, viewport) {
    const viewportSize = page.viewportSize() || {
        width: viewport?.width || 0,
        height: viewport?.height || 0
    };
    const viewportHeight = viewportSize.height || viewport?.height || 768;
    const documentMetrics = await page.evaluate(() => ({
        width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
        height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    }));
    const maxY = Math.max(0, documentMetrics.height - viewportHeight);
    const positions = [0];
    const step = Math.max(1, Math.floor(viewportHeight * 0.82));

    for (let y = step; y < maxY; y += step) {
        positions.push(y);

        if (positions.length >= 5) {
            break;
        }
    }

    if (maxY > 0 && !positions.includes(maxY)) {
        positions.push(maxY);
    }

    const scanDir = path.join(pageDir, 'page-depth-scan');
    ensureDir(scanDir);

    const frames = [];
    for (let index = 0; index < positions.length; index += 1) {
        const y = positions[index];
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y).catch(() => {});
        await settlePage(page, 90);

        const screenshotPath = path.join(scanDir, `viewport-${String(index + 1).padStart(2, '0')}.png`);
        await page.screenshot({
            path: screenshotPath,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        });
        const frameMetric = await page.evaluate(() => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            function isVisible(element) {
                if (!(element instanceof HTMLElement)) {
                    return false;
                }

                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    Number(style.opacity) >= 0.05 &&
                    rect.width >= 6 &&
                    rect.height >= 6 &&
                    rect.bottom > 0 &&
                    rect.top < viewportHeight &&
                    rect.right > 0 &&
                    rect.left < viewportWidth;
            }

            function rectData(element) {
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

            function textFor(element) {
                return String(element?.innerText || element?.textContent || element?.getAttribute?.('aria-label') || '').replace(/\s+/g, ' ').trim();
            }

            function selectorLabel(element) {
                if (!(element instanceof HTMLElement)) {
                    return 'unknown';
                }

                const id = element.id ? `#${element.id}` : '';
                const className = String(element.className || '')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((value) => `.${value}`)
                    .join('');
                return `${element.tagName.toLowerCase()}${id}${className}`;
            }

            function parseCssColor(value) {
                const text = String(value || '').trim();
                const rgbaMatch = text.match(/rgba?\(([^)]+)\)/i);

                if (!rgbaMatch) {
                    return { channels: null, alpha: 1, luminance: 0 };
                }

                const parts = rgbaMatch[1]
                    .split(',')
                    .map((part) => Number.parseFloat(part.trim()))
                    .filter((part) => Number.isFinite(part));
                const red = parts[0] || 0;
                const green = parts[1] || 0;
                const blue = parts[2] || 0;
                const alpha = parts.length >= 4 ? Math.max(0, Math.min(1, parts[3])) : 1;
                const normalize = (channel) => {
                    const normalized = Math.max(0, Math.min(255, channel)) / 255;
                    return normalized <= 0.03928
                        ? normalized / 12.92
                        : ((normalized + 0.055) / 1.055) ** 2.4;
                };
                const luminance = (0.2126 * normalize(red)) + (0.7152 * normalize(green)) + (0.0722 * normalize(blue));

                return {
                    channels: [red, green, blue],
                    alpha: Number(alpha.toFixed(3)),
                    luminance: Number(luminance.toFixed(3))
                };
            }

            function parseColorChannels(value) {
                return parseCssColor(value).channels;
            }

            function toLinearChannel(channel) {
                const normalized = Math.max(0, Math.min(255, channel)) / 255;
                return normalized <= 0.03928
                    ? normalized / 12.92
                    : ((normalized + 0.055) / 1.055) ** 2.4;
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

            function contrastRatio(foregroundChannels, backgroundChannels) {
                if (!foregroundChannels || !backgroundChannels) {
                    return 0;
                }

                const foreground = relativeLuminance(foregroundChannels);
                const background = relativeLuminance(backgroundChannels);
                const lighter = Math.max(foreground, background);
                const darker = Math.min(foreground, background);
                return (lighter + 0.05) / (darker + 0.05);
            }

            function blendChannels(foregroundChannels, alpha, backgroundChannels) {
                if (!foregroundChannels || !backgroundChannels) {
                    return foregroundChannels || backgroundChannels || null;
                }

                const boundedAlpha = Math.max(0, Math.min(1, Number(alpha)));
                return foregroundChannels.map((channel, index) => (
                    (channel * boundedAlpha) + (backgroundChannels[index] * (1 - boundedAlpha))
                ));
            }

            function effectiveForegroundChannels(value, backgroundChannels) {
                const color = parseCssColor(value);

                if (!color.channels) {
                    return null;
                }

                return color.alpha < 0.995
                    ? blendChannels(color.channels, color.alpha, backgroundChannels)
                    : color.channels;
            }

            function parseBackgroundImageChannels(value) {
                const matches = Array.from(String(value || '').matchAll(/rgba?\(([^)]+)\)/ig));

                if (matches.length === 0) {
                    return null;
                }

                const totals = [0, 0, 0];
                let totalWeight = 0;

                for (const match of matches) {
                    const color = parseCssColor(`rgba(${match[1]})`);

                    if (!color.channels || color.alpha <= 0.04) {
                        continue;
                    }

                    const weight = Math.max(color.alpha, 0.12);
                    totals[0] += color.channels[0] * weight;
                    totals[1] += color.channels[1] * weight;
                    totals[2] += color.channels[2] * weight;
                    totalWeight += weight;
                }

                return totalWeight > 0
                    ? totals.map((total) => total / totalWeight)
                    : null;
            }

            function effectiveBackgroundChannels(element) {
                let current = element instanceof HTMLElement ? element : null;

                while (current) {
                    const style = window.getComputedStyle(current);
                    const color = parseCssColor(style.backgroundColor);

                    if (color.channels && color.alpha > 0.92) {
                        return color.channels;
                    }

                    if (color.channels && color.alpha > 0.08) {
                        return blendChannels(color.channels, color.alpha, effectiveBackgroundChannels(current.parentElement));
                    }

                    const backgroundImage = String(style.backgroundImage || '').toLowerCase();
                    if (backgroundImage && backgroundImage !== 'none') {
                        const gradientChannels = parseBackgroundImageChannels(backgroundImage);

                        if (gradientChannels) {
                            return gradientChannels;
                        }

                        if (current.matches('.fleet-date-prompt, .fleet-card, .fleet-card__booking, .fleet-browser__empty, .fleet-page-main, .fleet-browser, .fleet-browser__shell, .fleet-results, .reserve-page-panel, .schedule-card, .delivery-card, .reservation-summary, .step2-main, .step2-side, .contact-hero, .contact-band, .contact-form-card, .contact-trust-list li, .contact-methods-grid .info-card, .vehicle-page--mother-base, .vehicle-main--mother-base, .vehicle-page--mother-base .vehicle-booking, .vehicle-page--mother-base .model-card, .vehicle-page--mother-base .vehicle-metric, .vehicle-page--mother-base .vehicle-pdp-summary-support, .vehicle-page--mother-base .vehicle-pdp-car-note, .vehicle-page--mother-base .vehicle-pdp-gallery-card, .vehicle-page--mother-base .vehicle-pdp-use__card, .service-detail-page-main, .service-detail-hero__copy, .service-detail-hero__panel, .service-detail-card, .service-detail-trust__item, .service-detail-faq__item, .service-detail-cta, .service-detail-related__card')) {
                            return [255, 250, 243];
                        }
                    }

                    if (
                        current.matches('.service-scene, .service-scene__content, .fleet-editorial__panel--video, .fleet-editorial__panel--photo, .fleet-editorial__panel--detail, .fleet-editorial__panel-copy, .fleet-visual-card__media, .vehicle-pdp-gallery-card') &&
                        (current.querySelector('img, picture, video, .service-scene__shade, .fleet-visual-card__shade') || current.closest('.service-scene, .fleet-editorial__panel--video, .fleet-editorial__panel--photo, .fleet-editorial__panel--detail, .fleet-visual-card__media'))
                    ) {
                        return [22, 22, 22];
                    }

                    current = current.parentElement;
                }

                return parseColorChannels(window.getComputedStyle(document.body).backgroundColor) || [255, 255, 255];
            }

            function fontWeightNumber(style) {
                const rawWeight = String(style?.fontWeight || '').toLowerCase();

                if (rawWeight === 'bold') {
                    return 700;
                }

                const parsed = Number.parseInt(rawWeight, 10);
                return Number.isFinite(parsed) ? parsed : 400;
            }

            function isLargeReadableText(style) {
                const fontSize = Number.parseFloat(String(style?.fontSize || '').replace('px', '')) || 0;
                const fontWeight = fontWeightNumber(style);
                return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 600);
            }

            function collectFormBorderStyleMetrics() {
                const groups = [
                    {
                        role: 'panel',
                        selector: '#step1 .schedule-card, #step1 .delivery-card, #step1 .reservation-summary, #step2 .info-card, #step2 .selected-plan-card, #step2 .summary-section, #step3 .payment-side-card, #step3 .payment-breakdown'
                    },
                    {
                        role: 'field_container',
                        selector: '#step1 .schedule-grid .form-group, #step1 .delivery-card .form-group, #step2 .info-grid .form-group, #step2 .billing-grid .form-group'
                    },
                    {
                        role: 'control',
                        selector: '#step1 input.input, #step1 select.input, #step1 textarea.input, #step2 input.input, #step2 select.input, #step2 textarea.input, #step3 input.input, #step3 select.input, #step3 textarea.input'
                    }
                ];
                const metrics = [];

                for (const group of groups) {
                    for (const element of Array.from(document.querySelectorAll(group.selector))) {
                        if (!(element instanceof HTMLElement) || !isVisible(element)) {
                            continue;
                        }

                        const style = window.getComputedStyle(element);
                        const borderWidths = [
                            style.borderTopWidth,
                            style.borderRightWidth,
                            style.borderBottomWidth,
                            style.borderLeftWidth
                        ].map((value) => Number.parseFloat(value) || 0);
                        const maxBorderWidthPx = Math.max(...borderWidths);
                        const minBorderWidthPx = Math.min(...borderWidths);
                        const color = parseCssColor(style.borderTopColor);
                        const visualWeight = maxBorderWidthPx * color.alpha * Math.max(0.18, 1 - color.luminance);
                        const label = element.id
                            ? element.id
                            : textFor(element.querySelector('label, h2, h3, .summary-title, .schedule-card-title, .delivery-card-title, .summary-kicker')) || selectorLabel(element);

                        metrics.push({
                            role: group.role,
                            selector: selectorLabel(element),
                            label: String(label || '').slice(0, 80),
                            rect: rectData(element),
                            borderWidthPx: Number(maxBorderWidthPx.toFixed(2)),
                            borderSideSpreadPx: Number((maxBorderWidthPx - minBorderWidthPx).toFixed(2)),
                            borderAlpha: color.alpha,
                            borderLuminance: color.luminance,
                            borderVisualWeight: Number(visualWeight.toFixed(3)),
                            borderColor: style.borderTopColor,
                            focused: element === document.activeElement
                        });
                    }
                }

                return metrics.slice(0, 40);
            }

            function collectVisibleTextEncodingIssues() {
                const brokenEncodingPattern = /[\u00c2\u00c3\u00e2\ufffd]/;
                const selectors = [
                    'main h1',
                    'main h2',
                    'main h3',
                    'main p',
                    'main li',
                    'main label',
                    'main small',
                    'main strong',
                    'main button',
                    'main a[href]',
                    'main input:not([type="hidden"])',
                    'main select',
                    'main textarea',
                    'main span',
                    '.reserve-mobile-bar a',
                    '.reserve-mobile-bar button'
                ];
                const seen = new Set();
                const issues = [];

                for (const selector of selectors) {
                    for (const element of Array.from(document.querySelectorAll(selector))) {
                        if (!(element instanceof HTMLElement) || seen.has(element) || !isVisible(element)) {
                            continue;
                        }

                        seen.add(element);

                        if (element.closest('[aria-hidden="true"], .lab-nav__panel, header, nav, svg')) {
                            continue;
                        }

                        const text = textFor(element);
                        if (text.length < 2 || !brokenEncodingPattern.test(text)) {
                            continue;
                        }

                        issues.push({
                            selector: selectorLabel(element),
                            text: text.slice(0, 90),
                            rect: rectData(element)
                        });

                        if (issues.length >= 12) {
                            return issues;
                        }
                    }
                }

                return issues;
            }

            function collectVisibleTextContrastIssues() {
                const minTextContrastRatio = 4.5;
                const minLargeTextContrastRatio = 3;
                const selectors = [
                    'main h1',
                    'main h2',
                    'main h3',
                    'main p',
                    'main li',
                    'main label',
                    'main small',
                    'main strong',
                    'main dt',
                    'main dd',
                    'main summary',
                    'main button',
                    'main a[href]',
                    'main input:not([type="hidden"])',
                    'main select',
                    'main textarea',
                    'main span',
                    'footer p',
                    'footer a[href]',
                    'footer strong',
                    '.reserve-mobile-bar a',
                    '.reserve-mobile-bar button'
                ];
                const seen = new Set();
                const issues = [];

                for (const selector of selectors) {
                    for (const element of Array.from(document.querySelectorAll(selector))) {
                        if (!(element instanceof HTMLElement) || seen.has(element) || !isVisible(element)) {
                            continue;
                        }

                        seen.add(element);

                        if (element.closest('[aria-hidden="true"], .lab-nav__panel, header, nav, svg')) {
                            continue;
                        }

                        const rect = element.getBoundingClientRect();
                        const visibleIntersectionHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
                        const visibleIntersectionWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));

                        if (
                            visibleIntersectionHeight < 8 ||
                            visibleIntersectionWidth < 8 ||
                            rect.width < 24 ||
                            rect.height < 8
                        ) {
                            continue;
                        }

                        const text = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
                            ? (element.value || element.placeholder || '')
                            : element instanceof HTMLSelectElement
                                ? (element.selectedOptions[0]?.textContent || element.value || '')
                                : textFor(element);

                        if (String(text || '').replace(/\s+/g, ' ').trim().length < 2) {
                            continue;
                        }

                        const normalizedText = String(text || '').replace(/\s+/g, ' ').trim();
                        const style = window.getComputedStyle(element);
                        const backgroundChannels = effectiveBackgroundChannels(element);
                        const foregroundChannels = effectiveForegroundChannels(style.color, backgroundChannels);
                        const ratio = contrastRatio(foregroundChannels, backgroundChannels);
                        const baseRequiredRatio = isLargeReadableText(style)
                            ? minLargeTextContrastRatio
                            : minTextContrastRatio;
                        const color = parseCssColor(style.color);
                        const washedOutAlphaText = relativeLuminance(backgroundChannels) > 0.78 &&
                            color.alpha < 0.86 &&
                            normalizedText.length >= 16;
                        const requiredRatio = washedOutAlphaText
                            ? Math.max(baseRequiredRatio, 6.4)
                            : baseRequiredRatio;

                        if (ratio > 0 && ratio < requiredRatio) {
                            issues.push({
                                selector: selectorLabel(element),
                                text: textFor(element).slice(0, 90),
                                contrastRatio: Number(ratio.toFixed(2)),
                                requiredRatio,
                                color: style.color,
                                effectiveBackground: `rgb(${backgroundChannels.map((channel) => Math.round(channel)).join(', ')})`,
                                rect: rectData(element)
                            });
                        }

                        if (issues.length >= 16) {
                            return issues.sort((left, right) => left.contrastRatio - right.contrastRatio);
                        }
                    }
                }

                return issues.sort((left, right) => left.contrastRatio - right.contrastRatio);
            }

            const actionElements = Array.from(document.querySelectorAll('main a[href], main button, main [role="button"], .reserve-mobile-bar a, .reserve-mobile-bar button'))
                .filter((element) => (
                    element instanceof HTMLElement &&
                    isVisible(element) &&
                    !element.closest('footer, .site-v2-footer, header, .lab-header, .lab-nav__panel, .lab-mobile-drawer')
                ));
            const majorElements = Array.from(document.querySelectorAll([
                'main h1',
                'main h2',
                'main h3',
                'main p',
                'main li',
                'main img',
                'main picture',
                'main video',
                'main form',
                'main input:not([type="hidden"])',
                'main select',
                'main textarea',
                'main a[href]',
                'main button',
                '.fleet-card',
                '.vehicle-card',
                '.model-card',
                '.service-card',
                '.location-card',
                '.guide-card',
                '.vehicle-booking',
                '.vehicle-pdp-gallery-top__thumb',
                '.vehicle-metric',
                '.vehicle-pdp-summary-support__item',
                '.vehicle-pdp-panel',
                '.vehicle-pdp-use__card',
                '.reserve-mobile-bar'
            ].join(',')))
                .filter((element) => (
                    element instanceof HTMLElement &&
                    isVisible(element) &&
                    !element.closest('header, .lab-header, .lab-nav__panel, .lab-mobile-drawer')
                ));
            const actionMetrics = actionElements.map((element) => {
                const rect = rectData(element);
                const href = element.getAttribute('href') || '';
                const className = String(element.className || '').toLowerCase();
                const label = textFor(element).slice(0, 80);
                const edgePaddingPx = Math.min(
                    Math.max(0, rect.left),
                    Math.max(0, viewportWidth - rect.right)
                );
                const widthRatio = rect.width / Math.max(1, viewportWidth);
                const heightRatio = rect.height / Math.max(1, viewportHeight);
                const areaRatio = (rect.width * rect.height) / Math.max(1, viewportWidth * viewportHeight);
                const isContactAction = /^(tel:|mailto:)/i.test(href) ||
                    /wa\.me|whatsapp/i.test(href) ||
                    /\b(call|whatsapp|wa|mail|email)\b/i.test(label);
                const isSecondaryAction = /secondary|ghost|outline|contact/i.test(className) ||
                    isContactAction;

                return {
                    label,
                    selector: selectorLabel(element),
                    href,
                    className,
                    rect,
                    edgePaddingPx: Number(edgePaddingPx.toFixed(2)),
                    widthRatio: Number(widthRatio.toFixed(3)),
                    heightRatio: Number(heightRatio.toFixed(3)),
                    areaRatio: Number(areaRatio.toFixed(4)),
                    isContactAction,
                    isSecondaryAction,
                    insideCard: Boolean(element.closest('.fleet-card, .vehicle-card, .model-card, .service-card, .location-card, .guide-card, article[class*="card"], .card'))
                };
            });

            function collectSurfaceWidthMetrics() {
                const selectors = [
                    'main > section',
                    'main > div',
                    'main section > .lab-shell',
                    'main section > [class*="shell"]',
                    'main section > [class*="container"]',
                    'main section > [class*="panel"]',
                    'main section > [class*="card"]',
                    'main a[class*="primary"]',
                    'main button[class*="primary"]',
                    'main a[class*="cta"]',
                    'main button[class*="cta"]',
                    '.hero-lab__content',
                    '.hero-lab__actions',
                    '.hero-lab-overlay',
                    '.reserve-container',
                    '.fleet-mobile-toolbar'
                ];
                const selected = [];

                for (const element of Array.from(document.querySelectorAll(selectors.join(',')))) {
                    if (!(element instanceof HTMLElement) || !isVisible(element)) {
                        continue;
                    }

                    if (element.closest('header, nav, footer, .lab-nav__panel, [aria-hidden="true"]')) {
                        continue;
                    }

                    if (element.closest('form, fieldset, label, [class*="field"], [class*="input"], [class*="filter"]')) {
                        continue;
                    }

                    const enclosingCard = element.closest('.fleet-card, .vehicle-card, .model-card, .service-card, .location-card, .guide-card, article[class*="card"], .card');

                    if (enclosingCard && enclosingCard !== element) {
                        continue;
                    }

                    const rect = rectData(element);
                    const className = String(element.className || '');
                    const widthRatio = rect.width / Math.max(1, viewportWidth);
                    const inlinePaddingPx = Math.min(
                        Math.max(0, rect.left),
                        Math.max(0, viewportWidth - rect.right)
                    );

                    if (rect.height < 42 || widthRatio < 0.52 || widthRatio > 0.985) {
                        continue;
                    }

                    if (/\b(secondary|ghost|outline)\b/i.test(className)) {
                        continue;
                    }

                    const nestedInsideSelected = selected.some((item) => (
                        item.element.contains(element) &&
                        Math.abs(Number(item.rect.width || 0) - rect.width) <= 18
                    ));

                    if (nestedInsideSelected) {
                        continue;
                    }

                    selected.push({
                        element,
                        rect,
                        selector: selectorLabel(element),
                        label: textFor(element).slice(0, 80),
                        className,
                        widthRatio: Number(widthRatio.toFixed(3)),
                        inlinePaddingPx: Number(inlinePaddingPx.toFixed(2))
                    });

                    if (selected.length >= 18) {
                        break;
                    }
                }

                return selected.map(({ element, ...metric }) => metric);
            }

            function collectActionGroupWidthMetrics() {
                const selectors = [
                    '.hero-lab__actions',
                    '.about-hero__actions',
                    '.services-hero__feature-actions',
                    '.locations-hero__actions',
                    '.local-guide-hero__actions',
                    '.service-detail-actions',
                    '.vehicle-hero__actions',
                    '.contact-hero__actions',
                    'main [class*="actions"]'
                ];
                const groups = [];
                const seenGroups = new Set();

                function rowCountFor(rects) {
                    const rows = [];

                    for (const rect of rects) {
                        const top = Math.round(Number(rect?.top || 0));
                        if (!rows.some((known) => Math.abs(known - top) <= 4)) {
                            rows.push(top);
                        }
                    }

                    return rows.length;
                }

                for (const group of Array.from(document.querySelectorAll(selectors.join(',')))) {
                    if (!(group instanceof HTMLElement) || seenGroups.has(group) || !isVisible(group)) {
                        continue;
                    }

                    seenGroups.add(group);

                    if (group.closest('header, nav, footer, form, .lab-nav__panel, .lab-mobile-drawer, [aria-hidden="true"]')) {
                        continue;
                    }

                    if (group.closest('.fleet-card, .vehicle-card, .model-card, .service-card, .location-card, .guide-card, article[class*="card"], .card')) {
                        continue;
                    }

                    const children = Array.from(group.querySelectorAll('a[href], button, [role="button"]'))
                        .filter((child) => child instanceof HTMLElement && isVisible(child))
                        .filter((child) => !child.closest('.lab-mobile-drawer, header, nav, footer, form, .lab-nav__panel'));

                    if (children.length < 2) {
                        continue;
                    }

                    const childMetrics = children.map((child) => {
                        const rect = rectData(child);
                        return {
                            selector: selectorLabel(child),
                            label: textFor(child).slice(0, 60),
                            className: String(child.className || ''),
                            rect,
                            widthRatio: Number((rect.width / Math.max(1, viewportWidth)).toFixed(3)),
                            inlinePaddingPx: Number(Math.min(
                                Math.max(0, rect.left),
                                Math.max(0, viewportWidth - rect.right)
                            ).toFixed(2))
                        };
                    });
                    const widths = childMetrics.map((child) => Number(child.rect?.width || 0));
                    const widthRatios = childMetrics.map((child) => Number(child.widthRatio || 0));
                    const paddings = childMetrics.map((child) => Number(child.inlinePaddingPx || 0));
                    const groupRect = rectData(group);

                    groups.push({
                        selector: selectorLabel(group),
                        className: String(group.className || ''),
                        label: textFor(group).slice(0, 90),
                        rect: groupRect,
                        groupWidthRatio: Number((groupRect.width / Math.max(1, viewportWidth)).toFixed(3)),
                        childCount: childMetrics.length,
                        rowCount: rowCountFor(childMetrics.map((child) => child.rect)),
                        minChildWidthRatio: Number(Math.min(...widthRatios).toFixed(3)),
                        maxChildWidthRatio: Number(Math.max(...widthRatios).toFixed(3)),
                        widthDriftRatio: Number(((Math.max(...widths) - Math.min(...widths)) / Math.max(1, viewportWidth)).toFixed(3)),
                        sidePaddingDriftPx: Number((Math.max(...paddings) - Math.min(...paddings)).toFixed(2)),
                        children: childMetrics.slice(0, 6)
                    });

                    if (groups.length >= 12) {
                        break;
                    }
                }

                return groups;
            }

            function rectOverlap(leftRect, rightRect) {
                if (!leftRect || !rightRect) {
                    return null;
                }

                const overlapWidth = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
                const overlapHeight = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);

                if (overlapWidth <= 0 || overlapHeight <= 0) {
                    return null;
                }

                return {
                    width: Number(overlapWidth.toFixed(2)),
                    height: Number(overlapHeight.toFixed(2)),
                    area: Number((overlapWidth * overlapHeight).toFixed(2))
                };
            }

            function collectFloatingCriticalOverlapMetrics() {
                const floatingSafeGapPx = 18;
                const floatingElements = Array.from(document.querySelectorAll([
                    '.lab-floating-contact.is-visible:not(.is-over-card-actions) .lab-floating-contact__button',
                    '.hero-floating-actions__link'
                ].join(','))).filter((element) => (
                    element instanceof HTMLElement &&
                    isVisible(element)
                ));
                const criticalElements = Array.from(document.querySelectorAll([
                    '.home-booking',
                    '.home-booking__shell',
                    '.home-booking__intro',
                    '.home-booking__field',
                    '.home-booking__submit',
                    '.home-booking input:not([type="hidden"])',
                    '.home-booking select',
                    '.lookup-card',
                    '.lookup-form',
                    '.lookup-form__actions',
                    '.lookup-form input:not([type="hidden"])',
                    '.lookup-form button',
                    '.lookup-form a',
                    '.fleet-category',
                    '.fleet-category__media',
                    '.fleet-category__copy',
                    '.fleet-card',
                    '.fleet-card__content',
                    '.fleet-visual-card',
                    '.fleet-visual-card__body',
                    '.fleet-visual-card__description',
                    '.fleet-visual-card__sales-line',
                    '.fleet-visual-card__spec-list',
                    '.fleet-card__primary',
                    '.fleet-card__contact-row',
                    '.fleet-visual-card__primary',
                    '.fleet-visual-card__contact-row',
                    '.vehicle-booking__submit',
                    '.vehicle-booking__secondary',
                    '.reserve-page .btn',
                    '.reserve-page .btn-secondary'
                ].join(','))).filter((element) => element instanceof HTMLElement && isVisible(element));
                const overlaps = [];

                function rectProximity(leftRect, rightRect) {
                    const overlap = rectOverlap(leftRect, rightRect);

                    if (overlap) {
                        return {
                            ...overlap,
                            isNearMiss: false,
                            horizontalGap: 0,
                            verticalGap: 0
                        };
                    }

                    const horizontalGap = Math.max(rightRect.left - leftRect.right, leftRect.left - rightRect.right, 0);
                    const verticalGap = Math.max(rightRect.top - leftRect.bottom, leftRect.top - rightRect.bottom, 0);

                    if (horizontalGap > floatingSafeGapPx || verticalGap > floatingSafeGapPx) {
                        return null;
                    }

                    return {
                        width: 0,
                        height: 0,
                        area: 0,
                        isNearMiss: true,
                        horizontalGap: Number(horizontalGap.toFixed(2)),
                        verticalGap: Number(verticalGap.toFixed(2))
                    };
                }

                for (const floating of floatingElements) {
                    const floatingRect = rectData(floating);

                    for (const critical of criticalElements) {
                        if (floating.contains(critical) || critical.contains(floating)) {
                            continue;
                        }

                        const criticalRect = rectData(critical);
                        const overlap = rectProximity(floatingRect, criticalRect);

                        if (!overlap || (!overlap.isNearMiss && (overlap.width < 8 || overlap.height < 8))) {
                            continue;
                        }

                        overlaps.push({
                            floatingSelector: selectorLabel(floating),
                            criticalSelector: selectorLabel(critical),
                            criticalText: textFor(critical).slice(0, 80),
                            floatingRect,
                            criticalRect,
                            isNearMiss: overlap.isNearMiss,
                            safeGapPx: floatingSafeGapPx,
                            horizontalGap: overlap.horizontalGap,
                            verticalGap: overlap.verticalGap,
                            overlapWidth: overlap.width,
                            overlapHeight: overlap.height,
                            overlapArea: overlap.area
                        });

                        if (overlaps.length >= 10) {
                            return overlaps;
                        }
                    }
                }

                return overlaps;
            }

            function labelForDateElement(element) {
                if (!(element instanceof HTMLElement)) {
                    return '';
                }

                const labels = [];
                const control = element.matches('input, select, textarea')
                    ? element
                    : element.querySelector('input, select, textarea');

                if (control?.id) {
                    const matchingLabel = Array.from(document.querySelectorAll('label'))
                        .find((labelElement) => labelElement.htmlFor === control.id);
                    labels.push(textFor(matchingLabel));
                }

                labels.push(textFor(element.closest('label')));

                const field = element.closest([
                    '.field',
                    '.form-field',
                    '.input-group',
                    '.reserve-field',
                    '.vehicle-booking__field',
                    '.fleet-sidebar__field',
                    '[class*="field"]'
                ].join(','));

                if (field && field !== element) {
                    labels.push(textFor(field.querySelector('label, legend, [class*="label"], span')));
                }

                labels.push(element.getAttribute('aria-label') || '');
                labels.push(control?.getAttribute?.('aria-label') || '');

                return [...new Set(labels.map((labelText) => String(labelText || '').replace(/\s+/g, ' ').trim()).filter(Boolean))]
                    .join(' | ')
                    .slice(0, 160);
            }

            function isDateCandidate(element) {
                if (!(element instanceof HTMLElement)) {
                    return false;
                }

                const control = element.matches('input, select, textarea')
                    ? element
                    : element.querySelector('input, select, textarea');
                const context = [
                    element.id,
                    element.getAttribute('name'),
                    element.className,
                    element.getAttribute('aria-label'),
                    element.getAttribute('placeholder'),
                    control?.id,
                    control?.getAttribute?.('name'),
                    control?.className,
                    control?.getAttribute?.('aria-label'),
                    control?.getAttribute?.('placeholder'),
                    labelForDateElement(element),
                    textFor(element).slice(0, 120)
                ].join(' ');

                return control?.getAttribute?.('type') === 'date' ||
                    /\b(date|calendar|pickup|return|delivery|dropoff|schedule)\b/i.test(context);
            }

            function dateControlData(element, index) {
                const control = element.matches('input, select, textarea')
                    ? element
                    : element.querySelector('input, select, textarea');
                const rect = rectData(element);
                const controlRect = control instanceof HTMLElement ? rectData(control) : rect;
                const rawValue = control?.value || control?.getAttribute?.('value') || element.getAttribute('value') || '';
                const displayText = textFor(element);
                const labelText = labelForDateElement(element);

                return {
                    key: control?.id || control?.getAttribute?.('name') || element.id || element.getAttribute('name') || element.className || `date-control-${index + 1}`,
                    selector: selectorLabel(control instanceof HTMLElement ? control : element),
                    label: labelText,
                    value: String(rawValue || '').trim(),
                    displayText,
                    min: control?.getAttribute?.('min') || element.getAttribute('min') || '',
                    rect: controlRect,
                    containerRect: rect,
                    visibleInViewport: isVisible(element)
                };
            }

            const dateCandidateElements = [];
            const seenDateElements = new Set();

            for (const element of Array.from(document.querySelectorAll([
                'main input:not([type="hidden"])',
                'main button',
                'main [role="button"]',
                'main .fleet-sidebar__field',
                'main .vehicle-booking__field',
                'main .reserve-field',
                'main [class*="date"]',
                '.hero-lab-overlay input:not([type="hidden"])',
                '.hero-lab-overlay [class*="date"]'
            ].join(',')))) {
                if (!(element instanceof HTMLElement) || seenDateElements.has(element) || !isVisible(element) || !isDateCandidate(element)) {
                    continue;
                }

                seenDateElements.add(element);
                dateCandidateElements.push(element);

                if (dateCandidateElements.length >= 30) {
                    break;
                }
            }

            const dateControlMetrics = dateCandidateElements.map(dateControlData);
            const elementRects = majorElements
                .map(rectData)
                .filter((rect) => rect.width >= 20 && rect.height >= 8)
                .sort((left, right) => left.top - right.top);
            let largestBlankGapPx = 0;

            if (elementRects.length > 0) {
                largestBlankGapPx = Math.max(0, elementRects[0].top);

                for (let rectIndex = 1; rectIndex < elementRects.length; rectIndex += 1) {
                    largestBlankGapPx = Math.max(largestBlankGapPx, elementRects[rectIndex].top - elementRects[rectIndex - 1].bottom);
                }

                largestBlankGapPx = Math.max(largestBlankGapPx, viewportHeight - elementRects[elementRects.length - 1].bottom);
            }

            return {
                scrollY: Number((window.scrollY || window.pageYOffset || 0).toFixed(2)),
                viewportWidth,
                viewportHeight,
                visibleMajorElementCount: elementRects.length,
                visibleActionCount: actionMetrics.length,
                largestBlankGapPx: Number(largestBlankGapPx.toFixed(2)),
                largestBlankGapRatio: Number((largestBlankGapPx / Math.max(1, viewportHeight)).toFixed(3)),
                actionMetrics: actionMetrics.slice(0, 40),
                surfaceWidthMetrics: collectSurfaceWidthMetrics(),
                actionGroupWidthMetrics: collectActionGroupWidthMetrics(),
                floatingCriticalOverlapMetrics: collectFloatingCriticalOverlapMetrics(),
                dateControlMetrics,
                formBorderStyleMetrics: collectFormBorderStyleMetrics(),
                textEncodingIssues: collectVisibleTextEncodingIssues(),
                textContrastIssues: collectVisibleTextContrastIssues()
            };
        });

        frames.push({
            index: index + 1,
            scrollY: y,
            viewportTop: y,
            viewportBottom: y + viewportHeight,
            screenshotPath,
            metric: frameMetric
        });
    }

    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await settlePage(page, 90);

    const cardActionMetrics = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity) >= 0.05 &&
                rect.width >= 6 &&
                rect.height >= 6;
        }

        function rectData(element) {
            if (!(element instanceof HTMLElement)) {
                return null;
            }

            const rect = element.getBoundingClientRect();
            const scrollY = window.scrollY || window.pageYOffset || 0;
            const scrollX = window.scrollX || window.pageXOffset || 0;

            return {
                top: Number((rect.top + scrollY).toFixed(2)),
                right: Number((rect.right + scrollX).toFixed(2)),
                bottom: Number((rect.bottom + scrollY).toFixed(2)),
                left: Number((rect.left + scrollX).toFixed(2)),
                width: Number(rect.width.toFixed(2)),
                height: Number(rect.height.toFixed(2)),
                viewportTop: Number(rect.top.toFixed(2)),
                viewportBottom: Number(rect.bottom.toFixed(2))
            };
        }

        function unionRects(rects) {
            const validRects = (rects || []).filter(Boolean);

            if (validRects.length === 0) {
                return null;
            }

            const left = Math.min(...validRects.map((rect) => rect.left));
            const right = Math.max(...validRects.map((rect) => rect.right));
            const top = Math.min(...validRects.map((rect) => rect.top));
            const bottom = Math.max(...validRects.map((rect) => rect.bottom));

            return {
                top: Number(top.toFixed(2)),
                right: Number(right.toFixed(2)),
                bottom: Number(bottom.toFixed(2)),
                left: Number(left.toFixed(2)),
                width: Number((right - left).toFixed(2)),
                height: Number((bottom - top).toFixed(2))
            };
        }

        function textFor(element) {
            return String(element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function uniqueRowCount(elements) {
            const rows = elements
                .map((element) => Math.round(element.getBoundingClientRect().top))
                .sort((left, right) => left - right);
            const uniqueRows = [];

            for (const row of rows) {
                if (!uniqueRows.some((known) => Math.abs(known - row) <= 4)) {
                    uniqueRows.push(row);
                }
            }

            return uniqueRows.length;
        }

        function radiusPx(element) {
            if (!(element instanceof HTMLElement)) {
                return 0;
            }

            const style = window.getComputedStyle(element);
            const value = Number.parseFloat(style.borderTopLeftRadius || '0');
            return Number(Number.isFinite(value) ? value.toFixed(2) : 0);
        }

        const cardSelectors = [
            '.fleet-card',
            '.vehicle-card',
            '.model-card',
            '.service-card',
            '.location-card',
            '.guide-card',
            'article[class*="card"]',
            '.card'
        ];
        const seen = new Set();
        const cards = [];

        for (const selector of cardSelectors) {
            for (const element of Array.from(document.querySelectorAll(selector))) {
                if (!(element instanceof HTMLElement) || seen.has(element) || !isVisible(element)) {
                    continue;
                }

                seen.add(element);
                cards.push(element);

                if (cards.length >= 48) {
                    break;
                }
            }
        }

        return cards
            .map((card, index) => {
                const cardRect = rectData(card);

                if (!cardRect || cardRect.width < 150 || cardRect.height < 120) {
                    return null;
                }

                const title = card.querySelector('.fleet-card__title, .vehicle-card__title, .model-card h3, h2, h3, [class*="title"]');
                const price = card.querySelector('.fleet-card__price-value, [class*="price"], [class*="rate"]');
                const primaryActions = Array.from(card.querySelectorAll([
                    '.fleet-card__primary',
                    '.vehicle-booking__submit',
                    '.btn-primary',
                    '.button--primary',
                    '[class*="primary"]',
                    'a[href*="reserve"]',
                    'button[type="submit"]'
                ].join(','))).filter((element) => element instanceof HTMLElement && isVisible(element));
                const secondaryActions = Array.from(card.querySelectorAll([
                    '.fleet-card__secondary',
                    '.button--secondary',
                    '[class*="secondary"]',
                    'a[href^="tel:"]',
                    'a[href*="wa.me"]',
                    'a[href*="whatsapp"]'
                ].join(','))).filter((element) => element instanceof HTMLElement && isVisible(element));
                const actionElements = [...new Set([...primaryActions, ...secondaryActions])];
                const titleRect = rectData(title);
                const priceRect = rectData(price);
                const primaryRects = primaryActions.map(rectData);
                const secondaryRects = secondaryActions.map(rectData);
                const actionGroupRect = unionRects(actionElements.map(rectData));
                const secondaryGroupRect = unionRects(secondaryRects);
                const coreRect = unionRects([titleRect, priceRect]);
                const contactRow = secondaryActions
                    .map((element) => element.closest('.fleet-card__contact-row, .vehicle-card__contact-row, .model-card__contact-row, [class*="contact-row"], [class*="action-row"], [class*="actions"]'))
                    .find((element) => element instanceof HTMLElement && card.contains(element) && isVisible(element));
                const contactRowRect = rectData(contactRow);
                const cardClass = String(card.className || '');
                const isVehicleActionCard = Boolean(price) || card.matches('.fleet-card, .vehicle-card, .model-card, .vehicle-booking') || /\b(fleet|vehicle|model)-/.test(cardClass);
                const cardWidth = Math.max(1, cardRect.width);
                const cardHeight = Math.max(1, cardRect.height);
                const actionInlinePaddingPx = actionGroupRect
                    ? Math.min(
                        Math.max(0, actionGroupRect.left - cardRect.left),
                        Math.max(0, cardRect.right - actionGroupRect.right)
                    )
                    : 0;
                const secondaryInlinePaddingPx = secondaryGroupRect
                    ? Math.min(
                        Math.max(0, secondaryGroupRect.left - cardRect.left),
                        Math.max(0, cardRect.right - secondaryGroupRect.right)
                    )
                    : 0;
                const secondaryMaxButtonWidth = secondaryRects.length
                    ? Math.max(...secondaryRects.map((rect) => Number(rect?.width || 0)))
                    : 0;
                const secondaryGroupWidth = Number(secondaryGroupRect?.width || 0);
                const contactRowWidth = Number(contactRowRect?.width || 0);
                const splitContactGroupWidth = Math.max(secondaryGroupWidth, contactRowWidth);
                const secondaryLeftGapPx = secondaryGroupRect
                    ? Math.max(0, Number((secondaryGroupRect.left - cardRect.left).toFixed(2)))
                    : 0;
                const secondaryRightGapPx = secondaryGroupRect
                    ? Math.max(0, Number((cardRect.right - secondaryGroupRect.right).toFixed(2)))
                    : 0;
                const contactRowLeftGapPx = contactRowRect
                    ? Math.max(0, Number((contactRowRect.left - cardRect.left).toFixed(2)))
                    : secondaryLeftGapPx;
                const contactRowRightGapPx = contactRowRect
                    ? Math.max(0, Number((cardRect.right - contactRowRect.right).toFixed(2)))
                    : secondaryRightGapPx;
                const splitContactSideGapPx = Math.max(
                    Math.min(secondaryLeftGapPx, contactRowLeftGapPx),
                    Math.min(secondaryRightGapPx, contactRowRightGapPx)
                );
                const splitContactOverflowPx = Math.max(
                    0,
                    contactRowRect ? cardRect.left - contactRowRect.left : 0,
                    contactRowRect ? contactRowRect.right - cardRect.right : 0,
                    secondaryGroupRect ? cardRect.left - secondaryGroupRect.left : 0,
                    secondaryGroupRect ? secondaryGroupRect.right - cardRect.right : 0
                );
                const primaryMaxHeight = primaryRects.length
                    ? Math.max(...primaryRects.map((rect) => Number(rect?.height || 0)))
                    : 0;
                const secondaryMaxHeight = secondaryRects.length
                    ? Math.max(...secondaryRects.map((rect) => Number(rect?.height || 0)))
                    : 0;
                const actionRadii = actionElements.map(radiusPx);
                const buttonMaxRadiusPx = actionRadii.length ? Math.max(...actionRadii) : 0;
                const buttonRadiusSpreadPx = actionRadii.length
                    ? Number((Math.max(...actionRadii) - Math.min(...actionRadii)).toFixed(2))
                    : 0;
                const coreHeight = Math.max(1, Number(coreRect?.height || 0));

                return {
                    index: index + 1,
                    label: textFor(title).slice(0, 80) || card.className || `card-${index + 1}`,
                    cardClass,
                    hasPrice: Boolean(price),
                    isVehicleActionCard,
                    cardRect,
                    titleRect,
                    priceRect,
                    actionGroupRect,
                    secondaryGroupRect,
                    actionInlinePaddingPx: Number(actionInlinePaddingPx.toFixed(2)),
                    secondaryInlinePaddingPx: Number(secondaryInlinePaddingPx.toFixed(2)),
                    actionGroupHeightRatio: Number((Number(actionGroupRect?.height || 0) / cardHeight).toFixed(3)),
                    secondaryActionHeightRatio: Number((Number(secondaryGroupRect?.height || 0) / cardHeight).toFixed(3)),
                    secondaryDominanceRatio: Number((Number(secondaryGroupRect?.height || 0) / coreHeight).toFixed(3)),
                    secondaryMaxButtonWidthRatio: Number((secondaryMaxButtonWidth / cardWidth).toFixed(3)),
                    splitContactGroupWidthRatio: Number((splitContactGroupWidth / cardWidth).toFixed(3)),
                    splitContactSideGapPx: Number(splitContactSideGapPx.toFixed(2)),
                    splitContactOverflowPx: Number(splitContactOverflowPx.toFixed(2)),
                    secondaryLeftGapPx: Number(secondaryLeftGapPx.toFixed(2)),
                    secondaryRightGapPx: Number(secondaryRightGapPx.toFixed(2)),
                    contactRowLeftGapPx: Number(contactRowLeftGapPx.toFixed(2)),
                    contactRowRightGapPx: Number(contactRowRightGapPx.toFixed(2)),
                    secondaryBottomGapPx: secondaryGroupRect
                        ? Number(Math.max(0, cardRect.bottom - secondaryGroupRect.bottom).toFixed(2))
                        : 0,
                    primaryMaxHeight,
                    secondaryMaxHeight,
                    primaryCount: primaryActions.length,
                    secondaryCount: secondaryActions.length,
                    secondaryRowCount: uniqueRowCount(secondaryActions),
                    primaryLabels: primaryActions.map(textFor).filter(Boolean).slice(0, 4),
                    secondaryLabels: secondaryActions.map(textFor).filter(Boolean).slice(0, 4),
                    buttonMaxRadiusPx: Number(buttonMaxRadiusPx.toFixed(2)),
                    buttonRadiusSpreadPx,
                    viewportWidth,
                    viewportHeight
                };
            })
            .filter(Boolean);
    });

    return {
        available: true,
        viewportName: viewport?.name || '',
        viewportWidth: documentMetrics.viewportWidth,
        viewportHeight: documentMetrics.viewportHeight,
        documentHeight: documentMetrics.height,
        frames,
        cardActionMetrics
    };
}

async function collectStaleBookingDateProbeState({ context, baseUrl, route, pageDir, viewport }) {
    const normalizedRoute = normalizeRoute(route);

    if (normalizedRoute !== '/app/reserve/page.html') {
        return null;
    }

    const auditDateIso = formatLocalDateIso();
    const staleStartDate = addLocalDaysIso(-1);
    const futureEndDate = addLocalDaysIso(1);
    const probePage = await context.newPage();
    const probeDir = path.join(pageDir, 'stale-booking-date-probe');
    const probeRoute = `/app/reserve/page.html?startDate=${encodeURIComponent(staleStartDate)}&endDate=${encodeURIComponent(futureEndDate)}&pickupTime=12%3A00&dropoffTime=12%3A00`;

    ensureDir(probeDir);

    try {
        await probePage.goto(`${baseUrl}${probeRoute}`, { waitUntil: 'domcontentloaded' });
        await settlePage(probePage, 450);

        return {
            available: true,
            auditDateIso,
            staleStartDate,
            futureEndDate,
            probeRoute,
            pageDepthScanState: await collectPageDepthScanState(probePage, probeDir, viewport)
        };
    } catch (error) {
        return {
            available: false,
            auditDateIso,
            staleStartDate,
            futureEndDate,
            probeRoute,
            reason: error.message
        };
    } finally {
        await probePage.close().catch(() => {});
    }
}

function screenshotForScanMetric(state, metric, fallbackScreenshotPath) {
    const cardTop = Number(metric?.cardRect?.top || 0);
    const frame = (state?.frames || []).find((entry) => (
        cardTop >= Number(entry.viewportTop || 0) &&
        cardTop <= Number(entry.viewportBottom || 0)
    ));

    return frame?.screenshotPath || state?.frames?.[0]?.screenshotPath || fallbackScreenshotPath;
}

function buildPageDepthScanFindings({ route, viewportName, viewportWidth, state, screenshotPath, auditDateIso = formatLocalDateIso() }) {
    const findings = [];
    const cardContract = getMobileInteractionContract({
        interaction: 'mobile_card_actions',
        viewportName,
        viewportWidth
    });
    const scanContract = getMobileInteractionContract({
        interaction: 'page_depth_scan',
        viewportName,
        viewportWidth
    });
    const dateContract = getMobileInteractionContract({
        interaction: 'booking_date_defaults',
        viewportName,
        viewportWidth
    });
    const currentDateIso = normalizeIsoDate(auditDateIso) || formatLocalDateIso();
    const currentDayNumber = dateIsoToDayNumber(currentDateIso);

    if (!state?.available) {
        return findings;
    }

    if (dateContract && Number.isFinite(currentDayNumber)) {
        const reportedDateKeys = new Set();

        for (const frame of state.frames || []) {
            const frameMetric = frame.metric || {};
            const frameScreenshotPath = frame.screenshotPath || screenshotPath;
            const frameEvidence = `frame=${frame.index}; scrollY=${frame.scrollY}`;

            for (const dateControl of frameMetric.dateControlMetrics || []) {
                const rawText = [
                    dateControl.value,
                    dateControl.displayText
                ].filter(Boolean).join(' ');
                const parsedDateIso = parseVisualDateValue(rawText);
                const minDateIso = parseVisualDateValue(dateControl.min);
                const dateKey = `${dateControl.key || dateControl.selector || ''}:${parsedDateIso || rawText}`;

                if (reportedDateKeys.has(dateKey)) {
                    continue;
                }

                if (parsedDateIso) {
                    const parsedDayNumber = dateIsoToDayNumber(parsedDateIso);
                    const pastDays = currentDayNumber - parsedDayNumber;

                    if (Number.isFinite(parsedDayNumber) && pastDays > Number(dateContract.maxPastDays || 0)) {
                        reportedDateKeys.add(dateKey);
                        findings.push(createVisualFinding({
                            route,
                            viewport: viewportName,
                            severity: 'high',
                            category: 'date_currentness',
                            selector: dateControl.selector,
                            message: 'A booking date control is prefilled with a past date.',
                            evidence: `${frameEvidence}; control="${dateControl.label || dateControl.key || dateControl.selector}"; value=${parsedDateIso}; today=${currentDateIso}; pastDays=${pastDays}`,
                            likelyCause: 'The booking flow is reusing a stale stored/query/default date instead of refreshing the customer-facing schedule to today or a future date.',
                            hardFail: true,
                            screenshotPath: frameScreenshotPath,
                            source: 'page_depth_scan'
                        }));
                    }
                }

                if (
                    dateContract.requireMinDateAtLeastToday &&
                    minDateIso &&
                    dateIsoToDayNumber(minDateIso) < currentDayNumber
                ) {
                    const minKey = `${dateControl.key || dateControl.selector || ''}:min:${minDateIso}`;

                    if (!reportedDateKeys.has(minKey)) {
                        reportedDateKeys.add(minKey);
                        findings.push(createVisualFinding({
                            route,
                            viewport: viewportName,
                            severity: 'medium',
                            category: 'date_currentness',
                            selector: dateControl.selector,
                            message: 'A booking date control allows dates before today.',
                            evidence: `${frameEvidence}; control="${dateControl.label || dateControl.key || dateControl.selector}"; min=${minDateIso}; today=${currentDateIso}`,
                            likelyCause: 'The date picker lower bound is stale, so guests can enter an invalid rental date.',
                            screenshotPath: frameScreenshotPath,
                            source: 'page_depth_scan'
                        }));
                    }
                }
            }

            for (const overlap of frameMetric.floatingCriticalOverlapMetrics || []) {
                const geometryEvidence = overlap.isNearMiss
                    ? `nearMissGapX=${overlap.horizontalGap}; nearMissGapY=${overlap.verticalGap}; safeGap=${overlap.safeGapPx}`
                    : `overlapWidth=${overlap.overlapWidth}; overlapHeight=${overlap.overlapHeight}`;
                findings.push(createVisualFinding({
                    route,
                    viewport: viewportName,
                    severity: 'high',
                    category: 'overlap',
                    selector: `${overlap.floatingSelector} <> ${overlap.criticalSelector}`,
                    message: 'A floating contact control overlaps or crowds critical first-viewport content.',
                    evidence: `${frameEvidence}; critical="${overlap.criticalText || overlap.criticalSelector}"; ${geometryEvidence}`,
                    likelyCause: 'The floating call/WhatsApp stack is not hiding or moving away when forms, cards, or primary actions enter the viewport.',
                    hardFail: true,
                    screenshotPath: frameScreenshotPath,
                    source: 'page_depth_scan'
                }));
            }
        }
    }

    if (scanContract) {
        for (const frame of state.frames || []) {
            const frameMetric = frame.metric || {};
            const frameScreenshotPath = frame.screenshotPath || screenshotPath;
            const frameEvidence = `frame=${frame.index}; scrollY=${frame.scrollY}`;

            if (
                Number(frameMetric.visibleMajorElementCount || 0) >= Number(scanContract.minVisibleElementsForGapAudit || 0) &&
                Number(frameMetric.largestBlankGapRatio || 0) > Number(scanContract.maxBlankGapRatio || 1)
            ) {
                findings.push(createVisualFinding({
                    route,
                    viewport: viewportName,
                    severity: 'medium',
                    category: 'layout_gap',
                    message: 'A vertical scan frame contains a large unexplained blank gap.',
                    evidence: `${frameEvidence}; largestBlankGapRatio=${frameMetric.largestBlankGapRatio}; max=${scanContract.maxBlankGapRatio}; visibleElements=${frameMetric.visibleMajorElementCount}`,
                    likelyCause: 'A section, card, or responsive stack is leaving dead space as the customer scrolls down the page.',
                    screenshotPath: frameScreenshotPath,
                    source: 'page_depth_scan'
                }));
            }

            for (const textIssue of frameMetric.textEncodingIssues || []) {
                findings.push(createVisualFinding({
                    route,
                    viewport: viewportName,
                    severity: 'high',
                    category: 'text_encoding',
                    selector: textIssue.selector,
                    message: 'Visible customer-facing text contains broken encoding artifacts while scrolling the page.',
                    evidence: `${frameEvidence}; text="${textIssue.text}"`,
                    likelyCause: 'A UTF-8 symbol was saved or served through the wrong encoding, so the browser renders mojibake instead of readable copy.',
                    hardFail: true,
                    screenshotPath: frameScreenshotPath,
                    source: 'page_depth_scan'
                }));
            }

            for (const textIssue of frameMetric.textContrastIssues || []) {
                const contrastRatioValue = Number(textIssue.contrastRatio || 0);
                const severeContrast = contrastRatioValue > 0 && contrastRatioValue < 3;

                findings.push(createVisualFinding({
                    route,
                    viewport: viewportName,
                    severity: severeContrast ? 'high' : 'medium',
                    category: 'contrast',
                    selector: textIssue.selector,
                    message: 'Visible text loses contrast while scrolling the page.',
                    evidence: `${frameEvidence}; text="${textIssue.text}"; contrastRatio=${textIssue.contrastRatio}; requiredRatio=${textIssue.requiredRatio}; color=${textIssue.color}; effectiveBackground=${textIssue.effectiveBackground}`,
                    likelyCause: 'A section-specific text color is too close to its card, image, or page background outside the first viewport.',
                    hardFail: severeContrast,
                    screenshotPath: frameScreenshotPath,
                    source: 'page_depth_scan'
                }));
            }

            if (
                Number(viewportWidth || 0) < 760 &&
                Number.isFinite(Number(scanContract.maxSurfaceWidthDriftRatio))
            ) {
                const surfaceMetrics = (frameMetric.surfaceWidthMetrics || [])
                    .filter((metric) => (
                        Number(metric.widthRatio || 0) >= 0.52 &&
                        Number(metric.widthRatio || 0) <= 0.985 &&
                        !/\b(form|fieldset|field|input|filter)\b/i.test(`${metric.selector || ''} ${metric.className || ''}`)
                    ));

                if (surfaceMetrics.length >= 2) {
                    const widthRatios = surfaceMetrics.map((metric) => Number(metric.widthRatio || 0));
                    const sidePaddings = surfaceMetrics.map((metric) => Number(metric.inlinePaddingPx || 0));
                    const widthDriftRatio = Math.max(...widthRatios) - Math.min(...widthRatios);
                    const sidePaddingDriftPx = Math.max(...sidePaddings) - Math.min(...sidePaddings);

                    if (
                        widthDriftRatio > Number(scanContract.maxSurfaceWidthDriftRatio) ||
                        sidePaddingDriftPx > Number(scanContract.maxSurfaceSidePaddingDriftPx || 999)
                    ) {
                        const examples = surfaceMetrics
                            .slice(0, 4)
                            .map((metric) => `${metric.label || metric.selector}:w=${metric.widthRatio},pad=${metric.inlinePaddingPx}`)
                            .join('; ');

                        findings.push(createVisualFinding({
                            route,
                            viewport: viewportName,
                            severity: 'high',
                            category: 'layout_homogeneity',
                            message: 'Mobile sections and primary surfaces do not keep a consistent readable width.',
                            evidence: `${frameEvidence}; widthDriftRatio=${widthDriftRatio.toFixed(3)}; max=${scanContract.maxSurfaceWidthDriftRatio}; sidePaddingDriftPx=${sidePaddingDriftPx.toFixed(2)}; examples=${examples}`,
                            likelyCause: 'Adjacent mobile blocks are using unrelated width, max-width, or padding rules instead of the shared page rhythm.',
                            hardFail: true,
                            screenshotPath: frameScreenshotPath,
                            source: 'page_depth_scan'
                        }));
                    }
                }

                const inconsistentActionGroups = (frameMetric.actionGroupWidthMetrics || [])
                    .filter((metric) => (
                        Number(metric.childCount || 0) >= 2 &&
                        Number(metric.maxChildWidthRatio || 0) >= Number(scanContract.minWideActionWidthRatio || 0.55) &&
                        Number(metric.widthDriftRatio || 0) > Number(scanContract.maxActionGroupWidthDriftRatio || 0.08)
                    ));

                for (const metric of inconsistentActionGroups.slice(0, 4)) {
                    const examples = (metric.children || [])
                        .slice(0, 4)
                        .map((child) => `${child.label || child.selector}:w=${child.widthRatio},pad=${child.inlinePaddingPx}`)
                        .join('; ');

                    findings.push(createVisualFinding({
                        route,
                        viewport: viewportName,
                        severity: 'high',
                        category: 'layout_homogeneity',
                        selector: metric.selector,
                        message: 'A mobile action group mixes unrelated button widths inside the same section.',
                        evidence: `${frameEvidence}; group=${metric.selector}; widthDriftRatio=${metric.widthDriftRatio}; max=${scanContract.maxActionGroupWidthDriftRatio}; rowCount=${metric.rowCount}; examples=${examples}`,
                        likelyCause: 'Primary and secondary actions are using different mobile width rules instead of sharing a stable grid or stacked full-width rhythm.',
                        hardFail: true,
                        screenshotPath: frameScreenshotPath,
                        source: 'page_depth_scan'
                    }));
                }
            }

            if (
                Number(viewportWidth || 0) >= 900 &&
                Number.isFinite(Number(scanContract.maxFormBorderWidthSpreadPx))
            ) {
                const groupedBorderMetrics = new Map();

                for (const metric of frameMetric.formBorderStyleMetrics || []) {
                    const role = metric.role || 'unknown';
                    if (!groupedBorderMetrics.has(role)) {
                        groupedBorderMetrics.set(role, []);
                    }
                    groupedBorderMetrics.get(role).push(metric);
                }

                for (const [role, metrics] of groupedBorderMetrics.entries()) {
                    if (metrics.length < 2) {
                        continue;
                    }

                    const borderWidthValues = metrics.map((metric) => Number(metric.borderWidthPx || 0));
                    const borderAlphaValues = metrics.map((metric) => Number(metric.borderAlpha || 0));
                    const visualWeightValues = metrics.map((metric) => Number(metric.borderVisualWeight || 0));
                    const widthSpreadPx = Math.max(...borderWidthValues) - Math.min(...borderWidthValues);
                    const alphaSpread = Math.max(...borderAlphaValues) - Math.min(...borderAlphaValues);
                    const visualWeightSpread = Math.max(...visualWeightValues) - Math.min(...visualWeightValues);
                    const unevenMetric = metrics
                        .slice()
                        .sort((left, right) => Number(right.borderVisualWeight || 0) - Number(left.borderVisualWeight || 0))[0];
                    const examples = metrics
                        .slice(0, 5)
                        .map((metric) => `${metric.label || metric.selector}:w=${metric.borderWidthPx},a=${metric.borderAlpha},vw=${metric.borderVisualWeight}`)
                        .join('; ');

                    if (
                        widthSpreadPx > Number(scanContract.maxFormBorderWidthSpreadPx) ||
                        alphaSpread > Number(scanContract.maxFormBorderAlphaSpread || 1) ||
                        visualWeightSpread > Number(scanContract.maxFormBorderVisualWeightSpread || 1)
                    ) {
                        findings.push(createVisualFinding({
                            route,
                            viewport: viewportName,
                            severity: widthSpreadPx > Number(scanContract.maxFormBorderWidthSpreadPx) ? 'high' : 'medium',
                            category: 'border_weight_drift',
                            selector: unevenMetric?.selector || '',
                            message: 'Desktop form boxes do not share a consistent border weight.',
                            evidence: `${frameEvidence}; role=${role}; borderWidthSpreadPx=${widthSpreadPx.toFixed(2)}; maxWidth=${scanContract.maxFormBorderWidthSpreadPx}; borderAlphaSpread=${alphaSpread.toFixed(3)}; maxAlpha=${scanContract.maxFormBorderAlphaSpread}; visualWeightSpread=${visualWeightSpread.toFixed(3)}; maxVisualWeight=${scanContract.maxFormBorderVisualWeightSpread}; ${examples}`,
                            likelyCause: 'One form panel, field wrapper, or input is using a darker/thicker border than its sibling controls, so the desktop layout feels uneven.',
                            hardFail: widthSpreadPx > Number(scanContract.maxFormBorderWidthSpreadPx),
                            screenshotPath: frameScreenshotPath,
                            source: 'page_depth_scan'
                        }));
                    }
                }
            }

            for (const action of frameMetric.actionMetrics || []) {
                if (
                    action.isContactAction &&
                    Number(action.widthRatio || 0) > Number(scanContract.maxContactActionWidthRatio || 1)
                ) {
                    findings.push(createVisualFinding({
                        route,
                        viewport: viewportName,
                        severity: action.insideCard ? 'high' : 'medium',
                        category: 'cta_hierarchy',
                        message: 'A contact action is wider than expected for its supporting role.',
                        evidence: `${frameEvidence}; action="${action.label || action.selector}"; widthRatio=${action.widthRatio}; max=${scanContract.maxContactActionWidthRatio}; insideCard=${Boolean(action.insideCard)}`,
                        likelyCause: 'Call, WhatsApp, or email actions are reading like the main product content instead of supporting the booking path.',
                        hardFail: Boolean(action.insideCard),
                        screenshotPath: frameScreenshotPath,
                        source: 'page_depth_scan'
                    }));
                }

                if (
                    action.isContactAction &&
                    Number(action.rect?.height || 0) > Number(scanContract.maxContactActionHeightPx || 999)
                ) {
                    findings.push(createVisualFinding({
                        route,
                        viewport: viewportName,
                        severity: 'medium',
                        category: 'cta_hierarchy',
                        message: 'A contact action is taller than expected for a supporting action.',
                        evidence: `${frameEvidence}; action="${action.label || action.selector}"; height=${action.rect?.height}; max=${scanContract.maxContactActionHeightPx}`,
                        likelyCause: 'A secondary contact CTA is styled too close to a full primary action.',
                        screenshotPath: frameScreenshotPath,
                        source: 'page_depth_scan'
                    }));
                }

                if (
                    action.isContactAction &&
                    Number(action.areaRatio || 0) > Number(scanContract.maxContactActionAreaRatio || 1)
                ) {
                    findings.push(createVisualFinding({
                        route,
                        viewport: viewportName,
                        severity: action.insideCard ? 'high' : 'medium',
                        category: 'cta_hierarchy',
                        message: 'A contact action occupies too much of the visible screen.',
                        evidence: `${frameEvidence}; action="${action.label || action.selector}"; areaRatio=${action.areaRatio}; max=${scanContract.maxContactActionAreaRatio}; insideCard=${Boolean(action.insideCard)}`,
                        likelyCause: 'The support CTA is visually competing with the main task in this viewport segment.',
                        hardFail: Boolean(action.insideCard),
                        screenshotPath: frameScreenshotPath,
                        source: 'page_depth_scan'
                    }));
                }

                if (
                    action.isSecondaryAction &&
                    Number(action.widthRatio || 0) > Number(scanContract.maxSecondaryActionWidthRatio || 1)
                ) {
                    findings.push(createVisualFinding({
                        route,
                        viewport: viewportName,
                        severity: 'medium',
                        category: 'cta_hierarchy',
                        message: 'A secondary action is nearly as wide as a primary page action.',
                        evidence: `${frameEvidence}; action="${action.label || action.selector}"; widthRatio=${action.widthRatio}; max=${scanContract.maxSecondaryActionWidthRatio}`,
                        likelyCause: 'A secondary or support action is taking page-level visual authority.',
                        screenshotPath: frameScreenshotPath,
                        source: 'page_depth_scan'
                    }));
                }

                if (
                    Number(action.widthRatio || 0) > Number(scanContract.maxEdgeToEdgeActionWidthRatio || 1) &&
                    Number(action.edgePaddingPx || 0) < Number(scanContract.minViewportActionSidePaddingPx || 0)
                ) {
                    findings.push(createVisualFinding({
                        route,
                        viewport: viewportName,
                        severity: action.insideCard ? 'high' : 'medium',
                        category: 'spacing',
                        message: 'An action hugs the viewport edge during the vertical visual scan.',
                        evidence: `${frameEvidence}; action="${action.label || action.selector}"; widthRatio=${action.widthRatio}; edgePaddingPx=${action.edgePaddingPx}; min=${scanContract.minViewportActionSidePaddingPx}`,
                        likelyCause: 'The action is escaping its layout container or losing responsive side padding.',
                        hardFail: Boolean(action.insideCard),
                        screenshotPath: frameScreenshotPath,
                        source: 'page_depth_scan'
                    }));
                }
            }
        }
    }

    if (!cardContract) {
        return findings;
    }

    const cardMetrics = state.cardActionMetrics || [];
    const summarizeCardLabels = (metrics) => {
        const labels = metrics
            .map((metric) => metric.label)
            .filter(Boolean)
            .slice(0, 4);
        return `affectedCards=${metrics.length}; examples=${labels.join(', ')}`;
    };
    const isDesktopCardViewport = Number(viewportWidth || 0) >= 900;
    const cardPatternLabel = isDesktopCardViewport ? 'desktop card pattern' : 'mobile card pattern';
    const cardWidthLabel = isDesktopCardViewport ? 'desktop card width' : 'mobile card width';
    const isSingleRowSplitContact = (metric) => (
        metric.isVehicleActionCard !== false &&
        Number(metric.secondaryCount || 0) >= 2 &&
        Number(metric.secondaryRowCount || 0) === 1
    );
    const narrowStackedContactCards = cardMetrics.filter((metric) => (
        metric.isVehicleActionCard !== false &&
        Number(metric.secondaryRowCount || 0) > 1 &&
        Number(metric.secondaryCount || 0) >= 2 &&
        Number(metric.secondaryMaxButtonWidthRatio || 0) < Number(cardContract.minStackedContactButtonWidthRatio || 0)
    ));
    const edgeTouchingCards = cardMetrics.filter((metric) => (
        Number(metric.secondaryCount || 0) > 0 &&
        !isSingleRowSplitContact(metric) &&
        Number(metric.secondaryInlinePaddingPx || 0) < Number(cardContract.minCardInlinePaddingPx || 0)
    ));
    const dominantActionCards = cardMetrics.filter((metric) => (
        Number(metric.actionGroupHeightRatio || 0) > Number(cardContract.maxActionGroupHeightRatio || 1)
    ));
    const splitContactCards = cardMetrics.filter((metric) => (
        metric.isVehicleActionCard !== false &&
        Number(metric.secondaryCount || 0) >= 2 &&
        Number(metric.secondaryRowCount || 0) === 1
    ));
    const stackedContactCards = cardMetrics.filter((metric) => (
        metric.isVehicleActionCard !== false &&
        Number(metric.secondaryCount || 0) >= 2 &&
        Number(metric.secondaryRowCount || 0) > 1
    ));
    const thinContactStripCards = cardMetrics.filter((metric) => (
        Boolean(cardContract.requireSingleRowContactSplit) &&
        isSingleRowSplitContact(metric) &&
        Number(metric.secondaryActionHeightRatio || 0) < Number(cardContract.minSplitContactStripHeightRatio || 0)
    ));
    const narrowSplitContactCards = cardMetrics.filter((metric) => (
        Boolean(cardContract.requireSingleRowContactSplit) &&
        isSingleRowSplitContact(metric) &&
        (
            Number(metric.splitContactGroupWidthRatio || 0) < Number(cardContract.minSplitContactGroupWidthRatio || 0) ||
            Number(metric.splitContactSideGapPx || 0) > Number(cardContract.maxSplitContactSideGapPx || 0)
        )
    ));
    const overflowingSplitContactCards = cardMetrics.filter((metric) => (
        Boolean(cardContract.requireSingleRowContactSplit) &&
        isSingleRowSplitContact(metric) &&
        Number(metric.splitContactOverflowPx || 0) > Number(cardContract.maxSplitContactOverflowPx || 0)
    ));
    const inconsistentButtonShapeCards = cardMetrics.filter((metric) => (
        metric.isVehicleActionCard !== false &&
        Number(metric.primaryCount || 0) > 0 &&
        Number(metric.secondaryCount || 0) > 0 &&
        (
            Number(metric.buttonMaxRadiusPx || 0) > Number(cardContract.maxButtonRadiusPx || 999) ||
            Number(metric.buttonRadiusSpreadPx || 0) > Number(cardContract.maxButtonRadiusSpreadPx || 999)
        )
    ));

    if (narrowStackedContactCards.length > 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'cta_hierarchy',
            message: `A repeated ${cardPatternLabel} makes stacked contact buttons too narrow to read as one clean group.`,
            evidence: `${summarizeCardLabels(narrowStackedContactCards)}; minSecondaryButtonWidthRatio=${Math.min(...narrowStackedContactCards.map((metric) => Number(metric.secondaryMaxButtonWidthRatio || 0))).toFixed(3)}; min=${cardContract.minStackedContactButtonWidthRatio}`,
            likelyCause: 'The shared card action layout is shrinking contact CTAs instead of letting them span the card content width evenly.',
            hardFail: true,
            screenshotPath: screenshotForScanMetric(state, narrowStackedContactCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    if (edgeTouchingCards.length > 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'spacing',
            message: `A repeated ${cardPatternLabel} lets contact buttons touch the card edge across the page.`,
            evidence: `${summarizeCardLabels(edgeTouchingCards)}; minInlinePaddingPx=${Math.min(...edgeTouchingCards.map((metric) => Number(metric.secondaryInlinePaddingPx || 0))).toFixed(2)}; min=${cardContract.minCardInlinePaddingPx}`,
            likelyCause: 'The shared card CTA group is escaping the card padding, so the problem will reappear on every card using this component.',
            hardFail: true,
            screenshotPath: screenshotForScanMetric(state, edgeTouchingCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    if (dominantActionCards.length > 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'cta_hierarchy',
            message: `A repeated ${cardPatternLabel} makes the action group dominate several cards.`,
            evidence: `${summarizeCardLabels(dominantActionCards)}; maxActionGroupHeightRatio=${Math.max(...dominantActionCards.map((metric) => Number(metric.actionGroupHeightRatio || 0))).toFixed(3)}; max=${cardContract.maxActionGroupHeightRatio}`,
            likelyCause: 'The reusable card layout is letting booking and contact controls outweigh the vehicle name, price, and product content.',
            hardFail: true,
            screenshotPath: screenshotForScanMetric(state, dominantActionCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    if (splitContactCards.length > 1 && Boolean(cardContract.requireStackedContactActions)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'cta_hierarchy',
            message: `A repeated ${cardPatternLabel} uses side-by-side contact buttons instead of one clean vertical group.`,
            evidence: `${summarizeCardLabels(splitContactCards)}; requireStackedContactActions=true`,
            likelyCause: 'Call and WhatsApp are being squeezed into a desktop-style row, which becomes harder to scan and tap across varied mobile widths.',
            hardFail: true,
            screenshotPath: screenshotForScanMetric(state, splitContactCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    if (stackedContactCards.length > 1 && Boolean(cardContract.requireSingleRowContactSplit)) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'cta_hierarchy',
            message: `A repeated ${cardPatternLabel} stacks Call and WhatsApp instead of using one split bottom bar.`,
            evidence: `${summarizeCardLabels(stackedContactCards)}; requireSingleRowContactSplit=true`,
            likelyCause: 'The shared card action layout regressed from the approved bottom strip into separate stacked buttons.',
            hardFail: true,
            screenshotPath: screenshotForScanMetric(state, stackedContactCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    if (thinContactStripCards.length > 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'cta_hierarchy',
            message: `A repeated ${cardPatternLabel} makes the split contact bar too thin to feel intentional.`,
            evidence: `${summarizeCardLabels(thinContactStripCards)}; minSecondaryActionHeightRatio=${Math.min(...thinContactStripCards.map((metric) => Number(metric.secondaryActionHeightRatio || 0))).toFixed(3)}; min=${cardContract.minSplitContactStripHeightRatio}`,
            likelyCause: 'Call and WhatsApp are present, but the bottom contact strip reads like a cramped afterthought rather than a useful mobile control.',
            screenshotPath: screenshotForScanMetric(state, thinContactStripCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    if (narrowSplitContactCards.length > 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'spacing',
            message: `A repeated ${cardPatternLabel} leaves side gutters around the split Call and WhatsApp bar.`,
            evidence: `${summarizeCardLabels(narrowSplitContactCards)}; minSplitContactGroupWidthRatio=${Math.min(...narrowSplitContactCards.map((metric) => Number(metric.splitContactGroupWidthRatio || 0))).toFixed(3)}; min=${cardContract.minSplitContactGroupWidthRatio}; maxSideGapPx=${Math.max(...narrowSplitContactCards.map((metric) => Number(metric.splitContactSideGapPx || 0))).toFixed(2)}; max=${cardContract.maxSplitContactSideGapPx}`,
            likelyCause: 'The contact row is still constrained by the card content padding instead of spanning the full bottom edge of the vehicle card.',
            hardFail: true,
            screenshotPath: screenshotForScanMetric(state, narrowSplitContactCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    if (overflowingSplitContactCards.length > 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'spacing',
            message: `A repeated ${cardPatternLabel} lets the split Call and WhatsApp bar overflow outside the card shell.`,
            evidence: `${summarizeCardLabels(overflowingSplitContactCards)}; maxSplitContactOverflowPx=${Math.max(...overflowingSplitContactCards.map((metric) => Number(metric.splitContactOverflowPx || 0))).toFixed(2)}; max=${cardContract.maxSplitContactOverflowPx}`,
            likelyCause: 'The bottom contact row is escaping the card container instead of being clipped by the card radius.',
            hardFail: true,
            screenshotPath: screenshotForScanMetric(state, overflowingSplitContactCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    if (inconsistentButtonShapeCards.length > 1) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'medium',
            category: 'shape_drift',
            message: 'A repeated mobile card pattern mixes pill and square button shapes inside the same action group.',
            evidence: `${summarizeCardLabels(inconsistentButtonShapeCards)}; maxButtonRadiusPx=${Math.max(...inconsistentButtonShapeCards.map((metric) => Number(metric.buttonMaxRadiusPx || 0))).toFixed(2)}; maxRadiusSpreadPx=${Math.max(...inconsistentButtonShapeCards.map((metric) => Number(metric.buttonRadiusSpreadPx || 0))).toFixed(2)}; max=${cardContract.maxButtonRadiusSpreadPx}`,
            likelyCause: 'The primary and contact actions do not share a coherent mobile button system, making the card feel patched together.',
            screenshotPath: screenshotForScanMetric(state, inconsistentButtonShapeCards[0], screenshotPath),
            source: 'page_depth_scan'
        }));
    }

    for (const metric of cardMetrics) {
        const metricScreenshotPath = screenshotForScanMetric(state, metric, screenshotPath);
        const labelEvidence = `card="${metric.label}"`;

        const isVehicleActionCard = metric.isVehicleActionCard !== false;

        if (isVehicleActionCard && Number(metric.secondaryCount || 0) > Number(cardContract.maxSecondaryContactActions || 2)) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'medium',
                category: 'cta_hierarchy',
                message: 'A mobile card exposes too many visible secondary contact actions.',
                evidence: `${labelEvidence}; secondaryCount=${metric.secondaryCount}; max=${cardContract.maxSecondaryContactActions}`,
                likelyCause: 'The card is asking for too many immediate contact decisions before the guest has focused on the car and price.',
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (isVehicleActionCard && Number(metric.actionGroupHeightRatio || 0) > Number(cardContract.maxActionGroupHeightRatio || 1)) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'cta_hierarchy',
                message: 'A mobile card action group visually dominates the card content.',
                evidence: `${labelEvidence}; actionGroupHeightRatio=${metric.actionGroupHeightRatio}; max=${cardContract.maxActionGroupHeightRatio}`,
                likelyCause: 'Reserve, call, or WhatsApp controls are taking more vertical weight than the vehicle name, price, and booking intent.',
                hardFail: true,
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            isVehicleActionCard &&
            (
                Number(metric.secondaryActionHeightRatio || 0) > Number(cardContract.maxSecondaryActionHeightRatio || 1) ||
                Number(metric.secondaryDominanceRatio || 0) > Number(cardContract.maxSecondaryDominanceRatio || 99)
            )
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'cta_hierarchy',
                message: 'Mobile contact actions are overpowering the vehicle title and price hierarchy.',
                evidence: `${labelEvidence}; secondaryActionHeightRatio=${metric.secondaryActionHeightRatio}; max=${cardContract.maxSecondaryActionHeightRatio}; secondaryDominanceRatio=${metric.secondaryDominanceRatio}; maxDominance=${cardContract.maxSecondaryDominanceRatio}`,
                likelyCause: 'Call and WhatsApp buttons are too visually heavy compared with the information the guest needs before contacting.',
                hardFail: true,
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            isVehicleActionCard &&
            Number(metric.secondaryRowCount || 0) > 1 &&
            Number(metric.secondaryCount || 0) >= 2 &&
            Number(metric.secondaryMaxButtonWidthRatio || 0) < Number(cardContract.minStackedContactButtonWidthRatio || 0)
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'cta_hierarchy',
                message: 'Stacked mobile contact buttons are too narrow to read as one clean vertical group.',
                evidence: `${labelEvidence}; secondaryRowCount=${metric.secondaryRowCount}; secondaryMaxButtonWidthRatio=${metric.secondaryMaxButtonWidthRatio}; min=${cardContract.minStackedContactButtonWidthRatio}`,
                likelyCause: 'The secondary contact group is being squeezed instead of spanning the available card content width evenly.',
                hardFail: true,
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            isVehicleActionCard &&
            Boolean(cardContract.requireStackedContactActions) &&
            Number(metric.secondaryCount || 0) >= 2 &&
            Number(metric.secondaryRowCount || 0) === 1
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'cta_hierarchy',
                message: 'Call and WhatsApp are side-by-side instead of stacked into one clean mobile contact group.',
                evidence: `${labelEvidence}; secondaryRowCount=${metric.secondaryRowCount}; requireStackedContactActions=true`,
                likelyCause: 'The mobile card contact actions are still using a desktop-style split row, which is fragile on narrow phones.',
                hardFail: true,
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            isVehicleActionCard &&
            Boolean(cardContract.requireSingleRowContactSplit) &&
            Number(metric.secondaryCount || 0) >= 2 &&
            Number(metric.secondaryRowCount || 0) > 1
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'cta_hierarchy',
                message: 'Call and WhatsApp are stacked instead of forming one split bottom bar.',
                evidence: `${labelEvidence}; secondaryRowCount=${metric.secondaryRowCount}; requireSingleRowContactSplit=true`,
                likelyCause: 'The mobile card contact actions should occupy the full lower edge as one control split into Call and WhatsApp halves.',
                hardFail: true,
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            isVehicleActionCard &&
            Boolean(cardContract.requireSingleRowContactSplit) &&
            isSingleRowSplitContact(metric) &&
            Number(metric.secondaryActionHeightRatio || 0) < Number(cardContract.minSplitContactStripHeightRatio || 0)
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'medium',
                category: 'cta_hierarchy',
                message: 'The split mobile contact bar is too thin to feel intentional.',
                evidence: `${labelEvidence}; secondaryActionHeightRatio=${metric.secondaryActionHeightRatio}; min=${cardContract.minSplitContactStripHeightRatio}`,
                likelyCause: 'The contact strip does not have enough visual/tap weight relative to the card.',
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            Boolean(cardContract.requireSingleRowContactSplit) &&
            isSingleRowSplitContact(metric) &&
            (
                Number(metric.splitContactGroupWidthRatio || 0) < Number(cardContract.minSplitContactGroupWidthRatio || 0) ||
                Number(metric.splitContactSideGapPx || 0) > Number(cardContract.maxSplitContactSideGapPx || 0)
            )
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'spacing',
                message: `The split Call and WhatsApp bar does not occupy the full ${cardWidthLabel}.`,
                evidence: `${labelEvidence}; splitContactGroupWidthRatio=${metric.splitContactGroupWidthRatio}; min=${cardContract.minSplitContactGroupWidthRatio}; splitContactSideGapPx=${metric.splitContactSideGapPx}; max=${cardContract.maxSplitContactSideGapPx}`,
                likelyCause: 'The bottom contact row is still inside the card content padding instead of running edge-to-edge across the card.',
                hardFail: true,
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            Boolean(cardContract.requireSingleRowContactSplit) &&
            isSingleRowSplitContact(metric) &&
            Number(metric.splitContactOverflowPx || 0) > Number(cardContract.maxSplitContactOverflowPx || 0)
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'spacing',
                message: 'The split Call and WhatsApp bar overflows outside the mobile card shell.',
                evidence: `${labelEvidence}; splitContactOverflowPx=${metric.splitContactOverflowPx}; max=${cardContract.maxSplitContactOverflowPx}`,
                likelyCause: 'A full-bleed contact row is wider than the card, so it visually detaches from the vehicle card and can lose the bottom radius.',
                hardFail: true,
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            Number(metric.secondaryCount || 0) > 0 &&
            !isSingleRowSplitContact(metric) &&
            Number(metric.secondaryInlinePaddingPx || 0) < Number(cardContract.minCardInlinePaddingPx || 0)
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'spacing',
                message: 'Mobile card contact buttons touch the card edge without enough inner padding.',
                evidence: `${labelEvidence}; secondaryInlinePaddingPx=${metric.secondaryInlinePaddingPx}; min=${cardContract.minCardInlinePaddingPx}`,
                likelyCause: 'The contact row is escaping the card padding, making the CTA block feel detached from the vehicle card.',
                hardFail: true,
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            isVehicleActionCard &&
            Number(metric.primaryCount || 0) > 0 &&
            Number(metric.secondaryCount || 0) > 0 &&
            Number(metric.buttonRadiusSpreadPx || 0) > Number(cardContract.maxButtonRadiusSpreadPx || 999)
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'medium',
                category: 'shape_drift',
                message: 'The mobile card mixes inconsistent button shapes in one action group.',
                evidence: `${labelEvidence}; buttonRadiusSpreadPx=${metric.buttonRadiusSpreadPx}; max=${cardContract.maxButtonRadiusSpreadPx}`,
                likelyCause: 'The reserve and contact actions are using different shape systems, so the button area feels visually patched.',
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (
            Number(metric.primaryMaxHeight || 0) > 0 &&
            (
                Number(metric.primaryMaxHeight || 0) < Number(cardContract.minPrimaryActionHeightPx || 0) ||
                Number(metric.primaryMaxHeight || 0) > Number(cardContract.maxPrimaryActionHeightPx || 999)
            )
        ) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'medium',
                category: 'cta_hierarchy',
                message: 'The mobile card primary action is outside the expected useful height range.',
                evidence: `${labelEvidence}; primaryMaxHeight=${metric.primaryMaxHeight}; min=${cardContract.minPrimaryActionHeightPx}; max=${cardContract.maxPrimaryActionHeightPx}`,
                likelyCause: 'The primary booking action is either too small to tap or too large for the card rhythm.',
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }

        if (Number(metric.secondaryMaxHeight || 0) > Number(cardContract.maxSecondaryActionHeightPx || 999)) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'medium',
                category: 'cta_hierarchy',
                message: 'A mobile card secondary contact button is taller than the allowed supporting action height.',
                evidence: `${labelEvidence}; secondaryMaxHeight=${metric.secondaryMaxHeight}; max=${cardContract.maxSecondaryActionHeightPx}`,
                likelyCause: 'Secondary contact CTAs are being styled as primary page buttons instead of supporting card actions.',
                screenshotPath: metricScreenshotPath,
                source: 'page_depth_scan'
            }));
        }
    }

    return findings;
}

async function collectVisualMetrics(page, profile) {
    const profileSelectors = PROFILE_SELECTORS[profile] || PROFILE_SELECTORS.hub_marketing;

    return page.evaluate(({ profileName, selectors, auditRules }) => {
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

        function normalizeText(value) {
            return String(value || '')
                .replace(/\s+/g, ' ')
                .trim();
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

        function contrastRatio(foregroundChannels, backgroundChannels) {
            if (!foregroundChannels || !backgroundChannels) {
                return 0;
            }

            const foreground = relativeLuminance(foregroundChannels);
            const background = relativeLuminance(backgroundChannels);
            const lighter = Math.max(foreground, background);
            const darker = Math.min(foreground, background);
            return (lighter + 0.05) / (darker + 0.05);
        }

        function parseColorParts(value) {
            const match = String(value || '').match(/rgba?\(([^)]+)\)/i);

            if (!match) {
                return null;
            }

            const parts = match[1]
                .split(',')
                .map((part) => Number.parseFloat(part.trim()));

            if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) {
                return null;
            }

            return {
                channels: parts.slice(0, 3),
                alpha: Number.isFinite(parts[3]) ? parts[3] : 1
            };
        }

        function blendChannels(foregroundChannels, alpha, backgroundChannels) {
            if (!foregroundChannels || !backgroundChannels) {
                return foregroundChannels || backgroundChannels || null;
            }

            const boundedAlpha = Math.max(0, Math.min(1, Number(alpha)));
            return foregroundChannels.map((channel, index) => (
                (channel * boundedAlpha) + (backgroundChannels[index] * (1 - boundedAlpha))
            ));
        }

        function effectiveForegroundChannels(value, backgroundChannels) {
            const color = parseColorParts(value);

            if (!color?.channels) {
                return null;
            }

            return color.alpha < 0.995
                ? blendChannels(color.channels, color.alpha, backgroundChannels)
                : color.channels;
        }

        function parseBackgroundImageChannels(value) {
            const matches = Array.from(String(value || '').matchAll(/rgba?\(([^)]+)\)/ig));

            if (matches.length === 0) {
                return null;
            }

            const totals = [0, 0, 0];
            let totalWeight = 0;

            for (const match of matches) {
                const parts = match[1]
                    .split(',')
                    .map((part) => Number.parseFloat(part.trim()));

                if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) {
                    continue;
                }

                const alpha = Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1;

                if (alpha <= 0.04) {
                    continue;
                }

                const weight = Math.max(alpha, 0.12);
                totals[0] += parts[0] * weight;
                totals[1] += parts[1] * weight;
                totals[2] += parts[2] * weight;
                totalWeight += weight;
            }

            return totalWeight > 0
                ? totals.map((total) => total / totalWeight)
                : null;
        }

        function effectiveBackgroundChannels(element) {
            let current = element instanceof HTMLElement ? element : null;

            while (current) {
                const style = window.getComputedStyle(current);
                const colorParts = parseColorParts(style.backgroundColor);

                if (colorParts && colorParts.alpha > 0.92) {
                    return colorParts.channels;
                }

                if (colorParts && colorParts.alpha > 0.08) {
                    const parentChannels = effectiveBackgroundChannels(current.parentElement);
                    return blendChannels(colorParts.channels, colorParts.alpha, parentChannels);
                }

                const backgroundImage = String(style.backgroundImage || '').toLowerCase();
                if (backgroundImage && backgroundImage !== 'none') {
                    const gradientChannels = parseBackgroundImageChannels(backgroundImage);

                    if (gradientChannels) {
                        return gradientChannels;
                    }

                    if (current.matches('.fleet-sidebar__topbar .fleet-sidebar__select, .fleet-sidebar__topbar .fleet-filter-reset')) {
                        return [36, 27, 20];
                    }

                    if (current.matches('.fleet-date-prompt, .fleet-card, .fleet-card__booking, .fleet-browser__empty, .fleet-page-main, .fleet-browser, .fleet-browser__shell, .fleet-results, .reserve-page-panel, .schedule-card, .delivery-card, .reservation-summary, .step2-main, .step2-side, .contact-hero, .contact-band, .contact-form-card, .contact-trust-list li, .contact-methods-grid .info-card, .vehicle-page--mother-base, .vehicle-main--mother-base, .vehicle-page--mother-base .vehicle-booking, .vehicle-page--mother-base .model-card, .vehicle-page--mother-base .vehicle-metric, .vehicle-page--mother-base .vehicle-pdp-summary-support, .service-detail-page-main, .service-detail-hero__copy, .service-detail-hero__panel, .service-detail-card, .service-detail-trust__item, .service-detail-faq__item, .service-detail-cta, .service-detail-related__card')) {
                        return [255, 250, 243];
                    }

                    if (current.matches('.fleet-sidebar')) {
                        return [230, 212, 186];
                    }
                }

                if (
                    current.matches('.service-scene, .service-scene__content, .fleet-editorial__panel--video, .fleet-editorial__panel--photo, .fleet-editorial__panel--detail, .fleet-editorial__panel-copy, .fleet-visual-card__media, .vehicle-pdp-gallery-card') &&
                    (current.querySelector('img, picture, video, .service-scene__shade, .fleet-visual-card__shade') || current.closest('.service-scene, .fleet-editorial__panel--video, .fleet-editorial__panel--photo, .fleet-editorial__panel--detail, .fleet-visual-card__media'))
                ) {
                    return [22, 22, 22];
                }

                current = current.parentElement;
            }

            return parseColorChannels(styleValue(document.body, 'backgroundColor')) || [255, 255, 255];
        }

        function fontWeightNumber(style) {
            const rawWeight = String(style?.fontWeight || '').toLowerCase();

            if (rawWeight === 'bold') {
                return 700;
            }

            const parsed = Number.parseInt(rawWeight, 10);
            return Number.isFinite(parsed) ? parsed : 400;
        }

        function isLargeReadableText(style) {
            const fontSize = parsePx(style?.fontSize);
            const fontWeight = fontWeightNumber(style);
            return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 600);
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
                .filter((element) => element instanceof HTMLElement && isVisible(element));
        }

        function navLabelSignature(labels) {
            return (labels || []).map((label) => normalizeText(label)).filter(Boolean).join('|');
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

        function inferHeaderVariant(headerElement, hasMegaNav, utilityCount) {
            if (!(headerElement instanceof HTMLElement)) {
                return document.querySelector('.site-header')
                    ? 'site_header'
                    : document.querySelector('header')
                        ? 'generic_header'
                        : 'none';
            }

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

        function metricsRatio(element, dimension, divisor) {
            if (!(element instanceof HTMLElement) || !divisor) {
                return 0;
            }

            const rect = element.getBoundingClientRect();
            const value = typeof rect[dimension] === 'number' ? rect[dimension] : 0;
            return Number((value / divisor).toFixed(4));
        }

        function collectHeadingLineMetrics(element) {
            if (!(element instanceof HTMLElement) || !isVisible(element)) {
                return null;
            }

            const style = window.getComputedStyle(element);
            const range = document.createRange();
            range.selectNodeContents(element);

            const rawRects = Array.from(range.getClientRects())
                .map((rect) => ({
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                }))
                .filter((rect) => rect.width >= 4 && rect.height >= 4);
            range.detach();

            const sourceRects = rawRects.length > 0
                ? rawRects
                : [element.getBoundingClientRect()];
            const groupedLines = [];

            sourceRects
                .sort((left, right) => left.top - right.top || left.left - right.left)
                .forEach((rect) => {
                    const existing = groupedLines.find((line) => Math.abs(line.top - rect.top) <= 3);

                    if (existing) {
                        existing.top = Math.min(existing.top, rect.top);
                        existing.right = Math.max(existing.right, rect.right);
                        existing.bottom = Math.max(existing.bottom, rect.bottom);
                        existing.left = Math.min(existing.left, rect.left);
                        existing.width = existing.right - existing.left;
                        existing.height = existing.bottom - existing.top;
                        return;
                    }

                    groupedLines.push({ ...rect });
                });

            const lineRects = groupedLines
                .map((rect) => ({
                    top: Number(rect.top.toFixed(2)),
                    right: Number(rect.right.toFixed(2)),
                    bottom: Number(rect.bottom.toFixed(2)),
                    left: Number(rect.left.toFixed(2)),
                    width: Number(rect.width.toFixed(2)),
                    height: Number(rect.height.toFixed(2))
                }))
                .filter((rect) => rect.width >= 4 && rect.height >= 4);
            const lineWidthRatios = lineRects.map((rect) => rect.width / Math.max(1, viewportWidth));
            const lineCenterOffsetRatios = lineRects.map((rect) => (
                Math.abs(((rect.left + rect.right) / 2) - (viewportWidth / 2)) / Math.max(1, viewportWidth)
            ));
            const headingRect = element.getBoundingClientRect();
            const text = normalizeText(element.innerText || element.textContent || '');
            const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

            return {
                text: text.slice(0, 90),
                wordCount,
                textAlign: String(style.textAlign || '').toLowerCase(),
                fontSizePx: Number(parsePx(style.fontSize).toFixed(2)),
                lineCount: lineRects.length,
                lineRects,
                lineWidthRatios: lineWidthRatios.map((value) => Number(value.toFixed(3))),
                minLineWidthRatio: lineWidthRatios.length ? Number(Math.min(...lineWidthRatios).toFixed(3)) : 0,
                maxLineWidthRatio: lineWidthRatios.length ? Number(Math.max(...lineWidthRatios).toFixed(3)) : 0,
                lineWidthSpreadRatio: lineWidthRatios.length ? Number((Math.max(...lineWidthRatios) - Math.min(...lineWidthRatios)).toFixed(3)) : 0,
                maxLineCenterOffsetRatio: lineCenterOffsetRatios.length ? Number(Math.max(...lineCenterOffsetRatios).toFixed(3)) : 0,
                blockCenterOffsetRatio: Number((Math.abs((headingRect.left + (headingRect.width / 2)) - (viewportWidth / 2)) / Math.max(1, viewportWidth)).toFixed(3))
            };
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

        function collectTextContrastIssues() {
            const minTextContrastRatio = Number(auditRules?.minTextContrastRatio || 4.5);
            const minLargeTextContrastRatio = Number(auditRules?.minLargeTextContrastRatio || 3);
            const textSelectors = [
                'main h1',
                'main h2',
                'main h3',
                'main p',
                'main li',
                'main label',
                'main small',
                'main strong',
                'main dt',
                'main dd',
                'main summary',
                'main button',
                'main a.btn',
                'main input:not([type="hidden"])',
                'main select',
                'main textarea',
                '.vehicle-booking span',
                '.reserve-page-panel span',
                '.summary-section span'
            ];
            const seen = new Set();
            const issues = [];

            for (const selector of textSelectors) {
                for (const element of Array.from(document.querySelectorAll(selector))) {
                    if (!(element instanceof HTMLElement) || seen.has(element) || !isVisible(element)) {
                        continue;
                    }

                    seen.add(element);

                    if (element.closest('[aria-hidden="true"], .lab-nav__panel, header, nav, svg')) {
                        continue;
                    }

                    const rect = element.getBoundingClientRect();

                    const visibleIntersectionHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
                    const visibleIntersectionWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));

                    if (
                        visibleIntersectionHeight < 8 ||
                        visibleIntersectionWidth < 8 ||
                        rect.width < 24 ||
                        rect.height < 8
                    ) {
                        continue;
                    }

                    const text = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
                        ? (element.value || element.placeholder || '')
                        : element instanceof HTMLSelectElement
                            ? (element.selectedOptions[0]?.textContent || element.value || '')
                            : (element.innerText || element.textContent || '');
                    const normalizedText = normalizeText(text);

                    if (normalizedText.length < 2) {
                        continue;
                    }

                    const style = window.getComputedStyle(element);
                    const backgroundChannels = effectiveBackgroundChannels(element);
                    const foregroundChannels = effectiveForegroundChannels(style.color, backgroundChannels);
                    const ratio = contrastRatio(foregroundChannels, backgroundChannels);
                    const baseThreshold = isLargeReadableText(style) ? minLargeTextContrastRatio : minTextContrastRatio;
                    const color = parseColorParts(style.color);
                    const washedOutAlphaText = relativeLuminance(backgroundChannels) > 0.78 &&
                        Number(color?.alpha || 1) < 0.86 &&
                        normalizedText.length >= 16;
                    const threshold = washedOutAlphaText
                        ? Math.max(baseThreshold, 6.4)
                        : baseThreshold;

                    if (ratio > 0 && ratio < threshold) {
                        issues.push({
                            selectorLabel: buildLabel(element),
                            text: normalizedText.slice(0, 70),
                            contrastRatio: Number(ratio.toFixed(2)),
                            requiredRatio: threshold,
                            color: style.color,
                            background: window.getComputedStyle(element).backgroundColor,
                            effectiveBackground: `rgb(${backgroundChannels.map((channel) => Math.round(channel)).join(', ')})`,
                            rect: rectData(element)
                        });
                    }
                }
            }

            return issues
                .sort((left, right) => left.contrastRatio - right.contrastRatio)
                .slice(0, 16);
        }

        function collectHeaderTextContrastIssues(headerElement) {
            if (!(headerElement instanceof HTMLElement)) {
                return [];
            }

            const minTextContrastRatio = Number(auditRules?.minTextContrastRatio || 4.5);
            const minLargeTextContrastRatio = Number(auditRules?.minLargeTextContrastRatio || 3);
            const selectors = [
                '.lab-brand__copy strong',
                '.lab-brand__copy span',
                '.lab-nav > a',
                '.lab-nav__trigger',
                '.lab-header__utility-link',
                '.lab-reserve'
            ];
            const seen = new Set();
            const issues = [];

            for (const selector of selectors) {
                for (const element of Array.from(headerElement.querySelectorAll(selector))) {
                    if (!(element instanceof HTMLElement) || seen.has(element) || !isVisible(element)) {
                        continue;
                    }

                    seen.add(element);

                    const label = normalizeText(
                        element.innerText ||
                        element.getAttribute('aria-label') ||
                        element.textContent ||
                        ''
                    );

                    if (label.length < 2 && !element.querySelector('svg')) {
                        continue;
                    }

                    const style = window.getComputedStyle(element);
                    const backgroundChannels = effectiveBackgroundChannels(element);
                    const foregroundChannels = effectiveForegroundChannels(style.color, backgroundChannels);
                    const ratio = contrastRatio(foregroundChannels, backgroundChannels);
                    const threshold = isLargeReadableText(style) ? minLargeTextContrastRatio : minTextContrastRatio;

                    if (ratio > 0 && ratio < threshold) {
                        issues.push({
                            selectorLabel: buildLabel(element),
                            text: label.slice(0, 70) || element.getAttribute('aria-label') || element.tagName.toLowerCase(),
                            contrastRatio: Number(ratio.toFixed(2)),
                            requiredRatio: threshold,
                            color: style.color,
                            effectiveBackground: `rgb(${backgroundChannels.map((channel) => Math.round(channel)).join(', ')})`,
                            rect: rectData(element)
                        });
                    }
                }
            }

            return issues
                .sort((left, right) => left.contrastRatio - right.contrastRatio)
                .slice(0, 10);
        }

        function collectTextEncodingIssues() {
            const brokenEncodingPattern = /[\u00c2\u00c3\u00e2\ufffd]/;
            const textSelectors = [
                'main h1',
                'main h2',
                'main h3',
                'main p',
                'main li',
                'main label',
                'main small',
                'main strong',
                'main dt',
                'main dd',
                'main summary',
                'main button',
                'main a[href]',
                'main input:not([type="hidden"])',
                'main select',
                'main textarea',
                'main span',
                '.reserve-mobile-bar a',
                '.reserve-mobile-bar button'
            ];
            const seen = new Set();
            const issues = [];

            for (const selector of textSelectors) {
                for (const element of Array.from(document.querySelectorAll(selector))) {
                    if (!(element instanceof HTMLElement) || seen.has(element) || !isVisible(element)) {
                        continue;
                    }

                    seen.add(element);

                    if (element.closest('[aria-hidden="true"], .lab-nav__panel, header, nav, svg')) {
                        continue;
                    }

                    const rect = element.getBoundingClientRect();
                    const visibleIntersectionHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
                    const visibleIntersectionWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));

                    if (
                        visibleIntersectionHeight < 8 ||
                        visibleIntersectionWidth < 8 ||
                        rect.width < 16 ||
                        rect.height < 8
                    ) {
                        continue;
                    }

                    const text = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
                        ? (element.value || element.placeholder || '')
                        : element instanceof HTMLSelectElement
                            ? (element.selectedOptions[0]?.textContent || element.value || '')
                            : (element.innerText || element.textContent || '');
                    const normalizedText = normalizeText(text);

                    if (normalizedText.length >= 2 && brokenEncodingPattern.test(normalizedText)) {
                        issues.push({
                            selectorLabel: buildLabel(element),
                            text: normalizedText.slice(0, 90),
                            rect: rectData(element)
                        });
                    }
                }
            }

            return issues.slice(0, 20);
        }

        function collectForcedLightTextIssues() {
            const bodyClasses = String(document.body?.className || '');
            const isLightVehiclePage = /\bvehicle-page--(?:mother-base|premium-pilot)\b/.test(bodyClasses);

            if (!isLightVehiclePage) {
                return [];
            }

            const forcedLightPattern = /color\s*:\s*(?:#fff(?:fff)?\b|white\b|rgba?\(\s*255\s*,\s*255\s*,\s*255)/i;
            const allowedDarkSurfaceSelector = [
                '.vehicle-hero__copy',
                '.vehicle-pdp-gallery-top__thumb-copy',
                '.vehicle-pdp-gallery-card--story-main',
                '.vehicle-pdp-gallery-card__media',
                '.vehicle-pdp-film',
                '.lab-header',
                '.lab-mobile-drawer',
                '.lab-nav__panel'
            ].join(',');
            const issues = [];

            for (const element of Array.from(document.querySelectorAll('main [style]'))) {
                if (!(element instanceof HTMLElement) || !isVisible(element)) {
                    continue;
                }

                const styleAttribute = element.getAttribute('style') || '';

                if (!forcedLightPattern.test(styleAttribute)) {
                    continue;
                }

                if (element.closest(allowedDarkSurfaceSelector)) {
                    continue;
                }

                issues.push({
                    selectorLabel: buildLabel(element),
                    text: normalizeText(element.innerText || element.textContent || '').slice(0, 90),
                    style: styleAttribute,
                    rect: rectData(element)
                });
            }

            return issues.slice(0, 20);
        }

        function collectInternalGapIssues() {
            const maxGapRatio = Number(auditRules?.maxInternalPanelGapRatio || 0.28);
            const maxGapPx = Number(auditRules?.maxInternalPanelGapPx || 160);
            const containers = selectorElements([
                '#step1.step-content.active .step2-layout',
                '#step1.step-content.active .step2-main',
                '#step1.step-content.active .step2-side',
                '#step1 .step2-layout',
                '#step1 .step2-main',
                '#step1 .step2-side',
                '.step2-layout',
                '.step2-main',
                '.step2-side',
                '.reserve-page-panel',
                '.summary-section',
                '.vehicle-booking',
                '.contact-form-card',
                '.services-hero__feature',
                '.locations-hero__summary',
                '.locations-map-card'
            ], 28);
            const seen = new Set();
            const issues = [];

            for (const container of containers) {
                if (!(container instanceof HTMLElement) || seen.has(container) || !isVisible(container)) {
                    continue;
                }

                seen.add(container);

                const containerRect = container.getBoundingClientRect();

                if (
                    containerRect.top > viewportHeight ||
                    containerRect.bottom < 0 ||
                    containerRect.width < 180 ||
                    containerRect.height < 160
                ) {
                    continue;
                }

                const childRects = Array.from(container.children)
                    .filter((child) => child instanceof HTMLElement && isVisible(child))
                    .filter((child) => {
                        const style = window.getComputedStyle(child);
                        return !/(absolute|fixed)/.test(style.position);
                    })
                    .map((child) => child.getBoundingClientRect())
                    .filter((rect) => rect.width > 8 && rect.height > 4)
                    .filter((rect) => rect.bottom > containerRect.top && rect.top < containerRect.bottom)
                    .sort((left, right) => left.top - right.top);

                if (childRects.length === 0) {
                    continue;
                }

                const contentTop = Math.min(...childRects.map((rect) => rect.top));
                const contentBottom = Math.max(...childRects.map((rect) => rect.bottom));
                const trailingGapPx = Math.max(0, containerRect.bottom - contentBottom);
                const leadingGapPx = Math.max(0, contentTop - containerRect.top);
                let largestBetweenGapPx = 0;

                for (let index = 1; index < childRects.length; index += 1) {
                    largestBetweenGapPx = Math.max(largestBetweenGapPx, childRects[index].top - childRects[index - 1].bottom);
                }

                const largestGapPx = Math.max(trailingGapPx, largestBetweenGapPx);
                const largestGapRatio = largestGapPx / Math.max(1, containerRect.height);

                if (largestGapPx >= maxGapPx && largestGapRatio >= maxGapRatio) {
                    issues.push({
                        selectorLabel: buildLabel(container),
                        largestGapPx: Number(largestGapPx.toFixed(2)),
                        largestGapRatio: Number(largestGapRatio.toFixed(3)),
                        trailingGapPx: Number(trailingGapPx.toFixed(2)),
                        leadingGapPx: Number(leadingGapPx.toFixed(2)),
                        childCount: childRects.length,
                        rect: rectData(container)
                    });
                }
            }

            return issues
                .sort((left, right) => right.largestGapPx - left.largestGapPx)
                .slice(0, 10);
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
        const textContrastIssues = collectTextContrastIssues();
        const textEncodingIssues = collectTextEncodingIssues();
        const forcedLightTextIssues = collectForcedLightTextIssues();
        const internalGapIssues = collectInternalGapIssues();
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
        const contactFormCard = firstVisible(['.contact-form-card', '.lookup-card']);
        const contactHeroShell = firstVisible(['.contact-hero__shell']);
        const contactHeroAction = firstVisible(['.contact-hero__actions a', '.contact-hero__actions button', '.lookup-hero__actions a', '.lookup-hero__actions button']);
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
        const reserveStepPills = firstVisible(['.steps-indicator']);
        const reserveScheduleCard = firstVisible(['#step1.step-content.active .schedule-card', '#step1 .schedule-card', '.schedule-card']);
        const reserveDeliveryCard = firstVisible(['#step1.step-content.active .delivery-card', '#step1 .delivery-card', '.delivery-card']);
        const reserveStartDate = firstVisible(['#startDate']);
        const reservePickupLocation = firstVisible(['#pickupLocation']);
        const vehicleHeroMedia = firstVisible(['.vehicle-hero__media', '.vehicle-pdp-gallery-top__stage']);
        const vehicleHeroSupport = firstVisible(['.vehicle-pdp-hero-support', '.vehicle-booking']);
        const vehicleBooking = firstVisible(['.vehicle-booking']);
        const fleetGrid = firstVisible(['.js-fleet-grid']);
        const fleetFirstRowMetrics = collectFleetFirstRowMetrics();
        const mainNav = firstVisible(['nav[aria-label="Main navigation"]', '.lab-header .lab-nav']);
        const headerBrand = firstVisible(['.lab-brand', '.header-brand']);
        const headerBrandStrong = firstVisible(['.lab-brand__copy strong', '.header-brand strong']);
        const headerBrandSub = firstVisible(['.lab-brand__copy span', '.header-brand span']);
        const headerCrest = firstVisible(['.lab-brand__crest', '.header-brand img', '.site-logo']);
        const headerCrestImage = firstVisible(['.lab-brand__crest img', '.header-brand img', '.site-logo img']);
        const headerUtilityTargets = header
            ? Array.from(header.querySelectorAll('.lab-header__utility-link')).filter((element) => isVisible(element)).slice(0, 8)
            : [];
        const headerPrimaryNavTargets = topLevelNavTargets(mainNav);
        const headerPrimaryNavLabels = headerPrimaryNavTargets.map((element) => primaryText(element)).filter(Boolean);
        const headerPrimaryNavSignature = navLabelSignature(headerPrimaryNavLabels);
        const headerUtilityLabels = headerUtilityTargets.map((element) => primaryText(element)).filter(Boolean);
        const headerUtilitySignature = navLabelSignature(headerUtilityLabels);
        const headerNavRowCount = headerPrimaryNavTargets.length > 0
            ? [...new Set(headerPrimaryNavTargets.map((element) => Math.round(element.getBoundingClientRect().top)))].length
            : 0;
        const headerStyle = header ? window.getComputedStyle(header) : null;
        const headerSurfaceChannels = header ? effectiveBackgroundChannels(header) : null;
        const headerBrandStyle = headerBrand ? window.getComputedStyle(headerBrand) : null;
        const headerPrimaryNavStyle = headerPrimaryNavTargets[0] ? window.getComputedStyle(headerPrimaryNavTargets[0]) : null;
        const headerTextContrastIssues = collectHeaderTextContrastIssues(header);
        const headerBrandStrongLineMetrics = collectHeadingLineMetrics(headerBrandStrong);
        const headerBrandSubLineMetrics = collectHeadingLineMetrics(headerBrandSub);
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
            '.lookup-hero__actions a',
            '.lookup-form button',
            '.lookup-form a',
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
        const hasMegaNav = Boolean(document.querySelector('.lab-nav__panel'));
        const darkBody = bodyBackgroundLuminance > 0 && bodyBackgroundLuminance < 0.22;
        const lightBody = bodyBackgroundLuminance >= 0.72;
        const isMotherBaseVehicle = body.classList.contains('vehicle-page--mother-base');
        const isPremiumPilotVehicle = body.classList.contains('vehicle-page--premium-pilot');
        const uppercaseHeading = String(headingStyle?.textTransform || '').toLowerCase() === 'uppercase';
        const buttonStyleFingerprints = uniqueValues(buttonElements.map((element) => buttonStyleFingerprint(element))).slice(0, 8);
        const headerVariant = inferHeaderVariant(header, hasMegaNav, headerUtilityTargets.length);
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
            headingLineMetrics: collectHeadingLineMetrics(visibleH1[0] || null),
            primaryCtaRect: rectData(primaryCta),
            primaryCtaLabel: primaryText(primaryCta),
            priceRect: rectData(price),
            firstUsefulRect: rectData(firstUseful),
            formRect: rectData(form),
            statusRect: rectData(status),
            headerOcclusionPx: Number(headerOcclusionPx.toFixed(2)),
            clippedElements,
            textContrastIssues,
            textEncodingIssues,
            forcedLightTextIssues,
            internalGapIssues,
            overlaps: overlapDetails(keyElements.slice(0, 12)),
            brokenMedia,
            cardHeightSpread: cardHeights.length ? Number((Math.max(...cardHeights) - Math.min(...cardHeights)).toFixed(2)) : 0,
            visibleCardCount: cardElements.length,
            missingCardPriceCount,
            missingCardPrimaryCount,
            templateFamily,
            headerFamily,
            headerVariant,
            headerSignature: classSignature(header),
            headerRect: rectData(header),
            headerBackground: headerStyle?.backgroundColor || '',
            headerBackgroundImage: headerStyle?.backgroundImage || '',
            headerBoxShadow: headerStyle?.boxShadow || '',
            headerBackdropFilter: headerStyle?.backdropFilter || headerStyle?.webkitBackdropFilter || '',
            headerSurfaceLuminance: Number(relativeLuminance(headerSurfaceChannels).toFixed(4)),
            headerBrandRect: rectData(headerBrand),
            headerBrandStrongRect: rectData(headerBrandStrong),
            headerBrandSubRect: rectData(headerBrandSub),
            headerCrestRect: rectData(headerCrest),
            headerCrestImageRect: rectData(headerCrestImage),
            headerBrandStrongLineMetrics,
            headerBrandSubLineMetrics,
            headerTextContrastIssues,
            headerBrandFontFamily: normalizedFontFamily(headerBrandStyle?.fontFamily || ''),
            headerPrimaryNavFontFamily: normalizedFontFamily(headerPrimaryNavStyle?.fontFamily || ''),
            headerPrimaryNavLabels,
            headerPrimaryNavSignature,
            headerUtilityLabels,
            headerUtilitySignature,
            headerUtilityCount: headerUtilityTargets.length,
            headerNavRowCount,
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
            contactHeroActionRect: rectData(contactHeroAction),
            reserveStep1LayoutRect: rectData(reserveStep1Layout),
            reserveStep1MainRect: rectData(reserveStep1Main),
            reserveStep1SideRect: rectData(reserveStep1Side),
            reserveIntroRect: rectData(reserveIntro),
            reserveIntroCopyRect: rectData(reserveIntroCopy),
            reserveIntroPanelRect: rectData(reserveIntroPanel),
            reservePageHeadingRect: rectData(reservePageHeading),
            reserveStepPillsRect: rectData(reserveStepPills),
            reserveScheduleCardRect: rectData(reserveScheduleCard),
            reserveDeliveryCardRect: rectData(reserveDeliveryCard),
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
        selectors: profileSelectors,
        auditRules: DESIGN_SYSTEM_CONTRACT.global || {}
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
    const cohort = classifyRouteCohort(normalizedRoute);
    const firstViewportContract = getFirstViewportContract({
        route: normalizedRoute,
        cohort,
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

    if (firstViewportContract?.check === 'services_direct_lanes') {
        const selectorBottomRatio = metrics.servicesSelectorRect ? metrics.servicesSelectorRect.bottom / metrics.viewportHeight : 0;
        const selectorWidthRatio = metrics.servicesSelectorRect ? metrics.servicesSelectorRect.width / metrics.viewportWidth : 0;
        const selectorSlotWidth = metrics.servicesSelectorRect && metrics.servicesOrbMetrics?.count
            ? metrics.servicesSelectorRect.width / metrics.servicesOrbMetrics.count
            : 0;
        const orbSlotFillRatio = selectorSlotWidth > 0 && metrics.servicesOrbMetrics
            ? metrics.servicesOrbMetrics.minWidthPx / selectorSlotWidth
            : 0;
        const headingTopRatio = metrics.headingRect ? metrics.headingRect.top / metrics.viewportHeight : 0;
        const headingBottomRatio = metrics.headingRect ? metrics.headingRect.bottom / metrics.viewportHeight : 0;
        const directLaneFailures = [];

        if (!metrics.servicesSelectorRect) {
            directLaneFailures.push('missingServicesDirectLanes');
        } else {
            if (firstViewportContract.selectorBottomRatio && selectorBottomRatio > firstViewportContract.selectorBottomRatio.max) {
                directLaneFailures.push(`selectorBottomRatio=${selectorBottomRatio.toFixed(3)}`);
            }

            if (
                Number.isFinite(firstViewportContract.minSelectorWidthRatio) &&
                selectorWidthRatio < firstViewportContract.minSelectorWidthRatio
            ) {
                directLaneFailures.push(`selectorWidthRatio=${selectorWidthRatio.toFixed(3)}`);
            }

            if (!metrics.servicesOrbMetrics || metrics.servicesOrbMetrics.count < 4) {
                directLaneFailures.push(`orbCount=${metrics.servicesOrbMetrics?.count || 0}`);
            }

            if (
                Number.isFinite(firstViewportContract.minOrbSlotFillRatio) &&
                orbSlotFillRatio < firstViewportContract.minOrbSlotFillRatio
            ) {
                directLaneFailures.push(`orbSlotFillRatio=${orbSlotFillRatio.toFixed(3)}`);
            }

            if (
                Number.isFinite(firstViewportContract.minOrbMediaWidthPx) &&
                (!metrics.servicesOrbMetrics || metrics.servicesOrbMetrics.minWidthPx < firstViewportContract.minOrbMediaWidthPx)
            ) {
                directLaneFailures.push(`orbMinWidthPx=${metrics.servicesOrbMetrics?.minWidthPx?.toFixed(2) || 'missing'}`);
            }
        }

        if (firstViewportContract.requireNoFeaturePanel && metrics.servicesFeatureRect) {
            directLaneFailures.push('legacyServicePreviewPanelVisible');
        }

        if (
            Number.isFinite(firstViewportContract.maxHeadingTopRatio) &&
            metrics.headingRect &&
            headingTopRatio > firstViewportContract.maxHeadingTopRatio
        ) {
            directLaneFailures.push(`headingTopRatio=${headingTopRatio.toFixed(3)}`);
        }

        if (
            Number.isFinite(firstViewportContract.maxHeadingBottomRatio) &&
            metrics.headingRect &&
            headingBottomRatio > firstViewportContract.maxHeadingBottomRatio
        ) {
            directLaneFailures.push(`headingBottomRatio=${headingBottomRatio.toFixed(3)}`);
        }

        if (directLaneFailures.length > 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'first_viewport_layout',
                message: 'The services first viewport no longer presents the four service circles as clean direct links.',
                evidence: directLaneFailures.join('; '),
                likelyCause: 'The direct service lanes are either buried, visually too small, too narrow, or the removed preview panel has returned.',
                screenshotPath
            }));
        } else {
            heroHeadingRuleSatisfiedByComposition = true;
        }
    }

    if (firstViewportContract?.check === 'services_mobile_feature_reveal') {
        const selectorBottomRatio = metrics.servicesSelectorRect ? metrics.servicesSelectorRect.bottom / metrics.viewportHeight : 0;
        const selectorWidthRatio = metrics.servicesSelectorRect ? metrics.servicesSelectorRect.width / metrics.viewportWidth : 0;
        const featureTopRatio = metrics.servicesFeatureRect ? metrics.servicesFeatureRect.top / metrics.viewportHeight : 0;
        const servicesMobileFailures = [];

        if (!metrics.servicesSelectorRect || !metrics.servicesFeatureRect) {
            servicesMobileFailures.push('missingServicesMobileRegions');
        } else {
            if (
                firstViewportContract.selectorBottomRatio &&
                selectorBottomRatio > firstViewportContract.selectorBottomRatio.max
            ) {
                servicesMobileFailures.push(`selectorBottomRatio=${selectorBottomRatio.toFixed(3)}`);
            }

            if (
                firstViewportContract.featureTopRatio &&
                featureTopRatio > firstViewportContract.featureTopRatio.max
            ) {
                servicesMobileFailures.push(`featureTopRatio=${featureTopRatio.toFixed(3)}`);
            }

            if (
                Number.isFinite(firstViewportContract.minSelectorWidthRatio) &&
                selectorWidthRatio < firstViewportContract.minSelectorWidthRatio
            ) {
                servicesMobileFailures.push(`selectorWidthRatio=${selectorWidthRatio.toFixed(3)}`);
            }
        }

        if (
            Number.isFinite(firstViewportContract.maxHeadingTopRatio) &&
            metrics.headingRect &&
            metrics.headingRect.top / metrics.viewportHeight > firstViewportContract.maxHeadingTopRatio
        ) {
            servicesMobileFailures.push(`headingTopRatio=${(metrics.headingRect.top / metrics.viewportHeight).toFixed(3)}`);
        }

        if (
            Number.isFinite(firstViewportContract.maxPrimaryCtaTopRatio) &&
            metrics.primaryCtaRect &&
            metrics.primaryCtaRect.top / metrics.viewportHeight > firstViewportContract.maxPrimaryCtaTopRatio
        ) {
            servicesMobileFailures.push(`primaryCtaTopRatio=${(metrics.primaryCtaRect.top / metrics.viewportHeight).toFixed(3)}`);
        }

        if (servicesMobileFailures.length > 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'first_viewport_layout',
                message: 'The services mobile first viewport no longer reveals both the service selector and an active service panel.',
                evidence: servicesMobileFailures.join('; '),
                likelyCause: 'The mobile services hero is letting the selector, heading, or feature panel consume the whole first screen before the next useful action is visible.',
                screenshotPath
            }));
        } else {
            heroHeadingRuleSatisfiedByComposition = true;
        }
    }

    if (firstViewportContract?.check === 'mobile_useful_first_viewport') {
        const mobileUsefulFailures = [];
        const viewportHeight = Number(metrics.viewportHeight || 0);
        const viewportWidth = Number(metrics.viewportWidth || 0);
        const pushTopFailure = ({ rect, label, maxRatio, required = true }) => {
            if (!Number.isFinite(maxRatio)) {
                return;
            }

            if (!rect) {
                if (required) {
                    mobileUsefulFailures.push(`${label}=missing`);
                }
                return;
            }

            const topRatio = viewportHeight > 0 ? Number(rect.top || 0) / viewportHeight : 0;

            if (topRatio > maxRatio) {
                mobileUsefulFailures.push(`${label}TopRatio=${topRatio.toFixed(3)}>${maxRatio}`);
            }
        };
        const usefulRect = firstViewportContract.usefulRectKey
            ? metrics[firstViewportContract.usefulRectKey]
            : null;
        const ctaRect = firstViewportContract.primaryCtaRectKey
            ? metrics[firstViewportContract.primaryCtaRectKey]
            : metrics.primaryCtaRect;

        pushTopFailure({
            rect: metrics.headingRect,
            label: 'heading',
            maxRatio: firstViewportContract.maxHeadingTopRatio
        });
        pushTopFailure({
            rect: ctaRect,
            label: 'primaryCta',
            maxRatio: firstViewportContract.maxPrimaryCtaTopRatio
        });
        pushTopFailure({
            rect: usefulRect,
            label: firstViewportContract.usefulLabel || firstViewportContract.usefulRectKey || 'usefulContent',
            maxRatio: firstViewportContract.maxUsefulTopRatio,
            required: Boolean(firstViewportContract.usefulRectKey)
        });

        if (
            usefulRect &&
            Number.isFinite(firstViewportContract.maxUsefulBottomRatio) &&
            viewportHeight > 0
        ) {
            const usefulBottomRatio = Number(usefulRect.bottom || 0) / viewportHeight;
            const usefulLabel = firstViewportContract.usefulLabel || firstViewportContract.usefulRectKey || 'usefulContent';

            if (usefulBottomRatio > firstViewportContract.maxUsefulBottomRatio) {
                mobileUsefulFailures.push(`${usefulLabel}BottomRatio=${usefulBottomRatio.toFixed(3)}>${firstViewportContract.maxUsefulBottomRatio}`);
            }
        }

        if (
            ctaRect &&
            Number.isFinite(firstViewportContract.maxPrimaryCtaBottomRatio) &&
            viewportHeight > 0
        ) {
            const ctaBottomRatio = Number(ctaRect.bottom || 0) / viewportHeight;

            if (ctaBottomRatio > firstViewportContract.maxPrimaryCtaBottomRatio) {
                mobileUsefulFailures.push(`primaryCtaBottomRatio=${ctaBottomRatio.toFixed(3)}>${firstViewportContract.maxPrimaryCtaBottomRatio}`);
            }
        }

        if (
            ctaRect &&
            Number.isFinite(firstViewportContract.minPrimaryCtaWidthRatio) &&
            viewportWidth > 0
        ) {
            const ctaWidthRatio = Number(ctaRect.width || 0) / viewportWidth;

            if (ctaWidthRatio < firstViewportContract.minPrimaryCtaWidthRatio) {
                mobileUsefulFailures.push(`primaryCtaWidthRatio=${ctaWidthRatio.toFixed(3)}<${firstViewportContract.minPrimaryCtaWidthRatio}`);
            }
        }

        if (mobileUsefulFailures.length > 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'first_viewport_layout',
                message: 'The mobile first viewport no longer exposes enough useful page intent.',
                evidence: mobileUsefulFailures.join('; '),
                likelyCause: 'The mobile opening composition is pushing the headline, primary action, or next useful content too far down the first screen.',
                screenshotPath
            }));
        } else if (profileConfig.heroLed) {
            heroHeadingRuleSatisfiedByComposition = true;
        }
    }

    if (firstViewportContract?.headingBalance) {
        const headingBalanceFailures = evaluateMobileHeroHeadingBalance(metrics, firstViewportContract);

        if (headingBalanceFailures.length > 0) {
            const lineMetrics = metrics.headingLineMetrics || {};
            const severeHeadingBalance = headingBalanceFailures.some((failure) => (
                /^lineCount=/.test(failure) ||
                /^blockCenterOffsetRatio=/.test(failure) ||
                /^maxLineCenterOffsetRatio=/.test(failure)
            ));

            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: severeHeadingBalance ? 'high' : 'medium',
                category: 'heading_balance',
                selector: 'h1',
                message: 'The mobile hero headline is visually unbalanced across its wrapped lines.',
                evidence: [
                    headingBalanceFailures.join('; '),
                    `text="${lineMetrics.text || ''}"`,
                    `lineWidths=${(lineMetrics.lineWidthRatios || []).join(',')}`,
                    `textAlign=${lineMetrics.textAlign || 'unknown'}`
                ].filter(Boolean).join('; '),
                likelyCause: 'The mobile H1 is wrapping into a stepped left-heavy shape instead of reading as a centered, evenly distributed headline block.',
                screenshotPath
            }));
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

    if (firstViewportContract?.check === 'reserve_mobile_schedule_reveal') {
        const viewportHeight = Number(metrics.viewportHeight || 0);
        const shortViewport = (
            viewportHeight > 0 &&
            Number.isFinite(firstViewportContract.shortViewportHeightPx) &&
            viewportHeight <= firstViewportContract.shortViewportHeightPx
        );
        const deliveryCardTopLimitRatio = shortViewport && Number.isFinite(firstViewportContract.shortMaxDeliveryCardTopRatio)
            ? firstViewportContract.shortMaxDeliveryCardTopRatio
            : firstViewportContract.maxDeliveryCardTopRatio;
        const pickupLocationTopLimitRatio = shortViewport && Number.isFinite(firstViewportContract.shortMaxPickupLocationTopRatio)
            ? firstViewportContract.shortMaxPickupLocationTopRatio
            : firstViewportContract.maxPickupLocationTopRatio;
        const reserveRevealFailures = [];
        const ratio = (rect, edge = 'top') => (
            rect && viewportHeight > 0 && Number.isFinite(Number(rect[edge]))
                ? Number(rect[edge]) / viewportHeight
                : null
        );
        const addRatioFailure = ({ rect, label, edge = 'top', maxRatio }) => {
            if (!Number.isFinite(maxRatio)) {
                return;
            }

            const value = ratio(rect, edge);

            if (value === null) {
                reserveRevealFailures.push(`${label}=missing`);
                return;
            }

            if (value > maxRatio) {
                reserveRevealFailures.push(`${label}${edge[0].toUpperCase()}${edge.slice(1)}Ratio=${value.toFixed(3)}>${maxRatio}`);
            }
        };

        addRatioFailure({
            rect: metrics.reserveIntroRect || metrics.reservePageHeadingRect,
            label: 'reserveIntro',
            edge: 'bottom',
            maxRatio: firstViewportContract.maxIntroBottomRatio
        });
        addRatioFailure({
            rect: metrics.reserveStepPillsRect,
            label: 'stepPills',
            edge: 'bottom',
            maxRatio: firstViewportContract.maxStepPillsBottomRatio
        });
        addRatioFailure({
            rect: metrics.reserveStartDateRect,
            label: 'startDate',
            maxRatio: firstViewportContract.maxStartDateTopRatio
        });
        addRatioFailure({
            rect: metrics.reserveDeliveryCardRect,
            label: 'deliveryCard',
            maxRatio: deliveryCardTopLimitRatio
        });
        addRatioFailure({
            rect: metrics.reservePickupLocationRect,
            label: 'pickupLocation',
            maxRatio: pickupLocationTopLimitRatio
        });

        if (reserveRevealFailures.length > 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'first_viewport_layout',
                message: 'The reserve mobile first viewport does not reveal enough useful scheduling and delivery context.',
                evidence: [
                    ...reserveRevealFailures,
                    `viewportHeight=${metrics.viewportHeight}`,
                    shortViewport ? 'shortViewport=true' : 'shortViewport=false'
                ].join('; '),
                likelyCause: 'The mobile entry stack is spending too much height on intro, step pills, or schedule controls before the delivery address field appears.',
                screenshotPath
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

    for (const issue of metrics.textContrastIssues || []) {
        const severeContrast = Number(issue.contrastRatio || 0) > 0 && Number(issue.contrastRatio) < 2.4;

        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: severeContrast ? 'high' : 'medium',
            category: 'contrast',
            selector: issue.selectorLabel,
            message: 'Visible text does not have enough contrast against its effective background.',
            evidence: `text="${issue.text}"; contrastRatio=${issue.contrastRatio}; requiredRatio=${issue.requiredRatio}; color=${issue.color}; effectiveBackground=${issue.effectiveBackground}`,
            likelyCause: 'The text color is too close to the card or page background, so labels and supporting copy fade out.',
            hardFail: severeContrast,
            screenshotPath
        }));
    }

    for (const issue of metrics.headerTextContrastIssues || []) {
        const severeContrast = Number(issue.contrastRatio || 0) > 0 && Number(issue.contrastRatio) < 3;

        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: severeContrast ? 'high' : 'medium',
            category: 'contrast',
            selector: issue.selectorLabel,
            message: 'Header text or icon contrast is too weak for the active header surface.',
            evidence: `text="${issue.text}"; contrastRatio=${issue.contrastRatio}; requiredRatio=${issue.requiredRatio}; color=${issue.color}; effectiveBackground=${issue.effectiveBackground}`,
            likelyCause: 'The header is mixing a light page surface with pale icon or text colors, making navigation and contact controls look washed out.',
            hardFail: severeContrast,
            screenshotPath
        }));
    }

    if (metrics.usesSharedLabHeader) {
        const headerSurfaceIssues = evaluatePremiumHeaderSurface(metrics, {
            minViewportWidthPx: 900,
            maxSurfaceLuminance: 0.62,
            minSurfaceAlpha: 0.42
        });

        if (headerSurfaceIssues.length > 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'header_consistency',
                message: 'The shared header surface does not provide enough premium contrast.',
                evidence: [
                    headerSurfaceIssues.join('; '),
                    `background=${metrics.headerBackground || 'n/a'}`,
                    `backgroundImage=${String(metrics.headerBackgroundImage || 'none').slice(0, 180)}`
                ].join('; '),
                likelyCause: 'The header is too light or too transparent, so brand, navigation and contact controls look washed out over the page below.',
                hardFail: true,
                screenshotPath
            }));
        }
    }

    if (metrics.usesSharedLabHeader && Number(metrics.viewportWidth || 0) >= 900) {
        const headerPresentationIssues = [];
        const crestWidth = Number(metrics.headerCrestRect?.width || 0);
        const crestImageWidth = Number(metrics.headerCrestImageRect?.width || 0);
        const brandStrongLines = Number(metrics.headerBrandStrongLineMetrics?.lineCount || 0);
        const brandSubLines = Number(metrics.headerBrandSubLineMetrics?.lineCount || 0);
        const brandStrongWidth = Number(metrics.headerBrandStrongRect?.width || 0);

        if (!metrics.headerCrestRect) {
            headerPresentationIssues.push('header crest missing');
        } else if (crestWidth < 48) {
            headerPresentationIssues.push(`headerCrestWidth=${crestWidth}px expected>=48px`);
        }

        if (metrics.headerCrestImageRect && crestImageWidth < 36) {
            headerPresentationIssues.push(`headerCrestImageWidth=${crestImageWidth}px expected>=36px`);
        }

        if (brandStrongLines > 1) {
            headerPresentationIssues.push(`headerBrandStrongLineCount=${brandStrongLines} expected=1`);
        }

        if (brandSubLines > 1) {
            headerPresentationIssues.push(`headerBrandSubLineCount=${brandSubLines} expected<=1`);
        }

        if (brandStrongWidth > 0 && brandStrongWidth < 140) {
            headerPresentationIssues.push(`headerBrandStrongWidth=${brandStrongWidth}px expected>=140px`);
        }

        if (headerPresentationIssues.length > 0) {
            findings.push(createVisualFinding({
                route,
                viewport: viewportName,
                severity: 'high',
                category: 'header_consistency',
                message: 'The shared header brand block is visually cramped or too small on desktop.',
                evidence: headerPresentationIssues.join('; '),
                likelyCause: 'The header is allowing the navigation row to squeeze the logo and brand copy instead of preserving a stable brand lockup.',
                hardFail: true,
                screenshotPath
            }));
        }
    }

    for (const issue of metrics.textEncodingIssues || []) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'text_encoding',
            selector: issue.selectorLabel,
            message: 'Visible customer-facing text contains broken encoding artifacts.',
            evidence: `text="${issue.text}"`,
            likelyCause: 'A UTF-8 symbol was saved or served through the wrong encoding, so the browser renders mojibake instead of readable copy.',
            hardFail: true,
            screenshotPath
        }));
    }

    for (const issue of metrics.forcedLightTextIssues || []) {
        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: 'high',
            category: 'contrast',
            selector: issue.selectorLabel,
            message: 'Light-page copy forces white text through inline styling.',
            evidence: `text="${issue.text}"; style="${issue.style}"`,
            likelyCause: 'Legacy dark-template inline color styles were left inside a modern light vehicle page, so customer copy can become grey or white on white.',
            hardFail: true,
            screenshotPath
        }));
    }

    for (const issue of metrics.internalGapIssues || []) {
        const severeGap = Number(issue.largestGapPx || 0) >= 240;

        findings.push(createVisualFinding({
            route,
            viewport: viewportName,
            severity: severeGap ? 'high' : 'medium',
            category: 'layout_gap',
            selector: issue.selectorLabel,
            message: 'A first-viewport panel contains a large empty internal gap.',
            evidence: `largestGapPx=${issue.largestGapPx}; largestGapRatio=${issue.largestGapRatio}; trailingGapPx=${issue.trailingGapPx}; childCount=${issue.childCount}`,
            likelyCause: 'The panel content is ending too early or one column is shorter than its companion block, creating a visible dead zone.',
            hardFail: severeGap,
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

    const missing = results.find((entry) => entry && entry.status === 'missing');
    if (missing) {
        return missing;
    }

    if (actionableResults.some((entry) => entry.status === 'pass')) {
        return actionableResults.find((entry) => entry.status === 'pass');
    }

    const updated = results.find((entry) => entry && entry.status === 'updated');
    if (updated) {
        return updated;
    }

    return null;
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
        headerVariant: metrics.headerVariant,
        headerPrimaryNavSignature: metrics.headerPrimaryNavSignature,
        headingFontFamily: metrics.headingFontFamily,
        headingLineMetrics: metrics.headingLineMetrics,
        bodyFontFamily: metrics.bodyFontFamily,
        bodyFontSizePx: metrics.bodyFontSizePx,
        bodyLineHeightPx: metrics.bodyLineHeightPx,
        primaryCtaRadiusPx: metrics.primaryCtaRadiusPx,
        inputRadiusPx: metrics.inputRadiusPx,
        cardRadiusPx: metrics.cardRadiusPx,
        headingTopRatio: metrics.headingTopRatio,
        textContrastIssues: (metrics.textContrastIssues || []).slice(0, 5),
        internalGapIssues: (metrics.internalGapIssues || []).slice(0, 5),
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

function resolveVisualRoutes(args = {}) {
    const hasExplicitRoutes = Array.isArray(args.routes) && args.routes.length > 0;
    const baseRoutes = hasExplicitRoutes
        ? args.routes
        : getDefaultVisualRoutes(args.scope || 'landings');
    const fleetClickRoutes = !hasExplicitRoutes && (args.includeFleetClicks ?? true)
        ? getVehicleVisualRoutes()
        : [];

    return uniqueValues([
        ...baseRoutes,
        ...fleetClickRoutes
    ].map((route) => normalizeRoute(route)));
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

function normalizeHeaderSignatureValue(value = '') {
    return String(value || '').trim().toLowerCase();
}

function allowedHeaderVariantsForPage(page, contract = {}) {
    const allowed = Array.isArray(contract.headerVariants)
        ? [...contract.headerVariants]
        : [];
    const viewportWidth = Number(page?.metrics?.viewportWidth || 0);

    if (
        viewportWidth > 0 &&
        viewportWidth < 960 &&
        allowed.includes('lab_mega_utility') &&
        !allowed.includes('lab_mega')
    ) {
        allowed.push('lab_mega');
    }

    return uniqueValues(allowed);
}

function buildContractDesignSystemFindings(page, contract) {
    const findings = [];
    const metrics = page.metrics || {};
    const fontMismatches = collectForbiddenFontMismatches(metrics);
    const surfaceMismatches = [];
    const shapeMismatches = [];
    const buttonMismatches = [];
    const headerMismatches = [];

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

    const allowedHeaderVariants = allowedHeaderVariantsForPage(page, contract);

    if (
        allowedHeaderVariants.length > 0 &&
        metrics.headerVariant &&
        !matchesAllowedTokens(metrics.headerVariant, allowedHeaderVariants)
    ) {
        headerMismatches.push(
            `headerVariant=${metrics.headerVariant} expected=${allowedHeaderVariants.join('|')}`
        );
    }

    if (
        Array.isArray(contract.headerBrandFontFamilies) &&
        contract.headerBrandFontFamilies.length > 0 &&
        metrics.headerBrandFontFamily &&
        !matchesAllowedTokens(metrics.headerBrandFontFamily, contract.headerBrandFontFamilies)
    ) {
        headerMismatches.push(
            `headerBrandFontFamily=${metrics.headerBrandFontFamily} expected=${contract.headerBrandFontFamilies.join('|')}`
        );
    }

    if (
        Array.isArray(contract.headerPrimaryNavSignatures) &&
        contract.headerPrimaryNavSignatures.length > 0 &&
        metrics.headerPrimaryNavSignature &&
        !contract.headerPrimaryNavSignatures.some((entry) => (
            normalizeHeaderSignatureValue(entry) === normalizeHeaderSignatureValue(metrics.headerPrimaryNavSignature)
        ))
    ) {
        headerMismatches.push(
            `headerPrimaryNavSignature=${metrics.headerPrimaryNavSignature} expected=${contract.headerPrimaryNavSignatures.join('|')}`
        );
    }

    if (!metricWithinRanges(metrics.headerNavRowCount, contract.headerNavRowCount)) {
        headerMismatches.push(
            `headerNavRowCount=${metrics.headerNavRowCount} expected=${formatRangeSpec(contract.headerNavRowCount)}`
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

    if (headerMismatches.length > 0) {
        findings.push(createVisualFinding({
            route: page.route,
            viewport: page.viewport,
            severity: headerMismatches.some((entry) => (
                entry.includes('headerVariant=') ||
                entry.includes('headerBrandFontFamily=') ||
                entry.includes('headerPrimaryNavSignature=')
            )) ? 'high' : 'medium',
            category: 'header_consistency',
            message: 'This page breaks the explicit header contract for its page family.',
            evidence: headerMismatches.join('; '),
            likelyCause: 'The route is using a different header variant, brand font, or navigation sequence than the approved family shell.',
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
        `- human review screenshots: ${report.humanReview?.screenshots || 0}/${report.humanReview?.totalFindings || 0}`,
        '',
        '## Cohorts',
        ''
    ];

    for (const [cohort, details] of Object.entries(report.cohorts || {})) {
        lines.push(`- ${cohort}: ${details.pages} pages, good=${details.statuses.good || 0}, review=${details.statuses.review || 0}, bad=${details.statuses.bad || 0}, templates=${details.templateFamilies.join(', ')}`);
    }

    lines.push(
        '',
        '## Human Review Screenshots',
        '',
        `- directory: ${report.humanReview?.directory || 'n/a'}`,
        `- screenshots: ${report.humanReview?.screenshots || 0}`,
        `- missing screenshots: ${report.humanReview?.missingScreenshots || 0}`,
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
                if (finding.humanReviewScreenshotPath) {
                    lines.push(`    - human review screenshot: ${finding.humanReviewScreenshotPath}`);
                }
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
        const mobileNavDrawerState = await collectMobileNavDrawerState(page, pageDir, viewport);
        const pageDepthScanState = await collectPageDepthScanState(page, pageDir, viewport);
        const surfaceMetrics = await collectInteractiveSurfaceMetrics(page, profile, viewport);
        const serviceSelectorStates = route === '/services.html'
            ? await collectServiceSelectorStates(page, pageDir)
            : null;
        const fleetMobileFilterState = route === '/fleet.html'
            ? await collectFleetMobileFilterState(page, pageDir, viewport)
            : null;
        const contactFormState = route === '/contact.html'
            ? await collectContactFormState(page, pageDir)
            : null;
        const reserveBookingIntentState = route === '/app/reserve/page.html'
            ? await collectReserveBookingIntentState(page, pageDir)
            : null;
        const staleBookingDateProbeState = route === '/app/reserve/page.html'
            ? await collectStaleBookingDateProbeState({ context, baseUrl, route, pageDir, viewport })
            : null;
        const interactionChangedPage = Boolean(
            serviceSelectorStates ||
            fleetMobileFilterState ||
            mobileNavDrawerState ||
            contactFormState ||
            reserveBookingIntentState ||
            staleBookingDateProbeState
        );

        if (interactionChangedPage) {
            await page.evaluate(() => {
                try {
                    window.sessionStorage?.removeItem('dynastyBookingIntent');
                    window.localStorage?.removeItem('dynastyBookingIntent');
                } catch (error) {
                    // Storage may be unavailable in hardened browser contexts.
                }
            });
            await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
            await settlePage(page, 500);
        }

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
        findings = findings.concat(buildFleetMobileFilterFindings({
            route,
            viewportName: viewport.name,
            viewportWidth: viewport.width,
            state: fleetMobileFilterState,
            screenshotPath: artifacts.viewportScreenshot
        }));
        findings = findings.concat(buildMobileNavDrawerFindings({
            route,
            viewportName: viewport.name,
            viewportWidth: viewport.width,
            state: mobileNavDrawerState,
            screenshotPath: artifacts.viewportScreenshot
        }));
        findings = findings.concat(buildContactFormStateFindings({
            route,
            viewportName: viewport.name,
            viewportWidth: viewport.width,
            state: contactFormState,
            screenshotPath: artifacts.viewportScreenshot
        }));
        findings = findings.concat(buildReserveBookingIntentFindings({
            route,
            viewportName: viewport.name,
            viewportWidth: viewport.width,
            state: reserveBookingIntentState,
            screenshotPath: artifacts.viewportScreenshot
        }));
        findings = findings.concat(buildPageDepthScanFindings({
            route,
            viewportName: viewport.name,
            viewportWidth: viewport.width,
            state: pageDepthScanState,
            screenshotPath: artifacts.viewportScreenshot
        }));
        const staleBookingDateFindings = buildPageDepthScanFindings({
            route,
            viewportName: viewport.name,
            viewportWidth: viewport.width,
            state: staleBookingDateProbeState?.pageDepthScanState,
            screenshotPath: artifacts.viewportScreenshot,
            auditDateIso: staleBookingDateProbeState?.auditDateIso
        }).filter((finding) => finding.category === 'date_currentness')
            .map((finding) => ({
                ...finding,
                message: finding.message.replace('A booking date control', 'The reserve stale-date probe'),
                evidence: `${finding.evidence}; probeStartDate=${staleBookingDateProbeState?.staleStartDate || 'n/a'}; probeRoute=${staleBookingDateProbeState?.probeRoute || 'n/a'}`,
                likelyCause: 'The reservation page accepts stale query/session dates instead of clamping the customer schedule to today or a future date.'
            }));
        findings = findings.concat(staleBookingDateFindings);

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
            fleetMobileFilterState,
            contactFormState,
            reserveBookingIntentState,
            staleBookingDateProbeState,
            pageDepthScanState,
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

    const selectedRoutes = resolveVisualRoutes(args);
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
        const crossEnrichedPages = applyCrossPageFindings(pages, crossPageFindings);
        const humanReviewArtifacts = buildVisualHumanReviewArtifacts(crossEnrichedPages, runDir);
        const enrichedPages = humanReviewArtifacts.pages;
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
            humanReview: {
                kind: humanReviewArtifacts.manifest.kind,
                directory: humanReviewArtifacts.manifest.directory,
                totalFindings: humanReviewArtifacts.manifest.totalFindings,
                screenshots: humanReviewArtifacts.manifest.screenshots,
                missingScreenshots: humanReviewArtifacts.manifest.missingScreenshots,
                manifestPath: path.join(humanReviewArtifacts.manifest.directory, 'manifest.json')
            },
            cohorts: summarizeCohorts(enrichedPages),
            pages: enrichedPages
        };
        report.auditMemory = compareReportToApprovedMemory(report, { kind: 'visual' });

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

    if (report.auditMemory?.status === 'bad') {
        console.error(`Audit memory regression failed: ${report.auditMemory.message}`);
        for (const regression of report.auditMemory.regressions.slice(0, 10)) {
            console.error(`- ${formatAuditMemoryRegression(regression)}`);
        }
        process.exitCode = 1;
    }
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
    buildContactFormStateFindings,
    buildDesignSystemFindings,
    buildDeterministicFindings,
    buildFleetMobileFilterFindings,
    buildMobileNavDrawerFindings,
    buildPageDepthScanFindings,
    buildReserveBookingIntentFindings,
    buildServiceInteractionFindings,
    buildMarkdownReport,
    buildProfileReferenceFindings,
    buildSurfaceFindings,
    buildTemplateFamilyFindings,
    comparePngFiles,
    mergeBaselineResults,
    parseArgs,
    resolveVisualRoutes,
    routeFileStem,
    summarizeCohorts,
    runVisualAgent
};
