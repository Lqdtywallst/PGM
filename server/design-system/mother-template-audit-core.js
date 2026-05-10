const fs = require('fs');
const path = require('path');

function normalizeRoute(route = '') {
  const value = String(route || '/').split(/[?#]/)[0] || '/';
  return value === '/index.html' ? '/' : value;
}

function normalizePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/');
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadMotherTemplateManifest(manifestPath = path.join(__dirname, 'mother-page-templates.json')) {
  return loadJson(manifestPath);
}

function loadDefaultContracts(baseDir = __dirname) {
  return {
    motherTemplates: loadJson(path.join(baseDir, 'mother-page-templates.json')),
    pagePatterns: loadJson(path.join(baseDir, 'page-patterns.json')),
    components: loadJson(path.join(baseDir, 'design-system-components.json'))
  };
}

function createFinding({
  severity = 'low',
  type = 'mother_template',
  pattern = '',
  message = '',
  expected = null,
  actual = null
} = {}) {
  return {
    severity,
    type,
    pattern,
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

function resolveRoutePatterns(pagePatterns = {}) {
  return Object.entries(pagePatterns.routes || {}).reduce((patterns, [route, pattern]) => {
    const normalizedRoute = normalizeRoute(route);
    if (!patterns[pattern]) {
      patterns[pattern] = [];
    }
    if (!patterns[pattern].includes(normalizedRoute)) {
      patterns[pattern].push(normalizedRoute);
    }
    return patterns;
  }, {});
}

function fileExists(repoRoot = process.cwd(), relativePath = '') {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function buildMotherTemplateAudit({
  motherTemplates = {},
  pagePatterns = {},
  components = {},
  repoRoot = process.cwd()
} = {}) {
  const findings = [];
  const routePatterns = resolveRoutePatterns(pagePatterns);
  const templateEntries = Object.entries(motherTemplates.templates || {});
  const componentFamilies = new Set(Object.keys(components.components || {}));
  const validationGroups = new Set(Object.keys(pagePatterns.viewportGroups || {}));

  for (const [sourceName, relativePath] of Object.entries(motherTemplates.foundation || {})) {
    if (!fileExists(repoRoot, relativePath)) {
      findings.push(createFinding({
        severity: 'high',
        type: 'missing_foundation_source',
        message: `Foundation source ${sourceName} does not exist.`,
        expected: relativePath,
        actual: 'missing'
      }));
    }
  }

  for (const groupName of motherTemplates.requiredValidationGroups || []) {
    if (!validationGroups.has(groupName)) {
      findings.push(createFinding({
        severity: 'high',
        type: 'missing_validation_group',
        message: `Required viewport validation group ${groupName} is missing from page-patterns.json.`,
        expected: groupName,
        actual: [...validationGroups].join(', ')
      }));
    }
  }

  for (const patternName of Object.keys(pagePatterns.patterns || {})) {
    if (!motherTemplates.templates?.[patternName]) {
      findings.push(createFinding({
        severity: 'high',
        type: 'missing_pattern_template',
        pattern: patternName,
        message: `Page pattern ${patternName} has no mother template contract.`
      }));
    }
  }

  for (const [patternName, template] of templateEntries) {
    const knownRoutes = routePatterns[patternName] || [];
    const referenceRoutes = (template.referenceRoutes || []).map(normalizeRoute);
    const migrationRoutes = (template.migrationOrder || []).map(normalizeRoute);

    if (!referenceRoutes.length) {
      findings.push(createFinding({
        severity: 'high',
        type: 'missing_reference_route',
        pattern: patternName,
        message: `Mother template ${patternName} has no reference route.`
      }));
    }

    for (const route of referenceRoutes) {
      if (!knownRoutes.includes(route)) {
        findings.push(createFinding({
          severity: 'medium',
          type: 'reference_route_not_in_pattern',
          pattern: patternName,
          message: `Reference route ${route} is not mapped to ${patternName} in page-patterns.json.`,
          expected: patternName,
          actual: pagePatterns.routes?.[route] || 'unmapped'
        }));
      }
    }

    for (const route of knownRoutes) {
      if (!migrationRoutes.includes(route) && !referenceRoutes.includes(route)) {
        findings.push(createFinding({
          severity: 'low',
          type: 'route_missing_from_migration_order',
          pattern: patternName,
          message: `Route ${route} is mapped to ${patternName} but is not listed in migrationOrder.`,
          expected: 'listed in migrationOrder',
          actual: route
        }));
      }
    }

    for (const family of template.componentFamilies || []) {
      if (!componentFamilies.has(family)) {
        findings.push(createFinding({
          severity: 'medium',
          type: 'unknown_component_family',
          pattern: patternName,
          message: `Template ${patternName} references unknown component family ${family}.`,
          expected: [...componentFamilies].sort().join(', '),
          actual: family
        }));
      }
    }

    if (!template.canonicalSlots?.includes('header')) {
      findings.push(createFinding({
        severity: patternName === 'AdminPage' ? 'medium' : 'high',
        type: 'missing_header_slot',
        pattern: patternName,
        message: `Template ${patternName} must include a header slot.`
      }));
    }
  }

  const rolloutPhases = motherTemplates.rolloutPhases || [];
  const activePhase = rolloutPhases.find((phase) => phase.status === 'active') || null;
  const nextPhases = rolloutPhases.filter((phase) => phase.status === 'next');

  return {
    generatedAt: new Date().toISOString(),
    mode: 'advisory',
    summary: {
      ...summarizeFindings(findings),
      templates: templateEntries.length,
      pagePatterns: Object.keys(pagePatterns.patterns || {}).length,
      routePatterns: Object.values(routePatterns).reduce((count, routes) => count + routes.length, 0),
      componentFamilies: componentFamilies.size,
      validationGroups: [...validationGroups].filter((groupName) => (
        (motherTemplates.requiredValidationGroups || []).includes(groupName)
      )).length,
      activePhase: activePhase ? activePhase.name : '',
      nextPhases: nextPhases.map((phase) => phase.name)
    },
    findings,
    inventory: {
      foundation: Object.fromEntries(
        Object.entries(motherTemplates.foundation || {}).map(([key, value]) => [
          key,
          {
            path: normalizePath(value),
            exists: fileExists(repoRoot, value)
          }
        ])
      ),
      templates: Object.fromEntries(
        templateEntries.map(([patternName, template]) => [
          patternName,
          {
            referenceRoutes: template.referenceRoutes || [],
            migrationStatus: template.migrationStatus || '',
            migrationOrderCount: (template.migrationOrder || []).length,
            componentFamilies: template.componentFamilies || [],
            canonicalSlots: template.canonicalSlots || []
          }
        ])
      )
    }
  };
}

module.exports = {
  buildMotherTemplateAudit,
  createFinding,
  loadDefaultContracts,
  loadMotherTemplateManifest,
  normalizeRoute,
  resolveRoutePatterns,
  summarizeFindings
};
