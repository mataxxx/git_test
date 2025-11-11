import { learnBranding, generateTemplates } from './generator';
import { mergeBrandingProfiles } from './analysis';
import { BrandingKnowledge, BrandingProfile, GenerationOptions, TemplatePatternId } from './types';

const DEFAULT_PATTERNS: TemplatePatternId[] = ['hero', 'social', 'announcement'];
const KNOWLEDGE_STORAGE_KEY = 'brand-style-designer:knowledge';
const TEMPLATE_DATA_KEY = 'brand-style-designer:template';

figma.showUI(__html__, { width: 420, height: 640 });

const loadKnowledge = (): BrandingKnowledge | null => {
  try {
    const raw = figma.root.getPluginData(KNOWLEDGE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as BrandingKnowledge;
    return {
      ...parsed,
      profile: mergeBrandingProfiles(null, parsed.profile)
    };
  } catch {
    return null;
  }
};

const saveKnowledge = (data: BrandingKnowledge) => {
  figma.root.setPluginData(KNOWLEDGE_STORAGE_KEY, JSON.stringify(data));
};

const readTemplateMetadata = (node: SceneNode) => {
  try {
    const raw = node.getPluginData(TEMPLATE_DATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeTemplateMetadata = (node: SceneNode, payload: Record<string, unknown>) => {
  node.setPluginData(TEMPLATE_DATA_KEY, JSON.stringify(payload));
};

let knowledge: BrandingKnowledge | null = loadKnowledge();
let currentProfile: BrandingProfile | null = knowledge?.profile ?? null;

const broadcastProfile = (
  profile: BrandingProfile,
  source: 'memory' | 'learn' | 'approval'
) => {
  figma.ui.postMessage({
    type: 'branding-profile',
    data: profile,
    meta: {
      learnCount: knowledge?.learnCount ?? 0,
      approvedCount: knowledge?.approvedTemplateIds.length ?? 0
    },
    source
  });
};

const registerProfile = (
  profile: BrandingProfile,
  approvedNodeIds: string[],
  source: 'learn' | 'approval'
) => {
  const mergedProfile = knowledge ? mergeBrandingProfiles(knowledge.profile, profile) : profile;
  const approvedSet = new Set<string>(knowledge?.approvedTemplateIds ?? []);
  approvedNodeIds.forEach((id) => approvedSet.add(id));

  const updatedKnowledge: BrandingKnowledge = {
    profile: mergedProfile,
    learnCount: (knowledge?.learnCount ?? 0) + 1,
    approvedTemplateIds: Array.from(approvedSet),
    updatedAt: new Date().toISOString()
  };

  knowledge = updatedKnowledge;
  currentProfile = mergedProfile;
  saveKnowledge(updatedKnowledge);
  broadcastProfile(mergedProfile, source);
};

if (currentProfile) {
  broadcastProfile(currentProfile, 'memory');
}

const handleLearnBranding = () => {
  try {
    const selection = figma.currentPage.selection.filter(
      (node): node is SceneNode =>
        node.type === 'FRAME' ||
        node.type === 'COMPONENT' ||
        node.type === 'INSTANCE' ||
        node.type === 'GROUP'
    );

    if (!selection.length) {
      throw new Error('Please select at least one frame, component, or group to learn from.');
    }

    const learnedProfile = learnBranding(selection);
    registerProfile(learnedProfile, [], 'learn');
    figma.notify('Brand style learned ✨');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to learn from the current selection.';
    figma.ui.postMessage({
      type: 'branding-error',
      data: message
    });
    figma.notify(message, { timeout: 4000 });
  }
};

const handleGenerateTemplates = async (options: GenerationOptions) => {
  if (!currentProfile) {
    const message = 'Learn the brand first to generate templates.';
    figma.notify(message);
    figma.ui.postMessage({
      type: 'branding-error',
      data: message
    });
    return;
  }

  const patterns = options.patterns.length ? options.patterns : DEFAULT_PATTERNS;
  const count = Math.max(1, Math.min(8, options.count || 3));

  figma.ui.postMessage({ type: 'generation-start' });
  try {
    const frames = await generateTemplates(currentProfile, { count, patterns });
    const timestamp = new Date().toISOString();
    frames.forEach((frame) => {
      writeTemplateMetadata(frame, {
        generatedAt: timestamp,
        approvalStatus: 'pending',
        iteration: knowledge?.learnCount ?? 0
      });
    });
    figma.ui.postMessage({ type: 'generation-complete' });
    figma.notify(`Generated ${count} branded template${count > 1 ? 's' : ''}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate templates.';
    figma.ui.postMessage({
      type: 'generation-error',
      data: message
    });
    figma.notify(message, { timeout: 4000 });
  }
};

const handleApproveSelection = () => {
  try {
    const selection = figma.currentPage.selection.filter(
      (node): node is SceneNode =>
        node.type === 'FRAME' ||
        node.type === 'COMPONENT' ||
        node.type === 'INSTANCE' ||
        node.type === 'GROUP'
    );

    if (!selection.length) {
      throw new Error('Select the branded templates you want to approve.');
    }

    const approvedProfile = learnBranding(selection);
    registerProfile(
      approvedProfile,
      selection.map((node) => node.id),
      'approval'
    );

    const timestamp = new Date().toISOString();
    selection.forEach((node) => {
      if ('setPluginData' in node) {
        const existing = readTemplateMetadata(node);
        writeTemplateMetadata(node, {
          ...existing,
          approvalStatus: 'approved',
          approvedAt: timestamp
        });
      }
    });

    figma.ui.postMessage({ type: 'approval-complete' });
    figma.notify('Selection approved. Future templates will follow this direction.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to approve the current selection.';
    figma.ui.postMessage({
      type: 'approval-error',
      data: message
    });
    figma.notify(message, { timeout: 4000 });
  }
};

figma.on('selectionchange', () => {
  figma.ui.postMessage({
    type: 'selection-change',
    data: figma.currentPage.selection.length
  });
});

figma.ui.onmessage = async (message) => {
  switch (message.type) {
    case 'learn-branding':
      handleLearnBranding();
      break;
    case 'generate-templates':
      await handleGenerateTemplates(message.data as GenerationOptions);
      break;
    case 'approve-selection':
      handleApproveSelection();
      break;
    case 'focus-patterns':
      if (message.data && Array.isArray(message.data)) {
        const nodes = message.data
          .map((id: string) => figma.getNodeById(id))
          .filter((node): node is SceneNode => !!node);
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
