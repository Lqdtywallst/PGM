const CUSTOMER_JOURNEY_SCENARIOS = Object.freeze([
    Object.freeze({
        id: 'desktop_navigation_confidence',
        persona: 'First-time premium guest',
        intent: 'Explore the main site structure before choosing a car.',
        deviceTargets: Object.freeze(['desktop']),
        routes: Object.freeze(['/']),
        actionIds: Object.freeze(['home-top-nav', 'home-mega-menu']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/navigation.spec.js',
            'tests/e2e/public-site.spec.js',
            'tests/e2e/customer-journeys.spec.js'
        ]),
        customerSignals: Object.freeze([
            'main navigation keeps the guest oriented',
            'Cars Brands mega menu exposes enough choices',
            'destination pages open with visible headings'
        ])
    }),
    Object.freeze({
        id: 'mobile_navigation_confidence',
        persona: 'Mobile guest navigating from any critical screen',
        intent: 'Open the mobile menu without losing orientation or blocking the current task.',
        deviceTargets: Object.freeze(['mobile']),
        routes: Object.freeze(['/', '/fleet.html', '/contact.html', '/app/reserve/page.html']),
        actionIds: Object.freeze(['toggle-open-navigation-lab-mobile-drawer']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/public-site.spec.js',
            'tests/e2e/responsive-audit.spec.js',
            'tests/e2e/mobile-journeys.spec.js'
        ]),
        customerSignals: Object.freeze([
            'hamburger opens the drawer visibly',
            'mobile nav remains reachable from booking pages',
            'drawer state does not hide the current task permanently'
        ])
    }),
    Object.freeze({
        id: 'home_to_fleet_schedule',
        persona: 'Guest arriving with fixed rental dates',
        intent: 'Start from the home booking entry and carry dates into fleet.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/']),
        actionIds: Object.freeze(['home-overlay-search']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/audit-functional-surfaces.spec.js',
            'tests/e2e/audit-customer-complete-flows.spec.js',
            'tests/e2e/mobile-journeys.spec.js'
        ]),
        customerSignals: Object.freeze([
            'date and time choices survive navigation',
            'fleet opens directly from the booking intent',
            'mobile overlay remains usable'
        ])
    }),
    Object.freeze({
        id: 'home_to_fleet_availability',
        persona: 'Guest checking dates before choosing a car',
        intent: 'Start from the home booking bar and see CRM-backed fleet availability before reserving.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/']),
        actionIds: Object.freeze(['home-booking-bar-availability']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/public-site.spec.js',
            'tests/e2e/audit-functional-surfaces.spec.js'
        ]),
        customerSignals: Object.freeze([
            'home date and time choices survive navigation',
            'fleet requests /api/availability for the selected schedule',
            'unavailable CRM cars render unavailable and disable Reserve'
        ])
    }),
    Object.freeze({
        id: 'home_category_to_filtered_fleet',
        persona: 'Guest choosing a car category from home',
        intent: 'Open Fleet from a home category card with the matching type filter and the active schedule.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/']),
        actionIds: Object.freeze(['home-category-filter']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/public-site.spec.js',
            'tests/e2e/audit-functional-surfaces.spec.js'
        ]),
        customerSignals: Object.freeze([
            'home category clicks add the expected fleet type filter',
            'only matching category cards remain visible',
            'reserve CTAs keep the selected home schedule'
        ])
    }),
    Object.freeze({
        id: 'cars_types_menu_to_filtered_fleet',
        persona: 'Guest browsing the Cars Types navigation tab',
        intent: 'Open each Cars Types card into Fleet with a matching non-empty type filter.',
        deviceTargets: Object.freeze(['desktop']),
        routes: Object.freeze(['/']),
        actionIds: Object.freeze(['home-cars-types-filter-menu']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/customer-journeys.spec.js'
        ]),
        customerSignals: Object.freeze([
            'Cars Types cards open Fleet with the matching type query',
            'each advertised type has real visible inventory',
            'categories without fleet inventory are not exposed'
        ])
    }),
    Object.freeze({
        id: 'home_featured_vehicle_to_landing',
        persona: 'Guest attracted by one featured home car',
        intent: 'Open the exact vehicle landing from a featured home car.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/']),
        actionIds: Object.freeze(['home-featured-vehicle-landing']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/public-site.spec.js',
            'tests/e2e/audit-functional-surfaces.spec.js'
        ]),
        customerSignals: Object.freeze([
            'featured car clicks open the matching vehicle landing',
            'the landing heading matches the clicked car',
            'the vehicle booking panel remains immediately reachable'
        ])
    }),
    Object.freeze({
        id: 'fleet_shortlist_and_handoff',
        persona: 'Guest comparing several car families',
        intent: 'Filter the fleet, shortlist a model, and open reserve with the same schedule.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/fleet.html']),
        actionIds: Object.freeze(['fleet-filter-cycle', 'fleet-reserve-first-visible', 'fleet-all-cars-checkout']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/customer-journeys.spec.js',
            'tests/e2e/audit-functional-surfaces.spec.js',
            'tests/e2e/mobile-friction-points.spec.js',
            'tests/e2e/mobile-journeys.spec.js',
            'tests/e2e/switch-car-mid-flow.spec.js'
        ]),
        customerSignals: Object.freeze([
            'brand filters never leave the guest with an empty useful result',
            'visible reserve CTAs keep the active schedule',
            'every fleet model can complete a mocked checkout from its Reserve CTA',
            'back navigation and car switching do not carry stale state'
        ])
    }),
    Object.freeze({
        id: 'mobile_fleet_filter_sheet',
        persona: 'Mobile guest filtering with one hand',
        intent: 'Use dates, filters, reset, and reserve from a cramped phone viewport.',
        deviceTargets: Object.freeze(['mobile']),
        routes: Object.freeze(['/fleet.html']),
        actionIds: Object.freeze(['fleet-filter-cycle', 'fleet-reset-filters', 'fleet-mobile-filter-sheet', 'fleet-reserve-first-visible']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/mobile-friction-points.spec.js',
            'tests/e2e/responsive-audit.spec.js'
        ]),
        customerSignals: Object.freeze([
            'filled dates remain readable',
            'filters remain tappable',
            'short mobile screens do not clip useful controls'
        ])
    }),
    Object.freeze({
        id: 'contact_support_lead',
        persona: 'Guest who wants concierge help before booking',
        intent: 'Submit a realistic contact lead and recover from validation/backend states.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/contact.html']),
        actionIds: Object.freeze(['contact-required-validation', 'contact-submit']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/audit-customer-complete-flows.spec.js',
            'tests/e2e/audit-functional-surfaces.spec.js',
            'tests/e2e/functional-resilience.spec.js',
            'tests/e2e/api-failure-states.spec.js'
        ]),
        customerSignals: Object.freeze([
            'required fields block incomplete leads',
            'valid lead reaches the success state',
            'typed values survive transient backend failure'
        ])
    }),
    Object.freeze({
        id: 'brand_to_vehicle_booking',
        persona: 'Guest choosing from a specific luxury brand',
        intent: 'Move from SEO brand landing to model/detail and carry dates into reserve.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze([
            '/lamborghini-rental-dubai.html',
            '/mercedes-rental-dubai.html',
            '/mercedes-g63-amg-rental-dubai.html'
        ]),
        actionIds: Object.freeze(['vehicle-booking-submit']),
        actionPrefixes: Object.freeze(['model-card-book-', 'model-card-detail-']),
        e2eSpecs: Object.freeze([
            'tests/e2e/customer-journeys.spec.js',
            'tests/e2e/visual-first-viewport.spec.js'
        ]),
        customerSignals: Object.freeze([
            'model cards open the intended car',
            'vehicle booking forms preserve schedule',
            'SEO landings remain connected to reserve'
        ])
    }),
    Object.freeze({
        id: 'services_to_reserve_concierge',
        persona: 'Guest buying an airport, chauffeur, or monthly service',
        intent: 'Understand a service, follow the correct CTA, and reach a usable reserve flow.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/services.html', '/airport-concierge-dubai.html', '/monthly-luxury-car-rental-dubai.html']),
        actionIds: Object.freeze([]),
        actionPrefixes: Object.freeze(['link-', 'toggle-']),
        e2eSpecs: Object.freeze([
            'tests/e2e/services-deep-links.spec.js',
            'tests/e2e/services-to-reserve-funnels.spec.js'
        ]),
        customerSignals: Object.freeze([
            'service cards/tabs lead to distinct destinations',
            'service detail pages keep reserve/contact routes reachable',
            'monthly service can route through fleet into a concrete car'
        ])
    }),
    Object.freeze({
        id: 'reserve_validation_and_recovery',
        persona: 'Guest correcting schedule or personal-detail mistakes',
        intent: 'See clear validation, keep progress, and recover without losing typed data.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/app/reserve/page.html']),
        actionIds: Object.freeze(['reserve-step1-validation', 'reserve-step2-invalid-schedule']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/reserve-negative.spec.js',
            'tests/e2e/reserve-persistence.spec.js',
            'tests/e2e/functional-resilience.spec.js',
            'tests/e2e/mobile-friction-points.spec.js'
        ]),
        customerSignals: Object.freeze([
            'incomplete delivery details keep the next CTA disabled',
            'invalid return times produce clear feedback',
            'reloads do not destroy guest progress'
        ])
    }),
    Object.freeze({
        id: 'reserve_mocked_checkout',
        persona: 'Ready-to-book guest',
        intent: 'Complete the reserve flow through mocked payment and success redirect.',
        deviceTargets: Object.freeze(['desktop', 'mobile']),
        routes: Object.freeze(['/app/reserve/page.html']),
        actionIds: Object.freeze(['reserve-complete-checkout']),
        actionPrefixes: Object.freeze([]),
        e2eSpecs: Object.freeze([
            'tests/e2e/customer-journeys.spec.js',
            'tests/e2e/audit-customer-complete-flows.spec.js',
            'tests/e2e/mobile-journeys.spec.js',
            'tests/e2e/complete-flow-error-recovery.spec.js'
        ]),
        customerSignals: Object.freeze([
            'guest details reach the payment step',
            'mocked Stripe state mounts correctly',
            'success flow redirects cleanly'
        ])
    })
]);

function deviceFamilyForViewport(viewportName = '') {
    const normalized = String(viewportName || '').toLowerCase();

    if (normalized.startsWith('mobile')) {
        return 'mobile';
    }

    if (normalized.startsWith('tablet')) {
        return 'tablet';
    }

    if (normalized.startsWith('laptop') || normalized.startsWith('desktop')) {
        return 'desktop';
    }

    return 'unknown';
}

function actionMatchesScenario(actionId = '', scenario) {
    const normalizedActionId = String(actionId || '');

    return (scenario.actionIds || []).includes(normalizedActionId) ||
        (scenario.actionPrefixes || []).some((prefix) => normalizedActionId.startsWith(prefix));
}

function routeMatchesScenario(route = '', scenario) {
    const normalizedRoute = String(route || '').split(/[?#]/)[0] || '/';
    return (scenario.routes || []).includes(normalizedRoute);
}

function buildCustomerJourneyCoverage(pages = []) {
    const actions = [];

    for (const page of pages || []) {
        const deviceFamily = deviceFamilyForViewport(page.viewport);

        for (const action of page.actions || []) {
            actions.push({
                route: page.route,
                viewport: page.viewport,
                deviceFamily,
                ...action
            });
        }
    }

    const scenarios = CUSTOMER_JOURNEY_SCENARIOS.map((scenario) => {
        const matchedActions = actions.filter((action) => (
            routeMatchesScenario(action.route, scenario) &&
            actionMatchesScenario(action.id, scenario)
        ));
        const byDevice = {};

        for (const deviceTarget of scenario.deviceTargets || []) {
            const deviceActions = matchedActions.filter((action) => action.deviceFamily === deviceTarget);
            byDevice[deviceTarget] = {
                actionsRun: deviceActions.length,
                passed: deviceActions.filter((action) => action.status === 'passed').length,
                failed: deviceActions.filter((action) => action.status === 'failed').length,
                skipped: deviceActions.filter((action) => action.status === 'skipped').length,
                failures: deviceActions
                    .filter((action) => action.status === 'failed')
                    .slice(0, 6)
                    .map((action) => ({
                        id: action.id,
                        label: action.label,
                        route: action.route,
                        viewport: action.viewport,
                        message: action.message,
                        screenshotPath: action.screenshotPath || ''
                    }))
            };
        }

        const failed = Object.values(byDevice).some((device) => device.failed > 0);
        const missingDevices = (scenario.deviceTargets || []).filter((deviceTarget) => (
            !byDevice[deviceTarget] || byDevice[deviceTarget].actionsRun === 0
        ));
        const status = failed
            ? 'failed'
            : missingDevices.length > 0
                ? 'partial'
                : 'covered';

        return {
            id: scenario.id,
            persona: scenario.persona,
            intent: scenario.intent,
            deviceTargets: [...scenario.deviceTargets],
            routes: [...scenario.routes],
            e2eSpecs: [...scenario.e2eSpecs],
            customerSignals: [...scenario.customerSignals],
            status,
            matchedActionCount: matchedActions.length,
            byDevice,
            missingDevices
        };
    });

    return {
        summary: {
            totalScenarios: scenarios.length,
            covered: scenarios.filter((scenario) => scenario.status === 'covered').length,
            partial: scenarios.filter((scenario) => scenario.status === 'partial').length,
            failed: scenarios.filter((scenario) => scenario.status === 'failed').length
        },
        scenarios
    };
}

function buildCustomerJourneyMarkdownSection(coverage) {
    if (!coverage || !Array.isArray(coverage.scenarios)) {
        return ['## Customer Journey Coverage', '', '- Not available'];
    }

    const lines = [
        '## Customer Journey Coverage',
        '',
        `- scenarios: ${coverage.summary.totalScenarios}`,
        `- covered: ${coverage.summary.covered}`,
        `- partial: ${coverage.summary.partial}`,
        `- failed: ${coverage.summary.failed}`
    ];

    for (const scenario of coverage.scenarios) {
        lines.push('');
        lines.push(`### ${scenario.id}`);
        lines.push('');
        lines.push(`- persona: ${scenario.persona}`);
        lines.push(`- intent: ${scenario.intent}`);
        lines.push(`- status: ${scenario.status}`);
        lines.push(`- target devices: ${scenario.deviceTargets.join(', ')}`);
        lines.push(`- routes: ${scenario.routes.join(', ')}`);
        lines.push(`- customer signals: ${scenario.customerSignals.join('; ')}`);

        for (const [device, summary] of Object.entries(scenario.byDevice || {})) {
            lines.push(`- ${device}: ${summary.passed} passed / ${summary.failed} failed / ${summary.skipped} skipped (${summary.actionsRun} actions)`);
            for (const failure of summary.failures || []) {
                lines.push(`  - failed ${failure.id} on ${failure.route} [${failure.viewport}]: ${failure.message.split('\n')[0]}`);
                if (failure.screenshotPath) {
                    lines.push(`    - screenshot: ${failure.screenshotPath}`);
                }
            }
        }

        if ((scenario.missingDevices || []).length > 0) {
            lines.push(`- missing devices in this run: ${scenario.missingDevices.join(', ')}`);
        }
    }

    return lines;
}

module.exports = {
    CUSTOMER_JOURNEY_SCENARIOS,
    actionMatchesScenario,
    buildCustomerJourneyCoverage,
    buildCustomerJourneyMarkdownSection,
    deviceFamilyForViewport,
    routeMatchesScenario
};
