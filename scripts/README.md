# Scripts Layout

This folder is grouped by execution domain so agents can work without turning
the repository into a flat toolbox again.

## Folders

- `admin/`: private admin helpers, credentials, CRM/demo reservation utilities.
- `audits/`: automated site auditors and agent runners for visual, functional,
  navigation, copy, SEO, cleanup, memory and homogeneity checks.
- `build/`: deployment/build helpers that generate static runtime assets.
- `design-system/`: contract checks for shared UI patterns and component rules.
- `diagnostics/`: manual inspection utilities that are useful during debugging.
- `pricing/`: pricing agent runner and related operational commands.
- `qa/`: manual QA harnesses and preproduction/production functional gates.

## Rules

- Prefer exposing public entry points through `package.json` scripts.
- Keep shared logic in `server/*` modules; scripts should mostly orchestrate.
- If a new script belongs to an existing domain, place it in that folder.
- If a domain grows beyond a few orchestration files, extract reusable code into
  `server/<domain>/` and keep this folder as the CLI layer.
