const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMotherTemplateAudit,
  loadMotherTemplateManifest,
  resolveRoutePatterns
} = require('../../server/design-system/mother-template-audit-core');

test('mother template manifest covers the six page families', () => {
  const manifest = loadMotherTemplateManifest();
  const templateNames = Object.keys(manifest.templates);

  assert.deepEqual(templateNames.sort(), [
    'AdminPage',
    'AppFlowPage',
    'DetailPage',
    'HubPage',
    'ListingPage',
    'MarketingLandingPage'
  ]);
  assert.ok(manifest.requiredValidationGroups.includes('mobile'));
  assert.ok(manifest.requiredValidationGroups.includes('laptop'));
  assert.ok(manifest.requiredValidationGroups.includes('monitor'));
});

test('route patterns group page-pattern routes by mother family', () => {
  const groups = resolveRoutePatterns({
    routes: {
      '/': 'MarketingLandingPage',
      '/index.html': 'MarketingLandingPage',
      '/fleet.html': 'ListingPage',
      '/contact.html': 'AppFlowPage'
    }
  });

  assert.ok(groups.MarketingLandingPage.includes('/'));
  assert.ok(groups.ListingPage.includes('/fleet.html'));
  assert.ok(groups.AppFlowPage.includes('/contact.html'));
});

test('mother template audit passes the current foundation contract', () => {
  const report = buildMotherTemplateAudit({
    motherTemplates: loadMotherTemplateManifest(),
    pagePatterns: require('../../server/design-system/page-patterns.json'),
    components: require('../../server/design-system/design-system-components.json'),
    repoRoot: process.cwd()
  });

  assert.equal(report.summary.high, 0);
  assert.equal(report.summary.medium, 0);
  assert.equal(report.summary.templates, 6);
  assert.equal(report.summary.activePhase, 'foundation');
  assert.ok(report.summary.nextPhases.includes('marketing-home'));
  assert.ok(report.inventory.foundation.tokenSource.exists);
  assert.ok(report.inventory.foundation.primitiveSource.exists);
});

test('mother template audit catches missing template and viewport group drift', () => {
  const report = buildMotherTemplateAudit({
    motherTemplates: {
      foundation: {},
      requiredValidationGroups: ['mobile', 'laptop', 'monitor'],
      templates: {
        MarketingLandingPage: {
          referenceRoutes: ['/'],
          componentFamilies: ['button'],
          canonicalSlots: ['header'],
          migrationOrder: ['/']
        }
      }
    },
    pagePatterns: {
      viewportGroups: {
        mobile: [],
        laptop: []
      },
      patterns: {
        MarketingLandingPage: {},
        ListingPage: {}
      },
      routes: {
        '/': 'MarketingLandingPage',
        '/fleet.html': 'ListingPage'
      }
    },
    components: {
      components: {
        button: {}
      }
    },
    repoRoot: process.cwd()
  });

  assert.ok(report.findings.some((finding) => finding.type === 'missing_validation_group'));
  assert.ok(report.findings.some((finding) => finding.type === 'missing_pattern_template'));
});
