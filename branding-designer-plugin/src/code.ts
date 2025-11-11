import { parseBrandJSON, ensureBrandResources } from './core/brand';
import { createLayout } from './core/layouts';
import { applyBrandToSelection } from './core/apply';
import { recordFeedback, incrementApprovals, loadSnapshot } from './core/learn';
import { buildRationale } from './core/explain';
import { buildChatPlan, applyChatPlan, revertLastChat, ChatPlan } from './core/chat';
import { DESIGN_CANON } from './core/canon';
import type {
  BrandJSON,
  BrandState,
  BrandVariableMap,
  Mode,
  MODE_PROFILE,
  DesignRationale,
  LearningSnapshot
} from './types/brand';
import { PluginToUIMessage, UIToPluginMessage } from './types/messages';

const BRAND_KEY = 'brandpilot:brand';

let brand: BrandJSON | null = null;
let variables: BrandVariableMap | null = null;
let mode: Mode = 'pro';
let rationaleLog: DesignRationale[] = [];
let knowledge: LearningSnapshot;

figma.showUI(__html__, { width: 520, height: 640 });

figma.ui.onmessage = async (rawMessage: UIToPluginMessage) => {
  switch (rawMessage.type) {
    case 'ready':
      await boot();
      break;
    case 'set-mode':
      mode = rawMessage.mode;
      emitState();
      break;
    case 'import-brand':
      await handleImport(rawMessage.payload);
      break;
    case 'generate-layout':
      await handleGenerate(rawMessage.pattern, rawMessage.variants);
      break;
    case 'apply-brand':
      await handleApply(rawMessage.scope, rawMessage.options ?? { includeTypography: true, includeSpacing: true });
      break;
    case 'record-feedback':
      knowledge = await recordFeedback(rawMessage.key, rawMessage.positive);
      emitOperationComplete('feedback', ['Feedback stored.']);
      emitState('learn');
      break;
    case 'approve-selection':
      await handleApproval();
      break;
    case 'chat-preview':
      await handleChatPreview(rawMessage.nodeIds, rawMessage.request);
      break;
    case 'chat-apply':
      await handleChatApply(rawMessage.nodeIds, rawMessage.request);
      break;
    case 'chat-revert-last':
      handleChatRevert();
      break;
    case 'request-tutorial-assets':
      emitTutorialAssets();
      break;
    default:
      break;
  }
};

figma.on('selectionchange', () => {
  const count = figma.currentPage.selection.length;
  postToUI({ type: 'selection-change', count });
});

async function boot() {
  knowledge = await loadSnapshot();
  const cached = figma.root.getPluginData(BRAND_KEY);
  if (cached) {
    try {
      brand = parseBrandJSON(cached);
      variables = await ensureBrandResources(brand);
    } catch (error) {
      figma.notify(`Unable to restore brand: ${(error as Error).message}`);
      brand = null;
      variables = null;
    }
  }
  emitState();
}

async function handleImport(payload: string) {
  try {
    const parsed = parseBrandJSON(payload);
    const resourceMap = await ensureBrandResources(parsed);
    brand = parsed;
    variables = resourceMap;
    figma.root.setPluginData(BRAND_KEY, JSON.stringify(parsed));
    rationaleLog.unshift({
      action: 'Brand imported',
      bullets: [
        `Loaded brand “${parsed.name}”`,
        `Mapped ${Object.keys(parsed.colors).length} color tokens`,
        `Ensured font family ${parsed.typography.fontFamily}`
      ]
    });
    emitOperationComplete('import-brand', rationaleLog[0].bullets);
    emitState('learn');
  } catch (error) {
    emitOperationError('import-brand', error);
  }
}

async function handleGenerate(pattern: 'hero' | 'card' | 'social', variants: number) {
  if (!brand || !variables) {
    emitOperationError('generate-layout', new Error('Import a brand before generating layouts.'));
    return;
  }
  const created: SceneNode[] = [];
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
      size: parseFloat(brand.typography.scale[4] ?? '24'),
      lineHeight: MODE_PROFILE[mode].typeRatio * 100,
      weight: Object.values(brand.typography.weights)[0] ?? 400
    },
    spacing: { base: brand.spacing.base },
    contrast: { ratio: 4.5, required: DESIGN_CANON.contrast.aa_normal },
    changes: [
      { what: 'mode', to: mode },
      { what: 'variants', to: variants }
    ]
  });
  rationaleLog.unshift({ action: `Generated ${pattern}`, bullets: rationale });
  emitOperationComplete('generate-layout', rationale);
}

async function handleApply(scope: 'selection' | 'page', options: { includeTypography: boolean; includeSpacing: boolean }) {
  if (!brand || !variables) {
    emitOperationError('apply-brand', new Error('Import a brand before applying.'));
    return;
  }
  const target =
    scope === 'selection' && figma.currentPage.selection.length
      ? figma.currentPage.selection
      : figma.currentPage.children;
  try {
    await applyBrandToSelection(target, brand, variables, options);
    const rationale = buildRationale({
      component: 'apply',
      colors: {
        fg: brand.colors.onSurface,
        bg: brand.colors.surface,
        brandTokens: Object.fromEntries(
          Object.entries(variables.colorVariables).map(([token, variable]) => [token, variable.name])
        )
      },
      type: {
        family: brand.typography.fontFamily,
        size: parseFloat(brand.typography.scale[2] ?? '16'),
        lineHeight: MODE_PROFILE[mode].typeRatio * 100,
        weight: Object.values(brand.typography.weights)[0] ?? 400
      },
      spacing: { base: brand.spacing.base },
      contrast: { ratio: 4.5, required: DESIGN_CANON.contrast.aa_normal },
      changes: [{ what: 'scope', to: scope }]
    });
    rationaleLog.unshift({ action: 'Applied brand', bullets: rationale });
    emitOperationComplete('apply-brand', rationale);
  } catch (error) {
    emitOperationError('apply-brand', error);
  }
}

async function handleApproval() {
  if (!brand || !variables) {
    emitOperationError('approve-selection', new Error('Import a brand before approving layouts.'));
    return;
  }
  const selection = figma.currentPage.selection;
  if (!selection.length) {
    emitOperationError('approve-selection', new Error('Select generated frames to approve.'));
    return;
  }
  await applyBrandToSelection(selection, brand, variables, {
    includeTypography: true,
    includeSpacing: true
  });
  knowledge = await incrementApprovals();
  emitOperationComplete('approve-selection', [
    `Captured ${selection.length} approved node${selection.length > 1 ? 's' : ''}.`,
    `Total approved selections: ${knowledge.selectionsApproved}`
  ]);
  emitState('approval');
}

async function handleChatPreview(nodeIds: string[], request: string) {
  if (!brand || !variables) {
    emitOperationError('chat-preview', new Error('Import a brand before using chat.'));
    return;
  }
  const nodes = figma.currentPage.selection.filter(
    (node): node is SceneNode => 'visible' in node
  );
  if (!nodes.length) {
    emitOperationError('chat-preview', new Error('Select nodes to chat with.'));
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
    component: 'chat',
    colors: {
      fg: brand.colors.onSurface,
      bg: brand.colors.surface,
      brandTokens: plan.rationaleTokens
    },
    type: {
      family: brand.typography.fontFamily,
      size: parseFloat(brand.typography.scale[2] ?? '16'),
      lineHeight: MODE_PROFILE[mode].typeRatio * 100,
      weight: Object.values(brand.typography.weights)[0] ?? 400
    },
    spacing: { base: brand.spacing.base },
    contrast: { ratio: 4.5, required: DESIGN_CANON.contrast.aa_normal },
    changes: diff.map((item) => ({ what: item.property, from: item.from, to: item.to }))
  });
  (plan as any).diff = diff; // store for apply
  pendingPlan = plan;
  const selectionIds = nodes.map((node) => node.id);
  postToUI({
    type: 'chat-preview',
    nodeIds: selectionIds,
    diff: { changes: diff },
    rationale
  });
}

let pendingPlan: ChatPlan | null = null;

async function handleChatApply(nodeIds: string[], request: string) {
  if (!brand || !variables) {
    emitOperationError('chat-apply', new Error('Import a brand before using chat.'));
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
  rationaleLog.unshift({ action: 'Chat apply', bullets: rationale });
  const nodes = figma.currentPage.selection.map((node) => node.id);
  postToUI({
    type: 'chat-applied',
    nodeIds: nodes,
    rationale
  });
  pendingPlan = null;
}

function handleChatRevert() {
  const selection = figma.currentPage.selection.filter(
    (node): node is SceneNode => 'visible' in node
  );
  const reverted = revertLastChat(selection);
  emitOperationComplete('chat-revert-last', [`Reverted ${reverted} node${reverted === 1 ? '' : 's'}.`]);
}

function emitState(source: 'memory' | 'learn' | 'approval' = 'memory') {
  const state: BrandState = {
    brand,
    variables: null,
    mode,
    rationaleLog,
    knowledge
  };
  postToUI({
    type: 'init',
    data: state
  });
  if (brand) {
    postToUI({
      type: 'branding-profile',
      data: brand,
      meta: {
        learnCount: Object.keys(knowledge.feedback).length,
        approvedCount: knowledge.selectionsApproved
      },
      source
    });
  }
}

function emitOperationComplete(action: string, rationale: string[]) {
  postToUI({
    type: 'operation-complete',
    action,
    rationale
  });
}

function emitOperationError(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  postToUI({
    type: 'operation-error',
    action,
    message
  });
  figma.notify(message, { timeout: 4000 });
}

function emitTutorialAssets() {
  postToUI({
    type: 'tutorial-assets',
    sample: SAMPLE_BRAND
  });
}

function postToUI(message: PluginToUIMessage) {
  figma.ui.postMessage(message);
}

const SAMPLE_BRAND: BrandJSON = {
  name: 'Acme Tools',
  colors: {
    primary: '#0055FF',
    onPrimary: '#FFFFFF',
    secondary: '#FFAA00',
    surface: '#FFFFFF',
    onSurface: '#111111'
  },
  typography: {
    fontFamily: 'Inter',
    scale: ['12', '14', '16', '20', '24', '32', '40'],
    weights: { regular: 400, medium: 500, bold: 700 }
  },
  spacing: { base: 8, scale: [4, 8, 12, 16, 24, 32] },
  radii: { sm: 4, md: 8, lg: 12 },
  logos: { primary: 'https://example.com/logo.svg' }
};

