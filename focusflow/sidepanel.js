import { summarizeContext } from "./ai-service.js";

document.addEventListener("DOMContentLoaded", loadGroups);
document
  .getElementById("clear-distractions")
  .addEventListener("click", clearDistractions);

let debounceTimeout;
function debouncedLoadGroups() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(loadGroups, 150);
}

async function loadGroups() {
  const groups = await chrome.tabGroups.query({});
  const storage = await chrome.storage.local.get("focusStats");
  const stats = storage.focusStats || {};

  // Pre-fetch tabs to avoid async rendering issues
  const groupsData = await Promise.all(
    groups.map(async (group) => {
      const tabs = await chrome.tabs.query({ groupId: group.id });
      return { group, tabs };
    }),
  );

  const container = document.getElementById("flows-container");
  container.innerHTML = "";

  if (groupsData.length === 0) {
    container.innerHTML =
      '<p style="font-size:12px">Nenhum grupo ativo. Comece a navegar!</p>';
    return;
  }

  for (const { group, tabs } of groupsData) {
    const timeMs = stats[group.id] || 0;
    const timeStr = formatTime(timeMs);

    const card = document.createElement("div");
    card.className = "card";
    card.style.borderLeftColor = group.color;
    card.innerHTML = `
      <h3>${group.title || "Sem Nome"} <span class="badge">${tabs.length} abas</span></h3>
      <span class="time-badge">⏱️ Foco: ${timeStr}</span>
      <button class="btn btn-focus" data-id="${group.id}">🎯 Modo Túnel de Foco</button>
      <button class="btn btn-summary" data-id="${group.id}">📝 Gerar Resumo</button>
      <div class="summary" id="summary-${group.id}"></div>
    `;
    container.appendChild(card);
  }

  document
    .querySelectorAll(".btn-focus")
    .forEach((b) =>
      b.addEventListener("click", (e) => toggleFocusMode(e.target.dataset.id)),
    );
  document
    .querySelectorAll(".btn-summary")
    .forEach((b) =>
      b.addEventListener("click", (e) => generateSummary(e.target.dataset.id)),
    );
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
    if (group.collapsed !== shouldCollapse)
      await chrome.tabGroups.update(group.id, { collapsed: shouldCollapse });
  }
}

async function generateSummary(groupId) {
  groupId = parseInt(groupId);
  const summaryDiv = document.getElementById(`summary-${groupId}`);
  summaryDiv.style.display = "block";
  summaryDiv.innerText = "✨ A IA está lendo suas abas...";
  const group = await chrome.tabGroups.get(groupId);
  const tabs = await chrome.tabs.query({ groupId: groupId });
  const summary = await summarizeContext(group.title, tabs);
  summaryDiv.innerText = summary;
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
    loadGroups();
  } else if (idsToRemove.length === 0) {
    alert("Nenhuma distração encontrada!");
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

chrome.tabGroups.onUpdated.addListener(debouncedLoadGroups);
chrome.tabGroups.onCreated.addListener(debouncedLoadGroups);
chrome.tabGroups.onRemoved.addListener(debouncedLoadGroups);
chrome.tabs.onAttached.addListener(debouncedLoadGroups);
chrome.tabs.onDetached.addListener(debouncedLoadGroups);
chrome.tabs.onRemoved.addListener(debouncedLoadGroups);
