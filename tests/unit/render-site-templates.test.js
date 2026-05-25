const test = require('node:test');
const assert = require('node:assert/strict');

const {
    formatSummary,
    syncSiteTemplates
} = require('../../server/renderers/render-site-templates');

test('site template sync runs shared renderers in order and reports changed objects', () => {
    const calls = [];
    const report = syncSiteTemplates([
        {
            name: 'header',
            run() {
                calls.push('header');
                return { touchedFiles: ['a.html', 'b.html'] };
            },
            changedCount: (result) => result.touchedFiles.length
        },
        {
            name: 'vehicle-pages',
            run() {
                calls.push('vehicle-pages');
                return { changed: false };
            },
            changedCount: (result) => (result.changed ? 1 : 0)
        }
    ]);

    assert.deepEqual(calls, ['header', 'vehicle-pages']);
    assert.equal(report.changedCount, 2);
    assert.equal(report.steps[0].changed, true);
    assert.equal(report.steps[1].changed, false);
});

test('site template sync summary hides bulky renderer internals', () => {
    const report = {
        generatedAt: '2026-05-25T00:00:00.000Z',
        changedCount: 1,
        steps: [
            {
                name: 'fleet-cards',
                changed: true,
                changedCount: 1,
                result: { html: '<large>' }
            }
        ]
    };

    assert.deepEqual(formatSummary(report), {
        generatedAt: '2026-05-25T00:00:00.000Z',
        changedCount: 1,
        steps: [
            {
                name: 'fleet-cards',
                changed: true,
                changedCount: 1
            }
        ]
    });
});
