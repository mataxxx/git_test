import type { BrandJSON, BrandState, Mode } from './brand';

export type PluginToUIMessage =
  | {
      type: 'init';
      data: BrandState;
    }
  | {
      type: 'branding-profile';
      data: BrandState['brand'];
      meta: {
        learnCount: number;
        approvedCount: number;
      };
      source: 'memory' | 'learn' | 'approval';
      rationale?: string[];
    }
  | {
      type: 'operation-complete';
      action: string;
      rationale: string[];
    }
  | {
      type: 'operation-error';
      action: string;
      message: string;
    }
  | {
      type: 'chat-preview';
      nodeIds: string[];
      diff: ChatDiffSummary;
      rationale: string[];
    }
  | {
      type: 'chat-applied';
      nodeIds: string[];
      rationale: string[];
    }
  | {
      type: 'tutorial-assets';
      sample: BrandJSON;
    }
  | {
      type: 'selection-change';
      count: number;
    };

export type UIToPluginMessage =
  | {
      type: 'ready';
    }
  | {
      type: 'set-mode';
      mode: Mode;
    }
  | {
      type: 'import-brand';
      payload: string;
    }
  | {
      type: 'generate-layout';
      pattern: 'hero' | 'card' | 'social';
      mode: Mode;
      variants: number;
    }
  | {
      type: 'apply-brand';
      scope: 'selection' | 'page';
      options?: {
        includeTypography?: boolean;
        includeSpacing?: boolean;
      };
    }
  | {
      type: 'record-feedback';
      key: string;
      positive: boolean;
    }
  | {
      type: 'approve-selection';
    }
  | {
      type: 'chat-preview';
      nodeIds: string[];
      request: string;
    }
  | {
      type: 'chat-apply';
      nodeIds: string[];
      request: string;
    }
  | {
      type: 'chat-revert-last';
    }
  | {
      type: 'request-tutorial-assets';
    };

export type ChatDiffSummary = {
  changes: Array<{
    nodeId: string;
    nodeName: string;
    properties: Array<{ property: string; from: unknown; to: unknown }>;
  }>;
};

