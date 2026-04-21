function normalizeRouteToken(route = '') {
  const pathname = String(route || '/').split(/[?#]/)[0] || '/';
  return pathname === '/index.html' ? '/' : pathname;
}

const VIEWPORT_COVERAGE_MATRIX = Object.freeze([
  Object.freeze({
    name: 'mobile-short',
    tier: 'mobile',
    width: 400,
    height: 608,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    coverage: Object.freeze(['critical', 'responsive', 'firstViewport', 'visualAgent', 'mobile', 'shortHeight']),
    intent: 'Short mobile viewport used by browser device mode and older/smaller Android screens.',
  }),
  Object.freeze({
    name: 'mobile-small',
    tier: 'mobile',
    width: 360,
    height: 640,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    coverage: Object.freeze(['critical', 'responsive', 'firstViewport', 'visualAgent', 'mobile']),
    intent: 'Narrow baseline phone width where cards, forms and CTAs are most likely to squeeze.',
  }),
  Object.freeze({
    name: 'mobile-modern',
    tier: 'mobile',
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    coverage: Object.freeze(['critical', 'responsive', 'firstViewport', 'visualAgent', 'mobile', 'functional']),
    intent: 'Main modern phone viewport for everyday iOS/Android checks.',
  }),
  Object.freeze({
    name: 'mobile-wide-short',
    tier: 'mobile',
    width: 432,
    height: 768,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.7,
    coverage: Object.freeze(['critical', 'responsive', 'firstViewport', 'visualAgent', 'mobile', 'shortHeight']),
    intent: 'Wide but height-limited mobile viewport that catches bottom-sheet controls being pushed half out of view.',
  }),
  Object.freeze({
    name: 'mobile-large',
    tier: 'mobile',
    width: 430,
    height: 932,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    coverage: Object.freeze(['responsive', 'mobile']),
    intent: 'Large phone viewport to catch over-expanded mobile spacing and sticky controls.',
  }),
  Object.freeze({
    name: 'tablet-portrait',
    tier: 'tablet',
    width: 768,
    height: 1024,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    coverage: Object.freeze(['critical', 'responsive', 'firstViewport', 'visualAgent', 'tablet', 'functional']),
    intent: 'Portrait tablet and iPad-like layout bridge between mobile and desktop.',
  }),
  Object.freeze({
    name: 'tablet-landscape',
    tier: 'tablet',
    width: 1024,
    height: 768,
    isMobile: false,
    hasTouch: true,
    deviceScaleFactor: 2,
    coverage: Object.freeze(['responsive', 'tablet']),
    intent: 'Landscape tablet where desktop grids often activate with touch constraints.',
  }),
  Object.freeze({
    name: 'laptop-compact',
    tier: 'laptop',
    width: 1280,
    height: 720,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    coverage: Object.freeze(['responsive', 'firstViewport', 'visualAgent', 'desktop', 'shortHeight']),
    intent: 'Short laptop viewport where first-fold hierarchy and sticky headers are fragile.',
  }),
  Object.freeze({
    name: 'laptop',
    tier: 'laptop',
    width: 1366,
    height: 768,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    coverage: Object.freeze(['critical', 'responsive', 'firstViewport', 'visualAgent', 'desktop', 'functional']),
    intent: 'Common laptop baseline.',
  }),
  Object.freeze({
    name: 'desktop-standard',
    tier: 'desktop',
    width: 1440,
    height: 900,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    coverage: Object.freeze(['responsive', 'desktop']),
    intent: 'Standard desktop viewport for ordinary external displays.',
  }),
  Object.freeze({
    name: 'desktop-wide',
    tier: 'desktop',
    width: 1707,
    height: 893,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    coverage: Object.freeze(['critical', 'responsive', 'firstViewport', 'visualAgent', 'desktop']),
    intent: 'Wide desktop viewport used for premium composition and nav/header checks.',
  }),
]);

function cloneViewport(viewport) {
  return {
    name: viewport.name,
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: viewport.deviceScaleFactor,
    tier: viewport.tier,
    coverage: [...viewport.coverage],
    intent: viewport.intent,
  };
}

function getViewportCoverageMatrix(scope = 'critical') {
  const normalizedScope = String(scope || 'critical').trim();

  if (normalizedScope === 'all') {
    return VIEWPORT_COVERAGE_MATRIX.map(cloneViewport);
  }

  return VIEWPORT_COVERAGE_MATRIX
    .filter((viewport) => viewport.coverage.includes(normalizedScope))
    .map(cloneViewport);
}

function resolveViewportTier(viewportName = '', viewportWidth = 0) {
  const knownViewport = VIEWPORT_COVERAGE_MATRIX.find((viewport) => viewport.name === viewportName);

  if (knownViewport?.tier) {
    return knownViewport.tier;
  }

  if (viewportWidth < 760) {
    return 'mobile';
  }

  if (viewportWidth >= 1400) {
    return 'desktop';
  }

  if (viewportWidth >= 1180) {
    return 'laptop';
  }

  return 'tablet';
}

function mergeContracts(baseContract = null, overrideContract = null) {
  if (!baseContract && !overrideContract) {
    return null;
  }

  return Object.freeze({
    ...(baseContract || {}),
    ...(overrideContract || {}),
  });
}

const DESIGN_SYSTEM_CONTRACT = Object.freeze({
  version: '2026-04-21',
  global: Object.freeze({
    forbiddenFonts: Object.freeze(['orbitron']),
    minTextContrastRatio: 4.5,
    minLargeTextContrastRatio: 3,
    maxInternalPanelGapRatio: 0.28,
    maxInternalPanelGapPx: 160,
  }),
  mobileInteractionPolicies: Object.freeze({
    fleet_filter_sheet: Object.freeze({
      tiers: Object.freeze({
        mobile: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 44,
          minFilledFieldWidthRatio: 0.72,
          minUsefulControlWidthPx: 120,
          maxTextClipPx: 2,
          maxViewportClipPx: 2,
          maxHorizontalOverflowPx: 4,
          maxSheetHeightRatio: 0.94,
          minVisibleFilterSelectCount: 2,
          maxInlineApplyButtonCount: 0,
          maxPartiallyVisibleControlClipPx: 2,
          minVisibleFilledFieldCount: 2,
          requiredFilledValues: Object.freeze(['21/04/2026', '23/04/2026', '10:00', '18:00']),
          requiredFilterLabels: Object.freeze(['Lamborghini', 'Convertible']),
        }),
        tablet: Object.freeze({
          policy: 'research',
          minTapTargetPx: 44,
          minFilledFieldWidthRatio: 0.48,
          minUsefulControlWidthPx: 110,
          maxTextClipPx: 2,
          maxViewportClipPx: 2,
          maxHorizontalOverflowPx: 4,
          maxSheetHeightRatio: 0.86,
          minVisibleFilterSelectCount: 2,
          maxPartiallyVisibleControlClipPx: 2,
          minVisibleFilledFieldCount: 2,
          requiredFilledValues: Object.freeze(['21/04/2026', '23/04/2026', '10:00', '18:00']),
          requiredFilterLabels: Object.freeze(['Lamborghini', 'Convertible']),
        }),
      }),
    }),
    mobile_nav_drawer: Object.freeze({
      tiers: Object.freeze({
        mobile: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 40,
          maxHorizontalOverflowPx: 4,
          maxInitialScrollOverflowPx: 4,
          maxButtonWidthSpreadPx: 12,
          maxButtonHeightSpreadPx: 2,
          maxVisibleSecondaryActionCount: 0,
          maxPartiallyVisibleButtonClipPx: 2,
          minQuickActionVisualIconCount: 3,
          maxDefaultOpenDisclosureCount: 0,
          minDisclosureLinkCount: 1,
          minDisclosureSummaryHeightPx: 40,
          requiredGroups: Object.freeze(['quick', 'nav', 'actions']),
          requiredDisclosures: Object.freeze(['brands', 'browse']),
        }),
        tablet: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 40,
          maxHorizontalOverflowPx: 4,
          maxInitialScrollOverflowPx: 16,
          maxButtonWidthSpreadPx: 16,
          maxButtonHeightSpreadPx: 2,
          maxVisibleSecondaryActionCount: 0,
          maxPartiallyVisibleButtonClipPx: 2,
          minQuickActionVisualIconCount: 3,
          maxDefaultOpenDisclosureCount: 0,
          minDisclosureLinkCount: 1,
          minDisclosureSummaryHeightPx: 40,
          requiredGroups: Object.freeze(['quick', 'nav', 'actions']),
          requiredDisclosures: Object.freeze(['brands', 'browse']),
        }),
      }),
    }),
    contact_form_filled: Object.freeze({
      tiers: Object.freeze({
        mobile: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 44,
          minUsefulControlWidthPx: 220,
          maxHorizontalOverflowPx: 4,
          maxViewportClipPx: 2,
          maxTextClipPx: 2,
          requiredFieldKeys: Object.freeze(['contactName', 'contactEmail', 'contactSubject', 'contactMessage', 'contactSubmitButton']),
        }),
        tablet: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 44,
          minUsefulControlWidthPx: 240,
          maxHorizontalOverflowPx: 4,
          maxViewportClipPx: 2,
          maxTextClipPx: 2,
          requiredFieldKeys: Object.freeze(['contactName', 'contactEmail', 'contactSubject', 'contactMessage', 'contactSubmitButton']),
        }),
        laptop: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 40,
          minUsefulControlWidthPx: 260,
          maxHorizontalOverflowPx: 4,
          maxViewportClipPx: 2,
          maxTextClipPx: 2,
          requiredFieldKeys: Object.freeze(['contactName', 'contactEmail', 'contactSubject', 'contactMessage', 'contactSubmitButton']),
        }),
        desktop: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 40,
          minUsefulControlWidthPx: 280,
          maxHorizontalOverflowPx: 4,
          maxViewportClipPx: 2,
          maxTextClipPx: 2,
          requiredFieldKeys: Object.freeze(['contactName', 'contactEmail', 'contactSubject', 'contactMessage', 'contactSubmitButton']),
        }),
      }),
    }),
    reserve_booking_intent: Object.freeze({
      tiers: Object.freeze({
        mobile: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 44,
          minUsefulControlWidthPx: 220,
          maxHorizontalOverflowPx: 4,
          maxViewportClipPx: 2,
          maxTextClipPx: 2,
          requiredScheduleFieldKeys: Object.freeze(['startDate', 'endDate', 'pickupTime', 'dropoffTime', 'pickupLocation']),
          requiredGuestFieldKeys: Object.freeze(['fullName', 'passport', 'phone', 'email']),
        }),
        tablet: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 44,
          minUsefulControlWidthPx: 240,
          maxHorizontalOverflowPx: 4,
          maxViewportClipPx: 2,
          maxTextClipPx: 2,
          requiredScheduleFieldKeys: Object.freeze(['startDate', 'endDate', 'pickupTime', 'dropoffTime', 'pickupLocation']),
          requiredGuestFieldKeys: Object.freeze(['fullName', 'passport', 'phone', 'email']),
        }),
        laptop: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 40,
          minUsefulControlWidthPx: 260,
          maxHorizontalOverflowPx: 4,
          maxViewportClipPx: 2,
          maxTextClipPx: 2,
          requiredScheduleFieldKeys: Object.freeze(['startDate', 'endDate', 'pickupTime', 'dropoffTime', 'pickupLocation']),
          requiredGuestFieldKeys: Object.freeze(['fullName', 'passport', 'phone', 'email']),
        }),
        desktop: Object.freeze({
          policy: 'locked',
          minTapTargetPx: 40,
          minUsefulControlWidthPx: 280,
          maxHorizontalOverflowPx: 4,
          maxViewportClipPx: 2,
          maxTextClipPx: 2,
          requiredScheduleFieldKeys: Object.freeze(['startDate', 'endDate', 'pickupTime', 'dropoffTime', 'pickupLocation']),
          requiredGuestFieldKeys: Object.freeze(['fullName', 'passport', 'phone', 'email']),
        }),
      }),
    }),
    mobile_card_actions: Object.freeze({
      tiers: Object.freeze({
        mobile: Object.freeze({
          policy: 'locked',
          maxActionGroupHeightRatio: 0.34,
          maxSecondaryActionHeightRatio: 0.26,
          maxSecondaryButtonWidthRatio: 0.94,
          maxSecondaryDominanceRatio: 1.15,
          minSplitContactGroupWidthRatio: 0.985,
          maxSplitContactSideGapPx: 2,
          minSplitContactStripHeightRatio: 0.065,
          requireSingleRowContactSplit: true,
          allowFullBleedContactStrip: true,
          minFullBleedContactButtonWidthRatio: 0.42,
          maxFullBleedContactButtonWidthRatio: 0.58,
          maxFullBleedContactStripBottomGapPx: 18,
          minCardInlinePaddingPx: 12,
          minPrimaryActionHeightPx: 44,
          maxPrimaryActionHeightPx: 64,
          maxSecondaryActionHeightPx: 72,
          maxSecondaryContactActions: 2,
          maxButtonRadiusPx: 8,
          maxButtonRadiusSpreadPx: 8,
        }),
        tablet: Object.freeze({
          policy: 'research',
          maxActionGroupHeightRatio: 0.3,
          maxSecondaryActionHeightRatio: 0.22,
          maxSecondaryButtonWidthRatio: 0.98,
          maxSecondaryDominanceRatio: 1.05,
          minSplitContactGroupWidthRatio: 0.96,
          maxSplitContactSideGapPx: 8,
          minSplitContactStripHeightRatio: 0.048,
          requireSingleRowContactSplit: true,
          allowFullBleedContactStrip: true,
          minFullBleedContactButtonWidthRatio: 0.4,
          maxFullBleedContactButtonWidthRatio: 0.6,
          maxFullBleedContactStripBottomGapPx: 20,
          minCardInlinePaddingPx: 12,
          minPrimaryActionHeightPx: 40,
          maxPrimaryActionHeightPx: 62,
          maxSecondaryActionHeightPx: 70,
          maxSecondaryContactActions: 2,
          maxButtonRadiusPx: 8,
          maxButtonRadiusSpreadPx: 8,
        }),
      }),
    }),
    page_depth_scan: Object.freeze({
      tiers: Object.freeze({
        mobile: Object.freeze({
          policy: 'locked',
          maxContactActionWidthRatio: 0.92,
          maxContactActionHeightPx: 72,
          maxContactActionAreaRatio: 0.075,
          maxSecondaryActionWidthRatio: 0.94,
          maxEdgeToEdgeActionWidthRatio: 0.96,
          minViewportActionSidePaddingPx: 10,
          maxBlankGapRatio: 0.46,
          minVisibleElementsForGapAudit: 4,
          maxSurfaceWidthDriftRatio: 0.075,
          maxSurfaceSidePaddingDriftPx: 22,
          maxActionGroupWidthDriftRatio: 0.08,
          minWideActionWidthRatio: 0.55,
        }),
        tablet: Object.freeze({
          policy: 'research',
          maxContactActionWidthRatio: 0.72,
          maxContactActionHeightPx: 70,
          maxContactActionAreaRatio: 0.055,
          maxSecondaryActionWidthRatio: 0.8,
          maxEdgeToEdgeActionWidthRatio: 0.9,
          minViewportActionSidePaddingPx: 14,
          maxBlankGapRatio: 0.5,
          minVisibleElementsForGapAudit: 4,
        }),
        laptop: Object.freeze({
          policy: 'research',
          maxContactActionWidthRatio: 0.5,
          maxContactActionHeightPx: 58,
          maxContactActionAreaRatio: 0.04,
          maxSecondaryActionWidthRatio: 0.56,
          maxEdgeToEdgeActionWidthRatio: 0.86,
          minViewportActionSidePaddingPx: 18,
          maxBlankGapRatio: 0.52,
          minVisibleElementsForGapAudit: 5,
          maxFormBorderWidthSpreadPx: 0.5,
          maxFormBorderAlphaSpread: 0.08,
          maxFormBorderVisualWeightSpread: 0.16,
        }),
        desktop: Object.freeze({
          policy: 'research',
          maxContactActionWidthRatio: 0.42,
          maxContactActionHeightPx: 58,
          maxContactActionAreaRatio: 0.032,
          maxSecondaryActionWidthRatio: 0.5,
          maxEdgeToEdgeActionWidthRatio: 0.82,
          minViewportActionSidePaddingPx: 20,
          maxBlankGapRatio: 0.54,
          minVisibleElementsForGapAudit: 5,
          maxFormBorderWidthSpreadPx: 0.5,
          maxFormBorderAlphaSpread: 0.08,
          maxFormBorderVisualWeightSpread: 0.16,
        }),
      }),
    }),
    booking_date_defaults: Object.freeze({
      tiers: Object.freeze({
        mobile: Object.freeze({
          policy: 'locked',
          maxPastDays: 0,
          requireMinDateAtLeastToday: true,
        }),
        tablet: Object.freeze({
          policy: 'locked',
          maxPastDays: 0,
          requireMinDateAtLeastToday: true,
        }),
        laptop: Object.freeze({
          policy: 'locked',
          maxPastDays: 0,
          requireMinDateAtLeastToday: true,
        }),
        desktop: Object.freeze({
          policy: 'locked',
          maxPastDays: 0,
          requireMinDateAtLeastToday: true,
        }),
      }),
    }),
  }),
  firstViewportPolicies: Object.freeze({
    home: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({
          policy: 'locked',
          check: 'single_panel_fill',
          minPrimaryWidthRatio: 0.32,
          maxPrimaryWidthRatio: 0.74,
          maxPrimaryBottomRatio: 0.95,
          maxPrimaryCtaTopRatio: 0.82,
        }),
        desktop: Object.freeze({
          policy: 'locked',
          check: 'single_panel_fill',
          minPrimaryWidthRatio: 0.34,
          maxPrimaryWidthRatio: 0.72,
          maxPrimaryBottomRatio: 0.95,
          maxPrimaryCtaTopRatio: 0.8,
        }),
        mobile: Object.freeze({
          policy: 'locked',
          check: 'single_panel_fill',
          minPrimaryWidthRatio: 0.74,
          maxPrimaryWidthRatio: 1.01,
          maxPrimaryBottomRatio: 0.9,
          maxPrimaryCtaTopRatio: 0.88,
        }),
      }),
    }),
    hub_marketing: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({ policy: 'locked' }),
        desktop: Object.freeze({ policy: 'locked' }),
        mobile: Object.freeze({ policy: 'research' }),
      }),
    }),
    guide_landing: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({ policy: 'locked' }),
        desktop: Object.freeze({ policy: 'locked' }),
        mobile: Object.freeze({ policy: 'research' }),
      }),
    }),
    service_landing: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({ policy: 'locked' }),
        desktop: Object.freeze({ policy: 'locked' }),
        mobile: Object.freeze({ policy: 'research' }),
      }),
    }),
    brand_landing: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({
          policy: 'locked',
          check: 'hero_support_split',
          maxTopOffsetPx: 24,
          maxBottomOffsetPx: 36,
          maxHeightDeltaRatio: 0.18,
          minPrimaryWidthRatio: 0.5,
          minSecondaryWidthRatio: 0.26,
          minCombinedWidthRatio: 0.82,
          maxPrimaryCtaTopRatio: 0.91,
          maxPrimaryCtaOverflowPx: 12,
        }),
        desktop: Object.freeze({
          policy: 'locked',
          check: 'hero_support_split',
          maxTopOffsetPx: 24,
          maxBottomOffsetPx: 32,
          maxHeightDeltaRatio: 0.16,
          minPrimaryWidthRatio: 0.5,
          minSecondaryWidthRatio: 0.28,
          minCombinedWidthRatio: 0.84,
          maxPrimaryCtaTopRatio: 0.88,
          maxPrimaryCtaOverflowPx: 12,
        }),
        mobile: Object.freeze({ policy: 'research' }),
      }),
    }),
    vehicle_pdp: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({
          policy: 'locked',
          check: 'hero_support_split',
          maxTopOffsetPx: 24,
          maxBottomOffsetPx: 36,
          maxHeightDeltaRatio: 0.18,
          minPrimaryWidthRatio: 0.5,
          minSecondaryWidthRatio: 0.26,
          minCombinedWidthRatio: 0.82,
          maxPrimaryCtaTopRatio: 0.91,
          maxPrimaryCtaOverflowPx: 12,
        }),
        desktop: Object.freeze({
          policy: 'locked',
          check: 'hero_support_split',
          maxTopOffsetPx: 24,
          maxBottomOffsetPx: 32,
          maxHeightDeltaRatio: 0.16,
          minPrimaryWidthRatio: 0.5,
          minSecondaryWidthRatio: 0.28,
          minCombinedWidthRatio: 0.84,
          maxPrimaryCtaTopRatio: 0.88,
          maxPrimaryCtaOverflowPx: 12,
        }),
        mobile: Object.freeze({ policy: 'research' }),
      }),
    }),
    fleet: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({
          policy: 'locked',
          check: 'fleet_first_row_fill',
          minRowCount: 2,
          minRowSpanRatio: 0.62,
          maxTopSpreadPx: 20,
        }),
        desktop: Object.freeze({
          policy: 'locked',
          check: 'fleet_first_row_fill',
          minRowCount: 3,
          minRowSpanRatio: 0.8,
          maxTopSpreadPx: 20,
        }),
        mobile: Object.freeze({
          policy: 'locked',
          check: 'fleet_first_row_fill',
          minRowCount: 1,
          minRowSpanRatio: 0.82,
          maxTopSpreadPx: 20,
        }),
      }),
    }),
    reserve: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({
          policy: 'locked',
          check: 'hero_support_split',
          maxTopOffsetPx: 36,
          maxBottomOffsetPx: 48,
          maxHeightDeltaRatio: 0.24,
          minPrimaryWidthRatio: 0.46,
          minSecondaryWidthRatio: 0.26,
          minCombinedWidthRatio: 0.8,
        }),
        desktop: Object.freeze({
          policy: 'locked',
          check: 'hero_support_split',
          maxTopOffsetPx: 32,
          maxBottomOffsetPx: 40,
          maxHeightDeltaRatio: 0.2,
          minPrimaryWidthRatio: 0.48,
          minSecondaryWidthRatio: 0.28,
          minCombinedWidthRatio: 0.84,
        }),
        mobile: Object.freeze({ policy: 'research' }),
      }),
    }),
    contact: Object.freeze({
      tiers: Object.freeze({
        laptop: Object.freeze({
          policy: 'locked',
          check: 'hero_support_split',
          maxTopOffsetPx: 32,
          maxBottomOffsetPx: 40,
          maxHeightDeltaRatio: 0.2,
          minPrimaryWidthRatio: 0.38,
          minSecondaryWidthRatio: 0.32,
          minCombinedWidthRatio: 0.82,
        }),
        desktop: Object.freeze({
          policy: 'locked',
          check: 'hero_support_split',
          maxTopOffsetPx: 28,
          maxBottomOffsetPx: 36,
          maxHeightDeltaRatio: 0.18,
          minPrimaryWidthRatio: 0.38,
          minSecondaryWidthRatio: 0.34,
          minCombinedWidthRatio: 0.86,
        }),
        mobile: Object.freeze({ policy: 'research' }),
      }),
    }),
  }),
  pages: Object.freeze({
    '/services.html': Object.freeze({
      firstViewport: Object.freeze({
        tiers: Object.freeze({
          laptop: Object.freeze({
            policy: 'locked',
            check: 'service_tabs_split',
            selectorBottomRatio: Object.freeze({ max: 0.57 }),
            minSelectorWidthRatio: 0.56,
            minOrbSlotFillRatio: 0.52,
            featureTopRatio: Object.freeze({ min: 0.46, max: 0.62 }),
            featureBottomRatio: Object.freeze({ min: 0.84, max: 0.98 }),
            maxSelectorFeatureOverlapPx: 24,
            minOrbMediaWidthPx: 92,
            maxFeatureContentGapRatio: 0.18,
            maxHeadingTopRatio: 0.74,
          }),
          desktop: Object.freeze({
            policy: 'locked',
            check: 'service_tabs_split',
            selectorBottomRatio: Object.freeze({ max: 0.58 }),
            minSelectorWidthRatio: 0.5,
            minOrbSlotFillRatio: 0.56,
            featureTopRatio: Object.freeze({ min: 0.5, max: 0.66 }),
            featureBottomRatio: Object.freeze({ min: 0.84, max: 0.98 }),
            maxSelectorFeatureOverlapPx: 20,
            minOrbMediaWidthPx: 120,
            maxFeatureContentGapRatio: 0.14,
            maxHeadingTopRatio: 0.72,
          }),
          mobile: Object.freeze({
            policy: 'research',
          }),
        }),
      }),
      sectionRhythm: Object.freeze({
        tiers: Object.freeze({
          laptop: Object.freeze({
            policy: 'locked',
            check: 'lead_panel_vs_following_sections',
            minLeadToPeerWidthRatio: 0.88,
            maxPeerWidthSpreadRatio: 0.04,
          }),
          desktop: Object.freeze({
            policy: 'locked',
            check: 'lead_panel_vs_following_sections',
            minLeadToPeerWidthRatio: 0.84,
            maxPeerWidthSpreadRatio: 0.04,
          }),
          mobile: Object.freeze({
            policy: 'research',
          }),
        }),
      }),
    }),
    '/locations.html': Object.freeze({
      firstViewport: Object.freeze({
        tiers: Object.freeze({
          laptop: Object.freeze({
            policy: 'locked',
            check: 'two_column_alignment',
            maxTopOffsetPx: 24,
            maxBottomOffsetPx: 36,
            maxHeightDeltaRatio: 0.16,
            minColumnWidthRatio: 0.4,
            minCombinedWidthRatio: 0.9,
            maxBlockBottomRatio: 0.96,
          }),
          desktop: Object.freeze({
            policy: 'locked',
            check: 'two_column_alignment',
            maxTopOffsetPx: 24,
            maxBottomOffsetPx: 32,
            maxHeightDeltaRatio: 0.14,
            minColumnWidthRatio: 0.42,
            minCombinedWidthRatio: 0.92,
            maxBlockBottomRatio: 0.96,
          }),
          mobile: Object.freeze({
            policy: 'research',
          }),
        }),
      }),
    }),
  }),
  cohorts: Object.freeze({
    home: Object.freeze({
      headingFontFamilies: Object.freeze(['manrope', 'el messiri']),
      bodyFontFamilies: Object.freeze(['manrope']),
      visualIntents: Object.freeze(['modern_dark_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      bodyFontSizePx: Object.freeze({ min: 14, max: 18.5 }),
      bodyLineHeightPx: Object.freeze({ min: 20, max: 28.5 }),
      primaryCtaRadiusPx: Object.freeze([
        Object.freeze({ min: 0, max: 12 }),
        Object.freeze({ min: 980, max: 1000 }),
      ]),
      cardRadiusPx: Object.freeze({ min: 18, max: 30 }),
      maxButtonFamilyCount: 5,
    }),
    hub_marketing: Object.freeze({
      headingFontFamilies: Object.freeze(['cormorant garamond']),
      bodyFontFamilies: Object.freeze(['manrope']),
      visualIntents: Object.freeze(['modern_dark_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      bodyFontSizePx: Object.freeze({ min: 13, max: 18.5 }),
      bodyLineHeightPx: Object.freeze({ min: 19, max: 31 }),
      primaryCtaRadiusPx: Object.freeze({ min: 0, max: 12 }),
      cardRadiusPx: Object.freeze({ min: 0, max: 12 }),
      maxButtonFamilyCount: 6,
    }),
    contact: Object.freeze({
      headingFontFamilies: Object.freeze(['cormorant garamond']),
      bodyFontFamilies: Object.freeze(['manrope']),
      visualIntents: Object.freeze(['modern_light_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      bodyFontSizePx: Object.freeze({ min: 14, max: 18.5 }),
      bodyLineHeightPx: Object.freeze({ min: 22, max: 30.5 }),
      primaryCtaRadiusPx: Object.freeze({ min: 0, max: 12 }),
      inputRadiusPx: Object.freeze({ min: 6, max: 12 }),
      cardRadiusPx: Object.freeze({ min: 6, max: 12 }),
      maxButtonFamilyCount: 5,
    }),
    guide_landing: Object.freeze({
      headingFontFamilies: Object.freeze(['cormorant garamond']),
      bodyFontFamilies: Object.freeze(['manrope']),
      visualIntents: Object.freeze(['modern_light_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      bodyFontSizePx: Object.freeze({ min: 14, max: 18.5 }),
      bodyLineHeightPx: Object.freeze({ min: 22, max: 31 }),
      primaryCtaRadiusPx: Object.freeze([
        Object.freeze({ min: 0, max: 12 }),
        Object.freeze({ min: 980, max: 1000 }),
      ]),
      cardRadiusPx: Object.freeze({ min: 20, max: 32 }),
      maxButtonFamilyCount: 6,
    }),
    service_landing: Object.freeze({
      headingFontFamilies: Object.freeze(['cormorant garamond']),
      bodyFontFamilies: Object.freeze(['manrope']),
      visualIntents: Object.freeze(['modern_light_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      bodyFontSizePx: Object.freeze({ min: 14, max: 18.5 }),
      bodyLineHeightPx: Object.freeze({ min: 22, max: 31 }),
      primaryCtaRadiusPx: Object.freeze([
        Object.freeze({ min: 0, max: 12 }),
        Object.freeze({ min: 980, max: 1000 }),
      ]),
      cardRadiusPx: Object.freeze({ min: 20, max: 32 }),
      maxButtonFamilyCount: 6,
    }),
    brand_landing: Object.freeze({
      headingFontFamilies: Object.freeze(['montserrat']),
      bodyFontFamilies: Object.freeze(['inter']),
      visualIntents: Object.freeze(['modern_light_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      bodyFontSizePx: Object.freeze({ min: 13, max: 17.5 }),
      bodyLineHeightPx: Object.freeze({ min: 21, max: 27.5 }),
      primaryCtaRadiusPx: Object.freeze({ min: 6, max: 12 }),
      inputRadiusPx: Object.freeze({ min: 12, max: 20 }),
      cardRadiusPx: Object.freeze({ min: 6, max: 12 }),
      maxButtonFamilyCount: 5,
    }),
    vehicle_pdp: Object.freeze({
      headingFontFamilies: Object.freeze(['montserrat']),
      bodyFontFamilies: Object.freeze(['inter']),
      visualIntents: Object.freeze(['modern_light_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      bodyFontSizePx: Object.freeze({ min: 13, max: 17.5 }),
      bodyLineHeightPx: Object.freeze({ min: 21, max: 27.5 }),
      primaryCtaRadiusPx: Object.freeze({ min: 6, max: 12 }),
      inputRadiusPx: Object.freeze({ min: 12, max: 20 }),
      cardRadiusPx: Object.freeze({ min: 6, max: 12 }),
      maxButtonFamilyCount: 5,
    }),
    fleet: Object.freeze({
      headingFontFamilies: Object.freeze(['inter', 'cormorant garamond']),
      bodyFontFamilies: Object.freeze(['inter']),
      visualIntents: Object.freeze(['modern_dark_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      bodyFontSizePx: Object.freeze({ min: 13, max: 17.5 }),
      primaryCtaRadiusPx: Object.freeze([
        Object.freeze({ min: 0, max: 12 }),
        Object.freeze({ min: 980, max: 1000 }),
      ]),
      cardRadiusPx: Object.freeze({ min: 18, max: 30 }),
      maxButtonFamilyCount: 6,
    }),
    reserve: Object.freeze({
      visualIntents: Object.freeze(['modern_light_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
      primaryCtaRadiusPx: Object.freeze({ min: 6, max: 16 }),
      inputRadiusPx: Object.freeze({ min: 8, max: 16 }),
      cardRadiusPx: Object.freeze({ min: 12, max: 22 }),
      maxButtonFamilyCount: 6,
    }),
    legal: Object.freeze({
      visualIntents: Object.freeze(['modern_light_system', 'modern_dark_system']),
      headerVariants: Object.freeze(['lab_mega_utility']),
      headerBrandFontFamilies: Object.freeze(['manrope']),
      headerPrimaryNavSignatures: Object.freeze(['Home|Fleet|Cars Brands|Cars Types|Services|Locations|About Us|Contact']),
      headerNavRowCount: Object.freeze({ min: 1, max: 1 }),
    }),
  }),
});

function getFirstViewportContract({ route = '', cohort = '', viewportName = '', viewportWidth = 0 } = {}) {
  const normalizedRoute = normalizeRouteToken(route);
  const viewportTier = resolveViewportTier(viewportName, viewportWidth);
  const cohortContract = DESIGN_SYSTEM_CONTRACT.firstViewportPolicies?.[cohort] || null;
  const baseContract = cohortContract?.tiers?.[viewportTier] || null;
  const pageContract = DESIGN_SYSTEM_CONTRACT.pages?.[normalizedRoute]?.firstViewport || null;
  const overrideContract = pageContract?.tiers?.[viewportTier] || null;
  return mergeContracts(baseContract, overrideContract);
}

function getSectionRhythmContract({ route = '', viewportName = '', viewportWidth = 0 } = {}) {
  const normalizedRoute = normalizeRouteToken(route);
  const viewportTier = resolveViewportTier(viewportName, viewportWidth);
  const pageContract = DESIGN_SYSTEM_CONTRACT.pages?.[normalizedRoute]?.sectionRhythm || null;
  return pageContract?.tiers?.[viewportTier] || null;
}

function getMobileInteractionContract({ interaction = '', viewportName = '', viewportWidth = 0 } = {}) {
  const viewportTier = resolveViewportTier(viewportName, viewportWidth);
  const interactionContract = DESIGN_SYSTEM_CONTRACT.mobileInteractionPolicies?.[interaction] || null;
  return interactionContract?.tiers?.[viewportTier] || null;
}

module.exports = {
  DESIGN_SYSTEM_CONTRACT,
  VIEWPORT_COVERAGE_MATRIX,
  getFirstViewportContract,
  getMobileInteractionContract,
  getSectionRhythmContract,
  getViewportCoverageMatrix,
  resolveViewportTier,
};
