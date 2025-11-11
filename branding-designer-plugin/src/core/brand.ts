import { DESIGN_CANON } from './canon';
import { ensureFontsLoaded } from './fonts';
import { MODE_PROFILE, BrandJSON, BrandVariableMap, Mode } from '../types/brand';
import { parseColorHex, rgbToFigma, normalizeHex } from './color';

const COLLECTION_SUFFIX = 'Tokens';
const VARIABLE_MODES = ['Default'];

export function parseBrandJSON(raw: string): BrandJSON {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('Brand JSON is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Brand JSON must describe an object.');
  }

  const brand = parsed as Partial<BrandJSON>;
  if (!brand.name || typeof brand.name !== 'string') {
    throw new Error('Brand JSON requires a "name" property.');
  }
  if (!brand.colors) {
    throw new Error('Brand JSON requires a "colors" object.');
  }
  const requiredColors = ['primary', 'onPrimary', 'secondary', 'surface', 'onSurface'] as const;
  requiredColors.forEach((token) => {
    const value = brand.colors?.[token];
    if (!value) {
      throw new Error(`Brand JSON missing colors.${token}`);
    }
    parseColorHex(value);
  });

  if (!brand.typography) {
    throw new Error('Brand JSON requires a "typography" object.');
  }
  if (!brand.typography.fontFamily) {
    throw new Error('Brand JSON typography requires "fontFamily".');
  }
  if (!Array.isArray(brand.typography.scale) || !brand.typography.scale.length) {
    throw new Error('Brand JSON typography.scale must be a non-empty array of strings.');
  }
  if (!brand.typography.weights || !Object.keys(brand.typography.weights).length) {
    throw new Error('Brand JSON typography.weights must contain at least one entry.');
  }

  if (!brand.spacing || typeof brand.spacing.base !== 'number' || !Array.isArray(brand.spacing.scale)) {
    throw new Error('Brand JSON requires spacing.base number and spacing.scale array.');
  }

  if (!brand.radii || Object.keys(brand.radii).length === 0) {
    throw new Error('Brand JSON requires radii definitions.');
  }

  return {
    logos: {},
    ...brand,
    colors: Object.fromEntries(
      Object.entries(brand.colors ?? {}).map(([key, value]) => [key, normalizeHex(value)])
    ),
    typography: {
      ...brand.typography,
      scale: brand.typography.scale.map((value) => value.toString())
    }
  };
}

export async function ensureBrandResources(brand: BrandJSON): Promise<BrandVariableMap> {
  const collectionName = `${brand.name} ${COLLECTION_SUFFIX}`;
  let collection = figma.variables.getLocalVariableCollections().find((c) => c.name === collectionName);

  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
    VARIABLE_MODES.forEach((modeName) => {
      if (!collection!.modes.some((mode) => mode.name === modeName)) {
        collection!.addMode(modeName);
      }
    });
  }

  const defaultModeId = collection.modes[0]?.modeId ?? (() => {
    const mode = collection.addMode('Default');
    return mode.modeId;
  })();

  const colorVariables: Record<string, Variable> = {};
  const numberVariables: Record<string, Variable> = {};

  const localColorVariables = figma.variables.getLocalVariables('COLOR').filter((variable) => variable.variableCollectionId === collection.id);

  const upsertColorVariable = (token: string, hex: string) => {
    const existing = localColorVariables.find((v) => v.name === token);
    const rgb = rgbToFigma(parseColorHex(hex));
    if (existing) {
      existing.setValueForMode(defaultModeId, rgb);
      colorVariables[token] = existing;
      return existing;
    }
    const created = figma.variables.createVariable(token, collection!.id, 'COLOR');
    created.setValueForMode(defaultModeId, rgb);
    colorVariables[token] = created;
    return created;
  };

  Object.entries(brand.colors).forEach(([token, hex]) => {
    upsertColorVariable(token, hex);
  });

  const localNumberVariables = figma.variables.getLocalVariables('FLOAT').filter((variable) => variable.variableCollectionId === collection.id);
  const upsertNumberVariable = (token: string, value: number) => {
    const existing = localNumberVariables.find((v) => v.name === token);
    if (existing) {
      existing.setValueForMode(defaultModeId, value);
      numberVariables[token] = existing;
      return existing;
    }
    const created = figma.variables.createVariable(token, collection!.id, 'FLOAT');
    created.setValueForMode(defaultModeId, value);
    numberVariables[token] = created;
    return created;
  };

  upsertNumberVariable('spacing/base', brand.spacing.base);
  brand.spacing.scale.forEach((value, index) => {
    upsertNumberVariable(`spacing/scale/${index}`, value);
  });
  Object.entries(brand.radii).forEach(([key, value]) => {
    upsertNumberVariable(`radii/${key}`, value);
  });

  const weights = Object.entries(brand.typography.weights).map(([label, weight]) => ({
    label,
    weight
  }));
  await ensureFontsLoaded(brand.typography.fontFamily, weights.map((entry) => entry.weight));
  if (brand.typography.secondaryFamily) {
    await ensureFontsLoaded(brand.typography.secondaryFamily, weights.map((entry) => entry.weight));
  }

  const typographyStyles: Record<string, TextStyle> = {};
  const existingStyles = figma.getLocalTextStyles();

  const ensureTextStyle = (name: string, size: number, weight: number) => {
    const styleName = `${brand.name}/${name}`;
    let style = existingStyles.find((textStyle) => textStyle.name === styleName);
    if (!style) {
      style = figma.createTextStyle();
      style.name = styleName;
    }
    style.fontName = {
      family: brand.typography.fontFamily,
      style: weightToStyle(weight)
    };
    style.fontSize = size;
    style.lineHeight = {
      unit: 'PERCENT',
      value: Math.round(MODE_PROFILE.pro.typeRatio * 100)
    };
    typographyStyles[name] = style;
    return style;
  };

  brand.typography.scale.forEach((sizeString, index) => {
    const size = parseFloat(sizeString);
    if (!Number.isFinite(size)) {
      return;
    }
    const weight = weights[Math.min(index, weights.length - 1)].weight;
    ensureTextStyle(`Type/${size}`, size, weight);
  });

  return {
    collectionId: collection.id,
    modes: collection.modes.map((mode) => mode.modeId),
    colorVariables,
    numberVariables,
    typographyStyles
  };
}

function weightToStyle(weight: number): string {
  if (weight >= 800) return 'Black';
  if (weight >= 700) return 'Bold';
  if (weight >= 600) return 'Semi Bold';
  if (weight >= 500) return 'Medium';
  if (weight >= 400) return 'Regular';
  if (weight >= 300) return 'Light';
  return 'Regular';
}

export function getModeProfile(mode: Mode) {
  return MODE_PROFILE[mode];
}

