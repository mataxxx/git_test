import { BrandJSON, BrandVariableMap, Mode } from '../types/brand';
import { ensureContrast } from './contrast';

const SNAPSHOT_KEY = 'brandpilot:lastChat';

export type ChatChange = {
  nodeId: string;
  nodeName: string;
  property: string;
  from: unknown;
  to: unknown;
  apply: () => void;
};

export type ChatPlan = {
  changes: ChatChange[];
  rationaleTokens: Record<string, string>;
};

export function buildChatPlan(
  nodes: SceneNode[],
  request: string,
  brand: BrandJSON,
  variables: BrandVariableMap,
  mode: Mode
): ChatPlan {
  const lower = request.toLowerCase();
  const changes: ChatChange[] = [];
  const rationaleTokens: Record<string, string> = {};

  const wantsSecondary = lower.includes('secondary color') || lower.includes('accent');
  const wantsPrimary = lower.includes('primary color');
  const tightenLine = lower.includes('tighten line') || lower.includes('reduce line');
  const loosenLine = lower.includes('loosen line') || lower.includes('increase line');
  const increasePadding = lower.includes('more padding') || lower.includes('increase padding') || lower.includes('room');
  const decreasePadding = lower.includes('less padding') || lower.includes('tighten padding');

  nodes.forEach((node) => {
    if ('fills' in node && (wantsSecondary || wantsPrimary)) {
      const targetVariable = wantsSecondary
        ? variables.colorVariables.secondary
        : variables.colorVariables.primary;
      if (targetVariable) {
        const original = captureFill(node);
        changes.push({
          nodeId: node.id,
          nodeName: node.name,
          property: 'fills',
          from: original,
          to: targetVariable.id,
          apply: () => setVariable(node, 'fills', targetVariable.id)
        });
        rationaleTokens.fill = targetVariable.name;
      }
    }

    if (node.type === 'TEXT') {
      if (tightenLine || loosenLine) {
        const current = node.lineHeight;
        const currentPercent =
          current && typeof current === 'object' && current.unit === 'PERCENT' ? current.value : 120;
        const delta = tightenLine ? -10 : 10;
        const target = Math.max(110, Math.min(160, currentPercent + delta));
        changes.push({
          nodeId: node.id,
          nodeName: node.name,
          property: 'lineHeight',
          from: currentPercent,
          to: target,
          apply: () => {
            node.lineHeight = { unit: 'PERCENT', value: target };
            const contrast = ensureContrast(brand, 'onSurface', 'surface', node.fontSize >= 24);
            const token = contrast.adjusted ? contrast.fgToken : 'onSurface';
            const variable = variables.colorVariables[token];
            if (variable) {
              setVariable(node, 'fills', variable.id);
            }
            rationaleTokens.lineHeight = `${target}%`;
          }
        });
      }
    }

    if ('paddingLeft' in node && (increasePadding || decreasePadding)) {
      const paddingVariable =
        variables.numberVariables[
          increasePadding ? 'spacing/scale/3' : 'spacing/scale/1'
        ] ?? variables.numberVariables['spacing/base'];

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
          property: 'padding',
          from: current,
          to: paddingVariable.name,
          apply: () => {
            setVariable(node, 'paddingLeft', paddingVariable.id);
            setVariable(node, 'paddingRight', paddingVariable.id);
            setVariable(node, 'paddingTop', paddingVariable.id);
            setVariable(node, 'paddingBottom', paddingVariable.id);
            rationaleTokens.padding = paddingVariable.name;
          }
        });
      }
    }
  });

  return { changes, rationaleTokens };
}

export function applyChatPlan(plan: ChatPlan) {
  const diffs: Array<{ nodeId: string; nodeName: string; property: string; from: unknown; to: unknown }> = [];

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

export function revertLastChat(nodes: SceneNode[]): number {
  let reverted = 0;
  nodes.forEach((node) => {
    const snapshot = getSnapshot(node);
    if (!snapshot) return;
    Object.entries(snapshot).forEach(([property, value]) => {
      restoreProperty(node, property, value);
    });
    node.setPluginData(SNAPSHOT_KEY, '');
    reverted += 1;
  });
  return reverted;
}

function captureFill(node: SceneNode & BlendMixin) {
  return node.boundVariables?.fills?.id ?? null;
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

function getSnapshot(node: SceneNode): Record<string, unknown> {
  const raw = node.getPluginData(SNAPSHOT_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function setSnapshot(node: SceneNode, snapshot: Record<string, unknown>) {
  node.setPluginData(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function restoreProperty(node: SceneNode, property: string, value: unknown) {
  switch (property) {
    case 'fills':
    case 'strokes':
      if (value && typeof value === 'string') {
        setVariable(node as any, property as keyof VariableBindable, value);
      }
      break;
    case 'lineHeight':
      if (node.type === 'TEXT' && typeof value === 'number') {
        node.lineHeight = { unit: 'PERCENT', value: value };
      }
      break;
    case 'padding':
      if ('paddingLeft' in node && value && typeof value === 'object') {
        const padding = value as { left: number; right: number; top: number; bottom: number };
        node.paddingLeft = padding.left;
        node.paddingRight = padding.right;
        node.paddingTop = padding.top;
        node.paddingBottom = padding.bottom;
      }
      break;
  }
}

function isSceneNode(node: BaseNode): node is SceneNode {
  return 'visible' in node;
}

type VariableBindable = ComponentNode['boundVariables'];

