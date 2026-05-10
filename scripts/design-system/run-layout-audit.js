const fs = require('fs');
const path = require('path');

const { chromium } = require('playwright');

const {
  buildLayoutAuditSummary,
  collectLayoutMeasurements,
  loadPagePatternManifest,
  resolveLayoutViewports,
  resolvePagePattern
} = require('../../server/design-system/layout-audit-core');
const {
  startStaticServer,
  stopProcess
} = require('../../server/shared/site-audit-utils');

const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'layout-audit');

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function parseArgs(argv = []) {
  const args = {
    baseUrl: '',
    outputDir: '',
    port: 8097,
    routes: [],
    viewportGroup: 'firstViewport',
    viewports: [],
    strict: false,
    keepServer: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--base-url' && argv[index + 1]) {
      args.baseUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--output-dir' && argv[index + 1]) {
      args.outputDir = path.resolve(repoRoot, argv[index + 1]);
      index += 1;
      continue;
    }

    if (value === '--port' && argv[index + 1]) {
      args.port = Number(argv[index + 1]) || args.port;
      index += 1;
      continue;
    }

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
      args.viewportGroup = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--strict') {
      args.strict = true;
      continue;
    }

    if (value === '--keep-server') {
      args.keepServer = true;
    }
  }

  return args;
}

function defaultRoutes(manifest) {
  return [
    '/',
    '/fleet.html',
    '/services.html',
    '/locations.html',
    '/reservation-lookup.html',
    '/app/reserve/page.html',
    '/contact.html',
    '/lamborghini-rental-dubai.html',
    '/lamborghini-huracan-evo-spyder-rental-dubai.html'
  ].filter((route) => manifest.routes?.[route]);
}

function statusIcon(status = '') {
  if (status === 'good') {
    return 'PASS';
  }
  if (status === 'review') {
    return 'REVIEW';
  }
  return 'FAIL';
}

function writeReports({ runDir, args, manifest, results, summary }) {
  ensureDir(runDir);

  const jsonReport = {
    generatedAt: new Date().toISOString(),
    args,
    manifestVersion: manifest.version,
    summary,
    results
  };

  const lines = [
    '# Layout Audit Report',
    '',
    `Generated: ${jsonReport.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Pages measured: ${summary.pages}`,
    `- Good: ${summary.good}`,
    `- Review: ${summary.review}`,
    `- Bad: ${summary.bad}`,
    `- Findings: ${summary.findings.total}`,
    `- High: ${summary.findings.high}`,
    `- Medium: ${summary.findings.medium}`,
    `- Low: ${summary.findings.low}`,
    '',
    '## Results',
    ''
  ];

  for (const result of results) {
    lines.push(`### ${statusIcon(result.status)} ${result.route} - ${result.viewport.name} - ${result.pattern}`);
    lines.push('');
    lines.push(`- Overflow: ${result.metrics.horizontalOverflowPx}px`);
    lines.push(`- Primary task depth: ${result.metrics.primaryTaskDepthRatio === null ? 'n/a' : result.metrics.primaryTaskDepthRatio.toFixed(3)}`);
    lines.push(`- Hero height ratio: ${result.metrics.heroHeightRatio === null ? 'n/a' : result.metrics.heroHeightRatio.toFixed(3)}`);
    lines.push(`- H1 lines: ${result.metrics.h1LineCount}`);
    if (result.metrics.cardRows?.length) {
      const worstTopDelta = Math.max(...result.metrics.cardRows.map((row) => row.topDeltaPx));
      const worstBottomDelta = Math.max(...result.metrics.cardRows.map((row) => row.bottomDeltaPx));
      lines.push(`- Card rows: ${result.metrics.cardRows.length} measured (top delta max ${worstTopDelta.toFixed(1)}px, bottom delta max ${worstBottomDelta.toFixed(1)}px)`);
    }

    if (result.findings.length) {
      lines.push('');
      for (const finding of result.findings) {
        const details = [
          finding.slot ? `slot=${finding.slot}` : '',
          finding.expected !== null && finding.expected !== undefined ? `expected ${finding.expected}` : '',
          finding.actual !== null && finding.actual !== undefined ? `actual ${finding.actual}` : ''
        ].filter(Boolean).join('; ');
        lines.push(`- ${finding.severity.toUpperCase()} ${finding.type}: ${finding.message}${details ? ` (${details})` : ''}`);
      }
    }

    lines.push('');
  }

  const jsonPath = path.join(runDir, 'report.json');
  const markdownPath = path.join(runDir, 'report.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(jsonReport, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`, 'utf8');

  return {
    jsonPath,
    markdownPath
  };
}

async function runLayoutAudit(options = {}) {
  const args = options.argv ? parseArgs(options.argv) : { ...parseArgs([]), ...options };
  const manifest = loadPagePatternManifest();
  const routes = args.routes.length ? args.routes : defaultRoutes(manifest);
  const viewports = resolveLayoutViewports({
    viewportNames: args.viewports,
    viewportGroup: args.viewportGroup,
    manifest
  });
  const baseUrl = args.baseUrl || `http://127.0.0.1:${args.port}`;
  const runDir = args.outputDir || path.join(artifactsRoot, timestampSlug());

  let server = null;
  if (!args.baseUrl) {
    server = await startStaticServer({
      projectRoot: repoRoot,
      port: args.port,
      baseUrl,
      label: 'Layout audit static server'
    });
  }

  const browser = await chromium.launch();
  const results = [];

  try {
    for (const route of routes) {
      for (const viewport of viewports) {
        const page = await browser.newPage({
          viewport: {
            width: viewport.width,
            height: viewport.height
          },
          isMobile: viewport.isMobile,
          hasTouch: viewport.hasTouch,
          deviceScaleFactor: viewport.deviceScaleFactor
        });

        await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(250);

        const result = await collectLayoutMeasurements(page, {
          route,
          pattern: resolvePagePattern(route, manifest),
          viewport
        });

        results.push(result);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    if (server && !args.keepServer) {
      stopProcess(server.child);
    }
  }

  const summary = buildLayoutAuditSummary(results);
  const reports = writeReports({ runDir, args, manifest, results, summary });

  return {
    runDir,
    reports,
    summary,
    results
  };
}

async function main() {
  const output = await runLayoutAudit({ argv: process.argv.slice(2) });
  const summary = output.summary;

  console.log(`Layout audit completed: ${output.runDir}`);
  console.log(`pages=${summary.pages} good=${summary.good} review=${summary.review} bad=${summary.bad} findings=${summary.findings.total}`);
  console.log(`report=${output.reports.markdownPath}`);

  if (summary.bad > 0 && parseArgs(process.argv.slice(2)).strict) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Layout audit failed.');
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  defaultRoutes,
  parseArgs,
  runLayoutAudit,
  writeReports
};
