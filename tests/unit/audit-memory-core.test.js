const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildAuditMemory,
    canApproveAuditMemory,
    compareAuditMemory,
    writeApprovedAuditMemory
} = require('../../server/audits/audit-memory-core');
const {
    formatVisualChangeGuardFailure,
    summarizeVisualIntelligence,
    summarizeVisualChangeGuard
} = require('../../server/audits/change-guard-core');
const {
    parseArgs: parseChangeGuardArgs,
    resolveGuardRoutes,
    resolveGuardViewports
} = require('../../scripts/audits/run-change-guard-audit');

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

test('audit memory catches semantic visual drift even when the page remains good', () => {
    const approvedMemory = buildAuditMemory({
        generatedAt: '2026-04-21T00:00:00.000Z',
        summary: { byStatus: { good: 1, review: 0, bad: 0 }, hardFailCount: 0 },
        pages: [
            {
                route: '/services.html',
                viewport: 'desktop-wide',
                assessment: { status: 'good', score: 100, findings: [] },
                baselineDiff: { status: 'pass', message: 'Viewport baseline passed.' }
            }
        ]
    }, { kind: 'visual' });
    const comparison = compareAuditMemory({
        generatedAt: '2026-04-21T00:01:00.000Z',
        summary: { byStatus: { good: 1, review: 0, bad: 0 }, hardFailCount: 0 },
        pages: [
            {
                route: '/services.html',
                viewport: 'desktop-wide',
                assessment: {
                    status: 'good',
                    score: 90,
                    findings: [
                        {
                            severity: 'medium',
                            category: 'first_viewport_layout',
                            message: 'The first viewport lost its clean split.'
                        }
                    ]
                },
                baselineDiff: { status: 'pass', message: 'Viewport baseline passed.' }
            }
        ]
    }, approvedMemory, { kind: 'visual' });

    assert.equal(comparison.status, 'bad');
    assert.ok(comparison.regressions.some((regression) => (
        regression.family === 'visual.first-viewport' &&
        regression.currentStatus === 'review'
    )));
});

test('functional memory catches approved button destination drift', () => {
    const approvedMemory = buildAuditMemory({
        generatedAt: '2026-04-21T00:00:00.000Z',
        functionalReview: { status: 'good', summary: { hardFails: 0 } },
        summary: { totalRoutes: 1, totalActions: 1, failedActions: 0 },
        pages: [
            {
                route: '/',
                viewport: 'desktop-wide',
                consoleErrors: [],
                requestFailures: [],
                actions: [
                    {
                        id: 'button-book-now-header-reserve',
                        label: 'Button: Book now',
                        kind: 'button:navigation',
                        status: 'passed',
                        message: 'Book now reached /app/reserve/page.html.',
                        expectedTargetPath: '/app/reserve/page.html',
                        observedPath: '/app/reserve/page.html'
                    }
                ]
            }
        ]
    }, { kind: 'functional' });
    const comparison = compareAuditMemory({
        generatedAt: '2026-04-21T00:01:00.000Z',
        functionalReview: { status: 'good', summary: { hardFails: 0 } },
        summary: { totalRoutes: 1, totalActions: 1, failedActions: 0 },
        pages: [
            {
                route: '/',
                viewport: 'desktop-wide',
                consoleErrors: [],
                requestFailures: [],
                actions: [
                    {
                        id: 'button-book-now-header-reserve',
                        label: 'Button: Book now',
                        kind: 'button:navigation',
                        status: 'passed',
                        message: 'Book now reached /contact.html.',
                        expectedTargetPath: '/contact.html',
                        observedPath: '/contact.html'
                    }
                ]
            }
        ]
    }, approvedMemory, { kind: 'functional' });

    assert.equal(comparison.status, 'bad');
    assert.ok(comparison.regressions.some((regression) => (
        regression.family === 'functional.navigation-target' &&
        regression.type === 'missing_signal'
    )));
});

test('functional memory catches approved real journey step regression', () => {
    const approvedMemory = buildAuditMemory({
        generatedAt: '2026-04-21T00:00:00.000Z',
        functionalReview: { status: 'good', summary: { hardFails: 0 } },
        summary: { totalRoutes: 1, totalActions: 1, realSteps: 3, failedActions: 0 },
        pages: [
            {
                route: '/app/reserve/page.html',
                viewport: 'laptop',
                consoleErrors: [],
                requestFailures: [],
                actions: [
                    {
                        id: 'reserve-complete-checkout',
                        label: 'Reserve flow completes with mocked payment',
                        kind: 'checkout',
                        status: 'passed',
                        message: 'Reserve flow reached success redirect with mocked payment.',
                        steps: [
                            { id: 'load-reserve-with-intent', label: 'Load reserve with booking intent', status: 'passed' },
                            { id: 'advance-to-payment', label: 'Advance to payment', status: 'passed', expected: 'mock Stripe mounted', observed: 'mounted' },
                            { id: 'success-redirect-home', label: 'Success redirects home', status: 'passed', expected: '/', observed: '/' }
                        ]
                    }
                ]
            }
        ]
    }, { kind: 'functional' });
    const comparison = compareAuditMemory({
        generatedAt: '2026-04-21T00:01:00.000Z',
        functionalReview: { status: 'bad', summary: { hardFails: 1 } },
        summary: { totalRoutes: 1, totalActions: 1, realSteps: 2, failedActions: 1 },
        pages: [
            {
                route: '/app/reserve/page.html',
                viewport: 'laptop',
                consoleErrors: [],
                requestFailures: [],
                actions: [
                    {
                        id: 'reserve-complete-checkout',
                        label: 'Reserve flow completes with mocked payment',
                        kind: 'checkout',
                        status: 'failed',
                        message: 'Payment step never mounted.',
                        steps: [
                            { id: 'load-reserve-with-intent', label: 'Load reserve with booking intent', status: 'passed' },
                            { id: 'advance-to-payment', label: 'Advance to payment', status: 'failed', expected: 'mock Stripe mounted', observed: 'missing' }
                        ]
                    }
                ]
            }
        ]
    }, approvedMemory, { kind: 'functional' });

    assert.equal(comparison.status, 'bad');
    assert.ok(comparison.regressions.some((regression) => (
        regression.family === 'functional.action-step' &&
        /Advance to payment/i.test(regression.label) &&
        regression.currentStatus === 'failed'
    )));
    assert.ok(comparison.regressions.some((regression) => (
        regression.family === 'functional.action-step' &&
        /Success redirects home/i.test(regression.label) &&
        regression.type === 'missing_signal'
    )));
});

test('audit memory approval rejects dirty navigation runs unless forced by caller', () => {
    const approval = canApproveAuditMemory(navigationReportWithLocalExit('failed'), { kind: 'navigation' });

    assert.equal(approval.canApprove, false);
    assert.ok(approval.reasons.some((reason) => reason.includes('navigationStatus=')));
});

test('audit memory approval rejects visually dirty good runs', () => {
    const approval = canApproveAuditMemory({
        generatedAt: '2026-04-21T00:00:00.000Z',
        summary: { byStatus: { good: 1, review: 0, bad: 0 }, hardFailCount: 0 },
        pages: [
            {
                route: '/services.html',
                viewport: 'desktop-wide',
                assessment: {
                    status: 'good',
                    score: 92,
                    findings: [
                        {
                            severity: 'low',
                            category: 'spacing',
                            message: 'A section has minor spacing drift.'
                        }
                    ]
                }
            }
        ]
    }, { kind: 'visual' });

    assert.equal(approval.canApprove, false);
    assert.ok(approval.reasons.includes('visualFindings=1'));
});

test('visual intelligence groups findings into human-readable change risks', () => {
    const report = {
        pages: [
            {
                route: '/services.html',
                viewport: 'desktop-wide',
                assessment: {
                    findings: [
                        {
                            severity: 'medium',
                            category: 'first_viewport_layout',
                            message: 'The services hero panel moved too low.',
                            evidence: 'featureTopRatio=0.71',
                            screenshotPath: '/tmp/services.png'
                        },
                        {
                            severity: 'high',
                            category: 'surface_drift',
                            message: 'The CTA style changed family.',
                            hardFail: true
                        }
                    ]
                }
            }
        ]
    };
    const intelligence = summarizeVisualIntelligence(report);

    assert.equal(intelligence.totals.groups, 2);
    assert.equal(intelligence.summary.firstViewport.findings, 1);
    assert.equal(intelligence.summary.surfaceQuality.hardFails, 1);
});

test('visual change guard requires approved memory before accepting a clean run', () => {
    const report = {
        generatedAt: '2026-04-21T00:00:00.000Z',
        summary: { byStatus: { good: 1, review: 0, bad: 0 }, hardFailCount: 0 },
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                assessment: { status: 'good', score: 100, hardFails: [] },
                baselineDiff: { status: 'pass', message: 'Viewport baseline passed.' }
            }
        ]
    };
    const guard = summarizeVisualChangeGuard(report, {
        memoryRoot: require('node:os').tmpdir(),
        requireMemory: true,
        requireApprovedBaselines: true,
        strictReview: true
    });

    assert.equal(guard.failed, true);
    assert.equal(guard.missingMemory, true);
});

test('visual change guard catches a previously approved visual page that moves to review', () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const memoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-change-memory-'));
    const approvedReport = {
        generatedAt: '2026-04-21T00:00:00.000Z',
        summary: { byStatus: { good: 1, review: 0, bad: 0 }, hardFailCount: 0 },
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                assessment: { status: 'good', score: 100 },
                baselineDiff: { status: 'pass', message: 'Viewport baseline passed.' }
            }
        ]
    };
    const currentReport = {
        generatedAt: '2026-04-21T00:01:00.000Z',
        summary: { byStatus: { good: 0, review: 1, bad: 0 }, hardFailCount: 0 },
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                assessment: { status: 'review', score: 88, hardFails: [], reviewGates: ['baseline_diff_review'] },
                baselineDiff: { status: 'review', message: 'Mismatch ratio 0.02.' }
            }
        ]
    };

    writeApprovedAuditMemory(buildAuditMemory(approvedReport, { kind: 'visual' }), memoryRoot);
    const guard = summarizeVisualChangeGuard(currentReport, {
        memoryRoot,
        requireMemory: true,
        requireApprovedBaselines: true,
        strictReview: true
    });
    const failureText = formatVisualChangeGuardFailure(guard);

    assert.equal(guard.failed, true);
    assert.ok(guard.memoryRegressions.some((regression) => regression.family === 'visual.page-health'));
    assert.equal(guard.reviewPages.length, 1);
    assert.equal(guard.baselineDiffPages.length, 1);
    assert.match(failureText, /baseline diff/i);
});

test('change guard args resolve responsive and full visual memory scopes', () => {
    const args = parseChangeGuardArgs(['--full', '--route', '/fleet.html', '--viewport', 'mobile-modern', '--allow-review']);

    assert.equal(args.scope, 'full');
    assert.equal(args.strictReview, false);
    assert.deepEqual(resolveGuardRoutes(args), ['/fleet.html']);
    assert.ok(resolveGuardViewports(args).includes('mobile-modern'));
    assert.ok(resolveGuardViewports(parseChangeGuardArgs(['--responsive'])).includes('desktop-wide'));
});
