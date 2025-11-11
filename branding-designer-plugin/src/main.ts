import { learnBranding, generateTemplates } from './generator';
import { BrandingProfile, GenerationOptions, TemplatePatternId } from './types';

const DEFAULT_PATTERNS: TemplatePatternId[] = ['hero', 'social', 'announcement'];

figma.showUI(__html__, { width: 420, height: 640 });

let currentProfile: BrandingProfile | null = null;

const handleLearnBranding = () => {
  try {
    const selection = figma.currentPage.selection.filter(
      (node) =>
        node.type === 'FRAME' ||
        node.type === 'COMPONENT' ||
        node.type === 'INSTANCE' ||
        node.type === 'GROUP'
    );

    if (!selection.length) {
      throw new Error('Please select at least one frame, component, or group to learn from.');
    }

    currentProfile = learnBranding(selection);
    figma.ui.postMessage({
      type: 'branding-profile',
      data: currentProfile
    });
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
    figma.notify('Learn the brand first to generate templates.');
    figma.ui.postMessage({
      type: 'branding-error',
      data: 'Learn the brand first to generate templates.'
    });
    return;
  }

  const patterns = options.patterns.length ? options.patterns : DEFAULT_PATTERNS;
  const count = Math.max(1, Math.min(8, options.count || 3));

  figma.ui.postMessage({ type: 'generation-start' });
  try {
    await generateTemplates(currentProfile, { count, patterns });
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
