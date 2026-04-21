const fs = require('node:fs');
const path = require('node:path');

const {
    DEFAULT_MEMORY_ROOT,
    buildAuditMemory,
    canApproveAuditMemory,
    compareAuditMemory,
    formatAuditMemoryRegression,
    inferAuditKind,
    readApprovedAuditMemory,
    writeApprovedAuditMemory
} = require('../server/audit-memory-core');

const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv = []) {
    const args = {
        reportPath: '',
        latestRoot: '',
        kind: '',
        memoryRoot: DEFAULT_MEMORY_ROOT,
        approve: false,
        force: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if ((value === '--report' || value === '--from-report') && argv[index + 1]) {
            args.reportPath = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--latest' && argv[index + 1]) {
            args.latestRoot = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--kind' && argv[index + 1]) {
            args.kind = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--memory-root' && argv[index + 1]) {
            args.memoryRoot = argv[index + 1];
            index += 1;
            continue;
        }

        if (value === '--approve') {
            args.approve = true;
            continue;
        }

        if (value === '--force') {
            args.force = true;
        }
    }

    return args;
}

function resolvePath(value) {
    if (!value) {
        return '';
    }

    return path.isAbsolute(value)
        ? value
        : path.join(repoRoot, value);
}

function latestReportPath(rootValue) {
    const root = resolvePath(rootValue);

    if (!root || !fs.existsSync(root)) {
        throw new Error(`Latest report root does not exist: ${rootValue}`);
    }

    const directReport = path.join(root, 'report.json');
    if (fs.existsSync(directReport)) {
        return directReport;
    }

    const candidates = fs.readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(root, entry.name))
        .filter((dir) => fs.existsSync(path.join(dir, 'report.json')))
        .map((dir) => ({
            dir,
            reportPath: path.join(dir, 'report.json'),
            mtimeMs: fs.statSync(path.join(dir, 'report.json')).mtimeMs
        }))
        .sort((left, right) => right.mtimeMs - left.mtimeMs);

    if (candidates.length === 0) {
        throw new Error(`No report.json found under: ${rootValue}`);
    }

    return candidates[0].reportPath;
}

function loadReport(args) {
    const reportPath = args.reportPath
        ? resolvePath(args.reportPath)
        : latestReportPath(args.latestRoot);

    if (!reportPath || !fs.existsSync(reportPath)) {
        throw new Error(`Report does not exist: ${reportPath || '(missing --report or --latest)'}`);
    }

    return {
        reportPath,
        report: JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    };
}

function printComparison(comparison) {
    console.log(`Audit memory check: kind=${comparison.kind} status=${comparison.status}`);
    console.log(`required=${comparison.summary.requiredSignals} compared=${comparison.summary.comparedSignals} skippedOutOfScope=${comparison.summary.skippedOutOfScope} skippedDisabledFamily=${comparison.summary.skippedDisabledFamily} regressions=${comparison.summary.regressions}`);

    if (comparison.status === 'missing') {
        console.log(comparison.message);
        return;
    }

    if (comparison.regressions.length > 0) {
        console.error(comparison.message);
        for (const regression of comparison.regressions.slice(0, 20)) {
            console.error(`- ${formatAuditMemoryRegression(regression)}`);
        }
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const { reportPath, report } = loadReport(args);
    const kind = args.kind || inferAuditKind(report);
    const memoryRoot = resolvePath(args.memoryRoot);

    if (args.approve) {
        const approval = canApproveAuditMemory(report, { kind });

        if (!approval.canApprove && !args.force) {
            console.error(`Cannot approve ${kind} audit memory from ${reportPath}`);
            console.error(`Reasons: ${approval.reasons.join(', ') || 'unknown'}`);
            process.exit(1);
        }

        const memory = buildAuditMemory(report, { kind });
        const memoryPath = writeApprovedAuditMemory(memory, memoryRoot);
        console.log(`Approved ${kind} audit memory: ${memoryPath}`);
        console.log(`signals=${memory.signalsSummary.total} passed=${memory.signalsSummary.passed} review=${memory.signalsSummary.review} failed=${memory.signalsSummary.failed}`);
        return;
    }

    const approvedMemory = readApprovedAuditMemory(kind, memoryRoot);
    const comparison = compareAuditMemory(report, approvedMemory, {
        kind,
        approvedMemoryPath: approvedMemory ? path.join(memoryRoot, `${kind}.json`) : ''
    });
    printComparison(comparison);

    if (comparison.status === 'bad') {
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Audit memory command failed.');
        console.error(error.stack || error.message);
        process.exit(1);
    });
}

module.exports = {
    latestReportPath,
    loadReport,
    parseArgs
};
