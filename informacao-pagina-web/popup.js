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
        world: "MAIN",
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

    // Verificação de variáveis globais (requer world: "MAIN")
    try {
      if (window.jQuery || (window.$ && window.$.fn && window.$.fn.jquery))
        technologies.add("jQuery");
      if (window.React || window.ReactDOM) technologies.add("React");
      if (window.Vue || window.__VUE__) technologies.add("Vue.js");
      if (window.angular) technologies.add("Angular");
      if (window.bootstrap) technologies.add("Bootstrap");
      if (window.google_tag_manager) technologies.add("Google Tag Manager");
      if (window.ga || window.gtag) technologies.add("Google Analytics");
      if (window.fbq) technologies.add("Facebook Pixel");
      if (window.wp) technologies.add("WordPress");
      if (window.Shopify) technologies.add("Shopify");
      if (window.Next || window.__NEXT_DATA__) technologies.add("Next.js");
      if (window.__NUXT__) technologies.add("Nuxt.js");
    } catch (e) {}

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

    // Core Web Vitals (LCP e CLS)
    let lcp = "N/A";
    try {
      const lcpEntries = performance.getEntriesByType(
        "largest-contentful-paint",
      );
      if (lcpEntries.length > 0) {
        lcp = Math.round(lcpEntries.at(-1).startTime) + "ms";
      }
    } catch (e) {}

    let cls = "N/A";
    try {
      const clsEntries = performance.getEntriesByType("layout-shift");
      if (clsEntries) {
        const clsVal = clsEntries.reduce(
          (acc, entry) => acc + (entry.hadRecentInput ? 0 : entry.value),
          0,
        );
        cls = clsVal.toFixed(3);
      }
    } catch (e) {}

    // Análise de Scripts (Resource Timing)
    let scriptsAnalysis = [];
    try {
      const resources = performance.getEntriesByType("resource");
      scriptsAnalysis = resources
        .filter((r) => r.initiatorType === "script" || r.name.includes(".js"))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map((r) => {
          const duration = Math.round(r.duration);
          const isSlow = duration > 500; // Alerta se demorar mais de 500ms
          return {
            tag: duration + "ms",
            text: (isSlow ? "⚠️ " : "") + r.name,
          };
        });
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
      lcp,
      cls,
      scriptsAnalysis,
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
    // Helper para pontuação
    let seoScore = 0;
    let maxSeoScore = 0;

    const check = (condition, weight = 10) => {
      maxSeoScore += weight;
      if (condition) seoScore += weight;
      return condition;
    };

    // --- 1. SEO ON-PAGE ---
    const title = document.title || "";
    const titleLen = title.length;
    const titleOk = titleLen >= 30 && titleLen <= 60;
    check(titleOk, 10);

    const description = allMeta.description || "";
    const descLen = description.length;
    const descOk = descLen >= 120 && descLen <= 160;
    check(descOk, 10);

    const h1s = document.querySelectorAll("h1");
    const h1Ok = h1s.length === 1;
    check(h1Ok, 10);

    // Densidade de Conteúdo
    const bodyText = document.body.innerText || "";
    const wordCount = bodyText.trim().split(/\s+/).length;
    const contentOk = wordCount > 300;
    check(contentOk, 5);

    // Imagens
    const imgs = Array.from(document.querySelectorAll("img"));
    const imgsMissingAlt = imgs.filter(
      (i) => !i.alt && i.getAttribute("role") !== "presentation",
    ).length;
    const imgsOk = imgs.length === 0 || imgsMissingAlt === 0;
    check(imgsOk, 10);

    const onPage = {
      titleTag: [
        {
          tag: "Estado",
          text: titleOk
            ? "✅ Otimizado"
            : titleLen === 0
              ? "❌ Ausente"
              : "⚠️ Atenção",
        },
        {
          tag: "Análise",
          text: `${titleLen} caracteres. (Recomendado: 30-60)`,
        },
        { tag: "Conteúdo", text: title || "N/A" },
        {
          tag: "Dica",
          text: "O título é o fator on-page mais importante. Mantenha-o conciso e inclua a palavra-chave principal no início.",
        },
      ],
      metaDescription: [
        {
          tag: "Estado",
          text: descOk
            ? "✅ Otimizado"
            : descLen === 0
              ? "❌ Ausente"
              : "⚠️ Ajustar",
        },
        {
          tag: "Análise",
          text: `${descLen} caracteres. (Recomendado: 120-160)`,
        },
        { tag: "Conteúdo", text: description || "N/A" },
        {
          tag: "Dica",
          text: "A descrição funciona como um anúncio para atrair cliques (CTR). Evite duplicidade e seja persuasivo.",
        },
      ],
      headingStructure: [
        { tag: "Estado", text: h1Ok ? "✅ Otimizado" : "⚠️ Verificar" },
        { tag: "Análise", text: `${h1s.length} tags H1 encontradas.` },
        { tag: "H1 Atual", text: h1s.length > 0 ? h1s[0].innerText : "N/A" },
        {
          tag: "Dica",
          text: "Use apenas um H1 por página para definir o tópico principal. Use H2-H6 para subtópicos.",
        },
      ],
      contentAmount: [
        { tag: "Estado", text: contentOk ? "✅ Bom" : "⚠️ Pouco conteúdo" },
        { tag: "Contagem", text: `~${wordCount} palavras.` },
        {
          tag: "Dica",
          text: "Páginas com conteúdo rico (>300 palavras) tendem a rankear melhor. Cubra o tópico em profundidade.",
        },
      ],
      imageAlt: [
        { tag: "Estado", text: imgsOk ? "✅ Otimizado" : "⚠️ Atenção" },
        {
          tag: "Análise",
          text: `${imgsMissingAlt} de ${imgs.length} imagens sem texto alternativo (alt).`,
        },
        {
          tag: "Dica",
          text: "O atributo 'alt' é crucial para acessibilidade e SEO de imagens. Descreva a imagem de forma concisa.",
        },
      ],
    };

    // --- 2. SEO TÉCNICO ---
    const canonical = document.querySelector('link[rel="canonical"]');
    check(!!canonical, 10);

    const viewport = document.querySelector('meta[name="viewport"]');
    check(!!viewport, 10);

    const robots = document.querySelector('meta[name="robots"]')?.content || "";
    const isIndexable = !robots.toLowerCase().includes("noindex");
    check(isIndexable, 10);

    const hasLang = document.documentElement.lang;
    check(!!hasLang, 5);

    const isHttps = window.location.protocol === "https:";
    check(isHttps, 5);

    const hasJsonLd =
      document.querySelector('script[type="application/ld+json"]') !== null;
    check(hasJsonLd, 5);

    const technicalSeo = {
      canonicalTag: [
        {
          tag: "Estado",
          text: canonical ? "✅ Presente" : "⚠️ Ausente",
        },
        {
          tag: "Motivo",
          text: "A tag canonical indica aos buscadores qual é a versão original da página, evitando punições por conteúdo duplicado.",
        },
        {
          tag: "Dica",
          text: "A tag canonical evita problemas de conteúdo duplicado, indicando a versão preferida da página.",
        },
      ],
      indexability: [
        {
          tag: "Estado",
          text: isIndexable ? "✅ Indexável" : "🚫 Bloqueado",
        },
        { tag: "Diretiva", text: robots || "index, follow (padrão)" },
        {
          tag: "Dica",
          text: "Verifique se a página deve ou não aparecer nos resultados de busca.",
        },
      ],
      mobileViewport: [
        {
          tag: "Estado",
          text: viewport ? "✅ Mobile Friendly" : "❌ Ausente",
        },
        {
          tag: "Dica",
          text: "Essencial para a experiência em dispositivos móveis e para o índice Mobile-First do Google.",
        },
      ],
      httpsSecure: [
        {
          tag: "Estado",
          text: isHttps ? "✅ Seguro" : "⚠️ Inseguro (HTTP)",
        },
        {
          tag: "Dica",
          text: "O Google prioriza sites seguros. Migre para HTTPS para proteger os dados dos usuários.",
        },
      ],
      htmlLang: [
        {
          tag: "Estado",
          text: hasLang ? `✅ Definido (${hasLang})` : "⚠️ Ausente",
        },
        {
          tag: "Dica",
          text: "Definir o idioma ajuda navegadores e ferramentas de tradução.",
        },
      ],
      structuredData: [
        {
          tag: "Estado",
          text: hasJsonLd ? "✅ Detectado (JSON-LD)" : "⚠️ Não detectado",
        },
        {
          tag: "Dica",
          text: "Dados estruturados ajudam o Google a entender o conteúdo e gerar Rich Snippets (estrelas, preços, etc).",
        },
      ],
    };

    // --- 3. SOCIAL ---
    const hasOg = document.querySelector('meta[property^="og:"]') !== null;
    check(hasOg, 5);

    const hasTwitter =
      document.querySelector('meta[name^="twitter:"]') !== null;
    check(hasTwitter, 5);

    const socialSeo = {
      openGraph: [
        { tag: "Estado", text: hasOg ? "✅ Detectado" : "⚠️ Ausente" },
        {
          tag: "Dica",
          text: "O protocolo Open Graph controla como seu conteúdo aparece no Facebook, LinkedIn e outros.",
        },
      ],
      twitterCards: [
        { tag: "Estado", text: hasTwitter ? "✅ Detectado" : "⚠️ Ausente" },
        {
          tag: "Dica",
          text: "Twitter Cards melhoram a visibilidade e engajamento ao compartilhar links no Twitter.",
        },
      ],
    };

    const finalScore =
      maxSeoScore > 0 ? Math.round((seoScore / maxSeoScore) * 100) : 0;

    const seo = {
      score: `${finalScore}/100`,
      onPage,
      technicalSeo,
      socialSeo,
    };

    return {
      metadata,
      content: { headers, links },
      technical,
      hidden,
      seo,
    };
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
    lcp: getMsg("desc_lcp"),
    cls: getMsg("desc_cls"),
    scriptsAnalysis: getMsg("desc_scriptsAnalysis"),
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
    onPage: getMsg("seo_onPage") || "SEO On-Page",
    technicalSeo: getMsg("seo_technicalSeo") || "SEO Técnico",
    socialSeo: getMsg("seo_socialSeo") || "Redes Sociais",
    titleTag: getMsg("desc_titleTag"),
    metaDescription: getMsg("desc_metaDescription"),
    headingStructure: getMsg("desc_headingStructure"),
    contentAmount: getMsg("desc_contentAmount"),
    imageAlt: getMsg("desc_imageAlt"),
    canonicalTag: getMsg("desc_canonicalTag"),
    indexability: getMsg("desc_indexability"),
    mobileViewport: getMsg("desc_mobileViewport"),
    httpsSecure: getMsg("desc_httpsSecure"),
    htmlLang: getMsg("desc_htmlLang"),
    openGraph: getMsg("desc_openGraph"),
    twitterCards: getMsg("desc_twitterCards"),
    structuredData: getMsg("desc_structuredData"),
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
