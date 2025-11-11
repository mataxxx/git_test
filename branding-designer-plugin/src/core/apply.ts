import { BrandJSON, BrandVariableMap } from '../types/brand';
import { ensureContrast } from './contrast';

type ApplyOptions = {
  includeTypography: boolean;
  includeSpacing: boolean;
};

export async function applyBrandToSelection(
  selection: readonly SceneNode[],
  brand: BrandJSON,
  variables: BrandVariableMap,
  options: ApplyOptions
) {
  if (!selection.length) {
    throw new Error('Select at least one layer to apply the brand.');
  }

  selection.forEach((node) => {
    applyNode(node, brand, variables, options);
  });
}

function applyNode(
  node: SceneNode,
  brand: BrandJSON,
  variables: BrandVariableMap,
  options: ApplyOptions
) {
  if ('fills' in node && Array.isArray(node.fills)) {
    setVariable(node, 'fills', variables.colorVariables.surface.id);
  }
  if ('strokes' in node && Array.isArray(node.strokes)) {
    setVariable(node, 'strokes', variables.colorVariables.primary.id);
  }
  if (options.includeSpacing && 'paddingLeft' in node) {
    setVariable(node, 'paddingLeft', variables.numberVariables['spacing/base'].id);
    setVariable(node, 'paddingRight', variables.numberVariables['spacing/base'].id);
  }
  if (options.includeSpacing && 'itemSpacing' in node) {
    setVariable(node, 'itemSpacing', variables.numberVariables['spacing/scale/1']?.id ?? variables.numberVariables['spacing/base'].id);
  }

  if (options.includeTypography && node.type === 'TEXT') {
    const ratio = ensureContrast(brand, 'onSurface', 'surface', node.fontSize >= 24);
    setVariable(node, 'fills', variables.colorVariables[ratio.fgToken]?.id ?? variables.colorVariables.onSurface.id);
    const mediumWeight =
      brand.typography.weights.medium ??
      brand.typography.weights.regular ??
      Object.values(brand.typography.weights)[0] ??
      400;
    node.fontName = { family: brand.typography.fontFamily, style: weightToStyle(mediumWeight) };
  }

  if ('children' in node) {
    node.children.forEach((child) => applyNode(child, brand, variables, options));
  }
}

function weightToStyle(fontSize: number) {
  if (fontSize >= 32) return 'Semi Bold';
  if (fontSize >= 24) return 'Medium';
  return 'Regular';
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

