const os = require('os');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { PNG } = require('pngjs');
const {
    getFirstViewportContract,
    getMobileInteractionContract,
    getViewportCoverageMatrix,
    resolveViewportTier
} = require('../../server/design-system-contract');

const {
    approveBaselinesFromRun,
    buildContactFormStateFindings,
    buildCohortFindings,
    buildDesignSystemFindings,
    buildDeterministicFindings,
    buildFleetMobileFilterFindings,
    buildMobileNavDrawerFindings,
    buildPageDepthScanFindings,
    buildReserveBookingIntentFindings,
    buildServiceInteractionFindings,
    buildMarkdownReport,
    buildProfileReferenceFindings,
    buildSurfaceFindings,
    buildTemplateFamilyFindings,
    VIEWPORTS,
    comparePngFiles,
    mergeBaselineResults,
    parseArgs,
    resolveVisualRoutes,
    routeFileStem
} = require('../../scripts/run-visual-agent');
const {
    DEFAULT_ROUTES: VISUAL_SMOKE_ROUTES,
    DEFAULT_VIEWPORTS: VISUAL_SMOKE_VIEWPORTS,
    VISUAL_SMOKE_VIEWPORT_GROUPS,
    parseArgs: parseVisualSmokeArgs,
    resolveSmokeViewports,
    summarizeSmokeFailures
} = require('../../scripts/run-visual-smoke-audit');
const {
    summarizeRobustFailures
} = require('../../scripts/run-visual-robust-audit');

test('resolveViewportTier separates mobile, laptop and desktop policies', () => {
    assert.equal(resolveViewportTier('mobile-modern', 390), 'mobile');
    assert.equal(resolveViewportTier('mobile-short', 400), 'mobile');
    assert.equal(resolveViewportTier('laptop', 1366), 'laptop');
    assert.equal(resolveViewportTier('desktop-wide', 1707), 'desktop');
});

test('visual agent includes a short mobile viewport for cramped bottom sheets', () => {
    const mobileShort = VIEWPORTS.find((viewport) => viewport.name === 'mobile-short');

    assert.deepEqual(
        { width: mobileShort.width, height: mobileShort.height },
        { width: 400, height: 608 }
    );
});

test('viewport coverage matrix defines the canonical responsive device bands', () => {
    const allViewports = getViewportCoverageMatrix('all');
    const responsiveViewports = getViewportCoverageMatrix('responsive');
    const firstViewportNames = getViewportCoverageMatrix('firstViewport').map((viewport) => viewport.name);

    assert.deepEqual(
        allViewports.map((viewport) => viewport.name),
        [
            'mobile-tiny',
            'mobile-short',
            'mobile-small',
            'mobile-modern',
            'mobile-wide-short',
            'mobile-large',
            'tablet-portrait',
            'tablet-landscape',
            'laptop-compact',
            'laptop',
            'desktop-standard',
            'desktop-wide'
        ]
    );
    assert.equal(responsiveViewports.length, 12);
    assert.ok(firstViewportNames.includes('mobile-tiny'));
    assert.ok(firstViewportNames.includes('mobile-short'));
    assert.ok(firstViewportNames.includes('laptop-compact'));
    assert.ok(firstViewportNames.includes('desktop-wide'));
});

test('getFirstViewportContract keeps desktop and mobile first viewport rules locked', () => {
    const homeMobile = getFirstViewportContract({
        route: '/',
        cohort: 'home',
        viewportName: 'mobile-modern',
        viewportWidth: 390
    });
    const aboutMobile = getFirstViewportContract({
        route: '/about.html',
        cohort: 'hub_marketing',
        viewportName: 'mobile-tiny',
        viewportWidth: 320
    });
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

    assert.equal(homeMobile.policy, 'locked');
    assert.equal(homeMobile.check, 'single_panel_fill');
    assert.equal(homeMobile.headingBalance.requireCenteredText, true);
    assert.equal(homeMobile.headingBalance.maxLineCount, 3);
    assert.equal(aboutMobile.policy, 'locked');
    assert.equal(aboutMobile.check, 'mobile_useful_first_viewport');
    assert.ok(aboutMobile.maxPrimaryCtaTopRatio <= 0.9);
    assert.equal(servicesDesktop.policy, 'locked');
    assert.equal(servicesDesktop.check, 'services_direct_lanes');
    assert.equal(servicesMobile.policy, 'locked');
    assert.equal(servicesMobile.check, 'services_direct_lanes');
});

test('getFirstViewportContract locks reserve mobile useful schedule reveal', () => {
    const reserveMobile = getFirstViewportContract({
        route: '/app/reserve/page.html',
        cohort: 'reserve',
        viewportName: 'mobile-modern',
        viewportWidth: 390
    });

    assert.equal(reserveMobile.policy, 'locked');
    assert.equal(reserveMobile.check, 'reserve_mobile_schedule_reveal');
    assert.ok(reserveMobile.maxPickupLocationTopRatio < 1.3);
});

test('getMobileInteractionContract locks mobile fleet filter usability', () => {
    const contract = getMobileInteractionContract({
        interaction: 'fleet_filter_sheet',
        viewportName: 'mobile-modern',
        viewportWidth: 390
    });

    assert.equal(contract.policy, 'locked');
    assert.equal(contract.minTapTargetPx, 44);
    assert.ok(contract.maxSheetHeightRatio < 1);
    assert.equal(contract.minVisibleFilterSelectCount, 2);
    assert.equal(contract.maxInlineApplyButtonCount, 0);
    assert.equal(contract.requireDateTimeDisplaySync, true);
    assert.equal(contract.forbidPinnedClosedToolbar, true);
    assert.ok(contract.minFieldLabelControlGapPx >= 6);
    assert.ok(contract.minModuleHeadingControlGapPx >= 8);
    assert.ok(contract.minTopbarToFirstModuleGapPx >= 10);
    assert.ok(contract.minCompactScheduleControlWidthPx >= 128);
    assert.ok(contract.requiredFilledValues.includes('10:00'));
    assert.ok(contract.requiredFilterLabels.includes('Lamborghini'));
});

test('getMobileInteractionContract locks mobile navigation drawer rhythm', () => {
    const contract = getMobileInteractionContract({
        interaction: 'mobile_nav_drawer',
        viewportName: 'mobile-modern',
        viewportWidth: 390
    });

    assert.equal(contract.policy, 'locked');
    assert.equal(contract.maxVisibleSecondaryActionCount, 0);
    assert.ok(contract.maxButtonWidthSpreadPx <= 12);
    assert.ok(contract.requiredGroups.includes('nav'));
    assert.ok(contract.requiredDisclosures.includes('browse'));
    assert.equal(contract.maxDefaultOpenDisclosureCount, 0);
});

test('human-state contracts cover contact and reserve filled forms', () => {
    const contactContract = getMobileInteractionContract({
        interaction: 'contact_form_filled',
        viewportName: 'mobile-short',
        viewportWidth: 400
    });
    const reserveContract = getMobileInteractionContract({
        interaction: 'reserve_booking_intent',
        viewportName: 'mobile-modern',
        viewportWidth: 390
    });

    assert.equal(contactContract.policy, 'locked');
    assert.ok(contactContract.requiredFieldKeys.includes('contactMessage'));
    assert.equal(reserveContract.policy, 'locked');
    assert.ok(reserveContract.minCompactScheduleControlWidthPx <= 120);
    assert.ok(reserveContract.requiredScheduleFieldKeys.includes('pickupLocation'));
    assert.ok(reserveContract.requiredGuestFieldKeys.includes('passport'));
});

test('mobile card action contract locks hierarchy and edge padding', () => {
    const contract = getMobileInteractionContract({
        interaction: 'mobile_card_actions',
        viewportName: 'mobile-modern',
        viewportWidth: 390
    });

    assert.equal(contract.policy, 'locked');
    assert.equal(contract.maxSecondaryContactActions, 2);
    assert.equal(contract.requireStackedContactActions, false);
    assert.equal(contract.requireSingleRowContactSplit, true);
    assert.ok(contract.maxActionGroupHeightRatio < 0.4);
    assert.ok(contract.minSplitContactGroupWidthRatio >= 0.98);
    assert.equal(contract.allowFullBleedContactStrip, true);
    assert.ok(contract.maxSplitContactSideGapPx <= 2);
    assert.ok(contract.maxSplitContactOverflowPx <= 2);
});

test('desktop card action contract locks the same full-width split contact bar', () => {
    const contract = getMobileInteractionContract({
        interaction: 'mobile_card_actions',
        viewportName: 'desktop-wide',
        viewportWidth: 1707
    });

    assert.equal(contract.policy, 'locked');
    assert.equal(contract.maxSecondaryContactActions, 2);
    assert.equal(contract.requireSingleRowContactSplit, true);
    assert.equal(contract.allowFullBleedContactStrip, true);
    assert.ok(contract.minSplitContactGroupWidthRatio >= 0.98);
    assert.ok(contract.maxSplitContactSideGapPx <= 2);
    assert.ok(contract.maxSecondaryActionHeightPx <= 72);
});

test('visual smoke gate covers human routes and responsive device bands', () => {
    assert.ok(VISUAL_SMOKE_ROUTES.includes('/about.html'));
    assert.ok(VISUAL_SMOKE_ROUTES.includes('/fleet.html'));
    assert.ok(VISUAL_SMOKE_ROUTES.includes('/locations.html'));
    assert.ok(VISUAL_SMOKE_ROUTES.includes('/contact.html'));
    assert.ok(VISUAL_SMOKE_ROUTES.includes('/app/reserve/page.html'));
    assert.ok(VISUAL_SMOKE_VIEWPORTS.includes('mobile-tiny'));
    assert.ok(VISUAL_SMOKE_VIEWPORTS.includes('mobile-short'));
    assert.ok(VISUAL_SMOKE_VIEWPORTS.includes('tablet-portrait'));
    assert.ok(VISUAL_SMOKE_VIEWPORTS.includes('laptop'));
    assert.ok(VISUAL_SMOKE_VIEWPORTS.includes('desktop-wide'));
});

test('visual smoke viewport groups keep mobile, tablet and desktop audits separate', () => {
    assert.deepEqual(
        VISUAL_SMOKE_VIEWPORT_GROUPS.mobile,
        ['mobile-tiny', 'mobile-short', 'mobile-small', 'mobile-modern', 'mobile-wide-short', 'mobile-large']
    );
    assert.deepEqual(
        VISUAL_SMOKE_VIEWPORT_GROUPS.tablet,
        ['tablet-portrait', 'tablet-landscape']
    );
    assert.deepEqual(
        VISUAL_SMOKE_VIEWPORT_GROUPS.desktop,
        ['laptop-compact', 'laptop', 'desktop-standard', 'desktop-wide']
    );
    assert.deepEqual(
        VISUAL_SMOKE_VIEWPORT_GROUPS.responsive,
        [
            'mobile-tiny',
            'mobile-short',
            'mobile-small',
            'mobile-modern',
            'mobile-wide-short',
            'mobile-large',
            'tablet-portrait',
            'tablet-landscape',
            'laptop-compact',
            'laptop',
            'desktop-standard',
            'desktop-wide'
        ]
    );
});

test('visual smoke args resolve viewport groups and explicit viewport additions', () => {
    const args = parseVisualSmokeArgs([
        '--viewport-group',
        'mobile',
        '--viewport',
        'tablet-portrait',
        '--strict-review'
    ]);

    assert.deepEqual(resolveSmokeViewports(args), [
        'mobile-tiny',
        'mobile-short',
        'mobile-small',
        'mobile-modern',
        'mobile-wide-short',
        'mobile-large',
        'tablet-portrait'
    ]);
    assert.equal(args.strictReview, true);
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

test('resolveVisualRoutes keeps explicit route audits scoped to the requested routes', () => {
    assert.deepEqual(
        resolveVisualRoutes({
            routes: ['/fleet.html'],
            scope: 'landings',
            includeFleetClicks: true
        }),
        ['/fleet.html']
    );

    assert.ok(resolveVisualRoutes({
        routes: [],
        scope: 'landings',
        includeFleetClicks: true
    }).includes('/ferrari-296-gts-rental-dubai.html'));
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

test('mergeBaselineResults keeps missing region baselines visible even when viewport passes', () => {
    const result = mergeBaselineResults([
        {
            kind: 'viewport',
            status: 'pass',
            ratio: 0,
            threshold: 0.015,
            message: 'Viewport baseline passed.'
        },
        {
            kind: 'region',
            status: 'missing',
            ratio: null,
            threshold: 0.008,
            message: 'Baseline not found.'
        }
    ]);

    assert.equal(result.status, 'missing');
    assert.equal(result.kind, 'region');
});

test('robust visual gate fails on review pages, missing baselines and first viewport failures', () => {
    const gate = summarizeRobustFailures({
        visual: {
            issues: [
                {
                    route: '/fleet.html',
                    viewport: 'mobile-modern',
                    status: 'review',
                    score: 82,
                    findings: [{ severity: 'medium', message: 'CTA drift' }]
                }
            ]
        },
        baselines: {
            missing: [
                {
                    route: '/fleet.html',
                    viewport: 'mobile-short'
                }
            ]
        },
        firstViewport: {
            ok: false,
            errors: [],
            byProject: {
                'desktop-chromium': {
                    failedTests: [
                        {
                            title: 'fleet keeps first section above fold',
                            file: 'tests/e2e/visual-route-entrypoints.spec.js',
                            line: 1
                        }
                    ]
                }
            }
        }
    });

    assert.equal(gate.failed, true);
    assert.equal(gate.reviewPages.length, 1);
    assert.equal(gate.missingBaselines.length, 1);
    assert.equal(gate.firstViewportFailedTests.length, 1);
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
                headingFontFamily: 'el messiri',
                bodyFontFamily: 'manrope',
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
                headingFontFamily: 'el messiri',
                bodyFontFamily: 'manrope',
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

test('buildDesignSystemFindings flags header drift against the explicit cohort contract', () => {
    const findings = buildDesignSystemFindings([
        {
            route: '/airport-concierge-dubai.html',
            viewport: 'desktop-wide',
            metrics: {
                headingFontFamily: 'cormorant garamond',
                bodyFontFamily: 'manrope',
                visualIntent: 'modern_light_system',
                bodyFontSizePx: 15,
                bodyLineHeightPx: 24,
                primaryCtaRadiusPx: 8,
                cardRadiusPx: 8,
                buttonFamilyCount: 4,
                headerVariant: 'lab_mega',
                headerBrandFontFamily: 'inter',
                headerPrimaryNavSignature: 'Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact',
                headerNavRowCount: 1,
                usesSharedLabHeader: true
            },
            artifacts: {
                viewportScreenshot: '/tmp/airport-header-contract.png'
            }
        }
    ]);

    assert.ok(findings.some((finding) => (
        finding.route === '/airport-concierge-dubai.html' &&
        finding.category === 'header_consistency'
    )));
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

test('buildDeterministicFindings flags weak visible text contrast on light panels', () => {
    const findings = buildDeterministicFindings({
        route: '/app/reserve/page.html',
        viewport: { name: 'laptop' },
        profile: 'reserve',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 24 },
            viewportWidth: 1366,
            viewportHeight: 768,
            heroActionCount: 1,
            primaryCtaRect: { top: 706 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            textContrastIssues: [
                {
                    selectorLabel: 'p.reserve-page-panel__copy :: Choose delivery and return.',
                    text: 'Choose delivery and return. The quote recalculates automatically.',
                    contrastRatio: 1.52,
                    requiredRatio: 4.5,
                    color: 'rgb(204, 207, 215)',
                    effectiveBackground: 'rgb(255, 254, 249)'
                }
            ],
            internalGapIssues: [],
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
            viewportScreenshot: '/tmp/reserve-weak-contrast.png'
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'contrast' &&
        /not have enough contrast/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildDeterministicFindings flags inline white copy on light premium pages', () => {
    const findings = buildDeterministicFindings({
        route: '/lamborghini-rental-dubai.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            viewportWidth: 1707,
            viewportHeight: 893,
            heroActionCount: 1,
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            textContrastIssues: [],
            textEncodingIssues: [],
            forcedLightTextIssues: [
                {
                    selectorLabel: 'strong :: Lamborghini rental in Dubai',
                    text: 'Lamborghini rental in Dubai',
                    style: 'color:#fff;'
                }
            ],
            headerTextContrastIssues: [],
            internalGapIssues: [],
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
            viewportScreenshot: '/tmp/lamborghini-inline-white-copy.png'
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'contrast' &&
        /inline styling/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildDeterministicFindings flags cramped desktop header brand blocks', () => {
    const findings = buildDeterministicFindings({
        route: '/lamborghini-huracan-evo-spyder-rental-dubai.html',
        viewport: { name: 'desktop-wide' },
        profile: 'vehicle_pdp',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 210 },
            viewportWidth: 1527,
            viewportHeight: 768,
            heroActionCount: 1,
            primaryCtaRect: { top: 520 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            textContrastIssues: [],
            headerTextContrastIssues: [],
            textEncodingIssues: [],
            internalGapIssues: [],
            overlaps: [],
            brokenMedia: [],
            usesSharedLabHeader: true,
            headerCrestRect: { width: 40, height: 40 },
            headerCrestImageRect: { width: 30, height: 34 },
            headerBrandStrongRect: { width: 113, height: 48 },
            headerBrandStrongLineMetrics: { lineCount: 2 },
            headerBrandSubLineMetrics: { lineCount: 2 }
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/vehicle-cramped-header.png'
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'header_consistency' &&
        /brand block/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildDeterministicFindings flags weak header icon contrast', () => {
    const findings = buildDeterministicFindings({
        route: '/lamborghini-huracan-evo-spyder-rental-dubai.html',
        viewport: { name: 'desktop-wide' },
        profile: 'vehicle_pdp',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 210 },
            viewportWidth: 1527,
            viewportHeight: 768,
            heroActionCount: 1,
            primaryCtaRect: { top: 520 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            textContrastIssues: [],
            headerTextContrastIssues: [
                {
                    selectorLabel: 'a.lab-header__utility-link :: Call Dynasty Prestige',
                    text: 'Call Dynasty Prestige',
                    contrastRatio: 1.38,
                    requiredRatio: 4.5,
                    color: 'rgb(241, 226, 189)',
                    effectiveBackground: 'rgb(224, 224, 224)'
                }
            ],
            textEncodingIssues: [],
            internalGapIssues: [],
            overlaps: [],
            brokenMedia: [],
            usesSharedLabHeader: true,
            headerCrestRect: { width: 56, height: 56 },
            headerCrestImageRect: { width: 44, height: 50 },
            headerBrandStrongRect: { width: 180, height: 16 },
            headerBrandStrongLineMetrics: { lineCount: 1 },
            headerBrandSubLineMetrics: { lineCount: 1 }
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/vehicle-weak-header-icon.png'
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'contrast' &&
        /Header text or icon contrast/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildDeterministicFindings flags whitewashed premium SEO headers', () => {
    const findings = buildDeterministicFindings({
        route: '/lamborghini-huracan-evo-spyder-rental-dubai.html',
        viewport: { name: 'desktop-wide' },
        profile: 'vehicle_pdp',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 210 },
            viewportWidth: 1527,
            viewportHeight: 768,
            heroActionCount: 1,
            primaryCtaRect: { top: 520 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            textContrastIssues: [],
            headerTextContrastIssues: [],
            textEncodingIssues: [],
            internalGapIssues: [],
            overlaps: [],
            brokenMedia: [],
            usesSharedLabHeader: true,
            headerRect: { width: 1527, height: 88 },
            headerSurfaceLuminance: 0.94,
            headerBackground: 'rgba(255, 255, 255, 0.98)',
            headerBackgroundImage: 'linear-gradient(rgb(255, 255, 255), rgb(250, 248, 243))',
            headerCrestRect: { width: 56, height: 56 },
            headerCrestImageRect: { width: 44, height: 50 },
            headerBrandStrongRect: { width: 180, height: 16 },
            headerBrandStrongLineMetrics: { lineCount: 1 },
            headerBrandSubLineMetrics: { lineCount: 1 }
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/vehicle-white-header.png'
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'header_consistency' &&
        /too bright and flat/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildDeterministicFindings flags visible broken text encoding', () => {
    const findings = buildDeterministicFindings({
        route: '/app/reserve/page.html',
        viewport: { name: 'mobile-modern' },
        profile: 'reserve',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 24 },
            viewportWidth: 390,
            viewportHeight: 844,
            heroActionCount: 1,
            primaryCtaRect: { top: 650 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            textContrastIssues: [],
            textEncodingIssues: [
                {
                    selectorLabel: 'button#continueToPaymentBtn',
                    text: 'Continue to Guest Details \u00c2\u2020\u2019'
                }
            ],
            internalGapIssues: [],
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
            viewportScreenshot: '/tmp/reserve-broken-text.png'
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'text_encoding' &&
        /broken encoding/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildDeterministicFindings flags large internal gaps in first-viewport panels', () => {
    const findings = buildDeterministicFindings({
        route: '/app/reserve/page.html',
        viewport: { name: 'laptop' },
        profile: 'reserve',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 24 },
            viewportWidth: 1366,
            viewportHeight: 768,
            heroActionCount: 1,
            primaryCtaRect: { top: 706 },
            hasVisualMedia: true,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            textContrastIssues: [],
            internalGapIssues: [
                {
                    selectorLabel: 'aside.step2-side :: Live quote',
                    largestGapPx: 184,
                    largestGapRatio: 0.31,
                    trailingGapPx: 184,
                    childCount: 1
                }
            ],
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
            viewportScreenshot: '/tmp/reserve-layout-gap.png'
        }
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'layout_gap' &&
        /large empty internal gap/i.test(finding.message)
    )));
});

test('buildDeterministicFindings accepts services desktop when direct circles stay prominent without a panel', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 470, bottom: 612 },
            viewportWidth: 1707,
            viewportHeight: 893,
            servicesSelectorRect: { top: 660, bottom: 810, width: 1184, height: 150 },
            servicesOrbMetrics: { count: 4, minWidthPx: 172, averageWidthPx: 173, maxWidthPx: 174 },
            servicesDirectoryShellRect: { top: 940, bottom: 1720, width: 1280, height: 780 },
            servicesFlowShellRect: { top: 1800, bottom: 2350, width: 1280, height: 550 },
            servicesFaqShellRect: { top: 2440, bottom: 3200, width: 1280, height: 760 },
            headingTopRatio: 0.526,
            heroActionCount: 0,
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

test('buildDeterministicFindings accepts services mobile when direct circles are visible in the first view', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'mobile-modern' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 132, bottom: 212 },
            viewportWidth: 390,
            viewportHeight: 844,
            servicesSelectorRect: { top: 308, bottom: 510, width: 342, height: 202 },
            servicesOrbMetrics: { count: 4, minWidthPx: 64, averageWidthPx: 65, maxWidthPx: 66 },
            heroActionCount: 0,
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
            viewportScreenshot: '/tmp/services-mobile-balanced.png'
        }
    });

    assert.equal(findings.some((finding) => finding.category === 'first_viewport_layout'), false);
});

test('buildDeterministicFindings flags services mobile when direct circles are buried too low', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'mobile-modern' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 360, bottom: 460 },
            viewportWidth: 390,
            viewportHeight: 844,
            servicesSelectorRect: { top: 610, bottom: 760, width: 342, height: 150 },
            servicesOrbMetrics: { count: 4, minWidthPx: 64, averageWidthPx: 65, maxWidthPx: 66 },
            heroActionCount: 0,
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
            viewportScreenshot: '/tmp/services-mobile-buried-panel.png'
        }
    });
    const finding = findings.find((entry) => (
        entry.category === 'first_viewport_layout' &&
        /four service circles as clean direct links/i.test(entry.message)
    ));

    assert.ok(finding);
    assert.equal(finding.severity, 'high');
    assert.match(finding.evidence, /selectorBottomRatio/);
    assert.match(finding.evidence, /headingTopRatio/);
});

test('buildDeterministicFindings flags services desktop if the removed preview panel returns', () => {
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

    const finding = findings.find((entry) => entry.category === 'first_viewport_layout');
    assert.ok(finding);
    assert.match(finding.evidence, /legacyServicePreviewPanelVisible/);
});

test('buildDeterministicFindings flags services desktop when direct lanes drift out of the first viewport', () => {
    const findings = buildDeterministicFindings({
        route: '/services.html',
        viewport: { name: 'desktop-wide' },
        profile: 'hub_marketing',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 640, bottom: 790 },
            headingTopRatio: 0.717,
            viewportWidth: 1707,
            viewportHeight: 893,
            servicesSelectorRect: { top: 812, bottom: 912, width: 1184, height: 100 },
            servicesOrbMetrics: { count: 4, minWidthPx: 172, averageWidthPx: 173, maxWidthPx: 174 },
            heroActionCount: 0,
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

    const finding = findings.find((entry) => entry.category === 'first_viewport_layout');
    assert.ok(finding);
    assert.match(finding.evidence, /selectorBottomRatio/);
});

test('buildDeterministicFindings still flags services when a legacy lead panel breaks section rhythm', () => {
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

test('buildDeterministicFindings accepts contact mobile when the form starts within the first view', () => {
    const findings = buildDeterministicFindings({
        route: '/contact.html',
        viewport: { name: 'mobile-modern' },
        profile: 'contact',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 186, bottom: 380, width: 189, height: 194 },
            viewportWidth: 390,
            viewportHeight: 844,
            contactIntroRect: { top: 102, bottom: 529, width: 342, height: 427 },
            contactFormCardRect: { top: 553, bottom: 1331, width: 342, height: 778 },
            heroActionCount: 1,
            contactHeroActionRect: { top: 480, bottom: 529, width: 165, height: 49 },
            primaryCtaRect: { top: 1270, bottom: 1322, width: 148, height: 52 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_light_system',
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
            viewportScreenshot: '/tmp/contact-mobile-form-visible.png'
        }
    });

    assert.equal(findings.some((entry) => (
        entry.category === 'first_viewport_layout' &&
        /mobile first viewport/i.test(entry.message)
    )), false);
});

test('buildDeterministicFindings flags vehicle mobile when availability CTA is buried below the first view', () => {
    const findings = buildDeterministicFindings({
        route: '/ferrari-296-gts-rental-dubai.html',
        viewport: { name: 'mobile-modern' },
        profile: 'vehicle_pdp',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            headingRect: { top: 493, bottom: 525, width: 351, height: 32 },
            viewportWidth: 390,
            viewportHeight: 844,
            vehicleHeroMediaRect: { top: 195, bottom: 430, width: 351, height: 235 },
            vehicleBookingRect: { top: 444, bottom: 1502, width: 351, height: 1058 },
            heroActionCount: 1,
            primaryCtaRect: { top: 1379, bottom: 1427, width: 323, height: 48 },
            priceRect: { top: 604, bottom: 652, width: 170, height: 48 },
            headerFamily: 'lab-header',
            visualIntent: 'modern_light_system',
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
            viewportScreenshot: '/tmp/vehicle-mobile-cta-buried.png'
        }
    });
    const finding = findings.find((entry) => (
        entry.category === 'first_viewport_layout' &&
        /mobile first viewport/i.test(entry.message)
    ));

    assert.ok(finding);
    assert.equal(finding.severity, 'high');
    assert.match(finding.evidence, /primaryCtaTopRatio/);
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

test('buildFleetMobileFilterFindings accepts readable filled mobile filter controls', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            isOpen: true,
            sheetHeightRatio: 0.82,
            sheetHorizontalOverflowPx: 0,
            displayTexts: ['21/04/2026', '10:00', '23/04/2026', '18:00'],
            selectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleSelectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleFilledFieldCount: 4,
            visibleFilterSelectCount: 3,
            spacingMetrics: {
                topbarToFirstModuleGapPx: 14,
                fieldLabelControlGapsPx: [8, 8, 9, 9],
                moduleHeadingControlGapsPx: [10, 12, 12]
            },
            dateTimeFields: [
                { key: 'fleet-pickup-date', value: '2026-04-21', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-pickup-time', value: '10:00', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-date', value: '2026-04-23', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-time', value: '18:00', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 }
            ],
            controls: [
                { key: 'fleet-pickup-date', kind: 'date_time_field', rect: { width: 326, height: 56 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'brand', kind: 'select', rect: { width: 326, height: 50 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'close', kind: 'button', rect: { width: 326, height: 48 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-filter-close fleet-filter-close--top', kind: 'button', rect: { width: 48, height: 48 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'price', kind: 'range', rect: { width: 326, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/fleet-mobile-filters-filled.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.equal(findings.length, 0);
});

test('buildFleetMobileFilterFindings flags pinned mobile filter toolbars over car content', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            isOpen: true,
            viewportHeight: 844,
            toolbarPosition: 'sticky',
            toolbarRect: { top: 102, width: 360, height: 50 },
            sheetHeightRatio: 0.82,
            sheetHorizontalOverflowPx: 0,
            displayTexts: ['24/04/2026', '10:00', '26/04/2026', '18:00'],
            selectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleSelectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleFilledFieldCount: 4,
            visibleFilterSelectCount: 3,
            dateTimeFields: [
                { key: 'fleet-pickup-date', value: '2026-04-24', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-pickup-time', value: '10:00', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-date', value: '2026-04-26', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-time', value: '18:00', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 }
            ],
            controls: [
                { key: 'fleet-pickup-date', kind: 'date_time_field', rect: { width: 326, height: 56 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'brand', kind: 'select', rect: { width: 326, height: 50 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'type', kind: 'select', rect: { width: 326, height: 50 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/fleet-mobile-pinned-toolbar.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'visual_affordance' &&
        /pinned over scrolling car content/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildFleetMobileFilterFindings flags cramped mobile filter sheet spacing', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            isOpen: true,
            viewportHeight: 740,
            toolbarPosition: 'relative',
            sheetHeightRatio: 0.9,
            sheetHorizontalOverflowPx: 0,
            displayTexts: ['24/04/2026', '10:00', '26/04/2026', '18:00'],
            selectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleSelectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleFilledFieldCount: 4,
            visibleFilterSelectCount: 3,
            spacingMetrics: {
                topbarToFirstModuleGapPx: 4,
                fieldLabelControlGapsPx: [2, 3, 2, 3],
                moduleHeadingControlGapsPx: [4, 5, 4]
            },
            dateTimeFields: [
                { key: 'fleet-pickup-date', value: '2026-04-24', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-pickup-time', value: '10:00', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-date', value: '2026-04-26', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-time', value: '18:00', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 }
            ],
            controls: [
                { key: 'fleet-pickup-date', kind: 'date_time_field', rect: { width: 326, height: 56 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'brand', kind: 'select', rect: { width: 326, height: 50 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'type', kind: 'select', rect: { width: 326, height: 50 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/fleet-mobile-cramped-spacing.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'spacing' &&
        /breathing room/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildFleetMobileFilterFindings flags stale visible date values after inputs change', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            isOpen: true,
            sheetHeightRatio: 0.82,
            sheetHorizontalOverflowPx: 0,
            displayTexts: ['21/04/2026', '10:00', '23/04/2026', '18:00'],
            selectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleSelectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleFilledFieldCount: 4,
            visibleFilterSelectCount: 3,
            dateTimeFields: [
                { key: 'fleet-pickup-date', value: '2026-04-24', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-pickup-time', value: '10:00', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-date', value: '2026-04-26', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-time', value: '18:00', widthRatio: 0.86, rect: { width: 326, height: 56 }, clipX: 0, clipY: 0 }
            ],
            controls: [],
            screenshotPath: '/tmp/fleet-mobile-stale-dates.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'form_visibility' &&
        /24\/04\/2026/.test(finding.evidence) &&
        /26\/04\/2026/.test(finding.evidence)
    )));
});

test('buildFleetMobileFilterFindings accepts intentional compact fullscreen filter sheets', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            isOpen: true,
            viewportHeight: 844,
            sheetHeightRatio: 1,
            sheetHorizontalOverflowPx: 0,
            displayTexts: ['21/04/2026', '10:00', '23/04/2026', '18:00'],
            selectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleSelectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleFilledFieldCount: 4,
            visibleFilterSelectCount: 3,
            dateTimeFields: [
                { key: 'fleet-pickup-date', value: '2026-04-21', widthRatio: 0.93, rect: { width: 362, height: 44 }, clipX: 0, clipY: 0 },
                { key: 'fleet-pickup-time', value: '10:00', widthRatio: 0.93, rect: { width: 362, height: 44 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-date', value: '2026-04-23', widthRatio: 0.93, rect: { width: 362, height: 44 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-time', value: '18:00', widthRatio: 0.93, rect: { width: 362, height: 44 }, clipX: 0, clipY: 0 }
            ],
            controls: [
                { key: 'fleet-pickup-date', kind: 'date_time_field', rect: { width: 362, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-sidebar__select js-fleet-brand-select', kind: 'select', text: 'Lamborghini', rect: { width: 362, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-sidebar__select js-fleet-type-select', kind: 'select', text: 'Convertible', rect: { width: 362, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/fleet-mobile-compact-fullscreen.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.equal(findings.length, 0);
});

test('buildFleetMobileFilterFindings accepts readable two-column schedule fields on tiny phones', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-tiny',
        viewportWidth: 320,
        state: {
            available: true,
            isOpen: true,
            viewportHeight: 568,
            sheetHeightRatio: 1,
            sheetHorizontalOverflowPx: 0,
            displayTexts: ['24/04/2026', '10:00', '26/04/2026', '18:00'],
            selectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleSelectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleFilledFieldCount: 4,
            visibleFilterSelectCount: 3,
            dateTimeFields: [
                { key: 'fleet-pickup-date', value: '2026-04-24', widthRatio: 0.45, rect: { width: 144, height: 44 }, clipX: 0, clipY: 0 },
                { key: 'fleet-pickup-time', value: '10:00', widthRatio: 0.45, rect: { width: 144, height: 44 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-date', value: '2026-04-26', widthRatio: 0.45, rect: { width: 144, height: 44 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-time', value: '18:00', widthRatio: 0.45, rect: { width: 144, height: 44 }, clipX: 0, clipY: 0 }
            ],
            controls: [
                { key: 'fleet-pickup-date', kind: 'date_time_field', rect: { width: 144, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-pickup-time', kind: 'date_time_field', rect: { width: 144, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-return-date', kind: 'date_time_field', rect: { width: 144, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-return-time', kind: 'date_time_field', rect: { width: 144, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-sidebar__select js-fleet-brand-select', kind: 'select', text: 'Lamborghini', rect: { width: 292, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-sidebar__select js-fleet-type-select', kind: 'select', text: 'Convertible', rect: { width: 292, height: 44 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/fleet-mobile-tiny-compact-schedule.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.equal(findings.length, 0);
});

test('buildFleetMobileFilterFindings flags cramped mobile filter date and filter states', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            isOpen: true,
            sheetHeightRatio: 0.94,
            sheetHorizontalOverflowPx: 12,
            displayTexts: ['20/04/2026'],
            selectedFilterLabels: ['Featured'],
            visibleSelectedFilterLabels: ['Featured'],
            visibleFilledFieldCount: 1,
            visibleFilterSelectCount: 1,
            dateTimeFields: [
                { key: 'fleet-pickup-date', widthRatio: 0.58, rect: { width: 210, height: 42 }, clipX: 8, clipY: 0, text: '20/04/2026' },
                { key: 'fleet-pickup-time', widthRatio: 0.34, rect: { width: 124, height: 42 }, clipX: 16, clipY: 0, text: '10:00' }
            ],
            controls: [
                { key: 'fleet-pickup-date', kind: 'date_time_field', rect: { width: 210, height: 42 }, clipX: 8, clipY: 0, text: '20/04/2026', visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-pickup-time', kind: 'date_time_field', rect: { width: 124, height: 42 }, clipX: 16, clipY: 0, text: '10:00', visibleInViewport: true, fullyVisibleInViewport: false, viewportClipPx: 18 },
                { key: 'brand', kind: 'select', rect: { width: 106, height: 40 }, clipX: 10, clipY: 0, text: 'Lamborghini', visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/fleet-mobile-bad.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => finding.category === 'overflow'));
    assert.ok(findings.some((finding) => finding.category === 'form_visibility' && /date and time values/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'form_visibility' && /too narrow/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'form_visibility' && /not fully visible/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'clipping'));
    assert.ok(findings.some((finding) => /short viewport/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.hardFail === true));
});

test('buildFleetMobileFilterFindings flags controls peeking out of the mobile filter viewport', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-short',
        viewportWidth: 400,
        state: {
            available: true,
            isOpen: true,
            sheetHeightRatio: 1,
            sheetHorizontalOverflowPx: 0,
            displayTexts: ['20/04/2026', '10:00', '22/04/2026', '18:00'],
            selectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleSelectedFilterLabels: ['Featured', 'Lamborghini'],
            visibleFilledFieldCount: 4,
            visibleFilterSelectCount: 2,
            dateTimeFields: [
                { key: 'fleet-pickup-date', widthRatio: 0.93, rect: { width: 372, height: 52 }, clipX: 0, clipY: 0 },
                { key: 'fleet-pickup-time', widthRatio: 0.93, rect: { width: 372, height: 52 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-date', widthRatio: 0.93, rect: { width: 372, height: 52 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-time', widthRatio: 0.93, rect: { width: 372, height: 52 }, clipX: 0, clipY: 0 }
            ],
            controls: [
                { key: 'fleet-sidebar__select js-fleet-brand-select', kind: 'select', text: 'Lamborghini', rect: { top: 508, bottom: 558, width: 372, height: 50 }, clipX: 0, clipY: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0, visibleIntersectionHeight: 50 },
                { key: 'fleet-sidebar__select js-fleet-type-select', kind: 'select', text: 'Convertible', rect: { top: 605, bottom: 655, width: 372, height: 50 }, clipX: 0, clipY: 0, visibleInViewport: false, fullyVisibleInViewport: false, viewportClipPx: 47, visibleIntersectionHeight: 3 }
            ],
            screenshotPath: '/tmp/fleet-mobile-filter-peeking.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => finding.category === 'form_visibility' && /not fully visible/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'clipping' && /partially visible/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.hardFail === true));
});

test('buildFleetMobileFilterFindings flags duplicate mobile filter apply CTAs above the schedule controls', () => {
    const findings = buildFleetMobileFilterFindings({
        route: '/fleet.html',
        viewportName: 'mobile-wide-short',
        viewportWidth: 432,
        state: {
            available: true,
            isOpen: true,
            sheetHeightRatio: 0.86,
            sheetHorizontalOverflowPx: 0,
            visibleInlineApplyButtonCount: 1,
            displayTexts: ['21/04/2026', '10:00', '23/04/2026', '18:00'],
            selectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleSelectedFilterLabels: ['Featured', 'Lamborghini', 'Convertible'],
            visibleFilledFieldCount: 4,
            visibleFilterSelectCount: 3,
            dateTimeFields: [
                { key: 'fleet-pickup-date', widthRatio: 0.93, rect: { width: 380, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-pickup-time', widthRatio: 0.93, rect: { width: 380, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-date', widthRatio: 0.93, rect: { width: 380, height: 56 }, clipX: 0, clipY: 0 },
                { key: 'fleet-return-time', widthRatio: 0.93, rect: { width: 380, height: 56 }, clipX: 0, clipY: 0 }
            ],
            controls: [
                { key: 'fleet-filter-close fleet-filter-close--inline', kind: 'button', text: 'Show 6 cars', rect: { width: 400, height: 48 }, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-sidebar__select js-fleet-brand-select', kind: 'select', text: 'Lamborghini', rect: { width: 400, height: 50 }, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'fleet-sidebar__select js-fleet-type-select', kind: 'select', text: 'Convertible', rect: { width: 400, height: 50 }, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/fleet-mobile-duplicate-apply.png'
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'cta_hierarchy' &&
        /duplicate apply CTA/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildMobileNavDrawerFindings flags uneven wrapped mobile menu buttons', () => {
    const findings = buildMobileNavDrawerFindings({
        route: '/app/reserve/page.html',
        viewportName: 'mobile-modern',
        viewportWidth: 393,
        state: {
            available: true,
            isOpen: true,
            viewportHeight: 803,
            panelHorizontalOverflowPx: 0,
            panelInitialScrollOverflowPx: 115,
            visiblePrimaryActionCount: 1,
            visibleSecondaryActionCount: 2,
            groups: [
                {
                    key: 'quick',
                    available: true,
                    display: 'flex',
                    gridTemplateColumns: 'none',
                    visibleChildCount: 3,
                    widthSpreadPx: 45.77,
                    heightSpreadPx: 0,
                    minChildHeight: 44,
                    visualIconCount: 0,
                    children: [
                        { text: 'Call', hasVisualIcon: false },
                        { text: 'Email', hasVisualIcon: false },
                        { text: 'WhatsApp', hasVisualIcon: false }
                    ],
                    partiallyVisibleChildren: []
                },
                {
                    key: 'nav',
                    available: true,
                    display: 'flex',
                    gridTemplateColumns: 'none',
                    visibleChildCount: 7,
                    widthSpreadPx: 33.88,
                    heightSpreadPx: 0,
                    minChildHeight: 44,
                    partiallyVisibleChildren: []
                },
                {
                    key: 'brands',
                    available: true,
                    display: 'flex',
                    gridTemplateColumns: 'none',
                    visibleChildCount: 5,
                    widthSpreadPx: 41.73,
                    heightSpreadPx: 0,
                    minChildHeight: 44,
                    partiallyVisibleChildren: []
                },
                {
                    key: 'browse',
                    available: true,
                    display: 'flex',
                    gridTemplateColumns: 'none',
                    visibleChildCount: 5,
                    widthSpreadPx: 53.44,
                    heightSpreadPx: 0,
                    minChildHeight: 44,
                    partiallyVisibleChildren: []
                },
                {
                    key: 'actions',
                    available: true,
                    display: 'grid',
                    gridTemplateColumns: '337px',
                    visibleChildCount: 3,
                    widthSpreadPx: 0,
                    heightSpreadPx: 0,
                    minChildHeight: 48.8,
                    partiallyVisibleChildren: [
                        { text: 'WhatsApp now', viewportClipPx: 38.69 }
                    ]
                }
            ],
            screenshotPath: '/tmp/mobile-nav-drawer-bad.png'
        },
        screenshotPath: '/tmp/page.png'
    });

    assert.ok(findings.some((finding) => finding.category === 'layout_homogeneity' && /uneven button rows/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'interaction_state' && /scalable dropdowns/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'visual_affordance' && /visible icons/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'cta_hierarchy' && /duplicate secondary CTAs/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'clipping' && /partially visible/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.hardFail === true));
});

test('buildMobileNavDrawerFindings accepts stable compact mobile menu grids', () => {
    const groups = [
        ['quick', 3, 107],
        ['nav', 7, 107],
        ['actions', 1, 337]
    ].map(([key, count, width]) => ({
        key,
        available: true,
        display: 'grid',
        gridTemplateColumns: key === 'actions' ? '337px' : `${width}px ${width}px`,
        visibleChildCount: count,
        widthSpreadPx: 0,
        heightSpreadPx: 0,
        minChildHeight: key === 'actions' ? 48.8 : 40,
        visualIconCount: key === 'quick' ? 3 : 0,
        partiallyVisibleChildren: []
    }));

    const findings = buildMobileNavDrawerFindings({
        route: '/app/reserve/page.html',
        viewportName: 'mobile-modern',
        viewportWidth: 393,
        state: {
            available: true,
            isOpen: true,
            panelHorizontalOverflowPx: 0,
            panelInitialScrollOverflowPx: 0,
            visiblePrimaryActionCount: 1,
            visibleSecondaryActionCount: 0,
            groups,
            disclosures: [
                {
                    key: 'brands',
                    available: true,
                    isOpen: false,
                    summaryHeight: 46,
                    linkCount: 5,
                    visibleLinkCount: 0,
                    visibleWhileClosed: false
                },
                {
                    key: 'browse',
                    available: true,
                    isOpen: false,
                    summaryHeight: 46,
                    linkCount: 5,
                    visibleLinkCount: 0,
                    visibleWhileClosed: false
                }
            ],
            screenshotPath: '/tmp/mobile-nav-drawer-good.png'
        },
        screenshotPath: '/tmp/page.png'
    });

    assert.equal(findings.length, 0);
});

test('buildMobileNavDrawerFindings flags expanded mobile brand/type dropdowns', () => {
    const findings = buildMobileNavDrawerFindings({
        route: '/',
        viewportName: 'mobile-modern',
        viewportWidth: 393,
        state: {
            available: true,
            isOpen: true,
            panelHorizontalOverflowPx: 0,
            panelInitialScrollOverflowPx: 0,
            visiblePrimaryActionCount: 1,
            visibleSecondaryActionCount: 0,
            groups: [
                { key: 'quick', available: true, display: 'grid', visibleChildCount: 3, widthSpreadPx: 0, heightSpreadPx: 0, minChildHeight: 58, visualIconCount: 3, partiallyVisibleChildren: [] },
                { key: 'nav', available: true, display: 'grid', visibleChildCount: 7, widthSpreadPx: 0, heightSpreadPx: 0, minChildHeight: 40, partiallyVisibleChildren: [] },
                { key: 'actions', available: true, display: 'grid', visibleChildCount: 1, widthSpreadPx: 0, heightSpreadPx: 0, minChildHeight: 48, partiallyVisibleChildren: [] }
            ],
            disclosures: [
                { key: 'brands', available: true, isOpen: true, summaryHeight: 46, linkCount: 9, visibleLinkCount: 9, visibleWhileClosed: false },
                { key: 'browse', available: true, isOpen: false, summaryHeight: 34, linkCount: 8, visibleLinkCount: 2, visibleWhileClosed: true }
            ],
            screenshotPath: '/tmp/mobile-nav-drawer-expanded.png'
        },
        screenshotPath: '/tmp/page.png'
    });

    assert.ok(findings.some((finding) => finding.category === 'layout_homogeneity' && /expands brand or car-type lists/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'form_visibility' && /collapsed tap targets/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.hardFail === true));
});

test('buildPageDepthScanFindings flags mobile card action groups that dominate the card', () => {
    const findings = buildPageDepthScanFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/fleet-depth-1.png'
                }
            ],
            cardActionMetrics: [
                {
                    label: 'Huracan EVO Spyder',
                    cardRect: { top: 0, bottom: 520, left: 0, right: 390, width: 390, height: 520 },
                    actionGroupHeightRatio: 0.42,
                    secondaryActionHeightRatio: 0.24,
                    secondaryDominanceRatio: 2.1,
                    secondaryMaxButtonWidthRatio: 0.99,
                    secondaryInlinePaddingPx: 0,
                    primaryMaxHeight: 60,
                    secondaryMaxHeight: 60,
                    primaryCount: 1,
                    secondaryCount: 2,
                    secondaryRowCount: 2,
                    buttonMaxRadiusPx: 999,
                    buttonRadiusSpreadPx: 999
                }
            ]
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => finding.category === 'cta_hierarchy' && /dominates/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'cta_hierarchy' && /overpowering/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'shape_drift' && /inconsistent button shapes/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'spacing' && /touch the card edge/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.hardFail === true));
});

test('buildPageDepthScanFindings reports repeated mobile card patterns instead of only the first card', () => {
    const repeatedCard = (label) => ({
        label,
        cardRect: { top: 0, bottom: 520, left: 0, right: 390, width: 390, height: 520 },
        actionGroupHeightRatio: 0.38,
        secondaryActionHeightRatio: 0.24,
        secondaryDominanceRatio: 1,
        secondaryMaxButtonWidthRatio: 0.99,
        secondaryInlinePaddingPx: 1,
        primaryMaxHeight: 52,
        secondaryMaxHeight: 48,
        secondaryCount: 2,
        secondaryRowCount: 2,
        buttonMaxRadiusPx: 8,
        buttonRadiusSpreadPx: 0
    });
    const findings = buildPageDepthScanFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/fleet-depth-1.png'
                }
            ],
            cardActionMetrics: [
                repeatedCard('Huracan EVO Spyder'),
                repeatedCard('296 GTS'),
                repeatedCard('992 GT3')
            ]
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => (
        /repeated mobile card pattern/i.test(finding.message) &&
        /affectedCards=3/.test(finding.evidence)
    )));
});

test('buildPageDepthScanFindings accepts contained mobile card actions', () => {
    const findings = buildPageDepthScanFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/fleet-depth-clean.png'
                }
            ],
            cardActionMetrics: [
                {
                    label: 'G63 AMG',
                    cardRect: { top: 0, bottom: 540, left: 16, right: 374, width: 358, height: 540 },
                    actionGroupHeightRatio: 0.26,
                    secondaryActionHeightRatio: 0.17,
                    secondaryDominanceRatio: 0.9,
                    secondaryMaxButtonWidthRatio: 0.5,
                    splitContactGroupWidthRatio: 0.997,
                    splitContactSideGapPx: 1,
                    secondaryInlinePaddingPx: 0,
                    primaryMaxHeight: 52,
                    secondaryMaxHeight: 48,
                    secondaryCount: 2,
                    secondaryRowCount: 1,
                    buttonMaxRadiusPx: 8,
                    buttonRadiusSpreadPx: 0
                }
            ]
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.equal(findings.length, 0);
});

test('buildPageDepthScanFindings flags stacked mobile contact buttons', () => {
    const findings = buildPageDepthScanFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/fleet-depth-narrow-contact-bar.png'
                }
            ],
            cardActionMetrics: [
                {
                    label: 'Huracan EVO Spyder',
                    cardRect: { top: 0, bottom: 540, left: 16, right: 374, width: 358, height: 540 },
                    actionGroupHeightRatio: 0.26,
                    secondaryActionHeightRatio: 0.2,
                    secondaryDominanceRatio: 0.9,
                    secondaryMaxButtonWidthRatio: 0.9,
                    splitContactGroupWidthRatio: 0.9,
                    splitContactSideGapPx: 18,
                    secondaryInlinePaddingPx: 16,
                    primaryMaxHeight: 52,
                    secondaryMaxHeight: 64,
                    secondaryCount: 2,
                    secondaryRowCount: 2,
                    buttonMaxRadiusPx: 8,
                    buttonRadiusSpreadPx: 0
                }
            ]
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'cta_hierarchy' &&
        /stacked.*split bottom bar/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildPageDepthScanFindings flags split contact bars that overflow the mobile card shell', () => {
    const findings = buildPageDepthScanFindings({
        route: '/fleet.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/fleet-depth-overflow-contact-bar.png'
                }
            ],
            cardActionMetrics: [
                {
                    label: 'Huracan EVO Spyder',
                    cardRect: { top: 0, bottom: 540, left: 18, right: 372, width: 354, height: 540 },
                    actionGroupHeightRatio: 0.26,
                    secondaryActionHeightRatio: 0.11,
                    secondaryDominanceRatio: 0.9,
                    secondaryMaxButtonWidthRatio: 0.5,
                    splitContactGroupWidthRatio: 1.09,
                    splitContactSideGapPx: 0,
                    splitContactOverflowPx: 18,
                    secondaryInlinePaddingPx: 0,
                    primaryMaxHeight: 52,
                    secondaryMaxHeight: 54,
                    secondaryCount: 2,
                    secondaryRowCount: 1,
                    buttonMaxRadiusPx: 8,
                    buttonRadiusSpreadPx: 0
                }
            ]
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'spacing' &&
        /overflows outside the mobile card shell/i.test(finding.message) &&
        /splitContactOverflowPx=18/.test(finding.evidence) &&
        finding.hardFail === true
    )));
});

test('buildPageDepthScanFindings accepts full-width desktop fleet card contact actions', () => {
    const fullWidthCard = (label) => ({
        label,
        cardRect: { top: 0, bottom: 620, left: 0, right: 390, width: 390, height: 620 },
        actionGroupHeightRatio: 0.19,
        secondaryActionHeightRatio: 0.08,
        secondaryDominanceRatio: 0.7,
        secondaryMaxButtonWidthRatio: 0.5,
        splitContactGroupWidthRatio: 1,
        splitContactSideGapPx: 0,
        splitContactOverflowPx: 0,
        secondaryInlinePaddingPx: 0,
        primaryMaxHeight: 48,
        secondaryMaxHeight: 50,
        primaryCount: 1,
        secondaryCount: 2,
        secondaryRowCount: 1,
        buttonMaxRadiusPx: 8,
        buttonRadiusSpreadPx: 0
    });
    const findings = buildPageDepthScanFindings({
        route: '/fleet.html',
        viewportName: 'desktop-wide',
        viewportWidth: 1707,
        state: {
            available: true,
            frames: [
                {
                    viewportTop: 0,
                    viewportBottom: 960,
                    screenshotPath: '/tmp/fleet-desktop-full-width.png'
                }
            ],
            cardActionMetrics: [
                fullWidthCard('Huracan EVO Spyder'),
                fullWidthCard('Ferrari 296 GTS')
            ]
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.equal(findings.length, 0);
});

test('buildPageDepthScanFindings flags desktop fleet cards with side gutters around contact actions', () => {
    const findings = buildPageDepthScanFindings({
        route: '/fleet.html',
        viewportName: 'desktop-wide',
        viewportWidth: 1707,
        state: {
            available: true,
            frames: [
                {
                    viewportTop: 0,
                    viewportBottom: 960,
                    screenshotPath: '/tmp/fleet-desktop-contained.png'
                }
            ],
            cardActionMetrics: [
                {
                    label: 'Cullinan Black Badge',
                    cardRect: { top: 0, bottom: 620, left: 0, right: 390, width: 390, height: 620 },
                    actionGroupHeightRatio: 0.18,
                    secondaryActionHeightRatio: 0.074,
                    secondaryDominanceRatio: 0.68,
                    secondaryMaxButtonWidthRatio: 0.44,
                    splitContactGroupWidthRatio: 0.89,
                    splitContactSideGapPx: 20,
                    splitContactOverflowPx: 0,
                    secondaryInlinePaddingPx: 20,
                    primaryMaxHeight: 48,
                    secondaryMaxHeight: 46,
                    primaryCount: 1,
                    secondaryCount: 2,
                    secondaryRowCount: 1,
                    buttonMaxRadiusPx: 8,
                    buttonRadiusSpreadPx: 0
                }
            ]
        },
        screenshotPath: '/tmp/fleet.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'spacing' &&
        /full desktop card width/i.test(finding.message) &&
        /splitContactSideGapPx=20/.test(finding.evidence) &&
        finding.hardFail === true
    )));
});

test('buildPageDepthScanFindings flags mobile section width drift', () => {
    const findings = buildPageDepthScanFindings({
        route: '/',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    index: 1,
                    scrollY: 0,
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/home-mobile-width-drift.png',
                    metric: {
                        visibleMajorElementCount: 7,
                        largestBlankGapRatio: 0.18,
                        actionMetrics: [],
                        dateControlMetrics: [],
                        surfaceWidthMetrics: [
                            {
                                selector: '.hero-lab__cta--primary',
                                label: 'Rent a luxury car',
                                widthRatio: 0.82,
                                inlinePaddingPx: 24
                            },
                            {
                                selector: '.hero-lab-overlay',
                                label: 'Choose your dates',
                                widthRatio: 0.94,
                                inlinePaddingPx: 12
                            },
                            {
                                selector: '.home-section__shell',
                                label: 'Featured fleet',
                                widthRatio: 0.93,
                                inlinePaddingPx: 13
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/home.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'layout_homogeneity' &&
        /consistent readable width/i.test(finding.message) &&
        finding.screenshotPath === '/tmp/home-mobile-width-drift.png'
    )));
});

test('buildPageDepthScanFindings flags mobile action groups with mismatched button widths', () => {
    const findings = buildPageDepthScanFindings({
        route: '/',
        viewportName: 'mobile-modern',
        viewportWidth: 400,
        state: {
            available: true,
            frames: [
                {
                    index: 1,
                    scrollY: 0,
                    viewportTop: 0,
                    viewportBottom: 803,
                    screenshotPath: '/tmp/home-mobile-action-width-drift.png',
                    metric: {
                        visibleMajorElementCount: 7,
                        largestBlankGapRatio: 0.18,
                        actionMetrics: [],
                        dateControlMetrics: [],
                        surfaceWidthMetrics: [
                            {
                                selector: '.hero-lab__cta--primary',
                                label: 'Rent a luxury car',
                                widthRatio: 0.8,
                                inlinePaddingPx: 16
                            },
                            {
                                selector: '.hero-lab-overlay',
                                label: 'Choose your dates',
                                widthRatio: 0.88,
                                inlinePaddingPx: 16
                            }
                        ],
                        actionGroupWidthMetrics: [
                            {
                                selector: '.hero-lab__actions',
                                childCount: 2,
                                rowCount: 2,
                                minChildWidthRatio: 0.265,
                                maxChildWidthRatio: 0.8,
                                widthDriftRatio: 0.535,
                                sidePaddingDriftPx: 214,
                                children: [
                                    {
                                        selector: '.hero-lab__cta--primary',
                                        label: 'Rent a luxury car',
                                        widthRatio: 0.8,
                                        inlinePaddingPx: 16
                                    },
                                    {
                                        selector: '.hero-lab__cta--secondary',
                                        label: 'View fleet',
                                        widthRatio: 0.265,
                                        inlinePaddingPx: 229
                                    }
                                ]
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/home.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'layout_homogeneity' &&
        /action group mixes unrelated button widths/i.test(finding.message) &&
        finding.hardFail === true
    )));
});

test('buildPageDepthScanFindings ignores inner form controls for mobile section width rhythm', () => {
    const findings = buildPageDepthScanFindings({
        route: '/',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    index: 2,
                    scrollY: 692,
                    viewportTop: 692,
                    viewportBottom: 1536,
                    screenshotPath: '/tmp/home-mobile-form-inner-width.png',
                    metric: {
                        visibleMajorElementCount: 8,
                        largestBlankGapRatio: 0.18,
                        actionMetrics: [],
                        dateControlMetrics: [],
                        surfaceWidthMetrics: [
                            {
                                selector: 'div.hero-lab__content-box',
                                label: 'Dubai luxury car rental',
                                widthRatio: 0.877,
                                inlinePaddingPx: 24
                            },
                            {
                                selector: 'section.hero-lab-overlay',
                                label: 'Choose your dates',
                                widthRatio: 0.877,
                                inlinePaddingPx: 24
                            },
                            {
                                selector: 'form.hero-lab-overlay__form',
                                label: 'Pickup date Return date Pickup time',
                                className: 'hero-lab-overlay__form',
                                widthRatio: 0.79,
                                inlinePaddingPx: 41
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/home.png'
    });

    assert.equal(findings.some((finding) => finding.category === 'layout_homogeneity'), false);
});

test('buildPageDepthScanFindings flags generic visual scan outliers beyond known cards', () => {
    const findings = buildPageDepthScanFindings({
        route: '/contact.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    index: 2,
                    scrollY: 640,
                    viewportTop: 640,
                    viewportBottom: 1484,
                    screenshotPath: '/tmp/contact-depth-2.png',
                    metric: {
                        visibleMajorElementCount: 6,
                        largestBlankGapRatio: 0.51,
                        actionMetrics: [
                            {
                                label: 'WhatsApp',
                                selector: 'a.contact-whatsapp',
                                rect: { width: 384, height: 70 },
                                widthRatio: 0.985,
                                areaRatio: 0.082,
                                edgePaddingPx: 3,
                                isContactAction: true,
                                isSecondaryAction: true,
                                insideCard: false
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/contact.png'
    });

    assert.ok(findings.some((finding) => finding.category === 'layout_gap'));
    assert.ok(findings.some((finding) => finding.category === 'cta_hierarchy' && /contact action/i.test(finding.message)));
    assert.ok(findings.some((finding) => finding.category === 'spacing' && /viewport edge/i.test(finding.message)));
});

test('buildPageDepthScanFindings flags broken text encoding while scrolling', () => {
    const findings = buildPageDepthScanFindings({
        route: '/app/reserve/page.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    index: 1,
                    scrollY: 0,
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/reserve-depth-text.png',
                    metric: {
                        visibleMajorElementCount: 8,
                        largestBlankGapRatio: 0.2,
                        actionMetrics: [],
                        dateControlMetrics: [],
                        textEncodingIssues: [
                            {
                                selector: 'button#continueToPaymentBtn',
                                text: 'Continue to Guest Details \u00c2\u2020\u2019'
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/reserve.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'text_encoding' &&
        /scrolling/i.test(finding.message) &&
        finding.hardFail === true &&
        finding.screenshotPath === '/tmp/reserve-depth-text.png'
    )));
});

test('buildPageDepthScanFindings flags low contrast text while scrolling', () => {
    const findings = buildPageDepthScanFindings({
        route: '/lamborghini-huracan-evo-spyder-rental-dubai.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        state: {
            available: true,
            frames: [
                {
                    index: 3,
                    scrollY: 1280,
                    viewportTop: 1280,
                    viewportBottom: 2124,
                    screenshotPath: '/tmp/vehicle-depth-contrast.png',
                    metric: {
                        visibleMajorElementCount: 9,
                        largestBlankGapRatio: 0.16,
                        actionMetrics: [],
                        dateControlMetrics: [],
                        textEncodingIssues: [],
                        textContrastIssues: [
                            {
                                selector: '.vehicle-pdp-gallery-card__copy h3',
                                text: 'Motion belongs after the booking logic.',
                                contrastRatio: 1.18,
                                requiredRatio: 4.5,
                                color: 'rgb(255, 255, 255)',
                                effectiveBackground: 'rgb(250, 248, 243)'
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/vehicle.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'contrast' &&
        /while scrolling/i.test(finding.message) &&
        finding.hardFail === true &&
        finding.screenshotPath === '/tmp/vehicle-depth-contrast.png'
    )));
});

test('buildPageDepthScanFindings flags desktop border weight drift between form boxes', () => {
    const findings = buildPageDepthScanFindings({
        route: '/app/reserve/page.html',
        viewportName: 'laptop',
        viewportWidth: 1366,
        state: {
            available: true,
            frames: [
                {
                    index: 2,
                    scrollY: 768,
                    viewportTop: 768,
                    viewportBottom: 1536,
                    screenshotPath: '/tmp/reserve-desktop-border.png',
                    metric: {
                        visibleMajorElementCount: 8,
                        largestBlankGapRatio: 0.2,
                        actionMetrics: [],
                        dateControlMetrics: [],
                        textEncodingIssues: [],
                        formBorderStyleMetrics: [
                            {
                                role: 'panel',
                                selector: '.schedule-card',
                                label: 'Trip schedule',
                                borderWidthPx: 1,
                                borderAlpha: 0.18,
                                borderVisualWeight: 0.09
                            },
                            {
                                role: 'panel',
                                selector: '.delivery-card',
                                label: 'Delivery address',
                                borderWidthPx: 2,
                                borderAlpha: 1,
                                borderVisualWeight: 0.82
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/reserve.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'border_weight_drift' &&
        /consistent border weight/i.test(finding.message) &&
        finding.hardFail === true &&
        finding.screenshotPath === '/tmp/reserve-desktop-border.png'
    )));
});

test('buildPageDepthScanFindings flags booking date controls prefilled before today', () => {
    const findings = buildPageDepthScanFindings({
        route: '/app/reserve/page.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        auditDateIso: '2026-04-21',
        state: {
            available: true,
            frames: [
                {
                    index: 1,
                    scrollY: 0,
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/reserve-depth-1.png',
                    metric: {
                        visibleMajorElementCount: 8,
                        largestBlankGapRatio: 0.2,
                        actionMetrics: [],
                        dateControlMetrics: [
                            {
                                key: 'startDate',
                                selector: 'input#startDate.input',
                                label: 'Delivery Date',
                                value: '2026-04-20',
                                displayText: 'Delivery Date * 20/04/2026',
                                min: '2026-04-01',
                                rect: { width: 340, height: 60 }
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/reserve.png'
    });

    assert.ok(findings.some((finding) => (
        finding.category === 'date_currentness' &&
        /past date/i.test(finding.message) &&
        /today=2026-04-21/.test(finding.evidence) &&
        finding.hardFail === true
    )));
    assert.ok(findings.some((finding) => (
        finding.category === 'date_currentness' &&
        /allows dates before today/i.test(finding.message)
    )));
});

test('buildPageDepthScanFindings accepts booking date controls set to today or future', () => {
    const findings = buildPageDepthScanFindings({
        route: '/app/reserve/page.html',
        viewportName: 'mobile-modern',
        viewportWidth: 390,
        auditDateIso: '2026-04-21',
        state: {
            available: true,
            frames: [
                {
                    index: 1,
                    scrollY: 0,
                    viewportTop: 0,
                    viewportBottom: 844,
                    screenshotPath: '/tmp/reserve-depth-clean.png',
                    metric: {
                        visibleMajorElementCount: 8,
                        largestBlankGapRatio: 0.2,
                        actionMetrics: [],
                        dateControlMetrics: [
                            {
                                key: 'startDate',
                                selector: 'input#startDate.input',
                                label: 'Delivery Date',
                                value: '2026-04-21',
                                displayText: 'Delivery Date * 21/04/2026',
                                min: '2026-04-21',
                                rect: { width: 340, height: 60 }
                            },
                            {
                                key: 'endDate',
                                selector: 'input#endDate.input',
                                label: 'Return Date',
                                value: '2026-04-23',
                                displayText: 'Return Date * 23/04/2026',
                                min: '2026-04-21',
                                rect: { width: 340, height: 60 }
                            }
                        ]
                    }
                }
            ],
            cardActionMetrics: []
        },
        screenshotPath: '/tmp/reserve.png'
    });

    assert.equal(findings.filter((finding) => finding.category === 'date_currentness').length, 0);
});

test('buildContactFormStateFindings accepts filled contact controls', () => {
    const findings = buildContactFormStateFindings({
        route: '/contact.html',
        viewportName: 'mobile-short',
        viewportWidth: 400,
        state: {
            available: true,
            horizontalOverflowPx: 0,
            controls: [
                { key: 'contactName', text: 'Alex Morgan', value: 'Alex Morgan', expectedText: 'Alex Morgan', visible: true, rect: { width: 340, height: 48 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'contactEmail', text: 'alex.morgan@example.com', value: 'alex.morgan@example.com', expectedText: 'alex.morgan@example.com', visible: true, rect: { width: 340, height: 48 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'contactSubject', text: 'Reservation', value: 'reservation', expectedText: 'reservation', visible: true, rect: { width: 340, height: 48 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'contactMessage', text: 'I need a two-day Dubai rental.', value: 'I need a two-day Dubai rental.', expectedText: 'I need a two-day Dubai rental.', visible: true, rect: { width: 340, height: 120 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'contactSubmitButton', text: 'Send message', value: 'Send message', expectedText: '', visible: true, rect: { width: 340, height: 48 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/contact-filled.png'
        },
        screenshotPath: '/tmp/contact.png'
    });

    assert.equal(findings.length, 0);
});

test('buildReserveBookingIntentFindings flags a broken realistic reserve handoff', () => {
    const findings = buildReserveBookingIntentFindings({
        route: '/app/reserve/page.html',
        viewportName: 'mobile-short',
        viewportWidth: 400,
        state: {
            available: true,
            horizontalOverflowPx: 0,
            canAdvanceFromSchedule: false,
            step2Visible: false,
            activeStepId: 'step1',
            scheduleControls: [
                { key: 'startDate', text: '2026-08-20', value: '2026-08-20', expectedText: '2026-08-20', visible: true, rect: { width: 340, height: 48 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'endDate', text: '', value: '', expectedText: '2026-08-22', visible: true, rect: { width: 160, height: 40 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'pickupTime', text: '10:00', value: '10:00', expectedText: '10:00', visible: true, rect: { width: 160, height: 40 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'dropoffTime', text: '10:00', value: '10:00', expectedText: '18:00', visible: true, rect: { width: 160, height: 40 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 },
                { key: 'pickupLocation', text: 'Atlantis The Royal, Palm Jumeirah', value: 'Atlantis The Royal, Palm Jumeirah', expectedText: 'Atlantis The Royal, Palm Jumeirah', visible: true, rect: { width: 340, height: 48 }, clipX: 0, visibleInViewport: true, fullyVisibleInViewport: true, viewportClipPx: 0 }
            ],
            guestControls: [
                { key: 'fullName', text: '', value: '', expectedText: 'Sofia Bennett', visible: false, rect: { width: 0, height: 0 }, clipX: 0, visibleInViewport: false, fullyVisibleInViewport: false, viewportClipPx: 0 },
                { key: 'passport', text: '', value: '', expectedText: 'XK938271', visible: false, rect: { width: 0, height: 0 }, clipX: 0, visibleInViewport: false, fullyVisibleInViewport: false, viewportClipPx: 0 },
                { key: 'phone', text: '', value: '', expectedText: '+971501234567', visible: false, rect: { width: 0, height: 0 }, clipX: 0, visibleInViewport: false, fullyVisibleInViewport: false, viewportClipPx: 0 },
                { key: 'email', text: '', value: '', expectedText: 'sofia.bennett@example.com', visible: false, rect: { width: 0, height: 0 }, clipX: 0, visibleInViewport: false, fullyVisibleInViewport: false, viewportClipPx: 0 }
            ],
            screenshotPath: '/tmp/reserve-broken.png'
        },
        screenshotPath: '/tmp/reserve.png'
    });

    assert.ok(findings.some((finding) => finding.category === 'interaction_state'));
    assert.ok(findings.some((finding) => finding.category === 'form_visibility'));
    assert.ok(findings.some((finding) => finding.hardFail === true));
});

test('summarizeSmokeFailures fails bad pages and missing screenshots but allows review by default', () => {
    const report = {
        pages: [
            { route: '/', viewport: 'mobile-short', assessment: { status: 'review', hardFails: [] }, artifacts: { viewportScreenshot: __filename } },
            { route: '/fleet.html', viewport: 'mobile-short', assessment: { status: 'bad', hardFails: [{ message: 'overflow' }] }, artifacts: { viewportScreenshot: __filename } },
            { route: '/contact.html', viewport: 'mobile-short', assessment: { status: 'good', hardFails: [] }, artifacts: { viewportScreenshot: 'missing.png' } }
        ]
    };
    const soft = summarizeSmokeFailures(report, false);
    const strict = summarizeSmokeFailures(report, true);

    assert.equal(soft.reviewPages.length, 0);
    assert.equal(strict.reviewPages.length, 1);
    assert.equal(soft.failed, true);
    assert.equal(soft.badPages.length, 1);
    assert.equal(soft.missingScreenshots.length, 1);
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

test('buildDeterministicFindings flags reserve mobile when delivery address is buried below the useful first view', () => {
    const findings = buildDeterministicFindings({
        route: '/app/reserve/page.html',
        viewport: { name: 'mobile-modern' },
        profile: 'reserve',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            viewportWidth: 390,
            viewportHeight: 844,
            headerFamily: 'lab-header',
            visualIntent: 'modern_light_system',
            hasVisualMedia: false,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            formRect: { top: 332, bottom: 1252, width: 350, height: 920 },
            reserveIntroRect: { top: 98, bottom: 206, width: 350, height: 108 },
            reserveIntroPanelRect: null,
            reservePageHeadingRect: { top: 116, bottom: 184, width: 260, height: 68 },
            reserveStepPillsRect: { top: 215, bottom: 275, width: 350, height: 60 },
            reserveScheduleCardRect: { top: 332, bottom: 993, width: 350, height: 661 },
            reserveDeliveryCardRect: { top: 1009, bottom: 1252, width: 350, height: 243 },
            reserveStartDateRect: { top: 480, bottom: 530, width: 280, height: 50 },
            reservePickupLocationRect: { top: 1134, bottom: 1182, width: 280, height: 48 }
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/reserve-mobile-buried-location.png'
        }
    });
    const finding = findings.find((entry) => (
        entry.category === 'first_viewport_layout' &&
        /reserve mobile first viewport/i.test(entry.message)
    ));

    assert.ok(finding);
    assert.equal(finding.severity, 'high');
    assert.match(finding.evidence, /deliveryCardTopRatio/);
    assert.match(finding.evidence, /pickupLocationTopRatio/);
});

test('buildDeterministicFindings accepts reserve mobile when delivery address is close enough to the first view', () => {
    const findings = buildDeterministicFindings({
        route: '/app/reserve/page.html',
        viewport: { name: 'mobile-modern' },
        profile: 'reserve',
        metrics: {
            horizontalOverflowPx: 0,
            visibleH1Count: 1,
            viewportWidth: 390,
            viewportHeight: 844,
            headerFamily: 'lab-header',
            visualIntent: 'modern_light_system',
            hasVisualMedia: false,
            hasNav: true,
            headerOcclusionPx: 0,
            clippedElements: [],
            overlaps: [],
            brokenMedia: [],
            formRect: { top: 300, bottom: 1120, width: 350, height: 820 },
            reserveIntroRect: { top: 88, bottom: 186, width: 350, height: 98 },
            reserveIntroPanelRect: null,
            reservePageHeadingRect: { top: 108, bottom: 168, width: 260, height: 60 },
            reserveStepPillsRect: { top: 194, bottom: 248, width: 350, height: 54 },
            reserveScheduleCardRect: { top: 298, bottom: 844, width: 350, height: 546 },
            reserveDeliveryCardRect: { top: 860, bottom: 1108, width: 350, height: 248 },
            reserveStartDateRect: { top: 414, bottom: 464, width: 280, height: 50 },
            reservePickupLocationRect: { top: 992, bottom: 1040, width: 280, height: 48 }
        },
        consoleErrors: [],
        networkErrors: {
            requestFailures: [],
            criticalResponses: [],
            pageErrors: []
        },
        artifacts: {
            viewportScreenshot: '/tmp/reserve-mobile-usable-location.png'
        }
    });

    assert.equal(findings.some((entry) => (
        entry.category === 'first_viewport_layout' &&
        /reserve mobile first viewport/i.test(entry.message)
    )), false);
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
