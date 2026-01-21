document.addEventListener("DOMContentLoaded", () => {
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

  // Criar botão para visualizar relatório completo
  const viewBtn = document.createElement("button");
  viewBtn.textContent = "Ver Relatório Completo";
  viewBtn.id = "view-report";
  viewBtn.className = exportBtn.className; // Herda classes do botão existente
  viewBtn.style.marginTop = "10px";
  viewBtn.style.width = "100%";
  viewBtn.style.cursor = "pointer";

  viewBtn.addEventListener("click", viewReport);
  exportBtn.parentNode.insertBefore(viewBtn, exportBtn.nextSibling);

  // Configurar botão de doação PIX
  const donateBtn = document.createElement("button");
  donateBtn.textContent = "☕ Apoiar com PIX";
  donateBtn.style.marginTop = "10px";
  donateBtn.style.width = "100%";
  donateBtn.style.cursor = "pointer";
  donateBtn.style.backgroundColor = "#32bcad"; // Cor característica do PIX
  donateBtn.style.color = "#fff";
  donateBtn.style.border = "none";
  donateBtn.style.padding = "10px";
  donateBtn.style.borderRadius = "4px";
  donateBtn.style.fontWeight = "bold";

  const pixContainer = document.createElement("div");
  pixContainer.style.display = "none";
  pixContainer.style.marginTop = "10px";
  pixContainer.style.padding = "15px";
  pixContainer.style.backgroundColor = "#e0f2f1";
  pixContainer.style.borderRadius = "8px";
  pixContainer.style.textAlign = "center";
  pixContainer.style.fontSize = "14px";
  pixContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";

  // SUBSTITUA AQUI PELA SUA CHAVE PIX REAL
  const pixKey = "seu-pix-aqui@exemplo.com";

  pixContainer.innerHTML = `
    <div style="margin-bottom:10px; font-weight:bold; color:#00695c; font-size:1.1em;">Chave PIX para doação:</div>
    <div style="display:flex; flex-direction:column; gap:8px;">
      <input id="pix-input" type="text" value="${pixKey}" readonly style="width:100%; box-sizing:border-box; padding:10px; border:2px solid #b2dfdb; border-radius:6px; text-align:center; color:#333; font-family:monospace; font-size:1.1em; background:#fff;">
      <button id="pix-copy-btn" style="background:#00796b; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold; transition:0.2s;">Copiar Chave</button>
    </div>
    <div id="pix-feedback" style="margin-top:8px; font-size:0.9em; color:#004d40; min-height:1.2em;">Obrigado por apoiar o desenvolvimento!</div>
  `;

  donateBtn.addEventListener("click", () => {
    const isHidden = pixContainer.style.display === "none";
    pixContainer.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      setTimeout(
        () => pixContainer.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  });

  const copyBtn = pixContainer.querySelector("#pix-copy-btn");
  const pixInput = pixContainer.querySelector("#pix-input");
  const feedback = pixContainer.querySelector("#pix-feedback");

  copyBtn.addEventListener("click", () => {
    pixInput.select();
    pixInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(pixKey).then(() => {
      const originalText = "Obrigado por apoiar o desenvolvimento!";
      feedback.textContent = "Chave copiada com sucesso! ✅";
      copyBtn.style.backgroundColor = "#004d40";
      setTimeout(() => {
        feedback.textContent = originalText;
        copyBtn.style.backgroundColor = "#00796b";
      }, 3000);
    });
  });

  viewBtn.parentNode.insertBefore(donateBtn, viewBtn.nextSibling);
  donateBtn.parentNode.insertBefore(pixContainer, donateBtn.nextSibling);

  // Iniciar análise da página
  analyzePage();

  // Ativar proteção contra inspeção básica
  enableProtection();
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

function analyzePage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    // Verifica se temos permissão para injetar script (evita erro em páginas chrome://)
    if (
      !activeTab.url ||
      activeTab.url.startsWith("chrome://") ||
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
      updateBadge(activeTab.id, "unsupported");
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
          updateBadge(activeTab.id, "error");
          return;
        }

        extractedData = results[0].result;
        if (!extractedData) {
          document.getElementById("metadata-content").innerHTML =
            "<div style='padding:20px; text-align:center; color:#5f6368;'>Não foi possível obter os dados da página.</div>";
          updateBadge(activeTab.id, "error");
          return;
        }
        if (extractedData && extractedData.error) {
          document.getElementById("metadata-content").innerHTML =
            "<div style='padding:20px; text-align:center; color:#5f6368;'>Informações indisponíveis no momento.</div>";
          updateBadge(activeTab.id, "error");
          return;
        }
        displayResults(extractedData);
        updateBadge(activeTab.id, "success");
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
    const hasFavicon = document.querySelector('link[rel*="icon"]') !== null;
    const robotsMeta =
      document.querySelector('meta[name="robots"]')?.content || "";
    const isIndexable = !robotsMeta.toLowerCase().includes("noindex");

    let seoScore = 0;
    if (titleLen >= 30 && titleLen <= 60) seoScore += 15;
    if (descLen >= 50 && descLen <= 160) seoScore += 15;
    if (h1Count === 1) seoScore += 15;
    if (imgsMissingAlt === 0) seoScore += 10;
    if (document.querySelector('link[rel="canonical"]')) seoScore += 10;
    if (document.querySelector('meta[name="viewport"]')) seoScore += 10;

    if (hasLang) seoScore += 5;
    if (hasOg) seoScore += 10;
    if (hasFavicon) seoScore += 5;
    if (isIndexable) seoScore += 5;

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
      ],
    };

    return { metadata, content: { headers, links }, technical, hidden, seo };
  } catch (e) {
    return { error: e.toString() };
  }
}

const fieldDescriptions = {
  title: "Título principal exibido na aba do navegador.",
  description: "Resumo do conteúdo utilizado por motores de busca.",
  keywords: "Palavras-chave definidas para indexação (SEO).",
  author: "Autor ou responsável pelo conteúdo da página.",
  headersCount: "Quantidade total de títulos (H1 a H6) encontrados.",
  linksCount: "Quantidade total de links (hiperligações) na página.",
  headersSample: "Amostra dos primeiros títulos encontrados.",
  linksSample: "Amostra dos primeiros links encontrados.",
  loadTime: "Tempo total para carregar a página (navegação).",
  cookiesCount: "Número de cookies armazenados por este site.",
  localStorageCount: "Itens salvos no armazenamento local (persistente).",
  sessionStorageCount: "Itens salvos na sessão (apaga ao fechar).",
  userAgent: "Identificação do seu navegador e sistema operacional.",
  language: "Idioma preferido configurado no navegador.",
  platform: "Plataforma do sistema operacional (ex: Win32, Linux).",
  referrer: "Endereço da página anterior que levou a esta.",
  technologies: "Bibliotecas ou frameworks detectados na página.",
  hiddenInputs: "Campos ocultos de formulários (tokens, IDs, etc).",
  comments: "Comentários HTML no código-fonte.",
  jsonLd: "Dados estruturados JSON-LD para motores de busca.",
  iframes: "Conteúdo externo carregado via iframe.",
  accessRestrictions: "Regras de permissão e bloqueio para robôs/usuários.",
  robotsTxt: "Arquivo de regras para indexadores (crawlers).",
  metaRobots: "Instruções diretas para robôs (ex: noindex, nofollow).",
  score: "Pontuação estimada de SEO baseada nos critérios abaixo (0-100).",
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
};

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
          <strong style="color:#1a73e8; display:block; margin-bottom:6px; font-size: 1.1em;">${formattedKey}</strong>
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
        <strong style="color:#202124; font-size: 0.95em;">${formattedKey}</strong>
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
            <div style="font-size: 1.1em; font-weight: bold; color: #202124; margin-bottom: 8px;">Pontuação de SEO</div>
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

  const blob = new Blob([JSON.stringify(extractedData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `analise-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
              <div style="font-size: 1.4em; font-weight: bold; color: #202124; margin-bottom: 10px;">Pontuação de SEO</div>
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

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório Completo - ${escapeHtml(extractedData.metadata.title || "Análise de Página")}</title>
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
        <h1>Relatório de Análise: ${escapeHtml(extractedData.metadata.title || "Página Web")}</h1>
        
        <div class="section">
          <h2>Metadados</h2>
          ${renderWithExplanations(extractedData.metadata)}
        </div>

        <div class="section">
          <h2>Conteúdo Completo</h2>
          ${renderWithExplanations(extractedData.content)}
        </div>

        <div class="section">
          <h2>Informações Técnicas</h2>
          ${renderWithExplanations(extractedData.technical)}
        </div>

        <div class="section">
          <h2>Elementos Ocultos</h2>
          ${renderWithExplanations(extractedData.hidden)}
        </div>

        <div class="section">
          <h2>Análise SEO Avançada</h2>
          ${seoHtml}
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 0.9em;">
          Gerado por Analisador de Página Web em ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([reportHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url: url });
}

function enableProtection() {
  // Desabilita o menu de contexto (botão direito) para dificultar o acesso ao "Inspecionar"
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  // Desabilita atalhos de teclado comuns para ferramentas de desenvolvedor
  document.addEventListener("keydown", (event) => {
    // F12
    if (event.key === "F12") {
      event.preventDefault();
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (
      event.ctrlKey &&
      event.shiftKey &&
      ["I", "J", "C"].includes(event.key)
    ) {
      event.preventDefault();
    }
    // Ctrl+U (Ver código-fonte)
    if (event.ctrlKey && event.key === "u") {
      event.preventDefault();
    }
  });
}

function updateBadge(tabId, status) {
  if (!chrome.action) return;

  let text = "";
  let color = "";

  if (status === "success") {
    text = " ";
    color = "#1a971a";
  } else if (status === "unsupported") {
    text = " ";
    color = "#d93025";
  } else if (status === "error") {
    text = " ";
    color = "#f29900";
  }

  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
}
