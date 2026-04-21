const test = require('node:test');
const assert = require('node:assert/strict');

const {
    FUNCTIONAL_HUMAN_REVIEW_RULES,
    buildFunctionalFindings,
    buildFunctionalHumanReview,
    buildFunctionalReviewMarkdownSection,
    collectCoverageFindings,
    summarizeFunctionalFindings
} = require('../../server/functional-audit-core');

const COMPLETE_DEEP_SCOPE = Object.freeze({
    mode: 'deep',
    totalPublicRoutes: 2,
    checkedRouteCount: 2,
    allPublicRoutesChecked: true,
    totalFunctionalViewports: 2,
    checkedViewportCount: 2,
    allFunctionalViewportsChecked: true,
    truncatedTargetCount: 0,
    actionCaps: {
        maxLinksPerPage: Number.MAX_SAFE_INTEGER,
        maxButtonsPerPage: Number.MAX_SAFE_INTEGER,
        maxSummariesPerPage: Number.MAX_SAFE_INTEGER,
        maxSelectsPerPage: Number.MAX_SAFE_INTEGER,
        maxOptionsPerSelect: Number.MAX_SAFE_INTEGER
    }
});

test('functional human review defines real customer judgement rules', () => {
    const ids = FUNCTIONAL_HUMAN_REVIEW_RULES.map((rule) => rule.id);

    assert.ok(ids.includes('intent_continuity'));
    assert.ok(ids.includes('visible_recovery'));
    assert.ok(ids.includes('mobile_unblocked'));
    assert.ok(ids.includes('technical_confidence'));
    assert.ok(ids.includes('journey_evidence'));
});

test('functional human review marks important action failures as bad', () => {
    const review = buildFunctionalHumanReview({
        pages: [
            {
                route: '/fleet.html',
                viewport: 'mobile-modern',
                actions: [
                    {
                        id: 'fleet-reserve-first-visible',
                        label: 'Fleet reserve CTA opens reserve with schedule',
                        kind: 'reserve-handoff',
                        status: 'failed',
                        message: 'Expected reserve URL but stayed on fleet.',
                        observedUrl: 'http://local/fleet.html'
                    }
                ],
                consoleErrors: [],
                requestFailures: []
            }
        ],
        customerJourneys: { scenarios: [] },
        coverageProfile: COMPLETE_DEEP_SCOPE
    });

    assert.equal(review.status, 'bad');
    assert.equal(review.summary.hardFails, 1);
    assert.equal(review.findings[0].category, 'action_failure');
    assert.match(review.findings[0].message, /failed during a customer-like interaction/i);
});

test('functional human review treats partial mission evidence as review', () => {
    const review = buildFunctionalHumanReview({
        pages: [],
        customerJourneys: {
            scenarios: [
                {
                    id: 'home_to_fleet_schedule',
                    persona: 'Guest arriving with fixed rental dates',
                    intent: 'Carry dates into fleet.',
                    status: 'partial',
                    missingDevices: ['mobile'],
                    byDevice: {}
                }
            ]
        },
        coverageProfile: COMPLETE_DEEP_SCOPE
    });

    assert.equal(review.status, 'review');
    assert.equal(review.summary.hardFails, 0);
    assert.equal(review.findings[0].category, 'journey_coverage_gap');
    assert.match(review.findings[0].evidence.join(' '), /missing devices: mobile/i);
});

test('functional human review escalates console errors and hard network failures', () => {
    const findings = buildFunctionalFindings([
        {
            route: '/contact.html',
            viewport: 'laptop',
            actions: [],
            consoleErrors: ['TypeError: cannot read property submit'],
            requestFailures: [
                { resourceType: 'script', status: 404, url: 'http://local/js/contact.js' },
                { resourceType: 'image', status: 404, url: 'http://local/missing-car.jpg' }
            ]
        }
    ], { scenarios: [] }, COMPLETE_DEEP_SCOPE);
    const summary = summarizeFunctionalFindings(findings);

    assert.ok(findings.some((finding) => finding.category === 'console_error' && finding.hardFail));
    assert.ok(findings.some((finding) => finding.category === 'request_failure' && finding.severity === 'high' && finding.hardFail));
    assert.ok(findings.some((finding) => finding.category === 'request_failure' && finding.severity === 'medium' && !finding.hardFail));
    assert.equal(summary.hardFails, 2);
});

test('functional human review markdown renders status, gates and evidence', () => {
    const review = buildFunctionalHumanReview({
        pages: [
            {
                route: '/app/reserve/page.html',
                viewport: 'mobile-modern',
                actions: [
                    {
                        id: 'reserve-complete-checkout',
                        label: 'Reserve flow completes with mocked payment',
                        kind: 'checkout',
                        status: 'failed',
                        message: 'Payment step never mounted.',
                        screenshotPath: 'artifacts/reserve/payment.png'
                    }
                ],
                consoleErrors: [],
                requestFailures: []
            }
        ],
        customerJourneys: { scenarios: [] },
        coverageProfile: COMPLETE_DEEP_SCOPE
    });
    const markdown = buildFunctionalReviewMarkdownSection(review).join('\n');

    assert.match(markdown, /Human Functional Review/);
    assert.match(markdown, /status: bad/);
    assert.match(markdown, /action_failure/);
    assert.match(markdown, /Payment step never mounted/);
});

test('functional human review refuses to call bounded scope perfect', () => {
    const review = buildFunctionalHumanReview({
        pages: [],
        customerJourneys: { scenarios: [] },
        coverageProfile: {
            mode: 'journey',
            totalPublicRoutes: 32,
            checkedRouteCount: 10,
            allPublicRoutesChecked: false,
            totalFunctionalViewports: 3,
            checkedViewportCount: 2,
            allFunctionalViewportsChecked: false,
            truncatedTargetCount: 4,
            truncatedPages: [
                { route: '/fleet.html', viewport: 'mobile-modern', truncatedTargets: 4 }
            ],
            actionCaps: {
                maxLinksPerPage: 6,
                maxButtonsPerPage: 5,
                maxSummariesPerPage: 4,
                maxSelectsPerPage: 4,
                maxOptionsPerSelect: 8
            }
        }
    });

    assert.equal(review.status, 'review');
    assert.ok(review.reviewGates.includes('bounded_audit_scope'));
    assert.ok(review.reviewGates.includes('route_coverage_gap'));
    assert.ok(review.reviewGates.includes('viewport_coverage_gap'));
    assert.ok(review.reviewGates.includes('interaction_coverage_gap'));
});

test('deep complete coverage adds no scope findings', () => {
    const findings = collectCoverageFindings(COMPLETE_DEEP_SCOPE);

    assert.deepEqual(findings, []);
});
