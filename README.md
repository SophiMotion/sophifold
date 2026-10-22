# Sophifold · SophiMotion

Interactive Three.js showcase using the real Sophifold CAD assembly and SophiMotion branding.

**Website:** https://sophimotion.github.io/sophifold/

## Demo

Sophifold drives toward the cube, unfolds both shells, picks up the cube on its right, transfers it sideways to the left, places it, folds, and drives back. Later cycles reverse direction without teleporting the cube.

- Play/Pause/Resume and Restart, with 1×, 1.5× and 2× playback.
- Manual folding limits: base 0–90°, upper 0–180°. Fully folded is 0% and 0° on both joints.
- Original Fusion mounting alignment follows the upper folding shell; the arm uses base yaw and pitch joints for lateral transfer.
- Component inspection, isolation, screw folder visibility, camera presets, edges, grid, PNG capture, English/Chinese and themes.

This is a visual mechanism preview. Physical motor travel, timing, contact forces and mechanical clearances are not certified.

## Local development

Requires Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
```

For a GitHub Pages build, set `BASE_PATH=/sophifold/` when running `pnpm build`. Ordinary local builds default to `/`.

## Publishing

The GitHub Actions workflow tests, builds and deploys `dist` after pushes to `main`. GitHub Pages must use **GitHub Actions** as its source in repository Settings → Pages.

## CAD assets

The supplied STEP was tessellated locally with Native OpenCascade 8.0.1. The published model contains 99 selectable groups and 1,049,847 triangles. Dimensions use millimeters. Source coordinates map `(x,y,z)` to display `(z,x,y)`, with display Z up.

The original STEP and local conversion environments are not included. The browser-ready mesh, compressed alternative, component metadata, motor segmentation and brand assets are in `public/assets`. Metadata records source SHA-256 `35cedb91e7ff22e99381a46e2c737b588098e51cb2d13bacc65fca7bdb9417d1`.

Conversion helpers in `scripts` preserve geometry. New assembly revisions also need stable component mapping and hinge/arm calibration before replacing the assets. Folding and the arm mount share the same rigid transform to preserve the Fusion mating relationship.
