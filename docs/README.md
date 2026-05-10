# Documentation Guide

This folder now keeps only active, useful project documentation. Old audit
snapshots, closed remediation notes and stale screenshots are deleted instead of
being carried forever.

## Start Here

- [Manual functional QA](qa/MANUAL_FUNCTIONAL_QA.md): local customer-style testing environment for reserve, CRM, availability, WhatsApp and call checks.
- [Preproduction setup](deployment/PREPRODUCTION.md): Vercel-ready staging/release setup with Railway backend and public runtime config.
- [Admin reservations desk](admin/admin-reservations.md): CRM/admin setup, login and reservation storage notes.
- [Manual editing guide](admin/MANUAL-EDITING-GUIDE.md): safe editing map for content changes.
- [Test plan](qa/test-plan.md): baseline test strategy.

## Active Folders

- [audit/](audit/README.md): current QA memory, playbooks, functional task reports and release gates.
- [architecture/](architecture/README.md): active product/SEO architecture and implementation roadmaps.
- [admin/](admin/admin-reservations.md): CRM, content editor and private operations guides.
- [content/](content/premium-copy-guide.md): copywriting and brand voice rules.
- [deployment/](deployment/PREPRODUCTION.md): staging, Vercel and backend release setup.
- [design-system/](design-system/design-system-patterns-plan.md): brand tokens, component contracts and layout patterns.
- [pricing/](pricing/pricing-agent.md): pricing agent workflow and guardrails.
- [qa/](qa/MANUAL_FUNCTIONAL_QA.md): manual and automated QA operating guides.
- [templates/](templates/vehicle-page-template.md): reusable page templates and structural rules.
- [previews/](previews/README.md): non-public HTML/CSS working previews and component references.
- [archive/](archive/README.md): policy only; do not use it as a dumping ground.

## Specialist Docs

- [Agentic audit](audit/agentic-audit.md): agent audit workflow.
- [Block editor roadmap](admin/BLOCK-EDITOR-ROADMAP.md): future admin-managed content blocks.
- [Premium copy guide](content/premium-copy-guide.md): copywriting rules for the premium tone.
- [Pricing agent](pricing/pricing-agent.md): pricing workflow and guardrails.
- [Vehicle page template](templates/vehicle-page-template.md): PDP structure rules.

## Cleanup Rules

- Keep public website files under `site/`.
- Keep backend runtime and helper scripts under `server/`.
- Keep active documentation under `docs/`.
- Keep current functional QA and release checks discoverable from this README.
- Delete obsolete Markdown and stale screenshots instead of archiving them.
- Do not add generated audit exports, temporary screenshots or one-off logs to git.
