const fs = require('fs');
const path = require('path');

const {
    buildComponentContractAudit
} = require('../server/component-contract-audit-core');

const repoRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(repoRoot, 'site');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'component-contract-audit');

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function normalizePath(filePath = '') {
    return String(filePath || '').replace(/\\/g, '/');
}

function parseArgs(argv = []) {
    const args = {
        outputDir: '',
        include: []
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--output-dir' && argv[index + 1]) {
            args.outputDir = path.resolve(repoRoot, argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--include' && argv[index + 1]) {
            args.include.push(argv[index + 1]);
            index += 1;
        }
    }

    return args;
}

function walkFiles(rootDir, predicate, files = []) {
    if (!fs.existsSync(rootDir)) {
        return files;
    }

    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
        const entryPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            walkFiles(entryPath, predicate, files);
            continue;
        }

        if (entry.isFile() && predicate(entryPath)) {
            files.push(entryPath);
        }
    }

    return files;
}

function isAuditedSiteFile(filePath = '') {
    const normalized = normalizePath(path.relative(siteRoot, filePath));
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.html') {
        return true;
    }

    return extension === '.css' && normalized.startsWith('css/');
}

function readAuditSources(files = []) {
    return files.map((filePath) => ({
        filePath: normalizePath(path.relative(repoRoot, filePath)),
        type: path.extname(filePath).toLowerCase() === '.css' ? 'css' : 'html',
        content: fs.readFileSync(filePath, 'utf8')
    }));
}

function resolveInputFiles(args = {}) {
    if (args.include?.length > 0) {
        return args.include
            .map((value) => path.resolve(repoRoot, value))
            .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile())
            .filter(isAuditedSiteFile);
    }

    return walkFiles(siteRoot, isAuditedSiteFile).sort((left, right) => left.localeCompare(right));
}

function writeReport(report, outputDir = '') {
    const runDir = outputDir || path.join(artifactsRoot, timestampSlug());
    ensureDir(runDir);

    const reportPath = path.join(runDir, 'report.json');
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    return {
        runDir,
        reportPath
    };
}

function runComponentContractAudit(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : { ...parseArgs([]), ...options };
    const files = resolveInputFiles(args);
    const sources = readAuditSources(files);
    const report = buildComponentContractAudit(sources);
    const output = writeReport(report, args.outputDir);

    return {
        ...output,
        report
    };
}

function main() {
    const { runDir, report } = runComponentContractAudit({ argv: process.argv.slice(2) });
    const summary = report.summary;

    console.log(`Component contract audit completed: ${runDir}`);
    console.log(`files=${summary.files} html=${summary.htmlFiles} css=${summary.cssFiles} findings=${summary.total} rawHex=${summary.byType.raw_hex_color || 0}`);
    console.log(`buttonFamilies=${summary.buttonFamilies} cardFamilies=${summary.cardFamilies} pagesWithPatternMarkers=${summary.pagesWithPatternMarkers}`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error('Component contract audit failed.');
        console.error(error.stack || error.message || String(error));
        process.exit(1);
    }
}

module.exports = {
    isAuditedSiteFile,
    parseArgs,
    readAuditSources,
    resolveInputFiles,
    runComponentContractAudit,
    walkFiles,
    writeReport
};
