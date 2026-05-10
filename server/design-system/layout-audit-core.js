const fs = require('fs');
const path = require('path');

const {
  getViewportCoverageMatrix
} = require('./design-system-contract');

const DEFAULT_SLOT_SELECTORS = Object.freeze({
  header: [
    '.site-header',
    '.lab-header',
    '.reserve-shell-header',
    '.admin-header',
    'header'
  ],
  mobileDrawer: [
    '.lab-mobile-drawer',
    '.mobile-menu',
    '.nav-drawer'
  ],
  hero: [
    '[data-hero]',
    '.hero-lab',
    '.fleet-browser__hero',
    '.services-hero',
    '.local-guide-hero',
    '.service-detail-hero',
    '.contact-hero',
    '.lookup-hero',
    '.vehicle-hero',
    '.reserve-hero',
    'main section:first-of-type'
  ],
  heroHeadline: [
    'h1'
  ],
  heroCopy: [
    '.hero-copy',
    '.hero-lab__lead',
    '.fleet-browser__lead',
    '.services-hero__lead',
    '.contact-hero__lead',
    '.lookup-hero__lead',
    '.lead'
  ],
  primaryCta: [
    '[data-primary-cta]',
    '.btn-primary',
    '.lab-reserve',
    '.locations-button--primary',
    '.services-button--primary',
    '.hero-lab__cta:first-child',
    '.fleet-card__primary',
    '.contact-submit',
    '.confirm-pay-btn',
    'button[type="submit"]'
  ],
  secondaryCtas: [
    '.btn-secondary',
    '.btn-outline',
    '.btn-ghost',
    '.hero-lab__cta',
    '.locations-button--ghost',
    '.services-button--ghost',
    '.contact-hero__action',
    '.service-detail-actions__secondary'
  ],
  datePlanner: [
    '.date-planner',
    '.booking-widget',
    '.hero-lab__booking',
    '.fleet-sidebar',
    '.reserve-schedule',
    '.schedule-card'
  ],
  filterPanel: [
    '.fleet-sidebar',
    '.filters',
    '.fleet-filter-sheet'
  ],
  cardGrid: [
    '.js-fleet-grid',
    '.fleet-results__list',
    '.fleet-catalog__grid',
    '.fleet-editorial__grid',
    '.services-hero__selector',
    '.services-directory__layout',
    '.services-directory__list',
    '.services-flow__list',
    '.locations-hero__zone-list',
    '.locations-guides__grid',
    '.locations-zone-grid',
    '.fleet-grid',
    '.cards-grid',
    '.services-grid',
    '.locations-guides-grid',
    '.guide-grid',
    '.vehicle-grid',
    '.service-lanes',
    '.models-grid'
  ],
  cards: [
    '.fleet-card',
    '.dp-card',
    '.service-card',
    '.guide-card',
    '.locations-guide-card',
    '.locations-guide-feature',
    '.locations-zone-card',
    '.locations-hero__zone',
    '.services-lane-orb',
    '.services-directory__item',
    '.services-flow__item',
    '.service-detail-card',
    '.model-card',
    '.vehicle-card'
  ],
  formPanel: [
    '.step-content.active',
    '.step1-layout',
    '.step2-layout',
    '.info-card',
    '.schedule-card',
    '.delivery-card',
    '.dp-form-panel',
    '.lookup-card',
    '.contact-form-card',
    '.reserve-page-panel',
    '.vehicle-booking',
    'form'
  ],
  trustStrip: [
    '.trust-strip',
    '.stats',
    '.proof-strip',
    '.assurance-strip'
  ],
  floatingActions: [
    '.floating-contact',
    '.dp-floating-actions',
    '.floating-actions'
  ],
  footer: [
    'footer',
    '.site-footer'
  ]
});

function normalizeRoute(route = '') {
  const value = String(route || '/').trim() || '/';
  const pathname = value.split(/[?#]/)[0] || '/';
  return pathname === '/index.html' ? '/' : pathname;
}

function loadPagePatternManifest(manifestPath = path.join(__dirname, 'page-patterns.json')) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function resolvePagePattern(route = '', manifest = loadPagePatternManifest()) {
  const normalizedRoute = normalizeRoute(route);
  return manifest.routes?.[normalizedRoute] || 'MarketingLandingPage';
}

function resolveLayoutViewports({ viewportNames = [], viewportGroup = 'firstViewport', manifest = loadPagePatternManifest() } = {}) {
  const all = getViewportCoverageMatrix('all');
  const byName = new Map(all.map((viewport) => [viewport.name, viewport]));
  const selectedNames = viewportNames.length > 0
    ? viewportNames
    : manifest.viewportGroups?.[viewportGroup] || manifest.viewportGroups?.firstViewport || [];

  return selectedNames
    .map((name) => byName.get(name))
    .filter(Boolean);
}

function rectToPlain(rect = {}) {
  return {
    top: Number(rect.top || 0),
    left: Number(rect.left || 0),
    right: Number(rect.right || 0),
    bottom: Number(rect.bottom || 0),
    width: Number(rect.width || 0),
    height: Number(rect.height || 0)
  };
}

function intersectArea(first = null, second = null) {
  if (!first || !second) {
    return 0;
  }

  const left = Math.max(first.left, second.left);
  const right = Math.min(first.right, second.right);
  const top = Math.max(first.top, second.top);
  const bottom = Math.min(first.bottom, second.bottom);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  return width * height;
}

function lineCountForRectList(rects = []) {
  const roundedTops = new Set(
    rects
      .filter((rect) => rect.width > 1 && rect.height > 1)
      .map((rect) => Math.round(rect.top))
  );

  return roundedTops.size;
}

function groupRectsByRow(items = [], rowTolerancePx = 30) {
  const rows = [];
  const sortedItems = [...items]
    .filter((item) => item?.rect?.width > 1 && item?.rect?.height > 1)
    .sort((first, second) => first.rect.top - second.rect.top || first.rect.left - second.rect.left);

  for (const item of sortedItems) {
    const row = rows.find((candidate) => Math.abs(candidate.anchorTop - item.rect.top) <= rowTolerancePx);
    if (row) {
      row.items.push(item);
      row.anchorTop = row.items.reduce((sum, rowItem) => sum + rowItem.rect.top, 0) / row.items.length;
    } else {
      rows.push({
        anchorTop: item.rect.top,
        items: [item]
      });
    }
  }

  return rows;
}

function summarizeRectRows(items = [], rowTolerancePx = 30) {
  const bySelector = items.reduce((groups, item) => {
    const selector = item?.selector || 'unknown';
    if (!groups.has(selector)) {
      groups.set(selector, []);
    }
    groups.get(selector).push(item);
    return groups;
  }, new Map());

  return [...bySelector.entries()].flatMap(([selector, selectorItems]) => (
    groupRectsByRow(selectorItems, rowTolerancePx)
      .filter((row) => row.items.length > 1)
      .map((row) => {
        const tops = row.items.map((item) => item.rect.top);
        const bottoms = row.items.map((item) => item.rect.bottom);
        const heights = row.items.map((item) => item.rect.height);

        return {
          count: row.items.length,
          selector,
          top: Math.min(...tops),
          bottom: Math.max(...bottoms),
          topDeltaPx: Math.max(...tops) - Math.min(...tops),
          bottomDeltaPx: Math.max(...bottoms) - Math.min(...bottoms),
          minHeightPx: Math.min(...heights),
          maxHeightPx: Math.max(...heights)
        };
      })
  ));
}

function createFinding({ severity = 'low', type = 'layout', slot = '', message = '', expected = null, actual = null } = {}) {
  return {
    severity,
    type,
    slot,
    message,
    expected,
    actual
  };
}

function summarizeFindings(findings = []) {
  return {
    total: findings.length,
    high: findings.filter((finding) => finding.severity === 'high').length,
    medium: findings.filter((finding) => finding.severity === 'medium').length,
    low: findings.filter((finding) => finding.severity === 'low').length,
    byType: findings.reduce((counts, finding) => {
      counts[finding.type] = (counts[finding.type] || 0) + 1;
      return counts;
    }, {})
  };
}

function evaluateLayoutMeasurements(measurement = {}, manifest = loadPagePatternManifest()) {
  const thresholds = manifest.thresholds || {};
  const patternConfig = manifest.patterns?.[measurement.pattern] || {};
  const slots = measurement.slots || {};
  const metrics = {
    horizontalOverflowPx: measurement.page?.horizontalOverflowPx || 0,
    primaryTaskDepthRatio: null,
    heroHeightRatio: slots.hero?.rect?.height && measurement.viewport?.height
      ? slots.hero.rect.height / measurement.viewport.height
      : null,
    maxFloatingOverlapRatio: 0,
    h1LineCount: slots.heroHeadline?.lineCount || 0,
    cardRows: summarizeRectRows(measurement.collections?.cards || [])
  };
  const findings = [];

  if (metrics.horizontalOverflowPx > (thresholds.maxHorizontalOverflowPx ?? 2)) {
    findings.push(createFinding({
      severity: 'high',
      type: 'horizontal_overflow',
      message: 'Page creates horizontal overflow in this viewport.',
      expected: `<= ${thresholds.maxHorizontalOverflowPx ?? 2}px`,
      actual: `${metrics.horizontalOverflowPx}px`
    }));
  }

  for (const slotName of patternConfig.requiredSlots || []) {
    if (!slots[slotName]?.found) {
      findings.push(createFinding({
        severity: slotName === 'header' ? 'high' : 'medium',
        type: 'missing_required_slot',
        slot: slotName,
        message: `Required ${slotName} slot was not detected for ${measurement.pattern}.`
      }));
    }
  }

  const taskSlotName = (patternConfig.taskSlotPriority || []).find((slotName) => slots[slotName]?.found);
  if (taskSlotName) {
    const taskTop = slots[taskSlotName].rect.top;
    metrics.primaryTaskDepthRatio = taskTop / measurement.viewport.height;

    if (metrics.primaryTaskDepthRatio > (thresholds.maxPrimaryTaskFoldDepthRatio ?? 0.82)) {
      findings.push(createFinding({
        severity: 'high',
        type: 'primary_task_below_fold',
        slot: taskSlotName,
        message: `Primary task slot starts too low for ${measurement.pattern}.`,
        expected: `<= ${thresholds.maxPrimaryTaskFoldDepthRatio ?? 0.82}`,
        actual: Number(metrics.primaryTaskDepthRatio.toFixed(3))
      }));
    }
  }

  if (measurement.pattern === 'ListingPage' && measurement.viewport.tier === 'laptop' && metrics.heroHeightRatio !== null) {
    const maxHeroRatio = thresholds.maxListingHeroHeightRatioLaptop ?? 0.62;
    if (metrics.heroHeightRatio > maxHeroRatio) {
      findings.push(createFinding({
        severity: 'medium',
        type: 'listing_hero_too_tall_laptop',
        slot: 'hero',
        message: 'Listing hero consumes too much laptop first viewport before the browsing task.',
        expected: `<= ${maxHeroRatio}`,
        actual: Number(metrics.heroHeightRatio.toFixed(3))
      }));
    }
  }

  const maxLines = measurement.viewport.tier === 'mobile'
    ? thresholds.maxMobileH1Lines ?? 5
    : thresholds.maxDesktopH1Lines ?? 3;
  if (metrics.h1LineCount > maxLines) {
    findings.push(createFinding({
      severity: 'medium',
      type: 'headline_line_count',
      slot: 'heroHeadline',
      message: 'Hero headline wraps into too many lines for this viewport.',
      expected: `<= ${maxLines}`,
      actual: metrics.h1LineCount
    }));
  }

  for (const row of metrics.cardRows) {
    if (row.topDeltaPx > (thresholds.maxRowTopDeltaPx ?? 8)) {
      findings.push(createFinding({
        severity: 'medium',
        type: 'card_row_top_misalignment',
        slot: 'cards',
        message: `${row.selector || 'Cards'} in the same visual row do not share the same top edge.`,
        expected: `<= ${thresholds.maxRowTopDeltaPx ?? 8}px`,
        actual: Number(row.topDeltaPx.toFixed(1))
      }));
    }

    if (row.bottomDeltaPx > (thresholds.maxRowBottomDeltaPx ?? 12)) {
      findings.push(createFinding({
        severity: 'medium',
        type: 'card_row_bottom_misalignment',
        slot: 'cards',
        message: `${row.selector || 'Cards'} in the same visual row do not share the same bottom edge.`,
        expected: `<= ${thresholds.maxRowBottomDeltaPx ?? 12}px`,
        actual: Number(row.bottomDeltaPx.toFixed(1))
      }));
    }
  }

  const importantSlots = ['primaryCta', 'datePlanner', 'filterPanel', 'cardGrid', 'formPanel'];
  const floatingRect = slots.floatingActions?.rect || null;
  if (floatingRect) {
    for (const slotName of importantSlots) {
      const slotRect = slots[slotName]?.rect || null;
      const slotArea = slotRect ? slotRect.width * slotRect.height : 0;
      if (!slotArea) {
        continue;
      }
      const ratio = intersectArea(floatingRect, slotRect) / slotArea;
      metrics.maxFloatingOverlapRatio = Math.max(metrics.maxFloatingOverlapRatio, ratio);
      if (ratio > (thresholds.maxFloatingOverlapRatio ?? 0.12)) {
        findings.push(createFinding({
          severity: 'high',
          type: 'floating_action_overlap',
          slot: slotName,
          message: `Floating actions overlap too much of ${slotName}.`,
          expected: `<= ${thresholds.maxFloatingOverlapRatio ?? 0.12}`,
          actual: Number(ratio.toFixed(3))
        }));
      }
    }
  }

  measurement.metrics = metrics;
  measurement.findings = findings;
  measurement.status = findings.some((finding) => finding.severity === 'high')
    ? 'bad'
    : findings.some((finding) => finding.severity === 'medium')
      ? 'review'
      : 'good';

  return measurement;
}

async function collectLayoutMeasurements(page, {
  route = '/',
  pattern = '',
  viewport = {},
  slotSelectors = DEFAULT_SLOT_SELECTORS
} = {}) {
  const normalizedPattern = pattern || resolvePagePattern(route);

  const raw = await page.evaluate(({ slotSelectors: selectors }) => {
    function getRect(element) {
      if (!element) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    }

    function getLineCount(element) {
      if (!element) {
        return 0;
      }
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = Array.from(range.getClientRects()).map((rect) => ({
        top: rect.top,
        width: rect.width,
        height: rect.height
      }));
      range.detach();
      return [...new Set(rects.filter((rect) => rect.width > 1 && rect.height > 1).map((rect) => Math.round(rect.top)))].length;
    }

    function visibleElements(selectorsForSlot, limit = 40) {
      const seen = new Set();
      const matches = [];

      for (const selector of selectorsForSlot) {
        const elements = Array.from(document.querySelectorAll(selector));
        for (const element of elements) {
          if (seen.has(element)) {
            continue;
          }
          seen.add(element);

          const rect = element.getBoundingClientRect();
          const styles = window.getComputedStyle(element);
          if (
            rect.width <= 1 ||
            rect.height <= 1 ||
            styles.visibility === 'hidden' ||
            styles.display === 'none'
          ) {
            continue;
          }

          matches.push({
            selector,
            text: (element.innerText || element.textContent || '').trim().slice(0, 160),
            rect: getRect(element),
            lineCount: getLineCount(element)
          });

          if (matches.length >= limit) {
            return matches;
          }
        }
      }

      return matches;
    }

    function firstVisible(selectorsForSlot) {
      return visibleElements(selectorsForSlot, 1)[0] || null;
    }

    const slots = {};
    for (const [slotName, selectorsForSlot] of Object.entries(selectors)) {
      const match = firstVisible(selectorsForSlot);
      slots[slotName] = match
        ? { found: true, ...match }
        : { found: false };
    }

    return {
      title: document.title || '',
      page: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
      },
      slots,
      collections: {
        cards: visibleElements(selectors.cards, 80)
      }
    };
  }, { slotSelectors });

  const measurement = {
    route: normalizeRoute(route),
    pattern: normalizedPattern,
    viewport: {
      name: viewport.name || '',
      tier: viewport.tier || '',
      width: viewport.width || 0,
      height: viewport.height || 0
    },
    title: raw.title,
    page: raw.page,
    slots: Object.fromEntries(
      Object.entries(raw.slots || {}).map(([slotName, slot]) => [
        slotName,
        slot.found
          ? {
              ...slot,
              rect: rectToPlain(slot.rect || {}),
              lineCount: Number(slot.lineCount || 0)
            }
          : { found: false }
      ])
    ),
    collections: {
      cards: (raw.collections?.cards || []).map((card) => ({
        ...card,
        rect: rectToPlain(card.rect || {}),
        lineCount: Number(card.lineCount || 0)
      }))
    },
    metrics: {},
    findings: [],
    status: 'unknown'
  };

  return evaluateLayoutMeasurements(measurement);
}

function buildLayoutAuditSummary(results = []) {
  const findings = results.flatMap((result) => result.findings || []);
  return {
    pages: results.length,
    good: results.filter((result) => result.status === 'good').length,
    review: results.filter((result) => result.status === 'review').length,
    bad: results.filter((result) => result.status === 'bad').length,
    findings: summarizeFindings(findings)
  };
}

module.exports = {
  DEFAULT_SLOT_SELECTORS,
  buildLayoutAuditSummary,
  collectLayoutMeasurements,
  createFinding,
  evaluateLayoutMeasurements,
  groupRectsByRow,
  intersectArea,
  lineCountForRectList,
  loadPagePatternManifest,
  normalizeRoute,
  resolveLayoutViewports,
  resolvePagePattern,
  summarizeRectRows,
  summarizeFindings
};
