const os = require('os');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { PNG } = require('pngjs');
const {
    getFirstViewportContract,
    resolveViewportTier
} = require('../../server/design-system-contract');

const {
    approveBaselinesFromRun,
    buildCohortFindings,
    buildDesignSystemFindings,
    buildDeterministicFindings,
    buildServiceInteractionFindings,
    buildMarkdownReport,
    buildProfileReferenceFindings,
    buildSurfaceFindings,
    buildTemplateFamilyFindings,
    comparePngFiles,
    parseArgs,
    routeFileStem
} = require('../../scripts/run-visual-agent');

test('resolveViewportTier separates mobile, laptop and desktop policies', () => {
    assert.equal(resolveViewportTier('mobile-modern', 390), 'mobile');
    assert.equal(resolveViewportTier('laptop', 1366), 'laptop');
    assert.equal(resolveViewportTier('desktop-wide', 1707), 'desktop');
});

test('getFirstViewportContract keeps desktop locked while mobile stays in research mode', () => {
    const servicesDesktop = getFirstViewportContract({
        route: '/services.html',
        cohort: 'hub_marketing',
        viewportName: 'desktop-wide',
        viewportWidth: 1707
    });
    const servicesMobile = getFirstViewportContract({
        route: '/services.html',
        cohort: 'hub_marketing',
        viewportName: 'mobile-modern',
        viewportWidth: 390
    });

    assert.equal(servicesDesktop.policy, 'locked');
    assert.equal(servicesDesktop.check, 'service_tabs_split');
    assert.equal(servicesMobile.policy, 'research');
    assert.equal('check' in servicesMobile, false);
});

test('getFirstViewportContract resolves split rules for brand landings on desktop', () => {
    const brandDesktop = getFirstViewportContract({
        route: '/lamborghini-rental-dubai.html',
        cohort: 'brand_landing',
        viewportName: 'desktop-wide',
        viewportWidth: 1707
    });

    assert.equal(brandDesktop.policy, 'locked');
    assert.equal(brandDesktop.check, 'hero_support_split');
    assert.equal(brandDesktop.maxPrimaryCtaTopRatio, 0.88);
});

test('getFirstViewportContract allows a fuller home panel when the main CTA stays visible', () => {
    const homeLaptop = getFirstViewportContract({
        route: '/',
        cohort: 'home',
        viewportName: 'laptop',
        viewportWidth: 1366
    });

    assert.equal(homeLaptop.policy, 'locked');
    assert.equal(homeLaptop.check, 'single_panel_fill');
    assert.equal(homeLaptop.maxPrimaryBottomRatio, 0.95);
    assert.equal(homeLaptop.maxPrimaryCtaTopRatio, 0.82);
});

function writeSolidPng(filePath, color) {
    const png = new PNG({ width: 4, height: 4 });

    for (let index = 0; index < png.data.length; index += 4) {
        png.data[index] = color[0];
        png.data[index + 1] = color[1];
        png.data[index + 2] = color[2];
        png.data[index + 3] = 255;
    }

    fs.writeFileSync(filePath, PNG.sync.write(png));
}

test('parseArgs reads route, base URL, and baseline update flags', () => {
    const args = parseArgs([
        '--route', '/fleet.html',
        '--base-url', 'http://127.0.0.1:9999',
        '--scope', 'all-public',
        '--no-fleet-clicks',
        '--update-baselines',
        '--approve-cohort', 'brand_landing',
        '--approve-viewport', 'desktop-wide'
    ]);

    assert.deepEqual(args.routes, ['/fleet.html']);
    assert.equal(args.baseUrl, 'http://127.0.0.1:9999');
    assert.equal(args.scope, 'all-public');
    assert.equal(args.includeFleetClicks, false);
    assert.equal(args.updateBaselines, true);
    assert.deepEqual(args.approveCohorts, ['brand_landing']);
    assert.deepEqual(args.approveViewports, ['desktop-wide']);
});

test('routeFileStem creates stable filesystem-safe names', () => {
    assert.equal(routeFileStem('/'), 'home');
    assert.equal(routeFileStem('/app/reserve/page.html'), 'app-reserve-page-html');
    assert.equal(routeFileStem('/ferrari-296-gts-rental-dubai.html'), 'ferrari-296-gts-rental-dubai-html');
});

test('comparePngFiles passes identical images and flags meaningful diffs', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-agent-runner-'));
    const baselinePath = path.join(tempDir, 'baseline.png');
    const currentPath = path.join(tempDir, 'current.png');
    const changedPath = path.join(tempDir, 'changed.png');
    const diffPath = path.join(tempDir, 'diff.png');

    writeSolidPng(baselinePath, [20, 20, 20]);
    writeSolidPng(currentPath, [20, 20, 20]);
    writeSolidPng(changedPath, [240, 20, 20]);

    const passing = comparePngFiles({
        currentPath,
        baselinePath,
        diffPath,
        threshold: 0.015,
        kind: 'viewport'
    });
    const failing = comparePngFiles({
        currentPath: changedPath,
        baselinePath,
        diffPath,
        threshold: 0.015,
        kind: 'viewport'
    });

    assert.equal(passing.status, 'pass');
    assert.equal(failing.status, 'bad');
    assert.ok(failing.ratio > 0.015);
    assert.equal(fs.existsSync(diffPath), true);
});

test('buildMarkdownReport renders the key run summary and per-page sections', () => {
    const markdown = buildMarkdownReport({
        generatedAt: '2026-04-20T10:00:00.000Z',
        baseUrl: 'http://127.0.0.1:9999',
        scope: 'landings',
        includeFleetClicks: true,
        summary: {
            totalRoutes: 1,
            totalPages: 1,
            byStatus: { good: 0, review: 1, bad: 0 },
            hardFailCount: 0
        },
        cohorts: {
            brand_landing: {
                pages: 1,
                statuses: { good: 0, review: 1, bad: 0 },
                templateFamilies: ['legacy_brand_catalog']
            }
        },
        pages: [
            {
                route: '/services.html',
                viewport: 'desktop-wide',
                profile: 'hub_marketing',
                assessment: {
                    status: 'review',
                    score: 80,
                    findings: [
                        {
                            severity: 'medium',
                            category: 'cta_hierarchy',
                            message: 'Hero shows too many actions.'
                        }
                    ]
                },
                baselineDiff: { status: 'review' },
                vision: { status: 'skipped_not_configured' },
                artifacts: {
                    viewportScreenshot: '/tmp/viewport.png',
                    regionScreenshot: '/tmp/region.png'
                }
            }
        ]
    });

    assert.match(markdown, /Visual Agent Report/);
    assert.match(markdown, /Scope: landings/);
    assert.match(markdown, /brand_landing/);
    assert.match(markdown, /\/services\.html \(desktop-wide\)/);
    assert.match(markdown, /Hero shows too many actions/);
});

test('buildCohortFindings flags brand landings that drift from the Ferrari reference shell', () => {
    const findings = buildCohortFindings([
        {
            route: '/ferrari-rental-dubai.html',
            viewport: 'desktop-wide',
            metrics: {
                templateFamily: 'premium_vehicle_split',
                headerFamily: 'lab-header',
                hasBookingAside: true,
                hasTrustRow: false,
                headingTopRatio: 0.22,
                heroActionCount: 2
            },
            artifacts: {
                viewportScreenshot: '/tmp/ferrari.png'
            }
        },
        {
            route: '/lamborghini-rental-dubai.html',
            viewport: 'desktop-wide',
            metrics: {
                templateFamily: 'legacy_brand_catalog',
                headerFamily: 'site-header',
                hasBookingAside: false,
                hasTrustRow: true,
                headingTopRatio: 0.2,
                heroActionCount: 3
            },
            artifacts: {
                viewportScreenshot: '/tmp/lamborghini.png'
            }
        }
    ]);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].route, '/lamborghini-rental-dubai.html');
    assert.equal(findings[0].category, 'legacy_template');
});

test('buildProfileReferenceFindings flags contact pages still using the legacy neon shell', () => {
    const findings = buildProfileReferenceFindings([
        {
            route: '/about.html',
            viewport: 'desktop-wide',
            profile: 'hub_marketing',
            metrics: {
                visualIntent: 'modern_dark_system',
                headerFamily: 'lab-header',
                headingFontFamily: 'cormorant garamond',
                bodyBackgroundLuminance: 0.12
            },
            artifacts: {
                viewportScreenshot: '/tmp/about.png'
            }
        },
        {
            route: '/contact.html',
            viewport: 'desktop-wide',
            profile: 'contact',
            metrics: {
                visualIntent: 'legacy_dark_neon',
                headerFamily: 'header',
                headingFontFamily: 'orbitron',
                bodyBackgroundLuminance: 0.01
            },
            artifacts: {
                viewportScreenshot: '/tmp/contact.png'
            }
        }
    ]);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].route, '/contact.html');
    assert.equal(findings[0].category, 'legacy_template');
    assert.match(findings[0].message, /contact page/i);
});

test('buildDesignSystemFindings flags cohort typography and surface drift', () => {
    const findings = buildDesignSystemFindings([
        {
            route: '/ferrari-rental-dubai.html',
            viewport: 'desktop-wide',
            metrics: {
                templateFamily: 'premium_vehicle_split',
                visualIntent: 'modern_light_system',
                headingFontFamily: 'cormorant garamond',
                bodyFontFamily: 'manrope',
                bodyFontSizePx: 16,
                bodyLineHeightPx: 26,
                bodyBackgroundLuminance: 0.95,
                cardBackgroundLuminance: 0.99,
                primaryCtaRadiusPx: 8,
                cardRadiusPx: 8,
                inputRadiusPx: 8,
                buttonFamilyCount: 2,
                usesSharedLabHeader: true
            },
            artifacts: {
                viewportScreenshot: '/tmp/ferrari-brand.png'
            }
        },
        {
            route: '/lamborghini-rental-dubai.html',
            viewport: 'desktop-wide',
            metrics: {
                templateFamily: 'premium_vehicle_split',
                visualIntent: 'modern_dark_system',
                headingFontFamily: 'orbitron',
                bodyFontFamily: 'inter',
                bodyFontSizePx: 19,
                bodyLineHeightPx: 31,
                bodyBackgroundLuminance: 0.08,
                cardBackgroundLuminance: 0.11,
                primaryCtaRadiusPx: 20,
                cardRadiusPx: 20,
                inputRadiusPx: 20,
                buttonFamilyCount: 6,
                usesSharedLabHeader: true
            },
            artifacts: {
                viewportScreenshot: '/tmp/lamborghini-brand.png'
            }
        }
    ]);

    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'font_drift'));
    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'surface_drift'));
    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'shape_drift'));
    assert.ok(findings.some((finding) => finding.route === '/lamborghini-rental-dubai.html' && finding.category === 'button_variant_sprawl'));
});

test('buildDesignSystemFindings flags app-wide body font drift on modern pages', () => {
    const findings = buildDesignSystemFindings([
        {
            route: '/about.html',
            viewport: 'desktop-wide',
            metrics: {
                bodyFontFamily: 'manrope',
                primaryCtaRadiusPx: 8,
                usesSharedLabHeader: true,
                visualIntent: 'modern_dark_system'
            },
            artifacts: {
                viewportScreenshot: '/tmp/about-global.png'
            }
        },
        {
            route: '/services.html',
            viewport: 'desktop-wide',
            metrics: {
                bodyFontFamily: 'manrope',
                primaryCtaRadiusPx: 8,
                usesSharedLabHeader: true,
                visualIntent: 'modern_dark_system'
            },
            artifacts: {
                viewportScreenshot: '/tmp/services-global.png'
            }
        },
        {
            route: '/contact.html',
            viewport: 'desktop-wide',
            metrics: {
                bodyFontFamily: 'inter',
                primaryCtaRadiusPx: 8,
                usesSharedLabHeader: true,
                visualIntent: 'modern_light_system'
            },
            artifacts: {
                viewportScreenshot: '/tmp/contact-global.png'
            }
        }
    ]);

    assert.ok(findings.some((finding) => finding.route === '/contact.html' && finding.category === 'font_drift'));
});

test('buildDesignSystemFindings respects the explicit brand landing contract', () => {
    const findings = buildDesignSystemFindings([
        {
            route: '/ferrari-rental-dubai.html',
            viewport: 'desktop-wide',
            metrics: {
                headingFontFamily: 'montserrat',
                bodyFontFamily: 'inter',
                visualIntent: 'modern_light_system',
                bodyFontSizePx: 15.8,
                bodyLineHeightPx: 24.8,
                primaryCtaRadiusPx: 8,
                inputRadiusPx: 16,
                cardRadiusPx: 8,
                buttonFamilyCount: 4,
                usesSharedLabHeader: true
            },
            artifacts: {
                viewportScreenshot: '/tmp/ferrari-contract.png'
            }
        },
        {
            route: '/lamborghini-rental-dubai.html',
            viewport: 'desktop-wide',
            metrics: {
                headingFontFamily: 'montserrat',
                bodyFontFamily: 'inter',
                visualIntent: 'modern_light_system',
                bodyFontSizePx: 15.1,
                bodyLineHeightPx: 23.9,
                primaryCtaRadiusPx: 8,
                inputRadiusPx: 16,
                cardRadiusPx: 8,
                buttonFamilyCount: 4,
                usesSharedLabHeader: true
            },
            artifacts: {
                viewportScreenshot: '/tmp/lamborghini-contract.png'
            }
        }
    ]);

    assert.equal(findings.filter((finding) => finding.route === '/lamborghini-rental-dubai.html').length, 0);
    assert.equal(findings.filter((finding) => finding.route === '/ferrari-rental-dubai.html').length, 0);
});

test('buildSurfaceFindings flags mixed Cars Brands destination families', () => {
    const findings = buildSurfaceFindings([
        {
            route: '/',
            viewport: 'desktop-wide',
            profile: 'home',
            surfaceMetrics: {
                brandsNav: {
                    count: 2,
                    routes: ['/ferrari-rental-dubai.html', '/lamborghini-rental-dubai.html'],
                    missingImageCount: 0,
                    missingLabelCount: 0,
                    widthSpread: 12,
                    heightSpread: 18
                }
            },
            artifacts: {
                viewportScreenshot: '/tmp/home.png'
            }
        },
        {
            route: '/ferrari-rental-dubai.html',
            viewport: 'desktop-wide',
            assessment: { status: 'good' },
            metrics: { templateFamily: 'premium_vehicle_split' }
        },
        {
            route: '/lamborghini-rental-dubai.html',
            viewport: 'desktop-wide',
            assessment: { status: 'review' },
            metrics: { templateFamily: 'legacy_brand_catalog' }
        }
    ]);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].route, '/');
    assert.equal(findings[0].category, 'card_consistency');
    assert.match(findings[0].message, /Cars Brands/);
});

test('buildSurfaceFindings flags Cars Types cards that collapse onto one generic destination', () => {
    const findings = buildSurfaceFindings([
        {
            route: '/',
            viewport: 'desktop-wide',
            profile: 'home',
            surfaceMetrics: {
                typesNav: {
                    count: 5,
                    routes: ['/fleet.html', '/fleet.html', '/fleet.html', '/fleet.html', '/fleet.html'],
                    missingImageCount: 0,
                    missingLabelCount: 0,
                    missingRouteCount: 0,
                    localAnchorCount: 0,
                    samePageRouteCount: 0,
                    duplicateRouteCount: 4,
                    uniqueRouteCount: 1,
                    widthSpread: 8,
                    heightSpread: 12
                }
            },
            artifacts: {
                viewportScreenshot: '/tmp/home-types.png'
            }
        },
        {
            route: '/fleet.html',
            viewport: 'desktop-wide',
            assessment: { status: 'good' },
            metrics: { templateFamily: 'generic' }
        }
    ]);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].route, '/');
    assert.equal(findings[0].severity, 'high');
    assert.match(findings[0].message, /Cars Types/);
    assert.match(findings[0].message, /same destination/i);
});

test('buildSurfaceFindings flags homepage categories that mix families and local anchors', () => {
    const findings = buildSurfaceFindings([
        {
            route: '/',
            viewport: 'desktop-wide',
            profile: 'home',
            surfaceMetrics: {
                homeCategories: {
                    count: 5,
                    routes: ['/supercar-rental-dubai.html', '/ferrari-rental-dubai.html', '/luxury-car-rental-dubai.html', '/lamborghini-rental-dubai.html', '/'],
                    missingImageCount: 0,
                    missingLabelCount: 0,
                    missingRouteCount: 0,
                    localAnchorCount: 1,
                    samePageRouteCount: 1,
                    duplicateRouteCount: 0,
                    uniqueRouteCount: 5,
                    widthSpread: 3,
                    heightSpread: 4
                }
            },
            artifacts: {
                viewportScreenshot: '/tmp/home-categories.png'
            }
        },
        {
            route: '/supercar-rental-dubai.html',
            viewport: 'desktop-wide',
            assessment: { status: 'review' },
            metrics: { templateFamily: 'local_guide' }
        },
        {
            route: '/ferrari-rental-dubai.html',
            viewport: 'desktop-wide',
            assessment: { status: 'good' },
            metrics: { templateFamily: 'vehicle_pdp_split' }
        },
        {
            route: '/luxury-car-rental-dubai.html',
            viewport: 'desktop-wide',
            assessment: { status: 'review' },
            metrics: { templateFamily: 'local_guide' }
        },
        {
            route: '/lamborghini-rental-dubai.html',
            viewport: 'desktop-wide',
            assessment: { status: 'good' },
            metrics: { templateFamily: 'vehicle_pdp_split' }
        }
    ]);

    assert.equal(findings.length, 3);
    assert.ok(findings.some((finding) => /without a real destination page/i.test(finding.message)));
    assert.ok(findings.some((finding) => /outside its expected destination family/i.test(finding.message)));
    assert.ok(findings.some((finding) => /mixes multiple destination families/i.test(finding.message)));
});

test('buildDeterministicFindings flags dark hero headings on dark visual shells', () => {
    const findings = buildDeterministicFindings({
        route: '/lamborghini-rental-dubai.html',
        viewport: { name: 'laptop' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 248 },
            viewportHeight: 768,
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.06,
            headingColorLuminance: 0.04,
            headingColor: 'rgb(18, 18, 18)',
            heroActionCount: 1,
            primaryCtaRect: { top: 512 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: []
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/lamborghini-contrast.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'contrast' && finding.hardFail === true));
});

test('buildDeterministicFindings accepts the services desktop split when circles stay above the lower panel', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 540 },
            viewportWidth: 1707,
            viewportHeight: 893,
            servicesSelectorRect: { top: 300, bottom: 498, width: 1184, height: 198 },
            servicesOrbMetrics: { count: 4, minWidthPx: 172, averageWidthPx: 173, maxWidthPx: 174 },
            servicesFeatureRect: { top: 520, bottom: 872, width: 1240, height: 352 },
            servicesFeatureCopyRect: { left: 148, right: 712, top: 542, bottom: 704, width: 564, height: 162 },
            servicesFeatureListRect: { left: 148, right: 758, top: 714, bottom: 764, width: 610, height: 50 },
            servicesFeatureSideRect: { left: 904, right: 1144, top: 542, bottom: 764, width: 240, height: 222 },
            servicesDirectoryShellRect: { top: 940, bottom: 1720, width: 1280, height: 780 },
            servicesFlowShellRect: { top: 1800, bottom: 2350, width: 1280, height: 550 },
            servicesFaqShellRect: { top: 2440, bottom: 3200, width: 1280, height: 760 },
            headingTopRatio: 0.605,
            heroActionCount: 2,
            primaryCtaRect: { top: 590 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_dark_system',
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 250, 242)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/services-balanced.png'
        }
    });

    assert.equal(findings.some((finding) => finding.category === 'heading'), false);
    assert.equal(findings.some((finding) => finding.category === 'first_viewport_layout'), false);
    assert.equal(findings.some((finding) => finding.category === 'section_rhythm'), false);
});

test('buildDeterministicFindings flags services desktop when the lower panel sinks and the heading drops too far', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 674 },
            headingTopRatio: 0.754,
            viewportWidth: 1707,
            viewportHeight: 893,
            servicesSelectorRect: { top: 432, bottom: 596, width: 1088, height: 164 },
            servicesOrbMetrics: { count: 4, minWidthPx: 112, averageWidthPx: 112, maxWidthPx: 112 },
            servicesFeatureRect: { top: 605, bottom: 901, width: 1440, height: 296 },
            heroActionCount: 2,
            primaryCtaRect: { top: 622, bottom: 673 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_dark_system',
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 250, 242)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/services-sunk.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'first_viewport_layout'));
});

test('buildDeterministicFindings flags services desktop when the panel leaves a dead zone between the copy and action column', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 552 },
            headingTopRatio: 0.618,
            viewportWidth: 1707,
            viewportHeight: 893,
            servicesSelectorRect: { top: 304, bottom: 500, width: 1184, height: 196 },
            servicesOrbMetrics: { count: 4, minWidthPx: 172, averageWidthPx: 173, maxWidthPx: 174 },
            servicesFeatureRect: { top: 512, bottom: 792, width: 1240, height: 280 },
            servicesFeatureCopyRect: { left: 148, right: 540, top: 540, bottom: 692, width: 392, height: 152 },
            servicesFeatureListRect: { left: 148, right: 538, top: 704, bottom: 752, width: 390, height: 48 },
            servicesFeatureSideRect: { left: 926, right: 1166, top: 540, bottom: 752, width: 240, height: 212 },
            heroActionCount: 2,
            primaryCtaRect: { top: 594, bottom: 646 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_dark_system',
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 250, 242)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/services-panel-gap.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'first_viewport_layout'));
});

test('buildDeterministicFindings flags services when the hero panel is materially narrower than the sections below', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 538 },
            headingTopRatio: 0.602,
            viewportWidth: 1707,
            viewportHeight: 893,
            servicesSelectorRect: { top: 304, bottom: 500, width: 1184, height: 196 },
            servicesOrbMetrics: { count: 4, minWidthPx: 172, averageWidthPx: 173, maxWidthPx: 174 },
            servicesFeatureRect: { top: 512, bottom: 792, width: 992, height: 280 },
            servicesFeatureCopyRect: { left: 148, right: 712, top: 540, bottom: 692, width: 564, height: 152 },
            servicesFeatureListRect: { left: 148, right: 758, top: 704, bottom: 752, width: 610, height: 48 },
            servicesFeatureSideRect: { left: 904, right: 1144, top: 540, bottom: 752, width: 240, height: 212 },
            servicesDirectoryShellRect: { top: 940, bottom: 1720, width: 1440, height: 780 },
            servicesFlowShellRect: { top: 1800, bottom: 2350, width: 1440, height: 550 },
            servicesFaqShellRect: { top: 2440, bottom: 3200, width: 1440, height: 760 },
            heroActionCount: 2,
            primaryCtaRect: { top: 594, bottom: 646 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_dark_system',
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 250, 242)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/services-width-rhythm.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'section_rhythm'));
});

test('buildDeterministicFindings flags services desktop when the top selector shrinks and the orbs lose presence', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 524 },
            headingTopRatio: 0.587,
            viewportWidth: 1707,
            viewportHeight: 893,
            servicesSelectorRect: { top: 296, bottom: 486, width: 912, height: 190 },
            servicesOrbMetrics: { count: 4, minWidthPx: 88, averageWidthPx: 90, maxWidthPx: 92 },
            servicesFeatureRect: { top: 520, bottom: 872, width: 1240, height: 352 },
            heroActionCount: 2,
            primaryCtaRect: { top: 594, bottom: 646 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_dark_system',
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 250, 242)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/services-orbs-small.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'first_viewport_layout'));
});

test('buildServiceInteractionFindings accepts service circles when each state updates cleanly and stays aligned', () => {
    const findings = buildServiceInteractionFindings({
        route: '/services.html',
        viewportName: 'desktop-wide',
        screenshotPath: '/tmp/services-interaction-balanced.png',
        serviceSelectorStates: {
            initialActiveId: 'services-lane-tab-airport',
            states: [
                {
                    tabId: 'services-lane-tab-airport',
                    activeTabId: 'services-lane-tab-airport',
                    titleText: 'Airport concierge',
                    copyText: 'Arrival-first movement for DXB and DWC guests.',
                    primaryHref: 'http://127.0.0.1:8086/airport-concierge-dubai.html',
                    tabHref: './airport-concierge-dubai.html',
                    pointCount: 3,
                    panelRect: { height: 314 },
                    headingTopRatio: 0.562,
                    featureGapRatio: 0.082,
                    screenshotPath: '/tmp/services-airport.png'
                },
                {
                    tabId: 'services-lane-tab-chauffeur',
                    activeTabId: 'services-lane-tab-chauffeur',
                    titleText: 'VIP chauffeur',
                    copyText: 'Private movement for dinners, meetings and city schedules.',
                    primaryHref: './chauffeur-service-dubai.html',
                    tabHref: './chauffeur-service-dubai.html',
                    pointCount: 3,
                    panelRect: { height: 320 },
                    headingTopRatio: 0.566,
                    featureGapRatio: 0.086,
                    screenshotPath: '/tmp/services-chauffeur.png'
                },
                {
                    tabId: 'services-lane-tab-delivery',
                    activeTabId: 'services-lane-tab-delivery',
                    titleText: 'Tailored delivery',
                    copyText: 'Hotel and villa handovers planned around the property rhythm.',
                    primaryHref: './hotel-villa-airport-delivery-dubai.html',
                    tabHref: './hotel-villa-airport-delivery-dubai.html',
                    pointCount: 3,
                    panelRect: { height: 326 },
                    headingTopRatio: 0.571,
                    featureGapRatio: 0.088,
                    screenshotPath: '/tmp/services-delivery.png'
                },
                {
                    tabId: 'services-lane-tab-monthly',
                    activeTabId: 'services-lane-tab-monthly',
                    titleText: 'Monthly luxury rental',
                    copyText: 'Longer-stay support with steadier coordination.',
                    primaryHref: './monthly-luxury-car-rental-dubai.html',
                    tabHref: './monthly-luxury-car-rental-dubai.html',
                    pointCount: 3,
                    panelRect: { height: 332 },
                    headingTopRatio: 0.578,
                    featureGapRatio: 0.09,
                    screenshotPath: '/tmp/services-monthly.png'
                }
            ]
        }
    });

    assert.equal(findings.length, 0);
});

test('buildServiceInteractionFindings flags service circles when state changes break homogeneity', () => {
    const findings = buildServiceInteractionFindings({
        route: '/services.html',
        viewportName: 'desktop-wide',
        screenshotPath: '/tmp/services-interaction-drift.png',
        serviceSelectorStates: {
            initialActiveId: 'services-lane-tab-airport',
            states: [
                {
                    tabId: 'services-lane-tab-airport',
                    activeTabId: 'services-lane-tab-airport',
                    titleText: 'Airport concierge',
                    copyText: 'Arrival-first movement for DXB and DWC guests.',
                    primaryHref: './airport-concierge-dubai.html',
                    tabHref: './airport-concierge-dubai.html',
                    pointCount: 3,
                    panelRect: { height: 318 },
                    headingTopRatio: 0.561,
                    featureGapRatio: 0.084,
                    screenshotPath: '/tmp/services-airport-drift.png'
                },
                {
                    tabId: 'services-lane-tab-chauffeur',
                    activeTabId: 'services-lane-tab-airport',
                    titleText: 'Airport concierge',
                    copyText: '',
                    primaryHref: './airport-concierge-dubai.html',
                    tabHref: './chauffeur-service-dubai.html',
                    pointCount: 1,
                    panelRect: { height: 382 },
                    headingTopRatio: 0.664,
                    featureGapRatio: 0.244,
                    screenshotPath: '/tmp/services-chauffeur-drift.png'
                },
                {
                    tabId: 'services-lane-tab-delivery',
                    activeTabId: 'services-lane-tab-delivery',
                    titleText: 'Tailored delivery',
                    copyText: 'Hotel and villa handovers planned around the property rhythm.',
                    primaryHref: './hotel-villa-airport-delivery-dubai.html',
                    tabHref: './hotel-villa-airport-delivery-dubai.html',
                    pointCount: 3,
                    panelRect: { height: 324 },
                    headingTopRatio: 0.571,
                    featureGapRatio: 0.088,
                    screenshotPath: '/tmp/services-delivery-drift.png'
                }
            ]
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'interaction_state' &&
        finding.message.includes('did not activate')
    )));
    assert.ok(findings.some((finding) => (
        finding.category === 'interaction_state' &&
        finding.message.includes('missing key panel content')
    )));
    assert.ok(findings.some((finding) => (
        finding.category === 'interaction_state' &&
        finding.message.includes('clearly distinct destinations')
    )));
    assert.ok(findings.some((finding) => (
        finding.category === 'interaction_state' &&
        finding.message.includes('not visually homogeneous')
    )));
});

test('buildDeterministicFindings flags locations desktop split drift when columns stop aligning', () => {
    const findings = buildDeterministicFindings({
        route: '/locations.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 402 },
            viewportWidth: 1707,
            viewportHeight: 893,
            locationsSummaryRect: { top: 310, width: 472, height: 430 },
            locationsMapRect: { top: 382, width: 492, height: 408 },
            heroActionCount: 2,
            primaryCtaRect: { top: 560 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_dark_system',
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 250, 242)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/locations-drift.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'first_viewport_layout'));
});

test('buildDeterministicFindings flags locations desktop when both columns sink too close to the fold edge', () => {
    const findings = buildDeterministicFindings({
        route: '/locations.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 182 },
            viewportWidth: 1707,
            viewportHeight: 893,
            locationsSummaryRect: { top: 112, bottom: 878, width: 783, height: 766 },
            locationsMapRect: { top: 112, bottom: 878, width: 865, height: 766 },
            locationsHeroShellRect: { top: 0, width: 1675, bottom: 885, height: 885 },
            heroActionCount: 2,
            primaryCtaRect: { top: 481, bottom: 521 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_dark_system',
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 250, 242)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/locations-low.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'first_viewport_layout'));
});

test('buildDeterministicFindings accepts balanced hero-support splits for brand landings', () => {
    const findings = buildDeterministicFindings({
        route: '/lamborghini-rental-dubai.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 520 },
            viewportWidth: 1707,
            viewportHeight: 893,
            vehicleHeroMediaRect: { top: 220, width: 930, height: 530 },
            vehicleBookingRect: { top: 220, width: 510, height: 530 },
            heroActionCount: 1,
            primaryCtaRect: { top: 612 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 249, 240)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/brand-split.png'
        }
    });

    assert.equal(findings.some((finding) => finding.category === 'first_viewport_layout'), false);
});

test('buildDeterministicFindings flags hero-support splits when both sides start aligned but end at different heights', () => {
    const findings = buildDeterministicFindings({
        route: '/lamborghini-rental-dubai.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 520 },
            viewportWidth: 1707,
            viewportHeight: 893,
            vehicleHeroMediaRect: { top: 220, bottom: 748, width: 930, height: 528 },
            vehicleBookingRect: { top: 220, bottom: 812, width: 510, height: 592 },
            heroActionCount: 1,
            primaryCtaRect: { top: 612, bottom: 660 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 249, 240)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/brand-bottom-misaligned.png'
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'first_viewport_layout' &&
        /balanced split/i.test(finding.message)
    )));
});

test('buildDeterministicFindings accepts the home hero when the panel fills the screen but the CTA stays comfortably above the fold', () => {
    const findings = buildDeterministicFindings({
        route: '/',
        viewport: { name: 'laptop' },
        profile: 'home',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 342 },
            viewportWidth: 1366,
            viewportHeight: 768,
            homeContentBoxRect: { top: 318, width: 640, bottom: 726 },
            homeHeroShellRect: { top: 0, width: 1215, bottom: 768 },
            heroActionCount: 2,
            primaryCtaRect: { top: 578, bottom: 630 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(245, 241, 232)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/home-balanced.png'
        }
    });

    assert.equal(findings.some((finding) => finding.category === 'first_viewport_layout'), false);
});

test('buildDeterministicFindings flags brand landings when the first CTA drops too low inside the hero', () => {
    const findings = buildDeterministicFindings({
        route: '/lamborghini-rental-dubai.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 520 },
            viewportWidth: 1707,
            viewportHeight: 893,
            vehicleHeroMediaRect: { top: 220, width: 930, height: 530 },
            vehicleBookingRect: { top: 220, width: 510, height: 530 },
            heroActionCount: 1,
            primaryCtaRect: { top: 802, bottom: 848 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            headingInsideHeroMedia: true,
            heroBackgroundLuminance: 0.01,
            headingColorLuminance: 0.96,
            headingColor: 'rgb(255, 249, 240)'
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/brand-cta-low.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'first_viewport_layout'));
});

test('buildDeterministicFindings flags fleet first row underfill', () => {
    const findings = buildDeterministicFindings({
        route: '/fleet.html',
        viewport: { name: 'desktop-wide' },
        profile: 'fleet',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            viewportWidth: 1707,
            viewportHeight: 893,
            fleetFirstRowMetrics: {
                rowCount: 2,
                rowSpanRatio: 0.58,
                topSpreadPx: 8
            },
            hasVisualMedia: true,
            hasNav: true,
            heroActionCount: 0,
            primaryCtaRect: null,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: []
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/fleet-fill.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'first_viewport_layout'));
});

test('buildDeterministicFindings flags reserve when branded intro is gone and the first date field falls below the fold', () => {
    const findings = buildDeterministicFindings({
        route: '/app/reserve/page.html',
        viewport: { name: 'laptop' },
        profile: 'reserve',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            viewportWidth: 1366,
            viewportHeight: 768,
            headerFamily: 'lab-header',
            visualIntent: 'modern_light_system',
            hasVisualMedia: false,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            formRect: { top: 360, bottom: 1024, width: 980, height: 664 },
            reserveIntroRect: null,
            reserveIntroPanelRect: null,
            reservePageHeadingRect: null,
            reserveStartDateRect: { top: 812, bottom: 860, width: 320, height: 48 }
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/reserve-entry.png'
        }
    });

    assert.ok(findings.some((finding) => finding.category === 'first_viewport_layout' && /branded entry context/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'media_load' && /visual anchor/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'form_visibility' && /date field is below the initial viewport/i.test(finding.message)));
});

test('buildTemplateFamilyFindings flags a service detail page that drifts away from its family reference', () => {
    const findings = buildTemplateFamilyFindings([
        {
            route: '/airport-concierge-dubai.html',
            viewport: 'desktop-wide',
            profile: 'hub_marketing',
            metrics: {
                templateFamily: 'service_detail',
                headingTopRatio: 0.27,
                primaryCtaTopRatio: 0.56,
                heroActionCount: 2,
                headingInsideHeroMedia: true
            },
            artifacts: {
                viewportScreenshot: '/tmp/service-reference.png'
            }
        },
        {
            route: '/chauffeur-service-dubai.html',
            viewport: 'desktop-wide',
            profile: 'hub_marketing',
            metrics: {
                templateFamily: 'service_detail',
                headingTopRatio: 0.49,
                primaryCtaTopRatio: 0.81,
                heroActionCount: 4,
                headingInsideHeroMedia: false
            },
            artifacts: {
                viewportScreenshot: '/tmp/service-drift.png'
            }
        }
    ]);

    assert.ok(findings.some((finding) => finding.category === 'family_layout_drift'));
});

test('approveBaselinesFromRun copies clean screenshots into the baseline store', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-agent-approve-'));
    const runDir = path.join(tempDir, 'run');
    const cleanViewport = path.join(runDir, 'clean-viewport.png');
    const cleanRegion = path.join(runDir, 'clean-region.png');
    const dirtyViewport = path.join(runDir, 'dirty-viewport.png');
    const repoRoot = path.resolve(__dirname, '..', '..');
    const baselineManifestPath = path.join(repoRoot, 'tests', 'visual-baselines', 'manifest.json');
    const cleanBaselineDir = path.join(repoRoot, 'tests', 'visual-baselines', 'baseline-fixture-html');
    const manifestBackupPath = fs.existsSync(baselineManifestPath)
        ? path.join(tempDir, 'manifest-backup.json')
        : '';

    fs.mkdirSync(runDir, { recursive: true });
    writeSolidPng(cleanViewport, [10, 10, 10]);
    writeSolidPng(cleanRegion, [20, 20, 20]);
    writeSolidPng(dirtyViewport, [30, 30, 30]);

    if (manifestBackupPath) {
        fs.copyFileSync(baselineManifestPath, manifestBackupPath);
    }

    fs.writeFileSync(path.join(runDir, 'report.json'), `${JSON.stringify({
        pages: [
            {
                route: '/baseline-fixture.html',
                viewport: 'mobile-modern',
                profile: 'hub_marketing',
                assessment: {
                    status: 'review',
                    findings: [],
                    hardFails: [],
                    reviewGates: ['missing_approved_baseline']
                },
                artifacts: {
                    viewportScreenshot: cleanViewport,
                    regionScreenshot: cleanRegion
                }
            },
            {
                route: '/baseline-dirty.html',
                viewport: 'mobile-modern',
                profile: 'hub_marketing',
                assessment: {
                    status: 'review',
                    findings: [
                        {
                            category: 'heading',
                            severity: 'medium',
                            message: 'Heading too low'
                        }
                    ],
                    hardFails: [],
                    reviewGates: ['missing_approved_baseline']
                },
                artifacts: {
                    viewportScreenshot: dirtyViewport,
                    regionScreenshot: ''
                }
            }
        ]
    }, null, 2)}\n`);

    try {
        const result = approveBaselinesFromRun({
            approveBaselinesFrom: runDir
        });

        assert.equal(result.approvedCount, 1);
        assert.equal(result.skippedCount, 1);
        assert.equal(fs.existsSync(path.join(cleanBaselineDir, 'mobile-modern', 'viewport.png')), true);
        assert.equal(fs.existsSync(path.join(cleanBaselineDir, 'mobile-modern', 'region.png')), true);

        const manifest = JSON.parse(fs.readFileSync(baselineManifestPath, 'utf8'));
        assert.ok(manifest.approvals.some((entry) => entry.route === '/baseline-fixture.html' && entry.viewport === 'mobile-modern'));
    } finally {
        fs.rmSync(cleanBaselineDir, { recursive: true, force: true });

        if (manifestBackupPath && fs.existsSync(manifestBackupPath)) {
            fs.copyFileSync(manifestBackupPath, baselineManifestPath);
        } else if (fs.existsSync(baselineManifestPath)) {
            fs.rmSync(baselineManifestPath, { force: true });
        }
    }
});
