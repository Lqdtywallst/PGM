const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildHomogeneityFindings,
    compareBrandSurfaces,
    compareHeaderCtaSurface,
    compareHeaderDropdownSystems,
    compareHeaderLayout,
    compareHeaderNavigationMotion,
    compareHeaderSurface,
    compareHeaderSystems,
    compareTypographySurfaces,
    normalizeAssetPath,
    summarizeHomogeneityFindings
} = require('../../server/homogeneity-audit-core');
const {
    isHeaderGuardFinding,
    parseArgs: parseHeaderGuardArgs,
    resolveGuardRoutes,
    resolveGuardViewports,
    summarizeByCategory
} = require('../../scripts/run-header-homogeneity-guard');

const homeBrand = {
    exists: true,
    title: 'Dynasty Prestige',
    subtitle: 'Dubai Luxury Car Rental',
    logoSrc: 'https://prestigegoalmotion.com/images/dp-crest-cropped.png',
    titleFontFamily: 'Manrope, sans-serif',
    titleFontSizePx: 14,
    titleLetterSpacingPx: 1.8,
    logoRect: { width: 52, height: 52 }
};

const homeTypography = {
    heading: { exists: true, fontFamily: 'El Messiri, serif' },
    lead: { exists: true, fontFamily: 'Manrope, sans-serif' },
    body: { exists: true, fontFamily: 'Manrope, sans-serif' },
    cta: { exists: true, fontFamily: 'Manrope, sans-serif' }
};

const homeHeaderLayout = {
    exists: true,
    mode: 'desktop',
    headerHeightPx: 106,
    orderSignature: 'brand|utility|nav|reserve',
    brandToUtilityGapPx: 32,
    utilityToNavGapPx: 32,
    navToReserveGapPx: 16,
    verticalCenterSpreadPx: 2,
    horizontalOverflowPx: 0
};

const servicesHeaderLayout = {
    ...homeHeaderLayout,
    headerHeightPx: 104,
    brandToUtilityGapPx: 34,
    utilityToNavGapPx: 31,
    navToReserveGapPx: 18
};

const homeHeaderSurface = {
    exists: true,
    position: 'absolute',
    surfaceTone: 'dark-gradient',
    backgroundLuminance: 0.003,
    backgroundAlpha: 0.88,
    hasGradient: true
};

const homeHeaderDropdowns = [
    {
        exists: true,
        label: 'Cars Brands',
        panelId: 'lab-nav-brands-panel',
        surfaceTone: 'dark-gradient',
        backgroundLuminance: 0.08,
        backgroundAlpha: 0.92,
        borderRadiusPx: 20,
        minTextContrastRatio: 8.4,
        topOffsetFromHeaderPx: -30,
        panelRect: { width: 362, height: 194 },
        cardCount: 5
    }
];

const homeHeaderCta = {
    exists: true,
    text: 'Reserve',
    color: 'rgb(16, 16, 16)',
    backgroundImage: 'linear-gradient(135deg, rgb(241, 255, 157), rgb(227, 246, 85))',
    borderRadiusPx: 999,
    rect: { width: 112, height: 56 }
};

test('normalizeAssetPath compares public logo assets without host noise', () => {
    assert.equal(
        normalizeAssetPath('https://prestigegoalmotion.com/images/dp-crest-cropped.png?v=1'),
        '/images/dp-crest-cropped.png'
    );
});

test('compareBrandSurfaces flags logo asset drift inside the same brand identity', () => {
    const mismatches = compareBrandSurfaces(homeBrand, {
        ...homeBrand,
        logoSrc: '/icons/icon-192.png'
    });

    assert.equal(mismatches.length, 1);
    assert.equal(mismatches[0].field, 'logoSrc');
    assert.equal(mismatches[0].severity, 'medium');
});

test('compareHeaderSystems flags header family and nav signature drift', () => {
    const mismatches = compareHeaderSystems(
        {
            headerFamily: 'lab-header',
            headerVariant: 'lab_mega_utility',
            primaryNavSignature: 'Home|Fleet|Services|Contact'
        },
        {
            headerFamily: 'site-header',
            headerVariant: 'site_header',
            primaryNavSignature: 'Home|Fleet|Contact'
        }
    );

    assert.deepEqual(mismatches.map((entry) => entry.field), [
        'headerFamily',
        'headerVariant',
        'primaryNavSignature'
    ]);
});

test('compareHeaderLayout flags cramped header spacing against approved rhythm', () => {
    const mismatches = compareHeaderLayout(homeHeaderLayout, {
        ...homeHeaderLayout,
        brandToUtilityGapPx: 18,
        utilityToNavGapPx: 19,
        navToReserveGapPx: 8
    });

    assert.deepEqual(mismatches.map((entry) => entry.field), [
        'brandToUtilityGapPx',
        'utilityToNavGapPx',
        'navToReserveGapPx'
    ]);
    assert.equal(mismatches[0].severity, 'medium');
});

test('compareHeaderSurface flags white headers against dark approved references', () => {
    const mismatches = compareHeaderSurface(homeHeaderSurface, {
        ...homeHeaderSurface,
        position: 'sticky',
        surfaceTone: 'light',
        backgroundLuminance: 0.94,
        backgroundAlpha: 0.98,
        hasGradient: false
    });

    assert.ok(mismatches.some((entry) => entry.field === 'surfaceTone' && entry.severity === 'high'));
    assert.ok(mismatches.some((entry) => entry.field === 'backgroundLuminance' && entry.severity === 'high'));
});

test('compareHeaderSurface flags solid-to-gradient header treatment drift', () => {
    const solidHeader = {
        ...homeHeaderSurface,
        surfaceTone: 'dark',
        hasGradient: false,
        boxShadow: false
    };
    const gradientHeader = {
        ...solidHeader,
        surfaceTone: 'dark-gradient',
        hasGradient: true,
        boxShadow: true
    };

    const mismatches = compareHeaderSurface(solidHeader, gradientHeader);

    assert.ok(mismatches.some((entry) => entry.field === 'hasGradient' && entry.severity === 'medium'));
    assert.ok(mismatches.some((entry) => entry.field === 'boxShadow' && entry.severity === 'medium'));
});

test('compareHeaderDropdownSystems flags light dropdown drift against dark approved menus', () => {
    const mismatches = compareHeaderDropdownSystems(
        {
            route: '/',
            headerDropdowns: homeHeaderDropdowns
        },
        {
            route: '/lamborghini-rental-dubai.html',
            headerDropdowns: [
                {
                    ...homeHeaderDropdowns[0],
                    surfaceTone: 'light',
                    backgroundLuminance: 0.94,
                    borderRadiusPx: 12,
                    minTextContrastRatio: 2.6,
                    topOffsetFromHeaderPx: 14,
                    panelRect: { width: 362, height: 194 }
                }
            ]
        }
    );

    assert.ok(mismatches.some((entry) => entry.field === 'cars brands.surfaceTone' && entry.severity === 'high'));
    assert.ok(mismatches.some((entry) => entry.field === 'cars brands.backgroundLuminance' && entry.severity === 'high'));
    assert.ok(mismatches.some((entry) => entry.field === 'cars brands.minTextContrastRatio' && entry.severity === 'high'));
    assert.ok(mismatches.some((entry) => entry.field === 'cars brands.topOffsetFromHeaderPx'));
});

test('compareHeaderDropdownSystems flags missing shared dropdowns', () => {
    const mismatches = compareHeaderDropdownSystems(
        {
            route: '/',
            headerDropdowns: homeHeaderDropdowns
        },
        {
            route: '/fleet.html',
            headerDropdowns: []
        }
    );

    assert.equal(mismatches[0].field, 'dropdowns');
    assert.equal(mismatches[0].severity, 'high');
});

test('compareHeaderCtaSurface flags reserve button treatment drift', () => {
    const mismatches = compareHeaderCtaSurface(homeHeaderCta, {
        ...homeHeaderCta,
        backgroundImage: 'linear-gradient(135deg, rgb(239, 213, 129), rgb(214, 173, 85))',
        color: 'rgb(21, 17, 10)'
    });

    assert.ok(mismatches.some((entry) => entry.field === 'background' && entry.severity === 'high'));
    assert.ok(mismatches.some((entry) => entry.field === 'color'));
});

test('compareHeaderCtaSurface accepts matching reserve buttons', () => {
    assert.deepEqual(compareHeaderCtaSurface(homeHeaderCta, { ...homeHeaderCta }), []);
});

test('compareHeaderNavigationMotion flags visible jumps between header tabs', () => {
    const mismatches = compareHeaderNavigationMotion(
        {
            route: '/',
            headerLayout: homeHeaderLayout,
            headerBrand: homeBrand
        },
        {
            route: '/about.html',
            headerLayout: {
                ...homeHeaderLayout,
                headerHeightPx: 116,
                brandToUtilityGapPx: 162
            },
            headerBrand: {
                ...homeBrand,
                logoRect: { width: 62, height: 62 }
            }
        }
    );

    assert.ok(mismatches.some((entry) => entry.field === 'headerHeightPx'));
    assert.ok(mismatches.some((entry) => entry.field === 'logoWidthPx'));
    assert.ok(mismatches.some((entry) => entry.field === 'brandToUtilityGapPx' && entry.severity === 'high'));
});

test('compareHeaderNavigationMotion flags subtle logo and cluster shifts between public pages', () => {
    const mismatches = compareHeaderNavigationMotion(
        {
            route: '/',
            headerLayout: {
                ...homeHeaderLayout,
                headerHeightPx: 88.78,
                brandToUtilityGapPx: 20,
                utilityToNavGapPx: 20,
                navToReserveGapPx: 12
            },
            headerBrand: {
                ...homeBrand,
                logoRect: { width: 48, height: 48 }
            }
        },
        {
            route: '/app/reserve/page.html',
            headerLayout: {
                ...homeHeaderLayout,
                headerHeightPx: 88.78,
                brandToUtilityGapPx: 20,
                utilityToNavGapPx: 30,
                navToReserveGapPx: 16
            },
            headerBrand: {
                ...homeBrand,
                logoRect: { width: 42, height: 42 }
            }
        }
    );

    assert.ok(mismatches.some((entry) => entry.field === 'logoWidthPx'));
    assert.ok(mismatches.some((entry) => entry.field === 'utilityToNavGapPx'));
});

test('compareTypographySurfaces flags text font family drift', () => {
    const mismatches = compareTypographySurfaces(homeTypography, {
        heading: { exists: true, fontFamily: 'Cormorant Garamond, serif' },
        lead: { exists: true, fontFamily: 'Montserrat, sans-serif' },
        body: { exists: true, fontFamily: 'Inter, sans-serif' },
        cta: { exists: true, fontFamily: 'Manrope, sans-serif' }
    });

    assert.deepEqual(mismatches.map((entry) => entry.field), [
        'headingFontFamily',
        'leadFontFamily',
        'bodyFontFamily'
    ]);
    assert.equal(mismatches[0].severity, 'high');
});

test('buildHomogeneityFindings catches mobile drawer brand drift against page header', () => {
    const findings = buildHomogeneityFindings([
        {
            route: '/',
            viewport: 'mobile-modern',
            headerFamily: 'lab-header',
            headerVariant: 'lab_mega',
            primaryNavSignature: '',
            headerBrand: homeBrand,
            typography: homeTypography,
            typographyInventory: {
                uniqueFontFamilies: ['el messiri', 'manrope']
            },
            drawerBrand: {
                ...homeBrand,
                logoSrc: '/icons/icon-192.png'
            },
            drawerScreenshotPath: '/tmp/drawer.png'
        }
    ]);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].category, 'drawer_brand_drift');
    assert.match(findings[0].evidence, /logoSrc/);
});

test('buildHomogeneityFindings catches typography drift against home', () => {
    const findings = buildHomogeneityFindings([
        {
            route: '/',
            viewport: 'desktop-wide',
            headerFamily: 'lab-header',
            headerVariant: 'lab_mega_utility',
            primaryNavSignature: 'Home|Fleet',
            headerBrand: homeBrand,
            typography: homeTypography,
            typographyInventory: {
                uniqueFontFamilies: ['el messiri', 'manrope']
            }
        },
        {
            route: '/fleet.html',
            viewport: 'desktop-wide',
            headerFamily: 'lab-header',
            headerVariant: 'lab_mega_utility',
            primaryNavSignature: 'Home|Fleet',
            headerBrand: homeBrand,
            typography: {
                heading: { exists: true, fontFamily: 'Cormorant Garamond, serif' },
                lead: { exists: true, fontFamily: 'Montserrat, sans-serif' },
                body: { exists: true, fontFamily: 'Inter, sans-serif' },
                cta: { exists: true, fontFamily: 'Montserrat, sans-serif' }
            },
            typographyInventory: {
                uniqueFontFamilies: ['cormorant garamond', 'montserrat', 'inter']
            }
        }
    ]);

    assert.ok(findings.some((finding) => finding.category === 'typography_system_drift'));
    assert.ok(findings.some((finding) => finding.category === 'typography_sprawl'));
});

test('buildHomogeneityFindings uses home and services as approved header references', () => {
    const sharedPage = {
        headerFamily: 'lab-header',
        headerVariant: 'lab_mega_utility',
        primaryNavSignature: 'Home|Fleet|Services|Contact',
        headerBrand: homeBrand,
        typography: homeTypography,
        typographyInventory: {
            uniqueFontFamilies: ['el messiri', 'manrope']
        }
    };
    const findings = buildHomogeneityFindings([
        {
            ...sharedPage,
            route: '/',
            viewport: 'desktop-wide',
            headerLayout: homeHeaderLayout,
            headerSurface: homeHeaderSurface,
            headerCta: homeHeaderCta,
            headerDropdowns: homeHeaderDropdowns
        },
        {
            ...sharedPage,
            route: '/services.html',
            viewport: 'desktop-wide',
            headerLayout: servicesHeaderLayout,
            headerSurface: {
                ...homeHeaderSurface,
                position: 'sticky'
            },
            headerCta: homeHeaderCta,
            headerDropdowns: homeHeaderDropdowns
        },
        {
            ...sharedPage,
            route: '/lamborghini-rental-dubai.html',
            viewport: 'desktop-wide',
            headerLayout: {
                ...homeHeaderLayout,
                headerHeightPx: 94,
                brandToUtilityGapPx: 18,
                utilityToNavGapPx: 18,
                navToReserveGapPx: 7
            },
            headerBrand: {
                ...homeBrand,
                logoRect: { width: 62, height: 62 }
            },
            headerSurface: {
                ...homeHeaderSurface,
                surfaceTone: 'light',
                backgroundLuminance: 0.91,
                hasGradient: false
            },
            headerCta: {
                ...homeHeaderCta,
                backgroundImage: 'linear-gradient(135deg, rgb(239, 213, 129), rgb(214, 173, 85))'
            },
            headerDropdowns: [
                {
                    ...homeHeaderDropdowns[0],
                    surfaceTone: 'light',
                    backgroundLuminance: 0.92,
                    minTextContrastRatio: 2.8,
                    topOffsetFromHeaderPx: 18
                }
            ]
        }
    ]);

    assert.equal(
        findings.some((finding) => finding.route === '/services.html' && finding.category === 'header_layout_drift'),
        false
    );
    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'header_layout_drift'));
    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'header_surface_drift'));
    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'header_navigation_shift'));
    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'header_cta_drift'));
    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'header_dropdown_drift'));
});

test('summarizeHomogeneityFindings groups severity counts', () => {
    const summary = summarizeHomogeneityFindings([
        { severity: 'high', category: 'header_identity_drift' },
        { severity: 'medium', category: 'drawer_brand_drift' },
        { severity: 'medium', category: 'drawer_brand_drift' }
    ]);

    assert.equal(summary.total, 3);
    assert.equal(summary.high, 1);
    assert.equal(summary.medium, 2);
    assert.equal(summary.byCategory.drawer_brand_drift, 2);
});

test('header homogeneity guard defaults to template routes and header viewports', () => {
    const args = parseHeaderGuardArgs([]);

    assert.ok(resolveGuardRoutes(args).includes('/lamborghini-rental-dubai.html'));
    assert.ok(resolveGuardRoutes(args).includes('/app/reserve/page.html'));
    assert.deepEqual(resolveGuardViewports(args), [
        'desktop-wide',
        'desktop-standard',
        'laptop',
        'tablet-portrait',
        'mobile-modern'
    ]);
});

test('header homogeneity guard can run exhaustive page coverage', () => {
    const args = parseHeaderGuardArgs(['--all', '--viewport', 'mobile-modern']);
    const routes = resolveGuardRoutes(args);

    assert.ok(routes.includes('/'));
    assert.ok(routes.includes('/terms-and-conditions.html'));
    assert.ok(routes.includes('/lamborghini-huracan-evo-spyder-rental-dubai.html'));
    assert.deepEqual(resolveGuardViewports(args), ['mobile-modern']);
    assert.deepEqual(summarizeByCategory([
        { category: 'header_navigation_shift' },
        { category: 'header_navigation_shift' },
        { category: 'header_surface_drift' }
    ]), {
        header_navigation_shift: 2,
        header_surface_drift: 1
    });
});

test('header homogeneity guard includes interactive dropdown drift', () => {
    assert.equal(isHeaderGuardFinding({ area: 'header' }), true);
    assert.equal(isHeaderGuardFinding({ area: 'header_cta' }), true);
    assert.equal(isHeaderGuardFinding({ area: 'header_dropdown' }), true);
    assert.equal(isHeaderGuardFinding({ area: 'typography' }), false);
});
