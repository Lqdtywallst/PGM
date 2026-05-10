const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const {
    buildPricingReport
} = require('../server/pricing/pricing-agent-core');
const {
    getReservationStoreMode,
    isDatabaseConfigured,
    listReservationRecords,
    runtimeReservationDir
} = require('../server/reservations/reservation-store');

const repoRoot = path.resolve(__dirname, '..');
const fleetCardsPath = path.join(repoRoot, 'server', 'data', 'fleet-cards.json');
const defaultPolicyPath = path.join(repoRoot, 'server', 'data', 'pricing-policy.json');
const defaultCompetitorsPath = path.join(repoRoot, 'server', 'data', 'competitor-prices.json');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'pricing-agent');

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function readJsonFile(filePath, fallback = null) {
    if (!filePath || !fs.existsSync(filePath)) {
        return fallback;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function parseArgs(argv = []) {
    const args = {
        apply: false,
        strict: false,
        allowMissingCompetitors: false,
        policyPath: defaultPolicyPath,
        competitorsPath: fs.existsSync(defaultCompetitorsPath) ? defaultCompetitorsPath : '',
        outputDir: '',
        reservationsDir: '',
        reservationLimit: 1000
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--apply') {
            args.apply = true;
            continue;
        }

        if (value === '--strict') {
            args.strict = true;
            continue;
        }

        if (value === '--allow-missing-competitors') {
            args.allowMissingCompetitors = true;
            continue;
        }

        if (value === '--policy' && argv[index + 1]) {
            args.policyPath = path.resolve(repoRoot, argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--competitors' && argv[index + 1]) {
            args.competitorsPath = path.resolve(repoRoot, argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--reservations-dir' && argv[index + 1]) {
            args.reservationsDir = path.resolve(repoRoot, argv[index + 1]);
            index += 1;
            continue;
        }

        if (value === '--reservation-limit' && argv[index + 1]) {
            args.reservationLimit = Number(argv[index + 1]) || args.reservationLimit;
            index += 1;
            continue;
        }

        if (value === '--output-dir' && argv[index + 1]) {
            args.outputDir = path.resolve(repoRoot, argv[index + 1]);
            index += 1;
        }
    }

    return args;
}

function readLocalReservations(reservationsDir) {
    if (!reservationsDir || !fs.existsSync(reservationsDir)) {
        return [];
    }

    return fs.readdirSync(reservationsDir)
        .filter((fileName) => fileName.endsWith('.json'))
        .map((fileName) => {
            const filePath = path.join(reservationsDir, fileName);
            try {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
                return null;
            }
        })
        .filter(Boolean);
}

async function readReservationsForPricing(args = {}) {
    if (args.reservationsDir) {
        return {
            reservations: readLocalReservations(args.reservationsDir),
            source: `local-json:${path.relative(repoRoot, args.reservationsDir).replace(/\\/g, '/') || '.'}`
        };
    }

    if (isDatabaseConfigured()) {
        return {
            reservations: await listReservationRecords({ limit: args.reservationLimit }),
            source: getReservationStoreMode()
        };
    }

    return {
        reservations: readLocalReservations(runtimeReservationDir),
        source: `local-json:${path.relative(repoRoot, runtimeReservationDir).replace(/\\/g, '/')}`
    };
}

function formatAed(value) {
    return `${Number(value).toLocaleString('en-US')} AED`;
}

function buildMarkdownReport(report, context = {}) {
    const lines = [
        '# Pricing Agent Report',
        '',
        `Generated at: ${report.generatedAt}`,
        `Currency: ${report.currency}`,
        `Mode: ${context.apply ? 'apply' : 'recommendation'}`,
        `Policy: ${context.policyPath || 'default'}`,
        `Competitors: ${context.competitorsPath || 'none'}`,
        '',
        '## Summary',
        '',
        `- vehicles: ${report.summary.vehicleCount}`,
        `- recommended changes: ${report.summary.changedCount}`,
        `- keep current: ${report.summary.keepCount}`,
        `- competitor samples: ${report.summary.competitorSamples}`,
        `- vehicles with fresh competitor data: ${report.summary.vehiclesWithFreshCompetitors}`,
        `- apply-blocked changes: ${report.summary.applyBlockedCount}`,
        '',
        '## Recommendations',
        ''
    ];

    for (const recommendation of report.recommendations) {
        const arrow = recommendation.delta === 0
            ? 'keep'
            : (recommendation.delta > 0 ? 'raise' : 'lower');

        lines.push(`### ${recommendation.brand} ${recommendation.title}`);
        lines.push('');
        lines.push(`- action: ${arrow}`);
        lines.push(`- current: ${formatAed(recommendation.currentPrice)}`);
        lines.push(`- recommended: ${formatAed(recommendation.recommendedPrice)} (${recommendation.deltaPct}%)`);
        lines.push(`- demand: ${Math.round(recommendation.demand.utilizationPct * 100)}% utilization, ${recommendation.demand.recentBookings} recent booking(s)`);

        if (recommendation.competitor.availableSamples > 0) {
            lines.push(`- competitor: lowest ${formatAed(recommendation.competitor.lowestAvailablePrice)}, median ${formatAed(recommendation.competitor.medianAvailablePrice)}, samples ${recommendation.competitor.availableSamples}`);
        } else {
            lines.push('- competitor: no fresh available comparable sample');
        }

        lines.push(`- can apply: ${recommendation.canApply}`);
        lines.push(`- reasons: ${recommendation.reasons.join('; ')}`);
        lines.push('');
    }

    return `${lines.join('\n')}\n`;
}

function applyFleetCardRecommendations(fleetCards, recommendations) {
    const byVehicleId = new Map(recommendations.map((entry) => [entry.vehicleId, entry]));
    let changedCount = 0;

    const nextCards = fleetCards.map((card) => {
        const recommendation = byVehicleId.get(card.id);
        if (!recommendation || recommendation.status !== 'change') {
            return card;
        }

        changedCount += 1;
        return {
            ...card,
            pricePerDay: recommendation.recommendedPrice
        };
    });

    return {
        nextCards,
        changedCount
    };
}

function collectSitePriceFiles() {
    const directories = [
        path.join(repoRoot, 'site', 'pages', 'brands'),
        path.join(repoRoot, 'site', 'pages', 'vehicles')
    ];

    return directories.flatMap((directory) => (
        fs.existsSync(directory)
            ? fs.readdirSync(directory)
                .filter((fileName) => fileName.endsWith('.html'))
                .map((fileName) => path.join(directory, fileName))
            : []
    ));
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyStaticPriceTextUpdates(recommendations) {
    const changedRecommendations = recommendations.filter((entry) => entry.status === 'change');
    if (changedRecommendations.length === 0) {
        return { updatedFiles: [] };
    }

    const files = collectSitePriceFiles();
    const updatedFiles = [];

    for (const filePath of files) {
        let html = fs.readFileSync(filePath, 'utf8');
        const originalHtml = html;

        for (const recommendation of changedRecommendations) {
            const oldPlain = String(recommendation.currentPrice);
            const newPlain = String(recommendation.recommendedPrice);
            const oldDisplay = Number(recommendation.currentPrice).toLocaleString('en-US');
            const newDisplay = Number(recommendation.recommendedPrice).toLocaleString('en-US');

            html = html
                .replace(new RegExp(`price=${escapeRegExp(oldPlain)}`, 'g'), `price=${newPlain}`)
                .replace(new RegExp(`"price"\\s*:\\s*"${escapeRegExp(oldPlain)}"`, 'g'), `"price": "${newPlain}"`)
                .replace(new RegExp(`content="${escapeRegExp(oldPlain)}"`, 'g'), `content="${newPlain}"`)
                .replace(new RegExp(escapeRegExp(oldDisplay), 'g'), newDisplay);
        }

        if (html !== originalHtml) {
            fs.writeFileSync(filePath, html, 'utf8');
            updatedFiles.push(path.relative(repoRoot, filePath).replace(/\\/g, '/'));
        }
    }

    return { updatedFiles };
}

function runFleetRender() {
    const result = childProcess.spawnSync(process.execPath, [path.join(repoRoot, 'server', 'render-fleet-cards.js')], {
        cwd: repoRoot,
        stdio: 'pipe',
        encoding: 'utf8'
    });

    if (result.status !== 0) {
        throw new Error(`Fleet render failed: ${result.stderr || result.stdout}`);
    }

    return result.stdout.trim();
}

async function runPricingAgent(options = {}) {
    const args = options.argv ? parseArgs(options.argv) : { ...parseArgs([]), ...options };
    const generatedAt = new Date();
    const outputDir = args.outputDir || path.join(artifactsRoot, timestampSlug(generatedAt));
    ensureDir(outputDir);

    const fleetCards = readJsonFile(fleetCardsPath, []);
    const policy = readJsonFile(args.policyPath, {});
    const competitorSnapshot = args.competitorsPath ? readJsonFile(args.competitorsPath, {}) : {};
    const reservationRead = await readReservationsForPricing(args);
    const reservations = reservationRead.reservations;
    const report = buildPricingReport({
        fleetCards,
        reservations,
        competitorSnapshot,
        policy,
        now: generatedAt
    });

    const changedBlocked = report.recommendations.filter((entry) => entry.status === 'change' && !entry.canApply);
    const shouldBlockApply = args.apply && changedBlocked.length > 0 && !args.allowMissingCompetitors;
    const strictWarnings = [];

    if (report.summary.vehiclesWithFreshCompetitors < report.summary.vehicleCount) {
        strictWarnings.push('Not every vehicle has fresh competitor data.');
    }

    if (shouldBlockApply) {
        strictWarnings.push(`Apply blocked for ${changedBlocked.length} vehicle(s) without fresh competitor data.`);
    }

    let applyResult = {
        applied: false,
        changedCount: 0,
        updatedStaticFiles: [],
        fleetRender: ''
    };

    if (args.apply) {
        if (shouldBlockApply) {
            report.applyBlocked = true;
        } else {
            const { nextCards, changedCount } = applyFleetCardRecommendations(fleetCards, report.recommendations);
            writeJsonFile(fleetCardsPath, nextCards);
            const staticUpdate = applyStaticPriceTextUpdates(report.recommendations);
            const fleetRender = runFleetRender();
            applyResult = {
                applied: true,
                changedCount,
                updatedStaticFiles: staticUpdate.updatedFiles,
                fleetRender
            };
        }
    }

    report.context = {
        apply: Boolean(args.apply),
        allowMissingCompetitors: Boolean(args.allowMissingCompetitors),
        reservationsRead: reservations.length,
        reservationsSource: reservationRead.source,
        policyPath: path.relative(repoRoot, args.policyPath).replace(/\\/g, '/'),
        competitorsPath: args.competitorsPath ? path.relative(repoRoot, args.competitorsPath).replace(/\\/g, '/') : '',
        applyResult,
        warnings: strictWarnings
    };

    writeJsonFile(path.join(outputDir, 'report.json'), report);
    fs.writeFileSync(path.join(outputDir, 'report.md'), buildMarkdownReport(report, report.context), 'utf8');

    const shouldFail = Boolean(report.applyBlocked) || (args.strict && strictWarnings.length > 0);

    return {
        outputDir,
        report,
        shouldFail,
        warnings: strictWarnings
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const { outputDir, report, shouldFail, warnings } = await runPricingAgent(args);

    console.log(`Pricing agent completed: ${outputDir}`);
    console.log(`vehicles=${report.summary.vehicleCount} changes=${report.summary.changedCount} competitorSamples=${report.summary.competitorSamples} freshCoverage=${report.summary.vehiclesWithFreshCompetitors}/${report.summary.vehicleCount}`);
    console.log(`mode=${args.apply ? 'apply' : 'recommend'} applied=${report.context.applyResult.applied} updated=${report.context.applyResult.changedCount} reservations=${report.context.reservationsRead} source=${report.context.reservationsSource}`);

    for (const warning of warnings) {
        console.warn(`Warning: ${warning}`);
    }

    if (shouldFail) {
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Pricing agent failed.');
        console.error(error.stack || error.message || String(error));
        process.exit(1);
    });
}

module.exports = {
    applyFleetCardRecommendations,
    applyStaticPriceTextUpdates,
    buildMarkdownReport,
    parseArgs,
    readLocalReservations,
    readReservationsForPricing,
    runPricingAgent
};
