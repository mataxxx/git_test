"use strict";
(() => {
  // src/ui/index.ts
  var tabs = Array.from(document.querySelectorAll(".tab"));
  var panels = /* @__PURE__ */ new Map([
    ["brand", document.getElementById("brandPanel")],
    ["generate", document.getElementById("generatePanel")],
    ["apply", document.getElementById("applyPanel")],
    ["learn", document.getElementById("learnPanel")],
    ["tutorial", document.getElementById("tutorialPanel")],
    ["chat", document.getElementById("chatPanel")]
  ]);
  var brandInput = document.getElementById("brandInput");
  var importBrandButton = document.getElementById("importBrandButton");
  var loadSampleBrandButton = document.getElementById("loadSampleBrand");
  var brandStatus = document.getElementById("brandStatus");
  var brandSummary = document.getElementById("brandSummary");
  var modeButtons = Array.from(document.querySelectorAll(".mode-button"));
  var modeStatus = document.getElementById("modeStatus");
  var layoutPattern = document.getElementById("layoutPattern");
  var variantCount = document.getElementById("variantCount");
  var generateButton = document.getElementById("generateButton");
  var rationaleLog = document.getElementById("rationaleLog");
  var applyScope = document.getElementById("applyScope");
  var applyTypography = document.getElementById("applyTypography");
  var applySpacing = document.getElementById("applySpacing");
  var applyBrandButton = document.getElementById("applyBrandButton");
  var feedbackKeyInput = document.getElementById("feedbackKey");
  var thumbsUpButton = document.getElementById("thumbsUp");
  var thumbsDownButton = document.getElementById("thumbsDown");
  var feedbackStatus = document.getElementById("feedbackStatus");
  var learningSummary = document.getElementById("learningSummary");
  var chatStatus = document.getElementById("chatStatus");
  var chatInput = document.getElementById("chatInput");
  var chatPreviewButton = document.getElementById("chatPreviewButton");
  var chatApplyButton = document.getElementById("chatApplyButton");
  var chatRevertButton = document.getElementById("chatRevertButton");
  var chatDiff = document.getElementById("chatDiff");
  var brandPanelStatus = document.getElementById("status");
  var selectionStatus = document.getElementById("selectionStatus");
  var approveButton = document.getElementById("approveButton");
  var currentBrand = null;
  var currentMode = "conservative";
  var selectionCount = 0;
  generateButton.disabled = true;
  applyBrandButton.disabled = true;
  chatPreviewButton.disabled = true;
  chatApplyButton.disabled = true;
  chatRevertButton.disabled = true;
  if (approveButton) approveButton.disabled = true;
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      if (!target) return;
      activateTab(target);
    });
  });
  function activateTab(target) {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === target));
    panels.forEach((panel, id) => panel.classList.toggle("active", id === target));
  }
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      modeButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
      currentMode = button.dataset.mode;
      postToPlugin({ type: "set-mode", mode: currentMode });
      modeStatus.textContent = describeMode(currentMode);
    });
  });
  importBrandButton.addEventListener("click", () => {
    if (!brandInput.value.trim()) {
      updateStatus(brandStatus, "Paste brand JSON before importing.", "warning");
      return;
    }
    postToPlugin({ type: "import-brand", payload: brandInput.value });
    updateStatus(brandStatus, "Importing brand\u2026", "info");
  });
  loadSampleBrandButton.addEventListener("click", () => {
    postToPlugin({ type: "request-tutorial-assets" });
  });
  generateButton.addEventListener("click", () => {
    const variants = Math.max(1, Math.min(3, parseInt(variantCount.value, 10) || 1));
    postToPlugin({
      type: "generate-layout",
      pattern: layoutPattern.value,
      mode: currentMode,
      variants
    });
    updateStatus(modeStatus, "Generating layouts\u2026", "info");
    generateButton.disabled = true;
  });
  applyBrandButton.addEventListener("click", () => {
    postToPlugin({
      type: "apply-brand",
      scope: applyScope.value,
      options: {
        includeTypography: applyTypography.checked,
        includeSpacing: applySpacing.checked
      }
    });
    applyBrandButton.disabled = true;
  });
  thumbsUpButton.addEventListener("click", () => recordFeedback(true));
  thumbsDownButton.addEventListener("click", () => recordFeedback(false));
  function recordFeedback(positive) {
    const key = feedbackKeyInput.value.trim();
    if (!key) {
      updateStatus(feedbackStatus, "Describe the token pair before recording feedback.", "warning");
      return;
    }
    postToPlugin({ type: "record-feedback", key, positive });
    updateStatus(feedbackStatus, positive ? "Noted: Boosting this combination." : "Noted: Avoiding this pairing.", "success");
  }
  if (approveButton) {
    approveButton.addEventListener("click", () => {
      postToPlugin({ type: "approve-selection" });
      approveButton.disabled = true;
    });
  }
  chatPreviewButton.addEventListener("click", () => {
    const request = chatInput.value.trim();
    if (!request) {
      updateStatus(chatStatus, "Describe the change you want before previewing.", "warning");
      return;
    }
    postToPlugin({
      type: "chat-preview",
      nodeIds: getSelectionIds(),
      request
    });
    updateStatus(chatStatus, "Preparing safe preview\u2026", "info");
  });
  chatApplyButton.addEventListener("click", () => {
    const request = chatInput.value.trim();
    if (!request) {
      updateStatus(chatStatus, "Describe the change you want before applying.", "warning");
      return;
    }
    postToPlugin({
      type: "chat-apply",
      nodeIds: getSelectionIds(),
      request
    });
    chatApplyButton.disabled = true;
  });
  chatRevertButton.addEventListener("click", () => {
    postToPlugin({ type: "chat-revert-last" });
  });
  function describeMode(mode) {
    switch (mode) {
      case "conservative":
        return "Conservative mode: 1 family, tight type ratio, minimal exploration.";
      case "pro":
        return "Pro mode: 2 families, balanced ratio, measured exploration.";
      case "creative":
        return "Creative mode: Up to 3 families, generous ratio, bold exploration within canon.";
    }
  }
  function renderBrandSummary(brand) {
    currentBrand = brand;
    generateButton.disabled = false;
    applyBrandButton.disabled = false;
    chatApplyButton.disabled = selectionCount === 0;
    chatPreviewButton.disabled = selectionCount === 0;
    if (approveButton) approveButton.disabled = selectionCount === 0;
    const palette = Object.entries(brand.colors).map(
      ([token, hex]) => `
      <div class="swatch">
        <div class="swatch-color" style="background:${hex}"></div>
        <span>${token}</span>
        <span>${hex}</span>
      </div>`
    ).join("");
    const typography = `
    <div class="stack">
      <span class="token-pill">Font: ${brand.typography.fontFamily}</span>
      <span class="token-pill">Scale: ${brand.typography.scale.join(", ")}</span>
      <span class="token-pill">Weights: ${Object.keys(brand.typography.weights).join(", ")}</span>
    </div>
  `;
    const spacing = `
    <div class="stack">
      <span class="token-pill">Spacing base: ${brand.spacing.base}px</span>
      <span class="token-pill">Spacing scale: ${brand.spacing.scale.join(", ")}</span>
      <span class="token-pill">Radii: ${Object.entries(brand.radii).map(([k, v]) => `${k}:${v}`).join(", ")}</span>
    </div>
  `;
    brandSummary.innerHTML = `
    <div class="palette-grid">${palette}</div>
    ${typography}
    ${spacing}
  `;
    updateStatus(brandStatus, `Loaded tokens for ${brand.name}.`, "success");
  }
  function appendRationale(action, bullets) {
    const wrapper = document.createElement("div");
    wrapper.className = "rationale-item";
    const title = document.createElement("h4");
    title.textContent = action;
    wrapper.appendChild(title);
    const list = document.createElement("ul");
    bullets.forEach((bullet) => {
      const li = document.createElement("li");
      li.textContent = bullet;
      list.appendChild(li);
    });
    wrapper.appendChild(list);
    rationaleLog.prepend(wrapper);
  }
  function updateLearningSummary(snapshot) {
    const entries = Object.entries(snapshot.feedback);
    if (!entries.length && snapshot.selectionsApproved === 0) {
      learningSummary.textContent = "No feedback captured yet. Start approving layouts or recording preferences.";
      return;
    }
    const feedbackLines = entries.map(([key, stat]) => `${key}: \u{1F44D} ${stat.positive} \xB7 \u{1F44E} ${stat.negative}`).join("<br />");
    learningSummary.innerHTML = `
    Approved selections: <strong>${snapshot.selectionsApproved}</strong><br />
    ${feedbackLines || "No token feedback yet."}
  `;
  }
  function updateChatDiff(diff) {
    if (!diff || !diff.changes.length) {
      chatDiff.innerHTML = '<li class="status info">No safe changes detected for the current request.</li>';
      return;
    }
    chatDiff.innerHTML = diff.changes.map(
      (item) => `
        <li class="diff-item">
          <strong>${item.nodeName}</strong>: ${item.property} \u2192 ${formatValue(item.to)}
        </li>
      `
    ).join("");
  }
  function formatValue(value) {
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }
  function updateSelection(count) {
    selectionCount = count;
    selectionStatus.textContent = count ? `${count} node${count === 1 ? "" : "s"} selected` : "No selection";
    chatPreviewButton.disabled = count === 0;
    chatApplyButton.disabled = count === 0;
    chatRevertButton.disabled = count === 0;
    if (approveButton) approveButton.disabled = !currentBrand || count === 0;
  }
  function updateStatus(element, message, tone) {
    element.className = `status ${tone}`;
    element.textContent = message;
  }
  function getSelectionIds() {
    return [];
  }
  window.onmessage = (event) => {
    const message = event.data.pluginMessage;
    if (!message) return;
    switch (message.type) {
      case "init":
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
      case "branding-profile":
        if (message.data) {
          renderBrandSummary(message.data);
        }
        break;
      case "operation-complete":
        appendRationale(message.action, message.rationale);
        generateButton.disabled = false;
        applyBrandButton.disabled = false;
        if (approveButton) approveButton.disabled = selectionCount === 0;
        chatApplyButton.disabled = selectionCount === 0;
        updateStatus(modeStatus, `Last action: ${message.action}`, "success");
        break;
      case "operation-error":
        updateStatus(modeStatus, message.message, "warning");
        generateButton.disabled = false;
        applyBrandButton.disabled = false;
        break;
      case "selection-change":
        updateSelection(message.count);
        break;
      case "tutorial-assets":
        brandInput.value = JSON.stringify(message.sample, null, 2);
        updateStatus(brandStatus, "Sample brand loaded. Import when ready.", "info");
        break;
      case "chat-preview":
        updateChatDiff(message.diff);
        updateStatus(chatStatus, message.rationale.join(" \u2022 "), "info");
        chatApplyButton.disabled = false;
        break;
      case "chat-applied":
        updateStatus(chatStatus, message.rationale.join(" \u2022 "), "success");
        chatApplyButton.disabled = true;
        break;
    }
  };
  function postToPlugin(message) {
    parent.postMessage({ pluginMessage: message }, "*");
  }
  postToPlugin({ type: "ready" });
  postToPlugin({ type: "set-mode", mode: currentMode });
})();
