const FUNCTIONAL_HUMAN_REVIEW_RULES = Object.freeze([
    Object.freeze({
        id: 'intent_continuity',
        label: 'Business intent must survive the journey',
        checks: Object.freeze([
            'car, price, dates, times and pickup context survive internal handoffs',
            'a booking CTA must land on the expected booking surface',
            'back, reload and switching paths must not silently lose intent'
        ])
    }),
    Object.freeze({
        id: 'visible_recovery',
        label: 'Validation and recovery must be visible',
        checks: Object.freeze([
            'blocked steps explain what the guest needs to fix',
            'backend or payment failures preserve typed values',
            'retry paths remain available after transient errors'
        ])
    }),
    Object.freeze({
        id: 'mobile_unblocked',
        label: 'Mobile users must never be trapped',
        checks: Object.freeze([
            'navigation, forms and CTAs remain reachable on phone viewports',
            'mobile filters and drawers visibly open and close',
            'short screens do not hide the next useful action'
        ])
    }),
    Object.freeze({
        id: 'technical_confidence',
        label: 'Runtime confidence must stay clean',
        checks: Object.freeze([
            'no console errors during customer-like actions',
            'no broken document, script, stylesheet, fetch or XHR requests',
            'call and WhatsApp paths must use the approved number and context-aware message'
        ])
    }),
    Object.freeze({
        id: 'interaction_contract',
        label: 'Interactive controls must prove their destination or state change',
        checks: Object.freeze([
            'visible buttons are clicked in functional audits',
            'navigation buttons must reach the expected destination',
            'state buttons must visibly open, close, reset, validate or change UI state'
        ])
    }),
    Object.freeze({
        id: 'journey_evidence',
        label: 'The auditor must collect evidence for every critical mission',
        checks: Object.freeze([
            'desktop and mobile mission targets both have executed actions',
            'partial coverage is treated as review, not as a silent pass',
            'failed customer scenarios point to screenshots or action evidence'
        ])
    })
]);

const HARD_REQUEST_TYPES = new Set(['document', 'script', 'stylesheet', 'xhr', 'fetch']);
const IMPORTANT_ACTION_PATTERN = /(checkout|reserve|handoff|form|validation|filter|nav|menu|link:internal|tab-link|service-selector|media-lightbox|contact-link|button)/i;

function textSnippet(value, maxLength = 180) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 1)}...`;
}

function uniqueValues(values = []) {
    return [...new Set(values.filter(Boolean))];
}

function normalizeEvidence(items = []) {
    return items
        .filter(Boolean)
        .map((item) => textSnippet(item, 220))
        .filter(Boolean)
        .slice(0, 6);
}

function createFunctionalFinding({
    category,
    severity = 'medium',
    route = '',
    viewport = '',
    actionId = '',
    actionLabel = '',
    scenarioId = '',
    persona = '',
    message = '',
    evidence = [],
    hardFail
}) {
    const normalizedSeverity = ['high', 'medium', 'low'].includes(severity) ? severity : 'medium';

    return {
        category,
        severity: normalizedSeverity,
        hardFail: typeof hardFail === 'boolean' ? hardFail : normalizedSeverity === 'high',
        route,
        viewport,
        actionId,
        actionLabel,
        scenarioId,
        persona,
        message: textSnippet(message, 260),
        evidence: normalizeEvidence(evidence)
    };
}

function findingKey(finding) {
    return [
        finding.category,
        finding.route,
        finding.viewport,
        finding.actionId,
        finding.scenarioId,
        finding.message,
        (finding.evidence || [])[0] || ''
    ].join('::');
}

function dedupeFunctionalFindings(findings = []) {
    const seen = new Set();
    const output = [];

    for (const finding of findings) {
        const key = findingKey(finding);
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        output.push(finding);
    }

    return output;
}

function summarizeRequestFailure(failure = {}) {
    const type = failure.resourceType || 'request';
    const status = failure.status || failure.failureText || 'error';
    const url = textSnippet(failure.url || '', 160);

    return `${type} ${status}${url ? ` ${url}` : ''}`;
}

function severityForRequest(failure = {}) {
    return HARD_REQUEST_TYPES.has(failure.resourceType) ? 'high' : 'medium';
}

function severityForAction(action = {}) {
    return IMPORTANT_ACTION_PATTERN.test(action.kind || '') ? 'high' : 'medium';
}

function collectActionFindings(pages = []) {
    const findings = [];

    for (const page of pages || []) {
        for (const action of page.actions || []) {
            if (action.status === 'failed') {
                const severity = severityForAction(action);
                findings.push(createFunctionalFinding({
                    category: 'action_failure',
                    severity,
                    route: page.route,
                    viewport: page.viewport,
                    actionId: action.id,
                    actionLabel: action.label,
                    message: `${action.label || action.id || 'Action'} failed during a customer-like interaction.`,
                    evidence: [
                        action.message,
                        action.observedUrl ? `observed url: ${action.observedUrl}` : '',
                        action.screenshotPath ? `screenshot: ${action.screenshotPath}` : ''
                    ],
                    hardFail: severity === 'high'
                }));
            }

            if (Array.isArray(action.consoleErrors) && action.consoleErrors.length > 0) {
                findings.push(createFunctionalFinding({
                    category: 'console_error',
                    severity: 'high',
                    route: page.route,
                    viewport: page.viewport,
                    actionId: action.id,
                    actionLabel: action.label,
                    message: `${action.label || action.id || 'Action'} produced console errors.`,
                    evidence: action.consoleErrors,
                    hardFail: true
                }));
            }

            for (const failure of action.requestFailures || []) {
                const severity = severityForRequest(failure);
                findings.push(createFunctionalFinding({
                    category: 'request_failure',
                    severity,
                    route: page.route,
                    viewport: page.viewport,
                    actionId: action.id,
                    actionLabel: action.label,
                    message: `${action.label || action.id || 'Action'} triggered a broken network request.`,
                    evidence: [summarizeRequestFailure(failure)],
                    hardFail: severity === 'high'
                }));
            }
        }
    }

    return findings;
}

function collectPageHealthFindings(pages = []) {
    const findings = [];

    for (const page of pages || []) {
        if (Array.isArray(page.consoleErrors) && page.consoleErrors.length > 0) {
            findings.push(createFunctionalFinding({
                category: 'console_error',
                severity: 'high',
                route: page.route,
                viewport: page.viewport,
                message: 'The page produced console errors before any extra customer action.',
                evidence: page.consoleErrors,
                hardFail: true
            }));
        }

        for (const failure of page.requestFailures || []) {
            const severity = severityForRequest(failure);
            findings.push(createFunctionalFinding({
                category: 'request_failure',
                severity,
                route: page.route,
                viewport: page.viewport,
                message: 'The page loaded with a broken network request.',
                evidence: [summarizeRequestFailure(failure)],
                hardFail: severity === 'high'
            }));
        }

        if (!Array.isArray(page.actions) || page.actions.length === 0) {
            findings.push(createFunctionalFinding({
                category: 'route_without_interactions',
                severity: 'medium',
                route: page.route,
                viewport: page.viewport,
                message: 'The functional auditor found no meaningful customer action on this route.',
                evidence: ['Add an explicit mission action or confirm this route is intentionally informational.'],
                hardFail: false
            }));
        }
    }

    return findings;
}

function collectJourneyFindings(customerJourneys = {}) {
    const findings = [];

    for (const scenario of customerJourneys.scenarios || []) {
        if (scenario.status === 'failed') {
            const failures = [];

            for (const [device, summary] of Object.entries(scenario.byDevice || {})) {
                for (const failure of summary.failures || []) {
                    failures.push(`${device}: ${failure.label || failure.id} on ${failure.route} [${failure.viewport}] ${failure.message || ''}`);
                }
            }

            findings.push(createFunctionalFinding({
                category: 'journey_failure',
                severity: 'high',
                scenarioId: scenario.id,
                persona: scenario.persona,
                message: `Customer mission "${scenario.id}" has failed evidence.`,
                evidence: failures.length > 0 ? failures : scenario.customerSignals || [],
                hardFail: true
            }));
            continue;
        }

        if (scenario.status === 'partial') {
            findings.push(createFunctionalFinding({
                category: 'journey_coverage_gap',
                severity: 'medium',
                scenarioId: scenario.id,
                persona: scenario.persona,
                message: `Customer mission "${scenario.id}" is only partially observed.`,
                evidence: [
                    scenario.intent,
                    (scenario.missingDevices || []).length > 0
                        ? `missing devices: ${scenario.missingDevices.join(', ')}`
                        : 'some required customer action did not run'
                ],
                hardFail: false
            }));
        }
    }

    return findings;
}

function formatLimit(value) {
    return Number.isFinite(value) && value < Number.MAX_SAFE_INTEGER ? String(value) : 'unlimited';
}

function summarizeCoverageProfile(coverageProfile = {}) {
    if (!coverageProfile || typeof coverageProfile !== 'object') {
        return [];
    }

    const lines = [];

    if (coverageProfile.mode) {
        lines.push(`mode: ${coverageProfile.mode}`);
    }
    if (Number.isFinite(coverageProfile.checkedRouteCount) && Number.isFinite(coverageProfile.totalPublicRoutes)) {
        lines.push(`routes: ${coverageProfile.checkedRouteCount}/${coverageProfile.totalPublicRoutes}`);
    }
    if (Number.isFinite(coverageProfile.checkedViewportCount) && Number.isFinite(coverageProfile.totalFunctionalViewports)) {
        lines.push(`viewports: ${coverageProfile.checkedViewportCount}/${coverageProfile.totalFunctionalViewports}`);
    }
    if (coverageProfile.actionCaps) {
        lines.push(`caps: links=${formatLimit(coverageProfile.actionCaps.maxLinksPerPage)}, toggleButtons=${formatLimit(coverageProfile.actionCaps.maxButtonsPerPage)}, genericButtons=${formatLimit(coverageProfile.actionCaps.maxGenericButtonsPerPage)}, summaries=${formatLimit(coverageProfile.actionCaps.maxSummariesPerPage)}, selects=${formatLimit(coverageProfile.actionCaps.maxSelectsPerPage)}, options=${formatLimit(coverageProfile.actionCaps.maxOptionsPerSelect)}`);
    }
    if (Number.isFinite(coverageProfile.truncatedTargetCount)) {
        lines.push(`truncated targets: ${coverageProfile.truncatedTargetCount}`);
    }

    return lines;
}

function collectCoverageFindings(coverageProfile = {}) {
    const findings = [];

    if (!coverageProfile || typeof coverageProfile !== 'object') {
        findings.push(createFunctionalFinding({
            category: 'audit_scope_unknown',
            severity: 'medium',
            message: 'The functional auditor did not record its coverage scope.',
            evidence: ['Without route, viewport and target limits, a clean run cannot be treated as exhaustive.'],
            hardFail: false
        }));
        return findings;
    }

    const evidence = summarizeCoverageProfile(coverageProfile);
    const mode = coverageProfile.mode || 'bounded';

    if (mode !== 'deep') {
        findings.push(createFunctionalFinding({
            category: 'bounded_audit_scope',
            severity: 'medium',
            message: 'This was not a deep functional audit, so a clean run only proves the selected scope.',
            evidence,
            hardFail: false
        }));
    }

    if (coverageProfile.allPublicRoutesChecked === false) {
        findings.push(createFunctionalFinding({
            category: 'route_coverage_gap',
            severity: 'medium',
            message: 'The functional auditor did not visit every public route in the project map.',
            evidence,
            hardFail: false
        }));
    }

    if (coverageProfile.allFunctionalViewportsChecked === false) {
        findings.push(createFunctionalFinding({
            category: 'viewport_coverage_gap',
            severity: 'medium',
            message: 'The functional auditor did not run every functional viewport band.',
            evidence,
            hardFail: false
        }));
    }

    if (Number(coverageProfile.truncatedTargetCount || 0) > 0) {
        findings.push(createFunctionalFinding({
            category: 'interaction_coverage_gap',
            severity: 'medium',
            message: 'The functional auditor found more interactive targets than it executed.',
            evidence: [
                ...evidence,
                ...(coverageProfile.truncatedPages || []).slice(0, 6).map((entry) => (
                    `${entry.route} [${entry.viewport}] skipped ${entry.truncatedTargets} target(s)`
                ))
            ],
            hardFail: false
        }));
    }

    if (mode === 'deep' && coverageProfile.allPublicRoutesChecked && coverageProfile.allFunctionalViewportsChecked && Number(coverageProfile.truncatedTargetCount || 0) === 0) {
        return [];
    }

    return findings;
}

function buildFunctionalFindings(pages = [], customerJourneys = {}, coverageProfile = {}) {
    return dedupeFunctionalFindings([
        ...collectActionFindings(pages),
        ...collectPageHealthFindings(pages),
        ...collectJourneyFindings(customerJourneys),
        ...collectCoverageFindings(coverageProfile)
    ]);
}

function summarizeFunctionalFindings(findings = []) {
    const counts = {
        total: findings.length,
        high: 0,
        medium: 0,
        low: 0,
        hardFails: 0,
        byCategory: {}
    };

    for (const finding of findings || []) {
        const severity = ['high', 'medium', 'low'].includes(finding.severity) ? finding.severity : 'medium';
        counts[severity] += 1;
        if (finding.hardFail) {
            counts.hardFails += 1;
        }
        counts.byCategory[finding.category] = (counts.byCategory[finding.category] || 0) + 1;
    }

    return counts;
}

function buildFunctionalHumanReview({ pages = [], customerJourneys = {}, coverageProfile = {} } = {}) {
    const findings = buildFunctionalFindings(pages, customerJourneys, coverageProfile);
    const summary = summarizeFunctionalFindings(findings);
    const status = summary.hardFails > 0 || summary.high > 0
        ? 'bad'
        : summary.medium > 0 || summary.low > 0
            ? 'review'
            : 'good';

    return {
        status,
        summary,
        reviewGates: uniqueValues(findings.map((finding) => finding.category)),
        coverageProfile,
        rules: FUNCTIONAL_HUMAN_REVIEW_RULES.map((rule) => rule.id),
        findings
    };
}

function buildFunctionalReviewMarkdownSection(review) {
    if (!review) {
        return ['## Human Functional Review', '', '- Not available'];
    }

    const lines = [
        '## Human Functional Review',
        '',
        `- status: ${review.status}`,
        `- findings: ${review.summary.total}`,
        `- high: ${review.summary.high}`,
        `- medium: ${review.summary.medium}`,
        `- low: ${review.summary.low}`,
        `- hard fails: ${review.summary.hardFails}`,
        `- review gates: ${(review.reviewGates || []).join(', ') || 'none'}`,
        ''
    ];

    if (review.coverageProfile) {
        lines.push('### Scope');
        summarizeCoverageProfile(review.coverageProfile).forEach((entry) => lines.push(`- ${entry}`));
        lines.push('');
    }

    if (!Array.isArray(review.findings) || review.findings.length === 0) {
        lines.push('- No human functional findings.');
        return lines;
    }

    lines.push('### Findings');

    for (const finding of review.findings.slice(0, 30)) {
        const location = finding.route
            ? `${finding.route}${finding.viewport ? ` [${finding.viewport}]` : ''}`
            : finding.scenarioId || 'global';
        lines.push('');
        lines.push(`- ${finding.severity.toUpperCase()} ${finding.category}: ${finding.message}`);
        lines.push(`  - location: ${location}`);
        if (finding.actionLabel) {
            lines.push(`  - action: ${finding.actionLabel}`);
        }
        if (finding.persona) {
            lines.push(`  - persona: ${finding.persona}`);
        }
        for (const evidence of finding.evidence || []) {
            lines.push(`  - evidence: ${evidence}`);
        }
    }

    return lines;
}

module.exports = {
    FUNCTIONAL_HUMAN_REVIEW_RULES,
    buildFunctionalFindings,
    buildFunctionalHumanReview,
    buildFunctionalReviewMarkdownSection,
    collectCoverageFindings,
    createFunctionalFinding,
    summarizeFunctionalFindings
};
