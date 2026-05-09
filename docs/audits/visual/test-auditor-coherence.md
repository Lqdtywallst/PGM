# Test and auditor coherence audit

## Scope

- Branch: `agent/visual-implementation`
- Folder: `PGM-visual-implementation`
- Date: 2026-05-10
- Area reviewed: npm scripts, audit runners, unit tests, e2e tests, visual baselines and local generated files.

## Cleanup performed

- Removed ignored local `artifacts/` output from this worktree.
- No tracked source, tests, baselines, scripts or docs were deleted.

Reason: the tracked audit/test surface contains live CI and regression memory. Removing it without consolidation would be risky.

## Inventory

- `package.json` scripts: 77 total.
- Audit / agent / test scripts: 68.
- Script files in `scripts/`: 23.
- Audit/core files in `server/`: 13.
- Test files: 43.
- Unit test files: 17.
- E2E spec files: 25.
- Integration test files: 1.
- Visual baseline files: 217.
- Visual baseline route folders: 32.

## Verification

Initial command:

```bash
npm run test:visual
```

Result: failed because this worktree has no local `node_modules`.

Observed missing modules:

- `express`
- `playwright`
- `@playwright/test`
- `pngjs`

Retest command using the main worktree dependency folder:

```bash
$env:NODE_PATH='C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\node_modules'; npm run test:visual
```

Result: pass.

Summary:

- 225 passing
- 0 failing

## Findings

1. The test/audit engine is functionally healthy once dependencies are available.
2. The current command surface is too wide: `audit:*`, `agent:*` and `test:*` overlap heavily.
3. Navigation has the most command sprawl: quick, critical, deep, matrix, full, surfaces, exhaustive and strict.
4. Visual audit has three concepts mixed together: smoke, robust and memory/change guard.
5. Some utility scripts are not exposed through npm scripts:
   - `scripts/inspect-route-metrics.js`
   - `scripts/sync-social-meta.js`
6. `scripts/sync-social-meta.js` is referenced by older SEO audit docs, so it should not be deleted without replacing that workflow.
7. `scripts/inspect-route-metrics.js` looks like a manual visual debugging helper. It can either be documented or removed later after owner confirmation.
8. The visual baselines are large, but they are intentional regression memory. Do not delete them as cleanup.
9. `docs/audits/visual/global-change-needed.md` is still relevant: `site/js/site-v2.js` keeps `initLocationsMap()`, while current `locations.html` no longer uses `data-locations-map`.

## Implemented canonical taxonomy

These commands are now the human-facing entry points:

- `npm run audit:quick`: fast local confidence check. Runs auditor unit contracts, quick navigation and a scoped visual smoke on Home, Fleet and Contact.
- `npm run audit:strict`: deeper pre-merge check. Runs strict navigation, robust visual audit and functional journey groups.
- `npm run audit:ci`: CI-equivalent full audit suite. Alias of `npm run audit`.

Supporting specialist commands remain available:

- `npm run test:visual`: unit contract suite for auditors and visual logic.
- `npm run test:e2e`: full Playwright e2e suite.
- `npm run audit:visual:smoke`: fast visual route check.
- `npm run audit:visual:robust`: screenshot/baseline visual audit.
- `npm run audit:visual:memory`: approved-regression memory guard.
- `npm run audit:navigation:quick`: fast navigation sanity.
- `npm run audit:navigation:strict`: full navigation gate.
- `npm run audit:functional:master`: functional grouped gate.
- `npm run audit:final`: final composed gate.

Treat the rest as advanced aliases or specialist commands.

## Post-consolidation validation

Command:

```bash
$env:NODE_PATH='C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\node_modules'; npm run audit:quick
```

Result: failed honestly on the visual smoke gate.

- `npm run test:visual`: pass, 225 passing and 0 failing.
- `npm run audit:navigation:quick`: pass, status `good`, 44/44 browser back checks and 0 failed handoffs.
- Scoped visual smoke: failed on 6/6 page-viewports for Home, Fleet and Contact because current screenshots/typography/layout differ from the approved visual contracts.

Interpretation: the consolidated quick gate is concrete and usable, but the current page state still needs visual fixes or intentional baseline/memory approval before `audit:quick` can pass.

## Cleanup candidates for a later safe pass

- Add npm script or doc entry for `scripts/inspect-route-metrics.js`, or remove it if no longer used.
- Keep `scripts/sync-social-meta.js`, but document it under SEO maintenance if still valid.
- Consolidate or hide advanced navigation aliases after the team confirms which levels are still needed:
  - critical
  - deep
  - matrix
  - full
  - surfaces
  - exhaustive
- Consolidate or hide advanced visual aliases after baseline ownership is clear:
  - viewport-specific smoke aliases
  - responsive memory aliases
  - approve/update baseline aliases
- Move advanced/internal commands out of the main README surface, if they are documented there later.

## Guardrail

Do not delete tracked tests, audit runners or baselines until the command taxonomy is approved and one replacement command exists for every removed workflow.
