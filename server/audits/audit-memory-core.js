const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const DEFAULT_MEMORY_ROOT = path.join(repoRoot, 'tests', 'audit-memory');
const MEMORY_VERSION = 1;

function normalizeRoute(route = '/') {
    let pathname = String(route || '/').split(/[?#]/)[0] || '/';

    if (/^https?:\/\//i.test(pathname)) {
        try {
            pathname = new URL(pathname).pathname || '/';
        } catch (error) {
            pathname = '/';
        }
    }

    if (!pathname.startsWith('/')) {
        pathname = `/${pathname}`;
    }

    if (pathname === '/index.html') {
        return '/';
    }

    if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
    }

    return pathname || '/';
}

function slugify(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 96) || 'unnamed';
}

function stableHash(value) {
    return crypto
        .createHash('sha1')
        .update(String(value || ''))
        .digest('hex')
        .slice(0, 12);
}

function inferAuditKind(report = {}) {
    if (report.navigationReview || report.renderedGraph) {
        return 'navigation';
    }

    if (report.functionalReview || report.customerJourneys) {
        return 'functional';
    }

    if ((report.pages || []).some((page) => page.assessment)) {
        return 'visual';
    }

    return 'generic';
}

function normalizeSignalStatus(value) {
    const status = String(value || '').trim().toLowerCase();

    if (['passed', 'pass', 'good', 'ok', 'approved', 'complete', 'clean', 'true'].includes(status)) {
        return 'passed';
    }

    if (['review', 'partial', 'warning', 'warn', 'skipped', 'deferred', 'unknown'].includes(status)) {
        return 'review';
    }

    if (['failed', 'fail', 'bad', 'error', 'missing', 'blocked', 'false'].includes(status)) {
        return 'failed';
    }

    return status ? 'review' : 'missing';
}

function isPassingStatus(status) {
    return normalizeSignalStatus(status) === 'passed';
}

function createSignal({
    key,
    family,
    route = '',
    viewport = '',
    status,
    label = '',
    evidence = '',
    source = '',
    metadata = {}
}) {
    return {
        key,
        family,
        route: route ? normalizeRoute(route) : '',
        viewport: String(viewport || ''),
        status: normalizeSignalStatus(status),
        label: String(label || ''),
        evidence: String(evidence || ''),
        source: String(source || ''),
        metadata
    };
}

function pushSignal(signals, signal) {
    if (!signal?.key || !signal.family) {
        return;
    }

    signals.push(createSignal(signal));
}

function extractNavigationSignals(report = {}) {
    const signals = [];

    for (const page of report.pages || []) {
        const route = normalizeRoute(page.route || '/');
        const viewport = String(page.viewport || '');
        const pageKey = `${route}::${viewport}`;

        pushSignal(signals, {
            key: `navigation:route-load:${pageKey}`,
            family: 'navigation.route-load',
            route,
            viewport,
            status: page.loadStatus === 'ok' ? 'passed' : 'failed',
            label: `${route} loads on ${viewport}`,
            evidence: page.loadMessage || page.loadStatus || 'ok',
            source: 'page.loadStatus'
        });

        for (const [name, value] of Object.entries(page.recoveryRoutes || {})) {
            pushSignal(signals, {
                key: `navigation:recovery:${pageKey}:${slugify(name)}`,
                family: 'navigation.recovery-route',
                route,
                viewport,
                status: value ? 'passed' : 'failed',
                label: `${route} exposes ${name} recovery on ${viewport}`,
                evidence: `${name}=${Boolean(value)}`,
                source: 'page.recoveryRoutes'
            });
        }

        const drawer = page.navigation?.mobileDrawer;
        if (drawer) {
            const drawerPassed = Boolean(
                drawer.toggleFound &&
                drawer.opened &&
                drawer.closed &&
                Number(drawer.internalLinkCount || 0) > 0
            );

            pushSignal(signals, {
                key: `navigation:mobile-drawer:${pageKey}`,
                family: 'navigation.mobile-drawer',
                route,
                viewport,
                status: drawerPassed ? 'passed' : 'failed',
                label: `${route} mobile drawer opens, closes and exposes links on ${viewport}`,
                evidence: `toggle=${Boolean(drawer.toggleFound)}; opened=${Boolean(drawer.opened)}; closed=${Boolean(drawer.closed)}; links=${Number(drawer.internalLinkCount || 0)}`,
                source: 'page.navigation.mobileDrawer'
            });
        }

        for (const menu of page.navigation?.megaMenus || []) {
            const id = slugify(menu.id || menu.label || menu.controls || 'mega-menu');
            const menuPassed = Boolean(menu.opened && Number(menu.internalLinkCount || 0) > 0);

            pushSignal(signals, {
                key: `navigation:mega-menu:${pageKey}:${id}`,
                family: 'navigation.mega-menu',
                route,
                viewport,
                status: menuPassed ? 'passed' : 'failed',
                label: `${route} mega menu ${menu.label || id} opens on ${viewport}`,
                evidence: `opened=${Boolean(menu.opened)}; links=${Number(menu.internalLinkCount || 0)}`,
                source: 'page.navigation.megaMenus'
            });
        }

        for (const escapeCheck of page.navigation?.localEscapes || []) {
            const id = slugify(escapeCheck.id || escapeCheck.label || 'local-exit');

            pushSignal(signals, {
                key: `navigation:local-exit:${pageKey}:${id}`,
                family: 'navigation.local-exit',
                route,
                viewport,
                status: escapeCheck.status || 'missing',
                label: escapeCheck.label || id,
                evidence: escapeCheck.message || '',
                source: 'page.navigation.localEscapes'
            });
        }

        for (const handoff of page.handoffs || []) {
            const targetRoute = normalizeRoute(handoff.targetRoute || '/');
            const area = slugify(handoff.area || 'unknown');
            const labelSlug = slugify(handoff.id || handoff.label || `${area}-${targetRoute}`);
            const key = `navigation:handoff:${pageKey}:${area}:${targetRoute}:${labelSlug}`;

            pushSignal(signals, {
                key,
                family: 'navigation.handoff',
                route,
                viewport,
                status: handoff.status || 'missing',
                label: handoff.label || handoff.id || targetRoute,
                evidence: handoff.message || `target=${targetRoute}`,
                source: 'page.handoffs',
                metadata: {
                    targetRoute,
                    area: handoff.area || ''
                }
            });
        }
    }

    return signals;
}

function extractFunctionalSignals(report = {}) {
    const signals = [];

    for (const page of report.pages || []) {
        const route = normalizeRoute(page.route || '/');
        const viewport = String(page.viewport || '');
        const pageKey = `${route}::${viewport}`;

        pushSignal(signals, {
            key: `functional:console-clean:${pageKey}`,
            family: 'functional.console-clean',
            route,
            viewport,
            status: (page.consoleErrors || []).length === 0 ? 'passed' : 'failed',
            label: `${route} has no console errors on ${viewport}`,
            evidence: `${(page.consoleErrors || []).length} console errors`,
            source: 'page.consoleErrors'
        });

        for (const action of page.actions || []) {
            const id = slugify(action.id || action.label || action.selector || stableHash(JSON.stringify(action)));
            const expectedTargetPath = action.expectedTargetPath ? normalizeRoute(action.expectedTargetPath) : '';
            const observedPath = action.observedPath
                ? normalizeRoute(action.observedPath)
                : action.observedUrl
                    ? normalizeRoute(action.observedUrl)
                    : '';

            pushSignal(signals, {
                key: `functional:action:${pageKey}:${id}`,
                family: 'functional.action',
                route,
                viewport,
                status: action.status || 'missing',
                label: action.label || action.id || id,
                evidence: [
                    action.message || action.error || '',
                    expectedTargetPath ? `expected=${expectedTargetPath}` : '',
                    observedPath ? `observed=${observedPath}` : ''
                ].filter(Boolean).join('; '),
                source: 'page.actions',
                metadata: {
                    kind: action.kind || '',
                    interactionType: action.interactionType || '',
                    expectedTargetPath,
                    observedPath
                }
            });

            if (expectedTargetPath) {
                pushSignal(signals, {
                    key: `functional:navigation-target:${pageKey}:${id}:${slugify(expectedTargetPath)}`,
                    family: 'functional.navigation-target',
                    route,
                    viewport,
                    status: action.status === 'passed' && observedPath === expectedTargetPath ? 'passed' : 'failed',
                    label: `${action.label || action.id || id} reaches ${expectedTargetPath}`,
                    evidence: `expected=${expectedTargetPath}; observed=${observedPath || 'unknown'}`,
                    source: 'page.actions.expectedTargetPath',
                    metadata: {
                        actionId: action.id || id,
                        expectedTargetPath,
                        observedPath
                    }
                });
            }

            for (const [stepIndex, step] of (action.steps || []).entries()) {
                const stepId = slugify(step.id || step.label || `step-${stepIndex + 1}`);
                const stepStatus = action.status === 'passed'
                    ? (step.status || 'passed')
                    : 'failed';

                pushSignal(signals, {
                    key: `functional:action-step:${pageKey}:${id}:${String(stepIndex + 1).padStart(2, '0')}:${stepId}`,
                    family: 'functional.action-step',
                    route,
                    viewport,
                    status: stepStatus,
                    label: `${action.label || action.id || id}: ${step.label || stepId}`,
                    evidence: [
                        step.expected ? `expected=${step.expected}` : '',
                        step.observed ? `observed=${step.observed}` : '',
                        step.detail || ''
                    ].filter(Boolean).join('; ') || action.message || '',
                    source: 'page.actions.steps',
                    metadata: {
                        actionId: action.id || id,
                        actionKind: action.kind || '',
                        stepIndex: stepIndex + 1,
                        stepId
                    }
                });
            }
        }
    }

    for (const scenario of report.customerJourneys?.scenarios || []) {
        const scenarioId = slugify(scenario.id || scenario.label || scenario.name || stableHash(JSON.stringify(scenario)));
        const byDevice = scenario.byDevice || {};

        for (const [device, summary] of Object.entries(byDevice)) {
            const failed = Number(summary.failed || 0);
            const passed = Number(summary.passed || 0);
            const skipped = Number(summary.skipped || 0);
            const status = failed > 0
                ? 'failed'
                : passed > 0
                    ? 'passed'
                    : skipped > 0
                        ? 'review'
                        : 'missing';

            pushSignal(signals, {
                key: `functional:journey:${scenarioId}:${slugify(device)}`,
                family: 'functional.customer-journey',
                status,
                label: `${scenario.label || scenarioId} on ${device}`,
                evidence: `passed=${passed}; failed=${failed}; skipped=${skipped}`,
                source: 'customerJourneys.scenarios'
            });
        }
    }

    return signals;
}

const VISUAL_SEMANTIC_GUARDS = Object.freeze([
    Object.freeze({
        family: 'visual.first-viewport',
        label: 'first viewport hierarchy and composition stay intentional',
        categories: Object.freeze([
            'heading',
            'heading_balance',
            'primary_cta',
            'cta_hierarchy',
            'first_viewport_layout',
            'layout_gap',
            'header_occlusion'
        ])
    }),
    Object.freeze({
        family: 'visual.layout-stability',
        label: 'layout geometry does not drift, overflow, overlap, or clip',
        categories: Object.freeze([
            'overflow',
            'overlap',
            'clipping',
            'grid_stability',
            'layout_instability',
            'section_rhythm',
            'spacing',
            'layout_homogeneity'
        ])
    }),
    Object.freeze({
        family: 'visual.family-drift',
        label: 'route keeps its approved family rhythm and template identity',
        categories: Object.freeze([
            'family_layout_drift',
            'cohort_mismatch',
            'legacy_template',
            'card_consistency'
        ])
    }),
    Object.freeze({
        family: 'visual.surface-quality',
        label: 'surface, typography, shape, and button treatment stay consistent',
        categories: Object.freeze([
            'font_drift',
            'surface_drift',
            'shape_drift',
            'button_variant_sprawl',
            'header_consistency',
            'header_identity_drift',
            'header_surface_drift',
            'header_cta_drift',
            'header_dropdown_drift',
            'drawer_brand_drift',
            'drawer_system_drift',
            'border_weight_drift',
            'visual_affordance'
        ])
    }),
    Object.freeze({
        family: 'visual.readability',
        label: 'visible text remains readable and correctly encoded',
        categories: Object.freeze([
            'contrast',
            'text_encoding'
        ])
    }),
    Object.freeze({
        family: 'visual.media-and-state',
        label: 'media, forms, interactions, and dated booking state stay healthy',
        categories: Object.freeze([
            'media_load',
            'interaction_state',
            'form_visibility',
            'fleet_handoff',
            'date_currentness'
        ])
    }),
    Object.freeze({
        family: 'visual.unexpected-change',
        label: 'approved screenshots do not show unexpected visual change',
        categories: Object.freeze([
            'unexpected_diff',
            'vision_review'
        ])
    })
]);

function visualFindingStatus(findings = []) {
    if (findings.some((finding) => finding.hardFail || finding.severity === 'high')) {
        return 'failed';
    }

    if (findings.length > 0) {
        return 'review';
    }

    return 'passed';
}

function visualFindingEvidence(findings = []) {
    if (findings.length === 0) {
        return 'no findings';
    }

    return findings
        .slice(0, 3)
        .map((finding) => `${finding.category || 'unknown'}:${finding.severity || 'medium'}:${String(finding.message || '').slice(0, 120)}`)
        .join(' | ');
}

function extractVisualSignals(report = {}) {
    const signals = [];

    for (const page of report.pages || []) {
        const route = normalizeRoute(page.route || '/');
        const viewport = String(page.viewport || '');
        const pageKey = `${route}::${viewport}`;
        const findings = page.assessment?.findings || page.findings || [];

        pushSignal(signals, {
            key: `visual:page-health:${pageKey}`,
            family: 'visual.page-health',
            route,
            viewport,
            status: page.assessment?.status || 'missing',
            label: `${route} visual health on ${viewport}`,
            evidence: `score=${page.assessment?.score ?? 'unknown'}`,
            source: 'page.assessment'
        });

        if (page.baselineDiff) {
            pushSignal(signals, {
                key: `visual:baseline-diff:${pageKey}`,
                family: 'visual.baseline-diff',
                route,
                viewport,
                status: page.baselineDiff.status || 'missing',
                label: `${route} matches approved visual baseline on ${viewport}`,
                evidence: page.baselineDiff.message || `status=${page.baselineDiff.status || 'missing'}`,
                source: 'page.baselineDiff'
            });
        }

        for (const guard of VISUAL_SEMANTIC_GUARDS) {
            const guardFindings = findings.filter((finding) => guard.categories.includes(finding.category));

            pushSignal(signals, {
                key: `${guard.family}:${pageKey}`,
                family: guard.family,
                route,
                viewport,
                status: visualFindingStatus(guardFindings),
                label: `${route} ${guard.label} on ${viewport}`,
                evidence: visualFindingEvidence(guardFindings),
                source: 'page.assessment.findings',
                metadata: {
                    categories: [...guard.categories]
                }
            });
        }
    }

    return signals;
}

function extractAuditSignals(report = {}, kind = inferAuditKind(report)) {
    if (kind === 'navigation') {
        return extractNavigationSignals(report);
    }

    if (kind === 'functional') {
        return extractFunctionalSignals(report);
    }

    if (kind === 'visual') {
        return extractVisualSignals(report);
    }

    return [];
}

function buildReportScope(report = {}, signals = extractAuditSignals(report)) {
    const routes = new Set();
    const viewports = new Set();
    const routeViewports = new Set();

    for (const route of report.selectedRoutes || []) {
        routes.add(normalizeRoute(route));
    }

    for (const viewport of report.selectedViewports || []) {
        viewports.add(String(viewport || ''));
    }

    for (const page of report.pages || []) {
        const route = normalizeRoute(page.route || '/');
        const viewport = String(page.viewport || '');
        routes.add(route);

        if (viewport) {
            viewports.add(viewport);
            routeViewports.add(`${route}::${viewport}`);
        }
    }

    for (const signal of signals || []) {
        if (signal.route) {
            routes.add(normalizeRoute(signal.route));
        }

        if (signal.viewport) {
            viewports.add(String(signal.viewport));
        }

        if (signal.route && signal.viewport) {
            routeViewports.add(`${normalizeRoute(signal.route)}::${signal.viewport}`);
        }
    }

    return { routes, viewports, routeViewports };
}

function isSignalInScope(signal, scope) {
    if (signal.route && signal.viewport) {
        return scope.routeViewports.has(`${normalizeRoute(signal.route)}::${signal.viewport}`);
    }

    if (signal.route) {
        return scope.routes.has(normalizeRoute(signal.route));
    }

    if (signal.viewport) {
        return scope.viewports.has(String(signal.viewport));
    }

    return true;
}

function isSignalFamilyEnabled(report = {}, family = '') {
    if (family === 'navigation.handoff') {
        return Number(report.maxClicksPerPage || 0) > 0;
    }

    return true;
}

function summarizeSignals(signals = []) {
    const summary = {
        total: signals.length,
        passed: 0,
        review: 0,
        failed: 0,
        missing: 0,
        byFamily: {}
    };

    for (const signal of signals) {
        const status = normalizeSignalStatus(signal.status);
        summary[status] = Number(summary[status] || 0) + 1;
        summary.byFamily[signal.family] = Number(summary.byFamily[signal.family] || 0) + 1;
    }

    return summary;
}

function buildAuditMemory(report = {}, options = {}) {
    const kind = options.kind || inferAuditKind(report);
    const signals = extractAuditSignals(report, kind)
        .sort((left, right) => left.key.localeCompare(right.key));
    const signalHash = stableHash(JSON.stringify(signals.map((signal) => [
        signal.key,
        signal.status,
        signal.evidence
    ])));

    return {
        version: MEMORY_VERSION,
        kind,
        generatedAt: new Date().toISOString(),
        sourceGeneratedAt: report.generatedAt || '',
        sourceSummary: summarizeReportForMemory(report, kind),
        signalHash,
        signalsSummary: summarizeSignals(signals),
        signals
    };
}

function summarizeReportForMemory(report = {}, kind = inferAuditKind(report)) {
    if (kind === 'navigation') {
        return {
            status: report.summary?.navigationStatus || report.navigationReview?.status || 'unknown',
            routes: report.summary?.totalRoutes ?? report.selectedRoutes?.length ?? 0,
            viewports: report.summary?.totalViewports ?? report.selectedViewports?.length ?? 0,
            handoffs: report.summary?.totalHandoffs ?? 0,
            failedHandoffs: report.summary?.failedHandoffs ?? 0,
            hardFails: report.navigationReview?.summary?.hardFails ?? 0,
            high: report.navigationReview?.summary?.bySeverity?.high ?? 0
        };
    }

    if (kind === 'functional') {
        return {
            status: report.functionalReview?.status || 'unknown',
            routes: report.summary?.totalRoutes ?? 0,
            actions: report.summary?.totalActions ?? 0,
            realSteps: report.summary?.realSteps ?? 0,
            failedActions: report.summary?.failedActions ?? 0,
            hardFails: report.functionalReview?.summary?.hardFails ?? 0
        };
    }

    if (kind === 'visual') {
        return {
            good: report.summary?.byStatus?.good ?? 0,
            review: report.summary?.byStatus?.review ?? 0,
            bad: report.summary?.byStatus?.bad ?? 0,
            hardFails: report.summary?.hardFailCount ?? 0
        };
    }

    return {};
}

function compareAuditMemory(report = {}, approvedMemory = null, options = {}) {
    const kind = options.kind || approvedMemory?.kind || inferAuditKind(report);

    if (!approvedMemory) {
        return {
            kind,
            status: 'missing',
            message: 'No approved audit memory exists yet.',
            approvedMemoryPath: options.approvedMemoryPath || '',
            regressions: [],
            summary: {
                requiredSignals: 0,
                comparedSignals: 0,
                skippedOutOfScope: 0,
                skippedDisabledFamily: 0,
                regressions: 0
            }
        };
    }

    const currentSignals = extractAuditSignals(report, kind);
    const currentScope = buildReportScope(report, currentSignals);
    const currentByKey = new Map(currentSignals.map((signal) => [signal.key, signal]));
    const regressions = [];
    let requiredSignals = 0;
    let comparedSignals = 0;
    let skippedOutOfScope = 0;
    let skippedDisabledFamily = 0;

    for (const approvedSignal of approvedMemory.signals || []) {
        if (!isPassingStatus(approvedSignal.status)) {
            continue;
        }

        requiredSignals += 1;

        if (!isSignalInScope(approvedSignal, currentScope)) {
            skippedOutOfScope += 1;
            continue;
        }

        if (!isSignalFamilyEnabled(report, approvedSignal.family)) {
            skippedDisabledFamily += 1;
            continue;
        }

        comparedSignals += 1;
        const currentSignal = currentByKey.get(approvedSignal.key);

        if (!currentSignal) {
            regressions.push({
                key: approvedSignal.key,
                family: approvedSignal.family,
                route: approvedSignal.route || '',
                viewport: approvedSignal.viewport || '',
                type: 'missing_signal',
                previousStatus: approvedSignal.status,
                currentStatus: 'missing',
                label: approvedSignal.label || approvedSignal.key,
                previousEvidence: approvedSignal.evidence || '',
                currentEvidence: ''
            });
            continue;
        }

        if (!isPassingStatus(currentSignal.status)) {
            regressions.push({
                key: approvedSignal.key,
                family: approvedSignal.family,
                route: approvedSignal.route || currentSignal.route || '',
                viewport: approvedSignal.viewport || currentSignal.viewport || '',
                type: 'status_regression',
                previousStatus: approvedSignal.status,
                currentStatus: currentSignal.status,
                label: approvedSignal.label || currentSignal.label || approvedSignal.key,
                previousEvidence: approvedSignal.evidence || '',
                currentEvidence: currentSignal.evidence || ''
            });
        }
    }

    return {
        kind,
        status: regressions.length > 0 ? 'bad' : 'good',
        message: regressions.length > 0
            ? `${regressions.length} approved audit guarantees regressed.`
            : 'No approved audit guarantees regressed.',
        approvedMemoryPath: options.approvedMemoryPath || '',
        currentSignalsSummary: summarizeSignals(currentSignals),
        approvedSignalsSummary: approvedMemory.signalsSummary || summarizeSignals(approvedMemory.signals || []),
        summary: {
            requiredSignals,
            comparedSignals,
            skippedOutOfScope,
            skippedDisabledFamily,
            regressions: regressions.length
        },
        regressions
    };
}

function memoryPathForKind(kind, memoryRoot = DEFAULT_MEMORY_ROOT) {
    return path.join(memoryRoot, `${kind}.json`);
}

function readApprovedAuditMemory(kind, memoryRoot = DEFAULT_MEMORY_ROOT) {
    const memoryPath = memoryPathForKind(kind, memoryRoot);

    if (!fs.existsSync(memoryPath)) {
        return null;
    }

    return JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
}

function writeApprovedAuditMemory(memory, memoryRoot = DEFAULT_MEMORY_ROOT) {
    if (!memory?.kind) {
        throw new Error('Cannot write audit memory without a kind.');
    }

    fs.mkdirSync(memoryRoot, { recursive: true });
    const memoryPath = memoryPathForKind(memory.kind, memoryRoot);
    fs.writeFileSync(memoryPath, `${JSON.stringify(memory, null, 2)}\n`);
    return memoryPath;
}

function compareReportToApprovedMemory(report = {}, options = {}) {
    const kind = options.kind || inferAuditKind(report);
    const memoryRoot = options.memoryRoot || DEFAULT_MEMORY_ROOT;
    const approvedMemoryPath = memoryPathForKind(kind, memoryRoot);
    const approvedMemory = readApprovedAuditMemory(kind, memoryRoot);

    return compareAuditMemory(report, approvedMemory, {
        kind,
        approvedMemoryPath
    });
}

function canApproveAuditMemory(report = {}, options = {}) {
    const kind = options.kind || inferAuditKind(report);
    const reasons = [];

    if (kind === 'navigation') {
        if ((report.summary?.navigationStatus || report.navigationReview?.status) !== 'good') {
            reasons.push(`navigationStatus=${report.summary?.navigationStatus || report.navigationReview?.status || 'unknown'}`);
        }

        if (Number(report.navigationReview?.summary?.hardFails || 0) > 0) {
            reasons.push(`hardFails=${report.navigationReview.summary.hardFails}`);
        }

        if (Number(report.navigationReview?.summary?.bySeverity?.high || 0) > 0) {
            reasons.push(`high=${report.navigationReview.summary.bySeverity.high}`);
        }
    } else if (kind === 'functional') {
        if ((report.functionalReview?.status || '') !== 'good') {
            reasons.push(`functionalStatus=${report.functionalReview?.status || 'unknown'}`);
        }

        if (Number(report.summary?.failedActions || 0) > 0) {
            reasons.push(`failedActions=${report.summary.failedActions}`);
        }

        if (Number(report.functionalReview?.summary?.hardFails || 0) > 0) {
            reasons.push(`hardFails=${report.functionalReview.summary.hardFails}`);
        }
    } else if (kind === 'visual') {
        if (Number(report.summary?.byStatus?.bad || 0) > 0) {
            reasons.push(`badPages=${report.summary.byStatus.bad}`);
        }

        if (Number(report.summary?.byStatus?.review || 0) > 0) {
            reasons.push(`reviewPages=${report.summary.byStatus.review}`);
        }

        if (Number(report.summary?.hardFailCount || 0) > 0) {
            reasons.push(`hardFails=${report.summary.hardFailCount}`);
        }

        const visualFindings = (report.pages || [])
            .reduce((count, page) => count + Number(page.assessment?.findings?.length || page.findings?.length || 0), 0);

        if (visualFindings > 0) {
            reasons.push(`visualFindings=${visualFindings}`);
        }
    }

    return {
        kind,
        canApprove: reasons.length === 0,
        reasons
    };
}

function formatAuditMemoryRegression(regression) {
    const location = [
        regression.route || '',
        regression.viewport ? `[${regression.viewport}]` : ''
    ].filter(Boolean).join(' ');

    return `${location ? `${location} ` : ''}${regression.family}: ${regression.label} (${regression.previousStatus} -> ${regression.currentStatus})`;
}

module.exports = {
    DEFAULT_MEMORY_ROOT,
    MEMORY_VERSION,
    buildAuditMemory,
    canApproveAuditMemory,
    compareAuditMemory,
    compareReportToApprovedMemory,
    extractAuditSignals,
    formatAuditMemoryRegression,
    inferAuditKind,
    isPassingStatus,
    memoryPathForKind,
    normalizeRoute,
    normalizeSignalStatus,
    readApprovedAuditMemory,
    summarizeSignals,
    writeApprovedAuditMemory
};
