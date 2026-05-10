const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildLayoutAuditSummary,
  evaluateLayoutMeasurements,
  loadPagePatternManifest,
  resolveLayoutViewports,
  resolvePagePattern,
  summarizeRectRows
} = require('../../server/design-system/layout-audit-core');

test('page pattern manifest maps routes to mother page patterns', () => {
  const manifest = loadPagePatternManifest();

  assert.equal(resolvePagePattern('/fleet.html', manifest), 'ListingPage');
  assert.equal(resolvePagePattern('/reservation-lookup.html', manifest), 'AppFlowPage');
  assert.equal(resolvePagePattern('/lamborghini-huracan-evo-spyder-rental-dubai.html', manifest), 'DetailPage');
  assert.equal(resolvePagePattern('/', manifest), 'MarketingLandingPage');
});

test('layout viewport groups separate mobile, laptop and monitor checks', () => {
  const manifest = loadPagePatternManifest();
  const mobile = resolveLayoutViewports({ viewportGroup: 'mobile', manifest }).map((viewport) => viewport.name);
  const laptop = resolveLayoutViewports({ viewportGroup: 'laptop', manifest }).map((viewport) => viewport.name);
  const monitor = resolveLayoutViewports({ viewportGroup: 'monitor', manifest }).map((viewport) => viewport.name);
  const firstViewport = resolveLayoutViewports({ viewportGroup: 'firstViewport', manifest }).map((viewport) => viewport.name);

  assert.ok(mobile.includes('mobile-tiny'));
  assert.ok(mobile.includes('mobile-modern'));
  assert.ok(laptop.includes('laptop-compact'));
  assert.ok(laptop.includes('laptop'));
  assert.ok(monitor.includes('desktop-wide'));
  assert.ok(monitor.includes('desktop-large'));
  assert.ok(firstViewport.includes('mobile-short'));
  assert.ok(firstViewport.includes('laptop'));
  assert.ok(firstViewport.includes('desktop-wide'));
});

test('layout evaluation flags measurable geometry failures', () => {
  const result = evaluateLayoutMeasurements({
    route: '/fleet.html',
    pattern: 'ListingPage',
    viewport: {
      name: 'laptop',
      tier: 'laptop',
      width: 1366,
      height: 768
    },
    page: {
      horizontalOverflowPx: 18
    },
    slots: {
      header: { found: true, rect: { top: 0, left: 0, width: 1366, height: 96, right: 1366, bottom: 96 } },
      hero: { found: true, rect: { top: 96, left: 0, width: 1366, height: 640, right: 1366, bottom: 736 } },
      heroHeadline: { found: true, rect: { top: 160, left: 80, width: 620, height: 180, right: 700, bottom: 340 }, lineCount: 4 },
      datePlanner: { found: true, rect: { top: 700, left: 80, width: 420, height: 100, right: 500, bottom: 800 } },
      cardGrid: { found: true, rect: { top: 840, left: 80, width: 1200, height: 500, right: 1280, bottom: 1340 } }
    },
    collections: {
      cards: [
        { selector: '.fleet-card', rect: { top: 840, left: 80, width: 360, height: 400, right: 440, bottom: 1240 } },
        { selector: '.fleet-card', rect: { top: 852, left: 460, width: 360, height: 430, right: 820, bottom: 1282 } }
      ]
    }
  });

  assert.equal(result.status, 'bad');
  assert.ok(result.findings.some((finding) => finding.type === 'horizontal_overflow'));
  assert.ok(result.findings.some((finding) => finding.type === 'listing_hero_too_tall_laptop'));
  assert.ok(result.findings.some((finding) => finding.type === 'headline_line_count'));
  assert.ok(result.findings.some((finding) => finding.type === 'card_row_top_misalignment'));
  assert.ok(result.findings.some((finding) => finding.type === 'card_row_bottom_misalignment'));
});

test('card row summaries expose top and bottom geometry deltas', () => {
  const rows = summarizeRectRows([
    { selector: '.fleet-card', rect: { top: 100, left: 0, width: 280, height: 300, right: 280, bottom: 400 } },
    { selector: '.fleet-card', rect: { top: 104, left: 300, width: 280, height: 320, right: 580, bottom: 424 } },
    { selector: '.fleet-card', rect: { top: 460, left: 0, width: 280, height: 300, right: 280, bottom: 760 } }
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[0].topDeltaPx, 4);
  assert.equal(rows[0].bottomDeltaPx, 24);
});

test('layout summary groups good review and bad pages', () => {
  const summary = buildLayoutAuditSummary([
    { status: 'good', findings: [] },
    { status: 'review', findings: [{ severity: 'medium', type: 'headline_line_count' }] },
    { status: 'bad', findings: [{ severity: 'high', type: 'horizontal_overflow' }] }
  ]);

  assert.equal(summary.pages, 3);
  assert.equal(summary.good, 1);
  assert.equal(summary.review, 1);
  assert.equal(summary.bad, 1);
  assert.equal(summary.findings.high, 1);
  assert.equal(summary.findings.medium, 1);
});
