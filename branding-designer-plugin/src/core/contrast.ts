import { DESIGN_CANON } from './canon';
import { contrastRatio, nearestPassToken } from './color';
import { BrandJSON } from '../types/brand';

export type ContrastResult = {
  fg: string;
  bg: string;
  fgToken: string;
  bgToken: string;
  ratio: number;
  adjusted: boolean;
};

export function ensureContrast(
  brand: BrandJSON,
  fgToken: string,
  bgToken: string,
  isLargeText = false
): ContrastResult {
  const fg = brand.colors[fgToken] ?? brand.colors.primary;
  const bg = brand.colors[bgToken] ?? brand.colors.surface;
  const ratio = contrastRatio(fg, bg);
  const required = isLargeText ? DESIGN_CANON.contrast.aa_large : DESIGN_CANON.contrast.aa_normal;

  if (ratio >= required) {
    return { fg, bg, fgToken, bgToken, ratio, adjusted: false };
  }

  const nearest = nearestPassToken(fg, bg, brand.colors, required);
  return {
    fg: nearest.fg,
    bg: nearest.bg,
    fgToken: nearest.fgToken,
    bgToken: nearest.bgToken,
    ratio: contrastRatio(nearest.fg, nearest.bg),
    adjusted: true
  };
}

