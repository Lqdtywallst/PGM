const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');

const { PUBLIC_PAGE_FILE_MAP } = require(path.join(__dirname, '..', 'server', 'public-page-map.js'));
const { getViewportCoverageMatrix } = require(path.join(__dirname, '..', 'server', 'design-system-contract.js'));
const { startStaticServer, stopProcess } = require(path.join(__dirname, '..', 'server', 'site-audit-utils.js'));
const { runVisualAgent } = require(path.join(__dirname, 'run-visual-agent.js'));
const { runFunctionalAgent } = require(path.join(__dirname, 'run-functional-agent.js'));

const repoRoot = path.resolve(__dirname, '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'mobile-pro-audit');
const responsiveSpecPath = 'tests/e2e/responsive-audit.spec.js';
const MOBILE_VIEWPORT_NAMES = new Set(getViewportCoverageMatrix('mobile').map((viewport) => viewport.name));

const CORE_ROUTES = Object.freeze([
    '/',
    '/about.html',
    '/fleet.html',
    '/services.html',
    '/locations.html',
    '/contact.html',
    '/luxury-car-rental-dubai.html',
    '/airport-concierge-dubai.html',
    '/lamborghini-rental-dubai.html',
    '/ferrari-296-gts-rental-dubai.html',
    '/terms-and-conditions.html',
    '/app/reserve/page.html'
]);

const LIGHTHOUSE_FAMILY_ORDER = Object.freeze([
    'home',
    'hub',
    'guide',
    'service_detail',
    'brand',
    'vehicle',
    'legal',
    'reserve'
]);

const RESPONSIVE_ROUTE_KEYS = Object.freeze({
    '/': 'home',
    '/fleet.html': 'fleet',
    '/locations.html': 'locations',
    '/services.html': 'services',
    '/contact.html': 'contact',
    '/app/reserve/page.html': 'reserve',
    '/ferrari-296-gts-rental-dubai.html': 'vehicle-pdp',
    '/supercar-rental-dubai.html': 'seo-landing'
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

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function findAvailablePort() {
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
        routes: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        scope: 'core',
        lighthouseMaxPages: 8,
        skipResponsive: false,
        skipVisual: false,
        skipFunctional: false,
        skipLighthouse: false
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

        if (value === '--output-dir' && argv[index + 1]) {
            args.outputDir = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--scope' && argv[index + 1]) {
            args.scope = String(argv[index + 1]).trim().toLowerCase();
            index += 1;
            continue;
        }

        if (value === '--lighthouse-max-pages' && argv[index + 1]) {
            const parsed = Number.parseInt(argv[index + 1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.lighthouseMaxPages = parsed;
            }
            index += 1;
            continue;
        }

        if (value === '--skip-responsive') {
            args.skipResponsive = true;
            continue;
        }

        if (value === '--skip-visual') {
            args.skipVisual = true;
            continue;
        }

        if (value === '--skip-functional') {
            args.skipFunctional = true;
            continue;
        }

        if (value === '--skip-lighthouse') {
            args.skipLighthouse = true;
        }
    }

    return args;
}

function selectRoutes(args) {
    if (Array.isArray(args.routes) && args.routes.length > 0) {
        return [...new Set(args.routes.map((route) => normalizeRoute(route)))];
    }

    if (args.scope === 'full') {
        return Object.keys(PUBLIC_PAGE_FILE_MAP).map((route) => normalizeRoute(route));
    }

    return CORE_ROUTES.filter((route) => Object.prototype.hasOwnProperty.call(PUBLIC_PAGE_FILE_MAP, route));
}

function classifyRoute(route) {
    if (route === '/') {
        return 'home';
    }

    if (route === '/about.html' || route === '/contact.html' || route === '/fleet.html' || route === '/services.html' || route === '/locations.html') {
        return 'hub';
    }

    if (route === '/app/reserve/page.html') {
        return 'reserve';
    }

    const relativeFile = PUBLIC_PAGE_FILE_MAP[route] || '';

    if (relativeFile.startsWith('pages/guides/')) {
        return 'guide';
    }

    if (relativeFile.startsWith('pages/services/')) {
        return 'service_detail';
    }

    if (relativeFile.startsWith('pages/brands/')) {
        return 'brand';
    }

    if (relativeFile.startsWith('pages/vehicles/')) {
        return 'vehicle';
    }

    if (relativeFile.startsWith('pages/legal/')) {
        return 'legal';
    }

    return 'other';
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
        label: 'Mobile pro audit static server'
    });

    return {
        baseUrl: resolvedBaseUrl,
        serverHandle
    };
}

function flattenPlaywrightSpecs(suites = [], bucket = []) {
    for (const suite of suites) {
        if (Array.isArray(suite.specs)) {
            for (const spec of suite.specs) {
                const testRuns = (spec.tests || []).map((test) => ({
                    title: spec.title,
                    projectName: test.projectName,
                    status: test.results?.[0]?.status || 'unknown',
                    expectedStatus: test.expectedStatus || '',
                    file: spec.file,
                    line: spec.line
                }));
                bucket.push(...testRuns);
            }
        }

        if (Array.isArray(suite.suites)) {
            flattenPlaywrightSpecs(suite.suites, bucket);
        }
    }

    return bucket;
}

function runCommand(command, args, options = {}) {
    return spawnSync(command, args, {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 100,
        ...options
    });
}

function quoteShellArg(value) {
    const stringValue = String(value || '');

    if (!/[ \t"&()^|<>]/.test(stringValue)) {
        return stringValue;
    }

    return `"${stringValue.replace(/"/g, '\\"')}"`;
}

function runNpx(args, options = {}) {
    if (process.platform === 'win32') {
        const commandText = ['npx', ...args.map((value) => quoteShellArg(value))].join(' ');
        return runCommand(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandText], options);
    }

    return runCommand('npx', args, options);
}

function runResponsiveMobileSweep(baseUrl, runDir) {
    const outputPath = path.join(runDir, 'responsive-mobile-playwright.json');
    const result = runNpx(
        [
            'playwright',
            'test',
            responsiveSpecPath,
            '--project=desktop-chromium',
            '--reporter=json'
        ],
        {
            env: {
                ...process.env,
                PLAYWRIGHT_BASE_URL: baseUrl
            }
        }
    );

    fs.writeFileSync(outputPath, result.stdout || '{}');

    let parsed = { suites: [], stats: {}, errors: [] };
    try {
        parsed = JSON.parse(result.stdout || '{}');
    } catch (error) {
        parsed = {
            suites: [],
            stats: {},
            errors: [{ message: `Could not parse Playwright JSON reporter: ${error.message}` }]
        };
    }

    const tests = flattenPlaywrightSpecs(parsed.suites || []);
    const mobileTests = tests.filter((test) => (
        [...MOBILE_VIEWPORT_NAMES].some((viewportName) => test.title.includes(viewportName))
    ));
    const failed = mobileTests.filter((test) => test.status !== 'passed');
    const passed = mobileTests.filter((test) => test.status === 'passed');

    return {
        command: `npx playwright test ${responsiveSpecPath} --project=desktop-chromium --reporter=json`,
        outputPath,
        ok: result.status === 0,
        stats: parsed.stats || {},
        passedCount: passed.length,
        failedCount: failed.length,
        failedTests: failed
    };
}

function safeReadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function selectLighthouseRoutes(routes, maxPages) {
    const picks = [];

    for (const family of LIGHTHOUSE_FAMILY_ORDER) {
        const match = routes.find((route) => classifyRoute(route) === family);
        if (match && !picks.includes(match)) {
            picks.push(match);
        }
    }

    for (const route of routes) {
        if (picks.length >= maxPages) {
            break;
        }

        if (!picks.includes(route)) {
            picks.push(route);
        }
    }

    return picks.slice(0, maxPages);
}

function summarizeLighthouseCategories(report) {
    return {
        performance: Math.round((report.categories?.performance?.score || 0) * 100),
        accessibility: Math.round((report.categories?.accessibility?.score || 0) * 100),
        bestPractices: Math.round((report.categories?.['best-practices']?.score || 0) * 100),
        seo: Math.round((report.categories?.seo?.score || 0) * 100),
        fcp: report.audits?.['first-contentful-paint']?.displayValue || '',
        lcp: report.audits?.['largest-contentful-paint']?.displayValue || '',
        cls: report.audits?.['cumulative-layout-shift']?.displayValue || '',
        imageSavings: report.audits?.['image-delivery-insight']?.displayValue || '',
        unusedCss: report.audits?.['unused-css-rules']?.displayValue || ''
    };
}

function runLighthouseAudit(baseUrl, routes, runDir) {
    const selectedRoutes = selectLighthouseRoutes(routes, routes.length);
    const pages = [];
    const lighthouseDir = path.join(runDir, 'lighthouse');
    ensureDir(lighthouseDir);

    for (const route of selectedRoutes) {
        const outputPath = path.join(lighthouseDir, `${routeFileStem(route)}.json`);
        const lighthouseResult = runNpx(
            [
                '-y',
                'lighthouse',
                `${baseUrl}${route}`,
                '--quiet',
                '--only-categories=performance,accessibility,best-practices,seo',
                '--output=json',
                `--output-path=${outputPath}`,
                '--chrome-flags=--headless=new --no-sandbox'
            ]
        );

        const reportExists = fs.existsSync(outputPath);
        const report = reportExists ? safeReadJson(outputPath) : null;

        pages.push({
            route,
            ok: lighthouseResult.status === 0 || reportExists,
            outputPath,
            categories: report ? summarizeLighthouseCategories(report) : null,
            stderr: `${(lighthouseResult.stdout || '').trim()}\n${(lighthouseResult.stderr || '').trim()}`.trim()
        });
    }

    const validPages = pages.filter((page) => page.categories);
    const averages = validPages.length === 0 ? null : {
        performance: Math.round(validPages.reduce((sum, page) => sum + page.categories.performance, 0) / validPages.length),
        accessibility: Math.round(validPages.reduce((sum, page) => sum + page.categories.accessibility, 0) / validPages.length),
        bestPractices: Math.round(validPages.reduce((sum, page) => sum + page.categories.bestPractices, 0) / validPages.length),
        seo: Math.round(validPages.reduce((sum, page) => sum + page.categories.seo, 0) / validPages.length)
    };

    return {
        sampledRoutes: selectedRoutes,
        pageCount: pages.length,
        averages,
        pages
    };
}

function buildVisualSummary(report) {
    const mobilePages = (report.pages || []).filter((page) => MOBILE_VIEWPORT_NAMES.has(page.viewport));
    const summary = {
        total: mobilePages.length,
        good: mobilePages.filter((page) => page.assessment?.status === 'good').length,
        review: mobilePages.filter((page) => page.assessment?.status === 'review').length,
        bad: mobilePages.filter((page) => page.assessment?.status === 'bad').length
    };

    return {
        runDir: report.runDir || '',
        summary,
        pages: mobilePages.map((page) => ({
            route: page.route,
            status: page.assessment?.status || 'unknown',
            score: page.assessment?.score || 0,
            findings: (page.assessment?.findings || []).map((finding) => ({
                severity: finding.severity,
                category: finding.category,
                message: finding.message
            })),
            screenshotPath: page.artifacts?.viewportScreenshot || ''
        }))
    };
}

function buildFunctionalSummary(report) {
    const mobilePages = (report.pages || []).filter((page) => MOBILE_VIEWPORT_NAMES.has(page.viewport));
    const totalActions = mobilePages.reduce((sum, page) => sum + (page.actions || []).length, 0);
    const failedActions = mobilePages.reduce((sum, page) => (
        sum + (page.actions || []).filter((action) => action.status === 'failed').length
    ), 0);

    return {
        runDir: report.runDir || '',
        summary: {
            total: mobilePages.length,
            totalActions,
            failedActions,
            pagesWithFailures: mobilePages.filter((page) => (
                (page.consoleErrors || []).length > 0 ||
                (page.requestFailures || []).length > 0 ||
                (page.actions || []).some((action) => action.status === 'failed')
            )).length
        },
        pages: mobilePages.map((page) => ({
            route: page.route,
            failedActions: (page.actions || [])
                .filter((action) => action.status === 'failed')
                .map((action) => ({
                    label: action.label,
                    message: action.message || '',
                    screenshotPath: action.screenshotPath || ''
                })),
            consoleErrors: page.consoleErrors || [],
            requestFailures: page.requestFailures || []
        }))
    };
}

function scoreRouteHealth({ route, responsive, visual, functional, lighthouse }) {
    const issues = [];
    let score = 100;

    const visualPage = visual?.pages?.find((page) => page.route === route);
    const functionalPage = functional?.pages?.find((page) => page.route === route);
    const lighthousePage = lighthouse?.pages?.find((page) => page.route === route);
    const responsiveKey = RESPONSIVE_ROUTE_KEYS[route];
    const responsiveIssues = responsiveKey
        ? (responsive?.failedTests || []).filter((test) => test.title.startsWith(responsiveKey))
        : [];

    if (responsiveIssues.length > 0) {
        issues.push('responsive mobile failure');
        score -= 30;
    }

    if (visualPage?.status === 'bad') {
        issues.push('visual regression in mobile viewport');
        score -= 25;
    } else if (visualPage?.status === 'review') {
        issues.push('visual review gate in mobile viewport');
        score -= 12;
    }

    if ((visualPage?.findings || []).length > 0) {
        issues.push(...visualPage.findings.slice(0, 2).map((finding) => finding.message));
        score -= Math.min(20, visualPage.findings.length * 4);
    }

    const failedActions = functionalPage?.failedActions || [];
    if (failedActions.length > 0) {
        issues.push(...failedActions.slice(0, 2).map((action) => `functional: ${action.label}`));
        score -= Math.min(30, failedActions.length * 10);
    }

    if ((functionalPage?.consoleErrors || []).length > 0) {
        issues.push('console errors in mobile run');
        score -= 12;
    }

    if ((functionalPage?.requestFailures || []).length > 0) {
        issues.push('network/request failures in mobile run');
        score -= 12;
    }

    if (lighthousePage?.categories) {
        if (lighthousePage.categories.performance < 70) {
            issues.push(`mobile performance ${lighthousePage.categories.performance}`);
            score -= 10;
        }

        if (lighthousePage.categories.accessibility < 95) {
            issues.push(`mobile accessibility ${lighthousePage.categories.accessibility}`);
            score -= 8;
        }
    }

    const severity =
        score < 55 ? 'high' :
        score < 80 ? 'medium' :
        issues.length > 0 ? 'low' :
        'healthy';

    return {
        route,
        family: classifyRoute(route),
        score: Math.max(0, score),
        severity,
        issues
    };
}

function buildRoutePriorities(routes, data) {
    return routes
        .map((route) => scoreRouteHealth({ route, ...data }))
        .filter((entry) => entry.severity !== 'healthy')
        .sort((left, right) => left.score - right.score);
}

function buildMarkdownReport(report) {
    const lines = [
        '# Mobile Pro Audit',
        '',
        `Generated at: ${report.generatedAt}`,
        `Base URL: ${report.baseUrl}`,
        `Scope: ${report.scope}`,
        `Routes covered: ${report.routes.length}`,
        '',
        '## Overview',
        '',
        `- responsive mobile checks: ${report.responsive ? `${report.responsive.passedCount} passed / ${report.responsive.failedCount} failed` : 'skipped'}`,
        `- visual mobile pages: ${report.visual ? `${report.visual.summary.good} good / ${report.visual.summary.review} review / ${report.visual.summary.bad} bad` : 'skipped'}`,
        `- functional mobile actions: ${report.functional ? `${report.functional.summary.totalActions} total / ${report.functional.summary.failedActions} failed` : 'skipped'}`,
        `- lighthouse sample: ${report.lighthouse ? `${report.lighthouse.pageCount} pages` : 'skipped'}`,
        '',
        '## Priority Routes',
        ''
    ];

    if (report.routePriorities.length === 0) {
        lines.push('- No route currently needs escalation from the mobile audit pack.');
    } else {
        for (const item of report.routePriorities.slice(0, 12)) {
            lines.push(`- ${item.route} [${item.severity}] score=${item.score}: ${item.issues.join('; ')}`);
        }
    }

    if (report.responsive) {
        lines.push('', '## Responsive Failures', '');
        if (report.responsive.failedTests.length === 0) {
            lines.push('- None');
        } else {
            for (const test of report.responsive.failedTests) {
                lines.push(`- ${test.title} (${test.status})`);
            }
        }
    }

    if (report.visual) {
        lines.push('', '## Visual Findings', '');
        const riskyPages = report.visual.pages.filter((page) => page.status !== 'good');
        if (riskyPages.length === 0) {
            lines.push('- None');
        } else {
            for (const page of riskyPages.slice(0, 12)) {
                const findingText = page.findings.length === 0
                    ? 'review gate without structured findings'
                    : page.findings.slice(0, 3).map((finding) => `[${finding.severity}] ${finding.message}`).join('; ');
                lines.push(`- ${page.route} (${page.status}, score ${page.score}): ${findingText}`);
                if (page.screenshotPath) {
                    lines.push(`  screenshot: ${page.screenshotPath}`);
                }
            }
        }
    }

    if (report.functional) {
        lines.push('', '## Functional Findings', '');
        const brokenPages = report.functional.pages.filter((page) => (
            page.failedActions.length > 0 ||
            page.consoleErrors.length > 0 ||
            page.requestFailures.length > 0
        ));

        if (brokenPages.length === 0) {
            lines.push('- None');
        } else {
            for (const page of brokenPages.slice(0, 12)) {
                lines.push(`- ${page.route}`);
                for (const action of page.failedActions.slice(0, 3)) {
                    lines.push(`  failed: ${action.label} - ${action.message}`);
                }
                for (const error of page.consoleErrors.slice(0, 2)) {
                    lines.push(`  console: ${error}`);
                }
                for (const request of page.requestFailures.slice(0, 2)) {
                    lines.push(`  request: ${request.resourceType || 'request'} ${request.status || request.failureText || 'error'} ${request.url}`);
                }
            }
        }
    }

    if (report.lighthouse) {
        lines.push('', '## Lighthouse Sample', '');
        if (report.lighthouse.averages) {
            lines.push(`- averages: perf ${report.lighthouse.averages.performance}, a11y ${report.lighthouse.averages.accessibility}, best-practices ${report.lighthouse.averages.bestPractices}, seo ${report.lighthouse.averages.seo}`);
        }

        for (const page of report.lighthouse.pages.slice(0, 12)) {
            if (!page.categories) {
                lines.push(`- ${page.route}: no report`);
                continue;
            }

            lines.push(`- ${page.route}: perf ${page.categories.performance}, a11y ${page.categories.accessibility}, bp ${page.categories.bestPractices}, seo ${page.categories.seo}, LCP ${page.categories.lcp}`);
        }
    }

    lines.push(
        '',
        '## Playbook',
        '',
        '- Workflow: docs/audit/MOBILE-PRO-AUDIT-PLAYBOOK.md',
        '- Use this report as triage, then attach screenshots before changing UI.',
        ''
    );

    return `${lines.join('\n')}\n`;
}

async function runMobileProAudit(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;
    const routes = selectRoutes(args);
    const generatedAt = new Date().toISOString();
    const runDir = args.outputDir || path.join(artifactsRoot, timestampSlug(new Date(generatedAt)));

    ensureDir(runDir);

    const { baseUrl, serverHandle } = await resolveBaseUrl(args.baseUrl || '');

    try {
        const responsive = args.skipResponsive ? null : runResponsiveMobileSweep(baseUrl, runDir);
        const visualRun = args.skipVisual ? null : await runVisualAgent({
            routes,
            viewports: [...MOBILE_VIEWPORT_NAMES],
            baseUrl,
            outputDir: path.join(runDir, 'visual-agent'),
            includeFleetClicks: false
        });
        const functionalRun = args.skipFunctional ? null : await runFunctionalAgent({
            routes,
            viewports: [...MOBILE_VIEWPORT_NAMES].filter((viewportName) => viewportName !== 'mobile-large'),
            baseUrl,
            outputDir: path.join(runDir, 'functional-agent')
        });
        const lighthouse = args.skipLighthouse ? null : runLighthouseAudit(
            baseUrl,
            selectLighthouseRoutes(routes, Math.max(1, args.lighthouseMaxPages)),
            runDir
        );

        const visual = visualRun ? buildVisualSummary({ ...visualRun.report, runDir: visualRun.runDir }) : null;
        const functional = functionalRun ? buildFunctionalSummary({ ...functionalRun.report, runDir: functionalRun.runDir }) : null;
        const routePriorities = buildRoutePriorities(routes, {
            responsive,
            visual,
            functional,
            lighthouse
        });

        const report = {
            generatedAt,
            baseUrl,
            scope: args.scope,
            routes,
            responsive,
            visual,
            functional,
            lighthouse,
            routePriorities
        };

        fs.writeFileSync(path.join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
        fs.writeFileSync(path.join(runDir, 'report.md'), buildMarkdownReport(report));

        return {
            runDir,
            report
        };
    } finally {
        if (serverHandle?.child) {
            stopProcess(serverHandle.child);
        }
    }
}

async function main() {
    const { runDir, report } = await runMobileProAudit({ argv: process.argv.slice(2) });

    console.log(`Mobile pro audit completed: ${runDir}`);
    console.log(`routes=${report.routes.length} priorities=${report.routePriorities.length}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Mobile pro audit failed.');
        console.error(error.stack || error.message);
        process.exit(1);
    });
}

module.exports = {
    buildMarkdownReport,
    parseArgs,
    runMobileProAudit,
    selectRoutes
};
