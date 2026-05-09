# Documentation Guide

This folder now keeps only active, useful project documentation. Old audit
snapshots, closed remediation notes and stale screenshots are deleted instead of
being carried forever.

## Start Here

- [Manual functional QA](MANUAL_FUNCTIONAL_QA.md): local customer-style testing environment for reserve, CRM, availability, WhatsApp and call checks.
- [Preproduction setup](PREPRODUCTION.md): Vercel-ready staging/release setup with Railway backend and public runtime config.
- [Admin reservations desk](admin-reservations.md): CRM/admin setup, login and reservation storage notes.
- [Manual editing guide](MANUAL-EDITING-GUIDE.md): safe editing map for content changes.
- [Test plan](test-plan.md): baseline test strategy.

## Active Folders

- [audit/](audit/README.md): current QA memory, playbooks, functional task reports and release gates.
- [architecture/](architecture/README.md): active product/SEO architecture and implementation roadmaps.
- [previews/](previews/README.md): non-public HTML/CSS working previews and component references.
- [archive/](archive/README.md): policy only; do not use it as a dumping ground.

## Specialist Docs

- [Agentic audit](agentic-audit.md): agent audit workflow.
- [Block editor roadmap](BLOCK-EDITOR-ROADMAP.md): future admin-managed content blocks.
- [Premium copy guide](premium-copy-guide.md): copywriting rules for the premium tone.
- [Pricing agent](pricing-agent.md): pricing workflow and guardrails.
- [Vehicle page template](vehicle-page-template.md): PDP structure rules.

## Cleanup Rules

- Keep public website files under `site/`.
- Keep backend runtime and helper scripts under `server/`.
- Keep active documentation under `docs/`.
- Keep current functional QA and release checks discoverable from this README.
- Delete obsolete Markdown and stale screenshots instead of archiving them.
- Do not add generated audit exports, temporary screenshots or one-off logs to git.
