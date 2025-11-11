type TemplatePatternId = 'hero' | 'social' | 'announcement' | 'email';

type SolidPaint = {
  type: 'SOLID';
  color: { r: number; g: number; b: number };
  opacity?: number;
};

type ColorSwatch = {
  hex: string;
  role: 'primary' | 'secondary' | 'accent' | 'neutral';
};

type FontDescriptor = {
  family: string;
  style: string;
  weightClass?: number;
};

type BrandingProfile = {
  colors: Array<ColorSwatch & { score: number }>;
  typography: {
    primary: FontDescriptor | null;
    secondary: FontDescriptor | null;
    all: FontDescriptor[];
  };
  cornerRadius: number;
  strokeWeight: number;
  shadows: unknown[];
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

type KnowledgeMeta = {
  learnCount: number;
  approvedCount: number;
};

type BrandingProfileMessage = {
  type: 'branding-profile';
  data: BrandingProfile;
  meta: KnowledgeMeta;
  source?: 'memory' | 'learn' | 'approval';
};

type PluginMessage =
  | BrandingProfileMessage
  | { type: 'branding-error'; data: string }
  | { type: 'generation-start' }
  | { type: 'generation-complete' }
  | { type: 'generation-error'; data: string }
  | { type: 'selection-change'; data: number }
  | { type: 'approval-complete' }
  | { type: 'approval-error'; data: string };

const patterns: { id: TemplatePatternId; name: string; description: string }[] = [
  {
    id: 'hero',
    name: 'Hero Banner',
    description: 'Full-width launch or campaign hero for web'
  },
  {
    id: 'social',
    name: 'Social Spotlight',
    description: 'Square/portrait storytelling for social feeds'
  },
  {
    id: 'announcement',
    name: 'Announcement',
    description: 'Wide landscape layout for product drops'
  },
  {
    id: 'email',
    name: 'Email Narrative',
    description: 'Editorial block for lifecycle and newsletters'
  }
];

const learnButton = document.getElementById('learnButton') as HTMLButtonElement;
const generateButton = document.getElementById('generateButton') as HTMLButtonElement;
const statusElement = document.getElementById('status') as HTMLElement;
const brandSummary = document.getElementById('brandSummary') as HTMLElement;
const countInput = document.getElementById('countInput') as HTMLInputElement;
const patternToggleGroup = document.getElementById('patternToggleGroup') as HTMLElement;
const approveButton = document.getElementById('approveButton') as HTMLButtonElement | null;
const approvalStatus = document.getElementById('approvalStatus') as HTMLElement | null;

let isGenerating = false;
let currentProfile: BrandingProfile | null = null;
let knowledgeMeta: KnowledgeMeta = { learnCount: 0, approvedCount: 0 };
let selectionCount = 0;
const selectedPatterns = new Set<TemplatePatternId>(['hero', 'social', 'announcement']);

const sendMessage = (payload: Record<string, unknown>) => {
  parent.postMessage({ pluginMessage: payload }, '*');
};

const updateButtons = () => {
  learnButton.disabled = isGenerating;
  generateButton.disabled = isGenerating || !currentProfile;
  if (approveButton) {
    approveButton.disabled = isGenerating || !currentProfile || selectionCount === 0;
  }
};

const setStatus = (message: string, tone: 'default' | 'success' | 'warning' = 'default') => {
  statusElement.textContent = '';
  statusElement.className = `status${tone === 'success' ? ' success' : tone === 'warning' ? ' warning' : ''}`;
  statusElement.textContent = message;
};

const renderBrandSummary = (profile: BrandingProfile, meta: KnowledgeMeta) => {
  const primary = profile.typography.primary;
  const secondary = profile.typography.secondary;
  const uniqueFonts = profile.typography.all.slice(0, 4);

  const colorSwatches = profile.colors
    .map(
      (color) => `
      <div class="swatch">
        <div class="swatch-color" style="background:${color.hex}"></div>
        <span>${color.role}</span>
        <span>${color.hex}</span>
      </div>`
    )
    .join('');

  const fonts = uniqueFonts
    .map(
      (font) => `
      <div class="font-item">
        <strong>${font.family}</strong>
        <span>${font.style}</span>
      </div>`
    )
    .join('');

  const tokens = `
    <div class="status success">
      Learned from ${profile.metadata.sampleCount} sample${profile.metadata.sampleCount > 1 ? 's' : ''}.
    </div>
      <div class="status" style="background:rgba(37,99,235,0.06);color:#1D4ED8;">
        ${profile.narrative.personality}
      </div>
    <div style="display:flex;gap:12px;font-size:10px;color:#6B7280;flex-wrap:wrap;">
      <span>Learning passes: <strong>${meta.learnCount}</strong></span>
      <span>Approved templates: <strong>${meta.approvedCount}</strong></span>
    </div>
    <div>
      <h3 style="margin:12px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Palette</h3>
      <div class="palette-grid">${colorSwatches}</div>
    </div>
    <div>
      <h3 style="margin:12px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Typography</h3>
      <div class="fonts-list">
        ${primary ? `<div class="font-item"><strong>Primary</strong><span>${primary.family} · ${primary.style}</span></div>` : ''}
        ${secondary ? `<div class="font-item"><strong>Secondary</strong><span>${secondary.family} · ${secondary.style}</span></div>` : ''}
        ${fonts}
      </div>
    </div>
    <div>
      <h3 style="margin:12px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">DNA Tokens</h3>
      <ul style="margin:0;padding-left:18px;font-size:11px;color:#374151;display:flex;flex-direction:column;gap:6px;">
        <li>Corner radius ~ <strong>${profile.cornerRadius}px</strong></li>
        <li>Stroke weight ~ <strong>${profile.strokeWeight}px</strong></li>
        <li>Shadow styles captured: <strong>${profile.shadows.length}</strong></li>
          <li>Tone cues: <strong>${profile.narrative.toneDescriptions.join(', ')}</strong></li>
      </ul>
    </div>
      <div>
        <h3 style="margin:12px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Highlights</h3>
        <ul style="margin:0;padding-left:18px;font-size:11px;color:#047857;display:flex;flex-direction:column;gap:6px;">
          ${profile.insights.highlights.length ? profile.insights.highlights.map((item) => `<li>${item}</li>`).join('') : '<li>Provide more branded elements to surface strengths.</li>'}
        </ul>
      </div>
      <div>
        <h3 style="margin:12px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Opportunities</h3>
        <ul style="margin:0;padding-left:18px;font-size:11px;color:#B45309;display:flex;flex-direction:column;gap:6px;">
          ${profile.insights.improvementIdeas.length ? profile.insights.improvementIdeas.map((item) => `<li>${item}</li>`).join('') : '<li>Samples already cover a complete system—ready to generate.</li>'}
        </ul>
      </div>
  `;

  brandSummary.innerHTML = tokens;
};

const renderPatternToggles = () => {
  patternToggleGroup.innerHTML = '';
  patterns.forEach((pattern) => {
    const toggle = document.createElement('div');
    toggle.className = `toggle${selectedPatterns.has(pattern.id) ? ' active' : ''}`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selectedPatterns.has(pattern.id);
    input.id = `pattern-${pattern.id}`;

    const label = document.createElement('label');
    label.setAttribute('for', input.id);
    label.style.fontSize = '11px';
    label.style.fontWeight = '600';
    label.textContent = pattern.name;

    const description = document.createElement('span');
    description.style.fontSize = '10px';
    description.style.color = '#6B7280';
    description.textContent = pattern.description;

    toggle.appendChild(input);
    toggle.appendChild(label);
    toggle.appendChild(description);

    toggle.addEventListener('click', (event) => {
      // prevent double toggling when clicking input
      if ((event.target as HTMLElement).tagName === 'INPUT') {
        return;
      }
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change'));
    });

    input.addEventListener('change', () => {
      if (input.checked) {
        selectedPatterns.add(pattern.id);
      } else {
        selectedPatterns.delete(pattern.id);
      }
      if (!selectedPatterns.size) {
        // Ensure at least one pattern remains active
        selectedPatterns.add(pattern.id);
        input.checked = true;
      }
      toggle.classList.toggle('active', input.checked);
    });

    patternToggleGroup.appendChild(toggle);
  });
};

learnButton.addEventListener('click', () => {
  setStatus('Learning from selection…', 'default');
  sendMessage({ type: 'learn-branding' });
});

generateButton.addEventListener('click', () => {
  const count = Math.max(1, Math.min(8, parseInt(countInput.value, 10) || 3));
  countInput.value = String(count);
  isGenerating = true;
  updateButtons();
  generateButton.textContent = 'Generating…';
  sendMessage({
    type: 'generate-templates',
    data: {
      count,
      patterns: Array.from(selectedPatterns)
    }
  });
});

if (approveButton) {
  approveButton.addEventListener('click', () => {
    if (approveButton.disabled) {
      return;
    }
    if (approvalStatus) {
      approvalStatus.className = 'status';
      approvalStatus.textContent = 'Reinforcing brand with approved selection…';
    }
    sendMessage({ type: 'approve-selection' });
  });
}

window.onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) {
    return;
  }

  switch (message.type) {
    case 'branding-profile':
      currentProfile = message.data;
      knowledgeMeta = message.meta;
      isGenerating = false;
      renderBrandSummary(message.data, knowledgeMeta);
      generateButton.textContent = 'Generate branded templates';
      updateButtons();
      if (message.source === 'memory') {
        setStatus('Brand DNA restored from previous sessions. Ready to generate.', 'success');
      } else if (message.source === 'approval') {
        setStatus('Brand DNA reinforced with your approved templates.', 'success');
        if (approvalStatus) {
          approvalStatus.className = 'status success';
          approvalStatus.textContent = 'Selection approved. The plugin will favour this style going forward.';
        }
      } else {
        setStatus('Brand DNA captured. Ready to generate.', 'success');
        if (approvalStatus && selectionCount === 0) {
          approvalStatus.className = 'status';
          approvalStatus.textContent = 'Select generated frames you trust, then click approve to keep training.';
        }
      }
      generateButton.textContent = 'Generate branded templates';
      break;
    case 'branding-error':
      currentProfile = null;
      isGenerating = false;
      brandSummary.innerHTML = '<p class="status warning">We could not learn from the selection. Try selecting branded frames.</p>';
      setStatus(message.data, 'warning');
      generateButton.textContent = 'Generate branded templates';
      if (approvalStatus) {
        approvalStatus.className = 'status warning';
        approvalStatus.textContent = 'Learn the brand before approving templates.';
      }
      updateButtons();
      break;
    case 'generation-start':
      isGenerating = true;
      updateButtons();
      generateButton.textContent = 'Generating…';
      if (approvalStatus) {
        approvalStatus.className = 'status';
        approvalStatus.textContent = 'Generating layouts… select your favourites once they appear.';
      }
      break;
    case 'generation-complete':
      isGenerating = false;
      generateButton.textContent = 'Generate branded templates';
      updateButtons();
      setStatus('Templates created. Check your canvas!', 'success');
      if (approvalStatus) {
        approvalStatus.className = 'status';
        approvalStatus.textContent = 'Select the new frames you like and click approve to reinforce the style.';
      }
      break;
    case 'generation-error':
      isGenerating = false;
      generateButton.textContent = 'Generate branded templates';
      updateButtons();
      setStatus(message.data, 'warning');
      break;
    case 'selection-change':
      selectionCount = message.data;
      if (!currentProfile) {
        if (selectionCount > 0) {
          setStatus(`Selection ready · ${selectionCount} node${selectionCount > 1 ? 's' : ''} selected.`, 'default');
        } else {
          setStatus('Select 1–5 frames that reflect the brand, then click learn.', 'warning');
        }
      } else if (approvalStatus) {
        if (selectionCount > 0) {
          approvalStatus.className = 'status';
          approvalStatus.textContent = `Selection ready · ${selectionCount} node${selectionCount > 1 ? 's' : ''} selected. Approve to reinforce the brand.`;
        } else {
          approvalStatus.className = 'status';
          approvalStatus.textContent = 'Select the frames you trust, then click approve to keep learning.';
        }
      }
      updateButtons();
      break;
    case 'approval-complete':
      selectionCount = 0;
      updateButtons();
      if (approvalStatus) {
        approvalStatus.className = 'status success';
        approvalStatus.textContent = 'Thanks! Approved selection added to the brand memory.';
      }
      break;
    case 'approval-error':
      if (approvalStatus) {
        approvalStatus.className = 'status warning';
        approvalStatus.textContent = message.data;
      }
      updateButtons();
      break;
    default:
      break;
  }
};

renderPatternToggles();
updateButtons();
