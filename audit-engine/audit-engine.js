import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { PUBLIC_PAGE_FILE_MAP } = require(path.resolve(__dirname, "../server/public-page-map.js"));
const {
  VISUAL_FINDING_CATEGORIES,
  classifyRouteProfile,
  createVisualFinding,
  scoreVisualPage,
  summarizeVisualFindings
} = require(path.resolve(__dirname, "../server/visual-audit-core.js"));
const CUSTOMER_MISSIONS = require(path.resolve(__dirname, "../test-data/customer-missions.json"));

const MAIN_NAV_ROUTES = new Map([
  ["/", "Home"],
  ["/fleet.html", "Fleet"],
  ["/services.html", "Services"],
  ["/locations.html", "Locations"],
  ["/about.html", "About Us"],
  ["/contact.html", "Contact"]
]);
const CUSTOMER_MISSION_INDEX = new Map(CUSTOMER_MISSIONS.map((mission) => [mission.id, mission]));
const AGENTIC_OBSERVATION_TYPES = [
  "success",
  "friction",
  "confusion",
  "bug",
  "dead_end",
  "lost_state",
  "console_error",
  "validation",
  "performance",
  "mobile_layout",
  "cta_overload",
  "copy"
];
const AGENTIC_OBSERVATION_WEIGHTS = {
  success: { low: -2, medium: -3, high: -4 },
  friction: { low: 4, medium: 8, high: 14 },
  confusion: { low: 5, medium: 10, high: 16 },
  bug: { low: 8, medium: 16, high: 28 },
  dead_end: { low: 8, medium: 16, high: 24 },
  lost_state: { low: 8, medium: 16, high: 24 },
  console_error: { low: 6, medium: 12, high: 20 },
  validation: { low: 4, medium: 9, high: 14 },
  performance: { low: 4, medium: 8, high: 14 },
  mobile_layout: { low: 5, medium: 10, high: 16 },
  cta_overload: { low: 4, medium: 9, high: 14 },
  copy: { low: 4, medium: 8, high: 12 }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCustomerMissionOrThrow(missionId) {
  const mission = CUSTOMER_MISSION_INDEX.get(String(missionId || ""));

  if (!mission) {
    throw new Error(`Unknown customer mission: ${missionId}`);
  }

  return mission;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "));
}

function countMatches(text, regex) {
  const matches = String(text || "").match(regex);
  return matches ? matches.length : 0;
}

function parseAttributes(rawAttributes) {
  const attributes = {};
  const pattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;

  while ((match = pattern.exec(String(rawAttributes || ""))) !== null) {
    const [, key, doubleQuoted, singleQuoted, bareValue] = match;
    attributes[key.toLowerCase()] = doubleQuoted ?? singleQuoted ?? bareValue ?? "";
  }

  return attributes;
}

function collectActions(html) {
  const actions = [];
  const pattern = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = pattern.exec(String(html || ""))) !== null) {
    const [, tagName, rawAttributes, innerHtml] = match;
    const attributes = parseAttributes(rawAttributes);
    const label = normalizeWhitespace(stripTags(innerHtml));

    if (!label) {
      continue;
    }

    actions.push({
      tagName: tagName.toLowerCase(),
      label,
      href: attributes.href || "",
      className: attributes.class || "",
      ariaLabel: attributes["aria-label"] || ""
    });
  }

  return actions;
}

function collectForms(html) {
  return countMatches(html, /<form\b/gi);
}

function hasMetaDescription(html) {
  return /<meta\s+name=["']description["'][^>]*content=["'][^"']+["'][^>]*>/i.test(html);
}

function hasTitle(html) {
  return /<title>[\s\S]*<\/title>/i.test(html);
}

function hasMainLandmark(html) {
  return /<main\b/i.test(html);
}

function hasCanonical(html) {
  return /<link\s+rel=["']canonical["'][^>]*href=["'][^"']+["'][^>]*>/i.test(html);
}

function hasHeroMedia(html) {
  return /<(img|picture|video)\b/i.test(html);
}

function actionPriority(action) {
  const haystack = `${action.label} ${action.className} ${action.ariaLabel}`.toLowerCase();
  let score = 0;

  if (/(primary|cta|submit|hero-lab__cta--primary|button--primary|btn-primary)/.test(haystack)) {
    score += 4;
  }

  if (/(reserve|reservation|rent|start|book|search vehicles|contact|call|whatsapp)/.test(haystack)) {
    score += 3;
  }

  if (action.tagName === "button") {
    score += 1;
  }

  return score;
}

function rankActions(actions, limit = 10) {
  return [...actions]
    .sort((left, right) => {
      const rightScore = actionPriority(right);
      const leftScore = actionPriority(left);

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, limit)
    .map((action) => ({
      ...action,
      priority: actionPriority(action)
    }));
}

function getBodyHtml(html) {
  const bodyMatch = String(html || "").match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : String(html || "");
}

function getFirstViewportSlice(html) {
  const bodyHtml = getBodyHtml(html);
  return bodyHtml.slice(0, 12000);
}

function evaluateFirstViewportHeuristics(html, route = "") {
  const leadingSlice = getFirstViewportSlice(html);
  const leadingActions = collectActions(leadingSlice);
  const rankedActions = rankActions(leadingActions, 6);
  const issues = [];
  let score = 100;

  const h1Count = countMatches(leadingSlice, /<h1\b/gi);
  const hasNav = /<nav\b/i.test(leadingSlice);
  const hasLeadCopy =
    /class=["'][^"']*(lead|intro|copy|summary|trust|eyebrow)[^"']*["']/i.test(leadingSlice) ||
    countMatches(leadingSlice, /<p\b/gi) > 0;
  const hasVisualMedia = hasHeroMedia(leadingSlice);
  const hasHeroSignal = /(hero|masthead|intro|eyebrow|launcher|featured|above-the-fold)/i.test(leadingSlice);
  const primaryActionCount = rankedActions.filter((action) => action.priority >= 3).length;

  if (h1Count === 0) {
    issues.push({ severity: "high", type: "viewport", message: "First viewport is missing an H1." });
    score -= 20;
  } else if (h1Count > 1) {
    issues.push({ severity: "medium", type: "viewport", message: "First viewport contains multiple H1 elements." });
    score -= 12;
  }

  if (!hasHeroSignal) {
    issues.push({ severity: "medium", type: "viewport", message: "No clear hero or intro region was detected near the top of the page." });
    score -= 10;
  }

  if (!hasNav) {
    issues.push({ severity: "medium", type: "navigation", message: "Main navigation is not obvious in the first viewport markup." });
    score -= 8;
  }

  if (!hasLeadCopy) {
    issues.push({ severity: "medium", type: "content", message: "First viewport lacks supporting copy under the main promise." });
    score -= 8;
  }

  if (!hasVisualMedia) {
    issues.push({ severity: "medium", type: "visual", message: "First viewport does not expose a clear media or visual asset." });
    score -= 8;
  }

  if (primaryActionCount === 0) {
    issues.push({ severity: "high", type: "cta", message: "No clear primary action was detected in the first viewport." });
    score -= 18;
  } else if (primaryActionCount > 2) {
    issues.push({ severity: "medium", type: "cta", message: "First viewport appears to present too many primary actions." });
    score -= 10;
  }

  if (leadingActions.length > 4) {
    issues.push({ severity: "medium", type: "cta", message: "First viewport has CTA overload; trim the number of immediate actions." });
    score -= 10;
  }

  return {
    route,
    score: clamp(score, 0, 100),
    metrics: {
      h1Count,
      hasNav,
      hasLeadCopy,
      hasVisualMedia,
      hasHeroSignal,
      actionCount: leadingActions.length,
      primaryActionCount
    },
    primaryActions: rankedActions,
    issues
  };
}

function analyzeDocumentHeuristics(html, route = "") {
  const issues = [];
  const actions = collectActions(html);
  const forms = collectForms(html);
  let score = 100;

  const h1Count = countMatches(html, /<h1\b/gi);
  const h2Count = countMatches(html, /<h2\b/gi);
  const imageCount = countMatches(html, /<img\b/gi);
  const imageAltCount = countMatches(html, /<img\b[^>]*\balt=["'][^"']*["']/gi);
  const lazyCount = countMatches(html, /<img\b[^>]*\bloading=["']lazy["']/gi);
  const sectionCount = countMatches(html, /<section\b/gi);
  const divCount = countMatches(html, /<div\b/gi);

  if (!hasTitle(html)) {
    issues.push({ severity: "high", type: "seo", message: "Document is missing a <title>." });
    score -= 20;
  }

  if (!hasMetaDescription(html)) {
    issues.push({ severity: "high", type: "seo", message: "Document is missing a meta description." });
    score -= 16;
  }

  if (!hasCanonical(html)) {
    issues.push({ severity: "medium", type: "seo", message: "Document is missing a canonical link." });
    score -= 8;
  }

  if (!hasMainLandmark(html)) {
    issues.push({ severity: "medium", type: "accessibility", message: "Document is missing a <main> landmark." });
    score -= 8;
  }

  if (h1Count === 0) {
    issues.push({ severity: "high", type: "seo", message: "Document is missing an H1." });
    score -= 18;
  } else if (h1Count > 1) {
    issues.push({ severity: "medium", type: "seo", message: "Document contains more than one H1." });
    score -= 10;
  }

  if (h2Count > 8) {
    issues.push({ severity: "medium", type: "layout", message: "Document contains many H2 headings; hierarchy may feel noisy." });
    score -= 6;
  }

  if (actions.length > 14) {
    issues.push({ severity: "medium", type: "layout", message: "Document exposes many actions; review CTA hierarchy." });
    score -= 6;
  }

  if (imageCount > imageAltCount) {
    issues.push({ severity: "high", type: "accessibility", message: "Some images are missing alt attributes." });
    score -= 12;
  }

  if (imageCount > lazyCount) {
    issues.push({ severity: "medium", type: "performance", message: "Some images are missing loading=\"lazy\"." });
    score -= 6;
  }

  if (divCount > 30 && sectionCount < 2) {
    issues.push({ severity: "medium", type: "code_quality", message: "Document uses many divs with little section-level structure." });
    score -= 6;
  }

  return {
    route,
    score: clamp(score, 0, 100),
    metrics: {
      h1Count,
      h2Count,
      actionCount: actions.length,
      forms,
      imageCount,
      imageAltCount,
      lazyCount,
      sectionCount,
      divCount
    },
    issues
  };
}

function fixHtml(html) {
  let updated = String(html || "");
  const changes = [];

  if (!hasTitle(updated)) {
    updated = updated.replace(/<head>/i, "<head>\n  <title>Page Title</title>");
    changes.push("Inserted a placeholder <title>.");
  }

  if (!hasMetaDescription(updated)) {
    updated = updated.replace(
      /<head>/i,
      '<head>\n  <meta name="description" content="Describe this page with a concise, search-ready summary.">'
    );
    changes.push("Inserted a placeholder meta description.");
  }

  if (!/<h1\b/i.test(updated)) {
    updated = updated.replace(/<main\b[^>]*>/i, (match) => `${match}\n  <h1>Main Heading</h1>`);

    if (updated === html) {
      updated = updated.replace(/<body\b[^>]*>/i, (match) => `${match}\n  <h1>Main Heading</h1>`);
    }

    changes.push("Inserted a placeholder H1.");
  }

  updated = updated.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"');
  updated = updated.replace(/<img\b(?![^>]*\balt=)/gi, '<img alt=""');

  if (updated !== html && changes.length === 0) {
    changes.push("Added missing image loading or alt attributes.");
  }

  return { improvedHtml: updated, changes };
}

function categorizeRoute(publicPath, filePath) {
  if (MAIN_NAV_ROUTES.has(publicPath)) {
    return "main";
  }

  if (publicPath === "/app/reserve/page.html") {
    return "app";
  }

  if (filePath.includes("pages/guides/")) {
    return "guide";
  }

  if (filePath.includes("pages/services/")) {
    return "service-detail";
  }

  if (filePath.includes("pages/brands/")) {
    return "brand";
  }

  if (filePath.includes("pages/vehicles/")) {
    return "vehicle";
  }

  if (filePath.includes("pages/legal/")) {
    return "legal";
  }

  return "other";
}

function mapRoutes() {
  const routes = Object.entries(PUBLIC_PAGE_FILE_MAP)
    .map(([publicPath, filePath]) => ({
      publicPath,
      filePath,
      category: categorizeRoute(publicPath, filePath),
      isPrimaryNav: MAIN_NAV_ROUTES.has(publicPath),
      navLabel: MAIN_NAV_ROUTES.get(publicPath) || ""
    }))
    .sort((left, right) => left.publicPath.localeCompare(right.publicPath));

  const totals = routes.reduce((accumulator, route) => {
    accumulator.total += 1;
    accumulator.byCategory[route.category] = (accumulator.byCategory[route.category] || 0) + 1;
    return accumulator;
  }, { total: 0, byCategory: {} });

  return {
    totals,
    primaryNavigation: routes.filter((route) => route.isPrimaryNav),
    routes
  };
}

function suggestTestCases(route = "", html = "") {
  const safeRoute = String(route || "");
  const viewport = evaluateFirstViewportHeuristics(html, safeRoute);
  const actions = rankActions(collectActions(html), 8);
  const formCount = collectForms(html);
  const suggestions = [];

  if (safeRoute === "/" || viewport.metrics.hasHeroSignal) {
    suggestions.push({
      priority: "high",
      title: "home first viewport stays focused",
      goal: "Keep one H1, one dominant CTA and visible hero copy above the fold.",
      selectors: ["h1", ".hero-lab__cta--primary", ".hero-lab"]
    });

    suggestions.push({
      priority: "high",
      title: "main navigation opens each top-level route",
      goal: "Verify Fleet, Services, Locations and About links open without console errors.",
      selectors: ["nav[aria-label='Main navigation']", "a[href='./fleet.html']", "a[href='./services.html']"]
    });
  }

  if (/fleet/i.test(safeRoute) || actions.some((action) => /search vehicles|reservation|rent/i.test(action.label))) {
    suggestions.push({
      priority: "high",
      title: "booking intent survives cross-page handoff",
      goal: "Dates chosen upstream should arrive in the fleet or reserve flow.",
      selectors: ["#hero-lab-pickup-date", "#fleet-pickup-date", "#startDate"]
    });
  }

  if (formCount > 0 || /contact/i.test(safeRoute)) {
    suggestions.push({
      priority: "high",
      title: "form success and validation states are covered",
      goal: "Submit the form with demo data and assert success plus required field handling.",
      selectors: ["form", "button[type='submit']", "[role='status']"]
    });
  }

  if (/reserve/i.test(safeRoute)) {
    suggestions.push({
      priority: "high",
      title: "reserve page applies query prefills",
      goal: "Query params and stored booking intent should hydrate dates, times and selected car.",
      selectors: ["#selectedCar", "#startDate", "#endDate", "#pickupTime", "#dropoffTime"]
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      priority: "medium",
      title: "route renders cleanly",
      goal: "Open the route, assert a visible heading or main landmark, and record console errors.",
      selectors: ["h1", "main"]
    });
  }

  return suggestions;
}

function listCustomerMissions() {
  return CUSTOMER_MISSIONS.map((mission) => ({
    id: mission.id,
    title: mission.title,
    persona: mission.persona,
    priority: mission.priority,
    entryRoute: mission.entryRoute,
    devices: mission.devices,
    routesInScope: mission.routesInScope,
    stableCoverage: mission.stableCoverage
  }));
}

function buildAgenticPrompt(missionId) {
  const mission = getCustomerMissionOrThrow(missionId);
  const promptLines = [
    `Use Playwright as a ${mission.persona.toLowerCase()}.`,
    "",
    `Mission ID: ${mission.id}`,
    `Mission title: ${mission.title}`,
    `Goal: ${mission.goal}`,
    `Entry route: ${mission.entryRoute}`,
    `Routes in scope: ${mission.routesInScope.join(", ")}`,
    "",
    "Behave like a real customer:",
    ...mission.humanBehaviors.map((behavior) => `- ${behavior}`),
    "",
    "Watch for friction:",
    ...mission.frictionSignals.map((signal) => `- ${signal}`),
    "",
    "Success signals:",
    ...mission.successSignals.map((signal) => `- ${signal}`),
    "",
    "At the end report:",
    "1. functional bugs",
    "2. usability friction",
    "3. lost-state or handoff issues",
    "4. missing Playwright coverage",
    "",
    `Existing stable coverage: ${mission.stableCoverage.join(", ")}`
  ];

  return {
    mission,
    prompt: promptLines.join("\n")
  };
}

function observationWeight(observation) {
  const type = String(observation.type || "");
  const severity = String(observation.severity || "medium");
  const severityWeights = AGENTIC_OBSERVATION_WEIGHTS[type] || AGENTIC_OBSERVATION_WEIGHTS.friction;
  let weight = severityWeights[severity] ?? severityWeights.medium;

  if (observation.blocking && type !== "success") {
    weight += 8;
  }

  return weight;
}

function getMissionActionRecommendations(observations) {
  const types = new Set(observations.map((observation) => observation.type));
  const actions = [];

  if (types.has("lost_state")) {
    actions.push("Add or expand a stable regression around booking-intent handoff across pages.");
  }

  if (types.has("bug") || types.has("dead_end")) {
    actions.push("Fix blocking navigation or form behavior before widening exploratory coverage.");
  }

  if (types.has("confusion") || types.has("cta_overload") || types.has("copy")) {
    actions.push("Tighten CTA hierarchy and supporting copy so the next step is obvious without rereading.");
  }

  if (types.has("validation")) {
    actions.push("Clarify validation and disabled-button states with faster inline feedback.");
  }

  if (types.has("console_error") || types.has("performance")) {
    actions.push("Inspect console and performance-heavy assets for hidden friction during critical interactions.");
  }

  if (types.has("mobile_layout")) {
    actions.push("Re-run the responsive audit and adjust layout stability on mobile-first flows.");
  }

  if (!types.has("success")) {
    actions.push("Confirm at least one clean happy path with no hesitation before calling the mission healthy.");
  }

  return actions;
}

function scoreCustomerFriction(missionId, observations = []) {
  const mission = getCustomerMissionOrThrow(missionId);
  const normalizedObservations = observations.map((observation) => ({
    type: observation.type,
    severity: observation.severity || "medium",
    detail: normalizeWhitespace(observation.detail),
    route: observation.route || "",
    blocking: Boolean(observation.blocking),
    weight: observationWeight(observation)
  }));

  const totalAdjustment = normalizedObservations.reduce((sum, observation) => sum + observation.weight, 0);
  const experienceScore = clamp(100 - totalAdjustment, 0, 100);
  const frictionScore = 100 - experienceScore;
  const status =
    experienceScore >= 85 ? "healthy" :
    experienceScore >= 70 ? "watch" :
    "needs-work";

  const counts = normalizedObservations.reduce((summary, observation) => {
    summary.total += 1;
    summary.byType[observation.type] = (summary.byType[observation.type] || 0) + 1;
    summary.bySeverity[observation.severity] = (summary.bySeverity[observation.severity] || 0) + 1;
    return summary;
  }, { total: 0, byType: {}, bySeverity: {} });

  const blockers = normalizedObservations.filter((observation) => (
    observation.blocking || observation.type === "bug" || observation.type === "dead_end" || observation.severity === "high"
  ));

  return {
    mission: {
      id: mission.id,
      title: mission.title,
      persona: mission.persona,
      priority: mission.priority,
      entryRoute: mission.entryRoute
    },
    status,
    experienceScore,
    frictionScore,
    counts,
    blockers,
    observations: normalizedObservations,
    suggestedActions: getMissionActionRecommendations(normalizedObservations),
    stableCoverage: mission.stableCoverage
  };
}

function toJsonContent(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

const server = new McpServer({
  name: "audit-engine",
  version: "1.0.0"
});
const agenticObservationSchema = z.object({
  type: z.enum(AGENTIC_OBSERVATION_TYPES),
  severity: z.enum(["low", "medium", "high"]).optional(),
  detail: z.string(),
  route: z.string().optional(),
  blocking: z.boolean().optional()
});
const visualFindingSchema = z.object({
  route: z.string(),
  viewport: z.string().optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  category: z.enum(VISUAL_FINDING_CATEGORIES),
  selector: z.string().optional(),
  message: z.string(),
  evidence: z.string().optional(),
  likelyCause: z.string().optional(),
  hardFail: z.boolean().optional(),
  screenshotPath: z.string().optional(),
  source: z.string().optional()
});

server.tool(
  "audit_full",
  "Audit HTML structure plus first viewport heuristics for a page.",
  {
    html: z.string(),
    route: z.string().optional()
  },
  async ({ html, route }) => {
    const structural = analyzeDocumentHeuristics(html, route);
    const viewport = evaluateFirstViewportHeuristics(html, route);
    const score = Math.round(structural.score * 0.6 + viewport.score * 0.4);
    const visualProfile = classifyRouteProfile(route || "");

    return toJsonContent({
      route: route || "",
      visualProfile,
      score,
      structural,
      viewport,
      issues: [...structural.issues, ...viewport.issues]
    });
  }
);

server.tool(
  "fix_all",
  "Apply safe placeholder fixes for missing metadata and image attributes.",
  {
    html: z.string()
  },
  async ({ html }) => {
    return toJsonContent(fixHtml(html));
  }
);

server.tool(
  "map_app_routes",
  "Return the route map exposed by the local public page adapter.",
  {},
  async () => {
    return toJsonContent(mapRoutes());
  }
);

server.tool(
  "evaluate_first_viewport",
  "Evaluate first viewport clarity from HTML heuristics.",
  {
    html: z.string(),
    route: z.string().optional()
  },
  async ({ html, route }) => {
    return toJsonContent(evaluateFirstViewportHeuristics(html, route));
  }
);

server.tool(
  "list_primary_actions",
  "List the most prominent actions detected in a page.",
  {
    html: z.string(),
    limit: z.number().int().min(1).max(20).optional()
  },
  async ({ html, limit }) => {
    const actions = rankActions(collectActions(html), limit || 10);
    return toJsonContent({ count: actions.length, actions });
  }
);

server.tool(
  "suggest_test_cases",
  "Suggest Playwright test cases for a route using route hints and HTML structure.",
  {
    route: z.string(),
    html: z.string()
  },
  async ({ route, html }) => {
    return toJsonContent({
      route,
      suggestions: suggestTestCases(route, html)
    });
  }
);

server.tool(
  "classify_route_profile",
  "Classify a public route into the visual audit profile used by the visual agent.",
  {
    route: z.string()
  },
  async ({ route }) => {
    return toJsonContent({
      route,
      profile: classifyRouteProfile(route)
    });
  }
);

server.tool(
  "score_visual_page",
  "Score a page from structured visual findings plus optional baseline and vision metadata.",
  {
    route: z.string().optional(),
    profile: z.string().optional(),
    metrics: z.record(z.string(), z.any()).optional(),
    findings: z.array(visualFindingSchema),
    baseline_diff: z.object({
      status: z.enum(["pass", "review", "bad", "missing", "updated"]),
      kind: z.string().optional(),
      ratio: z.number().optional(),
      threshold: z.number().optional(),
      diffPath: z.string().optional(),
      message: z.string().optional()
    }).optional(),
    vision: z.object({
      status: z.string(),
      reason: z.string().optional(),
      requiresHumanReview: z.boolean().optional()
    }).optional()
  },
  async ({ route, profile, metrics, findings, baseline_diff, vision }) => {
    const resolvedProfile = profile || classifyRouteProfile(route || "");
    const normalizedFindings = findings.map((finding) => createVisualFinding(finding));

    return toJsonContent(
      scoreVisualPage(
        resolvedProfile,
        metrics || {},
        normalizedFindings,
        {
          baselineDiff: baseline_diff,
          vision
        }
      )
    );
  }
);

server.tool(
  "summarize_visual_findings",
  "Deduplicate and summarize structured visual findings for a page or full run.",
  {
    findings: z.array(visualFindingSchema)
  },
  async ({ findings }) => {
    return toJsonContent(
      summarizeVisualFindings(findings.map((finding) => createVisualFinding(finding)))
    );
  }
);

server.tool(
  "list_customer_missions",
  "List the customer missions used for human-like QA exploration.",
  {},
  async () => {
    return toJsonContent({
      total: CUSTOMER_MISSIONS.length,
      missions: listCustomerMissions()
    });
  }
);

server.tool(
  "build_agentic_prompt",
  "Build a Playwright exploration prompt for a customer mission.",
  {
    mission_id: z.string()
  },
  async ({ mission_id }) => {
    return toJsonContent(buildAgenticPrompt(mission_id));
  }
);

server.tool(
  "score_customer_friction",
  "Score friction for a customer mission using structured findings from an exploratory run.",
  {
    mission_id: z.string(),
    observations: z.array(agenticObservationSchema).min(1)
  },
  async ({ mission_id, observations }) => {
    return toJsonContent(scoreCustomerFriction(mission_id, observations));
  }
);

const transport = new StdioServerTransport();

try {
  await server.connect(transport);
} catch (error) {
  console.error("audit-engine failed to start:", error);
  process.exit(1);
}
