function normalizeRouteToken(route = '') {
  const pathname = String(route || '/').split(/[?#]/)[0] || '/';
  return pathname === '/index.html' ? '/' : pathname;
}

function resolveViewportTier(viewportName = '', viewportWidth = 0) {
  if (viewportName === 'mobile-modern' || viewportWidth < 760) {
    return 'mobile';
  }

  if (viewportName === 'desktop-wide' || viewportWidth >= 1500) {
    return 'desktop';
  }

  if (viewportName === 'laptop' || viewportWidth >= 1024) {
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
  version: '2026-04-20',
  global: Object.freeze({
    forbiddenFonts: Object.freeze(['orbitron']),
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
          maxPrimaryWidthRatio: 0.99,
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
      headingFontFamilies: Object.freeze(['manrope']),
      bodyFontFamilies: Object.freeze(['manrope']),
      visualIntents: Object.freeze(['modern_dark_system']),
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
      primaryCtaRadiusPx: Object.freeze({ min: 6, max: 16 }),
      inputRadiusPx: Object.freeze({ min: 8, max: 16 }),
      cardRadiusPx: Object.freeze({ min: 12, max: 22 }),
      maxButtonFamilyCount: 6,
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

module.exports = {
  DESIGN_SYSTEM_CONTRACT,
  getFirstViewportContract,
  getSectionRhythmContract,
  resolveViewportTier,
};
