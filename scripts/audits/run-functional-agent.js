const fs = require('fs');
const net = require('net');
const path = require('path');

const { chromium, expect } = require('@playwright/test');

const {
    PUBLIC_PAGE_FILE_MAP
} = require(path.join(__dirname, '..', '..', 'server', 'shared', 'public-page-map.js'));
const {
    startStaticServer,
    stopProcess
} = require(path.join(__dirname, '..', '..', 'server', 'shared', 'site-audit-utils.js'));
const {
    getViewportCoverageMatrix
} = require(path.join(__dirname, '..', '..', 'server', 'design-system', 'design-system-contract.js'));
const {
    buildCustomerJourneyCoverage,
    buildCustomerJourneyMarkdownSection
} = require(path.join(__dirname, '..', '..', 'server', 'audits', 'customer-journey-contract.js'));
const {
    buildFunctionalHumanReview,
    buildFunctionalReviewMarkdownSection
} = require(path.join(__dirname, '..', '..', 'server', 'audits', 'functional-audit-core.js'));
const {
    createConsoleTracker,
    normalizeConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require(path.join(__dirname, '..', '..', 'tests', 'e2e', 'support', 'site-helpers.js'));
const {
    contactLead,
    reservationGuest
} = require(path.join(__dirname, '..', '..', 'test-data', 'users.json'));
const {
    compareReportToApprovedMemory,
    formatAuditMemoryRegression
} = require(path.join(__dirname, '..', '..', 'server', 'audits', 'audit-memory-core.js'));

const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'functional-agent');
const VIEWPORTS = Object.freeze(getViewportCoverageMatrix('functional'));
const DEFAULT_ACTION_LIMITS = Object.freeze({
    maxLinksPerPage: 8,
    maxButtonsPerPage: 6,
    maxGenericButtonsPerPage: 8,
    maxSummariesPerPage: 4,
    maxSelectsPerPage: 4,
    maxOptionsPerSelect: 8
});
const DEEP_ACTION_LIMITS = Object.freeze({
    maxLinksPerPage: Number.MAX_SAFE_INTEGER,
    maxButtonsPerPage: Number.MAX_SAFE_INTEGER,
    maxGenericButtonsPerPage: Number.MAX_SAFE_INTEGER,
    maxSummariesPerPage: Number.MAX_SAFE_INTEGER,
    maxSelectsPerPage: Number.MAX_SAFE_INTEGER,
    maxOptionsPerSelect: Number.MAX_SAFE_INTEGER
});
const FLEET_CHECKOUT_SCHEDULE = Object.freeze({
    startDate: '2026-08-24',
    endDate: '2026-08-26',
    pickupTime: '10:00',
    dropoffTime: '18:00'
});
const EXPECTED_CONTACT_PHONE_E164 = '971586122568';
const EXPECTED_CONTACT_TEL_HREF = 'tel:+971586122568';
const EXPECTED_GENERIC_WHATSAPP_MESSAGE = 'Hi, I would like help booking a luxury car in Dubai.';

function normalizeRoute(route) {
    const pathname = String(route || '/').trim().split(/[?#]/)[0] || '/';
    return pathname === '/index.html' ? '/' : pathname;
}

function routeFileStem(route) {
    return normalizeRoute(route)
        .replace(/^\//, '')
        .replace(/[\/.]+/g, '-')
        .replace(/^-+/, '') || 'home';
}

function slugify(value) {
    return String(value || 'action')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72) || 'action';
}

function escapeCssAttribute(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatPriceFragment(price) {
    const numericPrice = Number(String(price || '').replace(/,/g, ''));
    if (!Number.isFinite(numericPrice)) {
        return String(price || '').trim();
    }

    return numericPrice.toLocaleString('en-US', {
        maximumFractionDigits: 0
    });
}

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
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

function buildFunctionalHumanReviewArtifacts(pages, runDir) {
    const reviewDir = path.join(runDir, 'human-review', 'functional-failures');
    const entries = [];
    let index = 0;

    const enrichedPages = pages.map((page) => {
        const actions = (page.actions || []).map((action) => {
            if (action.status !== 'failed') {
                return action;
            }

            index += 1;
            const filename = `${String(index).padStart(3, '0')}-${slugify(page.route)}-${slugify(page.viewport)}-${slugify(action.id || action.label)}${extensionForScreenshot(action.screenshotPath)}`;
            const reviewScreenshotPath = path.join(reviewDir, filename);
            const copied = copyFileIfPresent(action.screenshotPath, reviewScreenshotPath);
            const entry = {
                id: `functional-${String(index).padStart(3, '0')}`,
                route: page.route,
                viewport: page.viewport,
                actionId: action.id,
                label: action.label,
                kind: action.kind,
                message: action.message,
                observedUrl: action.observedUrl || '',
                sourceScreenshotPath: action.screenshotPath || '',
                reviewScreenshotPath: copied ? reviewScreenshotPath : '',
                screenshotMissing: !copied
            };

            entries.push(entry);

            return {
                ...action,
                humanReviewScreenshotPath: entry.reviewScreenshotPath,
                humanReviewId: entry.id
            };
        });

        return {
            ...page,
            actions
        };
    });

    const manifest = {
        generatedAt: new Date().toISOString(),
        kind: 'functional',
        totalFailures: entries.length,
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

function formatError(error) {
    return error && (error.stack || error.message) ? String(error.stack || error.message) : String(error);
}

function summarizeFailures(items) {
    return items.map((item) => `${item.resourceType || 'request'} ${item.status || item.failureText || 'error'} ${item.url}`);
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

function parseArgs(argv) {
    const args = {
        routes: [],
        viewports: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        coverageMode: 'bounded',
        deep: false,
        ...DEFAULT_ACTION_LIMITS
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--route' && argv[index + 1]) {
            args.routes.push(normalizeRoute(argv[index + 1]));
            index += 1;
            continue;
        }

        if (value === '--base-url' && argv[index + 1]) {
            args.baseUrl = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--viewport' && argv[index + 1]) {
            args.viewports.push(String(argv[index + 1]).trim());
            index += 1;
            continue;
        }

        if (value === '--output-dir' && argv[index + 1]) {
            args.outputDir = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--deep' || value === '--exhaustive') {
            args.deep = true;
            args.coverageMode = 'deep';
            Object.assign(args, DEEP_ACTION_LIMITS);
            continue;
        }

        if (value === '--coverage-mode' && argv[index + 1]) {
            args.coverageMode = String(argv[index + 1]).trim() || args.coverageMode;
            args.deep = args.coverageMode === 'deep';
            index += 1;
            continue;
        }

        if (value === '--max-links-per-page' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.maxLinksPerPage = parsed;
            }
            index += 1;
            continue;
        }

        if (value === '--max-buttons-per-page' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.maxButtonsPerPage = parsed;
            }
            index += 1;
            continue;
        }

        if (value === '--max-generic-buttons-per-page' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.maxGenericButtonsPerPage = parsed;
            }
            index += 1;
            continue;
        }

        if (value === '--max-summaries-per-page' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.maxSummariesPerPage = parsed;
            }
            index += 1;
            continue;
        }

        if (value === '--max-selects-per-page' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.maxSelectsPerPage = parsed;
            }
            index += 1;
            continue;
        }

        if (value === '--max-options-per-select' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.maxOptionsPerSelect = parsed;
            }
            index += 1;
        }
    }

    return args;
}

function buildReportSummary(pages, functionalReview = null) {
    const actions = pages.flatMap((page) => page.actions);
    const realSteps = actions.reduce((total, action) => total + Number(action.steps?.length || 0), 0);
    const failedActions = actions.filter((action) => action.status === 'failed');
    const passedActions = actions.filter((action) => action.status === 'passed');
    const skippedActions = actions.filter((action) => action.status === 'skipped');
    const pagesWithFailures = pages.filter((page) => (
        page.consoleErrors.length > 0 ||
        page.requestFailures.length > 0 ||
        page.actions.some((action) => action.status === 'failed')
    ));

    const summary = {
        totalRoutes: new Set(pages.map((page) => page.route)).size,
        totalPageRuns: pages.length,
        totalViewports: new Set(pages.map((page) => page.viewport)).size,
        totalActions: actions.length,
        realSteps,
        passedActions: passedActions.length,
        failedActions: failedActions.length,
        skippedActions: skippedActions.length,
        pagesWithFailures: pagesWithFailures.length
    };

    if (functionalReview) {
        summary.functionalStatus = functionalReview.status;
        summary.functionalFindings = functionalReview.summary.total;
        summary.functionalHardFails = functionalReview.summary.hardFails;
        summary.coverageMode = functionalReview.coverageProfile?.mode || 'unknown';
        summary.truncatedTargets = functionalReview.coverageProfile?.truncatedTargetCount || 0;
    }

    return summary;
}

function normalizeLimit(value) {
    return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function sumDiscoveredStats(stats = {}) {
    return Number(stats.truncatedLinks || 0) +
        Number(stats.truncatedToggleButtons || 0) +
        Number(stats.truncatedGenericButtons || 0) +
        Number(stats.truncatedSummaries || 0) +
        Number(stats.truncatedSelects || 0) +
        Number(stats.truncatedSelectOptions || 0);
}

function buildCoverageProfile({ pages, selectedRoutes, selectedViewports, options }) {
    const publicRoutes = Object.keys(PUBLIC_PAGE_FILE_MAP).map((route) => normalizeRoute(route));
    const checkedRoutes = [...new Set((selectedRoutes || []).map((route) => normalizeRoute(route)))];
    const checkedViewports = [...new Set((selectedViewports || []).map((viewport) => viewport.name))];
    const functionalViewports = VIEWPORTS.map((viewport) => viewport.name);
    const missingRoutes = publicRoutes.filter((route) => !checkedRoutes.includes(route));
    const missingViewports = functionalViewports.filter((viewport) => !checkedViewports.includes(viewport));
    const truncatedPages = [];
    let truncatedTargetCount = 0;

    for (const page of pages || []) {
        const truncatedTargets = sumDiscoveredStats(page.coverage?.discoveredStats || {});
        if (truncatedTargets > 0) {
            truncatedTargetCount += truncatedTargets;
            truncatedPages.push({
                route: page.route,
                viewport: page.viewport,
                truncatedTargets
            });
        }
    }

    return {
        mode: options.coverageMode || (options.deep ? 'deep' : 'bounded'),
        totalPublicRoutes: publicRoutes.length,
        checkedRouteCount: checkedRoutes.length,
        allPublicRoutesChecked: missingRoutes.length === 0,
        missingRoutes,
        totalFunctionalViewports: functionalViewports.length,
        checkedViewportCount: checkedViewports.length,
        allFunctionalViewportsChecked: missingViewports.length === 0,
        missingViewports,
        truncatedTargetCount,
        truncatedPages,
        actionCaps: {
            maxLinksPerPage: normalizeLimit(options.maxLinksPerPage),
            maxButtonsPerPage: normalizeLimit(options.maxButtonsPerPage),
            maxGenericButtonsPerPage: normalizeLimit(options.maxGenericButtonsPerPage),
            maxSummariesPerPage: normalizeLimit(options.maxSummariesPerPage),
            maxSelectsPerPage: normalizeLimit(options.maxSelectsPerPage),
            maxOptionsPerSelect: normalizeLimit(options.maxOptionsPerSelect)
        }
    };
}

function buildMarkdownReport(report) {
    const lines = [
        '# Functional Agent Report',
        '',
        `Generated at: ${report.generatedAt}`,
        `Base URL: ${report.baseUrl}`,
        '',
        '## Summary',
        '',
        `- routes checked: ${report.summary.totalRoutes}`,
        `- page runs: ${report.summary.totalPageRuns}`,
        `- viewports: ${report.summary.totalViewports}`,
        `- actions executed: ${report.summary.totalActions}`,
        `- real steps recorded: ${report.summary.realSteps || 0}`,
        `- passed actions: ${report.summary.passedActions}`,
        `- failed actions: ${report.summary.failedActions}`,
        `- skipped actions: ${report.summary.skippedActions}`,
        `- pages with failures: ${report.summary.pagesWithFailures}`,
        `- human review screenshots: ${report.humanReview?.screenshots || 0}/${report.humanReview?.totalFailures || 0}`,
        ''
    ];

    lines.push('## Human Review Screenshots');
    lines.push('');
    lines.push(`- directory: ${report.humanReview?.directory || 'n/a'}`);
    lines.push(`- screenshots: ${report.humanReview?.screenshots || 0}`);
    lines.push(`- missing screenshots: ${report.humanReview?.missingScreenshots || 0}`);
    lines.push('');

    lines.push(...buildCustomerJourneyMarkdownSection(report.customerJourneys));
    lines.push('', ...buildFunctionalReviewMarkdownSection(report.functionalReview));
    lines.push('', '## Pages');

    for (const page of report.pages) {
        const pageFailures = page.actions.filter((action) => action.status === 'failed');

        lines.push('');
        lines.push(`### ${page.route} [${page.viewport}]`);
        lines.push('');
        lines.push(`- title: ${page.title || '(untitled)'}`);
        lines.push(`- actions: ${page.actions.length}`);
        lines.push(`- real steps: ${page.actions.reduce((total, action) => total + Number(action.steps?.length || 0), 0)}`);
        lines.push(`- failed actions: ${pageFailures.length}`);
        lines.push(`- console errors: ${page.consoleErrors.length}`);
        lines.push(`- request failures: ${page.requestFailures.length}`);

        const stepActions = page.actions.filter((action) => Array.isArray(action.steps) && action.steps.length > 0);
        if (stepActions.length > 0) {
            lines.push('- real step evidence:');
            stepActions.slice(0, 8).forEach((action) => {
                const stepLabels = action.steps
                    .slice(0, 8)
                    .map((step) => step.label || step.id)
                    .filter(Boolean)
                    .join(' -> ');
                lines.push(`  - ${action.label}: ${stepLabels}`);
            });
        }

        if (page.consoleErrors.length > 0) {
            lines.push('- console details:');
            page.consoleErrors.slice(0, 5).forEach((entry) => lines.push(`  - ${entry}`));
        }

        if (page.requestFailures.length > 0) {
            lines.push('- request details:');
            summarizeFailures(page.requestFailures).slice(0, 5).forEach((entry) => lines.push(`  - ${entry}`));
        }

        if (pageFailures.length === 0) {
            lines.push('- failed action details: none');
        } else {
            lines.push('- failed action details:');
            pageFailures.slice(0, 10).forEach((action) => {
                lines.push(`  - ${action.label}: ${action.message}`);
                if (action.observedUrl) {
                    lines.push(`    - observed url: ${action.observedUrl}`);
                }
                if (action.screenshotPath) {
                    lines.push(`    - screenshot: ${action.screenshotPath}`);
                }
                if (action.humanReviewScreenshotPath) {
                    lines.push(`    - human review screenshot: ${action.humanReviewScreenshotPath}`);
                }
            });
        }
    }

    return `${lines.join('\n')}\n`;
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

function createNetworkTracker(page) {
    const failures = [];

    page.on('requestfailed', (request) => {
        const resourceType = request.resourceType();
        const failureText = request.failure()?.errorText || 'request_failed';

        if (
            ['document', 'stylesheet', 'script', 'image', 'media', 'xhr', 'fetch'].includes(resourceType) &&
            !/ERR_ABORTED/i.test(failureText)
        ) {
            failures.push({
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
                failures.push({
                    url: response.url(),
                    resourceType,
                    status: response.status()
                });
            }
        }
    });

    return failures;
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
        label: 'Functional agent static server'
    });

    return {
        baseUrl: resolvedBaseUrl,
        serverHandle
    };
}

async function installCommonMocks(page, { enableStripeMock = false } = {}) {
    await page.route('**/api/test', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true })
        });
    });

    await page.route('**/api/contact', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                message: 'Message sent successfully. We will respond soon.'
            })
        });
    });

    await page.route('**/api/reserve', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ clientSecret: 'pi_mock_agent_secret' })
        });
    });

    await page.route('**/api/reserve/confirm', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, emailSent: true })
        });
    });

    await page.route('**/api/availability?**', async (route) => {
        const requestUrl = new URL(route.request().url());
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'ok',
                schedule: {
                    startDate: requestUrl.searchParams.get('startDate'),
                    endDate: requestUrl.searchParams.get('endDate'),
                    pickupTime: requestUrl.searchParams.get('pickupTime'),
                    dropoffTime: requestUrl.searchParams.get('dropoffTime')
                },
                vehicles: [
                    { id: 'lamborghini-huracan-evo-spyder', available: true },
                    { id: 'ferrari-296-gts', available: true },
                    { id: 'porsche-992-gt3', available: true },
                    { id: 'lamborghini-urus-sport', available: true },
                    { id: 'mercedes-g63-amg', available: true },
                    { id: 'rolls-royce-cullinan-black-badge', available: true }
                ]
            })
        });
    });

    if (enableStripeMock) {
        await page.addInitScript(() => {
            window.Stripe = function StripeMock() {
                return {
                    elements() {
                        return {
                            create() {
                                return {
                                    mount(selector) {
                                        const container = document.querySelector(selector);
                                        if (container) {
                                            container.setAttribute('data-mock-stripe', 'mounted');
                                        }
                                    },
                                    on() {}
                                };
                            }
                        };
                    },
                    async confirmCardPayment(clientSecret) {
                        return {
                            error: null,
                            paymentIntent: {
                                id: 'pi_mock_customer_checkout',
                                status: 'succeeded',
                                amount: 199000,
                                client_secret: clientSecret
                            }
                        };
                    }
                };
            };
        });
    }
}

async function openRouteSession(browser, baseUrl, route, { enableStripeMock = false, viewport = VIEWPORTS[VIEWPORTS.length - 1] } = {}) {
    const context = await browser.newContext(buildContextOptions(viewport));
    const page = await context.newPage();
    const consoleErrors = createConsoleTracker(page);
    const requestFailures = createNetworkTracker(page);

    await installCommonMocks(page, { enableStripeMock });
    if (route === '/') {
        await primeHomeAnimations(page);
    }

    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await settlePage(page, 350);

    return {
        context,
        page,
        consoleErrors,
        requestFailures,
        viewport
    };
}

async function collectPageMeta(page) {
    return page.evaluate(() => ({
        title: document.title || '',
        hasVehicleBooking: Boolean(document.querySelector('.js-vehicle-booking-form')),
        hasVehicleMediaGallery: Boolean(document.querySelector('.vehicle-pdp-gallery-top__thumb--media img, .vehicle-pdp-gallery-top__stage img')),
        hasServicesSelector: Boolean(document.querySelector('[data-services-selector] [data-service-selector]')),
        modelCardCount: document.querySelectorAll('.model-card').length,
        hasContactForm: Boolean(document.querySelector('#contactForm')),
        hasReserveFlow: Boolean(document.querySelector('#payButton')),
        hasFleetBrowser: Boolean(document.querySelector('.js-fleet-brand-select')),
        hasContactProtocolLinks: Boolean(document.querySelector('a[href^="tel:"], a[href*="wa.me/"], a[href*="api.whatsapp.com/send"]'))
    }));
}

async function discoverInteractiveTargets(page, currentRoute, options) {
    return page.evaluate(({ route, maxLinks, maxButtons, maxGenericButtons, maxSummaries, maxSelects, maxOptions }) => {
        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity || '1') > 0.05 &&
                rect.width >= 8 &&
                rect.height >= 8;
        }

        function buildSelector(element) {
            const parts = [];
            let current = element;

            while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
                let part = current.tagName.toLowerCase();

                if (current.id) {
                    part += `#${CSS.escape(current.id)}`;
                    parts.unshift(part);
                    break;
                }

                const classNames = Array.from(current.classList).slice(0, 2);
                if (classNames.length > 0) {
                    part += classNames.map((name) => `.${CSS.escape(name)}`).join('');
                }

                let index = 1;
                let sibling = current;
                while ((sibling = sibling.previousElementSibling)) {
                    if (sibling.tagName === current.tagName) {
                        index += 1;
                    }
                }

                part += `:nth-of-type(${index})`;
                parts.unshift(part);
                current = current.parentElement;
            }

            return parts.join(' > ');
        }

        function labelFor(link) {
            return (
                link.getAttribute('aria-label') ||
                link.textContent ||
                link.getAttribute('title') ||
                link.getAttribute('href') ||
                ''
            ).replace(/\s+/g, ' ').trim();
        }

        function firstText(value) {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function limitedPush(collection, value, limit) {
            if (collection.length < limit) {
                collection.push(value);
            }
        }

        function normalizePathFromHref(href) {
            if (!href) {
                return '';
            }

            try {
                const url = new URL(href, window.location.href);
                const pathname = url.pathname === '/index.html' ? '/' : url.pathname;
                return `${pathname}${url.search}${url.hash}`;
            } catch (error) {
                return '';
            }
        }

        function inferButtonExpectedTarget(button, label, form) {
            const explicitTarget = button.getAttribute('data-href') ||
                button.getAttribute('data-url') ||
                button.getAttribute('data-target-url') ||
                button.getAttribute('formaction') ||
                '';

            if (explicitTarget) {
                return normalizePathFromHref(explicitTarget);
            }

            const normalizedLabel = label.toLowerCase();
            const onclick = firstText(button.getAttribute('onclick')).toLowerCase();

            if (/available cars|search vehicles|see cars|show cars/.test(normalizedLabel)) {
                return '/fleet.html';
            }

            if (/reservation|reserve|book now|check availability/.test(normalizedLabel) && /reserve|nextstep|submitreservation/.test(onclick)) {
                return '/app/reserve/page.html';
            }

            const formAction = form?.getAttribute('action') || '';
            if (formAction && !formAction.startsWith('#')) {
                return normalizePathFromHref(formAction);
            }

            return '';
        }

        function isSpecializedButton(button) {
            return Boolean(button.closest([
                '.js-home-booking-form',
                '.hero-lab-overlay__form',
                '#contactForm',
                '.js-vehicle-booking-form',
                '[data-services-selector]',
                '.vehicle-media-lightbox'
            ].join(','))) ||
                button.matches([
                    '[aria-controls][aria-expanded]',
                    '.js-fleet-reset',
                    '.fleet-date-prompt',
                    '.fleet-mobile-filter-toggle',
                    '.js-fleet-mobile-dates',
                    '.fleet-filter-close',
                    '.fleet-filter-scrim',
                    '#continueToPaymentBtn',
                    '#payButton',
                    '#reserveMobileAction',
                    '[data-overlay-close]',
                    '[data-vehicle-media-close]',
                    '[data-vehicle-media-prev]',
                    '[data-vehicle-media-next]'
                ].join(','));
        }

        const dedupe = {
            links: new Set(),
            buttons: new Set(),
            genericButtons: new Set(),
            summaries: new Set(),
            selects: new Set()
        };
        const output = {
            links: [],
            toggleButtons: [],
            genericButtons: [],
            summaries: [],
            selects: [],
            stats: {
                visibleLinks: 0,
                visibleToggleButtons: 0,
                visibleGenericButtons: 0,
                visibleSummaries: 0,
                visibleSelects: 0,
                visibleSelectOptions: 0,
                collectedLinks: 0,
                collectedToggleButtons: 0,
                collectedGenericButtons: 0,
                collectedSummaries: 0,
                collectedSelects: 0,
                collectedSelectOptions: 0,
                truncatedLinks: 0,
                truncatedToggleButtons: 0,
                truncatedGenericButtons: 0,
                truncatedSummaries: 0,
                truncatedSelects: 0,
                truncatedSelectOptions: 0
            }
        };

        for (const link of document.querySelectorAll('header a[href], main a[href], footer a[href]')) {
            if (!(link instanceof HTMLAnchorElement) || !isVisible(link)) {
                continue;
            }

            const href = link.getAttribute('href') || '';
            const label = labelFor(link);

            if (!href || !label) {
                continue;
            }

            const dedupeKey = `${label}::${href}`;
            if (dedupe.links.has(dedupeKey)) {
                continue;
            }
            dedupe.links.add(dedupeKey);

            const absolute = new URL(href, window.location.href);
            const normalizedPath = absolute.pathname === '/index.html' ? '/' : absolute.pathname;
            const kind = href.startsWith('#')
                ? 'hash'
                : absolute.origin === window.location.origin
                    ? 'internal'
                    : 'external';

            if (kind === 'internal' && normalizedPath === route && !absolute.search && !absolute.hash) {
                continue;
            }

            output.stats.visibleLinks += 1;
            const isTabLink = link.matches('[role="tab"]') && !link.hasAttribute('data-service-selector');

            limitedPush(output.links, {
                label,
                href,
                absoluteHref: absolute.href,
                targetPath: `${normalizedPath}${absolute.search}${absolute.hash}`,
                kind,
                behavior: isTabLink ? 'tab' : 'navigation',
                controlsId: firstText(link.getAttribute('aria-controls')),
                detailsSelector: link.closest('details') ? buildSelector(link.closest('details')) : '',
                selector: buildSelector(link)
            }, maxLinks);
        }

        for (const button of document.querySelectorAll('header button[aria-controls][aria-expanded], main button[aria-controls][aria-expanded], [role="button"][aria-controls][aria-expanded]')) {
            if (!(button instanceof HTMLElement) || !isVisible(button)) {
                continue;
            }

            const label = labelFor(button);
            const controlsId = firstText(button.getAttribute('aria-controls'));
            const dedupeKey = `${label}::${controlsId}`;

            if (!label || !controlsId || dedupe.buttons.has(dedupeKey)) {
                continue;
            }

            dedupe.buttons.add(dedupeKey);
            output.stats.visibleToggleButtons += 1;
            limitedPush(output.toggleButtons, {
                label,
                selector: buildSelector(button),
                controlsId,
                expanded: firstText(button.getAttribute('aria-expanded'))
            }, maxButtons);
        }

        for (const button of document.querySelectorAll('header button, main button, footer button, header [role="button"], main [role="button"], footer [role="button"]')) {
            if (!(button instanceof HTMLElement) || !isVisible(button) || isSpecializedButton(button)) {
                continue;
            }

            if (button.matches('button') && (button.disabled || button.getAttribute('aria-disabled') === 'true')) {
                continue;
            }

            const label = labelFor(button);
            const selector = buildSelector(button);
            const form = button.closest('form');
            const type = firstText(button.getAttribute('type') || (button instanceof HTMLButtonElement ? button.type : 'button')).toLowerCase() || 'button';
            const controlsId = firstText(button.getAttribute('aria-controls'));
            const expectedTargetPath = inferButtonExpectedTarget(button, label, form);
            const dedupeKey = `${label}::${selector}`;

            if (!label || dedupe.genericButtons.has(dedupeKey)) {
                continue;
            }

            dedupe.genericButtons.add(dedupeKey);
            output.stats.visibleGenericButtons += 1;
            limitedPush(output.genericButtons, {
                label,
                selector,
                type,
                controlsId,
                expanded: firstText(button.getAttribute('aria-expanded')),
                expectedTargetPath,
                onclick: firstText(button.getAttribute('onclick')),
                formSelector: form ? buildSelector(form) : '',
                formAction: firstText(form?.getAttribute('action')),
                className: firstText(button.getAttribute('class')),
                id: firstText(button.id)
            }, maxGenericButtons);
        }

        for (const summary of document.querySelectorAll('details > summary')) {
            if (!(summary instanceof HTMLElement) || !isVisible(summary)) {
                continue;
            }

            const label = labelFor(summary);
            const dedupeKey = `${label}::${buildSelector(summary)}`;

            if (!label || dedupe.summaries.has(dedupeKey)) {
                continue;
            }

            dedupe.summaries.add(dedupeKey);
            output.stats.visibleSummaries += 1;
            limitedPush(output.summaries, {
                label,
                selector: buildSelector(summary),
                initiallyOpen: Boolean(summary.parentElement?.open)
            }, maxSummaries);
        }

        for (const select of document.querySelectorAll('main select, form select')) {
            if (!(select instanceof HTMLSelectElement) || !isVisible(select)) {
                continue;
            }

            const selectableOptions = Array.from(select.options)
                .filter((option) => !option.disabled && firstText(option.value || option.textContent))
                .map((option) => ({
                    value: option.value,
                    label: firstText(option.textContent || option.value)
                }));

            if (selectableOptions.length < 2) {
                continue;
            }

            const label = firstText(
                document.querySelector(`label[for="${CSS.escape(select.id)}"]`)?.textContent ||
                select.getAttribute('aria-label') ||
                select.name ||
                select.id
            );
            const dedupeKey = `${label}::${buildSelector(select)}`;

            if (!label || dedupe.selects.has(dedupeKey)) {
                continue;
            }

            dedupe.selects.add(dedupeKey);
            output.stats.visibleSelects += 1;
            output.stats.visibleSelectOptions += selectableOptions.length;
            limitedPush(output.selects, {
                label,
                selector: buildSelector(select),
                currentValue: select.value,
                options: selectableOptions.slice(0, maxOptions)
            }, maxSelects);
        }

        output.stats.collectedLinks = output.links.length;
        output.stats.collectedToggleButtons = output.toggleButtons.length;
        output.stats.collectedGenericButtons = output.genericButtons.length;
        output.stats.collectedSummaries = output.summaries.length;
        output.stats.collectedSelects = output.selects.length;
        output.stats.collectedSelectOptions = output.selects.reduce((total, select) => total + select.options.length, 0);
        output.stats.truncatedLinks = Math.max(0, output.stats.visibleLinks - output.links.length);
        output.stats.truncatedToggleButtons = Math.max(0, output.stats.visibleToggleButtons - output.toggleButtons.length);
        output.stats.truncatedGenericButtons = Math.max(0, output.stats.visibleGenericButtons - output.genericButtons.length);
        output.stats.truncatedSummaries = Math.max(0, output.stats.visibleSummaries - output.summaries.length);
        output.stats.truncatedSelects = Math.max(0, output.stats.visibleSelects - output.selects.length);
        output.stats.truncatedSelectOptions = Math.max(0, output.stats.visibleSelectOptions - output.stats.collectedSelectOptions);

        return output;
    }, {
        route: currentRoute,
        maxLinks: options.maxLinksPerPage || DEFAULT_ACTION_LIMITS.maxLinksPerPage,
        maxButtons: options.maxButtonsPerPage || DEFAULT_ACTION_LIMITS.maxButtonsPerPage,
        maxGenericButtons: options.maxGenericButtonsPerPage || DEFAULT_ACTION_LIMITS.maxGenericButtonsPerPage,
        maxSummaries: options.maxSummariesPerPage || DEFAULT_ACTION_LIMITS.maxSummariesPerPage,
        maxSelects: options.maxSelectsPerPage || DEFAULT_ACTION_LIMITS.maxSelectsPerPage,
        maxOptions: options.maxOptionsPerSelect || DEFAULT_ACTION_LIMITS.maxOptionsPerSelect
    });
}

function extractConsoleErrors(errors) {
    return normalizeConsoleErrors(errors).slice(0, 10);
}

function normalizeActionSteps(steps = []) {
    if (!Array.isArray(steps)) {
        return [];
    }

    return steps
        .filter(Boolean)
        .map((step, index) => ({
            id: slugify(step.id || step.label || `step-${index + 1}`),
            label: String(step.label || step.id || `Step ${index + 1}`),
            status: String(step.status || 'passed'),
            expected: String(step.expected || ''),
            observed: String(step.observed || ''),
            detail: String(step.detail || '')
        }));
}

function createStepRecorder() {
    const steps = [];

    return {
        steps,
        record(id, label, details = {}) {
            steps.push({
                id,
                label,
                status: details.status || 'passed',
                expected: details.expected || '',
                observed: details.observed || '',
                detail: details.detail || ''
            });
        }
    };
}

async function runAction(browser, baseUrl, route, viewport, pageDir, action) {
    const screenshotPath = path.join(pageDir, `${slugify(action.id || action.label)}.png`);
    const session = await openRouteSession(browser, baseUrl, route, {
        enableStripeMock: Boolean(action.enableStripeMock),
        viewport
    });

    try {
        const result = await action.run(session.page);
        return {
            id: action.id,
            label: action.label,
            kind: action.kind,
            status: 'passed',
            message: result?.message || 'Action completed successfully.',
            observedUrl: result?.observedUrl || session.page.url(),
            expectedTargetPath: result?.expectedTargetPath || '',
            observedPath: result?.observedPath || '',
            interactionType: result?.interactionType || '',
            steps: normalizeActionSteps(result?.steps),
            consoleErrors: extractConsoleErrors(session.consoleErrors),
            requestFailures: session.requestFailures.slice(0, 10),
            screenshotPath: ''
        };
    } catch (error) {
        try {
            await session.page.screenshot({
                path: screenshotPath,
                fullPage: false,
                animations: 'disabled',
                caret: 'hide'
            });
        } catch (captureError) {
            // Ignore screenshot capture issues in favor of the original failure.
        }

        return {
            id: action.id,
            label: action.label,
            kind: action.kind,
            status: 'failed',
            message: formatError(error),
            observedUrl: session.page.url(),
            expectedTargetPath: action.expectedTargetPath || '',
            observedPath: '',
            interactionType: action.interactionType || '',
            steps: [],
            consoleErrors: extractConsoleErrors(session.consoleErrors),
            requestFailures: session.requestFailures.slice(0, 10),
            screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : ''
        };
    } finally {
        await session.context.close();
    }
}

function currentPathFromPageUrl(pageUrl) {
    const url = new URL(pageUrl);
    return `${normalizeRoute(url.pathname)}${url.search}${url.hash}`;
}

async function fillFleetSchedule(page, schedule = FLEET_CHECKOUT_SCHEDULE) {
    await page.locator('#fleet-pickup-date').fill(schedule.startDate);
    await page.locator('#fleet-return-date').fill(schedule.endDate);
    await page.locator('#fleet-pickup-time').fill(schedule.pickupTime);
    await page.locator('#fleet-return-time').fill(schedule.dropoffTime);

    await expect(page.locator('#fleet-pickup-date')).toHaveValue(schedule.startDate);
    await expect(page.locator('#fleet-return-date')).toHaveValue(schedule.endDate);
    await expect(page.locator('#fleet-pickup-time')).toHaveValue(schedule.pickupTime);
    await expect(page.locator('#fleet-return-time')).toHaveValue(schedule.dropoffTime);
}

async function collectFleetCheckoutCars(page) {
    return page.locator('.js-fleet-card').evaluateAll((cards) => cards
        .map((card, index) => {
            const titleElement = card.querySelector('.fleet-card__title a') || card.querySelector('.fleet-card__title');
            const reserveLink = card.querySelector('.fleet-card__reserve, .fleet-card__primary');

            return {
                index,
                id: card.dataset.id || `fleet-car-${index + 1}`,
                brand: card.dataset.brand || '',
                title: String(titleElement?.textContent || '').replace(/\s+/g, ' ').trim(),
                price: card.dataset.price || '',
                reserveHref: reserveLink?.getAttribute('href') || ''
            };
        })
        .filter((car) => car.title));
}

async function assertReserveIntent(page, { carTitle, price, schedule }) {
    await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
    await expect(page.locator('body')).toHaveClass(/reserve-page/);
    await expect(page.locator('#selectedCar')).toContainText(new RegExp(escapeRegExp(carTitle), 'i'));
    await expect(page.locator('#startDate')).toHaveValue(schedule.startDate);
    await expect(page.locator('#endDate')).toHaveValue(schedule.endDate);
    await expect(page.locator('#pickupTime')).toHaveValue(schedule.pickupTime);
    await expect(page.locator('#dropoffTime')).toHaveValue(schedule.dropoffTime);

    const priceFragment = formatPriceFragment(price);
    if (priceFragment) {
        await expect(page.locator('#selectedCarRate')).toContainText(priceFragment);
    }
}

async function completeReserveCheckout(page, recorder, {
    stepPrefix = 'reserve',
    carTitle = 'selected car',
    schedule = FLEET_CHECKOUT_SCHEDULE
} = {}) {
    const scopedStepId = (suffix) => (stepPrefix ? `${stepPrefix}-${suffix}` : suffix);
    const scopedStepLabel = (label) => {
        if (!carTitle) {
            return label;
        }

        return `${carTitle}: ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
    };

    await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    recorder.record(scopedStepId('fill-delivery-location'), scopedStepLabel('Fill delivery location'), {
        expected: reservationGuest.pickupLocation,
        observed: await page.locator('#pickupLocation').inputValue()
    });

    await page.locator('#continueToPaymentBtn').click();
    await expect(page.locator('#step2')).toHaveClass(/active/);
    recorder.record(scopedStepId('advance-to-guest-details'), scopedStepLabel('Advance to guest details'), {
        expected: 'step2 active',
        observed: await page.locator('#step2').getAttribute('class') || ''
    });

    await page.locator('#fullName').fill(reservationGuest.name);
    await page.locator('#passport').fill(reservationGuest.passport);
    await page.locator('#phone').fill(reservationGuest.phone);
    await page.locator('#email').fill(reservationGuest.email);
    recorder.record(scopedStepId('fill-guest-details'), scopedStepLabel('Fill guest details'), {
        expected: reservationGuest.email,
        observed: await page.locator('#email').inputValue()
    });

    await page.locator('#step2').getByRole('button', { name: /continue to payment/i }).click();

    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');
    recorder.record(scopedStepId('advance-to-payment'), scopedStepLabel('Advance to payment'), {
        expected: 'mock Stripe mounted',
        observed: await page.locator('#card-element').getAttribute('data-mock-stripe') || ''
    });

    const successDialogPromise = page.waitForEvent('dialog');
    await page.locator('#payButton').click();

    const dialog = await successDialogPromise;
    recorder.record(scopedStepId('submit-mocked-payment'), scopedStepLabel('Submit mocked payment'), {
        expected: 'success dialog',
        observed: dialog.message()
    });
    await dialog.accept();

    await expect(page).toHaveURL(/\/index\.html$/i);
    recorder.record(scopedStepId('success-redirect-home'), scopedStepLabel('Success redirects home'), {
        expected: '/',
        observed: currentPathFromPageUrl(page.url()),
        detail: `${schedule.startDate} ${schedule.pickupTime} to ${schedule.endDate} ${schedule.dropoffTime}`
    });
}

async function captureInteractionSignature(page, descriptor = {}) {
    return page.evaluate(({ controlsId }) => {
        function isVisible(element) {
            if (!(element instanceof HTMLElement)) {
                return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity || '1') > 0.05 &&
                rect.width >= 4 &&
                rect.height >= 4;
        }

        function stateLine(element) {
            const id = element.id ? `#${element.id}` : '';
            const className = Array.from(element.classList || []).slice(0, 4).join('.');
            const text = String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90);
            return `${element.tagName.toLowerCase()}${id}${className ? `.${className}` : ''}:${text}`;
        }

        const statusText = Array.from(document.querySelectorAll([
            '[id*="Status"]',
            '[id*="Validation"]',
            '[role="alert"]',
            '.form-status',
            '.error',
            '.success',
            '.is-error',
            '.is-success'
        ].join(',')))
            .filter(isVisible)
            .map(stateLine)
            .sort()
            .join('|');

        const visibleStates = Array.from(document.querySelectorAll([
            '.is-open',
            '.is-visible',
            '.active',
            '[aria-expanded="true"]',
            '[aria-hidden="false"]',
            'details[open]',
            '[role="dialog"]'
        ].join(',')))
            .filter(isVisible)
            .map(stateLine)
            .sort()
            .join('|');

        const dynamicText = Array.from(document.querySelectorAll([
            '#currentMonth',
            '#calendarGrid',
            '.js-fleet-results-count',
            '.js-fleet-price-selected'
        ].join(',')))
            .filter(isVisible)
            .map(stateLine)
            .sort()
            .join('|');

        const controlled = controlsId ? document.getElementById(controlsId) : null;

        return {
            path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            bodyClass: document.body.className,
            statusText,
            visibleStates,
            dynamicText,
            activeElement: document.activeElement ? stateLine(document.activeElement) : '',
            controlledVisible: controlled ? isVisible(controlled) : null,
            controlledAriaHidden: controlled ? controlled.getAttribute('aria-hidden') : null
        };
    }, {
        controlsId: descriptor.controlsId || ''
    });
}

function signaturesDiffer(before, after) {
    return JSON.stringify(before || {}) !== JSON.stringify(after || {});
}

function createGenericButtonAction(descriptor) {
    const expectedTargetPath = descriptor.expectedTargetPath || '';

    return {
        id: `button-${slugify(descriptor.label)}-${slugify(descriptor.id || descriptor.selector)}`,
        label: `Button: ${descriptor.label}`,
        kind: expectedTargetPath ? 'button:navigation' : `button:${descriptor.type || 'state'}`,
        expectedTargetPath,
        interactionType: expectedTargetPath ? 'navigation' : 'state-change',
        async run(page) {
            const locator = page.locator(descriptor.selector).first();
            await expect(locator).toBeVisible();

            const disabled = await locator.evaluate((element) => (
                Boolean(element.disabled) || element.getAttribute('aria-disabled') === 'true'
            ));

            if (disabled) {
                throw new Error(`Button is visible but disabled: ${descriptor.label}.`);
            }

            await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
            await page.waitForTimeout(80);

            const before = await captureInteractionSignature(page, descriptor);

            if (expectedTargetPath) {
                const reachedExpectedUrl = page.waitForURL((url) => {
                    const observedPath = `${normalizeRoute(url.pathname)}${url.search}${url.hash}`;
                    return observedPath === expectedTargetPath;
                }, { timeout: 5000 }).catch(() => null);

                await locator.click();
                await reachedExpectedUrl;
                await page.waitForLoadState('domcontentloaded').catch(() => null);
                await settlePage(page, 250);

                const observedPath = currentPathFromPageUrl(page.url());
                if (observedPath !== expectedTargetPath) {
                    throw new Error(`Expected button "${descriptor.label}" to reach ${expectedTargetPath}, but landed on ${observedPath}.`);
                }

                return {
                    message: `${descriptor.label} reached ${expectedTargetPath}.`,
                    observedUrl: page.url(),
                    expectedTargetPath,
                    observedPath,
                    interactionType: 'navigation'
                };
            }

            const beforeUrl = new URL(page.url());
            const externalNavigation = page.waitForURL((url) => url.origin !== beforeUrl.origin, {
                timeout: 1500
            }).catch(() => null);

            await locator.click({ force: true });
            await Promise.race([
                externalNavigation,
                page.waitForTimeout(250)
            ]);

            const currentUrl = new URL(page.url());
            if (currentUrl.origin !== beforeUrl.origin) {
                return {
                    message: `${descriptor.label} handed off to external destination ${currentUrl.href}.`,
                    observedUrl: currentUrl.href,
                    observedPath: '',
                    interactionType: 'external-button-handoff'
                };
            }

            await settlePage(page, 250);

            const after = await captureInteractionSignature(page, descriptor);
            const observedPath = currentPathFromPageUrl(page.url());

            if (!signaturesDiffer(before, after)) {
                throw new Error(`Button "${descriptor.label}" did not navigate, reveal validation, or change visible UI state.`);
            }

            return {
                message: `${descriptor.label} changed visible UI state.`,
                observedUrl: page.url(),
                observedPath,
                interactionType: 'state-change'
            };
        }
    };
}

function createLinkAction(descriptor) {
    function urlMeetsExpectedInternalTarget(url, expectedUrl) {
        if (normalizeRoute(url.pathname) !== normalizeRoute(expectedUrl.pathname)) {
            return false;
        }

        if (url.hash !== expectedUrl.hash) {
            return false;
        }

        const expectedParams = Array.from(expectedUrl.searchParams.entries());

        if (expectedParams.length === 0) {
            return url.search === '';
        }

        return expectedParams.every(([key, value]) => url.searchParams.get(key) === value);
    }

    return {
        id: `link-${slugify(descriptor.label)}-${slugify(descriptor.href)}`,
        label: `Link: ${descriptor.label}`,
        kind: descriptor.behavior === 'tab' ? 'tab-link' : `link:${descriptor.kind}`,
        expectedTargetPath: descriptor.kind === 'internal' ? descriptor.targetPath : '',
        interactionType: descriptor.kind === 'internal' ? 'navigation' : descriptor.kind,
        async run(page) {
            if (descriptor.kind === 'external') {
                const isValidExternal = /^(tel:|mailto:|https?:\/\/|\/\/)/i.test(descriptor.absoluteHref);
                if (!isValidExternal) {
                    throw new Error(`External href is malformed: ${descriptor.absoluteHref}`);
                }

                return {
                    message: `External link looks valid: ${descriptor.absoluteHref}`,
                    observedUrl: page.url(),
                    interactionType: 'external-link'
                };
            }

            let locator = page
                .locator(`a[href="${escapeCssAttribute(descriptor.href)}"]:visible`)
                .filter({ hasText: descriptor.label })
                .first();

            if (await locator.count() === 0) {
                locator = page.locator(descriptor.selector).first();
            }

            if (descriptor.detailsSelector) {
                await page.evaluate((selector) => {
                    const details = document.querySelector(selector);
                    if (details instanceof HTMLDetailsElement) {
                        details.open = true;
                    }
                }, descriptor.detailsSelector).catch(() => null);
                await page.waitForTimeout(80);
            }

            await expect(locator).toBeVisible();
            await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
            await page.waitForTimeout(80);

            if (descriptor.behavior === 'tab') {
                const beforeSelected = await locator.getAttribute('aria-selected').catch(() => null);
                await locator.click();
                await settlePage(page, 250);
                const afterSelected = await locator.getAttribute('aria-selected').catch(() => null);
                const isActive = await locator.evaluate((element) => element.classList.contains('is-active')).catch(() => false);
                const controlledPanelIsLinked = descriptor.controlsId
                    ? await page.locator(`#${descriptor.controlsId}`).evaluate((panel, id) => panel.getAttribute('aria-labelledby') === id, await locator.getAttribute('id')).catch(() => false)
                    : false;

                if (afterSelected !== 'true' && !isActive && !controlledPanelIsLinked && beforeSelected === afterSelected) {
                    throw new Error(`Tab-like link did not activate its controlled state: ${descriptor.label}.`);
                }

                return {
                    message: `${descriptor.label} activated its tab state.`,
                    observedUrl: page.url(),
                    interactionType: 'tab'
                };
            }

            if (descriptor.kind === 'hash') {
                await locator.click();
                await page.waitForTimeout(250);

                const currentUrl = new URL(page.url());
                if (!currentUrl.hash) {
                    throw new Error(`Hash link did not update the URL: ${descriptor.href}`);
                }

                return {
                    message: `Hash navigation reached ${currentUrl.hash}`,
                    observedUrl: page.url(),
                    observedPath: currentPathFromPageUrl(page.url()),
                    interactionType: 'hash'
                };
            }

            const expected = new URL(descriptor.absoluteHref);
            const expectedPath = `${normalizeRoute(expected.pathname)}${expected.search}${expected.hash}`;
            const reachedExpectedUrl = page.waitForURL((url) => {
                return urlMeetsExpectedInternalTarget(url, expected);
            }, { timeout: 5000 }).catch(() => null);

            await locator.click();
            await reachedExpectedUrl;
            await page.waitForLoadState('domcontentloaded').catch(() => null);
            await settlePage(page, 250);

            const observed = new URL(page.url());
            const observedPath = `${normalizeRoute(observed.pathname)}${observed.search}${observed.hash}`;

            if (!urlMeetsExpectedInternalTarget(observed, expected)) {
                throw new Error(`Expected ${expectedPath} but landed on ${observedPath}`);
            }

            return {
                message: `Reached ${expectedPath}`,
                observedUrl: page.url(),
                expectedTargetPath: expectedPath,
                observedPath,
                interactionType: 'navigation'
            };
        }
    };
}

function createContactProtocolLinksAction() {
    return {
        id: 'contact-protocol-links',
        label: 'Call and WhatsApp links use the approved number and message context',
        kind: 'contact-link',
        interactionType: 'contact-protocol',
        async run(page) {
            const recorder = createStepRecorder();

            await settlePage(page, 500);
            await page.evaluate(() => {
                if (typeof window.__wakeReserveEnhancements === 'function') {
                    window.__wakeReserveEnhancements();
                }
            }).catch(() => null);
            await page.locator('.lab-floating-contact').first().waitFor({ state: 'attached', timeout: 2500 }).catch(() => null);
            await page.evaluate(() => {
                if (typeof window.__reserveOpenMobileDrawer === 'function') {
                    window.__reserveOpenMobileDrawer();
                }
            }).catch(() => null);
            await page.waitForTimeout(120);
            await page.evaluate(() => {
                if (typeof window.__reserveCloseMobileDrawer === 'function') {
                    window.__reserveCloseMobileDrawer();
                }
            }).catch(() => null);

            const result = await page.evaluate(({ expectedPhone, expectedTelHref, expectedGenericMessage }) => {
                function normalizeText(value) {
                    return String(value || '').replace(/\s+/g, ' ').trim();
                }

                function normalizeDigits(value) {
                    return String(value || '').replace(/\D/g, '');
                }

                function normalizeComparable(value) {
                    return normalizeText(value)
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, ' ')
                        .trim();
                }

                function tokenList(value) {
                    return normalizeComparable(value)
                        .split(/\s+/)
                        .filter((token) => token && !['the', 'and', 'for', 'with', 'rent', 'rental', 'dubai', 'car', 'cars', 'luxury'].includes(token));
                }

                function textFrom(element, selectors) {
                    for (const selector of selectors) {
                        const match = element?.querySelector?.(selector);
                        const text = normalizeText(match?.textContent || match?.value || '');
                        if (text) {
                            return text;
                        }
                    }

                    return '';
                }

                function inferCarContext(link) {
                    const fleetCard = link.closest('.js-fleet-card, .fleet-card');
                    if (fleetCard) {
                        return textFrom(fleetCard, ['.fleet-card__title', '[data-car-title]', 'h3', 'h2']);
                    }

                    const visualCard = link.closest('.fleet-visual-card');
                    if (visualCard) {
                        const viewLabel = textFrom(visualCard, ['.fleet-visual-card__primary', 'h3', 'h2']);
                        return viewLabel.replace(/^view\s+/i, '');
                    }

                    const modelCard = link.closest('.model-card');
                    if (modelCard) {
                        return textFrom(modelCard, ['h3', '[data-car-title]']);
                    }

                    const bookingCard = link.closest('.vehicle-booking');
                    if (bookingCard) {
                        return textFrom(bookingCard, [
                            'input[name="car"]',
                            '[data-car-title]',
                            'h1',
                            'h2'
                        ]) || normalizeText(document.querySelector('.vehicle-pdp-intro h1, #vehicle-base-title, h1')?.textContent || '');
                    }

                    return '';
                }

                function parseWhatsAppHref(rawHref) {
                    const url = new URL(rawHref, window.location.href);
                    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
                    const number = host === 'wa.me'
                        ? normalizeDigits(url.pathname)
                        : normalizeDigits(url.searchParams.get('phone'));

                    return {
                        href: url.href,
                        number,
                        message: normalizeText(url.searchParams.get('text') || ''),
                        host
                    };
                }

                function carMessageMentionsCar(message, carName) {
                    const tokens = tokenList(carName);
                    if (tokens.length === 0) {
                        return true;
                    }

                    const compactMessage = normalizeComparable(message).replace(/\s+/g, '');
                    const matches = tokens.filter((token) => compactMessage.includes(token.replace(/\s+/g, '')));
                    const requiredMatches = tokens.length <= 2 ? 1 : 2;
                    return matches.length >= requiredMatches;
                }

                const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
                const whatsappLinks = Array.from(document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com/send"]'));
                const issues = [];
                const carSpecific = [];
                const genericFloating = [];

                telLinks.forEach((link) => {
                    const href = link.getAttribute('href') || '';
                    const digits = normalizeDigits(href);

                    if (digits !== expectedPhone || href.trim() !== expectedTelHref) {
                        issues.push(`Call link "${normalizeText(link.textContent || link.getAttribute('aria-label')) || href}" points to ${href || 'empty href'} instead of ${expectedTelHref}.`);
                    }
                });

                whatsappLinks.forEach((link) => {
                    const rawHref = link.getAttribute('href') || '';
                    const label = normalizeText(link.textContent || link.getAttribute('aria-label')) || rawHref;
                    let parsed = null;

                    try {
                        parsed = parseWhatsAppHref(rawHref);
                    } catch (error) {
                        issues.push(`WhatsApp link "${label}" has a malformed href: ${rawHref || 'empty href'}.`);
                        return;
                    }

                    if (parsed.number !== expectedPhone) {
                        issues.push(`WhatsApp link "${label}" points to ${parsed.number || 'no number'} instead of ${expectedPhone}.`);
                    }

                    if (!parsed.message) {
                        issues.push(`WhatsApp link "${label}" does not preload a message.`);
                    }

                    const carName = inferCarContext(link);
                    if (carName) {
                        carSpecific.push(carName);
                        if (parsed.message && !carMessageMentionsCar(parsed.message, carName)) {
                            issues.push(`WhatsApp link "${label}" should mention the selected car "${carName}" but preloads "${parsed.message}".`);
                        }
                    }

                    if (link.closest('.lab-floating-contact')) {
                        genericFloating.push(parsed.message);
                        if (normalizeComparable(parsed.message) !== normalizeComparable(expectedGenericMessage)) {
                            issues.push(`Floating WhatsApp should use the generic message "${expectedGenericMessage}" but preloads "${parsed.message || 'empty message'}".`);
                        }
                    }
                });

                return {
                    telCount: telLinks.length,
                    whatsappCount: whatsappLinks.length,
                    carSpecificCount: carSpecific.length,
                    carSpecificExamples: [...new Set(carSpecific)].slice(0, 6),
                    genericFloatingCount: genericFloating.length,
                    genericFloatingExamples: [...new Set(genericFloating)].slice(0, 3),
                    issues
                };
            }, {
                expectedPhone: EXPECTED_CONTACT_PHONE_E164,
                expectedTelHref: EXPECTED_CONTACT_TEL_HREF,
                expectedGenericMessage: EXPECTED_GENERIC_WHATSAPP_MESSAGE
            });

            recorder.record('call-number-contract', 'Call links use the approved phone number', {
                expected: EXPECTED_CONTACT_TEL_HREF,
                observed: `${result.telCount} call link(s)`
            });
            recorder.record('whatsapp-number-contract', 'WhatsApp links use the approved phone number', {
                expected: EXPECTED_CONTACT_PHONE_E164,
                observed: `${result.whatsappCount} WhatsApp link(s)`
            });
            recorder.record('whatsapp-message-contract', 'WhatsApp links preload a contextual message', {
                expected: 'generic links have a generic message; car links mention the clicked car',
                observed: `${result.carSpecificCount} car-context WhatsApp link(s); ${result.genericFloatingCount} floating generic link(s)`,
                detail: result.carSpecificExamples.join(', ')
            });

            if (result.telCount + result.whatsappCount === 0) {
                throw new Error('No call or WhatsApp links were found on this page.');
            }

            if (result.genericFloatingCount === 0) {
                throw new Error('The generic floating WhatsApp button was not found.');
            }

            if (result.issues.length > 0) {
                throw new Error(result.issues.slice(0, 8).join(' '));
            }

            return {
                message: `Validated ${result.telCount} call link(s), ${result.whatsappCount} WhatsApp link(s), and ${result.carSpecificCount} car-specific WhatsApp context(s).`,
                observedUrl: page.url(),
                interactionType: 'contact-protocol',
                steps: recorder.steps
            };
        }
    };
}

function createServicesLaneSelectorAction() {
    return {
        id: 'services-lane-circles-navigate-directly',
        label: 'Services lane circles navigate directly to service pages',
        kind: 'service-navigation',
        async run(page) {
            const startUrl = page.url();
            const recorder = createStepRecorder();
            const selectors = await page.locator('[data-services-selector] [data-service-selector]').evaluateAll((elements) => (
                elements.map((element, index) => ({
                    id: element.id || '',
                    index,
                    label: (element.getAttribute('aria-label') || element.textContent || `Service ${index + 1}`).replace(/\s+/g, ' ').trim(),
                    href: element.getAttribute('href') || ''
                }))
            ));
            const count = selectors.length;

            if (count < 2) {
                throw new Error(`Expected at least 2 service circles, found ${count}.`);
            }

            const previewPanelCount = await page.locator('[data-service-panel]').count();

            if (previewPanelCount > 0) {
                throw new Error('The old services preview panel is still present; circles should open their destination directly.');
            }

            const observedPaths = new Set();

            for (const service of selectors) {
                if (!service.href || service.href.startsWith('#')) {
                    throw new Error(`Service circle ${service.id || service.label} is missing a direct page href.`);
                }

                await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
                await settlePage(page, 250);

                const locator = service.id
                    ? page.locator(`[id="${escapeCssAttribute(service.id)}"]`).first()
                    : page.locator('[data-services-selector] [data-service-selector]').nth(service.index);
                await expect(locator).toBeVisible();

                const expected = new URL(service.href, startUrl);
                const expectedPath = `${normalizeRoute(expected.pathname)}${expected.search}${expected.hash}`;
                const reachedExpectedUrl = page.waitForURL((url) => {
                    const observedPath = `${normalizeRoute(url.pathname)}${url.search}${url.hash}`;
                    return observedPath === expectedPath;
                }, { timeout: 5000 }).catch(() => null);

                await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
                await locator.click();
                await reachedExpectedUrl;
                await page.waitForLoadState('domcontentloaded').catch(() => null);
                await settlePage(page, 250);

                const observed = new URL(page.url());
                const observedPath = `${normalizeRoute(observed.pathname)}${observed.search}${observed.hash}`;

                if (observedPath !== expectedPath) {
                    throw new Error(`Service circle ${service.id || service.label} should navigate to ${expectedPath}, but landed on ${observedPath}.`);
                }

                observedPaths.add(observedPath);
                recorder.record(`service-circle-${slugify(service.label)}`, `Open ${service.label}`, {
                    expected: expectedPath,
                    observed: observedPath
                });

            }

            return {
                message: `Verified ${count} service circles navigate directly to ${observedPaths.size} distinct service page(s).`,
                observedUrl: page.url(),
                steps: recorder.steps
            };
        }
    };
}

function createVehicleGalleryLightboxAction() {
    return {
        id: 'vehicle-gallery-opens-lightbox',
        label: 'Vehicle gallery thumbnails open a media lightbox',
        kind: 'media-lightbox',
        async run(page) {
            const trigger = page.locator('.vehicle-pdp-gallery-top__thumb--media.is-lightbox-trigger, .vehicle-pdp-gallery-top__thumb--media[role="button"]').first();
            await expect(trigger).toBeVisible();
            await trigger.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
            await trigger.click();
            await settlePage(page, 250);

            const dialog = page.locator('.vehicle-media-lightbox[role="dialog"].is-open').first();
            await expect(dialog).toBeVisible();
            await expect(dialog.locator('.vehicle-media-lightbox__image')).toBeVisible();
            await expect(dialog.locator('[data-vehicle-media-close]').first()).toBeVisible();

            const state = await dialog.evaluate((element) => {
                const image = element.querySelector('.vehicle-media-lightbox__image');
                const caption = element.querySelector('[data-vehicle-media-caption]');
                const counter = element.querySelector('[data-vehicle-media-counter]');

                return {
                    ariaHidden: element.getAttribute('aria-hidden'),
                    imageSrc: image?.getAttribute('src') || '',
                    caption: caption?.textContent?.trim() || '',
                    counter: counter?.textContent?.trim() || ''
                };
            });

            if (state.ariaHidden === 'true' || !state.imageSrc || !state.caption || !/\d+\s*\/\s*\d+/.test(state.counter)) {
                throw new Error(`Vehicle media lightbox opened without complete image, caption and counter state: ${JSON.stringify(state)}.`);
            }

            await page.keyboard.press('Escape');
            await expect(dialog).toBeHidden();

            return {
                message: `Vehicle gallery opened a visible media lightbox with ${state.counter}.`,
                observedUrl: page.url()
            };
        }
    };
}

function createToggleButtonAction(descriptor) {
    return {
        id: `toggle-${slugify(descriptor.label)}-${slugify(descriptor.controlsId)}`,
        label: `Toggle: ${descriptor.label}`,
        kind: 'toggle',
        async run(page) {
            const locator = page.locator(descriptor.selector).first();
            await expect(locator).toBeVisible();

            const beforeExpanded = await locator.getAttribute('aria-expanded');
            await locator.click({ force: true });
            await settlePage(page, 200);

            const afterExpanded = await locator.getAttribute('aria-expanded');
            const target = page.locator(`#${descriptor.controlsId}`).first();
            const targetVisible = await target.isVisible().catch(() => false);
            const targetAriaHidden = await target.getAttribute('aria-hidden').catch(() => null);

            if (
                beforeExpanded === afterExpanded &&
                afterExpanded !== 'true' &&
                !targetVisible &&
                targetAriaHidden !== 'false'
            ) {
                throw new Error(`Button did not visibly toggle its controlled region (${descriptor.controlsId}).`);
            }

            return {
                message: `${descriptor.label} toggled ${descriptor.controlsId}.`,
                observedUrl: page.url()
            };
        }
    };
}

function createSummaryToggleAction(descriptor) {
    return {
        id: `summary-${slugify(descriptor.label)}`,
        label: `FAQ: ${descriptor.label}`,
        kind: 'details',
        async run(page) {
            const locator = page.locator(descriptor.selector).first();
            await expect(locator).toBeVisible();
            const beforeOpen = await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                return Boolean(element && element.parentElement && element.parentElement.open);
            }, descriptor.selector);

            await locator.click({ force: true });
            await settlePage(page, 150);

            const afterOpen = await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                return Boolean(element && element.parentElement && element.parentElement.open);
            }, descriptor.selector);

            if (beforeOpen === afterOpen) {
                throw new Error(`Summary did not toggle the details state for "${descriptor.label}".`);
            }

            return {
                message: `${descriptor.label} changed from ${beforeOpen ? 'open' : 'closed'} to ${afterOpen ? 'open' : 'closed'}.`,
                observedUrl: page.url()
            };
        }
    };
}

function createSelectOptionAction(descriptor, targetOption) {
    return {
        id: `select-${slugify(descriptor.label)}-${slugify(targetOption?.value || targetOption?.label)}`,
        label: `Select: ${descriptor.label} -> ${targetOption?.label || targetOption?.value}`,
        kind: 'select',
        async run(page) {
            const locator = page.locator(descriptor.selector).first();
            await expect(locator).toBeVisible();

            if (!targetOption) {
                throw new Error(`No alternative option found for select "${descriptor.label}".`);
            }

            await locator.selectOption(targetOption.value);
            await expect(locator).toHaveValue(targetOption.value);

            return {
                message: `${descriptor.label} changed to ${targetOption.label || targetOption.value}.`,
                observedUrl: page.url()
            };
        }
    };
}

function createSelectCycleAction(descriptor) {
    const targetOption = descriptor.options.find((option) => option.value !== descriptor.currentValue && option.value !== '')
        || descriptor.options.find((option) => option.value !== descriptor.currentValue);

    return createSelectOptionAction(descriptor, targetOption);
}

function createHomeNavigationAction() {
    return {
        id: 'home-top-nav',
        label: 'Top navigation cycle',
        kind: 'nav',
        async run(page) {
            const recorder = createStepRecorder();
            const origin = new URL(page.url()).origin;
            const destinations = [
                { label: 'Services', expected: /\/services\.html$/i },
                { label: 'Locations', expected: /\/locations\.html$/i },
                { label: 'Fleet', expected: /\/fleet\.html$/i },
                { label: 'About Us', expected: /\/about\.html$/i }
            ];

            for (const destination of destinations) {
                await page.getByRole('link', { name: destination.label }).first().click();
                await expect(page).toHaveURL(destination.expected);
                await expect(page.locator('h1')).toBeVisible();
                recorder.record(`open-${destination.label}`, `Open ${destination.label}`, {
                    expected: destination.expected.toString(),
                    observed: currentPathFromPageUrl(page.url())
                });
                await page.goto(`${origin}/`, {
                    waitUntil: 'domcontentloaded'
                });
                await settlePage(page, 250);
            }

            return {
                message: 'Main navigation routes opened with visible headings.',
                observedUrl: page.url(),
                steps: recorder.steps
            };
        }
    };
}

function createHomeMegaMenuAction() {
    return {
        id: 'home-mega-menu',
        label: 'Cars Brands mega menu opens',
        kind: 'menu',
        async run(page) {
            const recorder = createStepRecorder();
            const brandsButton = page.getByRole('button', { name: /cars?\s+brands/i }).first();
            await brandsButton.click();
            await expect(brandsButton).toHaveAttribute('aria-expanded', 'true');
            const panelId = await brandsButton.getAttribute('aria-controls');
            const brandsPanel = page.locator(panelId ? `#${panelId}` : '.lab-nav__panel--brands').first();
            await expect(brandsPanel).toBeVisible();
            const visibleLinks = await brandsPanel.locator('a[href]').count();
            if (visibleLinks < 5) {
                throw new Error(`Expected at least 5 brand links, found ${visibleLinks}`);
            }
            recorder.record('open-brands-menu', 'Open Cars Brands menu', {
                expected: 'at least 5 brand links',
                observed: `${visibleLinks} visible brand links`
            });

            return {
                message: `Mega menu opened with ${visibleLinks} visible brand links.`,
                observedUrl: page.url(),
                steps: recorder.steps
            };
        }
    };
}

function createHomeCarsTypesFilterAction() {
    const journeys = [
        { label: 'Luxury Cars', type: 'luxury', expectedCount: 3 },
        { label: 'Convertible Cars', type: 'convertible', expectedCount: 2 },
        { label: 'Sports Cars', type: 'sports', expectedCount: 3 },
        { label: 'SUV Cars', type: 'suv', expectedCount: 3 }
    ];

    return {
        id: 'home-cars-types-filter-menu',
        label: 'Cars Types mega menu opens filtered fleet categories with real inventory',
        kind: 'menu:filter-handoff',
        async run(page) {
            const recorder = createStepRecorder();
            const origin = new URL(page.url()).origin;

            for (const journey of journeys) {
                await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
                await settlePage(page, 250);

                const typesButton = page.getByRole('button', { name: /cars?\s+types/i }).first();
                await typesButton.click();
                await expect(typesButton).toHaveAttribute('aria-expanded', 'true');
                const panelId = await typesButton.getAttribute('aria-controls');
                const typesPanel = page.locator(panelId ? `#${panelId}` : '.lab-nav__panel--types').first();
                await expect(typesPanel).toBeVisible();
                await expect(typesPanel.getByRole('link', { name: /electric cars/i })).toHaveCount(0);

                const typeLink = typesPanel.getByRole('link', { name: new RegExp(journey.label, 'i') }).first();
                await expect(typeLink).toHaveAttribute('href', new RegExp(`fleet\\.html\\?type=${journey.type}$`));
                await typeLink.click();

                await expect(page).toHaveURL(new RegExp(`/fleet\\.html\\?type=${journey.type}$`, 'i'));
                await expect(page.locator('.js-fleet-type-select')).toHaveValue(journey.type);
                await expect(page.locator('.js-fleet-results-count')).toContainText(`${journey.expectedCount} models visible`);
                const visibleCards = await page.locator('.js-fleet-card:not([hidden])').evaluateAll((cards, type) => (
                    cards.map((card) => ({
                        title: card.querySelector('.fleet-card__title')?.textContent?.trim() || '',
                        typeMatches: String(card.dataset.type || '').split(/\s+/).includes(type)
                    }))
                ), journey.type);

                if (visibleCards.length !== journey.expectedCount || !visibleCards.every((card) => card.typeMatches)) {
                    throw new Error(`${journey.label} did not land on a non-empty Fleet filter with only ${journey.type} cars.`);
                }

                recorder.record(`cars-types-${journey.type}-filter`, `${journey.label} opens filtered Fleet`, {
                    expected: `${journey.expectedCount} ${journey.type} models and no Electric category`,
                    observed: visibleCards.map((card) => card.title).join(', ')
                });
            }

            return {
                message: 'Cars Types menu only exposes real inventory categories and each card opens Fleet with the matching filter.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                steps: recorder.steps
            };
        }
    };
}

function createHomeOverlaySearchAction() {
    return {
        id: 'home-booking-search',
        label: 'Home booking panel submits into fleet',
        kind: 'form',
        async run(page) {
            const recorder = createStepRecorder();
            await expect(page.locator('#home-booking')).toBeVisible();
            recorder.record('find-home-booking-panel', 'Find home booking panel', {
                expected: 'home booking form visible above the fold',
                observed: await page.locator('#home-booking').isVisible() ? 'visible' : 'hidden'
            });

            await page.locator('#home-pickup-date').fill('2026-08-03');
            await page.locator('#home-return-date').fill('2026-08-05');
            await page.locator('#home-pickup-time').selectOption('12:00');
            await page.locator('#home-return-time').selectOption('13:00');
            recorder.record('fill-home-schedule', 'Fill home schedule', {
                expected: '2026-08-03 to 2026-08-05',
                observed: '2026-08-03 to 2026-08-05'
            });
            await page.getByRole('button', { name: /see available cars/i }).click();

            await expect(page).toHaveURL(/\/fleet\.html\?/i);
            await page.waitForLoadState('domcontentloaded').catch(() => null);
            await settlePage(page, 350);
            await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-08-03');
            await expect(page.locator('#fleet-return-date')).toHaveValue('2026-08-05');
            recorder.record('arrive-fleet-with-schedule', 'Arrive at fleet with schedule', {
                expected: '/fleet.html with selected dates',
                observed: currentPathFromPageUrl(page.url())
            });

            return {
                message: 'Home booking panel carried schedule into fleet.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                steps: recorder.steps
            };
        }
    };
}

function createHomeBookingBarAvailabilityAction() {
    return {
        id: 'home-booking-bar-availability',
        label: 'Home booking bar submits dates and renders CRM availability in fleet',
        kind: 'form:availability-handoff',
        async run(page) {
            const recorder = createStepRecorder();
            let availabilityRequests = 0;

            await page.unroute('**/api/availability?**').catch(() => null);
            await page.route('**/api/availability?**', async (route) => {
                availabilityRequests += 1;
                const requestUrl = new URL(route.request().url());
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        status: 'ok',
                        schedule: {
                            startDate: requestUrl.searchParams.get('startDate'),
                            endDate: requestUrl.searchParams.get('endDate'),
                            pickupTime: requestUrl.searchParams.get('pickupTime'),
                            dropoffTime: requestUrl.searchParams.get('dropoffTime')
                        },
                        vehicles: [
                            { id: 'lamborghini-huracan-evo-spyder', available: true },
                            { id: 'ferrari-296-gts', available: true },
                            { id: 'porsche-992-gt3', available: true },
                            { id: 'lamborghini-urus-sport', available: true },
                            { id: 'mercedes-g63-amg', available: false },
                            { id: 'rolls-royce-cullinan-black-badge', available: true }
                        ]
                    })
                });
            });

            await page.locator('#home-pickup-date').fill('2026-08-07');
            await page.locator('#home-return-date').fill('2026-08-09');
            await page.locator('#home-pickup-time').selectOption('10:00');
            await page.locator('#home-return-time').selectOption('18:00');
            recorder.record('fill-home-booking-bar', 'Fill home booking bar schedule', {
                expected: '2026-08-07 10:00 to 2026-08-09 18:00',
                observed: '2026-08-07 10:00 to 2026-08-09 18:00'
            });

            await page.getByRole('button', { name: /see available cars/i }).click();
            await expect(page).toHaveURL(/\/fleet\.html\?/i);
            await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-08-07');
            await expect(page.locator('#fleet-return-date')).toHaveValue('2026-08-09');
            await expect(page.locator('#fleet-pickup-time')).toHaveValue('10:00');
            await expect(page.locator('#fleet-return-time')).toHaveValue('18:00');
            recorder.record('arrive-fleet-with-booking-bar-schedule', 'Arrive at fleet with booking bar schedule', {
                expected: 'fleet inputs preserve dates and times',
                observed: currentPathFromPageUrl(page.url())
            });

            await expect.poll(() => availabilityRequests).toBeGreaterThan(0);
            const unavailableCard = page.locator('.js-fleet-card[data-id="mercedes-g63-amg"]');
            await expect(unavailableCard.locator('.fleet-card__availability')).toHaveText(/Unavailable for these dates/i);
            await expect(unavailableCard.locator('.fleet-card__reserve')).toHaveAttribute('aria-disabled', 'true');
            recorder.record('crm-availability-blocks-reserve', 'CRM availability blocks unavailable car reserve CTA', {
                expected: 'Mercedes G63 AMG unavailable and Reserve disabled',
                observed: `${availabilityRequests} availability request(s)`
            });

            return {
                message: 'Home booking bar carried schedule into fleet and rendered CRM availability before reserve.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                steps: recorder.steps
            };
        }
    };
}

function createHomeCategoryFilterAction() {
    return {
        id: 'home-category-filter',
        label: 'Home category card opens fleet with type filter and schedule',
        kind: 'filter-handoff',
        async run(page) {
            const recorder = createStepRecorder();
            await page.locator('#home-pickup-date').fill('2026-08-14');
            await page.locator('#home-return-date').fill('2026-08-17');
            await page.locator('#home-pickup-time').selectOption('11:00');
            await page.locator('#home-return-time').selectOption('19:00');
            await page.locator('.fleet-category--sports').click();

            await expect(page).toHaveURL(/\/fleet\.html\?/i);
            await expect(page).toHaveURL(/type=sports/i);
            await expect(page).toHaveURL(/startDate=2026-08-14/i);
            await expect(page).toHaveURL(/endDate=2026-08-17/i);
            await expect(page.locator('.js-fleet-results-count')).toContainText('3 models visible');
            const allVisibleAreSports = await page.locator('.js-fleet-card:not([hidden])').evaluateAll((cards) => (
                cards.length === 3 && cards.every((card) => String(card.dataset.type || '').split(/\s+/).includes('sports'))
            ));
            if (!allVisibleAreSports) {
                throw new Error('Sports category did not leave exactly the sports fleet cards visible.');
            }

            recorder.record('home-category-filters-fleet', 'Home category applies fleet type filter', {
                expected: 'type=sports and 3 sports cards',
                observed: currentPathFromPageUrl(page.url())
            });
            await expect(page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first()).toHaveAttribute('href', /startDate=2026-08-14/i);
            recorder.record('home-category-preserves-schedule', 'Home category preserves schedule in Reserve CTAs', {
                expected: 'Reserve href includes selected dates',
                observed: await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().getAttribute('href') || ''
            });

            return {
                message: 'Home category opened Fleet with the selected type filter and schedule.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                steps: recorder.steps
            };
        }
    };
}

function createHomeFeaturedVehicleLandingAction() {
    return {
        id: 'home-featured-vehicle-landing',
        label: 'Home featured car opens the exact vehicle landing',
        kind: 'vehicle-landing-handoff',
        async run(page) {
            const recorder = createStepRecorder();
            await page.locator('#home-pickup-date').fill('2026-08-20');
            await page.locator('#home-return-date').fill('2026-08-22');
            await page.locator('#home-pickup-time').selectOption('10:00');
            await page.locator('#home-return-time').selectOption('18:00');
            await page.getByRole('link', { name: /View Ferrari 296 GTS/i }).click();

            await expect(page).toHaveURL(/\/ferrari-296-gts-rental-dubai\.html$/i);
            await expect(page.locator('h1')).toContainText(/296 GTS/i);
            await expect(page.locator('#vehicle-booking')).toBeVisible();
            await expect(page.locator('#vehicle-booking input[name="car"]')).toHaveValue('Ferrari 296 GTS');
            recorder.record('home-featured-opens-exact-vehicle-landing', 'Home featured car opens exact vehicle landing', {
                expected: 'Ferrari 296 GTS landing with booking panel',
                observed: currentPathFromPageUrl(page.url())
            });

            return {
                message: 'Home featured car opened the exact vehicle landing.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                steps: recorder.steps
            };
        }
    };
}

function createFleetFilterAction() {
    return {
        id: 'fleet-filter-cycle',
        label: 'Fleet filters keep schedule while cycling brands',
        kind: 'filter',
        async run(page) {
            const recorder = createStepRecorder();
            await page.locator('#fleet-pickup-date').fill('2026-08-10');
            await page.locator('#fleet-return-date').fill('2026-08-12');
            await page.locator('#fleet-pickup-time').fill('10:00');
            await page.locator('#fleet-return-time').fill('18:00');
            recorder.record('fill-fleet-schedule', 'Fill fleet schedule', {
                expected: '2026-08-10 to 2026-08-12',
                observed: '2026-08-10 to 2026-08-12'
            });

            const brandSelect = page.locator('.js-fleet-brand-select');
            const brandValues = await brandSelect.locator('option').evaluateAll((options) => (
                options
                    .map((option) => option.value)
                    .filter((value) => value && value !== 'all')
            ));

            const seen = [];

            for (const brand of brandValues) {
                await brandSelect.selectOption(brand);
                await page.waitForTimeout(200);
                const countLabel = (await page.locator('.js-fleet-results-count').textContent() || '').trim();
                const visibleCards = await page.locator('.js-fleet-card:not([hidden])').count();
                if (visibleCards < 1) {
                    throw new Error(`Brand ${brand} left the fleet with no visible cards.`);
                }
                seen.push(`${brand}:${countLabel || visibleCards}`);
                recorder.record(`filter-brand-${brand}`, `Filter brand ${brand}`, {
                    expected: 'at least 1 visible car',
                    observed: `${countLabel || `${visibleCards} visible card(s)`}`
                });
            }

            await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-08-10');
            await expect(page.locator('#fleet-return-date')).toHaveValue('2026-08-12');

            return {
                message: `Fleet filters cycled successfully (${seen.join(', ')})`,
                observedUrl: page.url(),
                steps: recorder.steps
            };
        }
    };
}

function createFleetResetAction(viewport = {}) {
    return {
        id: 'fleet-reset-filters',
        label: 'Fleet reset button clears active filters',
        kind: 'button:state',
        async run(page) {
            const recorder = createStepRecorder();
            await page.locator('#fleet-pickup-date').fill('2026-08-10');
            await page.locator('#fleet-return-date').fill('2026-08-12');
            await page.locator('#fleet-pickup-time').fill('10:00');
            await page.locator('#fleet-return-time').fill('18:00');

            const brandSelect = page.locator('.js-fleet-brand-select');
            await brandSelect.selectOption('mercedes');
            await page.waitForTimeout(200);
            await expect(brandSelect).toHaveValue('mercedes');
            recorder.record('set-mercedes-filter', 'Set Mercedes filter', {
                expected: 'brand=mercedes',
                observed: await brandSelect.inputValue()
            });

            if (viewport.isMobile) {
                const filterToggle = page.locator('.fleet-mobile-filter-toggle').first();
                if (await filterToggle.isVisible().catch(() => false)) {
                    await filterToggle.click();
                    await expect(page.locator('.js-fleet-browser')).toHaveClass(/fleet-filters-open/);
                    recorder.record('open-mobile-filter-sheet-for-reset', 'Open mobile filter sheet for reset', {
                        expected: 'fleet filters open',
                        observed: await page.locator('.js-fleet-browser').getAttribute('class') || ''
                    });
                }
            }

            const resetButton = page.locator('.js-fleet-reset:visible').first();
            await expect(resetButton).toBeVisible();
            await resetButton.scrollIntoViewIfNeeded();
            await resetButton.click();
            await settlePage(page, 250);

            await expect(brandSelect).toHaveValue('all');
            await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-08-10');
            await expect(page.locator('#fleet-return-date')).toHaveValue('2026-08-12');

            const visibleCards = await page.locator('.js-fleet-card:not([hidden])').count();
            if (visibleCards < 1) {
                throw new Error('Fleet reset left the list with no visible cars.');
            }
            recorder.record('reset-fleet-filters', 'Reset fleet filters', {
                expected: 'brand=all and visible cars remain',
                observed: `brand=${await brandSelect.inputValue()}; visibleCards=${visibleCards}`
            });

            return {
                message: `Fleet reset restored all brands with ${visibleCards} visible cars while preserving the schedule.`,
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                interactionType: 'state-change',
                steps: recorder.steps
            };
        }
    };
}

function createFleetMobileFilterSheetAction() {
    return {
        id: 'fleet-mobile-filter-sheet',
        label: 'Fleet mobile filter sheet opens and closes',
        kind: 'button:state',
        async run(page) {
            const recorder = createStepRecorder();
            const filterToggle = page.locator('.fleet-mobile-filter-toggle').first();
            await expect(filterToggle).toBeVisible();

            await filterToggle.click();
            await expect(page.locator('.js-fleet-browser')).toHaveClass(/fleet-filters-open/);
            await expect(page.locator('.fleet-sidebar')).toHaveAttribute('role', 'dialog');
            recorder.record('open-mobile-filter-sheet', 'Open mobile filter sheet', {
                expected: 'filter sheet open as dialog',
                observed: await page.locator('.fleet-sidebar').getAttribute('role') || ''
            });

            const closeButton = page.locator('.fleet-filter-close--top').first();
            await expect(closeButton).toBeVisible();
            await closeButton.click();
            await expect(page.locator('.js-fleet-browser')).not.toHaveClass(/fleet-filters-open/);
            recorder.record('close-mobile-filter-sheet', 'Close mobile filter sheet', {
                expected: 'filter sheet closed',
                observed: await page.locator('.js-fleet-browser').getAttribute('class') || ''
            });

            return {
                message: 'Mobile filter sheet opened as a dialog and returned to results.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                interactionType: 'state-change',
                steps: recorder.steps
            };
        }
    };
}

function createFleetReserveAction() {
    return {
        id: 'fleet-reserve-first-visible',
        label: 'Fleet reserve CTA opens reserve with schedule',
        kind: 'reserve-handoff',
        async run(page) {
            const recorder = createStepRecorder();
            await page.locator('#fleet-pickup-date').fill('2026-08-10');
            await page.locator('#fleet-return-date').fill('2026-08-12');
            await page.locator('#fleet-pickup-time').fill('10:00');
            await page.locator('#fleet-return-time').fill('18:00');
            await page.locator('.js-fleet-brand-select').selectOption('mercedes');
            recorder.record('choose-mercedes-schedule', 'Choose Mercedes with schedule', {
                expected: 'Mercedes and 2026-08-10 to 2026-08-12',
                observed: 'Mercedes and 2026-08-10 to 2026-08-12'
            });
            await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();

            await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
            await expect(page.locator('body')).toHaveClass(/reserve-page/);
            await expect(page.locator('.lab-header')).toHaveCount(1);
            await expect(page.locator('.site-v2-footer')).toHaveCount(1);
            await expect(page.locator('#selectedCar')).toContainText('G63');
            await expect(page.locator('#startDate')).toHaveValue('2026-08-10');
            await expect(page.locator('#endDate')).toHaveValue('2026-08-12');
            recorder.record('arrive-reserve-with-car-and-schedule', 'Arrive at reserve with car and schedule', {
                expected: 'reserve page with G63 and selected dates',
                observed: currentPathFromPageUrl(page.url())
            });

            return {
                message: 'Reserve CTA preserved the selected schedule.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                expectedTargetPath: currentPathFromPageUrl(page.url()),
                interactionType: 'navigation',
                steps: recorder.steps
            };
        }
    };
}

function createFleetAllCarsCheckoutAction() {
    return {
        id: 'fleet-all-cars-checkout',
        label: 'Fleet every car completes checkout with mocked payment',
        kind: 'checkout',
        enableStripeMock: true,
        async run(page) {
            const recorder = createStepRecorder();
            const origin = new URL(page.url()).origin;
            const fleetUrl = `${origin}/fleet.html`;
            const schedule = FLEET_CHECKOUT_SCHEDULE;

            await expect(page.locator('.js-fleet-card').first()).toBeVisible();
            await expect(page.locator('.js-fleet-card .fleet-card__reserve').first()).toBeVisible();

            const cars = await collectFleetCheckoutCars(page);
            if (cars.length < 1) {
                throw new Error('No fleet cars were available for the checkout matrix.');
            }

            recorder.record('discover-fleet-cars', 'Discover fleet cars for checkout matrix', {
                expected: 'all visible fleet cars',
                observed: cars.map((car) => `${car.title}:${car.price}`).join(', ')
            });

            for (const car of cars) {
                const stepPrefix = slugify(`fleet-${car.id || car.title}`);

                await page.goto(fleetUrl, {
                    waitUntil: 'domcontentloaded'
                });
                await settlePage(page, 350);
                await expect(page.locator(`.js-fleet-card[data-id="${escapeCssAttribute(car.id)}"]`)).toBeVisible();
                await fillFleetSchedule(page, schedule);

                const card = page.locator(`.js-fleet-card[data-id="${escapeCssAttribute(car.id)}"]`).first();
                const reserveLink = card.locator('.fleet-card__reserve').first();
                await expect(reserveLink).toBeVisible();
                recorder.record(`${stepPrefix}-choose-from-fleet`, `${car.title}: choose from fleet`, {
                    expected: `${car.title} with ${schedule.startDate} to ${schedule.endDate}`,
                    observed: `${await card.locator('.fleet-card__title').first().textContent() || ''} -> ${await reserveLink.getAttribute('href') || ''}`
                });

                await reserveLink.click();
                await assertReserveIntent(page, {
                    carTitle: car.title,
                    price: car.price,
                    schedule
                });
                recorder.record(`${stepPrefix}-arrive-reserve`, `${car.title}: arrive at reserve`, {
                    expected: `${car.title} reserve page with selected schedule and price`,
                    observed: currentPathFromPageUrl(page.url())
                });

                await completeReserveCheckout(page, recorder, {
                    stepPrefix,
                    carTitle: car.title,
                    schedule
                });
            }

            return {
                message: `Completed mocked checkout for ${cars.length} fleet cars: ${cars.map((car) => car.title).join(', ')}.`,
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                expectedTargetPath: '/',
                interactionType: 'checkout',
                steps: recorder.steps
            };
        }
    };
}

function createContactSubmitAction() {
    return {
        id: 'contact-submit',
        label: 'Contact form submits with demo lead',
        kind: 'form',
        async run(page) {
            const recorder = createStepRecorder();
            await page.locator('#contactName').fill(contactLead.name);
            await page.locator('#contactEmail').fill(contactLead.email);
            await page.locator('#contactPhone').fill(contactLead.phone);
            await page.locator('#contactSubject').selectOption(contactLead.subject);
            await page.locator('#contactMessage').fill(contactLead.message);
            recorder.record('fill-contact-lead', 'Fill contact lead', {
                expected: contactLead.email,
                observed: await page.locator('#contactEmail').inputValue()
            });
            await page.locator('#contactSubmitButton').click();

            await expect(page.locator('#contactFormStatus')).toContainText('Message sent successfully');
            recorder.record('submit-contact-lead', 'Submit contact lead', {
                expected: 'Message sent successfully',
                observed: (await page.locator('#contactFormStatus').textContent() || '').trim()
            });

            return {
                message: 'Contact form reached the success state.',
                observedUrl: page.url(),
                steps: recorder.steps
            };
        }
    };
}

function createContactValidationAction() {
    return {
        id: 'contact-required-validation',
        label: 'Contact form blocks empty submit',
        kind: 'validation',
        async run(page) {
            const recorder = createStepRecorder();
            await page.locator('#contactSubmitButton').click();
            await expect(page.locator('#contactFormStatus')).toContainText('Please complete all required fields.');
            recorder.record('block-empty-contact-submit', 'Block empty contact submit', {
                expected: 'Please complete all required fields.',
                observed: (await page.locator('#contactFormStatus').textContent() || '').trim()
            });

            return {
                message: 'Contact form shows the required-fields validation before submit.',
                observedUrl: page.url(),
                steps: recorder.steps
            };
        }
    };
}

function createVehicleBookingAction() {
    return {
        id: 'vehicle-booking-submit',
        label: 'Vehicle booking form hands off to reserve',
        kind: 'form',
        async run(page) {
            const recorder = createStepRecorder();
            const form = page.locator('.js-vehicle-booking-form').first();
            await expect(form).toBeVisible();
            await form.locator('input[name="startDate"]').fill('2026-08-14');
            await form.locator('input[name="endDate"]').fill('2026-08-16');
            await form.locator('input[name="pickupTime"]').fill('11:00');
            await form.locator('input[name="dropoffTime"]').fill('17:00');
            recorder.record('fill-vehicle-schedule', 'Fill vehicle booking schedule', {
                expected: '2026-08-14 to 2026-08-16',
                observed: '2026-08-14 to 2026-08-16'
            });
            await form.getByRole('button', { name: /check availability/i }).click();

            await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
            await expect(page.locator('#selectedCar')).not.toHaveText('');
            await expect(page.locator('#startDate')).toHaveValue('2026-08-14');
            await expect(page.locator('#endDate')).toHaveValue('2026-08-16');
            recorder.record('vehicle-arrives-reserve', 'Vehicle booking opens reserve', {
                expected: 'reserve page with selected dates',
                observed: currentPathFromPageUrl(page.url())
            });

            return {
                message: 'Vehicle booking form preserved the schedule into reserve.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                expectedTargetPath: currentPathFromPageUrl(page.url()),
                interactionType: 'navigation',
                steps: recorder.steps
            };
        }
    };
}

async function createModelCardActions(page) {
    const count = await page.locator('.model-card').count();
    const actions = [];

    for (let index = 0; index < count; index += 1) {
        const title = (await page.locator('.model-card').nth(index).locator('h3').first().textContent() || `Model ${index + 1}`).trim();

        actions.push({
            id: `model-card-book-${index + 1}`,
            label: `Model card book: ${title}`,
            kind: 'reserve-handoff',
            async run(actionPage) {
                const recorder = createStepRecorder();
                const card = actionPage.locator('.model-card').nth(index);
                await expect(card).toBeVisible();
                recorder.record('find-model-card', `Find model card ${title}`, {
                    expected: title,
                    observed: (await card.locator('h3').first().textContent() || '').trim()
                });
                await card.getByRole('link', { name: /^book$/i }).click();
                await expect(actionPage).toHaveURL(/\/app\/reserve\/page\.html\?/i);
                await expect(actionPage.locator('#selectedCar')).toContainText(title.replace(/\s+/g, ' ').trim());
                recorder.record('model-card-book-reserve', `Book ${title} from model card`, {
                    expected: 'reserve page with selected model',
                    observed: currentPathFromPageUrl(actionPage.url())
                });

                return {
                    message: `${title} book CTA opened reserve.`,
                    observedUrl: actionPage.url(),
                    observedPath: currentPathFromPageUrl(actionPage.url()),
                    expectedTargetPath: currentPathFromPageUrl(actionPage.url()),
                    interactionType: 'navigation',
                    steps: recorder.steps
                };
            }
        });

        const detailLink = page.locator('.model-card').nth(index).getByRole('link', { name: /detail page|open/i });
        if (await detailLink.count() > 0) {
            actions.push({
                id: `model-card-detail-${index + 1}`,
                label: `Model card detail: ${title}`,
                kind: 'detail',
                async run(actionPage) {
                    const recorder = createStepRecorder();
                    const card = actionPage.locator('.model-card').nth(index);
                    await expect(card).toBeVisible();
                    recorder.record('find-model-card', `Find model card ${title}`, {
                        expected: title,
                        observed: (await card.locator('h3').first().textContent() || '').trim()
                    });
                    await card.getByRole('link', { name: /detail page|open/i }).click();
                    await expect(actionPage).toHaveURL(/-rental-dubai\.html$/i);
                    await expect(actionPage.locator('h1')).toBeVisible();
                    recorder.record('model-card-open-detail', `Open ${title} detail page`, {
                        expected: 'vehicle detail page',
                        observed: currentPathFromPageUrl(actionPage.url())
                    });

                    return {
                        message: `${title} detail page opened successfully.`,
                        observedUrl: actionPage.url(),
                        observedPath: currentPathFromPageUrl(actionPage.url()),
                        expectedTargetPath: currentPathFromPageUrl(actionPage.url()),
                        interactionType: 'navigation',
                        steps: recorder.steps
                    };
                }
            });
        }
    }

    return actions;
}

function createReserveCheckoutAction() {
    return {
        id: 'reserve-complete-checkout',
        label: 'Reserve flow completes with mocked payment',
        kind: 'checkout',
        enableStripeMock: true,
        async run(page) {
            const recorder = createStepRecorder();
            await page.goto(`${new URL(page.url()).origin}/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-08-20&endDate=2026-08-22&pickupTime=10:00&dropoffTime=18:00`, {
                waitUntil: 'domcontentloaded'
            });
            await settlePage(page, 350);
            recorder.record('load-reserve-with-intent', 'Load reserve with booking intent', {
                expected: 'Mercedes G63 AMG with 2026-08-20 to 2026-08-22',
                observed: currentPathFromPageUrl(page.url())
            });

            await completeReserveCheckout(page, recorder, {
                stepPrefix: '',
                carTitle: '',
                schedule: {
                    startDate: '2026-08-20',
                    endDate: '2026-08-22',
                    pickupTime: '10:00',
                    dropoffTime: '18:00'
                }
            });

            return {
                message: 'Reserve flow reached success redirect with mocked payment.',
                observedUrl: page.url(),
                observedPath: currentPathFromPageUrl(page.url()),
                expectedTargetPath: '/',
                interactionType: 'checkout',
                steps: recorder.steps
            };
        }
    };
}

function createReserveStep1ValidationAction() {
    return {
        id: 'reserve-step1-validation',
        label: 'Reserve step 1 blocks incomplete schedule',
        kind: 'validation',
        async run(page) {
            const recorder = createStepRecorder();
            await page.goto(`${new URL(page.url()).origin}/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-08-20&endDate=2026-08-22&pickupTime=10:00&dropoffTime=18:00`, {
                waitUntil: 'domcontentloaded'
            });
            await settlePage(page, 350);

            await expect(page.locator('#continueToPaymentBtn')).toBeDisabled();
            await expect(page.locator('#step1')).toHaveClass(/active/);
            recorder.record('block-incomplete-schedule', 'Block incomplete reserve schedule', {
                expected: 'continue disabled on step1',
                observed: `disabled=${await page.locator('#continueToPaymentBtn').isDisabled()}`
            });

            return {
                message: 'Reserve step 1 keeps the next CTA disabled until the schedule is complete.',
                observedUrl: page.url(),
                steps: recorder.steps
            };
        }
    };
}

function createReserveStep2ValidationAction() {
    return {
        id: 'reserve-step2-invalid-schedule',
        label: 'Reserve step 1 blocks invalid schedule',
        kind: 'validation',
        async run(page) {
            const recorder = createStepRecorder();
            await page.goto(`${new URL(page.url()).origin}/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-08-20&endDate=2026-08-22&pickupTime=10:00&dropoffTime=18:00`, {
                waitUntil: 'domcontentloaded'
            });
            await settlePage(page, 350);

            await page.locator('#startDate').fill('2026-08-20');
            await page.locator('#endDate').fill('2026-08-20');
            await page.locator('#pickupTime').selectOption('18:00');
            await page.locator('#dropoffTime').selectOption('10:00');
            await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
            const continueButton = page.locator('#continueToPaymentBtn');
            const isDisabled = await continueButton.isDisabled();

            if (!isDisabled) {
                await continueButton.click();
            }

            await expect(page.locator('#step1Validation')).toContainText('Return date/time must be after delivery date/time.');
            await expect(page.locator('#step1')).toHaveClass(/active/);
            recorder.record('block-invalid-return-schedule', 'Block invalid return schedule', {
                expected: 'Return date/time must be after delivery date/time.',
                observed: (await page.locator('#step1Validation').textContent() || '').trim()
            });

            return {
                message: isDisabled
                    ? 'Reserve step 1 keeps the next CTA disabled for an invalid return schedule.'
                    : 'Reserve step 1 rejects a return that is earlier than the delivery schedule.',
                observedUrl: page.url(),
                steps: recorder.steps
            };
        }
    };
}

function dedupeActions(actions) {
    const seen = new Set();
    return actions.filter((action) => {
        if (!action || !action.id || seen.has(action.id)) {
            return false;
        }
        seen.add(action.id);
        return true;
    });
}

async function buildRouteActions(route, page, options, viewport) {
    const meta = await collectPageMeta(page);
    const actions = [];
    const discovered = await discoverInteractiveTargets(page, route, options);

    if (route === '/' && !viewport.isMobile) {
        actions.push(
            createHomeNavigationAction(),
            createHomeMegaMenuAction(),
            createHomeCarsTypesFilterAction()
        );
    }

    if (route === '/') {
        actions.push(
            createHomeOverlaySearchAction(),
            createHomeBookingBarAvailabilityAction(),
            createHomeCategoryFilterAction(),
            createHomeFeaturedVehicleLandingAction()
        );
    }

    if (meta.hasFleetBrowser) {
        actions.push(
            createFleetFilterAction(),
            createFleetResetAction(viewport),
            createFleetReserveAction()
        );

        if (viewport.isMobile) {
            actions.push(createFleetMobileFilterSheetAction());
        }

        if (!viewport.isMobile) {
            actions.push(createFleetAllCarsCheckoutAction());
        }
    }

    if (meta.hasContactForm) {
        actions.push(createContactValidationAction());
        actions.push(createContactSubmitAction());
    }

    if (meta.hasVehicleBooking) {
        actions.push(createVehicleBookingAction());
    }

    if (meta.hasVehicleMediaGallery) {
        actions.push(createVehicleGalleryLightboxAction());
    }

    if (meta.hasServicesSelector) {
        actions.push(createServicesLaneSelectorAction());
    }

    if (meta.modelCardCount > 0) {
        actions.push(...await createModelCardActions(page));
    }

    if (meta.hasReserveFlow || route === '/app/reserve/page.html') {
        actions.push(createReserveStep1ValidationAction());
        actions.push(createReserveStep2ValidationAction());
        actions.push(createReserveCheckoutAction());
    }

    if (meta.hasContactProtocolLinks) {
        actions.push(createContactProtocolLinksAction());
    }

    actions.push(...discovered.links.map(createLinkAction));
    actions.push(...discovered.toggleButtons.map(createToggleButtonAction));
    actions.push(...discovered.genericButtons.map(createGenericButtonAction));
    actions.push(...discovered.summaries.map(createSummaryToggleAction));
    if (options.deep) {
        for (const select of discovered.selects) {
            select.options
                .filter((option) => option.value !== select.currentValue)
                .forEach((option) => actions.push(createSelectOptionAction(select, option)));
        }
    } else {
        actions.push(...discovered.selects.map(createSelectCycleAction));
    }

    return {
        meta,
        discoveredStats: discovered.stats || {},
        actions: dedupeActions(actions)
    };
}

async function auditRoute(browser, baseUrl, route, viewport, runDir, options) {
    const session = await openRouteSession(browser, baseUrl, route, { viewport });
    const routeDir = path.join(runDir, routeFileStem(route), viewport.name);
    ensureDir(routeDir);

    try {
        const { meta, discoveredStats, actions } = await buildRouteActions(route, session.page, options, viewport);
        const title = meta.title || '';
        const actionsReport = [];

        for (const action of actions) {
            actionsReport.push(await runAction(browser, baseUrl, route, viewport, routeDir, action));
        }

        return {
            route,
            viewport: viewport.name,
            title,
            actions: actionsReport,
            consoleErrors: extractConsoleErrors(session.consoleErrors),
            requestFailures: session.requestFailures.slice(0, 10),
            coverage: {
                discoveredStats
            }
        };
    } finally {
        await session.context.close();
    }
}

async function runFunctionalAgent(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;
    const selectedRoutes = (args.routes && args.routes.length > 0
        ? args.routes
        : Object.keys(PUBLIC_PAGE_FILE_MAP))
        .map((route) => normalizeRoute(route));
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
                pages.push(await auditRoute(browser, baseUrl, route, viewport, runDir, args));
            }
        }

        const humanReviewArtifacts = buildFunctionalHumanReviewArtifacts(pages, runDir);
        const enrichedPages = humanReviewArtifacts.pages;
        const customerJourneys = buildCustomerJourneyCoverage(enrichedPages);
        const coverageProfile = buildCoverageProfile({
            pages: enrichedPages,
            selectedRoutes,
            selectedViewports,
            options: args
        });
        const functionalReview = buildFunctionalHumanReview({ pages: enrichedPages, customerJourneys, coverageProfile });
        const report = {
            generatedAt,
            baseUrl,
            summary: buildReportSummary(enrichedPages, functionalReview),
            humanReview: {
                kind: humanReviewArtifacts.manifest.kind,
                directory: humanReviewArtifacts.manifest.directory,
                totalFailures: humanReviewArtifacts.manifest.totalFailures,
                screenshots: humanReviewArtifacts.manifest.screenshots,
                missingScreenshots: humanReviewArtifacts.manifest.missingScreenshots,
                manifestPath: path.join(humanReviewArtifacts.manifest.directory, 'manifest.json')
            },
            customerJourneys,
            functionalReview,
            pages: enrichedPages
        };
        report.auditMemory = compareReportToApprovedMemory(report, { kind: 'functional' });

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
    const { runDir, report } = await runFunctionalAgent({ argv: process.argv.slice(2) });

    console.log(`Functional agent completed: ${runDir}`);
    console.log(`routes=${report.summary.totalRoutes} actions=${report.summary.totalActions} failed=${report.summary.failedActions}`);
    console.log(`customerScenarios=${report.customerJourneys.summary.totalScenarios} covered=${report.customerJourneys.summary.covered} partial=${report.customerJourneys.summary.partial} failed=${report.customerJourneys.summary.failed}`);
    console.log(`functionalStatus=${report.functionalReview.status} findings=${report.functionalReview.summary.total} hardFails=${report.functionalReview.summary.hardFails} mode=${report.summary.coverageMode} truncatedTargets=${report.summary.truncatedTargets}`);

    if (report.functionalReview.status === 'bad') {
        process.exitCode = 1;
    }

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
        console.error('Functional agent failed.');
        console.error(formatError(error));
        process.exit(1);
    });
}

module.exports = {
    buildCoverageProfile,
    buildMarkdownReport,
    buildReportSummary,
    parseArgs,
    runFunctionalAgent
};
