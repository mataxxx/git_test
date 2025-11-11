"use strict";

// src/analysis.ts
var MAX_COLORS = 8;
var toHex = (color) => {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value * 255)));
  const r = clamp(color.r);
  const g = clamp(color.g);
  const b = clamp(color.b);
  return `#${[r, g, b].map((component) => component.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};
var mixColor = (color, ratio) => {
  var _a2;
  return {
    type: "SOLID",
    color: {
      r: color.r + (1 - color.r) * ratio,
      g: color.g + (1 - color.g) * ratio,
      b: color.b + (1 - color.b) * ratio
    },
    opacity: (_a2 = color.a) != null ? _a2 : 1
  };
};
var darkenColor = (paint, ratio) => ({
  type: "SOLID",
  color: {
    r: paint.color.r * (1 - ratio),
    g: paint.color.g * (1 - ratio),
    b: paint.color.b * (1 - ratio)
  },
  opacity: paint.opacity
});
var average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
var unique = (values) => Array.from(new Set(values));
var blendPaint = (a, b, weightA, weightB) => {
  var _a2, _b;
  if (weightA <= 0) {
    return { ...b };
  }
  if (weightB <= 0) {
    return { ...a };
  }
  const total = weightA + weightB;
  return {
    type: "SOLID",
    color: {
      r: (a.color.r * weightA + b.color.r * weightB) / total,
      g: (a.color.g * weightA + b.color.g * weightB) / total,
      b: (a.color.b * weightA + b.color.b * weightB) / total
    },
    opacity: (((_a2 = a.opacity) != null ? _a2 : 1) * weightA + ((_b = b.opacity) != null ? _b : 1) * weightB) / total
  };
};
var clonePaint = (paint) => ({
  type: "SOLID",
  color: { ...paint.color },
  opacity: paint.opacity
});
var shadowSignature = (shadow) => `${shadow.color.r.toFixed(2)}-${shadow.color.g.toFixed(2)}-${shadow.color.b.toFixed(2)}-${shadow.radius}-${shadow.offset.x}-${shadow.offset.y}-${shadow.spread}`;
var traverseNodes = (nodes, callback) => {
  nodes.forEach((node) => {
    callback(node);
    if ("children" in node) {
      traverseNodes(node.children, callback);
    }
  });
};
var extractSolidPaints = (node) => {
  var _a2, _b;
  const paints = [];
  if ("fills" in node && Array.isArray(node.fills)) {
    for (const paint of node.fills) {
      if (paint.type === "SOLID" && ((_a2 = paint.opacity) != null ? _a2 : 1) > 0) {
        paints.push(paint);
      }
    }
  }
  if ("backgrounds" in node && Array.isArray(node.backgrounds)) {
    for (const paint of node.backgrounds) {
      if (paint.type === "SOLID" && ((_b = paint.opacity) != null ? _b : 1) > 0) {
        paints.push(paint);
      }
    }
  }
  return paints;
};
var scoreColor = (paint, usageWeight) => {
  const luminance = 0.2126 * paint.color.r + 0.7152 * paint.color.g + 0.0722 * paint.color.b;
  const saturation = Math.max(paint.color.r, paint.color.g, paint.color.b) - Math.min(paint.color.r, paint.color.g, paint.color.b);
  return usageWeight * (0.4 + 0.6 * (1 - Math.abs(luminance - 0.5))) + saturation * 0.5;
};
var fontKey = (font) => `${font.family}__${font.style}`;
var composeNarrative = (profile, context = {}) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const selectionCount = (_a2 = context.selectionCount) != null ? _a2 : profile.metadata.sampleCount;
  const paletteSize = (_b = context.paletteSize) != null ? _b : profile.colors.length;
  const fontCount = (_c = context.fontCount) != null ? _c : profile.typography.all.length;
  const shadowCount = (_d = context.shadowCount) != null ? _d : profile.shadows.length;
  const primary = (_f = (_e = profile.colors.find((color) => color.role === "primary")) != null ? _e : profile.colors[0]) != null ? _f : null;
  const secondary = (_g = profile.colors.find((color) => color.role === "secondary")) != null ? _g : null;
  const accent = (_h = profile.colors.find((color) => color.role === "accent")) != null ? _h : null;
  const highlights = [];
  const improvementIdeas = [];
  const toneDescriptors = /* @__PURE__ */ new Set();
  if (primary) {
    highlights.push(`Consistent primary hue detected around ${(_i = context.primaryHex) != null ? _i : primary.hex}.`);
  } else {
    improvementIdeas.push("Define a dependable primary color to anchor the system.");
  }
  if (secondary) {
    highlights.push(`Secondary color ${(_j = context.secondaryHex) != null ? _j : secondary.hex} reinforces hierarchy.`);
  }
  if (accent) {
    highlights.push(`Accent color ${(_k = context.accentHex) != null ? _k : accent.hex} adds energy to key moments.`);
  } else if (paletteSize >= 2) {
    improvementIdeas.push("Introduce an accent color to create focal points and calls to action.");
  }
  if (fontCount > 1) {
    highlights.push("Multiple font pairings captured for headline and body rhythm.");
  } else if (fontCount === 1) {
    highlights.push(`Single font stack (${profile.typography.all[0].family}) keeps voice cohesive.`);
  } else {
    improvementIdeas.push("No fonts detected. Ensure text layers use available fonts or publish the file fonts.");
  }
  if (paletteSize >= 4) {
    toneDescriptors.add("Vibrant");
    highlights.push("Rich palette detected\u2014great for dynamic storytelling.");
  } else if (paletteSize >= 2) {
    toneDescriptors.add("Refined");
  } else {
    toneDescriptors.add("Minimal");
    improvementIdeas.push("Add more differentiated fills/backgrounds to identify accent and neutral roles.");
  }
  const cornerAverage = profile.cornerRadius;
  if (cornerAverage > 18) {
    toneDescriptors.add("Soft-edged");
    highlights.push("Soft, rounded shapes detected\u2014lean into pill buttons and generous cards.");
  } else if (cornerAverage <= 8) {
    toneDescriptors.add("Structured");
    highlights.push("Sharp, modern corner system\u2014keep edges crisp for consistency.");
  } else {
    toneDescriptors.add("Balanced");
  }
  const strokeAverage = context.strokeSamples && context.strokeSamples.length ? average(context.strokeSamples) : profile.strokeWeight;
  if (strokeAverage >= 3) {
    highlights.push("Bold stroke presence suggests confident borders\u2014use for emphasis.");
  } else if (strokeAverage <= 0.1) {
    improvementIdeas.push("Strokes absent\u2014introduce keylines if the brand needs additional structure.");
  }
  if (shadowCount) {
    toneDescriptors.add("Layered");
    highlights.push(`Shadow system captured (${shadowCount}) for layered compositions.`);
  } else {
    toneDescriptors.add("Flat");
    improvementIdeas.push("No shadows detected. Add subtle elevation if depth is part of the brand.");
  }
  if (selectionCount < 2) {
    improvementIdeas.push("Provide 2\u20133 varied layouts to broaden the learned template vocabulary.");
  }
  const personality = paletteSize >= 3 && fontCount > 1 ? "Expressive modern system with balanced typography and color hierarchy." : paletteSize >= 2 ? "Minimal palette with focused storytelling elements." : "Foundation detected; add more branded elements for richer guidance.";
  if (!highlights.length) {
    highlights.push("Core layout tokens captured and ready for reuse.");
  }
  if (!improvementIdeas.length) {
    improvementIdeas.push("Samples already cover a complete system\u2014ready to generate.");
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
var mergeBrandingProfiles = (existing, incoming) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  if (!existing) {
    return composeNarrative(incoming);
  }
  const weightExisting = Math.max(existing.metadata.sampleCount, 1);
  const weightIncoming = Math.max(incoming.metadata.sampleCount, 1);
  const colorMap = /* @__PURE__ */ new Map();
  const addColors = (profile, weight) => {
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
  let mergedColors = Array.from(colorMap.entries()).map(([hex, data]) => ({
    hex,
    paint: data.paint,
    score: data.score,
    weight: data.weight
  })).sort((a, b) => b.score - a.score).slice(0, MAX_COLORS);
  if (!mergedColors.length) {
    mergedColors = incoming.colors.map((color) => ({
      hex: color.hex,
      paint: clonePaint(color.paint),
      score: color.score,
      weight: weightIncoming
    }));
  }
  const mergedSwatches = mergedColors.map((swatch, index) => ({
    hex: swatch.hex,
    paint: swatch.paint,
    score: swatch.score,
    role: index === 0 ? "primary" : index === 1 ? "secondary" : index === 2 ? "accent" : "neutral"
  }));
  const fontMap = /* @__PURE__ */ new Map();
  const addFonts = (profile, weight) => {
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
  const mergedPrimaryFont = (_d = (_c = (_b = (_a2 = mergedFonts[0]) == null ? void 0 : _a2.font) != null ? _b : incoming.typography.primary) != null ? _c : existing.typography.primary) != null ? _d : null;
  const mergedSecondaryFont = (_j = (_i = (_h = (_g = (_e = mergedFonts[1]) == null ? void 0 : _e.font) != null ? _g : (_f = mergedFonts[0]) == null ? void 0 : _f.font) != null ? _h : incoming.typography.secondary) != null ? _i : existing.typography.secondary) != null ? _j : null;
  const totalWeight = weightExisting + weightIncoming;
  const mergedCornerRadius = (existing.cornerRadius * weightExisting + incoming.cornerRadius * weightIncoming) / totalWeight;
  const mergedStrokeWeight = (existing.strokeWeight * weightExisting + incoming.strokeWeight * weightIncoming) / totalWeight;
  const shadowMap = /* @__PURE__ */ new Map();
  const addShadows = (profile) => {
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
  const baseProfile = {
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
      personality: "",
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
var analyzeSelection = (selection) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i;
  if (!selection.length) {
    throw new Error("Select at least one frame or component to learn from.");
  }
  const colorFrequency = /* @__PURE__ */ new Map();
  const fontFrequency = /* @__PURE__ */ new Map();
  const cornerRadii = [];
  const strokeWeights = [];
  const shadows = [];
  const visitedShadowSignatures = /* @__PURE__ */ new Set();
  traverseNodes(selection, (node) => {
    var _a3;
    const nodePaints = extractSolidPaints(node);
    for (const paint of nodePaints) {
      const hex = toHex({ ...paint.color, a: (_a3 = paint.opacity) != null ? _a3 : 1 });
      const entry = colorFrequency.get(hex);
      if (entry) {
        entry.count += 1;
      } else {
        colorFrequency.set(hex, { paint, count: 1 });
      }
    }
    if ("cornerRadius" in node && typeof node.cornerRadius === "number" && isFinite(node.cornerRadius)) {
      cornerRadii.push(node.cornerRadius);
    } else if ("topLeftRadius" in node) {
      const radii = [
        node.topLeftRadius,
        node.topRightRadius,
        node.bottomLeftRadius,
        node.bottomRightRadius
      ].filter((value) => typeof value === "number" && isFinite(value));
      cornerRadii.push(...radii);
    }
    if ("strokeWeight" in node && typeof node.strokeWeight === "number" && isFinite(node.strokeWeight)) {
      strokeWeights.push(node.strokeWeight);
    }
    if ("effects" in node && Array.isArray(node.effects)) {
      for (const effect of node.effects) {
        if (effect.type === "DROP_SHADOW") {
          const signature = shadowSignature(effect);
          if (!visitedShadowSignatures.has(signature)) {
            visitedShadowSignatures.add(signature);
            shadows.push(effect);
          }
        }
      }
    }
    if (node.type === "TEXT") {
      const collectFont = (font) => {
        const descriptor = {
          family: font.family,
          style: font.style,
          weightClass: typeof font.weight === "number" ? font.weight : void 0
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
          } catch (e) {
          }
        }
      }
    }
  });
  const sortedColors = Array.from(colorFrequency.entries()).map(([hex, { paint, count }]) => ({
    hex,
    paint,
    count,
    score: scoreColor(paint, count)
  })).sort((a, b) => b.score - a.score).slice(0, MAX_COLORS);
  const [primary, secondary, accent] = sortedColors;
  const neutral = sortedColors.find((color) => {
    var _a3;
    return color.score < ((_a3 = primary == null ? void 0 : primary.score) != null ? _a3 : 0) * 0.85;
  });
  const colors = [];
  sortedColors.forEach((color, index) => {
    const role = index === 0 ? "primary" : index === 1 ? "secondary" : index === 2 ? "accent" : "neutral";
    colors.push({
      hex: color.hex,
      paint: color.paint,
      score: color.score,
      role
    });
  });
  if (!colors.length) {
    colors.push({
      hex: "#2563EB",
      paint: {
        type: "SOLID",
        color: { r: 0.145, g: 0.388, b: 0.921 }
      },
      role: "primary",
      score: 1
    });
  }
  const fontEntries = Array.from(fontFrequency.values()).sort((a, b) => b.count - a.count);
  const primaryFont = (_b = (_a2 = fontEntries[0]) == null ? void 0 : _a2.font) != null ? _b : null;
  const secondaryFont = (_d = (_c = fontEntries[1]) == null ? void 0 : _c.font) != null ? _d : null;
  const backgroundPaint = (_e = neutral == null ? void 0 : neutral.paint) != null ? _e : primary ? mixColor(primary.paint.color, 0.82) : {
    type: "SOLID",
    color: { r: 0.97, g: 0.97, b: 0.97 }
  };
  const elevatedPaint = (_f = secondary == null ? void 0 : secondary.paint) != null ? _f : primary ? mixColor(primary.paint.color, 0.92) : {
    type: "SOLID",
    color: { r: 0.92, g: 0.93, b: 0.96 }
  };
  const baseProfile = {
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
      personality: "",
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
    primaryHex: (_g = primary == null ? void 0 : primary.hex) != null ? _g : null,
    secondaryHex: (_h = secondary == null ? void 0 : secondary.hex) != null ? _h : null,
    accentHex: (_i = accent == null ? void 0 : accent.hex) != null ? _i : null,
    cornerRadiusSamples: cornerRadii,
    strokeSamples: strokeWeights,
    shadowCount: shadows.length
  });
};

// src/generator.ts
var TEMPLATE_DIMENSIONS = {
  hero: { width: 1440, height: 1024 },
  social: { width: 1080, height: 1350 },
  announcement: { width: 1280, height: 720 },
  email: { width: 800, height: 1200 }
};
var toFigmaPaint = (swatch) => {
  var _a2;
  return {
    ...swatch.paint,
    opacity: (_a2 = swatch.paint.opacity) != null ? _a2 : 1
  };
};
var ensureFonts = async (profile) => {
  const fallbackFonts = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Semi Bold" },
    { family: "Inter", style: "Bold" }
  ];
  const fontMap = /* @__PURE__ */ new Map();
  const register = (font) => {
    if (!font) return;
    const key = `${font.family}::${font.style}`;
    if (!fontMap.has(key)) {
      fontMap.set(key, font);
    }
  };
  register(profile.typography.primary);
  register(profile.typography.secondary);
  fallbackFonts.forEach(register);
  await Promise.all(
    Array.from(fontMap.values()).map(async (font) => {
      try {
        await figma.loadFontAsync({ family: font.family, style: font.style });
      } catch (e) {
      }
    })
  );
};
var createText = (context, text, options) => {
  var _a2;
  const node = figma.createText();
  const font = options.fontName && options.fontName !== figma.mixed ? options.fontName : context.profile.typography.primary;
  if (font) {
    node.fontName = font;
  }
  node.characters = text;
  if (typeof options.fontSize === "number") {
    node.fontSize = options.fontSize;
  }
  if (typeof options.lineHeight === "object" || typeof options.lineHeight === "number") {
    node.lineHeight = options.lineHeight;
  }
  if (typeof options.letterSpacing === "object" || typeof options.letterSpacing === "number") {
    node.letterSpacing = options.letterSpacing;
  }
  if (options.textAutoResize) {
    node.textAutoResize = options.textAutoResize;
  } else {
    node.textAutoResize = "WIDTH_AND_HEIGHT";
  }
  if (options.fills && Array.isArray(options.fills)) {
    node.fills = options.fills;
  } else {
    node.fills = [
      toFigmaPaint(
        (_a2 = context.profile.colors.find((color) => color.role === "primary")) != null ? _a2 : context.profile.colors[0]
      )
    ];
  }
  if (options.textAlignHorizontal) {
    node.textAlignHorizontal = options.textAlignHorizontal;
  }
  if (options.textAlignVertical) {
    node.textAlignVertical = options.textAlignVertical;
  }
  if (options.opacity !== void 0) {
    node.opacity = options.opacity;
  }
  if (options.paragraphSpacing !== void 0) {
    node.paragraphSpacing = options.paragraphSpacing;
  }
  return node;
};
var createButton = (context, label) => {
  var _a2, _b, _c, _d;
  const buttonFrame = figma.createFrame();
  buttonFrame.name = "CTA Button";
  buttonFrame.layoutMode = "HORIZONTAL";
  buttonFrame.counterAxisAlignItems = "CENTER";
  buttonFrame.primaryAxisAlignItems = "CENTER";
  buttonFrame.primaryAxisSizingMode = "AUTO";
  buttonFrame.counterAxisSizingMode = "AUTO";
  buttonFrame.paddingLeft = 28;
  buttonFrame.paddingRight = 28;
  buttonFrame.paddingTop = 12;
  buttonFrame.paddingBottom = 12;
  buttonFrame.itemSpacing = 12;
  buttonFrame.cornerRadius = context.profile.cornerRadius;
  buttonFrame.fills = [
    toFigmaPaint(
      (_b = (_a2 = context.profile.colors.find((color) => color.role === "accent")) != null ? _a2 : context.profile.colors[1]) != null ? _b : context.profile.colors[0]
    )
  ];
  const text = createText(context, label, {
    fontSize: 18,
    fontName: (_d = (_c = context.profile.typography.secondary) != null ? _c : context.profile.typography.primary) != null ? _d : {
      family: "Inter",
      style: "Medium"
    },
    textAutoResize: "WIDTH_AND_HEIGHT",
    fills: [
      {
        type: "SOLID",
        color: { r: 1, g: 1, b: 1 }
      }
    ]
  });
  buttonFrame.appendChild(text);
  return buttonFrame;
};
var applySurface = (frame, paint) => {
  frame.fills = [{ ...paint }];
};
var createImagePlaceholder = (context, options) => {
  var _a2, _b, _c;
  const rect = figma.createRectangle();
  rect.resizeWithoutConstraints(options.width, options.height);
  rect.cornerRadius = (_a2 = options.cornerRadius) != null ? _a2 : context.profile.cornerRadius;
  const accent = (_b = context.profile.colors.find((color) => color.role === "secondary")) != null ? _b : context.profile.colors[0];
  const overlay = (_c = context.profile.colors.find((color) => color.role === "accent")) != null ? _c : accent;
  rect.fills = [
    toFigmaPaint(options.useAccent ? overlay : accent),
    {
      type: "GRADIENT_LINEAR",
      gradientTransform: [
        [0.96, 0.28, 0],
        [-0.28, 0.96, 0.18]
      ],
      gradientStops: [
        { position: 0, color: { r: 1, g: 1, b: 1, a: 0.1 } },
        { position: 1, color: { r: 0, g: 0, b: 0, a: 0.18 } }
      ]
    }
  ];
  rect.strokeWeight = context.profile.strokeWeight;
  rect.strokes = [
    {
      type: "SOLID",
      color: {
        r: 1,
        g: 1,
        b: 1
      },
      opacity: 0.08
    }
  ];
  return rect;
};
var templateFactories = {
  hero: async ({ frame, profile }) => {
    var _a2, _b, _c, _d, _e, _f;
    frame.name = "Branded Hero";
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    frame.itemSpacing = 24;
    frame.paddingTop = 96;
    frame.paddingBottom = 96;
    frame.paddingLeft = 96;
    frame.paddingRight = 96;
    frame.clipsContent = false;
    applySurface(frame, profile.surface.background);
    const badge = createText(
      { frame, profile },
      "\u2728 Signature Collection",
      {
        fontSize: 16,
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_b = (_a2 = profile.typography.secondary) != null ? _a2 : profile.typography.primary) != null ? _b : { family: "Inter", style: "Semi Bold" },
        fills: [
          toFigmaPaint(
            (_c = profile.colors.find((color) => color.role === "accent")) != null ? _c : profile.colors[0]
          )
        ],
        opacity: 0.75,
        letterSpacing: { unit: "PERCENT", value: 8 }
      }
    );
    const heading = createText(
      { frame, profile },
      "Designs that feel unmistakably you.",
      {
        fontSize: 64,
        lineHeight: { unit: "PERCENT", value: 110 },
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_d = profile.typography.primary) != null ? _d : {
          family: "Inter",
          style: "Bold"
        },
        textAlignHorizontal: "CENTER"
      }
    );
    const body = createText(
      { frame, profile },
      "High fidelity campaign templates handcrafted to embody your voice across every touchpoint.",
      {
        fontSize: 20,
        lineHeight: { unit: "PERCENT", value: 150 },
        opacity: 0.78,
        textAlignHorizontal: "CENTER",
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_f = (_e = profile.typography.secondary) != null ? _e : profile.typography.primary) != null ? _f : {
          family: "Inter",
          style: "Regular"
        }
      }
    );
    const buttonRow = figma.createFrame();
    buttonRow.layoutMode = "HORIZONTAL";
    buttonRow.counterAxisAlignItems = "CENTER";
    buttonRow.primaryAxisAlignItems = "CENTER";
    buttonRow.primaryAxisSizingMode = "AUTO";
    buttonRow.counterAxisSizingMode = "AUTO";
    buttonRow.itemSpacing = 16;
    buttonRow.name = "Actions";
    buttonRow.appendChild(createButton({ frame, profile }, "Launch Editor"));
    const ghostButton = createButton({ frame, profile }, "Browse Playbook");
    ghostButton.fills = [
      {
        type: "SOLID",
        color: { r: 1, g: 1, b: 1 },
        opacity: 0.08
      }
    ];
    ghostButton.strokes = [
      {
        type: "SOLID",
        color: toFigmaPaint(profile.colors[0]).color,
        opacity: 0.4
      }
    ];
    buttonRow.appendChild(ghostButton);
    const contentFrame = figma.createFrame();
    contentFrame.layoutMode = "VERTICAL";
    contentFrame.primaryAxisAlignItems = "CENTER";
    contentFrame.counterAxisAlignItems = "CENTER";
    contentFrame.primaryAxisSizingMode = "AUTO";
    contentFrame.counterAxisSizingMode = "FIXED";
    contentFrame.resizeWithoutConstraints(frame.width - frame.paddingLeft - frame.paddingRight, frame.height - 260);
    contentFrame.itemSpacing = 28;
    contentFrame.name = "Hero Content";
    contentFrame.fills = [];
    contentFrame.strokes = [];
    const visual = createImagePlaceholder(
      { frame, profile },
      {
        width: frame.width - frame.paddingLeft - frame.paddingRight,
        height: 360,
        useAccent: true
      }
    );
    visual.name = "Hero Visual";
    contentFrame.appendChild(badge);
    contentFrame.appendChild(heading);
    contentFrame.appendChild(body);
    contentFrame.appendChild(buttonRow);
    contentFrame.appendChild(visual);
    frame.appendChild(contentFrame);
  },
  social: ({ frame, profile }) => {
    var _a2, _b, _c, _d, _e, _f, _g;
    frame.name = "Social Spotlight";
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    frame.paddingTop = 64;
    frame.paddingBottom = 64;
    frame.paddingLeft = 48;
    frame.paddingRight = 48;
    frame.itemSpacing = 18;
    frame.clipsContent = false;
    applySurface(frame, profile.surface.background);
    const topRow = figma.createFrame();
    topRow.layoutMode = "HORIZONTAL";
    topRow.primaryAxisSizingMode = "AUTO";
    topRow.counterAxisSizingMode = "AUTO";
    topRow.primaryAxisAlignItems = "SPACE_BETWEEN";
    topRow.counterAxisAlignItems = "CENTER";
    topRow.resizeWithoutConstraints(frame.width - frame.paddingLeft - frame.paddingRight, 48);
    topRow.fills = [];
    topRow.strokes = [];
    const label = createText({ frame, profile }, "Weekly Spotlight", {
      fontSize: 20,
      textAutoResize: "WIDTH_AND_HEIGHT",
      fontName: (_b = (_a2 = profile.typography.secondary) != null ? _a2 : profile.typography.primary) != null ? _b : { family: "Inter", style: "Medium" }
    });
    const badge = createText({ frame, profile }, profile.metadata.sampleCount > 1 ? "Multi-layout DNA" : "Precision match", {
      fontSize: 12,
      textAutoResize: "WIDTH_AND_HEIGHT",
      letterSpacing: { unit: "PERCENT", value: 12 },
      fills: [
        toFigmaPaint(
          (_d = (_c = profile.colors.find((color) => color.role === "accent")) != null ? _c : profile.colors[1]) != null ? _d : profile.colors[0]
        )
      ]
    });
    topRow.appendChild(label);
    topRow.appendChild(badge);
    const hero = createImagePlaceholder(
      { frame, profile },
      {
        width: frame.width - frame.paddingLeft - frame.paddingRight,
        height: 540,
        useAccent: true
      }
    );
    hero.name = "Hero Visual";
    const title = createText({ frame, profile }, "Stories that travel further.", {
      fontSize: 44,
      lineHeight: { unit: "PERCENT", value: 120 },
      textAutoResize: "WIDTH_AND_HEIGHT",
      fontName: (_e = profile.typography.primary) != null ? _e : {
        family: "Inter",
        style: "Bold"
      }
    });
    const caption = createText(
      { frame, profile },
      "Content blueprints engineered to protect voice, proportions, rhythm, and energy across every launch.",
      {
        fontSize: 18,
        lineHeight: { unit: "PERCENT", value: 150 },
        opacity: 0.78,
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_g = (_f = profile.typography.secondary) != null ? _f : profile.typography.primary) != null ? _g : {
          family: "Inter",
          style: "Regular"
        }
      }
    );
    const metrics = figma.createFrame();
    metrics.layoutMode = "HORIZONTAL";
    metrics.primaryAxisSizingMode = "AUTO";
    metrics.counterAxisSizingMode = "AUTO";
    metrics.itemSpacing = 16;
    metrics.fills = [];
    metrics.strokes = [];
    const statCard = (value, descriptor) => {
      var _a3, _b2, _c2, _d2;
      const card = figma.createFrame();
      card.layoutMode = "VERTICAL";
      card.primaryAxisSizingMode = "AUTO";
      card.counterAxisSizingMode = "AUTO";
      card.paddingTop = 18;
      card.paddingBottom = 18;
      card.paddingLeft = 20;
      card.paddingRight = 20;
      card.itemSpacing = 4;
      card.cornerRadius = profile.cornerRadius;
      card.fills = [
        toFigmaPaint(
          (_a3 = profile.colors.find((color) => color.role === "secondary")) != null ? _a3 : profile.colors[0]
        )
      ];
      card.effects = profile.shadows.slice(0, 1);
      const valueText = createText({ frame, profile }, value, {
        fontSize: 28,
        fontName: (_b2 = profile.typography.primary) != null ? _b2 : {
          family: "Inter",
          style: "Semi Bold"
        },
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      });
      const descriptorText = createText({ frame, profile }, descriptor, {
        fontSize: 11,
        opacity: 0.76,
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_d2 = (_c2 = profile.typography.secondary) != null ? _c2 : profile.typography.primary) != null ? _d2 : { family: "Inter", style: "Medium" },
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      });
      card.appendChild(valueText);
      card.appendChild(descriptorText);
      return card;
    };
    metrics.appendChild(statCard("+212%", "Lift in engagement"));
    metrics.appendChild(statCard("38 hrs", "Design time saved"));
    frame.appendChild(topRow);
    frame.appendChild(hero);
    frame.appendChild(title);
    frame.appendChild(caption);
    frame.appendChild(metrics);
  },
  announcement: ({ frame, profile }) => {
    var _a2, _b, _c;
    frame.name = "Launch Announcement";
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    frame.paddingTop = 72;
    frame.paddingBottom = 72;
    frame.paddingLeft = 64;
    frame.paddingRight = 64;
    frame.itemSpacing = 24;
    frame.fills = [];
    applySurface(frame, profile.surface.background);
    const title = createText({ frame, profile }, "Ultra High Fidelity Kits", {
      fontSize: 52,
      textAutoResize: "WIDTH_AND_HEIGHT",
      fontName: (_a2 = profile.typography.primary) != null ? _a2 : {
        family: "Inter",
        style: "Bold"
      }
    });
    const tagline = createText({ frame, profile }, "Drop-and-go canvases engineered to mirror your brand voice.", {
      fontSize: 20,
      opacity: 0.76,
      textAutoResize: "WIDTH_AND_HEIGHT",
      fontName: (_c = (_b = profile.typography.secondary) != null ? _b : profile.typography.primary) != null ? _c : {
        family: "Inter",
        style: "Medium"
      }
    });
    const divider = figma.createRectangle();
    divider.resizeWithoutConstraints(frame.width - frame.paddingLeft - frame.paddingRight, 2);
    divider.fills = [
      {
        type: "SOLID",
        color: { r: 0, g: 0, b: 0 },
        opacity: 0.08
      }
    ];
    divider.cornerRadius = 2;
    const points = figma.createFrame();
    points.layoutMode = "VERTICAL";
    points.primaryAxisSizingMode = "AUTO";
    points.counterAxisSizingMode = "AUTO";
    points.itemSpacing = 12;
    points.fills = [];
    const bullet = (titleText, description) => {
      var _a3, _b2, _c2, _d, _e, _f;
      const row = figma.createFrame();
      row.layoutMode = "HORIZONTAL";
      row.primaryAxisSizingMode = "AUTO";
      row.counterAxisSizingMode = "AUTO";
      row.counterAxisAlignItems = "STRETCH";
      row.itemSpacing = 16;
      row.fills = [];
      const marker = figma.createEllipse();
      marker.resize(12, 12);
      marker.fills = [
        toFigmaPaint(
          (_b2 = (_a3 = profile.colors.find((color) => color.role === "accent")) != null ? _a3 : profile.colors[1]) != null ? _b2 : profile.colors[0]
        )
      ];
      const column = figma.createFrame();
      column.layoutMode = "VERTICAL";
      column.primaryAxisSizingMode = "AUTO";
      column.counterAxisSizingMode = "AUTO";
      column.itemSpacing = 4;
      column.fills = [];
      const heading = createText({ frame, profile }, titleText, {
        fontSize: 18,
        fontName: (_d = (_c2 = profile.typography.secondary) != null ? _c2 : profile.typography.primary) != null ? _d : {
          family: "Inter",
          style: "Semi Bold"
        }
      });
      const descriptionText = createText({ frame, profile }, description, {
        fontSize: 14,
        opacity: 0.7,
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_f = (_e = profile.typography.secondary) != null ? _e : profile.typography.primary) != null ? _f : {
          family: "Inter",
          style: "Regular"
        }
      });
      column.appendChild(heading);
      column.appendChild(descriptionText);
      row.appendChild(marker);
      row.appendChild(column);
      return row;
    };
    points.appendChild(bullet("Palette-perfect combos", "Automatically matched gradients, fills, and strokes."));
    points.appendChild(bullet("Typography pairings", "Exact font stacks and hierarchy from your source layouts."));
    points.appendChild(bullet("Systemized spacing", "Auto layout grids tuned to your brand proportions."));
    frame.appendChild(title);
    frame.appendChild(tagline);
    frame.appendChild(divider);
    frame.appendChild(points);
    frame.appendChild(createButton({ frame, profile }, "Generate assets"));
  },
  email: ({ frame, profile }) => {
    var _a2, _b, _c, _d;
    frame.name = "Email Narrative";
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    frame.paddingTop = 48;
    frame.paddingBottom = 48;
    frame.paddingLeft = 48;
    frame.paddingRight = 48;
    frame.itemSpacing = 24;
    applySurface(frame, profile.surface.background);
    const card = figma.createFrame();
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "AUTO";
    card.paddingTop = 48;
    card.paddingBottom = 48;
    card.paddingLeft = 56;
    card.paddingRight = 56;
    card.itemSpacing = 24;
    card.cornerRadius = profile.cornerRadius;
    card.fills = [
      toFigmaPaint(
        (_a2 = profile.colors.find((color) => color.role === "secondary")) != null ? _a2 : profile.colors[0]
      )
    ];
    card.effects = profile.shadows.slice(0, 1);
    const intro = createText({ frame, profile }, "Personalized dispatch", {
      fontSize: 14,
      opacity: 0.82,
      textAutoResize: "WIDTH_AND_HEIGHT",
      fills: [
        {
          type: "SOLID",
          color: { r: 1, g: 1, b: 1 }
        }
      ]
    });
    const headline = createText({ frame, profile }, "The brand kit that builds itself.", {
      fontSize: 48,
      lineHeight: { unit: "PERCENT", value: 120 },
      textAutoResize: "WIDTH_AND_HEIGHT",
      fontName: (_b = profile.typography.primary) != null ? _b : {
        family: "Inter",
        style: "Bold"
      },
      fills: [
        {
          type: "SOLID",
          color: { r: 1, g: 1, b: 1 }
        }
      ]
    });
    const paragraph = createText(
      { frame, profile },
      "Drop in 3\u20135 reference layouts and receive a ready-to-launch storytelling kit tuned to your brand\u2019s typography, palette, rhythm, and proportions.",
      {
        fontSize: 16,
        lineHeight: { unit: "PERCENT", value: 155 },
        opacity: 0.88,
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_d = (_c = profile.typography.secondary) != null ? _c : profile.typography.primary) != null ? _d : {
          family: "Inter",
          style: "Regular"
        },
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      }
    );
    const grid = figma.createFrame();
    grid.layoutMode = "HORIZONTAL";
    grid.primaryAxisSizingMode = "AUTO";
    grid.counterAxisSizingMode = "AUTO";
    grid.itemSpacing = 16;
    grid.fills = [];
    const column = (titleText, bodyText) => {
      var _a3, _b2, _c2, _d2;
      const columnFrame = figma.createFrame();
      columnFrame.layoutMode = "VERTICAL";
      columnFrame.primaryAxisSizingMode = "AUTO";
      columnFrame.counterAxisSizingMode = "AUTO";
      columnFrame.itemSpacing = 8;
      columnFrame.fills = [];
      const columnTitle = createText({ frame, profile }, titleText, {
        fontSize: 18,
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_b2 = (_a3 = profile.typography.secondary) != null ? _a3 : profile.typography.primary) != null ? _b2 : {
          family: "Inter",
          style: "Semi Bold"
        },
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      });
      const columnBody = createText({ frame, profile }, bodyText, {
        fontSize: 14,
        lineHeight: { unit: "PERCENT", value: 150 },
        opacity: 0.82,
        textAutoResize: "WIDTH_AND_HEIGHT",
        fontName: (_d2 = (_c2 = profile.typography.secondary) != null ? _c2 : profile.typography.primary) != null ? _d2 : {
          family: "Inter",
          style: "Regular"
        },
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      });
      columnFrame.appendChild(columnTitle);
      columnFrame.appendChild(columnBody);
      return columnFrame;
    };
    grid.appendChild(column("Palette memory", "Stores every dominant hue and applies it consistently."));
    grid.appendChild(column("Typographic rhythm", "Reconstructs heading, lead, and caption pairings."));
    grid.appendChild(column("Layout DNA", "Uses ratios from your samples to auto-compose hero, split, and grid canvases."));
    card.appendChild(intro);
    card.appendChild(headline);
    card.appendChild(paragraph);
    card.appendChild(grid);
    card.appendChild(createButton({ frame, profile }, "Sync styles"));
    frame.appendChild(card);
  }
};
var learnBranding = (selection) => analyzeSelection(selection);
var generateTemplates = async (profile, options) => {
  await ensureFonts(profile);
  const createdFrames = [];
  let patternIndex = 0;
  for (let i = 0; i < options.count; i++) {
    if (!options.patterns.length) {
      break;
    }
    const pattern = options.patterns[patternIndex % options.patterns.length];
    patternIndex++;
    const frame = figma.createFrame();
    frame.resizeWithoutConstraints(
      TEMPLATE_DIMENSIONS[pattern].width,
      TEMPLATE_DIMENSIONS[pattern].height
    );
    frame.x = figma.viewport.center.x + i % 3 * (frame.width + 80);
    frame.y = figma.viewport.center.y + Math.floor(i / 3) * (frame.height + 80);
    await templateFactories[pattern]({
      profile,
      frame
    });
    createdFrames.push(frame);
    figma.currentPage.appendChild(frame);
  }
  if (createdFrames.length) {
    figma.currentPage.selection = createdFrames;
    figma.viewport.scrollAndZoomIntoView(createdFrames);
  }
  return createdFrames;
};

// src/main.ts
var DEFAULT_PATTERNS = ["hero", "social", "announcement"];
var KNOWLEDGE_STORAGE_KEY = "brand-style-designer:knowledge";
var TEMPLATE_DATA_KEY = "brand-style-designer:template";
figma.showUI(__html__, { width: 420, height: 640 });
var loadKnowledge = () => {
  try {
    const raw = figma.root.getPluginData(KNOWLEDGE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      profile: mergeBrandingProfiles(null, parsed.profile)
    };
  } catch (e) {
    return null;
  }
};
var saveKnowledge = (data) => {
  figma.root.setPluginData(KNOWLEDGE_STORAGE_KEY, JSON.stringify(data));
};
var readTemplateMetadata = (node) => {
  try {
    const raw = node.getPluginData(TEMPLATE_DATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};
var writeTemplateMetadata = (node, payload) => {
  node.setPluginData(TEMPLATE_DATA_KEY, JSON.stringify(payload));
};
var knowledge = loadKnowledge();
var _a;
var currentProfile = (_a = knowledge == null ? void 0 : knowledge.profile) != null ? _a : null;
var broadcastProfile = (profile, source) => {
  var _a2, _b;
  figma.ui.postMessage({
    type: "branding-profile",
    data: profile,
    meta: {
      learnCount: (_a2 = knowledge == null ? void 0 : knowledge.learnCount) != null ? _a2 : 0,
      approvedCount: (_b = knowledge == null ? void 0 : knowledge.approvedTemplateIds.length) != null ? _b : 0
    },
    source
  });
};
var registerProfile = (profile, approvedNodeIds, source) => {
  var _a2, _b;
  const mergedProfile = knowledge ? mergeBrandingProfiles(knowledge.profile, profile) : profile;
  const approvedSet = new Set((_a2 = knowledge == null ? void 0 : knowledge.approvedTemplateIds) != null ? _a2 : []);
  approvedNodeIds.forEach((id) => approvedSet.add(id));
  const updatedKnowledge = {
    profile: mergedProfile,
    learnCount: ((_b = knowledge == null ? void 0 : knowledge.learnCount) != null ? _b : 0) + 1,
    approvedTemplateIds: Array.from(approvedSet),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  knowledge = updatedKnowledge;
  currentProfile = mergedProfile;
  saveKnowledge(updatedKnowledge);
  broadcastProfile(mergedProfile, source);
};
if (currentProfile) {
  broadcastProfile(currentProfile, "memory");
}
var handleLearnBranding = () => {
  try {
    const selection = figma.currentPage.selection.filter(
      (node) => node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE" || node.type === "GROUP"
    );
    if (!selection.length) {
      throw new Error("Please select at least one frame, component, or group to learn from.");
    }
    const learnedProfile = learnBranding(selection);
    registerProfile(learnedProfile, [], "learn");
    figma.notify("Brand style learned \u2728");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to learn from the current selection.";
    figma.ui.postMessage({
      type: "branding-error",
      data: message
    });
    figma.notify(message, { timeout: 4e3 });
  }
};
var handleGenerateTemplates = async (options) => {
  if (!currentProfile) {
    const message = "Learn the brand first to generate templates.";
    figma.notify(message);
    figma.ui.postMessage({
      type: "branding-error",
      data: message
    });
    return;
  }
  const patterns = options.patterns.length ? options.patterns : DEFAULT_PATTERNS;
  const count = Math.max(1, Math.min(8, options.count || 3));
  figma.ui.postMessage({ type: "generation-start" });
  try {
    const frames = await generateTemplates(currentProfile, { count, patterns });
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    frames.forEach((frame) => {
      var _a2;
      writeTemplateMetadata(frame, {
        generatedAt: timestamp,
        approvalStatus: "pending",
        iteration: (_a2 = knowledge == null ? void 0 : knowledge.learnCount) != null ? _a2 : 0
      });
    });
    figma.ui.postMessage({ type: "generation-complete" });
    figma.notify(`Generated ${count} branded template${count > 1 ? "s" : ""}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate templates.";
    figma.ui.postMessage({
      type: "generation-error",
      data: message
    });
    figma.notify(message, { timeout: 4e3 });
  }
};
var handleApproveSelection = () => {
  try {
    const selection = figma.currentPage.selection.filter(
      (node) => node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE" || node.type === "GROUP"
    );
    if (!selection.length) {
      throw new Error("Select the branded templates you want to approve.");
    }
    const approvedProfile = learnBranding(selection);
    registerProfile(
      approvedProfile,
      selection.map((node) => node.id),
      "approval"
    );
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    selection.forEach((node) => {
      if ("setPluginData" in node) {
        const existing = readTemplateMetadata(node);
        writeTemplateMetadata(node, {
          ...existing,
          approvalStatus: "approved",
          approvedAt: timestamp
        });
      }
    });
    figma.ui.postMessage({ type: "approval-complete" });
    figma.notify("Selection approved. Future templates will follow this direction.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve the current selection.";
    figma.ui.postMessage({
      type: "approval-error",
      data: message
    });
    figma.notify(message, { timeout: 4e3 });
  }
};
figma.on("selectionchange", () => {
  figma.ui.postMessage({
    type: "selection-change",
    data: figma.currentPage.selection.length
  });
});
figma.ui.onmessage = async (message) => {
  switch (message.type) {
    case "learn-branding":
      handleLearnBranding();
      break;
    case "generate-templates":
      await handleGenerateTemplates(message.data);
      break;
    case "approve-selection":
      handleApproveSelection();
      break;
    case "focus-patterns":
      if (message.data && Array.isArray(message.data)) {
        const nodes = message.data.map((id) => figma.getNodeById(id)).filter((node) => !!node);
        if (nodes.length) {
          figma.currentPage.selection = nodes;
          figma.viewport.scrollAndZoomIntoView(nodes);
        }
      }
      break;
    default:
      break;
  }
};
