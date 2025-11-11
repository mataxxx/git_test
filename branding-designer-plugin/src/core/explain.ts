import { RationaleInput } from '../types/brand';

const CONTRAST_THRESHOLD = 0.2;

export function buildRationale(input: RationaleInput): string[] {
  const bullets: string[] = [];

  const { component, colors, type, spacing, contrast, changes } = input;

  bullets.push(`Applied brand tokens ${Object.values(colors.brandTokens).join(', ')} across ${component} layout.`);

  if (contrast.ratio) {
    const delta = contrast.ratio - contrast.required;
    if (delta >= CONTRAST_THRESHOLD) {
      bullets.push(`Contrast improved to ${contrast.ratio.toFixed(2)}× (AA≥${contrast.required.toFixed(1)}).`);
    } else if (delta < 0) {
      bullets.push(`Contrast adjusted to meet AA ${contrast.required.toFixed(1)}×, currently ${contrast.ratio.toFixed(2)}×.`);
    }
  }

  bullets.push(
    `Type scale uses ${type.family} at ${type.size}px with ${type.lineHeight}% line-height for readable hierarchy.`
  );

  if (spacing.base) {
    bullets.push(`Spacing aligned to ${spacing.base}px base grid for consistent rhythm.`);
  }

  changes.forEach((change) => {
    const { what, from, to } = change;
    if (from === undefined) {
      bullets.push(`Set ${what} to ${String(to)}.`);
    } else if (from !== to) {
      bullets.push(`Changed ${what} from ${String(from)} → ${String(to)}.`);
    }
  });

  return bullets.slice(0, 5);
}

