import type { BrandJSON, Mode } from '../types/brand';
import type { PluginToUIMessage, UIToPluginMessage } from '../types/messages';

type PanelId = 'brand' | 'generate' | 'apply' | 'learn' | 'tutorial' | 'chat';

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab'));
const panels = new Map<PanelId, HTMLElement>([
  ['brand', document.getElementById('brandPanel')!],
  ['generate', document.getElementById('generatePanel')!],
  ['apply', document.getElementById('applyPanel')!],
  ['learn', document.getElementById('learnPanel')!],
  ['tutorial', document.getElementById('tutorialPanel')!],
  ['chat', document.getElementById('chatPanel')!]
]);

const brandInput = document.getElementById('brandInput') as HTMLTextAreaElement;
const importBrandButton = document.getElementById('importBrandButton') as HTMLButtonElement;
const loadSampleBrandButton = document.getElementById('loadSampleBrand') as HTMLButtonElement;
const brandStatus = document.getElementById('brandStatus') as HTMLElement;
const brandSummary = document.getElementById('brandSummary') as HTMLElement;

const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.mode-button'));
const modeStatus = document.getElementById('modeStatus') as HTMLElement;
const layoutPattern = document.getElementById('layoutPattern') as HTMLSelectElement;
const variantCount = document.getElementById('variantCount') as HTMLInputElement;
const generateButton = document.getElementById('generateButton') as HTMLButtonElement;
const rationaleLog = document.getElementById('rationaleLog') as HTMLElement;

const applyScope = document.getElementById('applyScope') as HTMLSelectElement;
const applyTypography = document.getElementById('applyTypography') as HTMLInputElement;
const applySpacing = document.getElementById('applySpacing') as HTMLInputElement;
const applyBrandButton = document.getElementById('applyBrandButton') as HTMLButtonElement;

const feedbackKeyInput = document.getElementById('feedbackKey') as HTMLInputElement;
const thumbsUpButton = document.getElementById('thumbsUp') as HTMLButtonElement;
const thumbsDownButton = document.getElementById('thumbsDown') as HTMLButtonElement;
const feedbackStatus = document.getElementById('feedbackStatus') as HTMLElement;
const learningSummary = document.getElementById('learningSummary') as HTMLElement;

const chatStatus = document.getElementById('chatStatus') as HTMLElement;
const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement;
const chatPreviewButton = document.getElementById('chatPreviewButton') as HTMLButtonElement;
const chatApplyButton = document.getElementById('chatApplyButton') as HTMLButtonElement;
const chatRevertButton = document.getElementById('chatRevertButton') as HTMLButtonElement;
const chatDiff = document.getElementById('chatDiff') as HTMLElement;

const brandPanelStatus = document.getElementById('status') as HTMLElement | null;
const selectionStatus = document.getElementById('selectionStatus') as HTMLElement;
const approveButton = document.getElementById('approveButton') as HTMLButtonElement | null;

let currentBrand: BrandJSON | null = null;
let currentMode: Mode = 'conservative';
let selectionCount = 0;

generateButton.disabled = true;
applyBrandButton.disabled = true;
chatPreviewButton.disabled = true;
chatApplyButton.disabled = true;
chatRevertButton.disabled = true;
if (approveButton) approveButton.disabled = true;

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab as PanelId;
    if (!target) return;
    activateTab(target);
  });
});

function activateTab(target: PanelId) {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === target));
  panels.forEach((panel, id) => panel.classList.toggle('active', id === target));
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    modeButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    currentMode = button.dataset.mode as Mode;
    postToPlugin({ type: 'set-mode', mode: currentMode });
    modeStatus.textContent = describeMode(currentMode);
  });
});

importBrandButton.addEventListener('click', () => {
  if (!brandInput.value.trim()) {
    updateStatus(brandStatus, 'Paste brand JSON before importing.', 'warning');
    return;
  }
  postToPlugin({ type: 'import-brand', payload: brandInput.value });
  updateStatus(brandStatus, 'Importing brand…', 'info');
});

loadSampleBrandButton.addEventListener('click', () => {
  postToPlugin({ type: 'request-tutorial-assets' });
});

generateButton.addEventListener('click', () => {
  const variants = Math.max(1, Math.min(3, parseInt(variantCount.value, 10) || 1));
  postToPlugin({
    type: 'generate-layout',
    pattern: layoutPattern.value as 'hero' | 'card' | 'social',
    mode: currentMode,
    variants
  });
  updateStatus(modeStatus, 'Generating layouts…', 'info');
  generateButton.disabled = true;
});

applyBrandButton.addEventListener('click', () => {
  postToPlugin({
    type: 'apply-brand',
    scope: applyScope.value as 'selection' | 'page',
    options: {
      includeTypography: applyTypography.checked,
      includeSpacing: applySpacing.checked
    }
  });
  applyBrandButton.disabled = true;
});

thumbsUpButton.addEventListener('click', () => recordFeedback(true));
thumbsDownButton.addEventListener('click', () => recordFeedback(false));

function recordFeedback(positive: boolean) {
  const key = feedbackKeyInput.value.trim();
  if (!key) {
    updateStatus(feedbackStatus, 'Describe the token pair before recording feedback.', 'warning');
    return;
  }
  postToPlugin({ type: 'record-feedback', key, positive });
  updateStatus(feedbackStatus, positive ? 'Noted: Boosting this combination.' : 'Noted: Avoiding this pairing.', 'success');
}

if (approveButton) {
  approveButton.addEventListener('click', () => {
    postToPlugin({ type: 'approve-selection' });
    approveButton.disabled = true;
  });
}

chatPreviewButton.addEventListener('click', () => {
  const request = chatInput.value.trim();
  if (!request) {
    updateStatus(chatStatus, 'Describe the change you want before previewing.', 'warning');
    return;
  }
  postToPlugin({
    type: 'chat-preview',
    nodeIds: getSelectionIds(),
    request
  });
  updateStatus(chatStatus, 'Preparing safe preview…', 'info');
});

chatApplyButton.addEventListener('click', () => {
  const request = chatInput.value.trim();
  if (!request) {
    updateStatus(chatStatus, 'Describe the change you want before applying.', 'warning');
    return;
  }
  postToPlugin({
    type: 'chat-apply',
    nodeIds: getSelectionIds(),
    request
  });
  chatApplyButton.disabled = true;
});

chatRevertButton.addEventListener('click', () => {
  postToPlugin({ type: 'chat-revert-last' });
});

function describeMode(mode: Mode) {
  switch (mode) {
    case 'conservative':
      return 'Conservative mode: 1 family, tight type ratio, minimal exploration.';
    case 'pro':
      return 'Pro mode: 2 families, balanced ratio, measured exploration.';
    case 'creative':
      return 'Creative mode: Up to 3 families, generous ratio, bold exploration within canon.';
  }
}

function renderBrandSummary(brand: BrandJSON) {
  currentBrand = brand;
  generateButton.disabled = false;
  applyBrandButton.disabled = false;
  chatApplyButton.disabled = selectionCount === 0;
  chatPreviewButton.disabled = selectionCount === 0;
  if (approveButton) approveButton.disabled = selectionCount === 0;

  const palette = Object.entries(brand.colors)
    .map(
      ([token, hex]) => `
      <div class="swatch">
        <div class="swatch-color" style="background:${hex}"></div>
        <span>${token}</span>
        <span>${hex}</span>
      </div>`
    )
    .join('');

  const typography = `
    <div class="stack">
      <span class="token-pill">Font: ${brand.typography.fontFamily}</span>
      <span class="token-pill">Scale: ${brand.typography.scale.join(', ')}</span>
      <span class="token-pill">Weights: ${Object.keys(brand.typography.weights).join(', ')}</span>
    </div>
  `;

  const spacing = `
    <div class="stack">
      <span class="token-pill">Spacing base: ${brand.spacing.base}px</span>
      <span class="token-pill">Spacing scale: ${brand.spacing.scale.join(', ')}</span>
      <span class="token-pill">Radii: ${Object.entries(brand.radii)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ')}</span>
    </div>
  `;

  brandSummary.innerHTML = `
    <div class="palette-grid">${palette}</div>
    ${typography}
    ${spacing}
  `;

  updateStatus(brandStatus, `Loaded tokens for ${brand.name}.`, 'success');
}

function appendRationale(action: string, bullets: string[]) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rationale-item';
  const title = document.createElement('h4');
  title.textContent = action;
  wrapper.appendChild(title);
  const list = document.createElement('ul');
  bullets.forEach((bullet) => {
    const li = document.createElement('li');
    li.textContent = bullet;
    list.appendChild(li);
  });
  wrapper.appendChild(list);
  rationaleLog.prepend(wrapper);
}

function updateLearningSummary(snapshot: { selectionsApproved: number; feedback: Record<string, { positive: number; negative: number }> }) {
  const entries = Object.entries(snapshot.feedback);
  if (!entries.length && snapshot.selectionsApproved === 0) {
    learningSummary.textContent = 'No feedback captured yet. Start approving layouts or recording preferences.';
    return;
  }
  const feedbackLines = entries
    .map(([key, stat]) => `${key}: 👍 ${stat.positive} · 👎 ${stat.negative}`)
    .join('<br />');
  learningSummary.innerHTML = `
    Approved selections: <strong>${snapshot.selectionsApproved}</strong><br />
    ${feedbackLines || 'No token feedback yet.'}
  `;
}

function updateChatDiff(diff: { changes: Array<{ nodeId: string; nodeName: string; property: string; from: unknown; to: unknown }> }) {
  if (!diff || !diff.changes.length) {
    chatDiff.innerHTML = '<li class="status info">No safe changes detected for the current request.</li>';
    return;
  }
  chatDiff.innerHTML = diff.changes
    .map(
      (item) => `
        <li class="diff-item">
          <strong>${item.nodeName}</strong>: ${item.property} → ${formatValue(item.to)}
        </li>
      `
    )
    .join('');
}

function formatValue(value: unknown) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function updateSelection(count: number) {
  selectionCount = count;
  selectionStatus.textContent = count
    ? `${count} node${count === 1 ? '' : 's'} selected`
    : 'No selection';
  chatPreviewButton.disabled = count === 0;
  chatApplyButton.disabled = count === 0;
  chatRevertButton.disabled = count === 0;
  if (approveButton) approveButton.disabled = !currentBrand || count === 0;
}

function updateStatus(element: HTMLElement, message: string, tone: 'info' | 'success' | 'warning') {
  element.className = `status ${tone}`;
  element.textContent = message;
}

function getSelectionIds(): string[] {
  return [];
}

window.onmessage = (event: MessageEvent<{ pluginMessage: PluginToUIMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) return;
  switch (message.type) {
    case 'init':
      if (message.data.brand) {
        renderBrandSummary(message.data.brand);
      }
      if (message.data.knowledge) {
        updateLearningSummary({
          selectionsApproved: message.data.knowledge.selectionsApproved,
          feedback: message.data.knowledge.feedback
        });
      }
      break;
    case 'branding-profile':
      if (message.data) {
        renderBrandSummary(message.data);
      }
      break;
    case 'operation-complete':
      appendRationale(message.action, message.rationale);
      generateButton.disabled = false;
      applyBrandButton.disabled = false;
      if (approveButton) approveButton.disabled = selectionCount === 0;
      chatApplyButton.disabled = selectionCount === 0;
      updateStatus(modeStatus, `Last action: ${message.action}`, 'success');
      break;
    case 'operation-error':
      updateStatus(modeStatus, message.message, 'warning');
      generateButton.disabled = false;
      applyBrandButton.disabled = false;
      break;
    case 'selection-change':
      updateSelection(message.count);
      break;
    case 'tutorial-assets':
      brandInput.value = JSON.stringify(message.sample, null, 2);
      updateStatus(brandStatus, 'Sample brand loaded. Import when ready.', 'info');
      break;
    case 'chat-preview':
      updateChatDiff(message.diff);
      updateStatus(chatStatus, message.rationale.join(' • '), 'info');
      chatApplyButton.disabled = false;
      break;
    case 'chat-applied':
      updateStatus(chatStatus, message.rationale.join(' • '), 'success');
      chatApplyButton.disabled = true;
      break;
  }
};

function postToPlugin(message: UIToPluginMessage) {
  parent.postMessage({ pluginMessage: message }, '*');
}

postToPlugin({ type: 'ready' });
postToPlugin({ type: 'set-mode', mode: currentMode });

