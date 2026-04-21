const fs = require('fs');
const path = require('path');

const { runVisualAgent } = require(path.join(__dirname, 'run-visual-agent.js'));

const repoRoot = path.resolve(__dirname, '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'visual-smoke-audit');

const DEFAULT_ROUTES = Object.freeze([
    '/',
    '/fleet.html',
    '/services.html',
    '/contact.html',
    '/app/reserve/page.html',
    '/lamborghini-rental-dubai.html',
    '/airport-concierge-dubai.html',
    '/mercedes-g63-amg-rental-dubai.html'
]);

const DEFAULT_VIEWPORTS = Object.freeze([
    'mobile-short',
    'mobile-modern',
    'tablet-portrait',
    'laptop',
    'desktop-wide'
]);

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function parseArgs(argv = []) {
    const args = {
        routes: [],
        viewports: [],
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
    const viewports = args.viewports && args.viewports.length > 0 ? args.viewports : [...DEFAULT_VIEWPORTS];
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

    if (failures.failed) {
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
    parseArgs,
    runVisualSmokeAudit,
    summarizeSmokeFailures
};
