const fs = require('node:fs');
const path = require('node:path');

const { runVisualAgent } = require('./run-visual-agent');
const {
    DEFAULT_VIEWPORTS,
    VISUAL_SMOKE_VIEWPORT_GROUPS,
    resolveSmokeViewports
} = require('./run-visual-smoke-audit');
const {
    formatVisualChangeGuardFailure,
    summarizeVisualChangeGuard
} = require('../server/change-guard-core');
const {
    DEFAULT_MEMORY_ROOT,
    writeApprovedAuditMemory,
    buildAuditMemory,
    canApproveAuditMemory
} = require('../server/audit-memory-core');

const repoRoot = path.resolve(__dirname, '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'change-guard-audit');

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

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function resolvePath(value) {
    if (!value) {
        return '';
    }

    return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

function parseArgs(argv = []) {
    const args = {
        routes: [],
        viewports: [],
        viewportGroups: [],
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        memoryRoot: DEFAULT_MEMORY_ROOT,
        scope: 'smoke',
        strictReview: true,
        requireMemory: true,
        requireApprovedBaselines: true,
        includeFleetClicks: false,
        approveMemory: false,
        force: false
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

        if (value === '--full') {
            args.scope = 'full';
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

        if (value === '--memory-root' && argv[index + 1]) {
            args.memoryRoot = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--allow-review') {
            args.strictReview = false;
            continue;
        }

        if (value === '--allow-missing-memory') {
            args.requireMemory = false;
            continue;
        }

        if (value === '--allow-missing-baselines') {
            args.requireApprovedBaselines = false;
            continue;
        }

        if (value === '--fleet-clicks') {
            args.includeFleetClicks = true;
            continue;
        }

        if (value === '--approve-memory') {
            args.approveMemory = true;
            continue;
        }

        if (value === '--force') {
            args.force = true;
        }
    }

    return args;
}

function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))];
}

function resolveGuardViewports(args = {}) {
    if ((args.viewportGroups || []).length === 0 && (args.viewports || []).length === 0) {
        return [...DEFAULT_VIEWPORTS];
    }

    return resolveSmokeViewports(args);
}

function resolveGuardRoutes(args = {}) {
    if ((args.routes || []).length > 0) {
        return uniqueValues(args.routes);
    }

    if (args.scope === 'full') {
        return [];
    }

    return [...DEFAULT_ROUTES];
}

function buildMarkdownReport({ runDir, report, guard }) {
    const lines = [
        '# Change Guard Audit',
        '',
        `- run: ${runDir}`,
        `- visual status: good=${report.summary?.byStatus?.good || 0} review=${report.summary?.byStatus?.review || 0} bad=${report.summary?.byStatus?.bad || 0}`,
        `- guard: ${guard.failed ? 'failed' : 'passed'}`,
        `- strict review: ${guard.strictReview}`,
        `- require memory: ${guard.requireMemory}`,
        `- require baselines: ${guard.requireApprovedBaselines}`,
        '',
        '## Gate',
        '',
        `- bad pages: ${guard.summary.badPages}`,
        `- review pages: ${guard.summary.reviewPages}`,
        `- hard-fail pages: ${guard.summary.hardFailPages}`,
        `- missing baselines: ${guard.summary.missingBaselinePages}`,
        `- baseline diffs: ${guard.summary.baselineDiffPages}`,
        `- memory regressions: ${guard.summary.memoryRegressions}`,
        `- missing memory: ${guard.summary.missingMemory}`
    ];

    if (guard.failed) {
        lines.push('', '## Failures', '', formatVisualChangeGuardFailure(guard));
    }

    return `${lines.join('\n')}\n`;
}

async function runChangeGuardAudit(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : options;
    const outputDir = args.outputDir || path.join(artifactsRoot, timestampSlug());
    const memoryRoot = resolvePath(args.memoryRoot || DEFAULT_MEMORY_ROOT);
    const routes = resolveGuardRoutes(args);
    const viewports = resolveGuardViewports(args);
    const visualRun = await runVisualAgent({
        baseUrl: args.baseUrl || '',
        routes,
        viewports,
        outputDir: path.join(outputDir, 'visual-agent'),
        scope: args.scope || 'smoke',
        includeFleetClicks: Boolean(args.includeFleetClicks)
    });
    const guard = summarizeVisualChangeGuard(visualRun.report, {
        strictReview: args.strictReview !== false,
        requireMemory: args.approveMemory ? false : args.requireMemory !== false,
        requireApprovedBaselines: args.requireApprovedBaselines !== false,
        memoryRoot
    });
    const report = {
        generatedAt: new Date().toISOString(),
        runDir: outputDir,
        visualRunDir: visualRun.runDir,
        routes: routes.length > 0 ? routes : visualRun.report.pages.map((page) => page.route),
        viewports,
        guard,
        visual: {
            summary: visualRun.report.summary,
            reportPath: path.join(visualRun.runDir, 'report.json')
        }
    };

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, 'report.md'), buildMarkdownReport({
        runDir: outputDir,
        report: visualRun.report,
        guard
    }));

    if (args.approveMemory) {
        const approval = canApproveAuditMemory(visualRun.report, { kind: 'visual' });

        if (guard.failed && !args.force) {
            throw new Error(`Cannot approve visual memory while the change guard is failing: ${formatVisualChangeGuardFailure(guard) || 'unknown failure'}`);
        }

        if (!approval.canApprove && !args.force) {
            throw new Error(`Cannot approve visual memory from a dirty run: ${approval.reasons.join(', ') || 'unknown'}`);
        }

        report.approval = {
            memoryPath: writeApprovedAuditMemory(buildAuditMemory(visualRun.report, { kind: 'visual' }), memoryRoot)
        };
        fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    }

    return {
        runDir: outputDir,
        visualRun,
        guard,
        report
    };
}

async function main() {
    const { runDir, visualRun, guard, report } = await runChangeGuardAudit({ argv: process.argv.slice(2) });

    console.log(`Change guard audit completed: ${runDir}`);
    console.log(`visual=${visualRun.runDir}`);
    console.log(`good=${visualRun.report.summary.byStatus.good} review=${visualRun.report.summary.byStatus.review} bad=${visualRun.report.summary.byStatus.bad}`);
    console.log(`guard=${guard.failed ? 'failed' : 'passed'} missingMemory=${guard.summary.missingMemory} memoryRegressions=${guard.summary.memoryRegressions} missingBaselines=${guard.summary.missingBaselinePages}`);

    if (report.approval?.memoryPath) {
        console.log(`Approved visual memory: ${report.approval.memoryPath}`);
    }

    if (guard.failed) {
        console.error(formatVisualChangeGuardFailure(guard));
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Change guard audit failed.');
        console.error(error.stack || error.message);
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_ROUTES,
    parseArgs,
    resolveGuardRoutes,
    resolveGuardViewports,
    runChangeGuardAudit
};
