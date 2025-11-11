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
  var isGenerating = false;
  var currentProfile = null;
  var selectedPatterns = /* @__PURE__ */ new Set(["hero", "social", "announcement"]);
  var sendMessage = (payload) => {
    parent.postMessage({ pluginMessage: payload }, "*");
  };
  var updateButtons = () => {
    learnButton.disabled = isGenerating;
    generateButton.disabled = isGenerating || !currentProfile;
  };
  var setStatus = (message, tone = "default") => {
    statusElement.textContent = "";
    statusElement.className = `status${tone === "success" ? " success" : tone === "warning" ? " warning" : ""}`;
    statusElement.textContent = message;
  };
  var renderBrandSummary = (profile) => {
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
  window.onmessage = (event) => {
    const message = event.data.pluginMessage;
    if (!message) {
      return;
    }
    switch (message.type) {
      case "branding-profile":
        currentProfile = message.data;
        isGenerating = false;
        renderBrandSummary(message.data);
        setStatus("Brand DNA captured. Ready to generate.", "success");
        generateButton.textContent = "Generate branded templates";
        updateButtons();
        break;
      case "branding-error":
        currentProfile = null;
        isGenerating = false;
        brandSummary.innerHTML = '<p class="status warning">We could not learn from the selection. Try selecting branded frames.</p>';
        setStatus(message.data, "warning");
        generateButton.textContent = "Generate branded templates";
        updateButtons();
        break;
      case "generation-start":
        isGenerating = true;
        updateButtons();
        generateButton.textContent = "Generating\u2026";
        break;
      case "generation-complete":
        isGenerating = false;
        generateButton.textContent = "Generate branded templates";
        updateButtons();
        setStatus("Templates created. Check your canvas!", "success");
        break;
      case "generation-error":
        isGenerating = false;
        generateButton.textContent = "Generate branded templates";
        updateButtons();
        setStatus(message.data, "warning");
        break;
      case "selection-change":
        if (!currentProfile) {
          const count = message.data;
          if (count > 0) {
            setStatus(`Selection ready \xB7 ${count} node${count > 1 ? "s" : ""} selected.`, "default");
          } else {
            setStatus("Select 1\u20135 frames that reflect the brand, then click learn.", "warning");
          }
        }
        break;
      default:
        break;
    }
  };
  renderPatternToggles();
  updateButtons();
})();
