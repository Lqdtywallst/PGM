const test = require('node:test');
const assert = require('node:assert/strict');

const {
    CUSTOMER_JOURNEY_SCENARIOS,
    actionMatchesScenario,
    buildCustomerJourneyCoverage,
    buildCustomerJourneyMarkdownSection,
    deviceFamilyForViewport,
    routeMatchesScenario
} = require('../../server/audits/customer-journey-contract');
const {
    DEFAULT_ROUTES,
    DEFAULT_VIEWPORTS,
    parseArgs
} = require('../../scripts/audits/run-customer-journey-audit');

test('customer journey catalog covers desktop and mobile customer intent', () => {
    const ids = CUSTOMER_JOURNEY_SCENARIOS.map((scenario) => scenario.id);

    assert.ok(ids.includes('home_to_fleet_schedule'));
    assert.ok(ids.includes('home_to_fleet_availability'));
    assert.ok(ids.includes('home_category_to_filtered_fleet'));
    assert.ok(ids.includes('cars_types_menu_to_filtered_fleet'));
    assert.ok(ids.includes('home_featured_vehicle_to_landing'));
    assert.ok(ids.includes('mobile_navigation_confidence'));
    assert.ok(ids.includes('fleet_shortlist_and_handoff'));
    assert.ok(ids.includes('contact_support_lead'));
    assert.ok(ids.includes('reserve_mocked_checkout'));
    assert.ok(CUSTOMER_JOURNEY_SCENARIOS.some((scenario) => scenario.deviceTargets.includes('mobile')));
    assert.ok(CUSTOMER_JOURNEY_SCENARIOS.some((scenario) => scenario.deviceTargets.includes('desktop')));
});

test('deviceFamilyForViewport groups customer devices by mobile and computer', () => {
    assert.equal(deviceFamilyForViewport('mobile-modern'), 'mobile');
    assert.equal(deviceFamilyForViewport('mobile-short'), 'mobile');
    assert.equal(deviceFamilyForViewport('laptop'), 'desktop');
    assert.equal(deviceFamilyForViewport('desktop-wide'), 'desktop');
    assert.equal(deviceFamilyForViewport('tablet-portrait'), 'tablet');
});

test('actionMatchesScenario supports exact and dynamic action ids', () => {
    const brandScenario = CUSTOMER_JOURNEY_SCENARIOS.find((scenario) => scenario.id === 'brand_to_vehicle_booking');
    const contactScenario = CUSTOMER_JOURNEY_SCENARIOS.find((scenario) => scenario.id === 'contact_support_lead');
    const availabilityScenario = CUSTOMER_JOURNEY_SCENARIOS.find((scenario) => scenario.id === 'home_to_fleet_availability');
    const categoryScenario = CUSTOMER_JOURNEY_SCENARIOS.find((scenario) => scenario.id === 'home_category_to_filtered_fleet');
    const carsTypesScenario = CUSTOMER_JOURNEY_SCENARIOS.find((scenario) => scenario.id === 'cars_types_menu_to_filtered_fleet');
    const featuredVehicleScenario = CUSTOMER_JOURNEY_SCENARIOS.find((scenario) => scenario.id === 'home_featured_vehicle_to_landing');

    assert.equal(actionMatchesScenario('model-card-book-1', brandScenario), true);
    assert.equal(actionMatchesScenario('vehicle-booking-submit', brandScenario), true);
    assert.equal(actionMatchesScenario('contact-submit', contactScenario), true);
    assert.equal(actionMatchesScenario('fleet-filter-cycle', contactScenario), false);
    assert.equal(actionMatchesScenario('home-booking-bar-availability', availabilityScenario), true);
    assert.equal(actionMatchesScenario('home-overlay-search', availabilityScenario), false);
    assert.equal(actionMatchesScenario('home-category-filter', categoryScenario), true);
    assert.equal(actionMatchesScenario('home-cars-types-filter-menu', carsTypesScenario), true);
    assert.equal(actionMatchesScenario('home-featured-vehicle-landing', featuredVehicleScenario), true);
});

test('routeMatchesScenario keeps generic link actions inside the right customer story', () => {
    const servicesScenario = CUSTOMER_JOURNEY_SCENARIOS.find((scenario) => scenario.id === 'services_to_reserve_concierge');

    assert.equal(routeMatchesScenario('/services.html', servicesScenario), true);
    assert.equal(routeMatchesScenario('/contact.html', servicesScenario), false);
});

test('buildCustomerJourneyCoverage reports passed, failed and missing device coverage', () => {
    const coverage = buildCustomerJourneyCoverage([
        {
            route: '/',
            viewport: 'laptop',
            actions: [
                { id: 'home-overlay-search', label: 'Home booking overlay submits into fleet', status: 'passed' }
            ]
        },
        {
            route: '/contact.html',
            viewport: 'mobile-modern',
            actions: [
                { id: 'contact-submit', label: 'Contact form submits with demo lead', status: 'failed', message: 'API error', screenshotPath: '/tmp/contact.png' }
            ]
        }
    ]);
    const homeScenario = coverage.scenarios.find((scenario) => scenario.id === 'home_to_fleet_schedule');
    const contactScenario = coverage.scenarios.find((scenario) => scenario.id === 'contact_support_lead');

    assert.equal(homeScenario.status, 'partial');
    assert.deepEqual(homeScenario.missingDevices, ['mobile']);
    assert.equal(homeScenario.byDevice.desktop.passed, 1);
    assert.equal(contactScenario.status, 'failed');
    assert.equal(contactScenario.byDevice.mobile.failed, 1);
});

test('home handoff scenarios require availability, category and vehicle landing evidence', () => {
    const coverage = buildCustomerJourneyCoverage([
        {
            route: '/',
            viewport: 'laptop',
            actions: [
                { id: 'home-booking-bar-availability', label: 'Home availability', status: 'passed' },
                { id: 'home-category-filter', label: 'Home category filter', status: 'passed' },
                { id: 'home-cars-types-filter-menu', label: 'Cars Types filter menu', status: 'passed' },
                { id: 'home-featured-vehicle-landing', label: 'Home featured vehicle landing', status: 'passed' }
            ]
        }
    ]);
    const availabilityScenario = coverage.scenarios.find((scenario) => scenario.id === 'home_to_fleet_availability');
    const categoryScenario = coverage.scenarios.find((scenario) => scenario.id === 'home_category_to_filtered_fleet');
    const carsTypesScenario = coverage.scenarios.find((scenario) => scenario.id === 'cars_types_menu_to_filtered_fleet');
    const featuredVehicleScenario = coverage.scenarios.find((scenario) => scenario.id === 'home_featured_vehicle_to_landing');

    assert.equal(availabilityScenario.status, 'partial');
    assert.deepEqual(availabilityScenario.missingDevices, ['mobile']);
    assert.equal(availabilityScenario.byDevice.desktop.passed, 1);
    assert.equal(categoryScenario.byDevice.desktop.passed, 1);
    assert.equal(carsTypesScenario.status, 'covered');
    assert.equal(carsTypesScenario.byDevice.desktop.passed, 1);
    assert.equal(featuredVehicleScenario.byDevice.desktop.passed, 1);
});

test('buildCustomerJourneyCoverage does not count contact links as services journeys', () => {
    const coverage = buildCustomerJourneyCoverage([
        {
            route: '/contact.html',
            viewport: 'laptop',
            actions: [
                { id: 'link-services-services-html', label: 'Link: Services', status: 'passed' }
            ]
        }
    ]);
    const servicesScenario = coverage.scenarios.find((scenario) => scenario.id === 'services_to_reserve_concierge');

    assert.equal(servicesScenario.status, 'partial');
    assert.equal(servicesScenario.byDevice.desktop.actionsRun, 0);
});

test('mobile navigation confidence maps hamburger failures into a customer scenario', () => {
    const coverage = buildCustomerJourneyCoverage([
        {
            route: '/app/reserve/page.html',
            viewport: 'mobile-modern',
            actions: [
                {
                    id: 'toggle-open-navigation-lab-mobile-drawer',
                    label: 'Toggle: Open navigation',
                    status: 'failed',
                    message: 'Drawer did not open',
                    screenshotPath: '/tmp/mobile-nav.png'
                }
            ]
        }
    ]);
    const scenario = coverage.scenarios.find((entry) => entry.id === 'mobile_navigation_confidence');

    assert.equal(scenario.status, 'failed');
    assert.equal(scenario.byDevice.mobile.failed, 1);
    assert.equal(scenario.byDevice.mobile.failures[0].route, '/app/reserve/page.html');
});

test('buildCustomerJourneyMarkdownSection renders scenario evidence', () => {
    const coverage = buildCustomerJourneyCoverage([
        {
            route: '/fleet.html',
            viewport: 'mobile-modern',
            actions: [
                { id: 'fleet-filter-cycle', label: 'Fleet filters', status: 'passed' }
            ]
        }
    ]);
    const lines = buildCustomerJourneyMarkdownSection(coverage).join('\n');

    assert.match(lines, /Customer Journey Coverage/);
    assert.match(lines, /fleet_shortlist_and_handoff/);
    assert.match(lines, /mobile/);
});

test('customer journey audit defaults to client-critical routes and mobile plus computer viewports', () => {
    assert.ok(DEFAULT_ROUTES.includes('/'));
    assert.ok(DEFAULT_ROUTES.includes('/fleet.html'));
    assert.ok(DEFAULT_ROUTES.includes('/contact.html'));
    assert.ok(DEFAULT_ROUTES.includes('/app/reserve/page.html'));
    assert.deepEqual(DEFAULT_VIEWPORTS, ['mobile-modern', 'laptop']);

    const args = parseArgs(['--route', '/fleet.html', '--viewport', 'laptop']);
    assert.deepEqual(args.routes, ['/fleet.html']);
    assert.deepEqual(args.viewports, ['laptop']);
});
