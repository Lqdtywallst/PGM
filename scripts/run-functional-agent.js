const fs = require('fs');
const net = require('net');
const path = require('path');

const { chromium, expect } = require('@playwright/test');

const {
    PUBLIC_PAGE_FILE_MAP
} = require(path.join(__dirname, '..', 'server', 'public-page-map.js'));
const {
    startStaticServer,
    stopProcess
} = require(path.join(__dirname, '..', 'server', 'site-audit-utils.js'));
const {
    getViewportCoverageMatrix
} = require(path.join(__dirname, '..', 'server', 'design-system-contract.js'));
const {
    buildCustomerJourneyCoverage,
    buildCustomerJourneyMarkdownSection
} = require(path.join(__dirname, '..', 'server', 'customer-journey-contract.js'));
const {
    buildFunctionalHumanReview,
    buildFunctionalReviewMarkdownSection
} = require(path.join(__dirname, '..', 'server', 'functional-audit-core.js'));
const {
    createConsoleTracker,
    normalizeConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require(path.join(__dirname, '..', 'tests', 'e2e', 'support', 'site-helpers.js'));
const {
    contactLead,
    reservationGuest
} = require(path.join(__dirname, '..', 'test-data', 'users.json'));
const {
    compareReportToApprovedMemory,
    formatAuditMemoryRegression
} = require(path.join(__dirname, '..', 'server', 'audit-memory-core.js'));

const repoRoot = path.resolve(__dirname, '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'functional-agent');
const VIEWPORTS = Object.freeze(getViewportCoverageMatrix('functional'));
const DEFAULT_ACTION_LIMITS = Object.freeze({
    maxLinksPerPage: 8,
    maxButtonsPerPage: 6,
    maxSummariesPerPage: 4,
    maxSelectsPerPage: 4,
    maxOptionsPerSelect: 8
});
const DEEP_ACTION_LIMITS = Object.freeze({
    maxLinksPerPage: Number.MAX_SAFE_INTEGER,
    maxButtonsPerPage: Number.MAX_SAFE_INTEGER,
    maxSummariesPerPage: Number.MAX_SAFE_INTEGER,
    maxSelectsPerPage: Number.MAX_SAFE_INTEGER,
    maxOptionsPerSelect: Number.MAX_SAFE_INTEGER
});

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
        lines.push(`- failed actions: ${pageFailures.length}`);
        lines.push(`- console errors: ${page.consoleErrors.length}`);
        lines.push(`- request failures: ${page.requestFailures.length}`);

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
                                amount: 165000,
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
        hasFleetBrowser: Boolean(document.querySelector('.js-fleet-brand-select'))
    }));
}

async function discoverInteractiveTargets(page, currentRoute, options) {
    return page.evaluate(({ route, maxLinks, maxButtons, maxSummaries, maxSelects, maxOptions }) => {
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

        const dedupe = {
            links: new Set(),
            buttons: new Set(),
            summaries: new Set(),
            selects: new Set()
        };
        const output = {
            links: [],
            toggleButtons: [],
            summaries: [],
            selects: [],
            stats: {
                visibleLinks: 0,
                visibleToggleButtons: 0,
                visibleSummaries: 0,
                visibleSelects: 0,
                visibleSelectOptions: 0,
                collectedLinks: 0,
                collectedToggleButtons: 0,
                collectedSummaries: 0,
                collectedSelects: 0,
                collectedSelectOptions: 0,
                truncatedLinks: 0,
                truncatedToggleButtons: 0,
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
            limitedPush(output.links, {
                label,
                href,
                absoluteHref: absolute.href,
                targetPath: `${normalizedPath}${absolute.search}${absolute.hash}`,
                kind,
                behavior: link.matches('[role="tab"], [data-service-selector]') ? 'tab' : 'navigation',
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
        output.stats.collectedSummaries = output.summaries.length;
        output.stats.collectedSelects = output.selects.length;
        output.stats.collectedSelectOptions = output.selects.reduce((total, select) => total + select.options.length, 0);
        output.stats.truncatedLinks = Math.max(0, output.stats.visibleLinks - output.links.length);
        output.stats.truncatedToggleButtons = Math.max(0, output.stats.visibleToggleButtons - output.toggleButtons.length);
        output.stats.truncatedSummaries = Math.max(0, output.stats.visibleSummaries - output.summaries.length);
        output.stats.truncatedSelects = Math.max(0, output.stats.visibleSelects - output.selects.length);
        output.stats.truncatedSelectOptions = Math.max(0, output.stats.visibleSelectOptions - output.stats.collectedSelectOptions);

        return output;
    }, {
        route: currentRoute,
        maxLinks: options.maxLinksPerPage,
        maxButtons: options.maxButtonsPerPage,
        maxSummaries: options.maxSummariesPerPage,
        maxSelects: options.maxSelectsPerPage,
        maxOptions: options.maxOptionsPerSelect
    });
}

function extractConsoleErrors(errors) {
    return normalizeConsoleErrors(errors).slice(0, 10);
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
            consoleErrors: extractConsoleErrors(session.consoleErrors),
            requestFailures: session.requestFailures.slice(0, 10),
            screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : ''
        };
    } finally {
        await session.context.close();
    }
}

function createLinkAction(descriptor) {
    return {
        id: `link-${slugify(descriptor.label)}-${slugify(descriptor.href)}`,
        label: `Link: ${descriptor.label}`,
        kind: descriptor.behavior === 'tab' ? 'tab-link' : `link:${descriptor.kind}`,
        async run(page) {
            if (descriptor.kind === 'external') {
                const isValidExternal = /^(tel:|mailto:|https?:\/\/|\/\/)/i.test(descriptor.absoluteHref);
                if (!isValidExternal) {
                    throw new Error(`External href is malformed: ${descriptor.absoluteHref}`);
                }

                return {
                    message: `External link looks valid: ${descriptor.absoluteHref}`,
                    observedUrl: page.url()
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
                    observedUrl: page.url()
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
                    observedUrl: page.url()
                };
            }

            const expected = new URL(descriptor.absoluteHref);
            const expectedPath = `${normalizeRoute(expected.pathname)}${expected.search}${expected.hash}`;
            const reachedExpectedUrl = page.waitForURL((url) => {
                const observedPath = `${normalizeRoute(url.pathname)}${url.search}${url.hash}`;
                return observedPath === expectedPath;
            }, { timeout: 5000 }).catch(() => null);

            await locator.click();
            await reachedExpectedUrl;
            await page.waitForLoadState('domcontentloaded').catch(() => null);
            await settlePage(page, 250);

            const observed = new URL(page.url());
            const observedPath = `${normalizeRoute(observed.pathname)}${observed.search}${observed.hash}`;

            if (observedPath !== expectedPath) {
                throw new Error(`Expected ${expectedPath} but landed on ${observedPath}`);
            }

            return {
                message: `Reached ${expectedPath}`,
                observedUrl: page.url()
            };
        }
    };
}

function createServicesLaneSelectorAction() {
    return {
        id: 'services-lane-circles-update-panel',
        label: 'Services lane circles update the preview panel and CTA',
        kind: 'service-selector',
        async run(page) {
            const selectors = page.locator('[data-services-selector] [data-service-selector]');
            const count = await selectors.count();

            if (count < 2) {
                throw new Error(`Expected at least 2 service circles, found ${count}.`);
            }

            const observedTitles = new Set();

            for (let index = 0; index < count; index += 1) {
                const selector = selectors.nth(index);
                await expect(selector).toBeVisible();

                const expectedTitle = (await selector.getAttribute('data-service-title') || '').trim();
                const expectedHref = (await selector.getAttribute('data-service-primary-href') || '').trim();
                const selectorId = await selector.getAttribute('id') || '';

                if (!expectedTitle || !expectedHref) {
                    throw new Error(`Service circle ${selectorId || index + 1} is missing title or destination metadata.`);
                }

                await selector.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
                await selector.click();
                await settlePage(page, 250);

                const state = await page.evaluate(({ expectedTitle, expectedHref, selectorId }) => {
                    const panel = document.querySelector('[data-service-panel]');
                    const title = panel?.querySelector('[data-service-title]')?.textContent?.trim() || '';
                    const primary = panel?.querySelector('[data-service-primary]');
                    const primaryHref = primary?.getAttribute('href') || '';
                    const active = document.querySelector('[data-service-selector].is-active');
                    const selected = selectorId
                        ? document.getElementById(selectorId)?.getAttribute('aria-selected')
                        : '';
                    const panelRect = panel?.getBoundingClientRect();

                    return {
                        title,
                        primaryHref,
                        activeId: active?.id || '',
                        selected,
                        panelVisible: Boolean(panelRect && panelRect.width > 20 && panelRect.height > 20),
                        expectedHrefMatches: primaryHref === expectedHref
                    };
                }, { expectedTitle, expectedHref, selectorId });

                if (state.title !== expectedTitle) {
                    throw new Error(`Service circle ${selectorId || index + 1} did not update the panel title. Expected "${expectedTitle}", saw "${state.title}".`);
                }

                if (!state.expectedHrefMatches) {
                    throw new Error(`Service circle ${selectorId || index + 1} did not update the primary CTA href. Expected "${expectedHref}", saw "${state.primaryHref}".`);
                }

                if (selectorId && state.activeId !== selectorId && state.selected !== 'true') {
                    throw new Error(`Service circle ${selectorId} did not become the active selected circle.`);
                }

                if (!state.panelVisible) {
                    throw new Error(`Service circle ${selectorId || index + 1} updated hidden content instead of a visible panel.`);
                }

                observedTitles.add(state.title);
            }

            if (observedTitles.size < Math.min(2, count)) {
                throw new Error('Service circles did not produce distinct visible panel states.');
            }

            return {
                message: `Verified ${count} service circles update a visible panel and matching CTA.`,
                observedUrl: page.url()
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
                await page.goto(`${origin}/`, {
                    waitUntil: 'domcontentloaded'
                });
                await settlePage(page, 250);
            }

            return {
                message: 'Main navigation routes opened with visible headings.',
                observedUrl: page.url()
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
            await page.getByRole('button', { name: 'Cars Brands' }).click();
            await expect(page.locator('#lab-nav-brands-panel')).toBeVisible();
            const visibleLinks = await page.locator('#lab-nav-brands-panel a[href]').count();
            if (visibleLinks < 5) {
                throw new Error(`Expected at least 5 brand links, found ${visibleLinks}`);
            }

            return {
                message: `Mega menu opened with ${visibleLinks} visible brand links.`,
                observedUrl: page.url()
            };
        }
    };
}

function createHomeOverlaySearchAction() {
    return {
        id: 'home-overlay-search',
        label: 'Home booking overlay submits into fleet',
        kind: 'form',
        async run(page) {
            await page.getByRole('button', { name: /start with dates/i }).click();
            await expect(page.locator('#hero-lab-overlay')).toHaveAttribute('aria-hidden', 'false');

            await page.locator('#hero-lab-pickup-date').fill('2026-08-03');
            await page.locator('#hero-lab-return-date').fill('2026-08-05');
            await page.locator('#hero-lab-pickup-time').selectOption('12:00');
            await page.locator('#hero-lab-return-time').selectOption('13:00');
            await page.locator('.hero-lab-overlay__submit').click();

            await expect(page).toHaveURL(/\/fleet\.html\?/i);
            await page.waitForLoadState('domcontentloaded').catch(() => null);
            await settlePage(page, 350);
            await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-08-03');
            await expect(page.locator('#fleet-return-date')).toHaveValue('2026-08-05');

            return {
                message: 'Overlay search carried schedule into fleet.',
                observedUrl: page.url()
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
            await page.locator('#fleet-pickup-date').fill('2026-08-10');
            await page.locator('#fleet-return-date').fill('2026-08-12');
            await page.locator('#fleet-pickup-time').fill('10:00');
            await page.locator('#fleet-return-time').fill('18:00');

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
            }

            await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-08-10');
            await expect(page.locator('#fleet-return-date')).toHaveValue('2026-08-12');

            return {
                message: `Fleet filters cycled successfully (${seen.join(', ')})`,
                observedUrl: page.url()
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
            await page.locator('#fleet-pickup-date').fill('2026-08-10');
            await page.locator('#fleet-return-date').fill('2026-08-12');
            await page.locator('#fleet-pickup-time').fill('10:00');
            await page.locator('#fleet-return-time').fill('18:00');
            await page.locator('.js-fleet-brand-select').selectOption('mercedes');
            await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();

            await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
            await expect(page.locator('body')).toHaveClass(/reserve-page/);
            await expect(page.locator('.lab-header')).toHaveCount(1);
            await expect(page.locator('.site-v2-footer')).toHaveCount(1);
            await expect(page.locator('#selectedCar')).toContainText('G63');
            await expect(page.locator('#startDate')).toHaveValue('2026-08-10');
            await expect(page.locator('#endDate')).toHaveValue('2026-08-12');

            return {
                message: 'Reserve CTA preserved the selected schedule.',
                observedUrl: page.url()
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
            await page.locator('#contactName').fill(contactLead.name);
            await page.locator('#contactEmail').fill(contactLead.email);
            await page.locator('#contactPhone').fill(contactLead.phone);
            await page.locator('#contactSubject').selectOption(contactLead.subject);
            await page.locator('#contactMessage').fill(contactLead.message);
            await page.locator('#contactSubmitButton').click();

            await expect(page.locator('#contactFormStatus')).toContainText('Message sent successfully');

            return {
                message: 'Contact form reached the success state.',
                observedUrl: page.url()
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
            await page.locator('#contactSubmitButton').click();
            await expect(page.locator('#contactFormStatus')).toContainText('Please complete all required fields.');

            return {
                message: 'Contact form shows the required-fields validation before submit.',
                observedUrl: page.url()
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
            const form = page.locator('.js-vehicle-booking-form').first();
            await expect(form).toBeVisible();
            await form.locator('input[name="startDate"]').fill('2026-08-14');
            await form.locator('input[name="endDate"]').fill('2026-08-16');
            await form.locator('input[name="pickupTime"]').fill('11:00');
            await form.locator('input[name="dropoffTime"]').fill('17:00');
            await form.getByRole('button', { name: /check availability/i }).click();

            await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
            await expect(page.locator('#selectedCar')).not.toHaveText('');
            await expect(page.locator('#startDate')).toHaveValue('2026-08-14');
            await expect(page.locator('#endDate')).toHaveValue('2026-08-16');

            return {
                message: 'Vehicle booking form preserved the schedule into reserve.',
                observedUrl: page.url()
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
                const card = actionPage.locator('.model-card').nth(index);
                await expect(card).toBeVisible();
                await card.getByRole('link', { name: /^book$/i }).click();
                await expect(actionPage).toHaveURL(/\/app\/reserve\/page\.html\?/i);
                await expect(actionPage.locator('#selectedCar')).toContainText(title.replace(/\s+/g, ' ').trim());

                return {
                    message: `${title} book CTA opened reserve.`,
                    observedUrl: actionPage.url()
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
                    const card = actionPage.locator('.model-card').nth(index);
                    await expect(card).toBeVisible();
                    await card.getByRole('link', { name: /detail page|open/i }).click();
                    await expect(actionPage).toHaveURL(/-rental-dubai\.html$/i);
                    await expect(actionPage.locator('h1')).toBeVisible();

                    return {
                        message: `${title} detail page opened successfully.`,
                        observedUrl: actionPage.url()
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
            await page.goto(`${new URL(page.url()).origin}/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-08-20&endDate=2026-08-22&pickupTime=10:00&dropoffTime=18:00`, {
                waitUntil: 'domcontentloaded'
            });
            await settlePage(page, 350);

            await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
            await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
            await page.locator('#continueToPaymentBtn').click();
            await expect(page.locator('#step2')).toHaveClass(/active/);

            await page.locator('#fullName').fill(reservationGuest.name);
            await page.locator('#passport').fill(reservationGuest.passport);
            await page.locator('#phone').fill(reservationGuest.phone);
            await page.locator('#email').fill(reservationGuest.email);
            await page.locator('#step2').getByRole('button', { name: /continue to payment/i }).click();

            await expect(page.locator('#step3')).toHaveClass(/active/);
            await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');

            const successDialogPromise = page.waitForEvent('dialog');
            await page.locator('#payButton').click();

            const dialog = await successDialogPromise;
            await dialog.accept();

            await expect(page).toHaveURL(/\/index\.html$/i);

            return {
                message: 'Reserve flow reached success redirect with mocked payment.',
                observedUrl: page.url()
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
            await page.goto(`${new URL(page.url()).origin}/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-08-20&endDate=2026-08-22&pickupTime=10:00&dropoffTime=18:00`, {
                waitUntil: 'domcontentloaded'
            });
            await settlePage(page, 350);

            await expect(page.locator('#continueToPaymentBtn')).toBeDisabled();
            await expect(page.locator('#step1')).toHaveClass(/active/);

            return {
                message: 'Reserve step 1 keeps the next CTA disabled until the schedule is complete.',
                observedUrl: page.url()
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
            await page.goto(`${new URL(page.url()).origin}/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-08-20&endDate=2026-08-22&pickupTime=10:00&dropoffTime=18:00`, {
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

            return {
                message: isDisabled
                    ? 'Reserve step 1 keeps the next CTA disabled for an invalid return schedule.'
                    : 'Reserve step 1 rejects a return that is earlier than the delivery schedule.',
                observedUrl: page.url()
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
            createHomeMegaMenuAction()
        );
    }

    if (route === '/') {
        actions.push(createHomeOverlaySearchAction());
    }

    if (meta.hasFleetBrowser) {
        actions.push(
            createFleetFilterAction(),
            createFleetReserveAction()
        );
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

    actions.push(...discovered.links.map(createLinkAction));
    actions.push(...discovered.toggleButtons.map(createToggleButtonAction));
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
