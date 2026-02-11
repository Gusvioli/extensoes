// Service Worker do P2P Secure Chat

chrome.runtime.onInstalled.addListener(() => {
  console.log("P2P Secure Chat Extension instalada com sucesso.");

  // Inicializa storage se necessário
  chrome.storage.local.get(["serverUrl"], (result) => {
    if (!result.serverUrl) {
      chrome.storage.local.set({ serverUrl: "ws://localhost:8080" });
    }
  });
});

chrome.action.onClicked.addListener((tab) => {
  // Abre o painel lateral na janela atual ao clicar no ícone
  chrome.sidePanel.open({ windowId: tab.windowId });
});
