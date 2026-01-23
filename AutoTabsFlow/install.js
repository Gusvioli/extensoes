const fs = require("fs");
const path = require("path");

const rootDir = "focusflow";
const iconsDir = path.join(rootDir, "icons");

// 1. Definição dos arquivos e conteúdos
const files = {
  "README.md": `# 🚀 AutoTabsFlow

**AutoTabsFlow** é uma extensão para Google Chrome que utiliza Inteligência Artificial (Gemini Nano) e heurísticas para organizar automaticamente suas abas em grupos baseados em contexto.

## ✨ Funcionalidades

- **Agrupamento Automático:** Classifica abas em categorias como *Trabalho, Desenvolvimento, Viagem, Compras*, etc.
- **Resumos com IA:** Gera um resumo explicativo sobre o conteúdo de um grupo de abas.
- **Modo Túnel de Foco:** Foca em um único grupo e colapsa todos os outros.
- **Gerenciamento de Sessões:** Salve e restaure conjuntos de abas.
- **Estatísticas de Tempo:** Monitora o tempo de foco em cada grupo.

## 🛠️ Instalação

1. **Gere os arquivos da extensão:**
   Certifique-se de ter rodado o script de instalação para criar a pasta \`focusflow\`:
   \`\`\`bash
   node install.js
   \`\`\`

2. **Carregue no Chrome:**
   - Abra o Chrome e digite \`chrome://extensions\`.
   - Ative o **Modo do desenvolvedor** (canto superior direito).
   - Clique em **Carregar sem compactação** (Load unpacked).
   - Selecione a pasta \`focusflow\` que foi criada dentro deste diretório.

## 🧠 Requisitos para IA (Gemini Nano)

Para as funcionalidades de IA (classificação avançada e resumos):
1. Use o **Chrome Canary** ou versão recente (v127+).
2. Habilite as flags:
   - \`chrome://flags/#prompt-api-for-gemini-nano\`: **Enabled**
   - \`chrome://flags/#optimization-guide-on-device-model\`: **Enabled BypassPerfRequirement**

*Se a IA não estiver disponível, a extensão usará automaticamente um sistema de palavras-chave (heurística).*

## 📄 Licença
MIT License.`,

  "WEBSTORE_DETAILS.md": `# Detalhes para Publicação - Chrome Web Store

## Informações da Loja

**Nome da Extensão:**
AutoTabsFlow: IA de Contexto e Abas

**Resumo (Short Description):**
Organiza suas abas automaticamente por contexto e resume suas pesquisas usando IA. Aumente seu foco e elimine a bagunça.

**Descrição Detalhada (Long Description):**
O **AutoTabsFlow** é o seu assistente de produtividade definitivo para o Google Chrome. Se você se sente sobrecarregado com dezenas de abas abertas, perde tempo procurando aquela página importante ou simplesmente quer navegar com mais clareza, esta extensão foi feita para você.

Utilizando a tecnologia de ponta **Gemini Nano (IA Local)** e algoritmos heurísticos avançados, o AutoTabsFlow entende o contexto da sua navegação em tempo real e organiza seu navegador automaticamente, sem que você precise mover um dedo.

🚀 **Funcionalidades Principais:**

* **📂 Agrupamento Automático Inteligente:** Diga adeus à bagunça. A extensão analisa o título e a URL de cada nova aba. Pesquisando sobre "React"? Ela vai para o grupo "Desenvolvimento". Planejando férias? Vai para "Viagem". Tudo instantâneo.
* **🧠 IA Local (Gemini Nano):** Diferente de outras extensões, utilizamos a IA integrada ao próprio Chrome para classificar contextos complexos e gerar resumos. Isso garante **privacidade total** (seus dados não saem do seu computador) e velocidade.
* **📝 Resumos de Contexto:** Perdeu o fio da meada em uma pesquisa longa? Clique em "Gerar Resumo" e a IA lerá os títulos das abas daquele grupo para explicar em um parágrafo conciso o que você estava pesquisando.
* **🎯 Modo Túnel de Foco:** Precisa de concentração máxima? Ative este modo para expandir apenas o grupo de trabalho atual e colapsar/esconder todos os outros automaticamente.
* **💾 Gerenciador de Sessões:** Salve seus grupos de abas atuais como uma "Sessão" (ex: "Projeto X", "Planejamento Fim de Semana") para fechar o navegador sem medo e restaurar tudo exatamente como estava depois.
* **⏱️ Estatísticas de Foco:** Acompanhe quanto tempo você passa focado em cada contexto (Trabalho, Lazer, Estudos, etc.) com métricas visuais no painel lateral.
* **🧹 Limpeza de Distrações:** Um "Botão de Pânico" que identifica e fecha todas as abas soltas que não pertencem a nenhum grupo importante, limpando sua mente e seu navegador.

🌟 **Por que usar o AutoTabsFlow?**

1. **Economize Memória (RAM) e Cognitiva:** Menos abas soltas significam um navegador mais rápido e uma mente menos cansada.
2. **Privacidade em Primeiro Lugar:** Todo o processamento de texto e classificação acontece no seu dispositivo (On-Device). Não enviamos seu histórico para servidores externos.
3. **Fluxo Contínuo:** Não pare o que está fazendo para organizar abas. Nós fazemos isso por você em segundo plano.

🛠️ **Casos de Uso Comuns:**

* **Desenvolvedores:** Mantém documentação, localhost e StackOverflow agrupados separadamente de abas de música ou e-mail.
* **Estudantes:** Separa automaticamente pesquisas de diferentes matérias ou artigos acadêmicos.
* **Compradores:** Agrupa comparações de preços de diferentes lojas em um único lugar.

**Categoria:**
Produtividade / Fluxo de Trabalho

**Idioma:**
Português (Brasil)

---

## Privacidade e Permissões (Aba Privacidade)

**Justificativa para Permissões:**

* **\`tabs\`:** Necessária para monitorar a abertura e atualização de abas. A extensão acessa o \`title\` e \`url\` de cada aba para alimentar o algoritmo de classificação (IA ou Heurística). Sem isso, é impossível identificar o contexto do conteúdo (ex: saber se a aba é sobre "Programação" ou "Viagem").
* **\`tabGroups\`:** O núcleo da extensão. Permite criar, atualizar (nomear/colorir) e organizar grupos de abas automaticamente. É usada para mover as abas classificadas para seus respectivos contextos sem intervenção manual.
* **\`storage\`:** Utilizado estritamente para persistência de dados locais (Local Storage), incluindo: 1) Estatísticas de tempo de foco por grupo; 2) Sessões salvas pelo usuário para restauração futura; 3) Preferências de configuração. Nenhum dado pessoal é enviado para servidores externos.
* **\`sidePanel\`:** A interface de usuário (UI) opera no Painel Lateral para oferecer uma experiência não intrusiva. Isso evita a necessidade de injetar scripts de conteúdo (Content Scripts) nas páginas web para desenhar interfaces, garantindo maior performance e segurança.
* **\`host_permissions\` (\`<all_urls>\`):** Indispensável para a funcionalidade de "Agrupamento Automático Global". A extensão precisa ler a URL e o Título de qualquer site que o usuário visite para determinar sua categoria em tempo real. Como a extensão é agnóstica ao site (funciona em toda a web), ela requer acesso a todas as URLs. **Nota:** O processamento desses dados ocorre exclusivamente na memória do dispositivo (On-Device) ou via APIs locais do Chrome.

**Uso de Dados:**

* A extensão coleta dados de navegação (Títulos e URLs)? **Sim.**
* Esses dados são enviados para terceiros? **Não.** O processamento é feito localmente via heurísticas ou através da API \`window.ai\` (Gemini Nano) do próprio navegador Chrome.`,

  "PRIVACY_POLICY.md": `# Política de Privacidade - AutoTabsFlow

**Última atualização:** Maio de 2024

A sua privacidade é importante para nós. Esta política explica como a extensão **AutoTabsFlow** trata suas informações.

## 1. Coleta e Uso de Dados

* **URLs e Títulos das Abas:** A extensão lê o título e o endereço (URL) das abas abertas.
  * **Finalidade:** Classificar a aba em uma categoria (ex: Trabalho, Estudos) e gerar resumos.
  * **Processamento:** A análise é feita **localmente** no seu dispositivo (On-Device) usando heurísticas ou a API Gemini Nano do Chrome.

## 2. Armazenamento de Dados

* **Dados Locais:** Configurações, estatísticas e sessões salvas são armazenadas via \`chrome.storage.local\`.
* **Segurança:** Esses dados permanecem no seu navegador e não são compartilhados externamente.

## 3. Compartilhamento com Terceiros

**Não compartilhamos seus dados.** A extensão não possui servidores de backend. Todo o processamento de IA ocorre através das APIs experimentais do próprio navegador Chrome.`,

  "manifest.json": `{
  "manifest_version": 3,
  "name": "AutoTabsFlow: IA de Contexto e Abas",
  "version": "1.1",
  "description": "Organiza suas abas automaticamente por contexto e resume suas pesquisas usando IA.",
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "sidePanel",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "src/sidepanel.html"
  },
  "action": {
    "default_title": "Abrir AutoTabsFlow",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+F",
        "mac": "Command+Shift+F"
      }
    }
  }
}`,

  "src/ai-service.js": `/**
 * Tenta classificar o conteúdo da aba em um contexto.
 * Usa Gemini Nano se disponível, ou heurística simples como fallback.
 */
export async function classifyTabContext(title, url) {
  const prompt = \`Analise o título: "\${title}". Classifique em uma categoria curta (máx 2 palavras) como: Trabalho, Viagem, Estudos, Compras, Social ou Outros.\`;

  try {
    const ai = globalThis.ai;
    if (ai && ai.languageModel) {
      const session = await ai.languageModel.create();
      const result = await session.prompt(prompt);
      return result.trim();
    } else {
      throw new Error("Gemini Nano não disponível");
    }
  } catch (e) {
    const lowerTitle = (title || "").toLowerCase();
    const lowerUrl = (url || "").toLowerCase();

    // Desenvolvimento / Tech
    if (lowerTitle.includes("react") || lowerTitle.includes("js") || lowerTitle.includes("dev") || lowerUrl.includes("github") || lowerUrl.includes("stackoverflow")) return "Desenvolvimento";
    
    // Viagem
    if (lowerTitle.includes("passagem") || lowerTitle.includes("voo") || lowerTitle.includes("hotel") || lowerTitle.includes("viagem") || lowerUrl.includes("booking") || lowerUrl.includes("airbnb")) return "Viagem";
    
    // Compras
    if (lowerTitle.includes("preço") || lowerTitle.includes("comprar") || lowerTitle.includes("oferta") || lowerTitle.includes("amazon") || lowerTitle.includes("mercado livre")) return "Compras";
    
    // Trabalho
    if (lowerTitle.includes("linkedin") || lowerTitle.includes("slack") || lowerTitle.includes("jira") || lowerTitle.includes("meet") || lowerUrl.includes("docs.google")) return "Trabalho";
    
    // Social
    if (lowerTitle.includes("youtube") || lowerTitle.includes("instagram") || lowerTitle.includes("twitter") || lowerTitle.includes("whatsapp")) return "Social";

    return "Geral";
  }
}

export async function summarizeContext(groupName, tabsData) {
  const titles = tabsData.map(t => \`- \${t.title}\`).join("\\n");
  const prompt = \`Você é um assistente de produtividade. O usuário tem as seguintes abas abertas no contexto "\${groupName}":\\n\${titles}\\n\\nCrie um resumo de 1 parágrafo explicando o que o usuário está pesquisando.\`;

  try {
    const ai = globalThis.ai;
    if (ai && ai.languageModel) {
      const session = await ai.languageModel.create();
      return await session.prompt(prompt);
    } else {
      return \`(Simulação de IA) Você tem \${tabsData.length} abas abertas sobre \${groupName}. Parece que você está comparando opções baseadas nos títulos das páginas.\`;
    }
  } catch (e) {
    return "Não foi possível gerar o resumo no momento.";
  }
}`,

  "src/background.js": `import { classifyTabContext } from './ai-service.js';

let currentGroupId = chrome.tabGroups.TAB_GROUP_ID_NONE;
let lastActiveTime = Date.now();

async function updateFocusTime() {
  const { extensionEnabled } = await chrome.storage.local.get("extensionEnabled");
  if (extensionEnabled === false) return;

  const now = Date.now();
  if (currentGroupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    const duration = now - lastActiveTime;
    const data = await chrome.storage.local.get('focusStats');
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
  const { extensionEnabled } = await chrome.storage.local.get("extensionEnabled");
  if (extensionEnabled === false) return;

  if ((changeInfo.status === 'complete' || changeInfo.title) && tab.url && !tab.url.startsWith('chrome://')) {
    // if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) return; // Comentado para permitir reagrupamento dinâmico se necessário

    try {
      let contextCategory = await classifyTabContext(tab.title, tab.url);
      
      // Fallback: Se a IA retornar Geral, usa o domínio
      if (contextCategory === "Geral" || contextCategory === "Outros") {
        const urlObj = new URL(tab.url);
        const domain = urlObj.hostname.replace("www.", "").split(".")[0];
        contextCategory = domain.charAt(0).toUpperCase() + domain.slice(1);
      }

      // Verifica se já está no grupo correto
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        try {
          const currentGroup = await chrome.tabGroups.get(tab.groupId);
          if (currentGroup.title === contextCategory) return;
        } catch (e) {}
      }

      const groups = await chrome.tabGroups.query({ title: contextCategory });
      let groupId;

      if (groups.length > 0) {
        groupId = groups[0].id;
        await chrome.tabs.group({ tabIds: tabId, groupId: groupId });
      } else {
        groupId = await chrome.tabs.group({ tabIds: tabId });
        await chrome.tabGroups.update(groupId, { 
          title: contextCategory,
          color: getRandomColor()
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
  const colors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"];
  return colors[Math.floor(Math.random() * colors.length)];
}`,

  "src/sidepanel.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AutoTabsFlow</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 16px; background-color: #f9f9f9; color: #333; }
    h1 { font-size: 18px; color: #2c3e50; display: flex; align-items: center; gap: 8px; }
    .btn { background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%; margin-top: 8px; }
    .btn:hover { background: #2980b9; }
  </style>
</head>
<body>
  <h1>🚀 AutoTabsFlow</h1>
  <p style="font-size: 12px; color: #777;">Seus contextos ativos:</p>
  <div id="flows-container"><p>Carregando fluxos...</p></div>
  <button id="clear-distractions" class="btn" style="background-color: #e74c3c; margin-top: 20px;">🧹 Limpar Distrações</button>
  <script type="module" src="sidepanel.js"></script>
</body>
</html>`,

  "src/sidepanel.js": `import { summarizeContext, classifyTabContext } from './ai-service.js';

class GroupCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set data({ group, tabs, timeStr }) {
    this.group = group;
    this.tabs = tabs;
    this.render(timeStr);
  }

  render(timeStr) {
    const style = \`
      <style>
        :host { display: block; }
        .card { background: white; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 5px solid #ccc; font-family: 'Segoe UI', sans-serif; }
        .card h3 { margin: 0 0 4px 0; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color: #333; }
        .btn { background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%; margin-top: 8px; transition: background 0.2s; }
        .btn:hover { background: #2980b9; }
        .btn-focus { background: #27ae60; }
        .btn-focus:hover { background: #219150; }
        .summary { font-size: 12px; color: #666; margin-top: 8px; line-height: 1.4; background: #f0f4f8; padding: 8px; border-radius: 4px; display: none; }
        .badge { font-size: 10px; background: #eee; padding: 2px 6px; border-radius: 10px; font-weight: normal; color: #555; }
        .time-badge { font-size: 11px; color: #7f8c8d; display: block; margin-bottom: 8px; }
        .group-title-text { cursor: pointer; border-bottom: 1px dashed #ccc; }
        .title-input { width: 60%; font-size: 14px; }
      </style>
    \`;

    this.shadowRoot.innerHTML = \`
      \${style}
      <div class="card" style="border-left-color: \${this.group.color}">
        <h3>
          <span class="group-title-text" id="group-title">\${this.group.title || 'Sem Nome'}</span>
          <span class="badge">\${this.tabs.length} abas</span>
        </h3>
        <span class="time-badge">⏱️ Foco: \${timeStr}</span>
        <button class="btn btn-focus" id="btn-focus">🎯 Modo Túnel de Foco</button>
        <button class="btn btn-summary" id="btn-summary">📝 Gerar Resumo</button>
        <div class="summary" id="summary-content"></div>
      </div>
    \`;

    this.shadowRoot.getElementById('btn-focus').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('focus-mode', { detail: { groupId: this.group.id }, bubbles: true, composed: true }));
    });

    this.shadowRoot.getElementById('btn-summary').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('generate-summary', { detail: { groupId: this.group.id }, bubbles: true, composed: true }));
    });

    const titleEl = this.shadowRoot.getElementById('group-title');
    titleEl.addEventListener('click', () => this.makeTitleEditable(titleEl));
  }

  showSummary(text) {
    const el = this.shadowRoot.getElementById('summary-content');
    if (el) {
      el.style.display = 'block';
      el.innerText = text;
    }
  }

  makeTitleEditable(titleSpan) {
    const oldTitle = titleSpan.innerText;
    const h3 = titleSpan.parentElement;
    const input = document.createElement("input");
    input.type = "text";
    input.value = oldTitle;
    input.className = "title-input";
    h3.insertBefore(input, titleSpan);
    titleSpan.style.display = "none";
    input.focus();
    input.select();
    const saveTitle = () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== oldTitle) {
        this.dispatchEvent(new CustomEvent('update-title', { detail: { groupId: this.group.id, title: newTitle }, bubbles: true, composed: true }));
      }
      input.remove();
      titleSpan.style.display = "inline";
    };
    input.addEventListener("blur", saveTitle);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
    });
  }
}

customElements.define('group-card', GroupCard);

document.addEventListener('DOMContentLoaded', loadGroups);
document.getElementById('clear-distractions').addEventListener('click', clearDistractions);
document.getElementById("toggle-groups").addEventListener("click", toggleGroups);
document.getElementById("expand-all").addEventListener("click", toggleExpandAll);
document.getElementById("toggle-extension").addEventListener("click", toggleExtension);
document.getElementById("save-session").addEventListener("click", saveSession);
document.getElementById("restore-session").addEventListener("click", restoreSession);
document.getElementById("delete-session").addEventListener("click", deleteSession);

// Event delegation for Shadow DOM events
const container = document.getElementById('flows-container');
container.addEventListener('focus-mode', (e) => toggleFocusMode(e.detail.groupId));
container.addEventListener('generate-summary', (e) => generateSummary(e.target, e.detail.groupId));
container.addEventListener('update-title', async (e) => {
  await chrome.tabGroups.update(parseInt(e.detail.groupId), { title: e.detail.title });
});

function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = "⏳ Carregando...";
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || "";
  }
}

let debounceTimeout;
function debouncedLoadGroups() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(loadGroups, 150);
}

async function loadGroups() {
  const groups = await chrome.tabGroups.query({});
  const storage = await chrome.storage.local.get(['focusStats', 'extensionEnabled']);
  const stats = storage.focusStats || {};
  const isEnabled = storage.extensionEnabled !== false;

  updateExtensionStatus(isEnabled);
  updateSessionList();

  // Pre-fetch tabs to avoid async rendering issues
  const groupsData = await Promise.all(groups.map(async (group) => {
    const tabs = await chrome.tabs.query({ groupId: group.id });
    return { group, tabs };
  }));

  const container = document.getElementById('flows-container');
  container.innerHTML = '';

  const toggleBtn = document.getElementById("toggle-groups");
  if (toggleBtn) {
    toggleBtn.innerText = groups.length > 0 ? "🔓 Desagrupar Tudo" : "🔄 Reagrupar Tudo";
    toggleBtn.style.backgroundColor = groups.length > 0 ? "#f39c12" : "#9b59b6";
  }
  const expandBtn = document.getElementById("expand-all");
  if (expandBtn) {
    const allExpanded = groups.length > 0 && groups.every((g) => !g.collapsed);
    expandBtn.innerText = allExpanded ? "📁 Colapsar Tudo" : "📂 Expandir Tudo";
  }

  if (groupsData.length === 0) {
    container.innerHTML = '<p style="font-size:12px">Nenhum grupo ativo. Comece a navegar!</p>';
    return;
  }

  for (const { group, tabs } of groupsData) {
    const timeMs = stats[group.id] || 0;
    const timeStr = formatTime(timeMs);

    const card = document.createElement('group-card');
    card.data = { group, tabs, timeStr };
    container.appendChild(card);
  }
}

async function toggleFocusMode(targetGroupId) {
  targetGroupId = parseInt(targetGroupId);
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && activeTab.groupId !== targetGroupId) {
    const tabs = await chrome.tabs.query({ groupId: targetGroupId });
    if (tabs.length > 0) await chrome.tabs.update(tabs[0].id, { active: true });
  }

  const allGroups = await chrome.tabGroups.query({});
  for (const group of allGroups) {
    const shouldCollapse = group.id !== targetGroupId;
    if (group.collapsed !== shouldCollapse) await chrome.tabGroups.update(group.id, { collapsed: shouldCollapse });
  }
}

async function toggleGroups() {
  const tabs = await chrome.tabs.query({});
  const groups = await chrome.tabGroups.query({});
  const btn = document.getElementById("toggle-groups");
  if (groups.length > 0) {
    const groupedTabs = tabs.filter(t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE);
    const ids = groupedTabs.map(t => t.id);
    if (ids.length > 0 && confirm(\`Deseja desagrupar \${ids.length} abas?\`)) await chrome.tabs.ungroup(ids);
  } else {
    if (!confirm("Deseja reorganizar todas as abas automaticamente?")) return;
    setButtonLoading(btn, true);
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith("chrome://")) continue;
      try {
        let contextCategory = await classifyTabContext(tab.title || "", tab.url);
        if (contextCategory === "Geral" || contextCategory === "Outros") {
          try {
            const urlObj = new URL(tab.url);
            const domain = urlObj.hostname.replace("www.", "").split(".")[0];
            contextCategory = domain.charAt(0).toUpperCase() + domain.slice(1);
          } catch (e) {}
        }
        const groups = await chrome.tabGroups.query({ title: contextCategory });
        if (groups.length > 0) {
          await chrome.tabs.group({ tabIds: tab.id, groupId: groups[0].id });
        } else {
          const gid = await chrome.tabs.group({ tabIds: tab.id });
          await chrome.tabGroups.update(gid, { title: contextCategory, color: 'blue' });
        }
      } catch (e) {}
    }
  }
}

async function toggleExpandAll() {
  const groups = await chrome.tabGroups.query({});
  const allExpanded = groups.every((g) => !g.collapsed);
  for (const group of groups) await chrome.tabGroups.update(group.id, { collapsed: allExpanded });
}

async function toggleExtension() {
  const storage = await chrome.storage.local.get("extensionEnabled");
  const newState = !(storage.extensionEnabled !== false);
  await chrome.storage.local.set({ extensionEnabled: newState });
  updateExtensionStatus(newState);
}

function updateExtensionStatus(enabled) {
  const btn = document.getElementById("toggle-extension");
  if (btn) {
    btn.innerText = enabled ? "✅ Extensão Ativa" : "❌ Extensão Desativada";
    btn.style.backgroundColor = enabled ? "#27ae60" : "#7f8c8d";
  }
}

async function saveSession() {
  const name = prompt("Nome da sessão:", new Date().toLocaleString());
  if (!name) return;
  const groups = await chrome.tabGroups.query({});
  if (groups.length === 0) return alert("Nada para salvar.");
  const data = [];
  for (const g of groups) {
    const tabs = await chrome.tabs.query({ groupId: g.id });
    data.push({ title: g.title, color: g.color, collapsed: g.collapsed, tabs: tabs.map(t => ({ url: t.url })) });
  }
  const { savedSessions = {} } = await chrome.storage.local.get("savedSessions");
  savedSessions[name] = data;
  await chrome.storage.local.set({ savedSessions });
  updateSessionList();
}

async function restoreSession() {
  const name = document.getElementById("session-list").value;
  if (!name) return;
  const { savedSessions } = await chrome.storage.local.get("savedSessions");
  const session = savedSessions[name];
  if (!session || !confirm(\`Restaurar "\${name}" em nova janela?\`)) return;
  const win = await chrome.windows.create({ focused: true });
  for (const gData of session) {
    const urls = gData.tabs.map(t => t.url);
    if (urls.length === 0) continue;
    const newTabs = await Promise.all(urls.map(url => chrome.tabs.create({ windowId: win.id, url, active: false })));
    const gid = await chrome.tabs.group({ tabIds: newTabs.map(t => t.id), createProperties: { windowId: win.id } });
    await chrome.tabGroups.update(gid, { title: gData.title, color: gData.color, collapsed: gData.collapsed });
  }
  const [blank] = await chrome.tabs.query({ windowId: win.id, index: 0 });
  if (blank && blank.url === "chrome://newtab/") chrome.tabs.remove(blank.id);
}

async function deleteSession() {
  const name = document.getElementById("session-list").value;
  if (name && confirm(\`Deletar "\${name}"?\`)) {
    const { savedSessions = {} } = await chrome.storage.local.get("savedSessions");
    delete savedSessions[name];
    await chrome.storage.local.set({ savedSessions });
    updateSessionList();
  }
}

async function updateSessionList() {
  const { savedSessions = {} } = await chrome.storage.local.get("savedSessions");
  const list = document.getElementById("session-list");
  list.innerHTML = "";
  Object.keys(savedSessions).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.innerText = name;
    list.appendChild(opt);
  });
  const has = list.options.length > 0;
  list.style.display = has ? "block" : "none";
  document.getElementById("restore-session").style.display = has ? "block" : "none";
  document.getElementById("delete-session").style.display = has ? "block" : "none";
}

async function generateSummary(cardElement, groupId) {
  groupId = parseInt(groupId);
  if (cardElement && cardElement.showSummary) {
    cardElement.showSummary('✨ A IA está lendo suas abas...');
    const group = await chrome.tabGroups.get(groupId);
    const tabs = await chrome.tabs.query({ groupId: groupId });
    const summary = await summarizeContext(group.title, tabs);
    cardElement.showSummary(summary);
  }
}

async function clearDistractions() {
  const ungroupedTabs = await chrome.tabs.query({ groupId: chrome.tabGroups.TAB_GROUP_ID_NONE });
  const idsToRemove = ungroupedTabs.map(t => t.id);
  if (idsToRemove.length > 0 && confirm(\`Fechar \${idsToRemove.length} abas soltas?\`)) {
    await chrome.tabs.remove(idsToRemove);
    loadGroups();
  } else if (idsToRemove.length === 0) {
    alert("Nenhuma distração encontrada!");
  }
}

function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));
  if (hours > 0) return \`\${hours}h \${minutes}m\`;
  if (minutes > 0) return \`\${minutes}m \${seconds}s\`;
  return \`\${seconds}s\`;
}

// Listen to events that change the group structure to avoid redundant reloads.
chrome.tabGroups.onUpdated.addListener(debouncedLoadGroups);
chrome.tabGroups.onCreated.addListener(debouncedLoadGroups);
chrome.tabGroups.onRemoved.addListener(debouncedLoadGroups);
chrome.tabs.onAttached.addListener(debouncedLoadGroups);
chrome.tabs.onDetached.addListener(debouncedLoadGroups);
chrome.tabs.onRemoved.addListener(debouncedLoadGroups);
`,
};

// 2. Criação da estrutura
if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir);
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

// 3. Escrita dos arquivos
for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(rootDir, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
}

// 4. Criação de ícones com dimensões corretas (Placeholders Azuis)
// A Web Store valida se o tamanho do arquivo corresponde ao manifesto.
const icons = {
  "icon16.png":
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mNk+M9Qz0AEYBx0AA3AAQAA//8n0gAAAABJRU5ErkJggg==", // 16x16 Azul
  "icon48.png":
    "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAFklEQVR42mNk+M9Qz0AEYBx0AA3AAQAA//8n0gAAAABJRU5ErkJggg==", // 48x48 Azul
  "icon128.png":
    "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAFklEQVR42mNk+M9Qz0AEYBx0AA3AAQAA//8n0gAAAABJRU5ErkJggg==", // 128x128 Azul
};

for (const [filename, base64] of Object.entries(icons)) {
  fs.writeFileSync(
    path.join(iconsDir, filename),
    Buffer.from(base64, "base64"),
  );
}
console.log("✅ Ícones (placeholders válidos) criados.");

console.log(
  "\\n🚀 Tudo pronto! A pasta 'focusflow' foi criada com o nome AutoTabsFlow.",
);
console.log(
  "👉 Agora vá em chrome://extensions e carregue a pasta 'focusflow'.",
);
