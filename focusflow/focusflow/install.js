const fs = require('fs');
const path = require('path');

const rootDir = 'focusflow';
const iconsDir = path.join(rootDir, 'icons');

// 1. Definição dos arquivos e conteúdos
const files = {
  'manifest.json': `{
  "manifest_version": 3,
  "name": "FocusFlow: IA de Contexto e Abas",
  "version": "1.0",
  "description": "Organiza suas abas automaticamente por contexto e resume suas pesquisas usando IA.",
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "sidePanel",
    "scripting",
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
    "default_title": "Abrir FocusFlow"
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

  'src/ai-service.js': `/**
 * Tenta classificar o conteúdo da aba em um contexto.
 * Usa Gemini Nano se disponível, ou heurística simples como fallback.
 */
export async function classifyTabContext(title, url) {
  const prompt = \`Analise o título: "\${title}". Classifique em uma categoria curta (máx 2 palavras) como: Trabalho, Viagem, Estudos, Compras, Social ou Outros.\`;

  try {
    if (window.ai && window.ai.languageModel) {
      const session = await window.ai.languageModel.create();
      const result = await session.prompt(prompt);
      return result.trim();
    } else {
      throw new Error("Gemini Nano não disponível");
    }
  } catch (e) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("react") || lowerTitle.includes("js") || lowerTitle.includes("dev")) return "Estudos Dev";
    if (lowerTitle.includes("passagem") || lowerTitle.includes("voo") || lowerTitle.includes("japão")) return "Viagem Japão";
    if (lowerTitle.includes("notebook") || lowerTitle.includes("preço") || lowerTitle.includes("amazon")) return "Compras";
    if (lowerTitle.includes("linkedin") || lowerTitle.includes("slack") || lowerTitle.includes("jira")) return "Trabalho";
    if (lowerTitle.includes("youtube") || lowerTitle.includes("instagram")) return "Redes Sociais";
    return "Geral";
  }
}

export async function summarizeContext(groupName, tabsData) {
  const titles = tabsData.map(t => \`- \${t.title}\`).join("\\n");
  const prompt = \`Você é um assistente de produtividade. O usuário tem as seguintes abas abertas no contexto "\${groupName}":\\n\${titles}\\n\\nCrie um resumo de 1 parágrafo explicando o que o usuário está pesquisando.\`;

  try {
    if (window.ai && window.ai.languageModel) {
      const session = await window.ai.languageModel.create();
      return await session.prompt(prompt);
    } else {
      return \`(Simulação de IA) Você tem \${tabsData.length} abas abertas sobre \${groupName}. Parece que você está comparando opções baseadas nos títulos das páginas.\`;
    }
  } catch (e) {
    return "Não foi possível gerar o resumo no momento.";
  }
}`,

  'src/background.js': `import { classifyTabContext } from './ai-service.js';

let currentGroupId = chrome.tabGroups.TAB_GROUP_ID_NONE;
let lastActiveTime = Date.now();

async function updateFocusTime() {
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
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) return;

    try {
      const contextCategory = await classifyTabContext(tab.title, tab.url);
      if (contextCategory === "Geral" || contextCategory === "Outros") return;

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
      console.error("Erro no FocusFlow:", error);
    }
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

function getRandomColor() {
  const colors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"];
  return colors[Math.floor(Math.random() * colors.length)];
}`,

  'src/sidepanel.html': `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusFlow</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 16px; background-color: #f9f9f9; color: #333; }
    h1 { font-size: 18px; color: #2c3e50; display: flex; align-items: center; gap: 8px; }
    .card { background: white; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 5px solid #ccc; }
    .card h3 { margin: 0 0 4px 0; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%; margin-top: 8px; }
    .btn:hover { background: #2980b9; }
    .btn-focus { background: #27ae60; }
    .btn-focus:hover { background: #219150; }
    .summary { font-size: 12px; color: #666; margin-top: 8px; line-height: 1.4; background: #f0f4f8; padding: 8px; border-radius: 4px; display: none; }
    .badge { font-size: 10px; background: #eee; padding: 2px 6px; border-radius: 10px; font-weight: normal; }
    .time-badge { font-size: 11px; color: #7f8c8d; display: block; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>🚀 FocusFlow</h1>
  <p style="font-size: 12px; color: #777;">Seus contextos ativos:</p>
  <div id="flows-container"><p>Carregando fluxos...</p></div>
  <button id="clear-distractions" class="btn" style="background-color: #e74c3c; margin-top: 20px;">🧹 Limpar Distrações</button>
  <script type="module" src="sidepanel.js"></script>
</body>
</html>`,

  'src/sidepanel.js': `import { summarizeContext } from './ai-service.js';

document.addEventListener('DOMContentLoaded', loadGroups);
document.getElementById('clear-distractions').addEventListener('click', clearDistractions);

async function loadGroups() {
  const container = document.getElementById('flows-container');
  container.innerHTML = '';
  const groups = await chrome.tabGroups.query({});
  const storage = await chrome.storage.local.get('focusStats');
  const stats = storage.focusStats || {};

  if (groups.length === 0) {
    container.innerHTML = '<p style="font-size:12px">Nenhum grupo ativo. Comece a navegar!</p>';
    return;
  }

  for (const group of groups) {
    const tabs = await chrome.tabs.query({ groupId: group.id });
    const timeMs = stats[group.id] || 0;
    const timeStr = formatTime(timeMs);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeftColor = group.color;
    card.innerHTML = \`
      <h3>\${group.title || 'Sem Nome'} <span class="badge">\${tabs.length} abas</span></h3>
      <span class="time-badge">⏱️ Foco: \${timeStr}</span>
      <button class="btn btn-focus" data-id="\${group.id}">🎯 Modo Túnel de Foco</button>
      <button class="btn btn-summary" data-id="\${group.id}">📝 Gerar Resumo</button>
      <div class="summary" id="summary-\${group.id}"></div>
    \`;
    container.appendChild(card);
  }

  document.querySelectorAll('.btn-focus').forEach(b => b.addEventListener('click', (e) => toggleFocusMode(e.target.dataset.id)));
  document.querySelectorAll('.btn-summary').forEach(b => b.addEventListener('click', (e) => generateSummary(e.target.dataset.id)));
}

async function toggleFocusMode(targetGroupId) {
  targetGroupId = parseInt(targetGroupId);
  const allGroups = await chrome.tabGroups.query({});
  for (const group of allGroups) {
    await chrome.tabGroups.update(group.id, { collapsed: group.id !== targetGroupId });
  }
}

async function generateSummary(groupId) {
  groupId = parseInt(groupId);
  const summaryDiv = document.getElementById(\`summary-\${groupId}\`);
  summaryDiv.style.display = 'block';
  summaryDiv.innerText = '✨ A IA está lendo suas abas...';
  const group = await chrome.tabGroups.get(groupId);
  const tabs = await chrome.tabs.query({ groupId: groupId });
  const summary = await summarizeContext(group.title, tabs);
  summaryDiv.innerText = summary;
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

chrome.tabs.onUpdated.addListener(loadGroups);
chrome.tabGroups.onUpdated.addListener(loadGroups);`
};

// 2. Criação da estrutura
if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir);
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

// 3. Escrita dos arquivos
for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(rootDir, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim());;
}

// 4. Criação de ícones válidos (placeholders) para evitar erros
const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCb5zwAAAABJRU5ErkJggg==';
const iconBuffer = Buffer.from(iconBase64, 'base64');
['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
  fs.writeFileSync(path.join(iconsDir, icon), iconBuffer); 
});
console.log("✅ Ícones (placeholders válidos) criados.");

console.log("\\n🚀 Tudo pronto! A pasta 'focusflow' foi criada.");
console.log("👉 Agora vá em chrome://extensions e carregue a pasta 'focusflow'.");
