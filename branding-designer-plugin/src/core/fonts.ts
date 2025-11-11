const STYLE_MAP: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black'
};

export async function ensureFontsLoaded(family: string, weights: number[]) {
  const uniqueWeights = Array.from(new Set(weights));
  for (const weight of uniqueWeights) {
    const style = weightToFontStyle(weight);
    try {
      await figma.loadFontAsync({ family, style });
    } catch (error) {
      // Attempt fallback style names
      if (style !== 'Regular') {
        try {
          await figma.loadFontAsync({ family, style: 'Regular' });
          continue;
        } catch {
          // continue to fallback below
        }
      }
      figma.notify(`Font "${family} ${style}" is not available. Using Inter Regular instead.`, { timeout: 4000 });
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    }
  }
}

export function weightToFontStyle(weight: number): string {
  const key = Object.keys(STYLE_MAP)
    .map(Number)
    .reduce((closest, candidate) => {
      return Math.abs(candidate - weight) < Math.abs(closest - weight) ? candidate : closest;
    }, 400);

  return STYLE_MAP[key] ?? 'Regular';
}

