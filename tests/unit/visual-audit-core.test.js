const test = require('node:test');
const assert = require('node:assert/strict');

const {
    BRAND_REFERENCE_ROUTE,
    VISUAL_FINDING_CATEGORIES,
    classifyRouteCohort,
    classifyRouteProfile,
    createVisualFinding,
    dedupeVisualFindings,
    evaluateMobileHeroHeadingBalance,
    getDefaultVisualRoutes,
    getVehicleVisualRoutes,
    scoreVisualPage,
    shouldEscalateToVision,
    summarizeVisualFindings
} = require('../../server/visual-audit-core');

test('classifyRouteProfile maps key public routes to explicit visual profiles', () => {
    assert.equal(classifyRouteProfile('/'), 'home');
    assert.equal(classifyRouteProfile('/fleet.html'), 'fleet');
    assert.equal(classifyRouteProfile('/contact.html'), 'contact');
    assert.equal(classifyRouteProfile('/app/reserve/page.html'), 'reserve');
    assert.equal(classifyRouteProfile('/ferrari-296-gts-rental-dubai.html'), 'vehicle_pdp');
    assert.equal(classifyRouteProfile('/services.html'), 'hub_marketing');
    assert.equal(classifyRouteProfile('/porsche-rental-dubai.html'), 'hub_marketing');
});

test('visual finding categories include current regression checks emitted by the visual agent', () => {
    for (const category of ['date_currentness', 'text_encoding', 'border_weight_drift', 'spacing', 'layout_homogeneity', 'visual_affordance', 'heading_balance']) {
        assert.ok(VISUAL_FINDING_CATEGORIES.includes(category), `${category} should be accepted by visual tooling`);
    }
});

test('evaluateMobileHeroHeadingBalance catches stepped left-heavy mobile headlines', () => {
    const failures = evaluateMobileHeroHeadingBalance({
        viewportWidth: 390,
        headingLineMetrics: {
            text: 'Drive Dubai your way.',
            textAlign: 'left',
            lineCount: 4,
            minLineWidthRatio: 0.21,
            lineWidthSpreadRatio: 0.18,
            maxLineCenterOffsetRatio: 0.28,
            blockCenterOffsetRatio: 0.27
        }
    }, {
        headingBalance: {
            requireCenteredText: true,
            maxLineCount: 3,
            minLineWidthRatio: 0.32,
            maxLineWidthSpreadRatio: 0.34,
            maxCenterOffsetRatio: 0.12,
            maxBlockCenterOffsetRatio: 0.1
        }
    });

    assert.ok(failures.some((failure) => failure.startsWith('lineCount=')));
    assert.ok(failures.some((failure) => failure.startsWith('blockCenterOffsetRatio=')));
    assert.ok(failures.includes('textAlign=left'));
});

test('evaluateMobileHeroHeadingBalance accepts centered balanced mobile headlines', () => {
    const failures = evaluateMobileHeroHeadingBalance({
        viewportWidth: 390,
        headingLineMetrics: {
            text: 'Drive Dubai your way.',
            textAlign: 'center',
            lineCount: 2,
            minLineWidthRatio: 0.43,
            lineWidthSpreadRatio: 0.14,
            maxLineCenterOffsetRatio: 0.04,
            blockCenterOffsetRatio: 0.02
        }
    }, {
        headingBalance: {
            requireCenteredText: true,
            maxLineCount: 3,
            minLineWidthRatio: 0.32,
            maxLineWidthSpreadRatio: 0.34,
            maxCenterOffsetRatio: 0.12,
            maxBlockCenterOffsetRatio: 0.1
        }
    });

    assert.deepEqual(failures, []);
});

test('classifyRouteCohort distinguishes landings, brands, services and vehicle PDPs', () => {
    assert.equal(classifyRouteCohort('/'), 'home');
    assert.equal(classifyRouteCohort('/services.html'), 'hub_marketing');
    assert.equal(classifyRouteCohort('/abu-dhabi-luxury-car-rental.html'), 'guide_landing');
    assert.equal(classifyRouteCohort('/chauffeur-service-dubai.html'), 'service_landing');
    assert.equal(classifyRouteCohort(BRAND_REFERENCE_ROUTE), 'brand_landing');
    assert.equal(classifyRouteCohort('/ferrari-296-gts-rental-dubai.html'), 'vehicle_pdp');
});

test('getDefaultVisualRoutes exposes landing scope separately from vehicle scope', () => {
    const keyRoutes = getDefaultVisualRoutes();
    const landingRoutes = getDefaultVisualRoutes('landings');
    const vehicleRoutes = getVehicleVisualRoutes();

    assert.ok(keyRoutes.includes('/about.html'));
    assert.ok(landingRoutes.includes('/lamborghini-rental-dubai.html'));
    assert.ok(landingRoutes.includes('/ferrari-rental-dubai.html'));
    assert.ok(landingRoutes.includes('/services.html'));
    assert.ok(!landingRoutes.includes('/ferrari-296-gts-rental-dubai.html'));
    assert.ok(vehicleRoutes.includes('/ferrari-296-gts-rental-dubai.html'));
    assert.ok(vehicleRoutes.includes('/rolls-royce-cullinan-black-badge-rental-dubai.html'));
});

test('scoreVisualPage returns bad when a hard fail exists', () => {
    const finding = createVisualFinding({
        route: '/',
        viewport: 'desktop-wide',
        severity: 'high',
        category: 'overflow',
        message: 'Horizontal overflow',
        hardFail: true
    });

    const assessment = scoreVisualPage('home', {}, [finding]);

    assert.equal(assessment.status, 'bad');
    assert.equal(assessment.hardFails.length, 1);
    assert.equal(assessment.score, 75);
});

test('scoreVisualPage returns review for medium non-blocking degradation in the 70-84 band', () => {
    const findings = [
        createVisualFinding({
            route: '/services.html',
            viewport: 'laptop',
            severity: 'medium',
            category: 'cta_hierarchy',
            message: 'CTA overload'
        }),
        createVisualFinding({
            route: '/services.html',
            viewport: 'laptop',
            severity: 'medium',
            category: 'clipping',
            message: 'Minor clipping'
        }),
        createVisualFinding({
            route: '/services.html',
            viewport: 'laptop',
            severity: 'medium',
            category: 'media_load',
            message: 'Hero media missing'
        })
    ];

    const assessment = scoreVisualPage('hub_marketing', {}, findings);

    assert.equal(assessment.status, 'review');
    assert.equal(assessment.score, 70);
});

test('scoreVisualPage keeps pages in review while the approved baseline is missing', () => {
    const assessment = scoreVisualPage('home', {}, [], {
        baselineDiff: {
            status: 'missing'
        }
    });

    assert.equal(assessment.status, 'review');
    assert.equal(assessment.score, 100);
    assert.equal(assessment.needsReview, true);
    assert.ok(assessment.reviewGates.includes('missing_approved_baseline'));
});

test('scoreVisualPage keeps premium pages in review when the design contract drifts', () => {
    const findings = [
        createVisualFinding({
            route: '/ferrari-rental-dubai.html',
            viewport: 'desktop-wide',
            severity: 'medium',
            category: 'shape_drift',
            message: 'Radius drift',
            source: 'design_contract'
        })
    ];
    const assessment = scoreVisualPage('hub_marketing', {}, findings);

    assert.equal(assessment.status, 'review');
    assert.equal(assessment.score, 90);
    assert.ok(assessment.reviewGates.includes('premium_contract_drift'));
});

test('shouldEscalateToVision requires judgement for missing baselines and premium contract drift', () => {
    const missingBaselineDecision = shouldEscalateToVision({
        profile: 'home',
        assessment: { status: 'review' },
        baselineDiff: { status: 'missing' },
        findings: []
    });
    const premiumContractDecision = shouldEscalateToVision({
        profile: 'hub_marketing',
        assessment: { status: 'review' },
        baselineDiff: null,
        findings: [
            createVisualFinding({
                route: '/services.html',
                viewport: 'desktop-wide',
                severity: 'medium',
                category: 'shape_drift',
                message: 'Radius drift',
                source: 'design_contract'
            })
        ]
    });

    assert.equal(missingBaselineDecision.required, true);
    assert.equal(missingBaselineDecision.reason, 'missing_approved_baseline');
    assert.equal(premiumContractDecision.required, true);
    assert.equal(premiumContractDecision.reason, 'premium_critical_review_state');
});

test('summarizeVisualFindings deduplicates repeated findings and preserves highest severity', () => {
    const findings = [
        createVisualFinding({
            route: '/fleet.html',
            viewport: 'mobile-modern',
            severity: 'medium',
            category: 'grid_stability',
            selector: '.js-fleet-card',
            message: 'Card grid drift'
        }),
        createVisualFinding({
            route: '/fleet.html',
            viewport: 'mobile-modern',
            severity: 'high',
            category: 'grid_stability',
            selector: '.js-fleet-card',
            message: 'Card grid drift',
            hardFail: true
        })
    ];

    const deduped = dedupeVisualFindings(findings);
    const summary = summarizeVisualFindings(findings);

    assert.equal(deduped.length, 1);
    assert.equal(deduped[0].severity, 'high');
    assert.equal(summary.counts.total, 1);
    assert.equal(summary.counts.hardFails, 1);
});
