const fs = require('fs');
const path = require('path');

const { runVisualAgent } = require(path.join(__dirname, 'run-visual-agent.js'));
const {
    getViewportCoverageMatrix
} = require(path.join(__dirname, '..', 'server', 'design-system-contract.js'));
const {
    formatAuditMemoryRegression
} = require(path.join(__dirname, '..', 'server', 'audit-memory-core.js'));

const repoRoot = path.resolve(__dirname, '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'visual-smoke-audit');

const DEFAULT_ROUTES = Object.freeze([
    '/',
    '/about.html',
    '/fleet.html',
    '/services.html',
    '/locations.html',
    '/contact.html',
    '/app/reserve/page.html',
    '/lamborghini-rental-dubai.html',
    '/airport-concierge-dubai.html',
    '/mercedes-g63-amg-rental-dubai.html'
]);

const DEFAULT_VIEWPORTS = Object.freeze([
    'mobile-tiny',
    'mobile-short',
    'mobile-modern',
    'tablet-portrait',
    'laptop',
    'desktop-wide'
]);

function viewportNamesForCoverage(scope) {
    return getViewportCoverageMatrix(scope).map((viewport) => viewport.name);
}

const VISUAL_SMOKE_VIEWPORT_GROUPS = Object.freeze({
    mobile: Object.freeze(viewportNamesForCoverage('mobile')),
    tablet: Object.freeze(viewportNamesForCoverage('tablet')),
    desktop: Object.freeze(viewportNamesForCoverage('desktop')),
    responsive: Object.freeze(viewportNamesForCoverage('responsive'))
});

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function parseArgs(argv = []) {
    const args = {
        routes: [],
        viewports: [],
        viewportGroups: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        strictReview: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--route' && argv[index + 1]) {
            args.routes.push(argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--viewport' && argv[index + 1]) {
            args.viewports.push(argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--viewport-group' && argv[index + 1]) {
            args.viewportGroups.push(argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--mobile') {
            args.viewportGroups.push('mobile');
            continue;
        }

        if (value === '--tablet') {
            args.viewportGroups.push('tablet');
            continue;
        }

        if (value === '--desktop') {
            args.viewportGroups.push('desktop');
            continue;
        }

        if (value === '--responsive') {
            args.viewportGroups.push('responsive');
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

        if (value === '--strict-review') {
            args.strictReview = true;
        }
    }

    return args;
}

function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))];
}

function resolveSmokeViewports(args = {}) {
    const requestedGroups = args.viewportGroups || [];
    const requestedViewports = args.viewports || [];

    if (requestedGroups.length === 0 && requestedViewports.length === 0) {
        return [...DEFAULT_VIEWPORTS];
    }

    const groupViewports = requestedGroups.flatMap((groupName) => {
        const normalizedGroupName = String(groupName || '').trim().toLowerCase();
        const group = VISUAL_SMOKE_VIEWPORT_GROUPS[normalizedGroupName];

        if (!group) {
            throw new Error(`Unknown visual viewport group: ${groupName}`);
        }

        return group;
    });

    return uniqueValues([...groupViewports, ...requestedViewports]);
}

function summarizeSmokeFailures(report, strictReview = false) {
    const pages = report?.pages || [];
    const badPages = pages.filter((page) => page.assessment?.status === 'bad');
    const reviewPages = strictReview
        ? pages.filter((page) => page.assessment?.status === 'review')
        : [];
    const hardFailPages = pages.filter((page) => (page.assessment?.hardFails || []).length > 0);
    const missingScreenshots = pages.filter((page) => (
        !page.artifacts?.viewportScreenshot ||
        !fs.existsSync(page.artifacts.viewportScreenshot)
    ));

    return {
        badPages,
        reviewPages,
        hardFailPages,
        missingScreenshots,
        failed: badPages.length > 0 ||
            reviewPages.length > 0 ||
            hardFailPages.length > 0 ||
            missingScreenshots.length > 0
    };
}

function buildFailureLine(page) {
    const findings = (page.assessment?.findings || [])
        .slice(0, 2)
        .map((finding) => finding.message)
        .join('; ');
    return `${page.route} [${page.viewport}] status=${page.assessment?.status || 'unknown'} score=${page.assessment?.score || 0}${findings ? ` :: ${findings}` : ''}`;
}

async function runVisualSmokeAudit(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;
    const routes = args.routes && args.routes.length > 0 ? args.routes : [...DEFAULT_ROUTES];
    const viewports = resolveSmokeViewports(args);
    const outputDir = args.outputDir || path.join(artifactsRoot, timestampSlug());
    const visualRun = await runVisualAgent({
        baseUrl: args.baseUrl || '',
        routes,
        viewports,
        outputDir,
        scope: 'smoke',
        includeFleetClicks: false
    });
    const failures = summarizeSmokeFailures(visualRun.report, Boolean(args.strictReview));

    return {
        runDir: visualRun.runDir,
        report: visualRun.report,
        failures
    };
}

async function main() {
    const { runDir, report, failures } = await runVisualSmokeAudit({ argv: process.argv.slice(2) });

    console.log(`Visual smoke audit completed: ${runDir}`);
    console.log(`routes=${report.summary.totalRoutes} pages=${report.summary.totalPages} good=${report.summary.byStatus.good} review=${report.summary.byStatus.review} bad=${report.summary.byStatus.bad} hardFails=${report.summary.hardFailCount}`);

    if (failures.missingScreenshots.length > 0) {
        console.error(`Missing visual screenshots: ${failures.missingScreenshots.length}`);
        for (const page of failures.missingScreenshots.slice(0, 8)) {
            console.error(`- ${page.route} [${page.viewport}]`);
        }
    }

    const failedPages = [
        ...new Map(
            [...failures.badPages, ...failures.hardFailPages, ...failures.reviewPages]
                .map((page) => [`${page.route}::${page.viewport}`, page])
        ).values()
    ];

    if (failedPages.length > 0) {
        console.error(`Visual smoke gate failed pages: ${failedPages.length}`);
        for (const page of failedPages.slice(0, 12)) {
            console.error(`- ${buildFailureLine(page)}`);
        }
    }

    if (report.auditMemory?.status === 'bad') {
        console.error(`Audit memory regression failed: ${report.auditMemory.message}`);
        for (const regression of report.auditMemory.regressions.slice(0, 10)) {
            console.error(`- ${formatAuditMemoryRegression(regression)}`);
        }
    }

    if (failures.failed || report.auditMemory?.status === 'bad') {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Visual smoke audit failed.');
        console.error(error.stack || error.message);
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_ROUTES,
    DEFAULT_VIEWPORTS,
    VISUAL_SMOKE_VIEWPORT_GROUPS,
    parseArgs,
    resolveSmokeViewports,
    runVisualSmokeAudit,
    summarizeSmokeFailures
};
