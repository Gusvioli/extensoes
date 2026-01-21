// Função para atualizar o Badge baseado na URL
function updateBadge(tabId, url) {
  if (!url) return;

  let text = "";
  let color = "";

  // Verifica URLs não suportadas
  const isUnsupported =
    url.startsWith("chrome://") ||
    url.startsWith("about:") ||
    url.includes("chrome.google.com/webstore") ||
    url.includes("chromewebstore.google.com");

  if (isUnsupported) {
    text = " ";
    color = "#d93025"; // Vermelho
  } else if (url.startsWith("http")) {
    text = " ";
    color = "#1a971a"; // Verde
  }

  chrome.action.setBadgeText({ text, tabId });
  if (color) {
    chrome.action.setBadgeBackgroundColor({ color, tabId });
  }
}

// Monitorar atualizações de URL na aba
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    updateBadge(tabId, tab.url);
  }
});

// Monitorar troca de abas
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    updateBadge(activeInfo.tabId, tab.url);
  });
});
