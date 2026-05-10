const path = require('path');

const { PUBLIC_PAGE_FILE_MAP } = require('../../server/shared/public-page-map');
const { normalizeRoute } = require('../../server/audits/homogeneity-audit-core');
const { runHomogeneityAgent } = require('./run-homogeneity-agent');

const repoRoot = path.resolve(__dirname, '..', '..');

const TEMPLATE_ROUTES = Object.freeze([
    '/',
    '/services.html',
    '/fleet.html',
    '/locations.html',
    '/about.html',
    '/contact.html',
    '/reservation-lookup.html',
    '/app/reserve/page.html',
    '/terms-and-conditions.html',
    '/luxury-car-rental-dubai.html',
    '/airport-concierge-dubai.html',
    '/lamborghini-rental-dubai.html',
    '/ferrari-rental-dubai.html',
    '/lamborghini-huracan-evo-spyder-rental-dubai.html',
    '/ferrari-296-gts-rental-dubai.html'
]);

const DEFAULT_VIEWPORTS = Object.freeze([
    'desktop-wide',
    'desktop-standard',
    'laptop',
    'tablet-portrait',
    'mobile-modern'
]);

function parseArgs(argv = []) {
    const args = {
        routes: [],
        viewports: [],
        outputDir: path.join('artifacts', 'homogeneity-agent', 'header-guard'),
        scope: 'templates'
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

        if (value === '--output-dir' && argv[index + 1]) {
            args.outputDir = argv[index + 1];
            index += 1;
            continue;
        }

        if ((value === '--scope' || value === '--mode') && argv[index + 1]) {
            args.scope = String(argv[index + 1]).trim() || args.scope;
            index += 1;
            continue;
        }

        if (value === '--all') {
            args.scope = 'all';
        }
    }

    return args;
}

function resolveGuardRoutes(args = {}) {
    if (args.routes?.length > 0) {
        return [...new Set(args.routes.map(normalizeRoute))];
    }

    if (args.scope === 'all') {
        return Object.keys(PUBLIC_PAGE_FILE_MAP).map(normalizeRoute);
    }

    return [...TEMPLATE_ROUTES];
}

function resolveGuardViewports(args = {}) {
    return args.viewports?.length > 0 ? args.viewports : [...DEFAULT_VIEWPORTS];
}

function summarizeByCategory(findings = []) {
    return findings.reduce((summary, finding) => {
        const key = finding.category || 'unknown';
        summary[key] = (summary[key] || 0) + 1;
        return summary;
    }, {});
}

function isHeaderGuardFinding(finding = {}) {
    return finding.area === 'header' ||
        finding.area === 'header_cta' ||
        finding.area === 'header_dropdown';
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const routes = resolveGuardRoutes(args);
    const viewports = resolveGuardViewports(args);
    const outputDir = path.resolve(repoRoot, args.outputDir);

    const { runDir, report } = await runHomogeneityAgent({
        routes,
        viewports,
        outputDir
    });

    const headerFindings = report.findings.filter(isHeaderGuardFinding);
    const byCategory = summarizeByCategory(headerFindings);

    console.log(`Header homogeneity guard completed: ${runDir}`);
    console.log(`pages=${report.pages.length} headerFindings=${headerFindings.length}`);

    if (headerFindings.length === 0) {
        console.log('Header guard passed: no layout, surface, identity or navigation-shift drift detected.');
        return;
    }

    console.log(`Header guard failed: ${JSON.stringify(byCategory)}`);

    for (const finding of headerFindings.slice(0, 20)) {
        console.log(`- ${finding.severity} ${finding.category} ${finding.route} ${finding.viewport}: ${finding.evidence}`);
    }

    if (headerFindings.length > 20) {
        console.log(`- ...and ${headerFindings.length - 20} more header findings. See report.json for the full list.`);
    }

    process.exitCode = 1;
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Header homogeneity guard failed to run.');
        console.error(error.stack || error.message || String(error));
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_VIEWPORTS,
    TEMPLATE_ROUTES,
    parseArgs,
    resolveGuardRoutes,
    resolveGuardViewports,
    isHeaderGuardFinding,
    summarizeByCategory
};
