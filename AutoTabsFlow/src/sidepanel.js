import { summarizeContext, classifyTabContext } from "./ai-service.js";

class GroupCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set data({ group, tabs, timeStr }) {
    this.group = group;
    this.tabs = tabs;
    this.render(timeStr);
  }

  render(timeStr) {
    const style = `
      <style>
        :host { display: block; }
        .card { background: white; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 5px solid #ccc; font-family: 'Segoe UI', sans-serif; }
        .card h3 { margin: 0 0 4px 0; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color: #333; }
        .btn { background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%; margin-top: 8px; transition: background 0.2s; }
        .btn:hover { background: #2980b9; }
        .btn-focus { background: #27ae60; }
        .btn-focus:hover { background: #219150; }
        .summary { font-size: 12px; color: #666; margin-top: 8px; line-height: 1.4; background: #f0f4f8; padding: 8px; border-radius: 4px; display: none; }
        .badge { font-size: 10px; background: #eee; padding: 2px 6px; border-radius: 10px; font-weight: normal; color: #555; }
        .time-badge { font-size: 11px; color: #7f8c8d; display: block; margin-bottom: 8px; }
        .group-title-text { cursor: pointer; border-bottom: 1px dashed #ccc; }
        .title-input { width: 60%; font-size: 14px; }
      </style>
    `;

    this.shadowRoot.innerHTML = `
      ${style}
      <div class="card" style="border-left-color: ${this.group.color}">
        <h3>
          <span class="group-title-text" id="group-title">${this.group.title || "Sem Nome"}</span>
          <span class="badge">${this.tabs.length} abas</span>
        </h3>
        <span class="time-badge">⏱️ Foco: ${timeStr}</span>
        <button class="btn btn-focus" id="btn-focus">🎯 Modo Túnel de Foco</button>
        <button class="btn btn-summary" id="btn-summary">📝 Gerar Resumo</button>
        <div class="summary" id="summary-content"></div>
      </div>
    `;

    this.shadowRoot
      .getElementById("btn-focus")
      .addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("focus-mode", {
            detail: { groupId: this.group.id },
            bubbles: true,
            composed: true,
          }),
        );
      });

    this.shadowRoot
      .getElementById("btn-summary")
      .addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("generate-summary", {
            detail: { groupId: this.group.id },
            bubbles: true,
            composed: true,
          }),
        );
      });

    const titleEl = this.shadowRoot.getElementById("group-title");
    titleEl.addEventListener("click", () => this.makeTitleEditable(titleEl));
  }

  showSummary(text) {
    const el = this.shadowRoot.getElementById("summary-content");
    if (el) {
      el.style.display = "block";
      el.innerText = text;
    }
  }

  makeTitleEditable(titleSpan) {
    const oldTitle = titleSpan.innerText;
    const h3 = titleSpan.parentElement;
    const input = document.createElement("input");
    input.type = "text";
    input.value = oldTitle;
    input.className = "title-input";
    h3.insertBefore(input, titleSpan);
    titleSpan.style.display = "none";
    input.focus();
    input.select();
    const saveTitle = () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== oldTitle) {
        this.dispatchEvent(
          new CustomEvent("update-title", {
            detail: { groupId: this.group.id, title: newTitle },
            bubbles: true,
            composed: true,
          }),
        );
      }
      input.remove();
      titleSpan.style.display = "inline";
    };
    input.addEventListener("blur", saveTitle);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
    });
  }
}

customElements.define("group-card", GroupCard);

document.addEventListener("DOMContentLoaded", loadGroups);
document
  .getElementById("clear-distractions")
  .addEventListener("click", clearDistractions);
document
  .getElementById("toggle-groups")
  .addEventListener("click", toggleGroups);
document
  .getElementById("expand-all")
  .addEventListener("click", toggleExpandAll);
document
  .getElementById("toggle-extension")
  .addEventListener("click", toggleExtension);
document.getElementById("save-session").addEventListener("click", saveSession);
document
  .getElementById("restore-session")
  .addEventListener("click", restoreSession);
document
  .getElementById("delete-session")
  .addEventListener("click", deleteSession);

// Event delegation for Shadow DOM events
const container = document.getElementById("flows-container");
container.addEventListener("focus-mode", (e) =>
  toggleFocusMode(e.detail.groupId),
);
container.addEventListener("generate-summary", (e) =>
  generateSummary(e.target, e.detail.groupId),
);
container.addEventListener("update-title", async (e) => {
  await chrome.tabGroups.update(parseInt(e.detail.groupId), {
    title: e.detail.title,
  });
});

// Helper function to manage button state during async operations
function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = "⏳ Carregando...";
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || "";
  }
}

let debounceTimeout;
function debouncedLoadGroups() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(loadGroups, 150);
}

async function loadGroups() {
  const groups = await chrome.tabGroups.query({});
  const storage = await chrome.storage.local.get([
    "focusStats",
    "extensionEnabled",
  ]);
  const stats = storage.focusStats || {};
  const isEnabled = storage.extensionEnabled !== false; // Padrão é true

  updateExtensionStatus(isEnabled);
  updateSessionList();

  // Pre-fetch tabs to avoid async rendering issues
  const groupsData = await Promise.all(
    groups.map(async (group) => {
      const tabs = await chrome.tabs.query({ groupId: group.id });
      return { group, tabs };
    }),
  );

  const container = document.getElementById("flows-container");
  container.innerHTML = "";

  // Atualiza o estado do botão de alternância de grupos
  const toggleBtn = document.getElementById("toggle-groups");
  if (toggleBtn) {
    const hasGroups = groups.length > 0;
    toggleBtn.innerText = hasGroups
      ? "🔓 Desagrupar Tudo"
      : "🔄 Reagrupar Tudo";
    toggleBtn.style.backgroundColor = hasGroups ? "#f39c12" : "#9b59b6";
  }

  // Atualiza o estado do botão expandir/colapsar
  const expandBtn = document.getElementById("expand-all");
  if (expandBtn) {
    const allExpanded = groups.length > 0 && groups.every((g) => !g.collapsed);
    expandBtn.innerText = allExpanded ? "📁 Colapsar Tudo" : "📂 Expandir Tudo";
  }

  if (groupsData.length === 0) {
    container.innerHTML =
      '<p style="font-size:12px">Nenhum grupo ativo. Comece a navegar!</p>';
    return;
  }

  for (const { group, tabs } of groupsData) {
    const timeMs = stats[group.id] || 0;
    const timeStr = formatTime(timeMs);

    const card = document.createElement("group-card");
    card.data = { group, tabs, timeStr };
    container.appendChild(card);
  }
}

async function toggleFocusMode(targetGroupId) {
  targetGroupId = parseInt(targetGroupId);
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (activeTab && activeTab.groupId !== targetGroupId) {
    const tabs = await chrome.tabs.query({ groupId: targetGroupId });
    if (tabs.length > 0) await chrome.tabs.update(tabs[0].id, { active: true });
  }

  const allGroups = await chrome.tabGroups.query({});
  for (const group of allGroups) {
    const shouldCollapse = group.id !== targetGroupId;
    if (group.collapsed !== shouldCollapse) {
      await chrome.tabGroups.update(group.id, { collapsed: shouldCollapse });
    }
  }
}

async function generateSummary(cardElement, groupId) {
  groupId = parseInt(groupId);
  if (cardElement && cardElement.showSummary) {
    cardElement.showSummary("✨ A IA está lendo suas abas...");
    const group = await chrome.tabGroups.get(groupId);
    const tabs = await chrome.tabs.query({ groupId: groupId });
    const summary = await summarizeContext(group.title, tabs);
    cardElement.showSummary(summary);
  }
}

async function clearDistractions() {
  const ungroupedTabs = await chrome.tabs.query({
    groupId: chrome.tabGroups.TAB_GROUP_ID_NONE,
  });
  const idsToRemove = ungroupedTabs.map((t) => t.id);
  if (
    idsToRemove.length > 0 &&
    confirm(`Fechar ${idsToRemove.length} abas soltas?`)
  ) {
    await chrome.tabs.remove(idsToRemove);
  } else if (idsToRemove.length === 0) {
    alert("Nenhuma distração encontrada!");
  }
}

async function toggleGroups() {
  const tabs = await chrome.tabs.query({});
  const groups = await chrome.tabGroups.query({});
  const hasGroups = groups.length > 0;
  const btn = document.getElementById("toggle-groups");

  if (hasGroups) {
    // Lógica de Desagrupar
    const groupedTabs = tabs.filter(
      (t) => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE,
    );
    const idsToUngroup = groupedTabs.map((t) => t.id);

    if (idsToUngroup.length > 0) {
      if (confirm(`Deseja desagrupar ${idsToUngroup.length} abas?`)) {
        await chrome.tabs.ungroup(idsToUngroup);
      }
    } else {
      alert("Nenhuma aba agrupada encontrada!");
    }
  } else {
    // Lógica de Reagrupar
    if (!confirm("Deseja reorganizar todas as abas automaticamente?")) return;

    setButtonLoading(btn, true);

    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith("chrome://")) continue;

      try {
        let contextCategory = await classifyTabContext(
          tab.title || "",
          tab.url,
        );

        if (contextCategory === "Geral" || contextCategory === "Outros") {
          try {
            const urlObj = new URL(tab.url);
            const domain = urlObj.hostname.replace("www.", "").split(".")[0];
            contextCategory = domain.charAt(0).toUpperCase() + domain.slice(1);
          } catch (e) {}
        }

        const groups = await chrome.tabGroups.query({ title: contextCategory });
        let groupId;

        if (groups.length > 0) {
          groupId = groups[0].id;
          await chrome.tabs.group({ tabIds: tab.id, groupId: groupId });
        } else {
          groupId = await chrome.tabs.group({ tabIds: tab.id });
          await chrome.tabGroups.update(groupId, {
            title: contextCategory,
            color: getRandomColor(),
          });
        }
      } catch (error) {
        console.error("Erro ao reagrupar:", error);
      }
    }
  }
}

async function toggleExpandAll() {
  const groups = await chrome.tabGroups.query({});
  const allExpanded = groups.every((g) => !g.collapsed);
  const shouldCollapse = allExpanded;

  for (const group of groups) {
    await chrome.tabGroups.update(group.id, { collapsed: shouldCollapse });
  }

  const btn = document.getElementById("expand-all");
  if (btn)
    btn.innerText = shouldCollapse ? "📂 Expandir Tudo" : "📁 Colapsar Tudo";
}

async function toggleExtension() {
  const storage = await chrome.storage.local.get("extensionEnabled");
  const newState = !(storage.extensionEnabled !== false);
  await chrome.storage.local.set({ extensionEnabled: newState });
  updateExtensionStatus(newState);
}

function updateExtensionStatus(enabled) {
  const btn = document.getElementById("toggle-extension");
  if (btn) {
    if (enabled) {
      btn.innerText = "✅ Extensão Ativa";
      btn.style.backgroundColor = "#27ae60";
    } else {
      btn.innerText = "❌ Extensão Desativada";
      btn.style.backgroundColor = "#7f8c8d";
    }
  }
}

async function saveSession() {
  const sessionName = prompt(
    "Digite um nome para a sessão:",
    new Date().toLocaleString(),
  );
  if (!sessionName) return;

  const groups = await chrome.tabGroups.query({});
  if (groups.length === 0) {
    alert("Nenhuma sessão ativa para salvar.");
    return;
  }

  const newSessionData = [];
  for (const group of groups) {
    const tabs = await chrome.tabs.query({ groupId: group.id });
    newSessionData.push({
      title: group.title,
      color: group.color,
      collapsed: group.collapsed,
      tabs: tabs.map((t) => ({ url: t.url })),
    });
  }

  const { savedSessions = {} } =
    await chrome.storage.local.get("savedSessions");
  savedSessions[sessionName] = newSessionData;

  await chrome.storage.local.set({ savedSessions });
  alert(`Sessão "${sessionName}" salva com sucesso!`);
  updateSessionList();
}

async function restoreSession() {
  const sessionList = document.getElementById("session-list");
  const sessionName = sessionList.value;
  const restoreBtn = document.getElementById("restore-session");

  if (!sessionName) {
    alert("Por favor, selecione uma sessão para restaurar.");
    return;
  }

  const { savedSessions } = await chrome.storage.local.get("savedSessions");
  const sessionToRestore = savedSessions[sessionName];

  if (!sessionToRestore) {
    alert("Nenhuma sessão salva para restaurar.");
    return;
  }

  if (!confirm(`Restaurar a sessão "${sessionName}" em uma nova janela?`))
    return;

  setButtonLoading(restoreBtn, true);

  const newWindow = await chrome.windows.create({ focused: true });

  for (const groupData of sessionToRestore) {
    const tabUrls = groupData.tabs.map((t) => t.url);
    if (tabUrls.length === 0) continue;

    const newTabs = await Promise.all(
      tabUrls.map((url) =>
        chrome.tabs.create({ windowId: newWindow.id, url, active: false }),
      ),
    );
    const newTabIds = newTabs.map((t) => t.id);

    const groupId = await chrome.tabs.group({
      tabIds: newTabIds,
      createProperties: { windowId: newWindow.id },
    });
    await chrome.tabGroups.update(groupId, {
      title: groupData.title,
      color: groupData.color,
      collapsed: groupData.collapsed,
    });
  }

  const [blankTab] = await chrome.tabs.query({
    windowId: newWindow.id,
    index: 0,
  });
  if (
    blankTab &&
    (blankTab.url === "chrome://newtab/" || blankTab.url === "about:blank")
  ) {
    await chrome.tabs.remove(blankTab.id);
  }

  setButtonLoading(restoreBtn, false);
}

async function deleteSession() {
  const sessionList = document.getElementById("session-list");
  const sessionName = sessionList.value;
  if (!sessionName) {
    alert("Por favor, selecione uma sessão para deletar.");
    return;
  }

  if (confirm(`Tem certeza que deseja deletar a sessão "${sessionName}"?`)) {
    const { savedSessions = {} } =
      await chrome.storage.local.get("savedSessions");
    delete savedSessions[sessionName];
    await chrome.storage.local.set({ savedSessions });
    alert(`Sessão "${sessionName}" deletada.`);
    updateSessionList();
  }
}

async function updateSessionList() {
  const { savedSessions = {} } =
    await chrome.storage.local.get("savedSessions");
  const sessionList = document.getElementById("session-list");
  const restoreBtn = document.getElementById("restore-session");
  const deleteBtn = document.getElementById("delete-session");

  sessionList.innerHTML = "";
  const sessionNames = Object.keys(savedSessions);

  if (sessionNames.length === 0) {
    sessionList.style.display = "none";
    restoreBtn.style.display = "none";
    deleteBtn.style.display = "none";
  } else {
    sessionList.style.display = "block";
    restoreBtn.style.display = "block";
    deleteBtn.style.display = "block";
    sessionNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.innerText = name;
      sessionList.appendChild(option);
    });
  }
}

function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getRandomColor() {
  const colors = [
    "grey",
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

chrome.tabGroups.onUpdated.addListener(debouncedLoadGroups);
chrome.tabGroups.onCreated.addListener(debouncedLoadGroups);
chrome.tabGroups.onRemoved.addListener(debouncedLoadGroups);
chrome.tabs.onAttached.addListener(debouncedLoadGroups);
chrome.tabs.onDetached.addListener(debouncedLoadGroups);
chrome.tabs.onRemoved.addListener(debouncedLoadGroups);
