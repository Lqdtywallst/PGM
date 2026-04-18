# Archived 3D Lab

Archived on 2026-04-18 after the relational inventory confirmed the 3D experiment was not linked from any public page under `site/`.

Contents:

- `site-v2-3d.js`: experimental public-side controller
- `vendor/three/`: vendored Three.js loader bundle used by that experiment
- `media/models/`: GLB assets used by the experiment

Policy:

- these files stay outside the public tree
- do not move them back into `site/` without a fresh product decision, performance review, and explicit page integration
- if the experiment is revived, reintroduce only the minimum files actually needed by the new surface
