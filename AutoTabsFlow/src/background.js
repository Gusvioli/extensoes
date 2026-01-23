import { classifyTabContext } from "./ai-service.js";

let currentGroupId = chrome.tabGroups.TAB_GROUP_ID_NONE;
let lastActiveTime = Date.now();

async function updateFocusTime() {
  const { extensionEnabled } =
    await chrome.storage.local.get("extensionEnabled");
  if (extensionEnabled === false) return;

  const now = Date.now();
  if (currentGroupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    const duration = now - lastActiveTime;
    const data = await chrome.storage.local.get("focusStats");
    const stats = data.focusStats || {};
    stats[currentGroupId] = (stats[currentGroupId] || 0) + duration;
    await chrome.storage.local.set({ focusStats: stats });
  }
  lastActiveTime = now;
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await updateFocusTime();
  try {
    const tab = await chrome.tabs.get(tabId);
    currentGroupId = tab.groupId;
  } catch (e) {
    currentGroupId = chrome.tabGroups.TAB_GROUP_ID_NONE;
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await updateFocusTime();
  currentGroupId = chrome.tabGroups.TAB_GROUP_ID_NONE;
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) currentGroupId = tab.groupId;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const { extensionEnabled } =
    await chrome.storage.local.get("extensionEnabled");
  if (extensionEnabled === false) return;

  // Verifica se o status completou OU se o título mudou (para agilizar o reconhecimento)
  if (
    (changeInfo.status === "complete" || changeInfo.title) &&
    tab.url &&
    !tab.url.startsWith("chrome://")
  ) {
    // if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) return; // Permite reagrupamento dinâmico

    try {
      let contextCategory = await classifyTabContext(tab.title || "", tab.url);
      console.log(
        `[AutoTabsFlow] Classificado: "${tab.title}" -> ${contextCategory}`,
      );

      // Fallback: Se a IA retornar Geral, usa o domínio do site como categoria
      if (contextCategory === "Geral" || contextCategory === "Outros") {
        const urlObj = new URL(tab.url);
        const domain = urlObj.hostname.replace("www.", "").split(".")[0];
        contextCategory = domain.charAt(0).toUpperCase() + domain.slice(1);
      }

      // Verifica se a aba já está no grupo correto para evitar recriação desnecessária
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        try {
          const currentGroup = await chrome.tabGroups.get(tab.groupId);
          if (currentGroup.title === contextCategory) return;
        } catch (e) {
          // Grupo pode não existir mais, prossegue para agrupar
        }
      }

      const groups = await chrome.tabGroups.query({ title: contextCategory });
      let groupId;
      let grouped = false;

      if (groups.length > 0) {
        groupId = groups[0].id;
        try {
          await chrome.tabs.group({ tabIds: tabId, groupId: groupId });
          grouped = true;
        } catch (e) {
          // Grupo não encontrado, prossegue para criar um novo
        }
      }

      if (!grouped) {
        groupId = await chrome.tabs.group({ tabIds: tabId });
        await chrome.tabGroups.update(groupId, {
          title: contextCategory,
          color: getRandomColor(),
        });
      }

      // Atualiza o grupo atual se a aba processada for a ativa
      if (tab.active) {
        currentGroupId = groupId;
      }
    } catch (error) {
      console.error("Erro no AutoTabsFlow:", error);
    }
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

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
