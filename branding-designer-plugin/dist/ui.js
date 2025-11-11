"use strict";
(() => {
  // src/ui/ui.ts
  var patterns = [
    {
      id: "hero",
      name: "Hero Banner",
      description: "Full-width launch or campaign hero for web"
    },
    {
      id: "social",
      name: "Social Spotlight",
      description: "Square/portrait storytelling for social feeds"
    },
    {
      id: "announcement",
      name: "Announcement",
      description: "Wide landscape layout for product drops"
    },
    {
      id: "email",
      name: "Email Narrative",
      description: "Editorial block for lifecycle and newsletters"
    }
  ];
  var learnButton = document.getElementById("learnButton");
  var generateButton = document.getElementById("generateButton");
  var statusElement = document.getElementById("status");
  var brandSummary = document.getElementById("brandSummary");
  var countInput = document.getElementById("countInput");
  var patternToggleGroup = document.getElementById("patternToggleGroup");
  var approveButton = document.getElementById("approveButton");
  var approvalStatus = document.getElementById("approvalStatus");
  var isGenerating = false;
  var currentProfile = null;
  var knowledgeMeta = { learnCount: 0, approvedCount: 0 };
  var selectionCount = 0;
  var selectedPatterns = /* @__PURE__ */ new Set(["hero", "social", "announcement"]);
  var sendMessage = (payload) => {
    parent.postMessage({ pluginMessage: payload }, "*");
  };
  var updateButtons = () => {
    learnButton.disabled = isGenerating;
    generateButton.disabled = isGenerating || !currentProfile;
    if (approveButton) {
      approveButton.disabled = isGenerating || !currentProfile || selectionCount === 0;
    }
  };
  var setStatus = (message, tone = "default") => {
    statusElement.textContent = "";
    statusElement.className = `status${tone === "success" ? " success" : tone === "warning" ? " warning" : ""}`;
    statusElement.textContent = message;
  };
  var renderBrandSummary = (profile, meta) => {
    const primary = profile.typography.primary;
    const secondary = profile.typography.secondary;
    const uniqueFonts = profile.typography.all.slice(0, 4);
    const colorSwatches = profile.colors.map(
      (color) => `
      <div class="swatch">
        <div class="swatch-color" style="background:${color.hex}"></div>
        <span>${color.role}</span>
        <span>${color.hex}</span>
      </div>`
    ).join("");
    const fonts = uniqueFonts.map(
      (font) => `
      <div class="font-item">
        <strong>${font.family}</strong>
        <span>${font.style}</span>
      </div>`
    ).join("");
    const tokens = `
    <div class="status success">
      Learned from ${profile.metadata.sampleCount} sample${profile.metadata.sampleCount > 1 ? "s" : ""}.
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
        ${primary ? `<div class="font-item"><strong>Primary</strong><span>${primary.family} \xB7 ${primary.style}</span></div>` : ""}
        ${secondary ? `<div class="font-item"><strong>Secondary</strong><span>${secondary.family} \xB7 ${secondary.style}</span></div>` : ""}
        ${fonts}
      </div>
    </div>
    <div>
      <h3 style="margin:12px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">DNA Tokens</h3>
      <ul style="margin:0;padding-left:18px;font-size:11px;color:#374151;display:flex;flex-direction:column;gap:6px;">
        <li>Corner radius ~ <strong>${profile.cornerRadius}px</strong></li>
        <li>Stroke weight ~ <strong>${profile.strokeWeight}px</strong></li>
        <li>Shadow styles captured: <strong>${profile.shadows.length}</strong></li>
          <li>Tone cues: <strong>${profile.narrative.toneDescriptions.join(", ")}</strong></li>
      </ul>
    </div>
      <div>
        <h3 style="margin:12px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Highlights</h3>
        <ul style="margin:0;padding-left:18px;font-size:11px;color:#047857;display:flex;flex-direction:column;gap:6px;">
          ${profile.insights.highlights.length ? profile.insights.highlights.map((item) => `<li>${item}</li>`).join("") : "<li>Provide more branded elements to surface strengths.</li>"}
        </ul>
      </div>
      <div>
        <h3 style="margin:12px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Opportunities</h3>
        <ul style="margin:0;padding-left:18px;font-size:11px;color:#B45309;display:flex;flex-direction:column;gap:6px;">
          ${profile.insights.improvementIdeas.length ? profile.insights.improvementIdeas.map((item) => `<li>${item}</li>`).join("") : "<li>Samples already cover a complete system\u2014ready to generate.</li>"}
        </ul>
      </div>
  `;
    brandSummary.innerHTML = tokens;
  };
  var renderPatternToggles = () => {
    patternToggleGroup.innerHTML = "";
    patterns.forEach((pattern) => {
      const toggle = document.createElement("div");
      toggle.className = `toggle${selectedPatterns.has(pattern.id) ? " active" : ""}`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = selectedPatterns.has(pattern.id);
      input.id = `pattern-${pattern.id}`;
      const label = document.createElement("label");
      label.setAttribute("for", input.id);
      label.style.fontSize = "11px";
      label.style.fontWeight = "600";
      label.textContent = pattern.name;
      const description = document.createElement("span");
      description.style.fontSize = "10px";
      description.style.color = "#6B7280";
      description.textContent = pattern.description;
      toggle.appendChild(input);
      toggle.appendChild(label);
      toggle.appendChild(description);
      toggle.addEventListener("click", (event) => {
        if (event.target.tagName === "INPUT") {
          return;
        }
        input.checked = !input.checked;
        input.dispatchEvent(new Event("change"));
      });
      input.addEventListener("change", () => {
        if (input.checked) {
          selectedPatterns.add(pattern.id);
        } else {
          selectedPatterns.delete(pattern.id);
        }
        if (!selectedPatterns.size) {
          selectedPatterns.add(pattern.id);
          input.checked = true;
        }
        toggle.classList.toggle("active", input.checked);
      });
      patternToggleGroup.appendChild(toggle);
    });
  };
  learnButton.addEventListener("click", () => {
    setStatus("Learning from selection\u2026", "default");
    sendMessage({ type: "learn-branding" });
  });
  generateButton.addEventListener("click", () => {
    const count = Math.max(1, Math.min(8, parseInt(countInput.value, 10) || 3));
    countInput.value = String(count);
    isGenerating = true;
    updateButtons();
    generateButton.textContent = "Generating\u2026";
    sendMessage({
      type: "generate-templates",
      data: {
        count,
        patterns: Array.from(selectedPatterns)
      }
    });
  });
  if (approveButton) {
    approveButton.addEventListener("click", () => {
      if (approveButton.disabled) {
        return;
      }
      if (approvalStatus) {
        approvalStatus.className = "status";
        approvalStatus.textContent = "Reinforcing brand with approved selection\u2026";
      }
      sendMessage({ type: "approve-selection" });
    });
  }
  window.onmessage = (event) => {
    const message = event.data.pluginMessage;
    if (!message) {
      return;
    }
    switch (message.type) {
      case "branding-profile":
        currentProfile = message.data;
        knowledgeMeta = message.meta;
        isGenerating = false;
        renderBrandSummary(message.data, knowledgeMeta);
        generateButton.textContent = "Generate branded templates";
        updateButtons();
        if (message.source === "memory") {
          setStatus("Brand DNA restored from previous sessions. Ready to generate.", "success");
        } else if (message.source === "approval") {
          setStatus("Brand DNA reinforced with your approved templates.", "success");
          if (approvalStatus) {
            approvalStatus.className = "status success";
            approvalStatus.textContent = "Selection approved. The plugin will favour this style going forward.";
          }
        } else {
          setStatus("Brand DNA captured. Ready to generate.", "success");
          if (approvalStatus && selectionCount === 0) {
            approvalStatus.className = "status";
            approvalStatus.textContent = "Select generated frames you trust, then click approve to keep training.";
          }
        }
        generateButton.textContent = "Generate branded templates";
        break;
      case "branding-error":
        currentProfile = null;
        isGenerating = false;
        brandSummary.innerHTML = '<p class="status warning">We could not learn from the selection. Try selecting branded frames.</p>';
        setStatus(message.data, "warning");
        generateButton.textContent = "Generate branded templates";
        if (approvalStatus) {
          approvalStatus.className = "status warning";
          approvalStatus.textContent = "Learn the brand before approving templates.";
        }
        updateButtons();
        break;
      case "generation-start":
        isGenerating = true;
        updateButtons();
        generateButton.textContent = "Generating\u2026";
        if (approvalStatus) {
          approvalStatus.className = "status";
          approvalStatus.textContent = "Generating layouts\u2026 select your favourites once they appear.";
        }
        break;
      case "generation-complete":
        isGenerating = false;
        generateButton.textContent = "Generate branded templates";
        updateButtons();
        setStatus("Templates created. Check your canvas!", "success");
        if (approvalStatus) {
          approvalStatus.className = "status";
          approvalStatus.textContent = "Select the new frames you like and click approve to reinforce the style.";
        }
        break;
      case "generation-error":
        isGenerating = false;
        generateButton.textContent = "Generate branded templates";
        updateButtons();
        setStatus(message.data, "warning");
        break;
      case "selection-change":
        selectionCount = message.data;
        if (!currentProfile) {
          if (selectionCount > 0) {
            setStatus(`Selection ready \xB7 ${selectionCount} node${selectionCount > 1 ? "s" : ""} selected.`, "default");
          } else {
            setStatus("Select 1\u20135 frames that reflect the brand, then click learn.", "warning");
          }
        } else if (approvalStatus) {
          if (selectionCount > 0) {
            approvalStatus.className = "status";
            approvalStatus.textContent = `Selection ready \xB7 ${selectionCount} node${selectionCount > 1 ? "s" : ""} selected. Approve to reinforce the brand.`;
          } else {
            approvalStatus.className = "status";
            approvalStatus.textContent = "Select the frames you trust, then click approve to keep learning.";
          }
        }
        updateButtons();
        break;
      case "approval-complete":
        selectionCount = 0;
        updateButtons();
        if (approvalStatus) {
          approvalStatus.className = "status success";
          approvalStatus.textContent = "Thanks! Approved selection added to the brand memory.";
        }
        break;
      case "approval-error":
        if (approvalStatus) {
          approvalStatus.className = "status warning";
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
})();
