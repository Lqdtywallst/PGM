const test = require('node:test');
const assert = require('node:assert/strict');

const {
    analyzeSearchConsoleCsv,
    classifyQuery,
    normalizeRows,
    parseCsv
} = require('../../server/seo/search-console-analysis');

test('classifies core Dynasty Prestige SEO intents', () => {
    assert.deepEqual(classifyQuery('dynasty prestige car rental'), {
        intent: 'marca propia',
        label: 'Dynasty Prestige',
        targetUrl: '/'
    });

    assert.equal(
        classifyQuery('Ferrari 296 rental Dubai').targetUrl,
        '/ferrari-296-gts-rental-dubai.html'
    );
    assert.equal(
        classifyQuery('Porsche GT3 RS rental Dubai').targetUrl,
        '/blue-porsche-gt3-rs-rental-dubai.html'
    );
    assert.equal(
        classifyQuery('chauffeur car rental dubai').targetUrl,
        '/chauffeur-service-dubai.html'
    );
    assert.equal(
        classifyQuery('luxury car rental dubai').intent,
        'genérica comercial'
    );
    assert.equal(
        classifyQuery('Dubai Marina luxury car rental').intent,
        'ubicación'
    );
});

test('normalizes Search Console CSV with semicolon delimiter and locale numbers', () => {
    const rows = normalizeRows(parseCsv([
        'Consulta;Clics;Impresiones;CTR;Posicion',
        'Ferrari 296 rental Dubai;4;1.234;1,25%;11,4'
    ].join('\n')));

    assert.equal(rows.length, 1);
    assert.equal(rows[0].query, 'Ferrari 296 rental Dubai');
    assert.equal(rows[0].clicks, 4);
    assert.equal(rows[0].impressions, 1234);
    assert.equal(rows[0].ctr, 1.25);
    assert.equal(rows[0].position, 11.4);
});

test('detects model opportunities landing on the wrong URL', () => {
    const csv = [
        'Query,Page,Clicks,Impressions,CTR,Position',
        'Ferrari 296 rental Dubai,https://www.dynastyprestigecarrental.com/ferrari-rental-dubai.html,4,400,1%,11.4',
        'Lamborghini Urus rental Dubai,https://www.dynastyprestigecarrental.com/lamborghini-urus-rental-dubai.html,12,600,2%,8.2',
        'dynasty prestige,https://www.dynastyprestigecarrental.com/,20,100,20%,1.3'
    ].join('\n');

    const report = analyzeSearchConsoleCsv(csv);
    const ferrari = report.opportunities.find((row) => row.query === 'Ferrari 296 rental Dubai');
    const branded = report.opportunities.find((row) => row.query === 'dynasty prestige');

    assert.equal(report.sourceRows, 3);
    assert.equal(ferrari.intent, 'modelo');
    assert.equal(ferrari.currentPath, '/ferrari-rental-dubai.html');
    assert.equal(ferrari.targetUrl, '/ferrari-296-gts-rental-dubai.html');
    assert.equal(ferrari.wrongTarget, true);
    assert.equal(branded.intent, 'marca propia');
    assert.equal(branded.targetUrl, '/');
});

test('summarizes cannibalization when one query appears with multiple pages', () => {
    const csv = [
        'Query,Page,Clicks,Impressions,CTR,Position',
        'luxury car rental dubai,https://www.dynastyprestigecarrental.com/luxury-car-rental-dubai.html,8,500,1.6%,9.2',
        'luxury car rental dubai,https://www.dynastyprestigecarrental.com/fleet.html,2,220,0.9%,14.1'
    ].join('\n');

    const report = analyzeSearchConsoleCsv(csv);

    assert.equal(report.summary.cannibalization.length, 1);
    assert.equal(report.summary.cannibalization[0].query, 'luxury car rental dubai');
    assert.deepEqual(report.summary.cannibalization[0].pages.sort(), [
        '/fleet.html',
        '/luxury-car-rental-dubai.html'
    ]);
});
