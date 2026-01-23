# Detalhes para Publicação - Chrome Web Store

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

* **`tabs`:** Necessária para monitorar a abertura e atualização de abas. A extensão acessa o `title` e `url` de cada aba para alimentar o algoritmo de classificação (IA ou Heurística). Sem isso, é impossível identificar o contexto do conteúdo (ex: saber se a aba é sobre "Programação" ou "Viagem").
* **`tabGroups`:** O núcleo da extensão. Permite criar, atualizar (nomear/colorir) e organizar grupos de abas automaticamente. É usada para mover as abas classificadas para seus respectivos contextos sem intervenção manual.
* **`storage`:** Utilizado estritamente para persistência de dados locais (Local Storage), incluindo: 1) Estatísticas de tempo de foco por grupo; 2) Sessões salvas pelo usuário para restauração futura; 3) Preferências de configuração. Nenhum dado pessoal é enviado para servidores externos.
* **`sidePanel`:** A interface de usuário (UI) opera no Painel Lateral para oferecer uma experiência não intrusiva. Isso evita a necessidade de injetar scripts de conteúdo (Content Scripts) nas páginas web para desenhar interfaces, garantindo maior performance e segurança.
* **`host_permissions` (`<all_urls>`):** Indispensável para a funcionalidade de "Agrupamento Automático Global". A extensão precisa ler a URL e o Título de qualquer site que o usuário visite para determinar sua categoria em tempo real. Como a extensão é agnóstica ao site (funciona em toda a web), ela requer acesso a todas as URLs. **Nota:** O processamento desses dados ocorre exclusivamente na memória do dispositivo (On-Device) ou via APIs locais do Chrome.

**Uso de Dados:**

* A extensão coleta dados de navegação (Títulos e URLs)? **Sim.**
* Esses dados são enviados para terceiros? **Não.** O processamento é feito localmente via heurísticas ou através da API `window.ai` (Gemini Nano) do próprio navegador Chrome.
