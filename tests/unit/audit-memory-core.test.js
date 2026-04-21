const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildAuditMemory,
    canApproveAuditMemory,
    compareAuditMemory
} = require('../../server/audit-memory-core');

function navigationReportWithLocalExit(status = 'passed') {
    return {
        generatedAt: '2026-04-21T00:00:00.000Z',
        maxClicksPerPage: 0,
        selectedRoutes: ['/fleet.html'],
        selectedViewports: ['mobile-modern'],
        summary: {
            navigationStatus: status === 'passed' ? 'good' : 'bad',
            totalRoutes: 1,
            totalViewports: 1,
            totalHandoffs: 0,
            failedHandoffs: 0
        },
        navigationReview: {
            status: status === 'passed' ? 'good' : 'bad',
            summary: {
                hardFails: status === 'passed' ? 0 : 1,
                bySeverity: { high: status === 'passed' ? 0 : 1 }
            }
        },
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                loadStatus: 'ok',
                recoveryRoutes: { home: true, fleet: true, contact: true, reserve: true },
                navigation: {
                    mobileDrawer: {
                        toggleFound: true,
                        opened: true,
                        closed: true,
                        internalLinkCount: 8
                    },
                    localEscapes: [
                        {
                            id: 'fleet-filter-sheet',
                            label: 'Fleet mobile filter sheet',
                            status,
                            message: status === 'passed'
                                ? 'Opened and escaped.'
                                : 'No obvious return action was visible.'
                        }
                    ]
                },
                handoffs: []
            }
        ]
    };
}

test('audit memory flags a previously fixed local navigation escape when it regresses', () => {
    const approvedMemory = buildAuditMemory(navigationReportWithLocalExit('passed'), { kind: 'navigation' });
    const comparison = compareAuditMemory(navigationReportWithLocalExit('failed'), approvedMemory, { kind: 'navigation' });

    assert.equal(comparison.status, 'bad');
    assert.equal(comparison.summary.regressions, 1);
    assert.equal(comparison.regressions[0].family, 'navigation.local-exit');
    assert.equal(comparison.regressions[0].currentStatus, 'failed');
});

test('audit memory skips approved routes that are outside the current partial audit scope', () => {
    const approvedMemory = buildAuditMemory(navigationReportWithLocalExit('passed'), { kind: 'navigation' });
    const currentReport = {
        generatedAt: '2026-04-21T00:01:00.000Z',
        maxClicksPerPage: 0,
        selectedRoutes: ['/contact.html'],
        selectedViewports: ['mobile-modern'],
        summary: { navigationStatus: 'good' },
        navigationReview: { status: 'good', summary: { hardFails: 0, bySeverity: { high: 0 } } },
        pages: [
            {
                route: '/contact.html',
                viewport: 'mobile-modern',
                loadStatus: 'ok',
                recoveryRoutes: { home: true },
                navigation: {}
            }
        ]
    };
    const comparison = compareAuditMemory(currentReport, approvedMemory, { kind: 'navigation' });

    assert.equal(comparison.status, 'good');
    assert.equal(comparison.summary.regressions, 0);
    assert.ok(comparison.summary.skippedOutOfScope > 0);
});

test('audit memory treats a visual good-to-review change as a regression', () => {
    const approvedMemory = buildAuditMemory({
        generatedAt: '2026-04-21T00:00:00.000Z',
        summary: { byStatus: { good: 1, review: 0, bad: 0 }, hardFailCount: 0 },
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                assessment: { status: 'good', score: 96 }
            }
        ]
    }, { kind: 'visual' });
    const comparison = compareAuditMemory({
        generatedAt: '2026-04-21T00:01:00.000Z',
        summary: { byStatus: { good: 0, review: 1, bad: 0 }, hardFailCount: 0 },
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                assessment: { status: 'review', score: 82 }
            }
        ]
    }, approvedMemory, { kind: 'visual' });

    assert.equal(comparison.status, 'bad');
    assert.equal(comparison.regressions[0].family, 'visual.page-health');
});

test('audit memory approval rejects dirty navigation runs unless forced by caller', () => {
    const approval = canApproveAuditMemory(navigationReportWithLocalExit('failed'), { kind: 'navigation' });

    assert.equal(approval.canApprove, false);
    assert.ok(approval.reasons.some((reason) => reason.includes('navigationStatus=')));
});
