# BrandPilot — Canon-first layout assistant for Figma

BrandPilot imports your brand tokens, enforces accessibility, generates layout variants, learns from feedback, and explains every decision. It is designed as a professional companion that behaves like a senior brand designer inside Figma.

---

## Core capabilities

| Job | What it does |
| --- | --- |
| **Import brand JSON** | Upload a tokens file (colors, typography, spacing, radii, logos). BrandPilot maps everything to Variables and fallback Text Styles—no raw hex, no hard-coded fonts. |
| **Generate layouts** | Create Hero, Feature Card, and Social Post frames. Every fill, stroke, type size, and spacing unit is bound to brand variables with WCAG AA contrast checks. |
| **Apply brand** | One-click rebind of any selection or the entire page to the latest variables/styles, safely and idempotently. |
| **Learn from feedback** | Record thumbs-up/down for token pairings and approve generated layouts. Preferences persist in plugin data/clientStorage and tighten future suggestions. |
| **Explain rationale** | Each action returns 2–5 evidence-based bullets (contrast changes, hierarchy choices, spacing grid, tokens used). |
| **Onboarding & tutorial** | Built-in sample JSON, quick-start guide, privacy note, and support link so teams can adopt instantly. |
| **Element-scoped chat** | Select nodes → type a request (“tighten line-height”, “swap to secondary”) → review a diff + rationale → apply as a single undoable step or revert via BrandPilot. |

---

## Project structure

```
branding-designer-plugin/
├── manifest.json             # Figma manifest v2 (main=dist/code.js, ui=ui.html)
├── src/
│   ├── code.ts               # Main plugin thread (message bridge + controllers)
│   ├── core/
│   │   ├── brand.ts          # Parse brand JSON, create/update variables & styles
│   │   ├── layouts.ts        # Hero/Card/Social template builders
│   │   ├── apply.ts          # Safe variable binding for arbitrary selections
│   │   ├── learn.ts          # Bayesian feedback + approval tracking
│   │   ├── chat.ts           # Rule-based element chat plans, diffs, revert
│   │   ├── contrast.ts       # WCAG helpers and nearest-pass token swap
│   │   ├── color.ts          # Hex utilities shared across modules
│   │   ├── fonts.ts          # loadFontAsync wrapper with sensible fallbacks
│   │   └── canon.ts          # Embedded design canon (ratios, grids, guardrails)
│   ├── types/
│   │   ├── brand.ts          # Canon, brand JSON, mode profile, rationale types
│   │   └── messages.ts       # Plugin ↔ UI message contracts
│   └── ui/
│       └── index.ts          # Browser UI bundle (tabs, forms, rationale display)
├── ui.html                   # Tabbed interface container
├── package.json              # Build scripts (esbuild) + dev dependencies
└── README.md                 # This file
```

---

## Installation & build

```bash
git clone <repo>
cd branding-designer-plugin
npm install
npm run build    # creates dist/code.js and dist/ui.js
```

For quicker iteration use `npm run watch` (parallel esbuild watchers for main + UI).

### Load in Figma
1. Open Figma Desktop.
2. Go to **Plugins → Development → Import plugin from manifest…**
3. Select `branding-designer-plugin/manifest.json`.
4. Launch **BrandPilot** from the Development submenu.

---

## Usage walkthrough

### 1. Brand tab — Import tokens
- Paste or drag a JSON block that matches the minimal schema in `src/types/brand.ts`.
- BrandPilot validates colors, maps variables (`spacing/base`, `radii/md`, etc.), and creates text styles for the declared scale and weights.
- The summary panel shows palette swatches, type stacks, spacing scales, radii, and running learning stats.

### 2. Generate tab — Choose mode & layout
- Mode pills (Conservative / Pro / Creative) enforce font family limits, type ratios, and exploration bounds (`MODE_PROFILE`).
- Pick Hero, Card, or Social layouts and number of variants (up to 3).
- Generated frames land near the viewport, selected for immediate inspection. Each run produces rationale bullets (contrast improvements, tokens used, spacing alignment).

### 3. Apply tab — Rebind existing work
- Apply to current selection or entire page.
- Toggle whether typography and spacing variables should be rebound.
- Operation is idempotent: re-running never duplicates variables or corrupts local styles.

### 4. Learn tab — Feedback & approvals
- Record thumbs up/down for token pairings (stored as Bayesian counts).
- Approve generated layouts; BrandPilot folds their proportions and color usage back into the variable profile.
- The learning snapshot displays approvals and feedback deltas so teams can monitor bias.

### 5. Chat tab — Element-scoped adjustments
- Select one or more nodes, type a natural-language request (e.g. “use secondary fill and loosen padding”).
- Preview shows a diff summary plus rationale derived from canon rules.
- Apply commits an atomic mutation (single undo step) and stores a snapshot for BrandPilot-specific revert.

### 6. Tutorial tab — Onboarding
- Download the sample JSON, read the quick-start checklist, review privacy note, and access support.

---

## Brand JSON schema (minimum viable)

```json
{
  "name": "Acme",
  "colors": {
    "primary": "#0055FF",
    "onPrimary": "#FFFFFF",
    "secondary": "#FFAA00",
    "surface": "#FFFFFF",
    "onSurface": "#111111"
  },
  "typography": {
    "fontFamily": "Inter",
    "scale": ["12","14","16","20","24","32","40"],
    "weights": { "regular": 400, "medium": 500, "bold": 700 }
  },
  "spacing": { "base": 8, "scale": [4,8,12,16,24,32] },
  "radii": { "sm": 4, "md": 8, "lg": 12 },
  "logos": { "primary": "https://..." }
}
```

Additional optional configuration (per spec):
- Mode modifiers: override the default `MODE_PROFILE` ratios or exploration bounds.
- Extended token sets (tonal palettes, gradients) are safely ignored if not referenced.

---

## Deterministic guardrails

- **Variables-first:** Every fill/stroke/padding/line-height uses `boundVariables` bindings. Text styles act only as fallbacks.
- **Font safety:** `ensureFontsLoaded` tries requested weights; falls back to Inter Regular if missing.
- **Accessibility:** `ensureContrast` checks every text/background pair against WCAG AA and swaps to the nearest passing brand token.
- **Modes:** `MODE_PROFILE` restricts font families, weight counts, type ratios, and exploration per mode.
- **Performance:** Layout builders produce three-section frames in well under 800 ms and avoid blocking the main thread.
- **Undo semantics:** Chat operations batch mutations so each request is one undo step. BrandPilot also stores per-node snapshots for targeted revert.

---

## Testing

### Automated
- `npm run build` — ensures both main & UI bundles compile successfully.

### Manual checklist
- Import sample JSON → variables/styles created (inspect in Figma).
- Generate Hero/Card/Social in each mode → tokens bound, contrast ≥ AA.
- Apply Brand twice to same selection → no duplicate variables or styles.
- Record positive/negative feedback → learning snapshot increments.
- Approve generated layout → approvals total increments, future layouts adapt.
- Chat request (“tighten line-height”) → diff preview + rationale → Apply → single undo restores.
- Chat revert button restores previous properties without global undo.

---

## Limitations & future ideas
- Variable bindings rely on Figma’s current APIs; experimental properties may require the latest desktop build.
- Sample brand assumes Inter is available; provide your own scale for alternative families.
- Chat parser is rule-based (non-LLM). Extend `core/chat.ts` with additional keyword patterns or integrate your own NLU service.
- Ideas from the spec worth exploring next: A/B variant generation, visual playground for radius/type ratio, theme switching, token inspector, and snapshot sets.

---

## Support
- Privacy: Brand data never leaves the document; no network calls are made.
- Issues or suggestions: [brandpilot.support](https://brandpilot.support) (update with your actual support URL).

Happy designing! 🎨
