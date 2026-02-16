// Service Worker do 5uv1

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extensão 5uv1 instalada com sucesso.");

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
