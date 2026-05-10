const fs = require('fs');
const path = require('path');

const {
  buildMotherTemplateAudit,
  loadDefaultContracts
} = require('../../server/design-system/mother-template-audit-core');

const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'mother-template-audit');

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function parseArgs(argv = []) {
  const args = {
    outputDir: '',
    strict: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--output-dir' && argv[index + 1]) {
      args.outputDir = path.resolve(repoRoot, argv[index + 1]);
      index += 1;
      continue;
    }

    if (value === '--strict') {
      args.strict = true;
    }
  }

  return args;
}

function statusLabel(summary = {}) {
  if ((summary.high || 0) > 0) {
    return 'FAIL';
  }
  if ((summary.medium || 0) > 0 || (summary.low || 0) > 0) {
    return 'REVIEW';
  }
  return 'PASS';
}

function writeReports({ report, outputDir = '' }) {
  const runDir = outputDir || path.join(artifactsRoot, timestampSlug());
  ensureDir(runDir);

  const jsonPath = path.join(runDir, 'report.json');
  const markdownPath = path.join(runDir, 'report.md');
  const lines = [
    '# Mother Template Audit Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${statusLabel(report.summary)}`,
    '',
    '## Summary',
    '',
    `- Templates: ${report.summary.templates}`,
    `- Page patterns: ${report.summary.pagePatterns}`,
    `- Routes mapped: ${report.summary.routePatterns}`,
    `- Component families: ${report.summary.componentFamilies}`,
    `- Validation groups covered: ${report.summary.validationGroups}`,
    `- Active phase: ${report.summary.activePhase || 'n/a'}`,
    `- Next phases: ${report.summary.nextPhases.join(', ') || 'n/a'}`,
    `- Findings: ${report.summary.total}`,
    `- High: ${report.summary.high}`,
    `- Medium: ${report.summary.medium}`,
    `- Low: ${report.summary.low}`,
    '',
    '## Findings',
    ''
  ];

  if (report.findings.length) {
    for (const finding of report.findings) {
      const pattern = finding.pattern ? ` ${finding.pattern}` : '';
      const detail = [
        finding.expected !== null && finding.expected !== undefined ? `expected ${finding.expected}` : '',
        finding.actual !== null && finding.actual !== undefined ? `actual ${finding.actual}` : ''
      ].filter(Boolean).join('; ');
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.type}${pattern}: ${finding.message}${detail ? ` (${detail})` : ''}`);
    }
  } else {
    lines.push('_None._');
  }

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`, 'utf8');

  return {
    runDir,
    jsonPath,
    markdownPath
  };
}

function runMotherTemplateAudit(options = {}) {
  const args = options.argv ? parseArgs(options.argv) : { ...parseArgs([]), ...options };
  const contracts = loadDefaultContracts();
  const report = buildMotherTemplateAudit({
    ...contracts,
    repoRoot
  });
  const output = writeReports({ report, outputDir: args.outputDir });

  return {
    ...output,
    report
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const output = runMotherTemplateAudit(args);
  const { summary } = output.report;

  console.log(`Mother template audit completed: ${output.runDir}`);
  console.log(`status=${statusLabel(summary)} templates=${summary.templates} patterns=${summary.pagePatterns} findings=${summary.total}`);
  console.log(`active=${summary.activePhase || 'n/a'} next=${summary.nextPhases.join(',') || 'n/a'}`);
  console.log(`report=${output.markdownPath}`);

  if (args.strict && summary.high > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Mother template audit failed.');
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runMotherTemplateAudit,
  statusLabel,
  writeReports
};
