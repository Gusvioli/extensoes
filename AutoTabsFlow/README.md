# 🚀 AutoTabsFlow

**AutoTabsFlow** é uma extensão para Google Chrome que utiliza Inteligência Artificial (Gemini Nano) e heurísticas para organizar automaticamente suas abas em grupos baseados em contexto.

## ✨ Funcionalidades

- **Agrupamento Automático:** Classifica abas em categorias como *Trabalho, Desenvolvimento, Viagem, Compras*, etc.
- **Resumos com IA:** Gera um resumo explicativo sobre o conteúdo de um grupo de abas.
- **Modo Túnel de Foco:** Foca em um único grupo e colapsa todos os outros.
- **Gerenciamento de Sessões:** Salve e restaure conjuntos de abas.
- **Estatísticas de Tempo:** Monitora o tempo de foco em cada grupo.

## 🛠️ Instalação

1. **Gere os arquivos da extensão:**
   Certifique-se de ter rodado o script de instalação para criar a pasta `focusflow`:
   ```bash
   node install.js
   ```

2. **Carregue no Chrome:**
   - Abra o Chrome e digite `chrome://extensions`.
   - Ative o **Modo do desenvolvedor** (canto superior direito).
   - Clique em **Carregar sem compactação** (Load unpacked).
   - Selecione a pasta `focusflow` que foi criada dentro deste diretório.

## 🧠 Requisitos para IA (Gemini Nano)

Para as funcionalidades de IA (classificação avançada e resumos):
1. Use o **Chrome Canary** ou versão recente (v127+).
2. Habilite as flags:
   - `chrome://flags/#prompt-api-for-gemini-nano`: **Enabled**
   - `chrome://flags/#optimization-guide-on-device-model`: **Enabled BypassPerfRequirement**

*Se a IA não estiver disponível, a extensão usará automaticamente um sistema de palavras-chave (heurística).*

## 📄 Licença
MIT License.