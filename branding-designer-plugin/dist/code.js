"use strict";

// src/core/fonts.ts
var STYLE_MAP = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black"
};
async function ensureFontsLoaded(family, weights) {
  const uniqueWeights = Array.from(new Set(weights));
  for (const weight of uniqueWeights) {
    const style = weightToFontStyle(weight);
    try {
      await figma.loadFontAsync({ family, style });
    } catch (error) {
      if (style !== "Regular") {
        try {
          await figma.loadFontAsync({ family, style: "Regular" });
          continue;
        } catch (e) {
        }
      }
      figma.notify(`Font "${family} ${style}" is not available. Using Inter Regular instead.`, { timeout: 4e3 });
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    }
  }
}
function weightToFontStyle(weight) {
  var _a;
  const key = Object.keys(STYLE_MAP).map(Number).reduce((closest, candidate) => {
    return Math.abs(candidate - weight) < Math.abs(closest - weight) ? candidate : closest;
  }, 400);
  return (_a = STYLE_MAP[key]) != null ? _a : "Regular";
}

// src/types/brand.ts
var MODE_PROFILE2 = {
  conservative: {
    fontFamiliesMax: 1,
    weightsMax: 2,
    typeRatio: 1.2,
    exploration: 0.1,
    allowDisplay: false
  },
  pro: {
    fontFamiliesMax: 2,
    weightsMax: 3,
    typeRatio: 1.25,
    exploration: 0.3,
    allowDisplay: true
  },
  creative: {
    fontFamiliesMax: 3,
    weightsMax: 4,
    typeRatio: 1.33,
    exploration: 0.6,
    allowDisplay: true
  }
};

// src/core/color.ts
var HEX_REGEX = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i;
function parseColorHex(hex) {
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
function normalizeHex(hex) {
  const match = HEX_REGEX.exec(hex);
  if (!match) {
    throw new Error(`Invalid color hex "${hex}".`);
  }
  return `#${match[1].toUpperCase()}`;
}
function rgbToFigma(rgb) {
  return {
    r: clamp01(rgb.r / 255),
    g: clamp01(rgb.g / 255),
    b: clamp01(rgb.b / 255)
  };
}
var clamp01 = (value) => Math.max(0, Math.min(1, value));
function contrastRatio(hex1, hex2) {
  const a = parseColorHex(hex1);
  const b = parseColorHex(hex2);
  const luminance = (channel) => {
    const norm = channel / 255;
    return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
  };
  const lumA = 0.2126 * luminance(a.r) + 0.7152 * luminance(a.g) + 0.0722 * luminance(a.b);
  const lumB = 0.2126 * luminance(b.r) + 0.7152 * luminance(b.g) + 0.0722 * luminance(b.b);
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return (brightest + 0.05) / (darkest + 0.05);
}
function nearestPassToken(fgHex, bgHex, brandColors, minRatio) {
  const tokens = Object.entries(brandColors);
  let best = null;
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
  return { fg: fgHex, bg: bgHex, fgToken: "primary", bgToken: "surface" };
}

// src/core/brand.ts
var COLLECTION_SUFFIX = "Tokens";
var VARIABLE_MODES = ["Default"];
function parseBrandJSON(raw) {
  var _a;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error("Brand JSON is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Brand JSON must describe an object.");
  }
  const brand2 = parsed;
  if (!brand2.name || typeof brand2.name !== "string") {
    throw new Error('Brand JSON requires a "name" property.');
  }
  if (!brand2.colors) {
    throw new Error('Brand JSON requires a "colors" object.');
  }
  const requiredColors = ["primary", "onPrimary", "secondary", "surface", "onSurface"];
  requiredColors.forEach((token) => {
    var _a2;
    const value = (_a2 = brand2.colors) == null ? void 0 : _a2[token];
    if (!value) {
      throw new Error(`Brand JSON missing colors.${token}`);
    }
    parseColorHex(value);
  });
  if (!brand2.typography) {
    throw new Error('Brand JSON requires a "typography" object.');
  }
  if (!brand2.typography.fontFamily) {
    throw new Error('Brand JSON typography requires "fontFamily".');
  }
  if (!Array.isArray(brand2.typography.scale) || !brand2.typography.scale.length) {
    throw new Error("Brand JSON typography.scale must be a non-empty array of strings.");
  }
  if (!brand2.typography.weights || !Object.keys(brand2.typography.weights).length) {
    throw new Error("Brand JSON typography.weights must contain at least one entry.");
  }
  if (!brand2.spacing || typeof brand2.spacing.base !== "number" || !Array.isArray(brand2.spacing.scale)) {
    throw new Error("Brand JSON requires spacing.base number and spacing.scale array.");
  }
  if (!brand2.radii || Object.keys(brand2.radii).length === 0) {
    throw new Error("Brand JSON requires radii definitions.");
  }
  return {
    logos: {},
    ...brand2,
    colors: Object.fromEntries(
      Object.entries((_a = brand2.colors) != null ? _a : {}).map(([key, value]) => [key, normalizeHex(value)])
    ),
    typography: {
      ...brand2.typography,
      scale: brand2.typography.scale.map((value) => value.toString())
    }
  };
}
async function ensureBrandResources(brand2) {
  var _a, _b;
  const collectionName = `${brand2.name} ${COLLECTION_SUFFIX}`;
  let collection = figma.variables.getLocalVariableCollections().find((c) => c.name === collectionName);
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
    VARIABLE_MODES.forEach((modeName) => {
      if (!collection.modes.some((mode2) => mode2.name === modeName)) {
        collection.addMode(modeName);
      }
    });
  }
  const defaultModeId = (_b = (_a = collection.modes[0]) == null ? void 0 : _a.modeId) != null ? _b : (() => {
    const mode2 = collection.addMode("Default");
    return mode2.modeId;
  })();
  const colorVariables = {};
  const numberVariables = {};
  const localColorVariables = figma.variables.getLocalVariables("COLOR").filter((variable) => variable.variableCollectionId === collection.id);
  const upsertColorVariable = (token, hex) => {
    const existing = localColorVariables.find((v) => v.name === token);
    const rgb = rgbToFigma(parseColorHex(hex));
    if (existing) {
      existing.setValueForMode(defaultModeId, rgb);
      colorVariables[token] = existing;
      return existing;
    }
    const created = figma.variables.createVariable(token, collection.id, "COLOR");
    created.setValueForMode(defaultModeId, rgb);
    colorVariables[token] = created;
    return created;
  };
  Object.entries(brand2.colors).forEach(([token, hex]) => {
    upsertColorVariable(token, hex);
  });
  const localNumberVariables = figma.variables.getLocalVariables("FLOAT").filter((variable) => variable.variableCollectionId === collection.id);
  const upsertNumberVariable = (token, value) => {
    const existing = localNumberVariables.find((v) => v.name === token);
    if (existing) {
      existing.setValueForMode(defaultModeId, value);
      numberVariables[token] = existing;
      return existing;
    }
    const created = figma.variables.createVariable(token, collection.id, "FLOAT");
    created.setValueForMode(defaultModeId, value);
    numberVariables[token] = created;
    return created;
  };
  upsertNumberVariable("spacing/base", brand2.spacing.base);
  brand2.spacing.scale.forEach((value, index) => {
    upsertNumberVariable(`spacing/scale/${index}`, value);
  });
  Object.entries(brand2.radii).forEach(([key, value]) => {
    upsertNumberVariable(`radii/${key}`, value);
  });
  const weights = Object.entries(brand2.typography.weights).map(([label, weight]) => ({
    label,
    weight
  }));
  await ensureFontsLoaded(brand2.typography.fontFamily, weights.map((entry) => entry.weight));
  if (brand2.typography.secondaryFamily) {
    await ensureFontsLoaded(brand2.typography.secondaryFamily, weights.map((entry) => entry.weight));
  }
  const typographyStyles = {};
  const existingStyles = figma.getLocalTextStyles();
  const ensureTextStyle = (name, size, weight) => {
    const styleName = `${brand2.name}/${name}`;
    let style = existingStyles.find((textStyle) => textStyle.name === styleName);
    if (!style) {
      style = figma.createTextStyle();
      style.name = styleName;
    }
    style.fontName = {
      family: brand2.typography.fontFamily,
      style: weightToStyle(weight)
    };
    style.fontSize = size;
    style.lineHeight = {
      unit: "PERCENT",
      value: Math.round(MODE_PROFILE2.pro.typeRatio * 100)
    };
    typographyStyles[name] = style;
    return style;
  };
  brand2.typography.scale.forEach((sizeString, index) => {
    const size = parseFloat(sizeString);
    if (!Number.isFinite(size)) {
      return;
    }
    const weight = weights[Math.min(index, weights.length - 1)].weight;
    ensureTextStyle(`Type/${size}`, size, weight);
  });
  return {
    collectionId: collection.id,
    modes: collection.modes.map((mode2) => mode2.modeId),
    colorVariables,
    numberVariables,
    typographyStyles
  };
}
function weightToStyle(weight) {
  if (weight >= 800) return "Black";
  if (weight >= 700) return "Bold";
  if (weight >= 600) return "Semi Bold";
  if (weight >= 500) return "Medium";
  if (weight >= 400) return "Regular";
  if (weight >= 300) return "Light";
  return "Regular";
}

// src/core/canon.ts
var DESIGN_CANON = {
  contrast: { aa_normal: 4.5, aa_large: 3 },
  typography: {
    min_body_px: 16,
    ratios: {
      conservative: MODE_PROFILE2.conservative.typeRatio,
      pro: MODE_PROFILE2.pro.typeRatio,
      creative: MODE_PROFILE2.creative.typeRatio
    }
  },
  spacing: { base: 8 },
  grid: { columns: 12, gutter: 16 },
  color_roles: { use_tokens: true, fallback_to_styles: true }
};

// src/core/contrast.ts
function ensureContrast(brand2, fgToken, bgToken, isLargeText = false) {
  var _a, _b;
  const fg = (_a = brand2.colors[fgToken]) != null ? _a : brand2.colors.primary;
  const bg = (_b = brand2.colors[bgToken]) != null ? _b : brand2.colors.surface;
  const ratio = contrastRatio(fg, bg);
  const required = isLargeText ? DESIGN_CANON.contrast.aa_large : DESIGN_CANON.contrast.aa_normal;
  if (ratio >= required) {
    return { fg, bg, fgToken, bgToken, ratio, adjusted: false };
  }
  const nearest = nearestPassToken(fg, bg, brand2.colors, required);
  return {
    fg: nearest.fg,
    bg: nearest.bg,
    fgToken: nearest.fgToken,
    bgToken: nearest.bgToken,
    ratio: contrastRatio(nearest.fg, nearest.bg),
    adjusted: true
  };
}

// src/core/layouts.ts
async function createLayout(pattern, context) {
  switch (pattern) {
    case "hero":
      return createHeroLayout(context);
    case "card":
      return createCardLayout(context);
    case "social":
      return createSocialLayout(context);
  }
}
async function createHeroLayout(context) {
  var _a, _b, _c, _d;
  const { brand: brand2, variables: variables2, mode: mode2 } = context;
  await ensureFontsLoaded(brand2.typography.fontFamily, Object.values(brand2.typography.weights));
  const frame = figma.createFrame();
  frame.name = `${brand2.name} \xB7 Hero`;
  frame.resize(1440, 960);
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.primaryAxisAlignItems = "CENTER";
  frame.counterAxisAlignItems = "CENTER";
  frame.itemSpacing = 32;
  setVariable(frame, "fills", variables2.colorVariables.surface.id);
  setVariable(frame, "paddingLeft", variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingRight", variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingTop", (_b = (_a = variables2.numberVariables["spacing/scale/4"]) == null ? void 0 : _a.id) != null ? _b : variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingBottom", (_d = (_c = variables2.numberVariables["spacing/scale/4"]) == null ? void 0 : _c.id) != null ? _d : variables2.numberVariables["spacing/base"].id);
  ensureCornerRadius(frame, variables2);
  const kicker = figma.createText();
  kicker.name = "Kicker";
  kicker.characters = "BrandPilot";
  setTextStyle(kicker, brand2, variables2, 0, mode2);
  setVariable(kicker, "fills", variables2.colorVariables.secondary.id);
  frame.appendChild(kicker);
  const heading = figma.createText();
  heading.name = "Headline";
  heading.characters = "Your brand. Your canon. Generated in minutes.";
  setTextStyle(heading, brand2, variables2, 5, mode2);
  setVariable(heading, "fills", variables2.colorVariables.onSurface.id);
  heading.textAutoResize = "WIDTH_AND_HEIGHT";
  frame.appendChild(heading);
  const body = figma.createText();
  body.name = "Body";
  body.characters = "BrandPilot learns your tokens, enforces accessibility, and produces rationale-backed layouts for every launch.";
  setTextStyle(body, brand2, variables2, 2, mode2);
  setVariable(body, "fills", variables2.colorVariables.onSurface.id);
  body.opacity = 0.78;
  body.textAutoResize = "WIDTH_AND_HEIGHT";
  frame.appendChild(body);
  const buttonRow = figma.createFrame();
  buttonRow.name = "Actions";
  buttonRow.layoutMode = "HORIZONTAL";
  buttonRow.primaryAxisSizingMode = "AUTO";
  buttonRow.counterAxisSizingMode = "AUTO";
  buttonRow.itemSpacing = 16;
  buttonRow.counterAxisAlignItems = "CENTER";
  buttonRow.primaryAxisAlignItems = "CENTER";
  frame.appendChild(buttonRow);
  buttonRow.appendChild(createButton("Generate hero", brand2, variables2, mode2, true));
  buttonRow.appendChild(createButton("Explain rationale", brand2, variables2, mode2, false));
  addHeroVisual(frame, brand2, variables2);
  figma.currentPage.appendChild(frame);
  frame.x = figma.viewport.center.x - frame.width / 2;
  frame.y = figma.viewport.center.y - frame.height / 2;
  return frame;
}
async function createCardLayout(context) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const { brand: brand2, variables: variables2, variantIndex, mode: mode2 } = context;
  await ensureFontsLoaded(brand2.typography.fontFamily, Object.values(brand2.typography.weights));
  const frame = figma.createFrame();
  frame.name = `${brand2.name} \xB7 Feature Card`;
  frame.resize(520, 640);
  frame.layoutMode = "VERTICAL";
  frame.counterAxisAlignItems = "STRETCH";
  frame.primaryAxisAlignItems = "CENTER";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = 20;
  setVariable(frame, "fills", variables2.colorVariables.surface.id);
  setVariable(frame, "paddingLeft", (_b = (_a = variables2.numberVariables["spacing/scale/2"]) == null ? void 0 : _a.id) != null ? _b : variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingRight", (_d = (_c = variables2.numberVariables["spacing/scale/2"]) == null ? void 0 : _c.id) != null ? _d : variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingTop", (_f = (_e = variables2.numberVariables["spacing/scale/3"]) == null ? void 0 : _e.id) != null ? _f : variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingBottom", (_h = (_g = variables2.numberVariables["spacing/scale/3"]) == null ? void 0 : _g.id) != null ? _h : variables2.numberVariables["spacing/base"].id);
  ensureCornerRadius(frame, variables2);
  frame.effects = [
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.08 },
      radius: 20,
      offset: { x: 0, y: 18 },
      spread: -4,
      visible: true,
      blendMode: "NORMAL"
    }
  ];
  const badge = figma.createText();
  badge.characters = variantIndex % 2 === 0 ? "New capability" : "Playbook insight";
  setTextStyle(badge, brand2, variables2, 0, mode2);
  setVariable(badge, "fills", variables2.colorVariables.secondary.id);
  badge.opacity = 0.82;
  frame.appendChild(badge);
  const title = figma.createText();
  title.characters = variantIndex % 2 === 0 ? "Accessible cards in one click" : "Consistent tokens, every launch";
  setTextStyle(title, brand2, variables2, 4, mode2);
  setVariable(title, "fills", variables2.colorVariables.onSurface.id);
  title.textAutoResize = "WIDTH_AND_HEIGHT";
  frame.appendChild(title);
  const paragraph = figma.createText();
  paragraph.characters = "Apply tokens, fix contrast, and generate rationale-backed stories. BrandPilot keeps your system alive.";
  setTextStyle(paragraph, brand2, variables2, 1, mode2);
  setVariable(paragraph, "fills", variables2.colorVariables.onSurface.id);
  paragraph.opacity = 0.72;
  paragraph.textAutoResize = "WIDTH_AND_HEIGHT";
  frame.appendChild(paragraph);
  const metricsRow = figma.createFrame();
  metricsRow.layoutMode = "VERTICAL";
  metricsRow.counterAxisAlignItems = "STRETCH";
  metricsRow.primaryAxisSizingMode = "AUTO";
  metricsRow.counterAxisSizingMode = "AUTO";
  metricsRow.itemSpacing = 12;
  metricsRow.fills = [];
  frame.appendChild(metricsRow);
  metricsRow.appendChild(createKeyValueRow("Contrast AA", "Auto enforced"));
  metricsRow.appendChild(createKeyValueRow("Tokens mapped", String(Object.keys(brand2.colors).length)));
  figma.currentPage.appendChild(frame);
  return frame;
}
async function createSocialLayout(context) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  const { brand: brand2, variables: variables2, mode: mode2 } = context;
  await ensureFontsLoaded(brand2.typography.fontFamily, Object.values(brand2.typography.weights));
  const frame = figma.createFrame();
  frame.name = `${brand2.name} \xB7 Social`;
  frame.resize(1080, 1350);
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.primaryAxisAlignItems = "CENTER";
  frame.counterAxisAlignItems = "CENTER";
  frame.itemSpacing = 24;
  setVariable(frame, "fills", variables2.colorVariables.primary.id);
  ensureCornerRadius(frame, variables2);
  setVariable(frame, "paddingLeft", (_b = (_a = variables2.numberVariables["spacing/scale/3"]) == null ? void 0 : _a.id) != null ? _b : variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingRight", (_d = (_c = variables2.numberVariables["spacing/scale/3"]) == null ? void 0 : _c.id) != null ? _d : variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingTop", (_f = (_e = variables2.numberVariables["spacing/scale/4"]) == null ? void 0 : _e.id) != null ? _f : variables2.numberVariables["spacing/base"].id);
  setVariable(frame, "paddingBottom", (_h = (_g = variables2.numberVariables["spacing/scale/4"]) == null ? void 0 : _g.id) != null ? _h : variables2.numberVariables["spacing/base"].id);
  const ratio = ensureContrast(brand2, "onPrimary", "primary", true);
  const kicker = figma.createText();
  kicker.characters = `Contrast ${ratio.ratio.toFixed(2)}\xD7 AA`;
  setTextStyle(kicker, brand2, variables2, 1, mode2);
  setVariable(kicker, "fills", (_j = (_i = variables2.colorVariables[ratio.fgToken]) == null ? void 0 : _i.id) != null ? _j : variables2.colorVariables.onPrimary.id);
  kicker.opacity = 0.82;
  frame.appendChild(kicker);
  const headline = figma.createText();
  headline.characters = "Creative mode explores safely.";
  setTextStyle(headline, brand2, variables2, 5, mode2);
  setVariable(headline, "fills", (_l = (_k = variables2.colorVariables[ratio.fgToken]) == null ? void 0 : _k.id) != null ? _l : variables2.colorVariables.onPrimary.id);
  headline.textAutoResize = "WIDTH_AND_HEIGHT";
  frame.appendChild(headline);
  const caption = figma.createText();
  caption.characters = "Bounded exploration keeps brand memory sharp while producing fresh executions.";
  setTextStyle(caption, brand2, variables2, 2, mode2);
  setVariable(caption, "fills", (_n = (_m = variables2.colorVariables[ratio.fgToken]) == null ? void 0 : _m.id) != null ? _n : variables2.colorVariables.onPrimary.id);
  caption.opacity = 0.78;
  caption.textAutoResize = "WIDTH_AND_HEIGHT";
  frame.appendChild(caption);
  const footer = figma.createFrame();
  footer.layoutMode = "HORIZONTAL";
  footer.primaryAxisSizingMode = "AUTO";
  footer.counterAxisSizingMode = "AUTO";
  footer.itemSpacing = 12;
  footer.counterAxisAlignItems = "CENTER";
  footer.fills = [];
  frame.appendChild(footer);
  footer.appendChild(createChip(`Mode: ${mode2[0].toUpperCase()}${mode2.slice(1)}`, brand2, variables2, mode2));
  footer.appendChild(createChip("AA guaranteed", brand2, variables2, mode2));
  figma.currentPage.appendChild(frame);
  return frame;
}
function createButton(label, brand2, variables2, mode2, primary) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const button = figma.createFrame();
  button.name = `Button \xB7 ${label}`;
  button.layoutMode = "HORIZONTAL";
  button.primaryAxisSizingMode = "AUTO";
  button.counterAxisSizingMode = "AUTO";
  button.counterAxisAlignItems = "CENTER";
  button.primaryAxisAlignItems = "CENTER";
  button.itemSpacing = 12;
  setVariable(button, "paddingLeft", (_b = (_a = variables2.numberVariables["spacing/scale/2"]) == null ? void 0 : _a.id) != null ? _b : variables2.numberVariables["spacing/base"].id);
  setVariable(button, "paddingRight", (_d = (_c = variables2.numberVariables["spacing/scale/2"]) == null ? void 0 : _c.id) != null ? _d : variables2.numberVariables["spacing/base"].id);
  setVariable(button, "paddingTop", (_f = (_e = variables2.numberVariables["spacing/scale/1"]) == null ? void 0 : _e.id) != null ? _f : variables2.numberVariables["spacing/base"].id);
  setVariable(button, "paddingBottom", (_h = (_g = variables2.numberVariables["spacing/scale/1"]) == null ? void 0 : _g.id) != null ? _h : variables2.numberVariables["spacing/base"].id);
  ensureCornerRadius(button, variables2);
  if (primary) {
    setVariable(button, "fills", variables2.colorVariables.primary.id);
  } else {
    setVariable(button, "fills", variables2.colorVariables.surface.id);
    setVariable(button, "strokes", variables2.colorVariables.primary.id);
    button.strokeWeight = 1;
  }
  const text = figma.createText();
  text.characters = label;
  setTextStyle(text, brand2, variables2, 1, mode2);
  setVariable(
    text,
    "fills",
    (primary ? variables2.colorVariables.onPrimary : variables2.colorVariables.primary).id
  );
  text.textAutoResize = "WIDTH_AND_HEIGHT";
  button.appendChild(text);
  return button;
}
function createChip(label, brand2, variables2, mode2) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const chip = figma.createFrame();
  chip.layoutMode = "HORIZONTAL";
  chip.primaryAxisSizingMode = "AUTO";
  chip.counterAxisSizingMode = "AUTO";
  chip.counterAxisAlignItems = "CENTER";
  chip.primaryAxisAlignItems = "CENTER";
  chip.itemSpacing = 8;
  ensureCornerRadius(chip, variables2, 999);
  setVariable(chip, "fills", variables2.colorVariables.surface.id);
  setVariable(chip, "paddingLeft", (_b = (_a = variables2.numberVariables["spacing/scale/1"]) == null ? void 0 : _a.id) != null ? _b : variables2.numberVariables["spacing/base"].id);
  setVariable(chip, "paddingRight", (_d = (_c = variables2.numberVariables["spacing/scale/1"]) == null ? void 0 : _c.id) != null ? _d : variables2.numberVariables["spacing/base"].id);
  setVariable(chip, "paddingTop", (_f = (_e = variables2.numberVariables["spacing/scale/1"]) == null ? void 0 : _e.id) != null ? _f : variables2.numberVariables["spacing/base"].id);
  setVariable(chip, "paddingBottom", (_h = (_g = variables2.numberVariables["spacing/scale/1"]) == null ? void 0 : _g.id) != null ? _h : variables2.numberVariables["spacing/base"].id);
  const text = figma.createText();
  text.characters = label;
  setTextStyle(text, brand2, variables2, 0, mode2);
  setVariable(text, "fills", variables2.colorVariables.primary.id);
  chip.appendChild(text);
  return chip;
}
function createKeyValueRow(label, value) {
  const row = figma.createFrame();
  row.layoutMode = "VERTICAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.fills = [];
  const title = figma.createText();
  title.characters = label;
  title.fontSize = 12;
  title.opacity = 0.64;
  row.appendChild(title);
  const body = figma.createText();
  body.characters = value;
  body.fontSize = 16;
  body.fontName = { family: "Inter", style: "Medium" };
  row.appendChild(body);
  return row;
}
function addHeroVisual(frame, brand2, variables2) {
  const visual = figma.createRectangle();
  visual.resize(frame.width - 160, 320);
  ensureCornerRadius(visual, variables2);
  setVariable(visual, "fills", variables2.colorVariables.secondary.id);
  setVariable(visual, "strokes", variables2.colorVariables.onPrimary.id);
  visual.strokeWeight = 0;
  frame.appendChild(visual);
}
function setTextStyle(node, brand2, variables2, scaleIndex, mode2) {
  var _a;
  const scale = brand2.typography.scale;
  const cappedIndex = Math.min(scaleIndex, scale.length - 1);
  const size = parseFloat(scale[cappedIndex]);
  const weights = Object.values(brand2.typography.weights);
  const weight = (_a = weights[Math.min(cappedIndex, weights.length - 1)]) != null ? _a : 400;
  node.fontName = { family: brand2.typography.fontFamily, style: weightToStyle2(weight) };
  node.fontSize = size;
  node.lineHeight = { unit: "PERCENT", value: MODE_PROFILE2[mode2].typeRatio * 100 };
}
function weightToStyle2(weight) {
  if (weight >= 800) return "Black";
  if (weight >= 700) return "Bold";
  if (weight >= 600) return "Semi Bold";
  if (weight >= 500) return "Medium";
  if (weight >= 400) return "Regular";
  if (weight >= 300) return "Light";
  return "Regular";
}
function ensureCornerRadius(node, variables2, fallbackRadius) {
  var _a, _b;
  const radiusVariable = (_b = (_a = variables2.numberVariables["radii/md"]) != null ? _a : variables2.numberVariables["radii/default"]) != null ? _b : variables2.numberVariables["radii/sm"];
  if (radiusVariable) {
    setVariable(node, "cornerRadius", radiusVariable.id);
  } else if (fallbackRadius) {
    node.cornerRadius = fallbackRadius;
  } else {
    node.cornerRadius = 8;
  }
}
function setVariable(node, property, variableId) {
  var _a;
  if (!("boundVariables" in node)) {
    return;
  }
  const bound = (_a = node.boundVariables) != null ? _a : {};
  bound[property] = { type: "VARIABLE_ALIAS", id: variableId };
  node.boundVariables = bound;
}

// src/core/apply.ts
async function applyBrandToSelection(selection, brand2, variables2, options) {
  if (!selection.length) {
    throw new Error("Select at least one layer to apply the brand.");
  }
  selection.forEach((node) => {
    applyNode(node, brand2, variables2, options);
  });
}
function applyNode(node, brand2, variables2, options) {
  var _a, _b, _c, _d, _e, _f, _g;
  if ("fills" in node && Array.isArray(node.fills)) {
    setVariable2(node, "fills", variables2.colorVariables.surface.id);
  }
  if ("strokes" in node && Array.isArray(node.strokes)) {
    setVariable2(node, "strokes", variables2.colorVariables.primary.id);
  }
  if (options.includeSpacing && "paddingLeft" in node) {
    setVariable2(node, "paddingLeft", variables2.numberVariables["spacing/base"].id);
    setVariable2(node, "paddingRight", variables2.numberVariables["spacing/base"].id);
  }
  if (options.includeSpacing && "itemSpacing" in node) {
    setVariable2(node, "itemSpacing", (_b = (_a = variables2.numberVariables["spacing/scale/1"]) == null ? void 0 : _a.id) != null ? _b : variables2.numberVariables["spacing/base"].id);
  }
  if (options.includeTypography && node.type === "TEXT") {
    const ratio = ensureContrast(brand2, "onSurface", "surface", node.fontSize >= 24);
    setVariable2(node, "fills", (_d = (_c = variables2.colorVariables[ratio.fgToken]) == null ? void 0 : _c.id) != null ? _d : variables2.colorVariables.onSurface.id);
    const mediumWeight = (_g = (_f = (_e = brand2.typography.weights.medium) != null ? _e : brand2.typography.weights.regular) != null ? _f : Object.values(brand2.typography.weights)[0]) != null ? _g : 400;
    node.fontName = { family: brand2.typography.fontFamily, style: weightToStyle3(mediumWeight) };
  }
  if ("children" in node) {
    node.children.forEach((child) => applyNode(child, brand2, variables2, options));
  }
}
function weightToStyle3(fontSize) {
  if (fontSize >= 32) return "Semi Bold";
  if (fontSize >= 24) return "Medium";
  return "Regular";
}
function setVariable2(node, property, variableId) {
  var _a;
  if (!("boundVariables" in node)) {
    return;
  }
  const bound = (_a = node.boundVariables) != null ? _a : {};
  bound[property] = { type: "VARIABLE_ALIAS", id: variableId };
  node.boundVariables = bound;
}

// src/core/learn.ts
var STORAGE_KEY = "brandpilot:feedback";
async function recordFeedback(key, upvote) {
  var _a;
  const snapshot = await loadSnapshot();
  const current = (_a = snapshot.feedback[key]) != null ? _a : { positive: 1, negative: 1 };
  const updated = {
    positive: current.positive + (upvote ? 1 : 0),
    negative: current.negative + (upvote ? 0 : 1)
  };
  snapshot.feedback[key] = updated;
  snapshot.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveSnapshot(snapshot);
  return snapshot;
}
async function incrementApprovals() {
  const snapshot = await loadSnapshot();
  snapshot.selectionsApproved += 1;
  snapshot.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveSnapshot(snapshot);
  return snapshot;
}
async function loadSnapshot() {
  const raw = await figma.clientStorage.getAsync(STORAGE_KEY);
  if (raw && typeof raw === "object") {
    return raw;
  }
  return {
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    selectionsApproved: 0,
    feedback: {}
  };
}
async function saveSnapshot(snapshot) {
  await figma.clientStorage.setAsync(STORAGE_KEY, snapshot);
}

// src/core/explain.ts
var CONTRAST_THRESHOLD = 0.2;
function buildRationale(input) {
  const bullets = [];
  const { component, colors, type, spacing, contrast, changes } = input;
  bullets.push(`Applied brand tokens ${Object.values(colors.brandTokens).join(", ")} across ${component} layout.`);
  if (contrast.ratio) {
    const delta = contrast.ratio - contrast.required;
    if (delta >= CONTRAST_THRESHOLD) {
      bullets.push(`Contrast improved to ${contrast.ratio.toFixed(2)}\xD7 (AA\u2265${contrast.required.toFixed(1)}).`);
    } else if (delta < 0) {
      bullets.push(`Contrast adjusted to meet AA ${contrast.required.toFixed(1)}\xD7, currently ${contrast.ratio.toFixed(2)}\xD7.`);
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
    if (from === void 0) {
      bullets.push(`Set ${what} to ${String(to)}.`);
    } else if (from !== to) {
      bullets.push(`Changed ${what} from ${String(from)} \u2192 ${String(to)}.`);
    }
  });
  return bullets.slice(0, 5);
}

// src/core/chat.ts
var SNAPSHOT_KEY = "brandpilot:lastChat";
function buildChatPlan(nodes, request, brand2, variables2, mode2) {
  const lower = request.toLowerCase();
  const changes = [];
  const rationaleTokens = {};
  const wantsSecondary = lower.includes("secondary color") || lower.includes("accent");
  const wantsPrimary = lower.includes("primary color");
  const tightenLine = lower.includes("tighten line") || lower.includes("reduce line");
  const loosenLine = lower.includes("loosen line") || lower.includes("increase line");
  const increasePadding = lower.includes("more padding") || lower.includes("increase padding") || lower.includes("room");
  const decreasePadding = lower.includes("less padding") || lower.includes("tighten padding");
  nodes.forEach((node) => {
    var _a;
    if ("fills" in node && (wantsSecondary || wantsPrimary)) {
      const targetVariable = wantsSecondary ? variables2.colorVariables.secondary : variables2.colorVariables.primary;
      if (targetVariable) {
        const original = captureFill(node);
        changes.push({
          nodeId: node.id,
          nodeName: node.name,
          property: "fills",
          from: original,
          to: targetVariable.id,
          apply: () => setVariable3(node, "fills", targetVariable.id)
        });
        rationaleTokens.fill = targetVariable.name;
      }
    }
    if (node.type === "TEXT") {
      if (tightenLine || loosenLine) {
        const current = node.lineHeight;
        const currentPercent = current && typeof current === "object" && current.unit === "PERCENT" ? current.value : 120;
        const delta = tightenLine ? -10 : 10;
        const target = Math.max(110, Math.min(160, currentPercent + delta));
        changes.push({
          nodeId: node.id,
          nodeName: node.name,
          property: "lineHeight",
          from: currentPercent,
          to: target,
          apply: () => {
            node.lineHeight = { unit: "PERCENT", value: target };
            const contrast = ensureContrast(brand2, "onSurface", "surface", node.fontSize >= 24);
            const token = contrast.adjusted ? contrast.fgToken : "onSurface";
            const variable = variables2.colorVariables[token];
            if (variable) {
              setVariable3(node, "fills", variable.id);
            }
            rationaleTokens.lineHeight = `${target}%`;
          }
        });
      }
    }
    if ("paddingLeft" in node && (increasePadding || decreasePadding)) {
      const paddingVariable = (_a = variables2.numberVariables[increasePadding ? "spacing/scale/3" : "spacing/scale/1"]) != null ? _a : variables2.numberVariables["spacing/base"];
      if (paddingVariable) {
        const current = {
          left: node.paddingLeft,
          right: node.paddingRight,
          top: node.paddingTop,
          bottom: node.paddingBottom
        };
        changes.push({
          nodeId: node.id,
          nodeName: node.name,
          property: "padding",
          from: current,
          to: paddingVariable.name,
          apply: () => {
            setVariable3(node, "paddingLeft", paddingVariable.id);
            setVariable3(node, "paddingRight", paddingVariable.id);
            setVariable3(node, "paddingTop", paddingVariable.id);
            setVariable3(node, "paddingBottom", paddingVariable.id);
            rationaleTokens.padding = paddingVariable.name;
          }
        });
      }
    }
  });
  return { changes, rationaleTokens };
}
function applyChatPlan(plan) {
  const diffs = [];
  plan.changes.forEach((change) => {
    const node = figma.getNodeById(change.nodeId);
    if (!node || !isSceneNode(node)) return;
    const snapshot = getSnapshot(node);
    snapshot[change.property] = change.from;
    setSnapshot(node, snapshot);
    change.apply();
    diffs.push({
      nodeId: change.nodeId,
      nodeName: change.nodeName,
      property: change.property,
      from: change.from,
      to: change.to
    });
  });
  return diffs;
}
function revertLastChat(nodes) {
  let reverted = 0;
  nodes.forEach((node) => {
    const snapshot = getSnapshot(node);
    if (!snapshot) return;
    Object.entries(snapshot).forEach(([property, value]) => {
      restoreProperty(node, property, value);
    });
    node.setPluginData(SNAPSHOT_KEY, "");
    reverted += 1;
  });
  return reverted;
}
function captureFill(node) {
  var _a, _b, _c;
  return (_c = (_b = (_a = node.boundVariables) == null ? void 0 : _a.fills) == null ? void 0 : _b.id) != null ? _c : null;
}
function setVariable3(node, property, variableId) {
  var _a;
  if (!("boundVariables" in node)) {
    return;
  }
  const bound = (_a = node.boundVariables) != null ? _a : {};
  bound[property] = { type: "VARIABLE_ALIAS", id: variableId };
  node.boundVariables = bound;
}
function getSnapshot(node) {
  const raw = node.getPluginData(SNAPSHOT_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}
function setSnapshot(node, snapshot) {
  node.setPluginData(SNAPSHOT_KEY, JSON.stringify(snapshot));
}
function restoreProperty(node, property, value) {
  switch (property) {
    case "fills":
    case "strokes":
      if (value && typeof value === "string") {
        setVariable3(node, property, value);
      }
      break;
    case "lineHeight":
      if (node.type === "TEXT" && typeof value === "number") {
        node.lineHeight = { unit: "PERCENT", value };
      }
      break;
    case "padding":
      if ("paddingLeft" in node && value && typeof value === "object") {
        const padding = value;
        node.paddingLeft = padding.left;
        node.paddingRight = padding.right;
        node.paddingTop = padding.top;
        node.paddingBottom = padding.bottom;
      }
      break;
  }
}
function isSceneNode(node) {
  return "visible" in node;
}

// src/code.ts
var BRAND_KEY = "brandpilot:brand";
var brand = null;
var variables = null;
var mode = "pro";
var rationaleLog = [];
var knowledge;
figma.showUI(__html__, { width: 520, height: 640 });
figma.ui.onmessage = async (rawMessage) => {
  var _a;
  switch (rawMessage.type) {
    case "ready":
      await boot();
      break;
    case "set-mode":
      mode = rawMessage.mode;
      emitState();
      break;
    case "import-brand":
      await handleImport(rawMessage.payload);
      break;
    case "generate-layout":
      await handleGenerate(rawMessage.pattern, rawMessage.variants);
      break;
    case "apply-brand":
      await handleApply(rawMessage.scope, (_a = rawMessage.options) != null ? _a : { includeTypography: true, includeSpacing: true });
      break;
    case "record-feedback":
      knowledge = await recordFeedback(rawMessage.key, rawMessage.positive);
      emitOperationComplete("feedback", ["Feedback stored."]);
      emitState("learn");
      break;
    case "approve-selection":
      await handleApproval();
      break;
    case "chat-preview":
      await handleChatPreview(rawMessage.nodeIds, rawMessage.request);
      break;
    case "chat-apply":
      await handleChatApply(rawMessage.nodeIds, rawMessage.request);
      break;
    case "chat-revert-last":
      handleChatRevert();
      break;
    case "request-tutorial-assets":
      emitTutorialAssets();
      break;
    default:
      break;
  }
};
figma.on("selectionchange", () => {
  const count = figma.currentPage.selection.length;
  postToUI({ type: "selection-change", count });
});
async function boot() {
  knowledge = await loadSnapshot();
  const cached = figma.root.getPluginData(BRAND_KEY);
  if (cached) {
    try {
      brand = parseBrandJSON(cached);
      variables = await ensureBrandResources(brand);
    } catch (error) {
      figma.notify(`Unable to restore brand: ${error.message}`);
      brand = null;
      variables = null;
    }
  }
  emitState();
}
async function handleImport(payload) {
  try {
    const parsed = parseBrandJSON(payload);
    const resourceMap = await ensureBrandResources(parsed);
    brand = parsed;
    variables = resourceMap;
    figma.root.setPluginData(BRAND_KEY, JSON.stringify(parsed));
    rationaleLog.unshift({
      action: "Brand imported",
      bullets: [
        `Loaded brand \u201C${parsed.name}\u201D`,
        `Mapped ${Object.keys(parsed.colors).length} color tokens`,
        `Ensured font family ${parsed.typography.fontFamily}`
      ]
    });
    emitOperationComplete("import-brand", rationaleLog[0].bullets);
    emitState("learn");
  } catch (error) {
    emitOperationError("import-brand", error);
  }
}
async function handleGenerate(pattern, variants) {
  var _a, _b;
  if (!brand || !variables) {
    emitOperationError("generate-layout", new Error("Import a brand before generating layouts."));
    return;
  }
  const created = [];
  for (let index = 0; index < variants; index++) {
    const node = await createLayout(pattern, {
      brand,
      variables,
      mode,
      variantIndex: index
    });
    created.push(node);
  }
  if (created.length) {
    figma.currentPage.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
  }
  const rationale = buildRationale({
    component: pattern,
    colors: {
      fg: brand.colors.onSurface,
      bg: brand.colors.surface,
      brandTokens: Object.fromEntries(
        Object.entries(variables.colorVariables).map(([token, variable]) => [token, variable.name])
      )
    },
    type: {
      family: brand.typography.fontFamily,
      size: parseFloat((_a = brand.typography.scale[4]) != null ? _a : "24"),
      lineHeight: MODE_PROFILE[mode].typeRatio * 100,
      weight: (_b = Object.values(brand.typography.weights)[0]) != null ? _b : 400
    },
    spacing: { base: brand.spacing.base },
    contrast: { ratio: 4.5, required: DESIGN_CANON.contrast.aa_normal },
    changes: [
      { what: "mode", to: mode },
      { what: "variants", to: variants }
    ]
  });
  rationaleLog.unshift({ action: `Generated ${pattern}`, bullets: rationale });
  emitOperationComplete("generate-layout", rationale);
}
async function handleApply(scope, options) {
  var _a, _b;
  if (!brand || !variables) {
    emitOperationError("apply-brand", new Error("Import a brand before applying."));
    return;
  }
  const target = scope === "selection" && figma.currentPage.selection.length ? figma.currentPage.selection : figma.currentPage.children;
  try {
    await applyBrandToSelection(target, brand, variables, options);
    const rationale = buildRationale({
      component: "apply",
      colors: {
        fg: brand.colors.onSurface,
        bg: brand.colors.surface,
        brandTokens: Object.fromEntries(
          Object.entries(variables.colorVariables).map(([token, variable]) => [token, variable.name])
        )
      },
      type: {
        family: brand.typography.fontFamily,
        size: parseFloat((_a = brand.typography.scale[2]) != null ? _a : "16"),
        lineHeight: MODE_PROFILE[mode].typeRatio * 100,
        weight: (_b = Object.values(brand.typography.weights)[0]) != null ? _b : 400
      },
      spacing: { base: brand.spacing.base },
      contrast: { ratio: 4.5, required: DESIGN_CANON.contrast.aa_normal },
      changes: [{ what: "scope", to: scope }]
    });
    rationaleLog.unshift({ action: "Applied brand", bullets: rationale });
    emitOperationComplete("apply-brand", rationale);
  } catch (error) {
    emitOperationError("apply-brand", error);
  }
}
async function handleApproval() {
  if (!brand || !variables) {
    emitOperationError("approve-selection", new Error("Import a brand before approving layouts."));
    return;
  }
  const selection = figma.currentPage.selection;
  if (!selection.length) {
    emitOperationError("approve-selection", new Error("Select generated frames to approve."));
    return;
  }
  await applyBrandToSelection(selection, brand, variables, {
    includeTypography: true,
    includeSpacing: true
  });
  knowledge = await incrementApprovals();
  emitOperationComplete("approve-selection", [
    `Captured ${selection.length} approved node${selection.length > 1 ? "s" : ""}.`,
    `Total approved selections: ${knowledge.selectionsApproved}`
  ]);
  emitState("approval");
}
async function handleChatPreview(nodeIds, request) {
  var _a, _b;
  if (!brand || !variables) {
    emitOperationError("chat-preview", new Error("Import a brand before using chat."));
    return;
  }
  const nodes = figma.currentPage.selection.filter(
    (node) => "visible" in node
  );
  if (!nodes.length) {
    emitOperationError("chat-preview", new Error("Select nodes to chat with."));
    return;
  }
  const plan = buildChatPlan(nodes, request, brand, variables, mode);
  const diff = plan.changes.map((change) => ({
    nodeId: change.nodeId,
    nodeName: change.nodeName,
    property: change.property,
    from: change.from,
    to: change.to
  }));
  const rationale = buildRationale({
    component: "chat",
    colors: {
      fg: brand.colors.onSurface,
      bg: brand.colors.surface,
      brandTokens: plan.rationaleTokens
    },
    type: {
      family: brand.typography.fontFamily,
      size: parseFloat((_a = brand.typography.scale[2]) != null ? _a : "16"),
      lineHeight: MODE_PROFILE[mode].typeRatio * 100,
      weight: (_b = Object.values(brand.typography.weights)[0]) != null ? _b : 400
    },
    spacing: { base: brand.spacing.base },
    contrast: { ratio: 4.5, required: DESIGN_CANON.contrast.aa_normal },
    changes: diff.map((item) => ({ what: item.property, from: item.from, to: item.to }))
  });
  plan.diff = diff;
  pendingPlan = plan;
  const selectionIds = nodes.map((node) => node.id);
  postToUI({
    type: "chat-preview",
    nodeIds: selectionIds,
    diff: { changes: diff },
    rationale
  });
}
var pendingPlan = null;
async function handleChatApply(nodeIds, request) {
  if (!brand || !variables) {
    emitOperationError("chat-apply", new Error("Import a brand before using chat."));
    return;
  }
  if (!pendingPlan) {
    await handleChatPreview(nodeIds, request);
  }
  if (!pendingPlan) return;
  const diffs = applyChatPlan(pendingPlan);
  const rationale = pendingPlan.changes.map(
    (change) => `Adjusted ${change.property} on ${change.nodeName}.`
  );
  rationaleLog.unshift({ action: "Chat apply", bullets: rationale });
  const nodes = figma.currentPage.selection.map((node) => node.id);
  postToUI({
    type: "chat-applied",
    nodeIds: nodes,
    rationale
  });
  pendingPlan = null;
}
function handleChatRevert() {
  const selection = figma.currentPage.selection.filter(
    (node) => "visible" in node
  );
  const reverted = revertLastChat(selection);
  emitOperationComplete("chat-revert-last", [`Reverted ${reverted} node${reverted === 1 ? "" : "s"}.`]);
}
function emitState(source = "memory") {
  const state = {
    brand,
    variables: null,
    mode,
    rationaleLog,
    knowledge
  };
  postToUI({
    type: "init",
    data: state
  });
  if (brand) {
    postToUI({
      type: "branding-profile",
      data: brand,
      meta: {
        learnCount: Object.keys(knowledge.feedback).length,
        approvedCount: knowledge.selectionsApproved
      },
      source
    });
  }
}
function emitOperationComplete(action, rationale) {
  postToUI({
    type: "operation-complete",
    action,
    rationale
  });
}
function emitOperationError(action, error) {
  const message = error instanceof Error ? error.message : String(error);
  postToUI({
    type: "operation-error",
    action,
    message
  });
  figma.notify(message, { timeout: 4e3 });
}
function emitTutorialAssets() {
  postToUI({
    type: "tutorial-assets",
    sample: SAMPLE_BRAND
  });
}
function postToUI(message) {
  figma.ui.postMessage(message);
}
var SAMPLE_BRAND = {
  name: "Acme Tools",
  colors: {
    primary: "#0055FF",
    onPrimary: "#FFFFFF",
    secondary: "#FFAA00",
    surface: "#FFFFFF",
    onSurface: "#111111"
  },
  typography: {
    fontFamily: "Inter",
    scale: ["12", "14", "16", "20", "24", "32", "40"],
    weights: { regular: 400, medium: 500, bold: 700 }
  },
  spacing: { base: 8, scale: [4, 8, 12, 16, 24, 32] },
  radii: { sm: 4, md: 8, lg: 12 },
  logos: { primary: "https://example.com/logo.svg" }
};
