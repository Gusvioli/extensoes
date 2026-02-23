// Função para atualizar o Badge baseado na URL
function updateBadge(tabId, status, url) {
  let text = "";
  let color = "";

  if (status === "success") {
    text = "On";
    color = "#1a971a"; // Verde
  } else if (status === "error") {
    text = "Err";
    color = "#f29900"; // Laranja
  } else {
    // Lógica original baseada na URL
    const isUnsupported =
      !url ||
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("about:") ||
      url.includes("chrome.google.com/webstore") ||
      url.includes("chromewebstore.google.com");

    if (isUnsupported) {
      text = "Off";
      color = "#d93025"; // Vermelho
    } else if (url.startsWith("http")) {
      text = "On";
      color = "#1a971a"; // Verde
    }
  }

  chrome.action.setBadgeText({ text, tabId });
  if (color) {
    chrome.action.setBadgeBackgroundColor({ color, tabId });
  }
}

// Monitorar atualizações de URL na aba
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Atualiza apenas se a URL mudar, para não interferir com o status 'success' ou 'error' do popup
  if (changeInfo.url) {
    updateBadge(tabId, "url", tab.url);
  }
});

// Monitorar troca de abas
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    updateBadge(activeInfo.tabId, "url", tab.url);
  });
});

// Ouvir mensagens do popup para atualizar o badge
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "UPDATE_BADGE") {
    updateBadge(request.tabId, request.status);
  } else if (request.type === "DOWNLOAD_DATA") {
    // Processa o download no background para evitar falhas se o popup fechar
    const jsonString = JSON.stringify(request.data, null, 2);
    // Codifica para Base64 (suporte a UTF-8) para criar uma Data URL segura
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    const url = `data:application/json;base64,${base64}`;
    const filename = `analise-${new Date().toISOString().slice(0, 10)}.json`;

    chrome.downloads.download({ url, filename });
  }
});
