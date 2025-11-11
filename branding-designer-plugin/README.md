# Brand Style Designer — Figma Plugin

Brand Style Designer learns a brand’s visual language from a handful of reference layouts, then generates high-fidelity hero, social, announcement, and email templates that stay on-brand automatically.

## Highlights
- Learns a brand palette, typography pairings, corner radii, strokes, and shadow tokens from 1–5 selected frames.
- Surfaces a readable “brand DNA” summary directly in the plugin UI.
- Generates polished auto-layout templates (Hero, Social Spotlight, Launch Announcement, Email Narrative) that reuse learned tokens.
- Applies fallback heuristics when fonts or colors are missing so results are always usable.

## Getting Started

### 1. Install dependencies
```bash
cd branding-designer-plugin
npm install
```

### 2. Build the plugin bundle
```bash
npm run build
```

This writes production-ready assets to `dist/code.js` and `dist/ui.js`.

Use `npm run watch` during development for live rebuilds of both main and UI bundles.

### 3. Load into Figma
1. Open Figma desktop.
2. Navigate to *Plugins → Development → Import plugin from manifest…*
3. Select `branding-designer-plugin/manifest.json`.

The plugin should now appear under *Plugins → Development* as **Brand Style Designer**.

## Using the Plugin
1. Drop 1–5 frames/components that reflect the target brand into your canvas.
2. Select those references, then run **Brand Style Designer**.
3. Click **Learn from selection** to capture palette, fonts, and layout DNA.
4. Pick how many templates you need (1–6) and toggle desired layout families.
5. Press **Generate branded templates** to add fully styled frames onto the canvas.

Generated frames appear near your current viewport and remain selected so you can inspect or duplicate them immediately.

## Design Notes & Extensibility
- Template logic lives in `src/generator.ts`. Add new layout factories by extending `TemplatePatternId` and `templateFactories`.
- Brand analysis heuristics are implemented in `src/analysis.ts`. Adjust color priority scoring or introduce new tokens there.
- UI code (`src/ui/ui.ts`) is TypeScript compiled to the browser context. It handles status updates, pattern toggles, and communicates with the main thread.
- The build uses `esbuild` for fast bundling with zero runtime dependencies.

## Limitations & Next Steps
- Typography fidelity is limited by available fonts on the local system; missing fonts fall back to Inter.
- The plugin generates structural layouts and placeholders—swap image rectangles and copy with your real assets.
- Future enhancements could include: exporting design tokens, attaching generated variants to a team library, or integrating with remote model endpoints for richer semantic learning.

Enjoy designing! 🎨
