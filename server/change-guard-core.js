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
        summary: {
            badPages: badPages.length,
            reviewPages: reviewPages.length,
            hardFailPages: hardFailPages.length,
            missingBaselinePages: missingBaselinePages.length,
            baselineDiffPages: baselineDiffPages.length,
            memoryRegressions: memoryRegressions.length,
            missingMemory
        }
    };
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
    summarizeVisualChangeGuard
};
