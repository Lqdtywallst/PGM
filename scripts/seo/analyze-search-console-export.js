const fs = require('fs');
const path = require('path');

const {
    analyzeSearchConsoleCsv
} = require('../../server/seo/search-console-analysis');

function parseArgs(argv) {
    const options = {
        csvPath: '',
        outDir: ''
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === '--csv') {
            options.csvPath = argv[index + 1] || '';
            index += 1;
            continue;
        }

        if (arg === '--out-dir') {
            options.outDir = argv[index + 1] || '';
            index += 1;
            continue;
        }

        if (!arg.startsWith('--') && !options.csvPath) {
            options.csvPath = arg;
        }
    }

    return options;
}

function usage() {
    return [
        'Uso:',
        '  npm run seo:gsc -- --csv "C:\\ruta\\search-console.csv"',
        '  npm run seo:gsc -- "C:\\ruta\\search-console.csv"',
        '',
        'Opciones:',
        '  --csv      Ruta al CSV exportado desde Search Console.',
        '  --out-dir  Carpeta de salida opcional.'
    ].join('\n');
}

function createOutputDir(customOutDir = '') {
    if (customOutDir) {
        fs.mkdirSync(customOutDir, { recursive: true });
        return customOutDir;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(process.cwd(), 'artifacts', 'search-console', stamp);
    fs.mkdirSync(outDir, { recursive: true });
    return outDir;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-US');
}

function formatPercent(value) {
    return `${Number(value || 0).toFixed(2)}%`;
}

function escapeMarkdown(value) {
    return String(value || '')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ');
}

function renderIntentCounts(intentCounts) {
    const entries = Object.entries(intentCounts || {})
        .sort((left, right) => right[1] - left[1]);

    if (!entries.length) {
        return 'Sin datos de intención.';
    }

    return [
        '| Intención | Consultas |',
        '| --- | ---: |',
        ...entries.map(([intent, count]) => `| ${escapeMarkdown(intent)} | ${formatNumber(count)} |`)
    ].join('\n');
}

function renderOpportunities(opportunities) {
    const rows = opportunities.slice(0, 25);

    if (!rows.length) {
        return 'Sin oportunidades detectadas.';
    }

    return [
        '| Prioridad | Consulta | Intención | URL actual | URL objetivo | Posición | CTR | Motivo | Acción |',
        '| ---: | --- | --- | --- | --- | ---: | ---: | --- | --- |',
        ...rows.map((row, index) => [
            index + 1,
            escapeMarkdown(row.query),
            escapeMarkdown(row.intent),
            escapeMarkdown(row.currentPath || '(sin página en CSV)'),
            escapeMarkdown(row.targetUrl || '(manual)'),
            Number(row.position || 0).toFixed(2),
            formatPercent(row.ctr),
            escapeMarkdown(row.reason),
            escapeMarkdown(row.action)
        ].join(' | ')).map((line) => `| ${line} |`)
    ].join('\n');
}

function renderCannibalization(cannibalization) {
    if (!cannibalization.length) {
        return 'No hay canibalización clara en este CSV.';
    }

    return [
        '| Consulta | Páginas que aparecen |',
        '| --- | --- |',
        ...cannibalization.map((item) => (
            `| ${escapeMarkdown(item.query)} | ${escapeMarkdown(item.pages.join(', '))} |`
        ))
    ].join('\n');
}

function renderMarkdownReport(report, csvPath) {
    const { summary } = report;
    const hasPages = report.opportunities.some((row) => row.currentPath);

    return [
        '# Análisis Search Console',
        '',
        `Generado: ${report.generatedAt}`,
        `CSV: ${csvPath}`,
        '',
        '## Resumen',
        '',
        `- Filas analizadas: ${formatNumber(summary.rows)}`,
        `- Clics: ${formatNumber(summary.clicks)}`,
        `- Impresiones: ${formatNumber(summary.impressions)}`,
        `- CTR medio: ${formatPercent(summary.ctr)}`,
        `- Posición media ponderada: ${Number(summary.averagePosition || 0).toFixed(2)}`,
        '',
        '## Consultas por intención',
        '',
        renderIntentCounts(summary.intentCounts),
        '',
        '## Top oportunidades',
        '',
        renderOpportunities(report.opportunities),
        '',
        '## Canibalización',
        '',
        renderCannibalization(summary.cannibalization),
        '',
        '## Nota operativa',
        '',
        hasPages
            ? 'El CSV incluye columna de página, así que el informe puede detectar URL objetivo incorrecta y canibalización.'
            : 'El CSV no incluye columna de página. Exporta también la dimensión Páginas o cruza consulta + página para detectar canibalización y URLs incorrectas.',
        '',
        'Regla de trabajo: no tocar una página solo porque una keyword existe. Primero confirmar intención, URL objetivo y oportunidad medible.'
    ].join('\n');
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    if (!options.csvPath) {
        console.error(usage());
        process.exitCode = 1;
        return;
    }

    const csvPath = path.resolve(options.csvPath);

    if (!fs.existsSync(csvPath)) {
        console.error(`No existe el CSV: ${csvPath}`);
        process.exitCode = 1;
        return;
    }

    const csvText = fs.readFileSync(csvPath, 'utf8');
    const report = analyzeSearchConsoleCsv(csvText);
    const outDir = createOutputDir(options.outDir ? path.resolve(options.outDir) : '');
    const jsonPath = path.join(outDir, 'search-console-opportunities.json');
    const markdownPath = path.join(outDir, 'search-console-opportunities.md');

    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(markdownPath, `${renderMarkdownReport(report, csvPath)}\n`, 'utf8');

    console.log(`Analizadas ${report.summary.rows} consultas.`);
    console.log(`CTR medio: ${formatPercent(report.summary.ctr)} | posición media: ${Number(report.summary.averagePosition || 0).toFixed(2)}`);
    console.log(`Informe JSON: ${jsonPath}`);
    console.log(`Informe Markdown: ${markdownPath}`);
}

if (require.main === module) {
    main();
}

module.exports = {
    parseArgs,
    renderMarkdownReport
};
