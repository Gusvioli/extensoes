# Detalhes para Publicação - Chrome Web Store

## Informações da Loja

**Nome da Extensão:**
AutoTabsFlow: Organizador de Abas com IA

**Resumo (Short Description):**
Organize abas automaticamente, gere resumos e elimine a bagunça com IA Local (Gemini Nano). Recupere seu foco agora.

**Descrição Detalhada (Long Description):**
O **AutoTabsFlow** é o seu assistente de produtividade definitivo para o Google Chrome. Se você se sente sobrecarregado com dezenas de abas abertas ou perde tempo organizando janelas, esta extensão foi feita para você.

Utilizando a tecnologia de ponta **Gemini Nano (IA Local)**, o AutoTabsFlow entende o contexto da sua navegação em tempo real e organiza seu navegador automaticamente.

🚀 **Funcionalidades Principais:**

* **📂 Agrupamento Automático Inteligente:** Diga adeus à bagunça. A extensão analisa o título e a URL de cada nova aba. Pesquisando sobre "React"? Ela vai para o grupo "Desenvolvimento". Planejando férias? Vai para "Viagem". Tudo instantâneo.
* **🧠 IA Local (Privacidade Total):** Diferente de outras extensões, utilizamos a IA integrada ao próprio Chrome para classificar contextos e gerar resumos. Seus dados de navegação nunca saem do seu dispositivo.
* **📝 Resumos de Contexto:** Perdeu o fio da meada em uma pesquisa longa? A IA lê os títulos das abas de um grupo e gera um resumo explicativo sobre o que você estava pesquisando.
* **🎯 Modo Túnel de Foco:** Precisa de concentração máxima? Ative este modo para expandir apenas o grupo de trabalho atual e colapsar/esconder todos os outros automaticamente.
* **💾 Gerenciador de Sessões:** Salve seus grupos de abas atuais como uma "Sessão" (ex: "Projeto X", "Planejamento Fim de Semana") para fechar o navegador sem medo e restaurar tudo exatamente como estava depois.
* **⏱️ Estatísticas de Foco:** Acompanhe quanto tempo você passa focado em cada contexto (Trabalho, Lazer, Estudos, etc.) com métricas visuais no painel lateral.
* **🧹 Limpeza de Distrações:** Um "Botão de Pânico" que identifica e fecha todas as abas soltas que não pertencem a nenhum grupo importante, limpando sua mente e seu navegador.

🌟 **Por que usar o AutoTabsFlow?**

1. **Economize Memória (RAM) e Cognitiva:** Menos abas soltas significam um navegador mais rápido e uma mente menos cansada.
2. **Privacidade em Primeiro Lugar:** Todo o processamento acontece no seu dispositivo (On-Device).
3. **Fluxo Contínuo:** Não pare o que está fazendo para organizar abas. Nós fazemos isso por você.

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

* **`tabs` e `tabGroups`:** A extensão precisa acessar o título e a URL das abas (`tabs`) para que a IA Local possa identificar o contexto (ex: Trabalho vs. Lazer) e, em seguida, mover essas abas para os grupos apropriados (`tabGroups`) automaticamente.
* **`sidePanel`:** A interface principal da extensão reside no Painel Lateral do Chrome para permitir que o usuário gerencie seus grupos e visualize resumos sem interromper a navegação na página atual.
* **`storage`:** Usada exclusivamente para salvar as preferências do usuário, estatísticas de tempo de foco e as definições de sessões salvas localmente no dispositivo.
* **`host_permissions` (`<all_urls>`):** Necessário para o funcionamento da IA de classificação. A extensão precisa ler o título/URL de qualquer site que o usuário visite para categorizá-lo no grupo correto. O processamento é feito localmente e nenhum dado é enviado para servidores externos.

**Uso de Dados:**

* A extensão coleta dados de navegação (Títulos e URLs)? **Sim.**
* Esses dados são enviados para terceiros? **Não.** O processamento é feito localmente via heurísticas ou através da API `window.ai` (Gemini Nano) do próprio navegador Chrome.
