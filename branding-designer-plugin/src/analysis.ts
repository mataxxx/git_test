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

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const unique = <T>(values: T[]) => Array.from(new Set(values));

const blendPaint = (a: SolidPaint, b: SolidPaint, weightA: number, weightB: number): SolidPaint => {
  if (weightA <= 0) {
    return { ...b };
  }
  if (weightB <= 0) {
    return { ...a };
  }
  const total = weightA + weightB;
  return {
    type: 'SOLID',
    color: {
      r: (a.color.r * weightA + b.color.r * weightB) / total,
      g: (a.color.g * weightA + b.color.g * weightB) / total,
      b: (a.color.b * weightA + b.color.b * weightB) / total
    },
    opacity: ((a.opacity ?? 1) * weightA + (b.opacity ?? 1) * weightB) / total
  };
};

const clonePaint = (paint: SolidPaint): SolidPaint => ({
  type: 'SOLID',
  color: { ...paint.color },
  opacity: paint.opacity
});

const shadowSignature = (shadow: DropShadowEffect) =>
  `${shadow.color.r.toFixed(2)}-${shadow.color.g.toFixed(2)}-${shadow.color.b.toFixed(2)}-${shadow.radius}-${shadow.offset.x}-${shadow.offset.y}-${shadow.spread}`;

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

type NarrativeContext = {
  selectionCount?: number;
  paletteSize?: number;
  fontCount?: number;
  primaryHex?: string | null;
  secondaryHex?: string | null;
  accentHex?: string | null;
  cornerRadiusSamples?: number[];
  strokeSamples?: number[];
  shadowCount?: number;
};

export const composeNarrative = (
  profile: BrandingProfile,
  context: NarrativeContext = {}
): BrandingProfile => {
  const selectionCount = context.selectionCount ?? profile.metadata.sampleCount;
  const paletteSize = context.paletteSize ?? profile.colors.length;
  const fontCount = context.fontCount ?? profile.typography.all.length;
  const shadowCount = context.shadowCount ?? profile.shadows.length;

  const primary =
    profile.colors.find((color) => color.role === 'primary') ?? profile.colors[0] ?? null;
  const secondary = profile.colors.find((color) => color.role === 'secondary') ?? null;
  const accent = profile.colors.find((color) => color.role === 'accent') ?? null;

  const highlights: string[] = [];
  const improvementIdeas: string[] = [];
  const toneDescriptors = new Set<string>();

  if (primary) {
    highlights.push(`Consistent primary hue detected around ${context.primaryHex ?? primary.hex}.`);
  } else {
    improvementIdeas.push('Define a dependable primary color to anchor the system.');
  }

  if (secondary) {
    highlights.push(`Secondary color ${context.secondaryHex ?? secondary.hex} reinforces hierarchy.`);
  }

  if (accent) {
    highlights.push(`Accent color ${context.accentHex ?? accent.hex} adds energy to key moments.`);
  } else if (paletteSize >= 2) {
    improvementIdeas.push('Introduce an accent color to create focal points and calls to action.');
  }

  if (fontCount > 1) {
    highlights.push('Multiple font pairings captured for headline and body rhythm.');
  } else if (fontCount === 1) {
    highlights.push(`Single font stack (${profile.typography.all[0].family}) keeps voice cohesive.`);
  } else {
    improvementIdeas.push('No fonts detected. Ensure text layers use available fonts or publish the file fonts.');
  }

  if (paletteSize >= 4) {
    toneDescriptors.add('Vibrant');
    highlights.push('Rich palette detected—great for dynamic storytelling.');
  } else if (paletteSize >= 2) {
    toneDescriptors.add('Refined');
  } else {
    toneDescriptors.add('Minimal');
    improvementIdeas.push('Add more differentiated fills/backgrounds to identify accent and neutral roles.');
  }

  const cornerAverage = profile.cornerRadius;
  if (cornerAverage > 18) {
    toneDescriptors.add('Soft-edged');
    highlights.push('Soft, rounded shapes detected—lean into pill buttons and generous cards.');
  } else if (cornerAverage <= 8) {
    toneDescriptors.add('Structured');
    highlights.push('Sharp, modern corner system—keep edges crisp for consistency.');
  } else {
    toneDescriptors.add('Balanced');
  }

  const strokeAverage =
    context.strokeSamples && context.strokeSamples.length ? average(context.strokeSamples) : profile.strokeWeight;
  if (strokeAverage >= 3) {
    highlights.push('Bold stroke presence suggests confident borders—use for emphasis.');
  } else if (strokeAverage <= 0.1) {
    improvementIdeas.push('Strokes absent—introduce keylines if the brand needs additional structure.');
  }

  if (shadowCount) {
    toneDescriptors.add('Layered');
    highlights.push(`Shadow system captured (${shadowCount}) for layered compositions.`);
  } else {
    toneDescriptors.add('Flat');
    improvementIdeas.push('No shadows detected. Add subtle elevation if depth is part of the brand.');
  }

  if (selectionCount < 2) {
    improvementIdeas.push('Provide 2–3 varied layouts to broaden the learned template vocabulary.');
  }

  const personality =
    paletteSize >= 3 && fontCount > 1
      ? 'Expressive modern system with balanced typography and color hierarchy.'
      : paletteSize >= 2
      ? 'Minimal palette with focused storytelling elements.'
      : 'Foundation detected; add more branded elements for richer guidance.';

  if (!highlights.length) {
    highlights.push('Core layout tokens captured and ready for reuse.');
  }
  if (!improvementIdeas.length) {
    improvementIdeas.push('Samples already cover a complete system—ready to generate.');
  }

  return {
    ...profile,
    narrative: {
      personality,
      toneDescriptions: unique(Array.from(toneDescriptors))
    },
    insights: {
      highlights: unique(highlights),
      improvementIdeas: unique(improvementIdeas)
    }
  };
};

export const mergeBrandingProfiles = (
  existing: BrandingProfile | null,
  incoming: BrandingProfile
): BrandingProfile => {
  if (!existing) {
    return composeNarrative(incoming);
  }

  const weightExisting = Math.max(existing.metadata.sampleCount, 1);
  const weightIncoming = Math.max(incoming.metadata.sampleCount, 1);

  const colorMap = new Map<
    string,
    {
      paint: SolidPaint;
      score: number;
      weight: number;
    }
  >();

  const addColors = (profile: BrandingProfile, weight: number) => {
    profile.colors.forEach((swatch) => {
      const entry = colorMap.get(swatch.hex);
      if (entry) {
        const combinedWeight = entry.weight + weight;
        entry.paint = blendPaint(entry.paint, swatch.paint, entry.weight, weight);
        entry.score = (entry.score * entry.weight + swatch.score * weight) / combinedWeight;
        entry.weight = combinedWeight;
      } else {
        colorMap.set(swatch.hex, {
          paint: clonePaint(swatch.paint),
          score: swatch.score,
          weight
        });
      }
    });
  };

  addColors(existing, weightExisting);
  addColors(incoming, weightIncoming);

  let mergedColors = Array.from(colorMap.entries())
    .map(([hex, data]) => ({
      hex,
      paint: data.paint,
      score: data.score,
      weight: data.weight
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_COLORS);

  if (!mergedColors.length) {
    mergedColors = incoming.colors.map((color) => ({
      hex: color.hex,
      paint: clonePaint(color.paint),
      score: color.score,
      weight: weightIncoming
    }));
  }

  const mergedSwatches: ColorSwatch[] = mergedColors.map((swatch, index) => ({
    hex: swatch.hex,
    paint: swatch.paint,
    score: swatch.score,
    role: index === 0 ? 'primary' : index === 1 ? 'secondary' : index === 2 ? 'accent' : 'neutral'
  }));

  const fontMap = new Map<
    string,
    {
      font: FontDescriptor;
      weight: number;
    }
  >();

  const addFonts = (profile: BrandingProfile, weight: number) => {
    profile.typography.all.forEach((font) => {
      const key = fontKey(font);
      const entry = fontMap.get(key);
      if (entry) {
        entry.weight += weight;
      } else {
        fontMap.set(key, { font, weight });
      }
    });
  };

  addFonts(existing, weightExisting);
  addFonts(incoming, weightIncoming);

  const mergedFonts = Array.from(fontMap.values()).sort((a, b) => b.weight - a.weight);

  const mergedPrimaryFont =
    mergedFonts[0]?.font ?? incoming.typography.primary ?? existing.typography.primary ?? null;
  const mergedSecondaryFont =
    mergedFonts[1]?.font ?? mergedFonts[0]?.font ?? incoming.typography.secondary ?? existing.typography.secondary ?? null;

  const totalWeight = weightExisting + weightIncoming;
  const mergedCornerRadius =
    (existing.cornerRadius * weightExisting + incoming.cornerRadius * weightIncoming) / totalWeight;
  const mergedStrokeWeight =
    (existing.strokeWeight * weightExisting + incoming.strokeWeight * weightIncoming) / totalWeight;

  const shadowMap = new Map<string, DropShadowEffect>();
  const addShadows = (profile: BrandingProfile) => {
    profile.shadows.forEach((shadow) => {
      const signature = shadowSignature(shadow);
      if (!shadowMap.has(signature)) {
        shadowMap.set(signature, { ...shadow });
      }
    });
  };
  addShadows(existing);
  addShadows(incoming);
  const mergedShadows = Array.from(shadowMap.values()).slice(0, 4);

  const mergedBackground = blendPaint(
    existing.surface.background,
    incoming.surface.background,
    weightExisting,
    weightIncoming
  );
  const mergedElevated = blendPaint(
    existing.surface.elevated,
    incoming.surface.elevated,
    weightExisting,
    weightIncoming
  );

  const mergedMetadata = {
    sampleCount: existing.metadata.sampleCount + incoming.metadata.sampleCount,
    nodeIds: unique([...existing.metadata.nodeIds, ...incoming.metadata.nodeIds]).slice(-24)
  };

  const baseProfile: BrandingProfile = {
    colors: mergedSwatches,
    typography: {
      primary: mergedPrimaryFont,
      secondary: mergedSecondaryFont,
      all: mergedFonts.map((entry) => entry.font)
    },
    cornerRadius: Math.min(32, Math.max(4, Math.round(mergedCornerRadius || 12))),
    strokeWeight: Math.min(8, Math.max(0, mergedStrokeWeight || 2)),
    shadows: mergedShadows,
    surface: {
      background: mergedBackground,
      elevated: mergedElevated
    },
    narrative: {
      personality: '',
      toneDescriptions: []
    },
    insights: {
      highlights: [],
      improvementIdeas: []
    },
    metadata: mergedMetadata
  };

  return composeNarrative(baseProfile, {
    paletteSize: baseProfile.colors.length,
    fontCount: baseProfile.typography.all.length,
    shadowCount: baseProfile.shadows.length
  });
};

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
          const signature = shadowSignature(effect);
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

  const baseProfile: BrandingProfile = {
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
      personality: '',
      toneDescriptions: []
    },
    insights: {
      highlights: [],
      improvementIdeas: []
    },
    metadata: {
      sampleCount: selection.length,
      nodeIds: selection.map((node) => node.id)
    }
  };

  return composeNarrative(baseProfile, {
    selectionCount: selection.length,
    paletteSize: sortedColors.length,
    fontCount: fontEntries.length,
    primaryHex: primary?.hex ?? null,
    secondaryHex: secondary?.hex ?? null,
    accentHex: accent?.hex ?? null,
    cornerRadiusSamples: cornerRadii,
    strokeSamples: strokeWeights,
    shadowCount: shadows.length
  });
};
