import { BrandingProfile, ColorSwatch, FontDescriptor, RGBA } from './types';

const MAX_COLORS = 8;

const toHex = (color: RGBA): string => {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value * 255)));
  const r = clamp(color.r);
  const g = clamp(color.g);
  const b = clamp(color.b);
  return `#${[r, g, b]
    .map((component) => component.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
};

const mixColor = (color: RGBA, ratio: number): SolidPaint => ({
  type: 'SOLID',
  color: {
    r: color.r + (1 - color.r) * ratio,
    g: color.g + (1 - color.g) * ratio,
    b: color.b + (1 - color.b) * ratio
  },
  opacity: color.a ?? 1
});

const darkenColor = (paint: SolidPaint, ratio: number): SolidPaint => ({
  type: 'SOLID',
  color: {
    r: paint.color.r * (1 - ratio),
    g: paint.color.g * (1 - ratio),
    b: paint.color.b * (1 - ratio)
  },
  opacity: paint.opacity
});

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export const traverseNodes = (nodes: readonly SceneNode[], callback: (node: SceneNode) => void) => {
  nodes.forEach((node) => {
    callback(node);
    if ('children' in node) {
      traverseNodes(node.children, callback);
    }
  });
};

const extractSolidPaints = (node: SceneNode): SolidPaint[] => {
  const paints: SolidPaint[] = [];
  if ('fills' in node && Array.isArray(node.fills)) {
    for (const paint of node.fills as Paint[]) {
      if (paint.type === 'SOLID' && (paint.opacity ?? 1) > 0) {
        paints.push(paint);
      }
    }
  }
  if ('backgrounds' in node && Array.isArray(node.backgrounds)) {
    for (const paint of node.backgrounds as Paint[]) {
      if (paint.type === 'SOLID' && (paint.opacity ?? 1) > 0) {
        paints.push(paint);
      }
    }
  }
  return paints;
};

const scoreColor = (paint: SolidPaint, usageWeight: number) => {
  const luminance = 0.2126 * paint.color.r + 0.7152 * paint.color.g + 0.0722 * paint.color.b;
  const saturation =
    Math.max(paint.color.r, paint.color.g, paint.color.b) - Math.min(paint.color.r, paint.color.g, paint.color.b);
  return usageWeight * (0.4 + 0.6 * (1 - Math.abs(luminance - 0.5))) + saturation * 0.5;
};

const fontKey = (font: FontDescriptor) => `${font.family}__${font.style}`;

export const analyzeSelection = (selection: readonly SceneNode[]): BrandingProfile => {
  if (!selection.length) {
    throw new Error('Select at least one frame or component to learn from.');
  }

  const colorFrequency = new Map<string, { paint: SolidPaint; count: number }>();
  const fontFrequency = new Map<string, { font: FontDescriptor; count: number }>();
  const cornerRadii: number[] = [];
  const strokeWeights: number[] = [];
  const shadows: DropShadowEffect[] = [];
  const visitedShadowSignatures = new Set<string>();

  traverseNodes(selection, (node) => {
    const nodePaints = extractSolidPaints(node);
    for (const paint of nodePaints) {
      const hex = toHex({ ...paint.color, a: paint.opacity ?? 1 });
      const entry = colorFrequency.get(hex);
      if (entry) {
        entry.count += 1;
      } else {
        colorFrequency.set(hex, { paint, count: 1 });
      }
    }

    if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && isFinite(node.cornerRadius)) {
      cornerRadii.push(node.cornerRadius);
    } else if ('topLeftRadius' in node) {
      const radii = [
        node.topLeftRadius as number,
        node.topRightRadius as number,
        node.bottomLeftRadius as number,
        node.bottomRightRadius as number
      ].filter((value) => typeof value === 'number' && isFinite(value));
      cornerRadii.push(...radii);
    }

    if ('strokeWeight' in node && typeof node.strokeWeight === 'number' && isFinite(node.strokeWeight)) {
      strokeWeights.push(node.strokeWeight);
    }

    if ('effects' in node && Array.isArray(node.effects)) {
      for (const effect of node.effects) {
        if (effect.type === 'DROP_SHADOW') {
          const signature = `${effect.color.r.toFixed(2)}-${effect.color.g.toFixed(2)}-${effect.color.b.toFixed(
            2
          )}-${effect.radius}-${effect.offset.x}-${effect.offset.y}-${effect.spread}`;
          if (!visitedShadowSignatures.has(signature)) {
            visitedShadowSignatures.add(signature);
            shadows.push(effect);
          }
        }
      }
    }

    if (node.type === 'TEXT') {
      const collectFont = (font: FontName) => {
        const descriptor: FontDescriptor = {
          family: font.family,
          style: font.style,
          weightClass: typeof (font as any).weight === 'number' ? (font as any).weight : undefined
        };
        const key = fontKey(descriptor);
        const entry = fontFrequency.get(key);
        if (entry) {
          entry.count += 1;
        } else {
          fontFrequency.set(key, { font: descriptor, count: 1 });
        }
      };

      if (node.fontName !== figma.mixed) {
        collectFont(node.fontName);
      } else {
        const length = node.characters.length;
        for (let i = 0; i < length; i++) {
          try {
            const font = node.getRangeFontName(i, i + 1);
            if (font !== figma.mixed) {
              collectFont(font);
            }
          } catch {
            // Skip ranges that cannot be resolved (e.g. fonts not available)
          }
        }
      }
    }
  });

  const sortedColors = Array.from(colorFrequency.entries())
    .map(([hex, { paint, count }]) => ({
      hex,
      paint,
      count,
      score: scoreColor(paint, count)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_COLORS);

  const [primary, secondary, accent] = sortedColors;
  const neutral = sortedColors.find((color) => color.score < (primary?.score ?? 0) * 0.85);

  const colors: ColorSwatch[] = [];
  sortedColors.forEach((color, index) => {
    const role: ColorSwatch['role'] =
      index === 0 ? 'primary' : index === 1 ? 'secondary' : index === 2 ? 'accent' : 'neutral';
    colors.push({
      hex: color.hex,
      paint: color.paint,
      score: color.score,
      role
    });
  });

  if (!colors.length) {
    colors.push({
      hex: '#2563EB',
      paint: {
        type: 'SOLID',
        color: { r: 0.145, g: 0.388, b: 0.921 }
      },
      role: 'primary',
      score: 1
    });
  }

  const fontEntries = Array.from(fontFrequency.values()).sort((a, b) => b.count - a.count);
  const primaryFont = fontEntries[0]?.font ?? null;
  const secondaryFont = fontEntries[1]?.font ?? null;

  const backgroundPaint =
    neutral?.paint ??
    (primary
      ? mixColor(primary.paint.color, 0.82)
      : {
          type: 'SOLID',
          color: { r: 0.97, g: 0.97, b: 0.97 }
        });

  const elevatedPaint =
    secondary?.paint ??
    (primary
      ? mixColor(primary.paint.color, 0.92)
      : {
          type: 'SOLID',
          color: { r: 0.92, g: 0.93, b: 0.96 }
        });

  const highlights: string[] = [];
  const improvementIdeas: string[] = [];

  if (primary) {
    highlights.push(`Consistent primary hue detected around ${primary.hex}.`);
  }
  if (secondary) {
    highlights.push(`Secondary color ${secondary.hex} reinforces hierarchy.`);
  }
  if (accent) {
    highlights.push(`Accent color ${accent.hex} adds energy to key moments.`);
  }
  if (fontEntries.length > 1) {
    highlights.push('Multiple font pairings captured for headline and body rhythm.');
  } else if (fontEntries.length === 1) {
    highlights.push(`Single font stack (${fontEntries[0].font.family}) kept for cohesive voice.`);
  } else {
    improvementIdeas.push('No fonts detected. Ensure text layers use accessible fonts or publish the file fonts.');
  }

  if (colors.length < 3) {
    improvementIdeas.push('Add more differentiated fills or backgrounds to help identify accent and neutral roles.');
  }

  if (cornerRadii.length && average(cornerRadii) > 20) {
    highlights.push('Soft, rounded shapes detected—lean into pill buttons and generous cards.');
  } else if (cornerRadii.length && average(cornerRadii) <= 8) {
    highlights.push('Sharp, modern corner system—keep edges crisp for brand consistency.');
  } else {
    improvementIdeas.push('Corners vary widely; consider standardising radii for a tighter system.');
  }

  if (!shadows.length) {
    improvementIdeas.push('No drop shadows found. Add subtle elevation styles if depth is part of the brand.');
  } else {
    highlights.push(`Shadow system captured (${shadows.length}) for layered compositions.`);
  }

  if (strokeWeights.length && average(strokeWeights) >= 3) {
    highlights.push('Bold stroke presence suggests confident borders—use for emphasis.');
  } else if (!strokeWeights.length) {
    improvementIdeas.push('Strokes absent—introduce keylines if the brand needs additional structure.');
  }

  if (selection.length < 2) {
    improvementIdeas.push('Provide 2–3 varied layouts to broaden the learned template vocabulary.');
  }

  const personality =
    fontEntries.length && colors.length >= 3
      ? 'Expressive modern system with balanced typography and color hierarchy.'
      : colors.length > 1
      ? 'Minimal palette with focused storytelling elements.'
      : 'Foundation detected; add more branded elements for richer guidance.';

  const toneDescriptions = [
    average(cornerRadii) > 18 ? 'Soft-edged' : average(cornerRadii) < 8 ? 'Structured' : 'Balanced',
    shadows.length ? 'Layered' : 'Flat',
    colors.length >= 4 ? 'Vibrant' : colors.length >= 2 ? 'Refined' : 'Minimal'
  ];

  return {
    colors,
    typography: {
      primary: primaryFont,
      secondary: secondaryFont,
      all: fontEntries.map((entry) => entry.font)
    },
    cornerRadius: Math.min(32, Math.max(4, Math.round(average(cornerRadii) || 12))),
    strokeWeight: Math.min(8, Math.max(0, average(strokeWeights) || 2)),
    shadows: shadows.slice(0, 4),
    surface: {
      background: backgroundPaint,
      elevated: darkenColor(elevatedPaint, 0.05)
    },
    narrative: {
      personality,
      toneDescriptions: toneDescriptions.filter((value, index, array) => array.indexOf(value) === index)
    },
    insights: {
      highlights,
      improvementIdeas
    },
    metadata: {
      sampleCount: selection.length,
      nodeIds: selection.map((node) => node.id)
    }
  };
};
