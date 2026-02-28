// Este script roda em segundo plano (service worker) para lidar com tarefas pesadas.

// Função para obter todo o histórico, paginando para não sobrecarregar.
const getAllHistory = (callback) => {
  const allResults = [];
  const seenUrls = new Set();
  let endTime;
  const fetchHistory = () => {
    const query = { text: "", maxResults: 1000, startTime: 0 };
    if (endTime !== undefined) query.endTime = endTime;
    chrome.history.search(query, (results) => {
      results.forEach((item) => {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allResults.push(item);
        }
      });

      if (results.length < 1000 || results.length === 0) {
        callback(allResults);
      } else {
        const lastItem = results[results.length - 1];
        endTime = lastItem.lastVisitTime - 1;
        fetchHistory();
      }
    });
  };
  fetchHistory();
};

// Função para converter os dados para o formato CSV.
const convertToCSV = (data, lang) => {
  if (!data || data.length === 0) return "";
  const headers = Array.from(new Set(data.flatMap((obj) => Object.keys(obj))));
  const rows = data.map((obj) => {
    const objCopy = { ...obj };
    if (objCopy.lastVisitTime != null) {
      objCopy.lastVisitTime = new Date(objCopy.lastVisitTime).toLocaleString(
        lang,
      );
    }
    return headers
      .map((header) => {
        let value = objCopy[header] ?? "";
        let stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",");
  });
  return "\ufeff" + [headers.join(","), ...rows].join("\n");
};

// Cache para as traduções para evitar fetch repetitivo
let translationsCache = null;

const getTranslations = async () => {
  if (translationsCache) return translationsCache;
  try {
    const url = chrome.runtime.getURL("traducao.json");
    const response = await fetch(url);
    translationsCache = await response.json();
    return translationsCache;
  } catch (err) {
    console.error("Erro ao carregar traduções:", err);
    return null;
  }
};

// Listener para mensagens vindas do popup.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportHistory") {
    getTranslations().then((translations) => {
      if (!translations) {
        sendResponse({
          success: false,
          message: "Erro interno ao carregar idioma.",
        });
        return;
      }

      getAllHistory((results) => {
        if (results.length === 0) {
          sendResponse({
            success: false,
            message: translations[request.lang].erroNenhumHistoricoEncontrado,
          });
          return;
        }

        const csvContent = convertToCSV(results, request.lang);
        const filename = `historico_navegacao.csv`;

        // Cria um Blob, que é a forma segura de lidar com arquivos grandes.
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });

        // URL.createObjectURL não está disponível em Service Workers.
        // Usamos FileReader para converter o Blob em Data URL.
        const reader = new FileReader();
        reader.onload = function (e) {
          const url = e.target.result;
          chrome.downloads.download(
            {
              url: url,
              filename: filename,
              saveAs: true,
            },
            (downloadId) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                sendResponse({
                  success: false,
                  message: "Falha ao iniciar o download.",
                });
              } else {
                sendResponse({ success: true });
              }
            },
          );
        };
        reader.readAsDataURL(blob);
      });
    });

    // Retorna true para indicar que a resposta será enviada de forma assíncrona.
    return true;
  }
});
