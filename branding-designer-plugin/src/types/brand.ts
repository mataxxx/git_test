export type Mode = 'conservative' | 'pro' | 'creative';

export const MODE_PROFILE: Record<
  Mode,
  {
    fontFamiliesMax: number;
    weightsMax: number;
    typeRatio: number;
    exploration: number;
    allowDisplay: boolean;
  }
> = {
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
} as const;

export type BrandJSON = {
  name: string;
  colors: {
    primary: string;
    onPrimary: string;
    secondary: string;
    surface: string;
    onSurface: string;
    [token: string]: string;
  };
  typography: {
    fontFamily: string;
    secondaryFamily?: string;
    scale: string[];
    weights: Record<string, number>;
  };
  spacing: {
    base: number;
    scale: number[];
  };
  radii: Record<string, number>;
  logos?: Record<string, string>;
  modes?: Partial<Record<Mode, Partial<ModeProfile>>>;
};

export type ModeProfile = (typeof MODE_PROFILE)[Mode];

export type Canon = {
  contrast: {
    aa_normal: number;
    aa_large: number;
  };
  typography: {
    min_body_px: number;
    ratios: Record<Mode, number>;
  };
  spacing: {
    base: number;
  };
  grid: {
    columns: number;
    gutter: number;
  };
  color_roles: {
    use_tokens: boolean;
    fallback_to_styles: boolean;
  };
};

export type BrandVariableMap = {
  collectionId: string;
  modes: string[];
  colorVariables: Record<string, Variable>;
  numberVariables: Record<string, Variable>;
  typographyStyles: Record<string, TextStyle>;
};

export type BrandState = {
  brand: BrandJSON | null;
  variables: BrandVariableMap | null;
  mode: Mode;
  rationaleLog: Array<DesignRationale>;
  knowledge: LearningSnapshot;
};

export type LearningSnapshot = {
  updatedAt: string;
  selectionsApproved: number;
  feedback: Record<string, PreferenceStat>;
};

export type PreferenceStat = {
  positive: number;
  negative: number;
};

export type DesignRationale = {
  action: string;
  bullets: string[];
};

export type RationaleInput = {
  component: 'hero' | 'card' | 'social' | 'apply' | 'chat';
  colors: {
    fg: string;
    bg: string;
    brandTokens: Record<string, string>;
  };
  type: {
    family: string;
    size: number;
    lineHeight: number;
    weight: number;
  };
  spacing: {
    base: number;
    grid?: number;
  };
  contrast: {
    ratio: number;
    required: number;
  };
  changes: Array<{ what: string; from?: unknown; to?: unknown }>;
};

