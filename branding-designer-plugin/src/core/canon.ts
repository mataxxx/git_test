import { Canon, Mode, MODE_PROFILE } from '../types/brand';

export const DESIGN_CANON: Canon = {
  contrast: { aa_normal: 4.5, aa_large: 3.0 },
  typography: {
    min_body_px: 16,
    ratios: {
      conservative: MODE_PROFILE.conservative.typeRatio,
      pro: MODE_PROFILE.pro.typeRatio,
      creative: MODE_PROFILE.creative.typeRatio
    }
  },
  spacing: { base: 8 },
  grid: { columns: 12, gutter: 16 },
  color_roles: { use_tokens: true, fallback_to_styles: true }
};

export const CANON_MODES: Mode[] = ['conservative', 'pro', 'creative'];

