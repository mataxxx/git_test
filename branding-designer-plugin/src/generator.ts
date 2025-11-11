import { analyzeSelection } from './analysis';
import {
  BrandingProfile,
  GenerationOptions,
  TemplatePatternId,
  ColorSwatch,
  FontDescriptor
} from './types';

type TemplateContext = {
  profile: BrandingProfile;
  frame: FrameNode;
};

type TemplateFactory = (context: TemplateContext) => void | Promise<void>;

const TEMPLATE_DIMENSIONS: Record<TemplatePatternId, { width: number; height: number }> = {
  hero: { width: 1440, height: 1024 },
  social: { width: 1080, height: 1350 },
  announcement: { width: 1280, height: 720 },
  email: { width: 800, height: 1200 }
};

const toFigmaPaint = (swatch: ColorSwatch): SolidPaint => ({
  ...swatch.paint,
  opacity: swatch.paint.opacity ?? 1
});

const ensureFonts = async (profile: BrandingProfile) => {
  const fallbackFonts: FontDescriptor[] = [
    { family: 'Inter', style: 'Regular' },
    { family: 'Inter', style: 'Medium' },
    { family: 'Inter', style: 'Semi Bold' },
    { family: 'Inter', style: 'Bold' }
  ];

  const fontMap = new Map<string, FontDescriptor>();
  const register = (font: FontDescriptor | null | undefined) => {
    if (!font) return;
    const key = `${font.family}::${font.style}`;
    if (!fontMap.has(key)) {
      fontMap.set(key, font);
    }
  };

  register(profile.typography.primary);
  register(profile.typography.secondary);
  fallbackFonts.forEach(register);

  await Promise.all(
    Array.from(fontMap.values()).map(async (font) => {
      try {
        await figma.loadFontAsync({ family: font.family, style: font.style });
      } catch {
        // Ignore fonts we cannot load; Figma will use default fallback.
      }
    })
  );
};

const createText = (context: TemplateContext, text: string, options: Partial<TextNode>) => {
  const node = figma.createText();
  const font =
    options.fontName && options.fontName !== figma.mixed ? (options.fontName as FontName) : context.profile.typography.primary;
  if (font) {
    node.fontName = font;
  }
  node.characters = text;
  if (typeof options.fontSize === 'number') {
    node.fontSize = options.fontSize;
  }
  if (typeof options.lineHeight === 'object' || typeof options.lineHeight === 'number') {
    node.lineHeight = options.lineHeight;
  }
  if (typeof options.letterSpacing === 'object' || typeof options.letterSpacing === 'number') {
    node.letterSpacing = options.letterSpacing;
  }
  if (options.textAutoResize) {
    node.textAutoResize = options.textAutoResize;
  } else {
    node.textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  if (options.fills && Array.isArray(options.fills)) {
    node.fills = options.fills;
  } else {
    node.fills = [
      toFigmaPaint(
        context.profile.colors.find((color) => color.role === 'primary') ?? context.profile.colors[0]
      )
    ];
  }
  if (options.textAlignHorizontal) {
    node.textAlignHorizontal = options.textAlignHorizontal;
  }
  if (options.textAlignVertical) {
    node.textAlignVertical = options.textAlignVertical;
  }
  if (options.opacity !== undefined) {
    node.opacity = options.opacity;
  }
  if (options.paragraphSpacing !== undefined) {
    node.paragraphSpacing = options.paragraphSpacing;
  }
  return node;
};

const createButton = (context: TemplateContext, label: string) => {
  const buttonFrame = figma.createFrame();
  buttonFrame.name = 'CTA Button';
  buttonFrame.layoutMode = 'HORIZONTAL';
  buttonFrame.counterAxisAlignItems = 'CENTER';
  buttonFrame.primaryAxisAlignItems = 'CENTER';
  buttonFrame.primaryAxisSizingMode = 'AUTO';
  buttonFrame.counterAxisSizingMode = 'AUTO';
  buttonFrame.paddingLeft = 28;
  buttonFrame.paddingRight = 28;
  buttonFrame.paddingTop = 12;
  buttonFrame.paddingBottom = 12;
  buttonFrame.itemSpacing = 12;
  buttonFrame.cornerRadius = context.profile.cornerRadius;
  buttonFrame.fills = [
    toFigmaPaint(
      context.profile.colors.find((color) => color.role === 'accent') ??
        context.profile.colors[1] ??
        context.profile.colors[0]
    )
  ];

  const text = createText(context, label, {
    fontSize: 18,
    fontName: context.profile.typography.secondary ?? context.profile.typography.primary ?? {
      family: 'Inter',
      style: 'Medium'
    },
    textAutoResize: 'WIDTH_AND_HEIGHT',
    fills: [
      {
        type: 'SOLID',
        color: { r: 1, g: 1, b: 1 }
      }
    ]
  });
  buttonFrame.appendChild(text);
  return buttonFrame;
};

const applySurface = (frame: FrameNode, paint: SolidPaint) => {
  frame.fills = [{ ...paint }];
};

const createImagePlaceholder = (
  context: TemplateContext,
  options: { width: number; height: number; cornerRadius?: number; useAccent?: boolean }
) => {
  const rect = figma.createRectangle();
  rect.resizeWithoutConstraints(options.width, options.height);
  rect.cornerRadius = options.cornerRadius ?? context.profile.cornerRadius;
  const accent = context.profile.colors.find((color) => color.role === 'secondary') ?? context.profile.colors[0];
  const overlay = context.profile.colors.find((color) => color.role === 'accent') ?? accent;
  rect.fills = [
    toFigmaPaint(options.useAccent ? overlay : accent),
    {
      type: 'GRADIENT_LINEAR',
      gradientTransform: [
        [0.96, 0.28, 0],
        [-0.28, 0.96, 0.18]
      ],
      gradientStops: [
        { position: 0, color: { r: 1, g: 1, b: 1, a: 0.1 } },
        { position: 1, color: { r: 0, g: 0, b: 0, a: 0.18 } }
      ]
    }
  ];
  rect.strokeWeight = context.profile.strokeWeight;
  rect.strokes = [
    {
      type: 'SOLID',
      color: {
        r: 1,
        g: 1,
        b: 1
      },
      opacity: 0.08
    }
  ];
  return rect;
};

const templateFactories: Record<TemplatePatternId, TemplateFactory> = {
  hero: async ({ frame, profile }) => {
    frame.name = 'Branded Hero';
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisAlignItems = 'CENTER';
    frame.counterAxisAlignItems = 'CENTER';
    frame.primaryAxisSizingMode = 'FIXED';
    frame.counterAxisSizingMode = 'FIXED';
    frame.itemSpacing = 24;
    frame.paddingTop = 96;
    frame.paddingBottom = 96;
    frame.paddingLeft = 96;
    frame.paddingRight = 96;
    frame.clipsContent = false;

    applySurface(frame, profile.surface.background);

    const badge = createText(
      { frame, profile },
      '✨ Signature Collection',
      {
        fontSize: 16,
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? { family: 'Inter', style: 'Semi Bold' },
        fills: [
          toFigmaPaint(
            profile.colors.find((color) => color.role === 'accent') ?? profile.colors[0]
          )
        ],
        opacity: 0.75,
        letterSpacing: { unit: 'PERCENT', value: 8 }
      }
    );

    const heading = createText(
      { frame, profile },
      'Designs that feel unmistakably you.',
      {
        fontSize: 64,
        lineHeight: { unit: 'PERCENT', value: 110 },
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Bold'
          },
        textAlignHorizontal: 'CENTER'
      }
    );

    const body = createText(
      { frame, profile },
      'High fidelity campaign templates handcrafted to embody your voice across every touchpoint.',
      {
        fontSize: 20,
        lineHeight: { unit: 'PERCENT', value: 150 },
        opacity: 0.78,
        textAlignHorizontal: 'CENTER',
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Regular'
          }
      }
    );

    const buttonRow = figma.createFrame();
    buttonRow.layoutMode = 'HORIZONTAL';
    buttonRow.counterAxisAlignItems = 'CENTER';
    buttonRow.primaryAxisAlignItems = 'CENTER';
    buttonRow.primaryAxisSizingMode = 'AUTO';
    buttonRow.counterAxisSizingMode = 'AUTO';
    buttonRow.itemSpacing = 16;
    buttonRow.name = 'Actions';

    buttonRow.appendChild(createButton({ frame, profile }, 'Launch Editor'));
    const ghostButton = createButton({ frame, profile }, 'Browse Playbook');
    ghostButton.fills = [
      {
        type: 'SOLID',
        color: { r: 1, g: 1, b: 1 },
        opacity: 0.08
      }
    ];
    ghostButton.strokes = [
      {
        type: 'SOLID',
        color: toFigmaPaint(profile.colors[0]).color,
        opacity: 0.4
      }
    ];
    buttonRow.appendChild(ghostButton);

    const contentFrame = figma.createFrame();
    contentFrame.layoutMode = 'VERTICAL';
    contentFrame.primaryAxisAlignItems = 'CENTER';
    contentFrame.counterAxisAlignItems = 'CENTER';
    contentFrame.primaryAxisSizingMode = 'AUTO';
    contentFrame.counterAxisSizingMode = 'FIXED';
    contentFrame.resizeWithoutConstraints(frame.width - frame.paddingLeft - frame.paddingRight, frame.height - 260);
    contentFrame.itemSpacing = 28;
    contentFrame.name = 'Hero Content';
    contentFrame.fills = [];
    contentFrame.strokes = [];

    const visual = createImagePlaceholder(
      { frame, profile },
      {
        width: frame.width - frame.paddingLeft - frame.paddingRight,
        height: 360,
        useAccent: true
      }
    );
    visual.name = 'Hero Visual';

    contentFrame.appendChild(badge);
    contentFrame.appendChild(heading);
    contentFrame.appendChild(body);
    contentFrame.appendChild(buttonRow);
    contentFrame.appendChild(visual);

    frame.appendChild(contentFrame);
  },
  social: ({ frame, profile }) => {
    frame.name = 'Social Spotlight';
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'FIXED';
    frame.counterAxisSizingMode = 'FIXED';
    frame.primaryAxisAlignItems = 'CENTER';
    frame.counterAxisAlignItems = 'CENTER';
    frame.paddingTop = 64;
    frame.paddingBottom = 64;
    frame.paddingLeft = 48;
    frame.paddingRight = 48;
    frame.itemSpacing = 18;
    frame.clipsContent = false;

    applySurface(frame, profile.surface.background);

    const topRow = figma.createFrame();
    topRow.layoutMode = 'HORIZONTAL';
    topRow.primaryAxisSizingMode = 'AUTO';
    topRow.counterAxisSizingMode = 'AUTO';
    topRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
    topRow.counterAxisAlignItems = 'CENTER';
    topRow.resizeWithoutConstraints(frame.width - frame.paddingLeft - frame.paddingRight, 48);
    topRow.fills = [];
    topRow.strokes = [];

    const label = createText({ frame, profile }, 'Weekly Spotlight', {
      fontSize: 20,
      textAutoResize: 'WIDTH_AND_HEIGHT',
      fontName:
        profile.typography.secondary ??
        profile.typography.primary ?? { family: 'Inter', style: 'Medium' }
    });

    const badge = createText({ frame, profile }, profile.metadata.sampleCount > 1 ? 'Multi-layout DNA' : 'Precision match', {
      fontSize: 12,
      textAutoResize: 'WIDTH_AND_HEIGHT',
      letterSpacing: { unit: 'PERCENT', value: 12 },
      fills: [
        toFigmaPaint(
          profile.colors.find((color) => color.role === 'accent') ??
            profile.colors[1] ??
            profile.colors[0]
        )
      ]
    });

    topRow.appendChild(label);
    topRow.appendChild(badge);

    const hero = createImagePlaceholder(
      { frame, profile },
      {
        width: frame.width - frame.paddingLeft - frame.paddingRight,
        height: 540,
        useAccent: true
      }
    );
    hero.name = 'Hero Visual';

    const title = createText({ frame, profile }, 'Stories that travel further.', {
      fontSize: 44,
      lineHeight: { unit: 'PERCENT', value: 120 },
      textAutoResize: 'WIDTH_AND_HEIGHT',
      fontName:
        profile.typography.primary ?? {
          family: 'Inter',
          style: 'Bold'
        }
    });

    const caption = createText(
      { frame, profile },
      'Content blueprints engineered to protect voice, proportions, rhythm, and energy across every launch.',
      {
        fontSize: 18,
        lineHeight: { unit: 'PERCENT', value: 150 },
        opacity: 0.78,
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Regular'
          }
      }
    );

    const metrics = figma.createFrame();
    metrics.layoutMode = 'HORIZONTAL';
    metrics.primaryAxisSizingMode = 'AUTO';
    metrics.counterAxisSizingMode = 'AUTO';
    metrics.itemSpacing = 16;
    metrics.fills = [];
    metrics.strokes = [];

    const statCard = (value: string, descriptor: string) => {
      const card = figma.createFrame();
      card.layoutMode = 'VERTICAL';
      card.primaryAxisSizingMode = 'AUTO';
      card.counterAxisSizingMode = 'AUTO';
      card.paddingTop = 18;
      card.paddingBottom = 18;
      card.paddingLeft = 20;
      card.paddingRight = 20;
      card.itemSpacing = 4;
      card.cornerRadius = profile.cornerRadius;
      card.fills = [
        toFigmaPaint(
          profile.colors.find((color) => color.role === 'secondary') ??
            profile.colors[0]
        )
      ];
      card.effects = profile.shadows.slice(0, 1);

      const valueText = createText({ frame, profile }, value, {
        fontSize: 28,
        fontName:
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Semi Bold'
          },
        fills: [
          {
            type: 'SOLID',
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      });
      const descriptorText = createText({ frame, profile }, descriptor, {
        fontSize: 11,
        opacity: 0.76,
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? { family: 'Inter', style: 'Medium' },
        fills: [
          {
            type: 'SOLID',
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      });
      card.appendChild(valueText);
      card.appendChild(descriptorText);
      return card;
    };

    metrics.appendChild(statCard('+212%', 'Lift in engagement'));
    metrics.appendChild(statCard('38 hrs', 'Design time saved'));

    frame.appendChild(topRow);
    frame.appendChild(hero);
    frame.appendChild(title);
    frame.appendChild(caption);
    frame.appendChild(metrics);
  },
  announcement: ({ frame, profile }) => {
    frame.name = 'Launch Announcement';
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'FIXED';
    frame.counterAxisSizingMode = 'FIXED';
    frame.primaryAxisAlignItems = 'CENTER';
    frame.counterAxisAlignItems = 'CENTER';
    frame.paddingTop = 72;
    frame.paddingBottom = 72;
    frame.paddingLeft = 64;
    frame.paddingRight = 64;
    frame.itemSpacing = 24;
    frame.fills = [];
    applySurface(frame, profile.surface.background);

    const title = createText({ frame, profile }, 'Ultra High Fidelity Kits', {
      fontSize: 52,
      textAutoResize: 'WIDTH_AND_HEIGHT',
      fontName:
        profile.typography.primary ?? {
          family: 'Inter',
          style: 'Bold'
        }
    });

    const tagline = createText({ frame, profile }, 'Drop-and-go canvases engineered to mirror your brand voice.', {
      fontSize: 20,
      opacity: 0.76,
      textAutoResize: 'WIDTH_AND_HEIGHT',
      fontName:
        profile.typography.secondary ??
        profile.typography.primary ?? {
          family: 'Inter',
          style: 'Medium'
        }
    });

    const divider = figma.createRectangle();
    divider.resizeWithoutConstraints(frame.width - frame.paddingLeft - frame.paddingRight, 2);
    divider.fills = [
      {
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0 },
        opacity: 0.08
      }
    ];
    divider.cornerRadius = 2;

    const points = figma.createFrame();
    points.layoutMode = 'VERTICAL';
    points.primaryAxisSizingMode = 'AUTO';
    points.counterAxisSizingMode = 'AUTO';
    points.itemSpacing = 12;
    points.fills = [];

    const bullet = (titleText: string, description: string) => {
      const row = figma.createFrame();
      row.layoutMode = 'HORIZONTAL';
      row.primaryAxisSizingMode = 'AUTO';
      row.counterAxisSizingMode = 'AUTO';
      row.counterAxisAlignItems = 'STRETCH';
      row.itemSpacing = 16;
      row.fills = [];

      const marker = figma.createEllipse();
      marker.resize(12, 12);
      marker.fills = [
        toFigmaPaint(
          profile.colors.find((color) => color.role === 'accent') ??
            profile.colors[1] ??
            profile.colors[0]
        )
      ];

      const column = figma.createFrame();
      column.layoutMode = 'VERTICAL';
      column.primaryAxisSizingMode = 'AUTO';
      column.counterAxisSizingMode = 'AUTO';
      column.itemSpacing = 4;
      column.fills = [];

      const heading = createText({ frame, profile }, titleText, {
        fontSize: 18,
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Semi Bold'
          }
      });

      const descriptionText = createText({ frame, profile }, description, {
        fontSize: 14,
        opacity: 0.7,
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Regular'
          }
      });

      column.appendChild(heading);
      column.appendChild(descriptionText);
      row.appendChild(marker);
      row.appendChild(column);
      return row;
    };

    points.appendChild(bullet('Palette-perfect combos', 'Automatically matched gradients, fills, and strokes.'));
    points.appendChild(bullet('Typography pairings', 'Exact font stacks and hierarchy from your source layouts.'));
    points.appendChild(bullet('Systemized spacing', 'Auto layout grids tuned to your brand proportions.'));

    frame.appendChild(title);
    frame.appendChild(tagline);
    frame.appendChild(divider);
    frame.appendChild(points);
    frame.appendChild(createButton({ frame, profile }, 'Generate assets'));
  },
  email: ({ frame, profile }) => {
    frame.name = 'Email Narrative';
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'FIXED';
    frame.counterAxisSizingMode = 'FIXED';
    frame.primaryAxisAlignItems = 'CENTER';
    frame.counterAxisAlignItems = 'CENTER';
    frame.paddingTop = 48;
    frame.paddingBottom = 48;
    frame.paddingLeft = 48;
    frame.paddingRight = 48;
    frame.itemSpacing = 24;
    applySurface(frame, profile.surface.background);

    const card = figma.createFrame();
    card.layoutMode = 'VERTICAL';
    card.primaryAxisSizingMode = 'AUTO';
    card.counterAxisSizingMode = 'AUTO';
    card.paddingTop = 48;
    card.paddingBottom = 48;
    card.paddingLeft = 56;
    card.paddingRight = 56;
    card.itemSpacing = 24;
    card.cornerRadius = profile.cornerRadius;
    card.fills = [
      toFigmaPaint(
        profile.colors.find((color) => color.role === 'secondary') ??
          profile.colors[0]
      )
    ];
    card.effects = profile.shadows.slice(0, 1);

    const intro = createText({ frame, profile }, 'Personalized dispatch', {
      fontSize: 14,
      opacity: 0.82,
      textAutoResize: 'WIDTH_AND_HEIGHT',
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1 }
        }
      ]
    });

    const headline = createText({ frame, profile }, 'The brand kit that builds itself.', {
      fontSize: 48,
      lineHeight: { unit: 'PERCENT', value: 120 },
      textAutoResize: 'WIDTH_AND_HEIGHT',
      fontName:
        profile.typography.primary ?? {
          family: 'Inter',
          style: 'Bold'
        },
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1 }
        }
      ]
    });

    const paragraph = createText(
      { frame, profile },
      'Drop in 3–5 reference layouts and receive a ready-to-launch storytelling kit tuned to your brand’s typography, palette, rhythm, and proportions.',
      {
        fontSize: 16,
        lineHeight: { unit: 'PERCENT', value: 155 },
        opacity: 0.88,
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Regular'
          },
        fills: [
          {
            type: 'SOLID',
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      }
    );

    const grid = figma.createFrame();
    grid.layoutMode = 'HORIZONTAL';
    grid.primaryAxisSizingMode = 'AUTO';
    grid.counterAxisSizingMode = 'AUTO';
    grid.itemSpacing = 16;
    grid.fills = [];

    const column = (titleText: string, bodyText: string) => {
      const columnFrame = figma.createFrame();
      columnFrame.layoutMode = 'VERTICAL';
      columnFrame.primaryAxisSizingMode = 'AUTO';
      columnFrame.counterAxisSizingMode = 'AUTO';
      columnFrame.itemSpacing = 8;
      columnFrame.fills = [];

      const columnTitle = createText({ frame, profile }, titleText, {
        fontSize: 18,
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Semi Bold'
          },
        fills: [
          {
            type: 'SOLID',
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      });

      const columnBody = createText({ frame, profile }, bodyText, {
        fontSize: 14,
        lineHeight: { unit: 'PERCENT', value: 150 },
        opacity: 0.82,
        textAutoResize: 'WIDTH_AND_HEIGHT',
        fontName:
          profile.typography.secondary ??
          profile.typography.primary ?? {
            family: 'Inter',
            style: 'Regular'
          },
        fills: [
          {
            type: 'SOLID',
            color: { r: 1, g: 1, b: 1 }
          }
        ]
      });

      columnFrame.appendChild(columnTitle);
      columnFrame.appendChild(columnBody);
      return columnFrame;
    };

    grid.appendChild(column('Palette memory', 'Stores every dominant hue and applies it consistently.'));
    grid.appendChild(column('Typographic rhythm', 'Reconstructs heading, lead, and caption pairings.'));
    grid.appendChild(column('Layout DNA', 'Uses ratios from your samples to auto-compose hero, split, and grid canvases.'));

    card.appendChild(intro);
    card.appendChild(headline);
    card.appendChild(paragraph);
    card.appendChild(grid);
    card.appendChild(createButton({ frame, profile }, 'Sync styles'));

    frame.appendChild(card);
  }
};

export const learnBranding = (selection: readonly SceneNode[]) => analyzeSelection(selection);

export const generateTemplates = async (profile: BrandingProfile, options: GenerationOptions) => {
  await ensureFonts(profile);

  const createdFrames: FrameNode[] = [];
  let patternIndex = 0;

  for (let i = 0; i < options.count; i++) {
    if (!options.patterns.length) {
      break;
    }

    const pattern = options.patterns[patternIndex % options.patterns.length];
    patternIndex++;

    const frame = figma.createFrame();
    frame.resizeWithoutConstraints(
      TEMPLATE_DIMENSIONS[pattern].width,
      TEMPLATE_DIMENSIONS[pattern].height
    );
    frame.x = figma.viewport.center.x + (i % 3) * (frame.width + 80);
    frame.y = figma.viewport.center.y + Math.floor(i / 3) * (frame.height + 80);

    await templateFactories[pattern]({
      profile,
      frame
    });

    createdFrames.push(frame);
    figma.currentPage.appendChild(frame);
  }

  if (createdFrames.length) {
    figma.currentPage.selection = createdFrames;
    figma.viewport.scrollAndZoomIntoView(createdFrames);
  }

  return createdFrames;
};
