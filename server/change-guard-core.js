const path = require('node:path');

const {
    DEFAULT_MEMORY_ROOT,
    compareReportToApprovedMemory,
    formatAuditMemoryRegression,
    readApprovedAuditMemory
} = require('./audit-memory-core');

function normalizeBoolean(value, fallback = false) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function visualPageKey(page = {}) {
    return `${page.route || '(unknown route)'} [${page.viewport || 'unknown viewport'}]`;
}

const VISUAL_RISK_GROUPS = Object.freeze([
    Object.freeze({
        key: 'firstViewport',
        label: 'first viewport',
        categories: Object.freeze(['heading', 'primary_cta', 'cta_hierarchy', 'first_viewport_layout', 'layout_gap', 'header_occlusion'])
    }),
    Object.freeze({
        key: 'layoutDrift',
        label: 'layout drift',
        categories: Object.freeze(['overflow', 'overlap', 'clipping', 'grid_stability', 'layout_instability', 'section_rhythm', 'spacing', 'layout_homogeneity'])
    }),
    Object.freeze({
        key: 'familyDrift',
        label: 'family/template drift',
        categories: Object.freeze(['family_layout_drift', 'cohort_mismatch', 'legacy_template', 'card_consistency'])
    }),
    Object.freeze({
        key: 'surfaceQuality',
        label: 'surface quality',
        categories: Object.freeze(['font_drift', 'surface_drift', 'shape_drift', 'button_variant_sprawl', 'header_consistency', 'border_weight_drift', 'visual_affordance'])
    }),
    Object.freeze({
        key: 'readability',
        label: 'readability',
        categories: Object.freeze(['contrast', 'text_encoding'])
    }),
    Object.freeze({
        key: 'mediaState',
        label: 'media/state',
        categories: Object.freeze(['media_load', 'interaction_state', 'form_visibility', 'fleet_handoff', 'date_currentness'])
    }),
    Object.freeze({
        key: 'unexpectedChange',
        label: 'unexpected screenshot change',
        categories: Object.freeze(['unexpected_diff', 'vision_review'])
    })
]);

function summarizeVisualIntelligence(report = {}) {
    const groups = Object.fromEntries(VISUAL_RISK_GROUPS.map((group) => [
        group.key,
        {
            label: group.label,
            pages: 0,
            hardFails: 0,
            findings: 0,
            examples: []
        }
    ]));
    const seenGroupPages = new Set();

    for (const page of report.pages || []) {
        const pageFindings = page.assessment?.findings || page.findings || [];

        for (const finding of pageFindings) {
            const group = VISUAL_RISK_GROUPS.find((candidate) => candidate.categories.includes(finding.category));

            if (!group) {
                continue;
            }

            const bucket = groups[group.key];
            const groupPageKey = `${group.key}::${visualPageKey(page)}`;

            if (!seenGroupPages.has(groupPageKey)) {
                seenGroupPages.add(groupPageKey);
                bucket.pages += 1;
            }

            bucket.findings += 1;

            if (finding.hardFail || finding.severity === 'high') {
                bucket.hardFails += 1;
            }

            if (bucket.examples.length < 3) {
                bucket.examples.push({
                    route: page.route || '',
                    viewport: page.viewport || '',
                    severity: finding.severity || 'medium',
                    category: finding.category || '',
                    message: finding.message || '',
                    evidence: finding.evidence || '',
                    screenshotPath: finding.screenshotPath || page.artifacts?.viewportScreenshot || ''
                });
            }
        }
    }

    const activeGroups = Object.entries(groups)
        .filter(([, details]) => details.findings > 0)
        .map(([key, details]) => ({ key, ...details }));

    return {
        activeGroups,
        summary: Object.fromEntries(activeGroups.map((group) => [
            group.key,
            {
                pages: group.pages,
                findings: group.findings,
                hardFails: group.hardFails
            }
        ])),
        totals: {
            groups: activeGroups.length,
            pages: activeGroups.reduce((sum, group) => sum + group.pages, 0),
            findings: activeGroups.reduce((sum, group) => sum + group.findings, 0),
            hardFails: activeGroups.reduce((sum, group) => sum + group.hardFails, 0)
        }
    };
}

function summarizeVisualChangeGuard(report = {}, options = {}) {
    const strictReview = normalizeBoolean(options.strictReview, true);
    const requireMemory = normalizeBoolean(options.requireMemory, true);
    const requireApprovedBaselines = normalizeBoolean(options.requireApprovedBaselines, true);
    const memoryRoot = options.memoryRoot || DEFAULT_MEMORY_ROOT;
    const approvedMemory = readApprovedAuditMemory('visual', memoryRoot);
    const auditMemory = compareReportToApprovedMemory(report, {
        kind: 'visual',
        memoryRoot
    });
    const pages = report.pages || [];
    const badPages = pages.filter((page) => page.assessment?.status === 'bad');
    const reviewPages = strictReview
        ? pages.filter((page) => page.assessment?.status === 'review')
        : [];
    const hardFailPages = pages.filter((page) => (page.assessment?.hardFails || []).length > 0);
    const missingBaselinePages = requireApprovedBaselines
        ? pages.filter((page) => page.baselineDiff?.status === 'missing')
        : [];
    const baselineDiffPages = pages.filter((page) => ['review', 'bad'].includes(page.baselineDiff?.status));
    const missingMemory = requireMemory && !approvedMemory;
    const memoryRegressions = auditMemory.status === 'bad' ? auditMemory.regressions || [] : [];
    const intelligence = summarizeVisualIntelligence(report);
    const failed = badPages.length > 0 ||
        reviewPages.length > 0 ||
        hardFailPages.length > 0 ||
        missingBaselinePages.length > 0 ||
        baselineDiffPages.length > 0 ||
        missingMemory ||
        memoryRegressions.length > 0;

    return {
        failed,
        strictReview,
        requireMemory,
        requireApprovedBaselines,
        memoryRoot,
        memoryPath: path.join(memoryRoot, 'visual.json'),
        auditMemory,
        missingMemory,
        badPages,
        reviewPages,
        hardFailPages,
        missingBaselinePages,
        baselineDiffPages,
        memoryRegressions,
        intelligence,
        summary: {
            badPages: badPages.length,
            reviewPages: reviewPages.length,
            hardFailPages: hardFailPages.length,
            missingBaselinePages: missingBaselinePages.length,
            baselineDiffPages: baselineDiffPages.length,
            memoryRegressions: memoryRegressions.length,
            missingMemory,
            intelligenceGroups: intelligence.totals.groups,
            intelligenceFindings: intelligence.totals.findings
        }
    };
}

function formatVisualFindingExample(example = {}) {
    const location = `${example.route || '(unknown route)'} [${example.viewport || 'unknown viewport'}]`;
    const evidence = example.evidence ? ` evidence=${example.evidence}` : '';
    const screenshot = example.screenshotPath ? ` screenshot=${example.screenshotPath}` : '';

    return `${location} ${example.severity || 'medium'} ${example.category || 'visual'}: ${example.message || 'Visual finding.'}${evidence}${screenshot}`;
}

function formatVisualChangeGuardFailure(guard = {}) {
    const lines = [];

    if (guard.missingMemory) {
        lines.push(`- visual memory missing: ${guard.memoryPath}`);
    }

    for (const page of guard.badPages || []) {
        lines.push(`- bad: ${visualPageKey(page)} score=${page.assessment?.score ?? 'n/a'}`);
    }

    for (const page of guard.reviewPages || []) {
        lines.push(`- review: ${visualPageKey(page)} score=${page.assessment?.score ?? 'n/a'} gates=${(page.assessment?.reviewGates || []).join(',') || 'none'}`);
    }

    for (const group of guard.intelligence?.activeGroups || []) {
        lines.push(`- visual intelligence: ${group.label} pages=${group.pages} findings=${group.findings} hardFails=${group.hardFails}`);

        for (const example of group.examples || []) {
            lines.push(`  - ${formatVisualFindingExample(example)}`);
        }
    }

    for (const page of guard.missingBaselinePages || []) {
        lines.push(`- missing baseline: ${visualPageKey(page)}`);
    }

    for (const page of guard.baselineDiffPages || []) {
        lines.push(`- baseline diff: ${visualPageKey(page)} status=${page.baselineDiff?.status} ${page.baselineDiff?.message || ''}`.trim());
    }

    for (const regression of guard.memoryRegressions || []) {
        lines.push(`- memory: ${formatAuditMemoryRegression(regression)}`);
    }

    return lines.join('\n');
}

module.exports = {
    formatVisualChangeGuardFailure,
    summarizeVisualIntelligence,
    summarizeVisualChangeGuard
};
