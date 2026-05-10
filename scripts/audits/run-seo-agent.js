const fs = require('fs');
const net = require('net');
const path = require('path');

const {
    buildSeoAuditReport,
    DEFAULT_PUBLIC_ORIGIN,
    normalizeRoute
} = require('../../server/audits/seo-audit-core');
const {
    fetchUrl,
    startStaticServer,
    stopProcess
} = require('../../server/shared/site-audit-utils');

const projectRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(projectRoot, 'site');
const artifactsRoot = path.join(projectRoot, 'artifacts', 'seo-agent');
const DEFAULT_CRITICAL_ROUTES = Object.freeze([
    '/',
    '/fleet.html',
    '/services.html',
    '/locations.html',
    '/contact.html',
    '/app/reserve/page.html',
    '/lamborghini-rental-dubai.html',
    '/lamborghini-huracan-evo-spyder-rental-dubai.html',
    '/mercedes-g63-amg-rental-dubai.html'
]);

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function parseArgs(argv = []) {
    const args = {
        routes: [],
        scope: 'all',
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
        outputDir: '',
        publicOrigin: process.env.SEO_PUBLIC_ORIGIN || DEFAULT_PUBLIC_ORIGIN,
        gate: false,
        strict: false,
        json: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--route' && argv[index + 1]) {
            args.routes.push(normalizeRoute(argv[index + 1]));
            index += 1;
            continue;
        }

        if (value === '--scope' && argv[index + 1]) {
            args.scope = String(argv[index + 1]).trim() || args.scope;
            index += 1;
            continue;
        }

        if (value === '--base-url' && argv[index + 1]) {
            args.baseUrl = String(argv[index + 1]).trim();
            index += 1;
            continue;
        }

        if (value === '--output-dir' && argv[index + 1]) {
            args.outputDir = path.resolve(projectRoot, argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--public-origin' && argv[index + 1]) {
            args.publicOrigin = String(argv[index + 1]).replace(/\/+$/, '');
            index += 1;
            continue;
        }

        if (value === '--gate') {
            args.gate = true;
            continue;
        }

        if (value === '--strict') {
            args.strict = true;
            args.gate = true;
            continue;
        }

        if (value === '--json') {
            args.json = true;
        }
    }

    return args;
}

function resolveRoutes(args = {}) {
    if (args.routes?.length > 0) {
        return [...new Set(args.routes.map(normalizeRoute))];
    }

    if (args.scope === 'critical') {
        return [...DEFAULT_CRITICAL_ROUTES];
    }

    return [];
}

function findAvailablePort(startPort = 8610) {
    return new Promise((resolve, reject) => {
        function tryPort(port) {
            const server = net.createServer();
            server.once('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    tryPort(port + 1);
                    return;
                }
                reject(error);
            });
            server.once('listening', () => {
                server.close(() => resolve(port));
            });
            server.listen(port, '127.0.0.1');
        }

        tryPort(startPort);
    });
}

function markdownEscape(value) {
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function findingCounts(findings = []) {
    return findings.reduce((counts, finding) => {
        counts[finding.severity] = (counts[finding.severity] || 0) + 1;
        return counts;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
}

function compactFinding(finding) {
    if (!finding) {
        return '';
    }

    return `${finding.severity}/${finding.category}: ${finding.message}`;
}

function buildMarkdownReport(report) {
    const lines = [
        '# Super SEO Agent Report',
        '',
        `Generated: ${report.generatedAt}`,
        `Public origin: ${report.publicOrigin}`,
        '',
        '## Executive Summary',
        '',
        `- Average score: ${report.totals.averageScore}/100`,
        `- Audited pages: ${report.totals.auditedPages}`,
        `- Sitemap URLs: ${report.totals.sitemapUrls}`,
        `- Public HTML outside sitemap: ${report.totals.publicHtmlOutsideSitemap}`,
        `- Gate: ${report.totals.passedGate ? 'PASS' : 'FAIL'}`,
        `- Findings: ${report.findings.bySeverity.critical} critical, ${report.findings.bySeverity.high} high, ${report.findings.bySeverity.medium} medium, ${report.findings.bySeverity.low} low`,
        '',
        '## Category Pressure',
        '',
        '| Category | Findings |',
        '| --- | ---: |'
    ];

    Object.entries(report.findings.byCategory)
        .sort((left, right) => right[1] - left[1])
        .forEach(([category, count]) => {
            lines.push(`| ${markdownEscape(category)} | ${count} |`);
        });

    lines.push(
        '',
        '## Page Matrix',
        '',
        '| URL | Family | Score | Gate | Critical | High | Medium | Low | Top finding |',
        '| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |'
    );

    report.pages
        .slice()
        .sort((left, right) => left.score - right.score || left.route.localeCompare(right.route))
        .forEach((page) => {
            const counts = findingCounts(page.findings);
            const topFinding = page.findings.find((finding) => finding.hardFail) || page.findings[0];
            lines.push(
                `| ${markdownEscape(page.route)} | ${markdownEscape(page.family)} | ${page.score} | ${page.passedGate ? 'PASS' : 'FAIL'} | ${counts.critical} | ${counts.high} | ${counts.medium} | ${counts.low} | ${markdownEscape(compactFinding(topFinding))} |`
            );
        });

    const hardFindings = report.allFindings.filter((finding) => finding.hardFail);
    lines.push('', '## Hard Failures');
    if (hardFindings.length === 0) {
        lines.push('', '- none');
    } else {
        hardFindings.forEach((finding) => {
            lines.push('', `- ${finding.route}: ${finding.message}`);
            if (finding.evidence) {
                lines.push(`  Evidence: ${finding.evidence}`);
            }
            if (finding.recommendation) {
                lines.push(`  Recommendation: ${finding.recommendation}`);
            }
        });
    }

    const warningFindings = report.allFindings
        .filter((finding) => !finding.hardFail)
        .sort((left, right) => {
            const rank = { critical: 4, high: 3, medium: 2, low: 1 };
            return (rank[right.severity] || 0) - (rank[left.severity] || 0);
        })
        .slice(0, 80);

    lines.push('', '## Top Improvement Backlog');
    if (warningFindings.length === 0) {
        lines.push('', '- none');
    } else {
        warningFindings.forEach((finding) => {
            lines.push('', `- ${finding.route}: ${finding.severity}/${finding.category} - ${finding.message}`);
            if (finding.evidence) {
                lines.push(`  Evidence: ${finding.evidence}`);
            }
            if (finding.recommendation) {
                lines.push(`  Recommendation: ${finding.recommendation}`);
            }
        });
    }

    lines.push(
        '',
        '## Metrics Snapshot',
        '',
        '| URL | Words | H1 | Incoming | Outgoing | Images | Missing alt | Schema |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |'
    );

    report.pages.forEach((page) => {
        lines.push(
            `| ${markdownEscape(page.route)} | ${page.metrics.wordCount} | ${page.metrics.h1Count} | ${page.metrics.incomingLinks} | ${page.metrics.outgoingInternalLinks} | ${page.metrics.images} | ${page.metrics.missingAltImages} | ${markdownEscape(page.metrics.schemaTypes.join(', ') || '-')} |`
        );
    });

    return `${lines.join('\n')}\n`;
}

function buildConsoleSummary(report, markdownPath, jsonPath) {
    const lowestPages = report.pages
        .slice()
        .sort((left, right) => left.score - right.score)
        .slice(0, 5)
        .map((page) => `- ${page.route}: ${page.score}/100 (${page.findings.length} finding(s))`)
        .join('\n');

    return [
        '',
        'Super SEO agent complete',
        '',
        `Average score: ${report.totals.averageScore}/100`,
        `Gate: ${report.totals.passedGate ? 'PASS' : 'FAIL'}`,
        `Findings: ${report.findings.bySeverity.critical} critical, ${report.findings.bySeverity.high} high, ${report.findings.bySeverity.medium} medium, ${report.findings.bySeverity.low} low`,
        `Markdown: ${path.relative(projectRoot, markdownPath).replace(/\\/g, '/')}`,
        `JSON: ${path.relative(projectRoot, jsonPath).replace(/\\/g, '/')}`,
        '',
        'Lowest scoring pages:',
        lowestPages || '- none',
        ''
    ].join('\n');
}

async function resolveBaseUrl(args) {
    if (args.baseUrl) {
        return {
            baseUrl: args.baseUrl.replace(/\/+$/, ''),
            serverHandle: null
        };
    }

    const port = await findAvailablePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const serverHandle = await startStaticServer({
        projectRoot,
        port,
        baseUrl,
        label: 'SEO agent static server'
    });

    return {
        baseUrl,
        serverHandle
    };
}

async function runSeoAgent(argv = process.argv.slice(2)) {
    const args = parseArgs(argv);
    const routes = resolveRoutes(args);
    const outputDir = args.outputDir || path.join(artifactsRoot, timestampSlug());
    ensureDir(outputDir);

    const { baseUrl, serverHandle } = await resolveBaseUrl(args);

    try {
        const report = await buildSeoAuditReport({
            projectRoot,
            siteRoot,
            publicOrigin: args.publicOrigin,
            routes,
            fetchRoute: async (route) => fetchUrl(`${baseUrl}${route}`)
        });
        const jsonPath = path.join(outputDir, 'seo-agent-report.json');
        const markdownPath = path.join(outputDir, 'seo-agent-report.md');
        const markdown = buildMarkdownReport(report);

        fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        fs.writeFileSync(markdownPath, markdown, 'utf8');

        if (args.json) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log(buildConsoleSummary(report, markdownPath, jsonPath));
        }

        const strictFailure = args.strict && (
            report.allFindings.some((finding) => ['critical', 'high', 'medium'].includes(finding.severity))
        );

        if ((args.gate && !report.totals.passedGate) || strictFailure) {
            throw new Error(args.strict
                ? 'SEO strict gate failed: medium-or-higher findings remain.'
                : 'SEO gate failed: hard failures remain.');
        }

        return report;
    } finally {
        if (serverHandle?.child) {
            stopProcess(serverHandle.child);
        }
    }
}

if (require.main === module) {
    runSeoAgent().catch((error) => {
        console.error('\nSuper SEO agent failed.\n');
        console.error(error.message);
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_CRITICAL_ROUTES,
    buildMarkdownReport,
    parseArgs,
    resolveRoutes,
    runSeoAgent
};
