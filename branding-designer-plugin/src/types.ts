export type RGBA = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

export type FontDescriptor = {
  family: string;
  style: string;
  weightClass?: number;
};

export type ColorSwatch = {
  hex: string;
  paint: SolidPaint;
  role: 'primary' | 'secondary' | 'accent' | 'neutral';
  score: number;
};

export type BrandingProfile = {
  colors: ColorSwatch[];
  typography: {
    primary: FontDescriptor | null;
    secondary: FontDescriptor | null;
    all: FontDescriptor[];
  };
  cornerRadius: number;
  strokeWeight: number;
  shadows: DropShadowEffect[];
  surface: {
    background: SolidPaint;
    elevated: SolidPaint;
  };
  narrative: {
    personality: string;
    toneDescriptions: string[];
  };
  insights: {
    highlights: string[];
    improvementIdeas: string[];
  };
  metadata: {
    sampleCount: number;
    nodeIds: string[];
  };
};

export type TemplatePatternId = 'hero' | 'social' | 'announcement' | 'email';

export type GenerationOptions = {
  count: number;
  patterns: TemplatePatternId[];
};
