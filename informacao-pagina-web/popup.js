let currentTranslations = {};
let currentLang = localStorage.getItem("preferred_language") || "pt_BR";

// Função auxiliar para pegar texto traduzido
function getMsg(key) {
  return (
    (currentTranslations[key] && currentTranslations[key].message) ||
    chrome.i18n.getMessage(key) ||
    ""
  );
}

// Carregar traduções e atualizar interface
async function setLanguage(lang) {
  try {
    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    const response = await fetch(url);
    currentTranslations = await response.json();
    currentLang = lang;
    localStorage.setItem("preferred_language", lang);

    // Atualizar textos estáticos
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const msg = getMsg(key);
      if (msg) el.textContent = msg;
    });

    // Atualizar descrições e re-renderizar se houver dados
    updateFieldDescriptions();
    if (extractedData) {
      displayResults(extractedData);
    }
  } catch (e) {
    console.error("Erro ao carregar idioma:", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Configurar seletor de idioma
  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }

  // Carregar idioma inicial
  await setLanguage(currentLang);

  // Configurar abas
  const tabs = document.querySelectorAll(".tablinks");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      openTab(event, tab.getAttribute("data-tab"));
    });
  });

  // Abrir a primeira aba por padrão
  if (tabs.length > 0) {
    tabs[0].click();
  }

  // Configurar botão de exportação
  const exportBtn = document.getElementById("export-json");
  exportBtn.addEventListener("click", exportJson);

  // Configurar botão de copiar JSON
  const copyBtn = document.getElementById("copy-json");
  copyBtn.addEventListener("click", copyJsonToClipboard);

  // Criar botão para visualizar relatório completo
  const viewBtn = document.createElement("button");
  viewBtn.textContent = getMsg("btnReport") || "Ver Relatório Completo";
  viewBtn.id = "view-report";
  viewBtn.className = exportBtn.className; // Herda classes do botão existente
  viewBtn.style.marginTop = "10px";
  viewBtn.style.width = "100%";
  viewBtn.style.cursor = "pointer";
  viewBtn.setAttribute("data-i18n", "btnReport"); // Para atualização dinâmica

  viewBtn.addEventListener("click", viewReport);
  exportBtn.parentNode.insertBefore(viewBtn, exportBtn.nextSibling);

  // Configurar botão de doação PayPal
  const donateBtn = document.createElement("button");
  donateBtn.textContent = getMsg("btnDonate") || "☕ Apoiar com PayPal";
  donateBtn.setAttribute("data-i18n", "btnDonate"); // Para atualização dinâmica
  donateBtn.style.marginTop = "10px";
  donateBtn.style.marginBottom = "10px";
  donateBtn.style.width = "100%";
  donateBtn.style.cursor = "pointer";
  donateBtn.style.backgroundColor = "#0070ba"; // Cor característica do PayPal
  donateBtn.style.color = "#fff";
  donateBtn.style.border = "none";
  donateBtn.style.padding = "10px";
  donateBtn.style.borderRadius = "4px";
  donateBtn.style.fontWeight = "bold";

  const paypalContainer = document.createElement("div");
  paypalContainer.style.display = "none";
  paypalContainer.style.marginTop = "10px";
  paypalContainer.style.marginBottom = "10px";
  paypalContainer.style.padding = "15px";
  paypalContainer.style.backgroundColor = "#e3f2fd";
  paypalContainer.style.borderRadius = "8px";
  paypalContainer.style.textAlign = "center";
  paypalContainer.style.fontSize = "14px";
  paypalContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";

  // Link do PayPal com o ID do botão hospedado
  const paypalUrl =
    "https://www.paypal.com/donate?hosted_button_id=VQ9ETZ87DJW38";
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paypalUrl)}&size=120x120&margin=0`;

  paypalContainer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px;">
      <div style="text-align: center;">
        <img src="${qrCodeApiUrl}" alt="QR Code para doação" style="width: 120px; height: 120px; border-radius: 6px; background: white; padding: 5px; border: 1px solid #b0bec5;">
        <div style="font-size: 0.8em; color: #003087; margin-top: 4px;" data-i18n="scanQr">${getMsg("scanQr")}</div>
      </div>
      <div style="flex: 1;">
        <div style="font-weight:bold; color:#003087; font-size:1.1em;" data-i18n="donateTitle">${getMsg("donateTitle")}</div>
        <p style="margin: 5px 0 15px; font-size: 0.9em; color: #003087; line-height: 1.4;">
          <span data-i18n="donateDesc">${getMsg("donateDesc")}</span>
        </p>
        <button id="paypal-btn" style="background:#ffc439; color:#003087; border:none; padding:10px 20px; border-radius:20px; cursor:pointer; font-weight:bold; width:100%; font-size:1em; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" data-i18n="donateBtnLabel">${getMsg("donateBtnLabel")}</button>
      </div>
    </div>
    <div style="margin-top:12px; font-size:0.85em; color:#003087; text-align: center;" data-i18n="donateThanks">${getMsg("donateThanks")}</div>
  `;

  donateBtn.addEventListener("click", () => {
    const isHidden = paypalContainer.style.display === "none";
    paypalContainer.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      setTimeout(
        () => paypalContainer.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  });

  const openPaypalBtn = paypalContainer.querySelector("#paypal-btn");
  openPaypalBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: paypalUrl });
  });

  document.body.insertBefore(donateBtn, document.body.firstChild);
  document.body.insertBefore(paypalContainer, donateBtn.nextSibling);

  // Iniciar análise da página
  analyzePage();
});

let extractedData = null;

function openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  const tablinks = document.getElementsByClassName("tablinks");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

function showLoading() {
  const msg = getMsg("analyzing") || "Analisando...";
  const html = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div data-i18n="analyzing">${msg}</div>
    </div>
  `;

  [
    "metadata-content",
    "content-content",
    "technical-content",
    "hidden-content",
    "seo-content",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

function analyzePage() {
  showLoading();
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    // Verifica se temos permissão para injetar script (evita erro em páginas chrome://)
    if (
      !activeTab.url ||
      activeTab.url.startsWith("chrome://") ||
      activeTab.url.startsWith("chrome-extension://") ||
      activeTab.url.startsWith("about:") ||
      activeTab.url.includes("chrome.google.com/webstore") ||
      activeTab.url.includes("chromewebstore.google.com")
    ) {
      document
        .querySelectorAll(".tab, .tabcontent, .footer")
        .forEach((el) => (el.style.display = "none"));
      const msg = document.createElement("div");
      msg.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:30px; text-align:center;">
          <div style="font-size:48px; margin-bottom:15px;">⚠️</div>
          <h2 style="margin:0 0 10px; color:#d93025;">Não disponível aqui</h2>
          <p style="color:#5f6368; font-size:14px; line-height:1.5;">
            O Chrome impede que extensões acessem páginas do sistema ou a Web Store por segurança.
          </p>
        </div>
      `;
      document.body.appendChild(msg);
      chrome.runtime.sendMessage({
        type: "UPDATE_BADGE",
        status: "unsupported",
        tabId: activeTab.id,
      });
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        func: extractPageDetails,
      },
      (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) {
          const errorMsg = chrome.runtime.lastError
            ? chrome.runtime.lastError.message
            : "Erro desconhecido";
          console.error("Falha na execução:", errorMsg);
          document.getElementById("metadata-content").innerHTML =
            "<div style='padding:20px; text-align:center; color:#5f6368;'>Não foi possível ler os dados desta página.<br><small>Tente recarregar a página.</small></div>";
          chrome.runtime.sendMessage({
            type: "UPDATE_BADGE",
            status: "error",
            tabId: activeTab.id,
          });
          return;
        }

        extractedData = results[0].result;
        if (!extractedData) {
          document.getElementById("metadata-content").innerHTML =
            "<div style='padding:20px; text-align:center; color:#5f6368;'>Não foi possível obter os dados da página.</div>";
          chrome.runtime.sendMessage({
            type: "UPDATE_BADGE",
            status: "error",
            tabId: activeTab.id,
          });
          return;
        }
        if (extractedData && extractedData.error) {
          document.getElementById("metadata-content").innerHTML =
            "<div style='padding:20px; text-align:center; color:#5f6368;'>Informações indisponíveis no momento.</div>";
          chrome.runtime.sendMessage({
            type: "UPDATE_BADGE",
            status: "error",
            tabId: activeTab.id,
          });
          return;
        }
        displayResults(extractedData);
        chrome.runtime.sendMessage({
          type: "UPDATE_BADGE",
          status: "success",
          tabId: activeTab.id,
        });
      },
    );
  });
}

// Esta função é executada no contexto da página web
async function extractPageDetails() {
  try {
    // Metadados
    const allMeta = {};
    document.querySelectorAll("meta").forEach((meta) => {
      const name =
        meta.getAttribute("name") ||
        meta.getAttribute("property") ||
        meta.getAttribute("http-equiv");
      if (name) {
        allMeta[name] = meta.content;
      }
    });

    const metadata = {
      title: document.title,
      ...allMeta,
    };

    // Conteúdo
    const headers = [];
    ["h1", "h2", "h3", "h4", "h5", "h6"].forEach((tag) => {
      document.querySelectorAll(tag).forEach((el) => {
        headers.push({ tag: tag.toUpperCase(), text: el.innerText.trim() });
      });
    });

    const links = Array.from(document.querySelectorAll("a")).map((a) => ({
      text: a.innerText.trim() || "[Sem texto]",
      href: a.href,
    }));

    // Técnico
    const perf = performance.getEntriesByType("navigation")[0] || {};

    // Detecção de tecnologias (portado de content.js)
    const scripts = Array.from(document.querySelectorAll("script[src]")).map(
      (s) => (s.src || "").toLowerCase(),
    );
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]'),
    ).map((l) => l.href.toLowerCase());
    const technologies = new Set();

    scripts.forEach((script) => {
      if (script.includes("jquery")) technologies.add("jQuery");
      if (script.includes("react")) technologies.add("React");
      if (script.includes("angular")) technologies.add("Angular");
      if (script.includes("vue")) technologies.add("Vue");
      if (script.includes("bootstrap")) technologies.add("Bootstrap");
    });

    styles.forEach((style) => {
      if (style.includes("bootstrap")) technologies.add("Bootstrap");
    });

    let cookiesCount = 0;
    try {
      cookiesCount = document.cookie.split(";").filter((c) => c.trim()).length;
    } catch (e) {}

    let localStorageCount = 0;
    try {
      localStorageCount = localStorage.length;
    } catch (e) {}

    let sessionStorageCount = 0;
    try {
      sessionStorageCount = sessionStorage.length;
    } catch (e) {}

    const getSafe = (fn) => {
      try {
        return fn();
      } catch (e) {
        return "N/A";
      }
    };

    const technical = {
      loadTime: perf.loadEventEnd
        ? Math.round(perf.loadEventEnd - perf.startTime) + "ms"
        : "N/A",
      cookiesCount,
      localStorageCount,
      sessionStorageCount,
      browser: {
        userAgent: getSafe(() => navigator.userAgent),
        language: getSafe(() => navigator.language),
        platform: getSafe(() => navigator.platform),
        vendor: getSafe(() => navigator.vendor),
        cookieEnabled: getSafe(() => navigator.cookieEnabled),
        onLine: getSafe(() => navigator.onLine),
        hardwareConcurrency: getSafe(() => navigator.hardwareConcurrency),
        deviceMemory: getSafe(() => navigator.deviceMemory),
      },
      screen: {
        width: getSafe(() => screen.width),
        height: getSafe(() => screen.height),
        availWidth: getSafe(() => screen.availWidth),
        availHeight: getSafe(() => screen.availHeight),
        colorDepth: getSafe(() => screen.colorDepth),
        pixelDepth: getSafe(() => screen.pixelDepth),
        orientation: getSafe(() =>
          screen.orientation ? screen.orientation.type : "N/A",
        ),
      },
      location: {
        href: window.location.href,
        protocol: window.location.protocol,
        host: window.location.host,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        origin: window.location.origin,
      },
      document: {
        referrer: document.referrer,
        characterSet: document.characterSet,
        lastModified: document.lastModified,
        compatMode: document.compatMode,
        contentType: document.contentType,
        readyState: document.readyState,
      },
      technologies: Array.from(technologies),
    };

    // Oculto
    const hiddenInputs = Array.from(
      document.querySelectorAll("input[type='hidden']"),
    ).map((i) => ({
      name: i.name || i.id || "N/A",
      value: i.value,
    }));

    const comments = [];
    const iterator = document.createNodeIterator(
      document.documentElement,
      NodeFilter.SHOW_COMMENT,
    );
    let currentNode;
    while ((currentNode = iterator.nextNode())) {
      const val = currentNode.nodeValue.trim();
      if (val) comments.push(val);
    }

    const jsonLd = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    ).map((s) => {
      try {
        return JSON.parse(s.innerText);
      } catch (e) {
        return { error: "JSON inválido" };
      }
    });

    const iframes = Array.from(document.querySelectorAll("iframe")).map(
      (i) => i.src,
    );

    let robotsTxt = "N/A";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(window.location.origin + "/robots.txt", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const text = await response.text();
        robotsTxt =
          text.length > 500
            ? text.substring(0, 500) + "\n... (truncado)"
            : text;
      } else {
        robotsTxt = `Status: ${response.status}`;
      }
    } catch (e) {
      robotsTxt = "Não foi possível obter ou inexistente.";
    }

    const hidden = {
      hiddenInputs,
      comments: comments.slice(0, 20),
      jsonLd,
      iframes,
      accessRestrictions: {
        robotsTxt,
        metaRobots:
          document.querySelector('meta[name="robots"]')?.content || "N/A",
      },
    };

    // Análise SEO
    const titleLen = document.title ? document.title.length : 0;
    const descLen = allMeta.description ? allMeta.description.length : 0;
    const h1Count = document.querySelectorAll("h1").length;
    const imgs = document.querySelectorAll("img");
    const imgsMissingAlt = Array.from(imgs).filter((i) => !i.alt).length;
    const hasLang =
      document.documentElement.lang && document.documentElement.lang.length > 0;
    const hasOg = document.querySelector('meta[property^="og:"]') !== null;
    const hasTwitter =
      document.querySelector('meta[name^="twitter:"]') !== null;
    const hasFavicon = document.querySelector('link[rel*="icon"]') !== null;
    const robotsMeta =
      document.querySelector('meta[name="robots"]')?.content || "";
    const isIndexable = !robotsMeta.toLowerCase().includes("noindex");
    const charset = document.characterSet;
    const hasDoctype = document.doctype !== null;
    const deprecatedTagsList = [
      "center",
      "font",
      "strike",
      "u",
      "dir",
      "applet",
      "acronym",
      "big",
      "frame",
      "frameset",
      "noframes",
      "tt",
    ];
    const foundDeprecated = deprecatedTagsList.filter((tag) =>
      document.querySelector(tag),
    );
    const hasDeprecated = foundDeprecated.length > 0;

    let seoScore = 0;
    if (titleLen >= 30 && titleLen <= 60) seoScore += 10;
    if (descLen >= 50 && descLen <= 160) seoScore += 10;
    if (h1Count === 1) seoScore += 10;
    if (imgsMissingAlt === 0) seoScore += 10;
    if (document.querySelector('link[rel="canonical"]')) seoScore += 10;
    if (document.querySelector('meta[name="viewport"]')) seoScore += 10;

    if (hasLang) seoScore += 5;
    if (hasOg) seoScore += 5;
    if (hasTwitter) seoScore += 5;
    if (hasFavicon) seoScore += 5;
    if (isIndexable) seoScore += 5;
    if (charset === "UTF-8") seoScore += 5;
    if (hasDoctype) seoScore += 5;
    if (!hasDeprecated) seoScore += 5;

    const seo = {
      score: `${seoScore}/100`,
      titleCheck: [
        {
          tag: "Avaliação",
          text:
            titleLen >= 30 && titleLen <= 60
              ? `✅ Bom (${titleLen} caracteres)`
              : `⚠️ Atenção (${titleLen} caracteres).`,
        },
        {
          tag: "Motivo",
          text: "O Google exibe cerca de 60 caracteres nos resultados. Títulos muito curtos são vagos e muito longos são cortados.",
        },
        {
          tag: "Exemplo",
          text: 'Bom: "Tênis de Corrida Nike Air Zoom - Loja Esportiva" (47 chars).',
        },
      ],
      descriptionCheck: [
        {
          tag: "Avaliação",
          text:
            descLen >= 50 && descLen <= 160
              ? `✅ Bom (${descLen} caracteres)`
              : `⚠️ Atenção (${descLen} caracteres).`,
        },
        {
          tag: "Motivo",
          text: "Meta descriptions ideais têm entre 50 e 160 caracteres para atrair cliques e aparecerem completas nos snippets.",
        },
        {
          tag: "Exemplo",
          text: 'Bom: "Compre o Tênis Nike Air Zoom com o melhor preço. Frete grátis e parcelamento em até 10x. Confira nossa coleção completa." (128 chars).',
        },
      ],
      h1Check: [
        {
          tag: "Avaliação",
          text:
            h1Count === 1
              ? "✅ Bom (1 tag H1 encontrada)"
              : `⚠️ Atenção (${h1Count} tags H1).`,
        },
        {
          tag: "Motivo",
          text: "Cada página deve ter apenas um H1 principal descrevendo o tópico para manter uma hierarquia semântica clara.",
        },
        {
          tag: "Exemplo",
          text: "<h1>Tênis de Corrida Nike Air Zoom</h1> (Apenas um por página).",
        },
      ],
      imagesAltCheck: [
        {
          tag: "Avaliação",
          text:
            imgsMissingAlt === 0
              ? `✅ Bom (Todas as ${imgs.length} imagens têm alt)`
              : `⚠️ Atenção (${imgsMissingAlt} de ${imgs.length} imagens sem alt).`,
        },
        {
          tag: "Motivo",
          text: "O texto alternativo (alt) é crucial para leitores de tela (acessibilidade) e para o SEO de imagens do Google.",
        },
        {
          tag: "Exemplo",
          text: '<img src="tenis.jpg" alt="Tênis de corrida azul da marca Nike">',
        },
      ],
      canonicalCheck: [
        {
          tag: "Avaliação",
          text: document.querySelector('link[rel="canonical"]')
            ? "✅ Presente"
            : "⚠️ Ausente",
        },
        {
          tag: "Motivo",
          text: "A tag canonical indica aos buscadores qual é a versão original da página, evitando punições por conteúdo duplicado.",
        },
        {
          tag: "Exemplo",
          text: '<link rel="canonical" href="https://www.loja.com.br/produto">',
        },
      ],
      mobileFriendly: [
        {
          tag: "Avaliação",
          text: document.querySelector('meta[name="viewport"]')
            ? "✅ Tag Viewport encontrada"
            : "⚠️ Tag Viewport ausente",
        },
        {
          tag: "Motivo",
          text: "A tag viewport controla o dimensionamento em dispositivos móveis, essencial para a indexação mobile-first.",
        },
        {
          tag: "Exemplo",
          text: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        },
      ],
      langCheck: [
        {
          tag: "Avaliação",
          text: hasLang
            ? `✅ Definido (${document.documentElement.lang})`
            : "⚠️ Atributo lang ausente.",
        },
        {
          tag: "Motivo",
          text: "Definir o idioma no HTML ajuda navegadores e ferramentas de tradução a processar o conteúdo corretamente.",
        },
        {
          tag: "Exemplo",
          text: '<html lang="pt-BR">',
        },
      ],
      ogCheck: [
        {
          tag: "Avaliação",
          text: hasOg
            ? "✅ Tags Open Graph detectadas"
            : "⚠️ Tags sociais (OG) ausentes.",
        },
        {
          tag: "Motivo",
          text: "O protocolo Open Graph controla a imagem, título e descrição exibidos ao compartilhar o link em redes sociais.",
        },
        {
          tag: "Exemplo",
          text: '<meta property="og:title" content="...">, <meta property="og:image" content="...">',
        },
      ],
      faviconCheck: [
        {
          tag: "Avaliação",
          text: hasFavicon
            ? "✅ Favicon detectado"
            : "⚠️ Favicon não encontrado.",
        },
        {
          tag: "Motivo",
          text: "O ícone da página melhora a experiência do usuário (UX) e a identificação da marca nas abas do navegador.",
        },
        {
          tag: "Exemplo",
          text: '<link rel="icon" href="/favicon.ico">',
        },
      ],
      indexingCheck: [
        {
          tag: "Avaliação",
          text: isIndexable ? "✅ Página indexável" : "⚠️ Bloqueada (noindex).",
        },
        {
          tag: "Motivo",
          text: "A diretiva 'noindex' instrui os motores de busca a não incluírem esta página nos resultados da pesquisa.",
        },
        {
          tag: "Exemplo",
          text: '<meta name="robots" content="index, follow"> (Permitido)',
        },
      ],
      twitterCheck: [
        {
          tag: "Avaliação",
          text: hasTwitter
            ? "✅ Tags Twitter Card detectadas"
            : "⚠️ Tags Twitter Card ausentes.",
        },
        {
          tag: "Motivo",
          text: "As tags Twitter Card otimizam a exibição de tweets com links para o seu conteúdo, aumentando o engajamento.",
        },
        {
          tag: "Exemplo",
          text: '<meta name="twitter:card" content="summary_large_image">',
        },
      ],
      charsetCheck: [
        {
          tag: "Avaliação",
          text:
            charset === "UTF-8"
              ? `✅ UTF-8 detectado`
              : `⚠️ Codificação atual: ${charset || "Desconhecida"}.`,
        },
        {
          tag: "Motivo",
          text: "UTF-8 é o padrão mundial para codificação de caracteres, garantindo que o texto seja exibido corretamente em qualquer idioma.",
        },
        {
          tag: "Exemplo",
          text: '<meta charset="UTF-8">',
        },
      ],
      doctypeCheck: [
        {
          tag: "Avaliação",
          text: hasDoctype
            ? "✅ Doctype HTML5 presente"
            : "⚠️ Doctype ausente.",
        },
        {
          tag: "Motivo",
          text: "A declaração <!DOCTYPE html> informa ao navegador para renderizar a página no modo padrão (standards mode).",
        },
        {
          tag: "Exemplo",
          text: "<!DOCTYPE html> (Na primeira linha do arquivo)",
        },
      ],
      deprecatedCheck: [
        {
          tag: "Avaliação",
          text: !hasDeprecated
            ? "✅ Código limpo (sem tags obsoletas)"
            : `⚠️ Tags obsoletas encontradas: ${foundDeprecated.join(", ")}.`,
        },
        {
          tag: "Motivo",
          text: "Tags como <font> ou <center> são obsoletas. Use CSS para estilização para manter o código semântico e moderno.",
        },
        {
          tag: "Exemplo",
          text: "Evite: <center>Texto</center>. Use CSS: text-align: center;",
        },
      ],
    };

    return { metadata, content: { headers, links }, technical, hidden, seo };
  } catch (e) {
    return { error: e.toString() };
  }
}

let fieldDescriptions = {};

function updateFieldDescriptions() {
  fieldDescriptions = {
    title:
      getMsg("desc_title") || "Título principal exibido na aba do navegador.",
    description:
      getMsg("desc_description") ||
      "Resumo do conteúdo utilizado por motores de busca.",
    keywords:
      getMsg("desc_keywords") ||
      "Palavras-chave definidas para indexação (SEO).",
    author:
      getMsg("desc_author") || "Autor ou responsável pelo conteúdo da página.",
    headersCount: "Quantidade total de títulos (H1 a H6) encontrados.",
    linksCount: "Quantidade total de links (hiperligações) na página.",
    headersSample: "Amostra dos primeiros títulos encontrados.",
    linksSample: "Amostra dos primeiros links encontrados.",
    loadTime:
      getMsg("desc_loadTime") ||
      "Tempo total para carregar a página (navegação).",
    cookiesCount: "Número de cookies armazenados por este site.",
    localStorageCount: "Itens salvos no armazenamento local (persistente).",
    sessionStorageCount: "Itens salvos na sessão (apaga ao fechar).",
    userAgent: "Identificação do seu navegador e sistema operacional.",
    language: "Idioma preferido configurado no navegador.",
    platform: "Plataforma do sistema operacional (ex: Win32, Linux).",
    referrer: "Endereço da página anterior que levou a esta.",
    technologies:
      getMsg("desc_technologies") ||
      "Bibliotecas ou frameworks detectados na página.",
    hiddenInputs: "Campos ocultos de formulários (tokens, IDs, etc).",
    comments: "Comentários HTML no código-fonte.",
    jsonLd: "Dados estruturados JSON-LD para motores de busca.",
    iframes: "Conteúdo externo carregado via iframe.",
    accessRestrictions: "Regras de permissão e bloqueio para robôs/usuários.",
    robotsTxt: "Arquivo de regras para indexadores (crawlers).",
    metaRobots: "Instruções diretas para robôs (ex: noindex, nofollow).",
    score:
      getMsg("desc_score") ||
      "Pontuação estimada de SEO baseada nos critérios abaixo (0-100).",
    titleCheck: "Análise do tamanho do título (SEO).",
    descriptionCheck: "Análise do tamanho da meta descrição (SEO).",
    h1Check: "Verificação da tag de título principal H1.",
    imagesAltCheck: "Acessibilidade e SEO para imagens (texto alternativo).",
    canonicalCheck: "URL canônica para evitar duplicação de conteúdo.",
    mobileFriendly: "Verificação básica de responsividade (viewport).",
    langCheck: "Definição do idioma da página (tag html lang).",
    ogCheck: "Presença de meta tags para redes sociais (Open Graph).",
    faviconCheck: "Ícone da página para abas e favoritos.",
    indexingCheck: "Verifica se a página permite indexação por buscadores.",
    twitterCheck: "Tags específicas para compartilhamento no Twitter.",
    charsetCheck: "Codificação de caracteres da página (Recomendado: UTF-8).",
    doctypeCheck: "Declaração do tipo de documento HTML.",
    deprecatedCheck: "Verificação de tags HTML antigas/obsoletas.",
  };
}

function escapeHtml(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderWithExplanations(data) {
  let html =
    '<table style="width:100%; border-collapse: collapse; font-size: 13px; font-family: sans-serif;">';
  for (const [key, value] of Object.entries(data)) {
    // Formatar a chave: camelCase para Texto Legível
    const formattedKey = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      html += `<tr style="background-color: #f8f9fa;">
        <td colspan="2" style="padding: 10px; border: 1px solid #e0e0e0;">
          <strong style="color:#1a73e8; display:block; margin-bottom:6px; font-size: 1.1em;">${escapeHtml(formattedKey)}</strong>
          <div style="padding-left:0;">${renderWithExplanations(value)}</div>
        </td>
      </tr>`;
      continue;
    }

    const desc = fieldDescriptions[key];
    let displayVal = value;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        displayVal =
          '<span style="color:#9aa0a6; font-style:italic;">Nenhum</span>';
      } else if (typeof value[0] === "object") {
        displayVal =
          '<ul style="padding-left: 0; margin: 0; list-style: none;">' +
          value
            .map((item) => {
              if (item.tag && item.text)
                return `<li style="margin-bottom:4px; padding: 4px; background: #fff; border: 1px solid #dadce0; border-radius: 4px; display: flex; align-items: baseline;"><span style="background:#e8f0fe; color: #1967d2; padding:2px 8px; border-radius:12px; font-size:0.85em; font-weight:bold; margin-right:6px; min-width: 30px; text-align: center;">${escapeHtml(item.tag)}</span> <span style="flex: 1;">${escapeHtml(item.text)}</span></li>`;
              if (item.text && item.href)
                return `<li style="margin-bottom:4px; padding: 4px; background: #fff; border: 1px solid #dadce0; border-radius: 4px;"><a href="${escapeHtml(item.href)}" target="_blank" style="text-decoration:none; color:#1a73e8; font-weight:500; display: block; margin-bottom: 2px;">${escapeHtml(item.text)}</a><span style="color:#5f6368; font-size:0.85em; word-break: break-all; display: block;">${escapeHtml(item.href)}</span></li>`;
              return `<li style="margin-bottom:3px; padding: 4px; background: #fff; border: 1px solid #dadce0; border-radius: 4px;">${Object.values(
                item,
              )
                .map((v) => escapeHtml(String(v)))
                .join(" ")}</li>`;
            })
            .join("") +
          "</ul>";
      } else {
        // Array de strings (ex: tecnologias)
        displayVal = value
          .map(
            (v) =>
              `<span style="background:#e8f0fe; color:#1a73e8; padding:2px 8px; border-radius:12px; font-size:0.9em; margin-right:4px; display:inline-block; margin-bottom:4px; border: 1px solid #d2e3fc;">${escapeHtml(v)}</span>`,
          )
          .join("");
      }
    } else if (typeof value === "string") {
      if (value.startsWith("http")) {
        displayVal = `<a href="${escapeHtml(value)}" target="_blank" style="color:#1a73e8; word-break:break-all; text-decoration: none;">${escapeHtml(value)}</a>`;
      } else if (value.length > 100) {
        displayVal = escapeHtml(value.substring(0, 100) + "...");
      } else {
        displayVal = escapeHtml(value);
      }
    } else {
      displayVal = escapeHtml(String(value));
    }

    html += `<tr style="border-bottom: 1px solid #f1f3f4;">
      <td style="padding: 8px; border: 1px solid #e0e0e0; width: 35%; background-color: #fafafa; vertical-align: top;">
        <strong style="color:#202124; font-size: 0.95em;">${escapeHtml(formattedKey)}</strong>
        ${desc ? `<div style="font-size:0.8em; color:#5f6368; margin-top:4px;">${desc}</div>` : ""}
      </td>
      <td style="padding: 8px; border: 1px solid #e0e0e0; vertical-align: top; color:#3c4043; word-break:break-word;">
        ${displayVal}
      </td>
    </tr>`;
  }
  html += "</table>";
  return html;
}

function displayResults(data) {
  document.getElementById("metadata-content").innerHTML =
    renderWithExplanations(data.metadata);

  // Exibir resumo do conteúdo para não poluir demais a tela
  const contentSummary = {
    headersCount: data.content.headers.length,
    linksCount: data.content.links.length,
    headersSample: data.content.headers.slice(0, 5),
    linksSample: data.content.links.slice(0, 5),
  };
  document.getElementById("content-content").innerHTML =
    renderWithExplanations(contentSummary);

  document.getElementById("technical-content").innerHTML =
    renderWithExplanations(data.technical);

  document.getElementById("hidden-content").innerHTML = renderWithExplanations(
    data.hidden,
  );

  // Lógica especial para a aba SEO para destacar o score
  const seoContentEl = document.getElementById("seo-content");
  let seoHtml = "";
  const { score, ...otherSeoData } = data.seo;

  if (score && typeof score === "string") {
    const [scoreValue, maxScore] = score.split("/").map(Number);
    if (!isNaN(scoreValue) && !isNaN(maxScore)) {
      const percentage = maxScore > 0 ? (scoreValue / maxScore) * 100 : 0;
      let color = "#d93025"; // Vermelho
      if (percentage >= 80) {
        color = "#34a853"; // Verde
      } else if (percentage >= 50) {
        color = "#fbbc05"; // Amarelo
      }
      const desc = fieldDescriptions["score"];

      seoHtml += `
        <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e0e0e0;">
            <div style="font-size: 1.1em; font-weight: bold; color: #202124; margin-bottom: 8px;">${getMsg("report_seoScore")}</div>
            ${desc ? `<div style="font-size:0.8em; color:#5f6368; margin-bottom:12px;">${desc}</div>` : ""}
            <div style="background-color: #e9ecef; border-radius: 20px; overflow: hidden; border: 1px solid #dee2e6;">
                <div style="width: ${percentage}%; background-color: ${color}; padding: 4px 0; transition: width 0.5s ease-out;"></div>
            </div>
            <div style="font-size: 2.5em; font-weight: bold; color: ${color}; margin-top: 8px;">
                ${scoreValue}<span style="font-size: 0.5em; color: #5f6368;"> / ${maxScore}</span>
            </div>
        </div>
      `;
    }
  }

  // Renderiza o resto dos dados de SEO em uma tabela
  seoHtml += renderWithExplanations(otherSeoData);
  seoContentEl.innerHTML = seoHtml;
}

function exportJson() {
  if (!extractedData) return;

  // Envia os dados para o background script iniciar o download.
  // Isso impede que o download falhe caso o popup feche (ex: ao abrir "Salvar como").
  chrome.runtime.sendMessage({
    type: "DOWNLOAD_DATA",
    data: extractedData,
  });
}

function copyJsonToClipboard() {
  if (!extractedData) return;

  const jsonString = JSON.stringify(extractedData, null, 2);
  navigator.clipboard.writeText(jsonString).then(() => {
    const btn = document.getElementById("copy-json");
    const originalText = btn.textContent;
    btn.textContent = getMsg("msgCopied") || "Copiado!";
    setTimeout(() => {
      btn.textContent = getMsg("btnCopy") || "Copiar JSON";
    }, 2000);
  });
}

function viewReport() {
  if (!extractedData) return;

  // Preparar HTML do Score de SEO para o relatório
  let seoHtml = "";
  if (extractedData.seo) {
    const { score, ...otherSeoData } = extractedData.seo;

    if (score && typeof score === "string") {
      const [scoreValue, maxScore] = score.split("/").map(Number);
      if (!isNaN(scoreValue) && !isNaN(maxScore)) {
        const percentage = maxScore > 0 ? (scoreValue / maxScore) * 100 : 0;
        let color = "#d93025"; // Vermelho
        if (percentage >= 80)
          color = "#34a853"; // Verde
        else if (percentage >= 50) color = "#fbbc05"; // Amarelo

        seoHtml += `
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0; max-width: 500px; margin-left: auto; margin-right: auto;">
              <div style="font-size: 1.4em; font-weight: bold; color: #202124; margin-bottom: 10px;">${getMsg("report_seoScore")}</div>
              <div style="background-color: #e9ecef; border-radius: 20px; overflow: hidden; border: 1px solid #dee2e6; height: 15px;">
                  <div style="width: ${percentage}%; background-color: ${color}; height: 100%;"></div>
              </div>
              <div style="font-size: 3.5em; font-weight: bold; color: ${color}; margin-top: 10px; line-height: 1;">
                  ${scoreValue}<span style="font-size: 0.5em; color: #5f6368;"> / ${maxScore}</span>
              </div>
          </div>`;
      }
    }
    seoHtml += renderWithExplanations(otherSeoData);
  }

  // Gráfico de distribuição de headers (H1-H6)
  let headerChartHtml = "";
  if (extractedData.content && extractedData.content.headers) {
    const headerCounts = { H1: 0, H2: 0, H3: 0, H4: 0, H5: 0, H6: 0 };
    extractedData.content.headers.forEach((h) => {
      const tag = h.tag.toUpperCase();
      if (headerCounts[tag] !== undefined) headerCounts[tag]++;
    });

    const maxCount = Math.max(...Object.values(headerCounts));

    headerChartHtml = `
      <div style="margin-bottom: 30px; padding: 20px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; margin-bottom: 20px; color: #202124; font-size: 1.1em; border-bottom: 1px solid #eee; padding-bottom: 10px;">${getMsg("report_chartTitle") || "Distribuição de Cabeçalhos (H1-H6)"}</h3>
          <div style="display: flex; align-items: flex-end; height: 160px; gap: 15px; padding: 0 10px;">
    `;

    for (let i = 1; i <= 6; i++) {
      const tag = `H${i}`;
      const count = headerCounts[tag];
      const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
      const barColor = count > 0 ? "#1a73e8" : "#e0e0e0";

      headerChartHtml += `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%;">
              <div style="flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px;">
                  <div style="width: 100%; max-width: 40px; background-color: ${barColor}; border-radius: 4px 4px 0 0; height: ${heightPct}%; min-height: ${count > 0 ? 4 : 1}px; position: relative;">
                      ${count > 0 ? `<span style="position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #555; font-weight: bold;">${count}</span>` : ""}
                  </div>
              </div>
              <div style="font-weight: bold; color: #5f6368; font-size: 13px; border-top: 1px solid #eee; width: 100%; text-align: center; padding-top: 5px;">${tag}</div>
          </div>
        `;
    }
    headerChartHtml += `</div></div>`;
  }

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${getMsg("report_title")}${escapeHtml(extractedData.metadata.title || getMsg("report_defaultTitle"))}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #f8f9fa; color: #333; margin: 0; }
        .container { max-width: 1200px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1a73e8; border-bottom: 2px solid #e8f0fe; padding-bottom: 15px; margin-top: 0; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #202124; font-size: 1.5em; margin-bottom: 15px; border-left: 4px solid #1a73e8; padding-left: 10px; }
        
        /* Sobrescreve estilos inline da tabela gerada para melhor leitura em tela cheia */
        table { width: 100%; border-collapse: collapse; font-size: 14px !important; font-family: sans-serif; }
        td { padding: 12px !important; border: 1px solid #e0e0e0; }
        tr:nth-child(even) { background-color: #fcfcfc; }
        
        ul { margin: 0; padding-left: 20px; }
        li { margin-bottom: 5px; }
        a { color: #1a73e8; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${getMsg("report_analysisTitle")}${escapeHtml(extractedData.metadata.title || getMsg("report_pageDefault"))}</h1>
        
        <div class="section">
          <h2>${getMsg("tabMetadata")}</h2>
          ${headerChartHtml}
          ${renderWithExplanations(extractedData.metadata)}
        </div>

        <div class="section">
          <h2>${getMsg("report_sectionContent")}</h2>
          ${renderWithExplanations(extractedData.content)}
        </div>

        <div class="section">
          <h2>${getMsg("report_sectionTechnical")}</h2>
          ${renderWithExplanations(extractedData.technical)}
        </div>

        <div class="section">
          <h2>${getMsg("report_sectionHidden")}</h2>
          ${renderWithExplanations(extractedData.hidden)}
        </div>

        <div class="section">
          <h2>${getMsg("report_sectionSeo")}</h2>
          ${seoHtml}
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 0.9em;">
          ${getMsg("report_footer")}${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([reportHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url: url });
}
