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

## Guided Tutorial
1. **Prep references** – Place 2–4 finished frames (web hero, social tile, email section, etc.) that truly represent the brand.
2. **Import the plugin** – Run **Brand Style Designer** from *Plugins → Development*.
3. **Learn the brand** – With those frames selected, click **Learn from selection**. The Brand DNA card will populate:
   - Palette swatches with detected roles
   - Typography pairings and corner/shadow tokens
   - A “Highlights” section summarising brand strengths
   - An “Opportunities” section with improvement suggestions (helps designers iterate)
4. **Choose layout families** – Toggle Hero, Social, Announcement, Email patterns and set the number of templates (1–6).
5. **Generate** – Press **Generate branded templates**. Frames drop near your viewport, pre-wired with auto layout, buttons, and placeholders ready for real copy and imagery.

While editing the generated frames, keep the plugin open—the insights panel functions like a creative director, guiding refinements and reminding you where the brand is strongest or needs more definition.

## Using the Plugin (Quick Reference)
- Select branded frames → Learn → Review highlights & opportunities → Generate templates.
- Generated frames remain selected for immediate inspection, duplication, or variant creation.

## Design Notes & Extensibility
- Template logic lives in `src/generator.ts`. Add new layout factories by extending `TemplatePatternId` and `templateFactories`.
- Brand analysis heuristics are implemented in `src/analysis.ts`. Adjust color priority scoring or introduce new tokens there.
- UI code (`src/ui/ui.ts`) is TypeScript compiled to the browser context. It handles status updates, pattern toggles, and communicates with the main thread.
- The build uses `esbuild` for fast bundling with zero runtime dependencies.

## Limitations & Next Steps
- Typography fidelity is limited by available fonts on the local system; missing fonts fall back to Inter.
- The plugin generates structural layouts and placeholders—swap image rectangles and copy with your real assets.
- Future enhancements could include: exporting design tokens, attaching generated variants to a team library, or integrating with remote model endpoints for richer semantic learning.

## Technology Stack
- **Analysis engine**: Deterministic heuristics running in the Figma main thread (TypeScript) scan selection nodes for fills, typography, corner radii, strokes, and shadows.
- **Template generation**: Esbuild-bundled TypeScript constructs Figma auto-layout frames using the learned tokens—no external services required.
- **UI**: Lightweight browser context (TypeScript → IIFE bundle) communicates via `postMessage` and acts as the designer-facing control panel.

> This release does **not** call external generative AI models; it behaves like an assistant art director that interprets your reference designs and rapidly spins up editable layouts. Hooks are in place to integrate with AI endpoints in future (e.g. for copy suggestions or richer semantic analysis).

## Creative Director Mode
Brand Style Designer now surfaces:
- **Narrative personality**: quick read on the overall vibe (e.g. “Expressive modern system”).
- **Tone cues**: descriptors such as “Layered, Vibrant, Soft-edged” to keep designs aligned.
- **Highlights & Opportunities**: short-form feedback that celebrates strengths and points to next refinements—mirroring how a senior designer might critique the system before hand-off.

Use these notes to fine-tune reference frames, expand the sample set, or brief collaborators on how to keep assets looking unmistakably on-brand. When you add a new reference frame and re-run “Learn”, the insight panel updates instantly, giving continuous feedback through the creative process.

Enjoy designing! 🎨
