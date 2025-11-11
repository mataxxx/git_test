type RGB = { r: number; g: number; b: number };

const HEX_REGEX = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i;

export function parseColorHex(hex: string): RGB {
  const match = HEX_REGEX.exec(hex);
  if (!match) {
    throw new Error(`Invalid color hex "${hex}".`);
  }
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

export function normalizeHex(hex: string): string {
  const match = HEX_REGEX.exec(hex);
  if (!match) {
    throw new Error(`Invalid color hex "${hex}".`);
  }
  return `#${match[1].toUpperCase()}`;
}

export function rgbToFigma(rgb: RGB): RGB {
  return {
    r: clamp01(rgb.r / 255),
    g: clamp01(rgb.g / 255),
    b: clamp01(rgb.b / 255)
  };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function rgbaToHex(rgb: RGB): string {
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  return `#${[r, g, b]
    .map((component) => component.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const a = parseColorHex(hex1);
  const b = parseColorHex(hex2);
  const luminance = (channel: number) => {
    const norm = channel / 255;
    return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
  };
  const lumA = 0.2126 * luminance(a.r) + 0.7152 * luminance(a.g) + 0.0722 * luminance(a.b);
  const lumB = 0.2126 * luminance(b.r) + 0.7152 * luminance(b.g) + 0.0722 * luminance(b.b);
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function nearestPassToken(
  fgHex: string,
  bgHex: string,
  brandColors: Record<string, string>,
  minRatio: number
): { fg: string; bg: string; fgToken: string; bgToken: string } {
  const tokens = Object.entries(brandColors);
  let best: { fg: string; bg: string; fgToken: string; bgToken: string; ratio: number } | null = null;
  tokens.forEach(([fgToken, fgValue]) => {
    tokens.forEach(([bgToken, bgValue]) => {
      const ratio = contrastRatio(fgValue, bgValue);
      if (ratio >= minRatio) {
        if (!best || ratio > best.ratio) {
          best = { fg: fgValue, bg: bgValue, fgToken, bgToken, ratio };
        }
      }
    });
  });

  if (best) {
    return best;
  }

  // fallback to original if nothing suitable
  return { fg: fgHex, bg: bgHex, fgToken: 'primary', bgToken: 'surface' };
}

