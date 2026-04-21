const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');

const { PUBLIC_PAGE_FILE_MAP } = require(path.join(__dirname, '..', 'server', 'public-page-map.js'));
const { getViewportCoverageMatrix } = require(path.join(__dirname, '..', 'server', 'design-system-contract.js'));
const { getDefaultVisualRoutes, normalizeRoute } = require(path.join(__dirname, '..', 'server', 'visual-audit-core.js'));
const { startStaticServer, stopProcess } = require(path.join(__dirname, '..', 'server', 'site-audit-utils.js'));
const { runVisualAgent } = require(path.join(__dirname, 'run-visual-agent.js'));

const repoRoot = path.resolve(__dirname, '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'visual-robust-audit');
const baselineManifestPath = path.join(repoRoot, 'tests', 'visual-baselines', 'manifest.json');
const FIRST_VIEWPORT_SPECS = Object.freeze([
    'tests/e2e/visual-first-viewport.spec.js',
    'tests/e2e/visual-route-entrypoints.spec.js'
]);
const DEFAULT_VIEWPORTS = Object.freeze(getViewportCoverageMatrix('visualAgent').map((viewport) => viewport.name));

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function parseArgs(argv) {
    const args = {
        routes: [],
        viewports: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        scope: 'landings',
        skipFirstViewport: false,
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
            args.scope = String(argv[index + 1]).trim().toLowerCase();
            index += 1;
            continue;
        }

        if (value === '--skip-first-viewport') {
            args.skipFirstViewport = true;
            continue;
        }

        if (value === '--no-fleet-clicks') {
            args.includeFleetClicks = false;
        }
    }

    return args;
}

function selectRoutes(args) {
    if (args.routes.length > 0) {
        return [...new Set(args.routes.map((route) => normalizeRoute(route)))];
    }

    if (args.scope === 'full') {
        return Object.keys(PUBLIC_PAGE_FILE_MAP).map((route) => normalizeRoute(route));
    }

    return getDefaultVisualRoutes(args.scope || 'landings');
}

function flattenPlaywrightSpecs(suites = [], bucket = []) {
    for (const suite of suites) {
        if (Array.isArray(suite.specs)) {
            for (const spec of suite.specs) {
                for (const test of spec.tests || []) {
                    bucket.push({
                        title: spec.title,
                        file: spec.file,
                        line: spec.line,
                        projectName: test.projectName || '',
                        status: test.results?.[0]?.status || 'unknown'
                    });
                }
            }
        }

        if (Array.isArray(suite.suites)) {
            flattenPlaywrightSpecs(suite.suites, bucket);
        }
    }

    return bucket;
}

function quoteShellArg(value) {
    const stringValue = String(value || '');

    if (!/[ \t"&()^|<>]/.test(stringValue)) {
        return stringValue;
    }

    return `"${stringValue.replace(/"/g, '\\"')}"`;
}

function runCommand(command, args, options = {}) {
    return spawnSync(command, args, {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 100,
        ...options
    });
}

function runNpx(args, options = {}) {
    if (process.platform === 'win32') {
        const commandText = ['npx', ...args.map((value) => quoteShellArg(value))].join(' ');
        return runCommand(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandText], options);
    }

    return runCommand('npx', args, options);
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
        label: 'Visual robust audit static server'
    });

    return {
        baseUrl: resolvedBaseUrl,
        serverHandle
    };
}

function summarizeVisualByViewport(report) {
    const summary = {};

    for (const page of report.pages || []) {
        const viewport = page.viewport || 'unknown';
        summary[viewport] = summary[viewport] || { total: 0, good: 0, review: 0, bad: 0 };
        summary[viewport].total += 1;
        summary[viewport][page.assessment?.status || 'review'] += 1;
    }

    return summary;
}

function summarizeBaselineCoverage(routes, viewports) {
    const manifest = fs.existsSync(baselineManifestPath)
        ? JSON.parse(fs.readFileSync(baselineManifestPath, 'utf8'))
        : { approvals: [] };
    const approved = new Set(
        (manifest.approvals || []).map((entry) => `${normalizeRoute(entry.route)}::${entry.viewport}`)
    );
    const missing = [];

    for (const route of routes) {
        for (const viewport of viewports) {
            if (!approved.has(`${route}::${viewport}`)) {
                missing.push({ route, viewport });
            }
        }
    }

    return {
        approvedCount: approved.size,
        missingCount: missing.length,
        missing
    };
}

function summarizeVisualIssues(report) {
    return (report.pages || [])
        .filter((page) => page.assessment?.status !== 'good' || (page.assessment?.findings || []).length > 0)
        .map((page) => ({
            route: page.route,
            viewport: page.viewport,
            status: page.assessment?.status || 'unknown',
            score: page.assessment?.score || 0,
            findings: (page.assessment?.findings || []).slice(0, 3).map((finding) => ({
                severity: finding.severity,
                message: finding.message
            }))
        }))
        .sort((left, right) => left.score - right.score);
}

function runFirstViewportSpecs(baseUrl, runDir) {
    const outputPath = path.join(runDir, 'first-viewport-playwright.json');
    const result = runNpx(
        [
            'playwright',
            'test',
            ...FIRST_VIEWPORT_SPECS,
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
    const byProject = {};

    for (const test of tests) {
        const projectName = test.projectName || 'default';
        byProject[projectName] = byProject[projectName] || { total: 0, passed: 0, failed: 0, failedTests: [] };
        byProject[projectName].total += 1;
        if (test.status === 'passed') {
            byProject[projectName].passed += 1;
        } else {
            byProject[projectName].failed += 1;
            byProject[projectName].failedTests.push({
                title: test.title,
                file: test.file,
                line: test.line
            });
        }
    }

    return {
        ok: result.status === 0,
        outputPath,
        stats: parsed.stats || {},
        errors: parsed.errors || [],
        byProject
    };
}

function buildMarkdownReport(report) {
    const lines = [
        '# Visual Robust Audit',
        '',
        `Generated at: ${report.generatedAt}`,
        `Base URL: ${report.baseUrl}`,
        `Scope: ${report.scope}`,
        `Routes covered: ${report.routes.length}`,
        `Viewports: ${report.viewports.join(', ')}`,
        '',
        '## Visual Agent By Viewport',
        ''
    ];

    for (const [viewport, summary] of Object.entries(report.visual.byViewport)) {
        lines.push(`- ${viewport}: ${summary.good} good / ${summary.review} review / ${summary.bad} bad (${summary.total} pages)`);
    }

    lines.push('', '## First Viewport Specs', '');
    if (!report.firstViewport) {
        lines.push('- skipped');
    } else {
        for (const [projectName, summary] of Object.entries(report.firstViewport.byProject)) {
            lines.push(`- ${projectName}: ${summary.passed} passed / ${summary.failed} failed (${summary.total} total)`);
            for (const failure of summary.failedTests.slice(0, 5)) {
                lines.push(`  - ${failure.title}`);
            }
        }
        if ((report.firstViewport.errors || []).length > 0) {
            for (const error of report.firstViewport.errors.slice(0, 3)) {
                lines.push(`- reporter error: ${error.message}`);
            }
        }
    }

    lines.push('', '## Baseline Coverage', '');
    lines.push(`- approved entries in manifest: ${report.baselines.approvedCount}`);
    lines.push(`- missing route/viewport pairs in this run: ${report.baselines.missingCount}`);
    for (const entry of report.baselines.missing.slice(0, 12)) {
        lines.push(`- missing: ${entry.route} [${entry.viewport}]`);
    }

    lines.push('', '## Priority Visual Issues', '');
    if (report.visual.issues.length === 0) {
        lines.push('- None');
    } else {
        for (const issue of report.visual.issues.slice(0, 18)) {
            const findingText = issue.findings.length === 0
                ? 'no structured findings'
                : issue.findings.map((finding) => `[${finding.severity}] ${finding.message}`).join('; ');
            lines.push(`- ${issue.route} [${issue.viewport}] (${issue.status}, score ${issue.score}): ${findingText}`);
        }
    }

    return `${lines.join('\n')}\n`;
}

async function runVisualRobustAudit(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;
    const routes = selectRoutes(args);
    const viewports = args.viewports.length > 0 ? args.viewports : [...DEFAULT_VIEWPORTS];
    const generatedAt = new Date().toISOString();
    const runDir = args.outputDir || path.join(artifactsRoot, timestampSlug(new Date(generatedAt)));

    ensureDir(runDir);

    const { baseUrl, serverHandle } = await resolveBaseUrl(args.baseUrl || '');

    try {
        const visualDir = path.join(runDir, 'visual-agent');
        const visualRun = await runVisualAgent({
            baseUrl,
            routes,
            viewports,
            outputDir: visualDir,
            scope: args.scope || 'landings',
            includeFleetClicks: Boolean(args.includeFleetClicks)
        });
        const firstViewport = args.skipFirstViewport ? null : runFirstViewportSpecs(baseUrl, runDir);
        const baselines = summarizeBaselineCoverage(routes, viewports);
        const report = {
            generatedAt,
            baseUrl,
            scope: args.scope || 'landings',
            routes,
            viewports,
            visual: {
                runDir: visualRun.runDir,
                byViewport: summarizeVisualByViewport(visualRun.report),
                issues: summarizeVisualIssues(visualRun.report)
            },
            firstViewport,
            baselines
        };

        fs.writeFileSync(path.join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
        fs.writeFileSync(path.join(runDir, 'report.md'), buildMarkdownReport(report));

        return { runDir, report };
    } finally {
        if (serverHandle?.child) {
            stopProcess(serverHandle.child);
        }
    }
}

async function main() {
    const { runDir, report } = await runVisualRobustAudit({ argv: process.argv.slice(2) });
    console.log(`Visual robust audit completed: ${runDir}`);
    console.log(`routes=${report.routes.length} viewports=${report.viewports.length} missingBaselines=${report.baselines.missingCount}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Visual robust audit failed.');
        console.error(error.stack || error.message);
        process.exit(1);
    });
}

module.exports = {
    buildMarkdownReport,
    parseArgs,
    runVisualRobustAudit,
    summarizeBaselineCoverage,
    summarizeVisualByViewport
};
