const { PUBLIC_PAGE_FILE_MAP } = require('./public-page-map');

const SCORE_WEIGHTS = Object.freeze({
    layoutIntegrity: 35,
    firstViewportHierarchy: 25,
    readability: 15,
    mediaComposition: 15,
    stabilityInteraction: 10
});

const SEVERITY_PENALTIES = Object.freeze({
    high: 25,
    medium: 10,
    low: 4
});

const BRAND_REFERENCE_ROUTE = '/ferrari-rental-dubai.html';
const VEHICLE_REFERENCE_ROUTE = '/ferrari-296-gts-rental-dubai.html';

const VISUAL_FINDING_CATEGORIES = Object.freeze([
    'overflow',
    'overlap',
    'heading',
    'primary_cta',
    'cta_hierarchy',
    'media_load',
    'header_occlusion',
    'clipping',
    'contrast',
    'first_viewport_layout',
    'layout_gap',
    'section_rhythm',
    'family_layout_drift',
    'console_error',
    'request_failure',
    'grid_stability',
    'layout_instability',
    'interaction_state',
    'form_visibility',
    'unexpected_diff',
    'vision_review',
    'cohort_mismatch',
    'legacy_template',
    'card_consistency',
    'fleet_handoff',
    'font_drift',
    'surface_drift',
    'shape_drift',
    'button_variant_sprawl',
    'header_consistency',
    'date_currentness',
    'text_encoding',
    'border_weight_drift',
    'spacing',
    'layout_homogeneity',
    'visual_affordance'
]);

const PROFILE_CONFIG = Object.freeze({
    home: {
        label: 'Home',
        heroLed: true,
        premiumCritical: true,
        expectedVisibleH1: 'exactly_one'
    },
    hub_marketing: {
        label: 'Hub / marketing',
        heroLed: true,
        premiumCritical: true,
        expectedVisibleH1: 'exactly_one'
    },
    fleet: {
        label: 'Fleet',
        heroLed: false,
        premiumCritical: false,
        expectedVisibleH1: 'exactly_one'
    },
    vehicle_pdp: {
        label: 'Vehicle PDP',
        heroLed: false,
        premiumCritical: true,
        expectedVisibleH1: 'exactly_one'
    },
    reserve: {
        label: 'Reserve',
        heroLed: false,
        premiumCritical: false,
        expectedVisibleH1: 'zero_or_one'
    },
    contact: {
        label: 'Contact',
        heroLed: false,
        premiumCritical: false,
        expectedVisibleH1: 'exactly_one'
    },
    legal: {
        label: 'Legal',
        heroLed: false,
        premiumCritical: false,
        expectedVisibleH1: 'exactly_one'
    }
});

const FINDING_BUCKETS = Object.freeze({
    overflow: 'layoutIntegrity',
    overlap: 'layoutIntegrity',
    header_occlusion: 'layoutIntegrity',
    grid_stability: 'layoutIntegrity',
    layout_instability: 'layoutIntegrity',
    interaction_state: 'stabilityInteraction',
    cohort_mismatch: 'layoutIntegrity',
    legacy_template: 'layoutIntegrity',
    card_consistency: 'layoutIntegrity',
    fleet_handoff: 'layoutIntegrity',
    surface_drift: 'layoutIntegrity',
    shape_drift: 'layoutIntegrity',
    button_variant_sprawl: 'layoutIntegrity',
    header_consistency: 'layoutIntegrity',
    date_currentness: 'stabilityInteraction',
    text_encoding: 'readability',
    border_weight_drift: 'layoutIntegrity',
    spacing: 'layoutIntegrity',
    layout_homogeneity: 'layoutIntegrity',
    visual_affordance: 'layoutIntegrity',
    heading: 'firstViewportHierarchy',
    primary_cta: 'firstViewportHierarchy',
    cta_hierarchy: 'firstViewportHierarchy',
    clipping: 'readability',
    first_viewport_layout: 'firstViewportHierarchy',
    section_rhythm: 'layoutIntegrity',
    family_layout_drift: 'firstViewportHierarchy',
    font_drift: 'readability',
    contrast: 'readability',
    layout_gap: 'layoutIntegrity',
    media_load: 'mediaComposition',
    console_error: 'stabilityInteraction',
    request_failure: 'stabilityInteraction',
    form_visibility: 'stabilityInteraction',
    unexpected_diff: 'layoutIntegrity',
    vision_review: 'mediaComposition'
});

const KEY_VISUAL_ROUTES = Object.freeze([
    '/',
    '/fleet.html',
    '/services.html',
    '/locations.html',
    '/contact.html',
    '/app/reserve/page.html',
    '/luxury-car-rental-dubai.html',
    '/porsche-rental-dubai.html',
    '/ferrari-296-gts-rental-dubai.html',
    '/mercedes-g63-amg-rental-dubai.html'
]);

const COHORT_CONFIG = Object.freeze({
    home: {
        label: 'Home',
        includeByDefault: true
    },
    hub_marketing: {
        label: 'Hub / marketing',
        includeByDefault: true
    },
    guide_landing: {
        label: 'Guide landing',
        includeByDefault: true
    },
    service_landing: {
        label: 'Service landing',
        includeByDefault: true
    },
    brand_landing: {
        label: 'Brand landing',
        includeByDefault: true,
        referenceRoute: BRAND_REFERENCE_ROUTE
    },
    vehicle_pdp: {
        label: 'Vehicle PDP',
        includeByDefault: false,
        referenceRoute: VEHICLE_REFERENCE_ROUTE
    },
    reserve: {
        label: 'Reserve',
        includeByDefault: true
    },
    contact: {
        label: 'Contact',
        includeByDefault: true
    },
    legal: {
        label: 'Legal',
        includeByDefault: true
    },
    fleet: {
        label: 'Fleet',
        includeByDefault: true
    }
});

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeRoute(route = '') {
    const pathname = String(route || '/').split(/[?#]/)[0] || '/';
    return pathname === '/index.html' ? '/' : pathname;
}

function filePathForRoute(route = '') {
    const normalizedRoute = normalizeRoute(route);
    return PUBLIC_PAGE_FILE_MAP[normalizedRoute] || normalizedRoute.replace(/^\//, '');
}

function classifyRouteProfile(route = '') {
    const normalizedRoute = normalizeRoute(route);
    const filePath = filePathForRoute(normalizedRoute);

    if (normalizedRoute === '/') {
        return 'home';
    }

    if (normalizedRoute === '/fleet.html') {
        return 'fleet';
    }

    if (normalizedRoute === '/app/reserve/page.html') {
        return 'reserve';
    }

    if (normalizedRoute === '/contact.html') {
        return 'contact';
    }

    if (filePath.includes('pages/legal/')) {
        return 'legal';
    }

    if (
        normalizedRoute === '/about.html' ||
        normalizedRoute === '/services.html' ||
        normalizedRoute === '/locations.html' ||
        filePath.includes('pages/guides/') ||
        filePath.includes('pages/services/') ||
        filePath.includes('pages/brands/')
    ) {
        return 'hub_marketing';
    }

    if (filePath.includes('pages/vehicles/')) {
        return 'vehicle_pdp';
    }

    return 'hub_marketing';
}

function classifyRouteCohort(route = '') {
    const normalizedRoute = normalizeRoute(route);
    const filePath = filePathForRoute(normalizedRoute);

    if (normalizedRoute === '/') {
        return 'home';
    }

    if (normalizedRoute === '/fleet.html') {
        return 'fleet';
    }

    if (normalizedRoute === '/contact.html') {
        return 'contact';
    }

    if (normalizedRoute === '/app/reserve/page.html') {
        return 'reserve';
    }

    if (filePath.includes('pages/legal/')) {
        return 'legal';
    }

    if (
        normalizedRoute === '/about.html' ||
        normalizedRoute === '/services.html' ||
        normalizedRoute === '/locations.html'
    ) {
        return 'hub_marketing';
    }

    if (filePath.includes('pages/guides/')) {
        return 'guide_landing';
    }

    if (filePath.includes('pages/services/')) {
        return 'service_landing';
    }

    if (filePath.includes('pages/brands/')) {
        return 'brand_landing';
    }

    if (filePath.includes('pages/vehicles/')) {
        return 'vehicle_pdp';
    }

    return 'hub_marketing';
}

function getProfileConfig(profile) {
    return PROFILE_CONFIG[profile] || PROFILE_CONFIG.hub_marketing;
}

function getCohortConfig(cohort) {
    return COHORT_CONFIG[cohort] || COHORT_CONFIG.hub_marketing;
}

function getRoutesForCohorts(allowedCohorts) {
    const allowed = new Set(allowedCohorts);

    return Object.keys(PUBLIC_PAGE_FILE_MAP)
        .filter((route) => allowed.has(classifyRouteCohort(route)))
        .map((route) => normalizeRoute(route));
}

function getVehicleVisualRoutes() {
    return getRoutesForCohorts(['vehicle_pdp']);
}

function getDefaultVisualRoutes(scope = 'key') {
    if (scope === 'all-public') {
        return Object.keys(PUBLIC_PAGE_FILE_MAP).map((route) => normalizeRoute(route));
    }

    if (scope === 'landings') {
        return getRoutesForCohorts([
            'home',
            'hub_marketing',
            'guide_landing',
            'service_landing',
            'brand_landing',
            'fleet',
            'contact',
            'reserve'
        ]);
    }

    if (scope === 'vehicles') {
        return getVehicleVisualRoutes();
    }

    return KEY_VISUAL_ROUTES.filter((route) => Boolean(PUBLIC_PAGE_FILE_MAP[route]));
}

function createVisualFinding(input) {
    return {
        route: normalizeRoute(input.route),
        viewport: input.viewport || '',
        severity: input.severity || 'medium',
        category: input.category || 'layout_instability',
        selector: input.selector || '',
        message: input.message || '',
        evidence: input.evidence || '',
        likelyCause: input.likelyCause || '',
        hardFail: Boolean(input.hardFail),
        screenshotPath: input.screenshotPath || '',
        source: input.source || 'deterministic'
    };
}

function findingKey(finding) {
    return [
        normalizeRoute(finding.route),
        finding.viewport || '',
        finding.category || '',
        finding.selector || '',
        String(finding.message || '').trim().toLowerCase()
    ].join('::');
}

function severityRank(severity) {
    if (severity === 'high') {
        return 3;
    }

    if (severity === 'medium') {
        return 2;
    }

    return 1;
}

function dedupeVisualFindings(findings = []) {
    const byKey = new Map();

    for (const finding of findings) {
        const normalizedFinding = createVisualFinding(finding);
        const key = findingKey(normalizedFinding);
        const existing = byKey.get(key);

        if (!existing) {
            byKey.set(key, normalizedFinding);
            continue;
        }

        if (severityRank(normalizedFinding.severity) > severityRank(existing.severity)) {
            byKey.set(key, normalizedFinding);
            continue;
        }

        if (!existing.hardFail && normalizedFinding.hardFail) {
            byKey.set(key, normalizedFinding);
        }
    }

    return [...byKey.values()].sort((left, right) => {
        const severityDifference = severityRank(right.severity) - severityRank(left.severity);

        if (severityDifference !== 0) {
            return severityDifference;
        }

        return findingKey(left).localeCompare(findingKey(right));
    });
}

function summarizeVisualFindings(findings = []) {
    const uniqueFindings = dedupeVisualFindings(findings);
    const counts = {
        total: uniqueFindings.length,
        hardFails: 0,
        bySeverity: {
            high: 0,
            medium: 0,
            low: 0
        },
        byCategory: {}
    };

    for (const finding of uniqueFindings) {
        counts.bySeverity[finding.severity] = (counts.bySeverity[finding.severity] || 0) + 1;
        counts.byCategory[finding.category] = (counts.byCategory[finding.category] || 0) + 1;

        if (finding.hardFail) {
            counts.hardFails += 1;
        }
    }

    return {
        counts,
        highestSeverity: uniqueFindings[0]?.severity || 'low',
        highlights: uniqueFindings.slice(0, 5)
    };
}

function applyPenalty(breakdown, finding) {
    const bucket = FINDING_BUCKETS[finding.category] || 'layoutIntegrity';
    const penalty = SEVERITY_PENALTIES[finding.severity] || SEVERITY_PENALTIES.medium;
    breakdown[bucket] = clamp(breakdown[bucket] - penalty, 0, SCORE_WEIGHTS[bucket]);
}

function isDesignContractDrift(finding = {}) {
    return (
        ['font_drift', 'surface_drift', 'shape_drift', 'button_variant_sprawl'].includes(finding.category) &&
        ['design_contract', 'design_system'].includes(finding.source)
    );
}

function scoreVisualPage(profile, metrics = {}, findings = [], options = {}) {
    const uniqueFindings = dedupeVisualFindings(findings);
    const breakdown = { ...SCORE_WEIGHTS };
    const profileConfig = getProfileConfig(profile);

    for (const finding of uniqueFindings) {
        applyPenalty(breakdown, finding);
    }

    const totalScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    const baselineDiff = options.baselineDiff || null;
    const vision = options.vision || null;
    const hardFails = uniqueFindings.filter((finding) => finding.hardFail);
    const hasMissingApprovedBaseline = baselineDiff?.status === 'missing';
    const hasPremiumContractDrift = profileConfig.premiumCritical && uniqueFindings.some((finding) => isDesignContractDrift(finding));
    const reviewGates = [];

    if (hasMissingApprovedBaseline) {
        reviewGates.push('missing_approved_baseline');
    }

    if (baselineDiff?.status === 'review') {
        reviewGates.push('baseline_diff_review');
    }

    if (hasPremiumContractDrift) {
        reviewGates.push('premium_contract_drift');
    }

    if (vision?.status === 'required') {
        reviewGates.push('vision_required');
    }

    if (vision?.status === 'skipped_not_configured') {
        reviewGates.push('vision_not_configured');
    }

    if (vision?.requiresHumanReview) {
        reviewGates.push('human_review_required');
    }

    let needsReview = reviewGates.length > 0;
    let status = 'review';

    if (hardFails.length > 0 || totalScore < 70 || baselineDiff?.status === 'bad') {
        status = 'bad';
    } else if (totalScore >= 85 && !needsReview) {
        status = 'good';
    }

    if (status !== 'good') {
        needsReview = needsReview || status === 'review';
    }

    return {
        profile,
        profileLabel: getProfileConfig(profile).label,
        status,
        score: totalScore,
        breakdown,
        hardFails,
        findings: uniqueFindings,
        baselineDiff,
        reviewGates,
        needsReview,
        vision
    };
}

function shouldEscalateToVision({
    profile,
    assessment,
    baselineDiff = null,
    findings = []
}) {
    const uniqueFindings = dedupeVisualFindings(findings);
    const config = getProfileConfig(profile);
    const hasHardFail = uniqueFindings.some((finding) => finding.hardFail);
    const hasUnexpectedDiff = uniqueFindings.some((finding) => finding.category === 'unexpected_diff');
    const hasMissingApprovedBaseline = baselineDiff?.status === 'missing';
    const hasPremiumContractDrift = config.premiumCritical && uniqueFindings.some((finding) => isDesignContractDrift(finding));
    const hasAmbiguousMediumFinding = uniqueFindings.some((finding) => (
        finding.severity === 'medium' &&
        ['cta_hierarchy', 'clipping', 'contrast', 'grid_stability', 'layout_gap', 'layout_instability'].includes(finding.category)
    ));

    if (hasHardFail) {
        return {
            required: false,
            reason: 'hard_fail_already_present'
        };
    }

    if (baselineDiff?.status === 'review' || hasUnexpectedDiff) {
        return {
            required: true,
            reason: 'baseline_diff_requires_judgement'
        };
    }

    if (hasMissingApprovedBaseline) {
        return {
            required: true,
            reason: 'missing_approved_baseline'
        };
    }

    if (config.premiumCritical && assessment?.status === 'review') {
        return {
            required: true,
            reason: 'premium_critical_review_state'
        };
    }

    if (hasPremiumContractDrift) {
        return {
            required: true,
            reason: 'premium_contract_drift'
        };
    }

    if (hasAmbiguousMediumFinding) {
        return {
            required: true,
            reason: 'ambiguous_visual_degradation'
        };
    }

    return {
        required: false,
        reason: 'deterministic_rules_sufficient'
    };
}

module.exports = {
    BRAND_REFERENCE_ROUTE,
    COHORT_CONFIG,
    PROFILE_CONFIG,
    SCORE_WEIGHTS,
    SEVERITY_PENALTIES,
    VEHICLE_REFERENCE_ROUTE,
    VISUAL_FINDING_CATEGORIES,
    classifyRouteCohort,
    classifyRouteProfile,
    clamp,
    createVisualFinding,
    dedupeVisualFindings,
    filePathForRoute,
    getCohortConfig,
    getDefaultVisualRoutes,
    getProfileConfig,
    getVehicleVisualRoutes,
    normalizeRoute,
    scoreVisualPage,
    shouldEscalateToVision,
    summarizeVisualFindings
};
