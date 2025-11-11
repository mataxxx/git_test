import { ensureFontsLoaded } from './fonts';
import { ensureContrast } from './contrast';
import { BrandJSON, BrandVariableMap, Mode, MODE_PROFILE } from '../types/brand';

type LayoutContext = {
  brand: BrandJSON;
  variables: BrandVariableMap;
  mode: Mode;
  variantIndex: number;
};

export async function createLayout(pattern: 'hero' | 'card' | 'social', context: LayoutContext) {
  switch (pattern) {
    case 'hero':
      return createHeroLayout(context);
    case 'card':
      return createCardLayout(context);
    case 'social':
      return createSocialLayout(context);
  }
}

async function createHeroLayout(context: LayoutContext) {
  const { brand, variables, mode } = context;
  await ensureFontsLoaded(brand.typography.fontFamily, Object.values(brand.typography.weights));

  const frame = figma.createFrame();
  frame.name = `${brand.name} · Hero`;
  frame.resize(1440, 960);
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'FIXED';
  frame.primaryAxisAlignItems = 'CENTER';
  frame.counterAxisAlignItems = 'CENTER';
  frame.itemSpacing = 32;
  setVariable(frame, 'fills', variables.colorVariables.surface.id);
  setVariable(frame, 'paddingLeft', variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingRight', variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingTop', variables.numberVariables['spacing/scale/4']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingBottom', variables.numberVariables['spacing/scale/4']?.id ?? variables.numberVariables['spacing/base'].id);
  ensureCornerRadius(frame, variables);

  const kicker = figma.createText();
  kicker.name = 'Kicker';
  kicker.characters = 'BrandPilot';
  setTextStyle(kicker, brand, variables, 0, mode);
  setVariable(kicker, 'fills', variables.colorVariables.secondary.id);
  frame.appendChild(kicker);

  const heading = figma.createText();
  heading.name = 'Headline';
  heading.characters = 'Your brand. Your canon. Generated in minutes.';
  setTextStyle(heading, brand, variables, 5, mode);
  setVariable(heading, 'fills', variables.colorVariables.onSurface.id);
  heading.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(heading);

  const body = figma.createText();
  body.name = 'Body';
  body.characters =
    'BrandPilot learns your tokens, enforces accessibility, and produces rationale-backed layouts for every launch.';
  setTextStyle(body, brand, variables, 2, mode);
  setVariable(body, 'fills', variables.colorVariables.onSurface.id);
  body.opacity = 0.78;
  body.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(body);

  const buttonRow = figma.createFrame();
  buttonRow.name = 'Actions';
  buttonRow.layoutMode = 'HORIZONTAL';
  buttonRow.primaryAxisSizingMode = 'AUTO';
  buttonRow.counterAxisSizingMode = 'AUTO';
  buttonRow.itemSpacing = 16;
  buttonRow.counterAxisAlignItems = 'CENTER';
  buttonRow.primaryAxisAlignItems = 'CENTER';
  frame.appendChild(buttonRow);

  buttonRow.appendChild(createButton('Generate hero', brand, variables, mode, true));
  buttonRow.appendChild(createButton('Explain rationale', brand, variables, mode, false));

  addHeroVisual(frame, brand, variables);

  figma.currentPage.appendChild(frame);
  frame.x = figma.viewport.center.x - frame.width / 2;
  frame.y = figma.viewport.center.y - frame.height / 2;
  return frame;
}

async function createCardLayout(context: LayoutContext) {
  const { brand, variables, variantIndex, mode } = context;
  await ensureFontsLoaded(brand.typography.fontFamily, Object.values(brand.typography.weights));
  const frame = figma.createFrame();
  frame.name = `${brand.name} · Feature Card`;
  frame.resize(520, 640);
  frame.layoutMode = 'VERTICAL';
  frame.counterAxisAlignItems = 'STRETCH';
  frame.primaryAxisAlignItems = 'CENTER';
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'FIXED';
  frame.itemSpacing = 20;
  setVariable(frame, 'fills', variables.colorVariables.surface.id);
  setVariable(frame, 'paddingLeft', variables.numberVariables['spacing/scale/2']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingRight', variables.numberVariables['spacing/scale/2']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingTop', variables.numberVariables['spacing/scale/3']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingBottom', variables.numberVariables['spacing/scale/3']?.id ?? variables.numberVariables['spacing/base'].id);
  ensureCornerRadius(frame, variables);
  frame.effects = [
    {
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.08 },
      radius: 20,
      offset: { x: 0, y: 18 },
      spread: -4,
      visible: true,
      blendMode: 'NORMAL'
    }
  ];

  const badge = figma.createText();
  badge.characters = variantIndex % 2 === 0 ? 'New capability' : 'Playbook insight';
  setTextStyle(badge, brand, variables, 0, mode);
  setVariable(badge, 'fills', variables.colorVariables.secondary.id);
  badge.opacity = 0.82;
  frame.appendChild(badge);

  const title = figma.createText();
  title.characters = variantIndex % 2 === 0 ? 'Accessible cards in one click' : 'Consistent tokens, every launch';
  setTextStyle(title, brand, variables, 4, mode);
  setVariable(title, 'fills', variables.colorVariables.onSurface.id);
  title.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(title);

  const paragraph = figma.createText();
  paragraph.characters =
    'Apply tokens, fix contrast, and generate rationale-backed stories. BrandPilot keeps your system alive.';
  setTextStyle(paragraph, brand, variables, 1, mode);
  setVariable(paragraph, 'fills', variables.colorVariables.onSurface.id);
  paragraph.opacity = 0.72;
  paragraph.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(paragraph);

  const metricsRow = figma.createFrame();
  metricsRow.layoutMode = 'VERTICAL';
  metricsRow.counterAxisAlignItems = 'STRETCH';
  metricsRow.primaryAxisSizingMode = 'AUTO';
  metricsRow.counterAxisSizingMode = 'AUTO';
  metricsRow.itemSpacing = 12;
  metricsRow.fills = [];
  frame.appendChild(metricsRow);

  metricsRow.appendChild(createKeyValueRow('Contrast AA', 'Auto enforced'));
  metricsRow.appendChild(createKeyValueRow('Tokens mapped', String(Object.keys(brand.colors).length)));

  figma.currentPage.appendChild(frame);
  return frame;
}

async function createSocialLayout(context: LayoutContext) {
  const { brand, variables, mode } = context;
  await ensureFontsLoaded(brand.typography.fontFamily, Object.values(brand.typography.weights));
  const frame = figma.createFrame();
  frame.name = `${brand.name} · Social`;
  frame.resize(1080, 1350);
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'FIXED';
  frame.primaryAxisAlignItems = 'CENTER';
  frame.counterAxisAlignItems = 'CENTER';
  frame.itemSpacing = 24;
  setVariable(frame, 'fills', variables.colorVariables.primary.id);
  ensureCornerRadius(frame, variables);
  setVariable(frame, 'paddingLeft', variables.numberVariables['spacing/scale/3']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingRight', variables.numberVariables['spacing/scale/3']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingTop', variables.numberVariables['spacing/scale/4']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(frame, 'paddingBottom', variables.numberVariables['spacing/scale/4']?.id ?? variables.numberVariables['spacing/base'].id);

  const ratio = ensureContrast(brand, 'onPrimary', 'primary', true);
  const kicker = figma.createText();
  kicker.characters = `Contrast ${ratio.ratio.toFixed(2)}× AA`;
  setTextStyle(kicker, brand, variables, 1, mode);
  setVariable(kicker, 'fills', variables.colorVariables[ratio.fgToken]?.id ?? variables.colorVariables.onPrimary.id);
  kicker.opacity = 0.82;
  frame.appendChild(kicker);

  const headline = figma.createText();
  headline.characters = 'Creative mode explores safely.';
  setTextStyle(headline, brand, variables, 5, mode);
  setVariable(headline, 'fills', variables.colorVariables[ratio.fgToken]?.id ?? variables.colorVariables.onPrimary.id);
  headline.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(headline);

  const caption = figma.createText();
  caption.characters = 'Bounded exploration keeps brand memory sharp while producing fresh executions.';
  setTextStyle(caption, brand, variables, 2, mode);
  setVariable(caption, 'fills', variables.colorVariables[ratio.fgToken]?.id ?? variables.colorVariables.onPrimary.id);
  caption.opacity = 0.78;
  caption.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(caption);

  const footer = figma.createFrame();
  footer.layoutMode = 'HORIZONTAL';
  footer.primaryAxisSizingMode = 'AUTO';
  footer.counterAxisSizingMode = 'AUTO';
  footer.itemSpacing = 12;
  footer.counterAxisAlignItems = 'CENTER';
  footer.fills = [];
  frame.appendChild(footer);

  footer.appendChild(createChip(`Mode: ${mode[0].toUpperCase()}${mode.slice(1)}`, brand, variables, mode));
  footer.appendChild(createChip('AA guaranteed', brand, variables, mode));

  figma.currentPage.appendChild(frame);
  return frame;
}

function createButton(
  label: string,
  brand: BrandJSON,
  variables: BrandVariableMap,
  mode: Mode,
  primary: boolean
) {
  const button = figma.createFrame();
  button.name = `Button · ${label}`;
  button.layoutMode = 'HORIZONTAL';
  button.primaryAxisSizingMode = 'AUTO';
  button.counterAxisSizingMode = 'AUTO';
  button.counterAxisAlignItems = 'CENTER';
  button.primaryAxisAlignItems = 'CENTER';
  button.itemSpacing = 12;
  setVariable(button, 'paddingLeft', variables.numberVariables['spacing/scale/2']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(button, 'paddingRight', variables.numberVariables['spacing/scale/2']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(button, 'paddingTop', variables.numberVariables['spacing/scale/1']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(button, 'paddingBottom', variables.numberVariables['spacing/scale/1']?.id ?? variables.numberVariables['spacing/base'].id);
  ensureCornerRadius(button, variables);

  if (primary) {
    setVariable(button, 'fills', variables.colorVariables.primary.id);
  } else {
    setVariable(button, 'fills', variables.colorVariables.surface.id);
    setVariable(button, 'strokes', variables.colorVariables.primary.id);
    button.strokeWeight = 1;
  }

  const text = figma.createText();
  text.characters = label;
  setTextStyle(text, brand, variables, 1, mode);
  setVariable(
    text,
    'fills',
    (primary ? variables.colorVariables.onPrimary : variables.colorVariables.primary).id
  );
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  button.appendChild(text);
  return button;
}

function createChip(label: string, brand: BrandJSON, variables: BrandVariableMap, mode: Mode) {
  const chip = figma.createFrame();
  chip.layoutMode = 'HORIZONTAL';
  chip.primaryAxisSizingMode = 'AUTO';
  chip.counterAxisSizingMode = 'AUTO';
  chip.counterAxisAlignItems = 'CENTER';
  chip.primaryAxisAlignItems = 'CENTER';
  chip.itemSpacing = 8;
  ensureCornerRadius(chip, variables, 999);
  setVariable(chip, 'fills', variables.colorVariables.surface.id);
  setVariable(chip, 'paddingLeft', variables.numberVariables['spacing/scale/1']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(chip, 'paddingRight', variables.numberVariables['spacing/scale/1']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(chip, 'paddingTop', variables.numberVariables['spacing/scale/1']?.id ?? variables.numberVariables['spacing/base'].id);
  setVariable(chip, 'paddingBottom', variables.numberVariables['spacing/scale/1']?.id ?? variables.numberVariables['spacing/base'].id);

  const text = figma.createText();
  text.characters = label;
  setTextStyle(text, brand, variables, 0, mode);
  setVariable(text, 'fills', variables.colorVariables.primary.id);
  chip.appendChild(text);
  return chip;
}

function createKeyValueRow(label: string, value: string) {
  const row = figma.createFrame();
  row.layoutMode = 'VERTICAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.fills = [];

  const title = figma.createText();
  title.characters = label;
  title.fontSize = 12;
  title.opacity = 0.64;
  row.appendChild(title);

  const body = figma.createText();
  body.characters = value;
  body.fontSize = 16;
  body.fontName = { family: 'Inter', style: 'Medium' };
  row.appendChild(body);

  return row;
}

function addHeroVisual(frame: FrameNode, brand: BrandJSON, variables: BrandVariableMap) {
  const visual = figma.createRectangle();
  visual.resize(frame.width - 160, 320);
  ensureCornerRadius(visual, variables);
  setVariable(visual, 'fills', variables.colorVariables.secondary.id);
  setVariable(visual, 'strokes', variables.colorVariables.onPrimary.id);
  visual.strokeWeight = 0;
  frame.appendChild(visual);
}

function setTextStyle(
  node: TextNode,
  brand: BrandJSON,
  variables: BrandVariableMap,
  scaleIndex: number,
  mode: Mode
) {
  const scale = brand.typography.scale;
  const cappedIndex = Math.min(scaleIndex, scale.length - 1);
  const size = parseFloat(scale[cappedIndex]);
  const weights = Object.values(brand.typography.weights);
  const weight = weights[Math.min(cappedIndex, weights.length - 1)] ?? 400;
  node.fontName = { family: brand.typography.fontFamily, style: weightToStyle(weight) };
  node.fontSize = size;
  node.lineHeight = { unit: 'PERCENT', value: MODE_PROFILE[mode].typeRatio * 100 };
}

function weightToStyle(weight: number) {
  if (weight >= 800) return 'Black';
  if (weight >= 700) return 'Bold';
  if (weight >= 600) return 'Semi Bold';
  if (weight >= 500) return 'Medium';
  if (weight >= 400) return 'Regular';
  if (weight >= 300) return 'Light';
  return 'Regular';
}

function ensureCornerRadius(
  node: FrameNode | RectangleNode,
  variables: BrandVariableMap,
  fallbackRadius?: number
) {
  const radiusVariable =
    variables.numberVariables['radii/md'] ??
    variables.numberVariables['radii/default'] ??
    variables.numberVariables['radii/sm'];
  if (radiusVariable) {
    setVariable(node, 'cornerRadius', radiusVariable.id);
  } else if (fallbackRadius) {
    node.cornerRadius = fallbackRadius;
  } else {
    node.cornerRadius = 8;
  }
}

function setVariable(
  node: SceneNode & { boundVariables?: VariableBindable },
  property: keyof VariableBindable,
  variableId: string
) {
  if (!('boundVariables' in node)) {
    return;
  }
  const bound = node.boundVariables ?? {};
  bound[property] = { type: 'VARIABLE_ALIAS', id: variableId };
  node.boundVariables = bound;
}

type VariableBindable = ComponentNode['boundVariables'];

