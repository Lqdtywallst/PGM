const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildMarkdownReport,
    classifyFile,
    extractReferences
} = require('../../scripts/audits/run-project-cleanup-audit');

test('cleanup audit extracts repo-root references from script strings', () => {
    const refs = extractReferences('server/audits/test-server.js', `
        const requiredFiles = [
            'site/css/hub-pages.css',
            'server/apps/static-server.js',
            './local-helper.js'
        ];
    `);

    assert.ok(refs.includes('site/css/hub-pages.css'));
    assert.ok(refs.includes('server/apps/static-server.js'));
    assert.ok(refs.includes('server/audits/local-helper.js'));
});

test('cleanup audit treats markdown in site pages as documentation, not orphan HTML', () => {
    const classification = classifyFile({
        activeRoots: new Set(),
        incoming: [],
        tracked: true,
        gitStatus: '',
        relativePath: 'site/pages/README.md',
        packageJson: { scripts: {} }
    });

    assert.equal(classification.area, 'site-docs');
    assert.equal(classification.action, 'review-move-to-docs');
    assert.equal(classification.risk, 'low');
});

test('cleanup report separates safe local deletion from tracked review deletion', () => {
    const markdown = buildMarkdownReport({
        summary: {
            generatedAt: '2026-05-10T00:00:00.000Z',
            filesScanned: 0,
            trackedFiles: 0,
            untrackedFiles: 0,
            totalSizeBytes: 0,
            deleteLocalCandidates: 0,
            reviewDeleteCandidates: 0,
            assetReviewCandidates: 0,
            byArea: {},
            byAction: {}
        },
        rows: []
    });

    assert.match(markdown, /## Delete And Review Candidates/);
    assert.match(markdown, /`delete-local` items can usually be removed/);
    assert.doesNotMatch(markdown, /## Safe Local Delete Candidates/);
});
