# Agentic Audit

## Purpose

Use Codex plus Playwright MCP as a customer-like explorer, not only as a regression runner.

The stable suite keeps critical flows alive.
The agentic layer looks for:

- functional bugs
- hesitation points
- confusing copy
- CTA overload
- lost booking state
- weak validation feedback

## Mission Catalog

The source of truth lives in `test-data/customer-missions.json`.

Each mission defines:

- persona
- goal
- entry route
- routes in scope
- human behaviors to simulate
- success signals
- friction signals
- existing stable coverage

## MCP Tools

The local `audit_engine` exposes:

- `list_customer_missions`
- `build_agentic_prompt`
- `score_customer_friction`

Use them to:

1. choose a mission
2. build the exact exploratory prompt
3. score the findings after the run

## CLI

Generate the current mission pack and briefing:

```bash
npm run audit:agentic
```

Generate just one mission:

```bash
npm run audit:agentic -- --mission seo-landing-to-reserve
```

Outputs are written to:

- `artifacts/agentic-audit/agentic-audit-pack.json`
- `artifacts/agentic-audit/agentic-audit-brief.md`

## Recommended Loop

1. Run the stable customer suite first.
2. Generate the agentic brief.
3. Launch Codex in the repo and use one mission prompt.
4. Record structured findings.
5. Score friction with `audit_engine`.
6. Convert reproducible problems into Playwright tests.

## Suggested Codex Ask

```text
Use Playwright as a real customer.
Run mission seo-landing-to-reserve from my local mission pack.
Behave like a human, not like a DOM robot.
Report:
1. functional bugs
2. usability friction
3. lost-state issues
4. missing stable test coverage
```
