const path = require('path');

const { runFunctionalAgent } = require(path.join(__dirname, 'run-functional-agent.js'));

const DEFAULT_ROUTES = Object.freeze([
    '/',
    '/fleet.html',
    '/services.html',
    '/contact.html',
    '/app/reserve/page.html',
    '/lamborghini-rental-dubai.html',
    '/mercedes-rental-dubai.html',
    '/mercedes-g63-amg-rental-dubai.html',
    '/airport-concierge-dubai.html',
    '/monthly-luxury-car-rental-dubai.html'
]);

const DEFAULT_VIEWPORTS = Object.freeze([
    'mobile-modern',
    'laptop'
]);

function parseArgs(argv = []) {
    const args = {
        routes: [],
        viewports: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        coverageMode: 'journey',
        maxLinksPerPage: 6,
        maxButtonsPerPage: 5,
        maxSummariesPerPage: 4,
        maxSelectsPerPage: 4,
        maxOptionsPerSelect: 8
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

async function runCustomerJourneyAudit(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;

    return runFunctionalAgent({
        baseUrl: args.baseUrl || '',
        outputDir: args.outputDir || '',
        routes: args.routes && args.routes.length > 0 ? args.routes : [...DEFAULT_ROUTES],
        viewports: args.viewports && args.viewports.length > 0 ? args.viewports : [...DEFAULT_VIEWPORTS],
        maxLinksPerPage: args.maxLinksPerPage || 6,
        maxButtonsPerPage: args.maxButtonsPerPage || 5,
        maxSummariesPerPage: args.maxSummariesPerPage || 4,
        maxSelectsPerPage: args.maxSelectsPerPage || 4,
        maxOptionsPerSelect: args.maxOptionsPerSelect || 8,
        coverageMode: args.coverageMode || 'journey'
    });
}

async function main() {
    const { runDir, report } = await runCustomerJourneyAudit({ argv: process.argv.slice(2) });
    const failedActions = Number(report.summary.failedActions || 0);
    const failedScenarios = Number(report.customerJourneys?.summary?.failed || 0);
    const functionalStatus = report.functionalReview?.status || 'unknown';
    const functionalHardFails = Number(report.functionalReview?.summary?.hardFails || 0);

    console.log(`Customer journey audit completed: ${runDir}`);
    console.log(`routes=${report.summary.totalRoutes} viewports=${report.summary.totalViewports} actions=${report.summary.totalActions} failedActions=${failedActions}`);
    console.log(`customerScenarios=${report.customerJourneys.summary.totalScenarios} covered=${report.customerJourneys.summary.covered} partial=${report.customerJourneys.summary.partial} failed=${failedScenarios}`);
    console.log(`functionalStatus=${functionalStatus} hardFails=${functionalHardFails} mode=${report.summary.coverageMode} truncatedTargets=${report.summary.truncatedTargets}`);

    if (failedActions > 0 || failedScenarios > 0 || functionalStatus === 'bad') {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Customer journey audit failed.');
        console.error(error.stack || error.message);
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_ROUTES,
    DEFAULT_VIEWPORTS,
    parseArgs,
    runCustomerJourneyAudit
};
