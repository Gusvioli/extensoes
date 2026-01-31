# Política de Privacidade - AutoTabsFlow

**Última atualização:** Outubro de 2024

A sua privacidade é a nossa prioridade. Esta Política de Privacidade descreve como a extensão **AutoTabsFlow** coleta, usa e protege as suas informações enquanto você navega.

## 1. Informações que Coletamos

A extensão **AutoTabsFlow** acessa estritamente as informações necessárias para o seu funcionamento:

*   **Títulos e URLs das Abas:** Monitoramos as abas abertas no seu navegador para identificar o contexto do conteúdo (ex: "Trabalho", "Viagem", "Desenvolvimento").
*   **Dados de Sessão:** Quando você opta por salvar uma sessão, armazenamos a lista de abas (URLs e Títulos) e a configuração dos grupos.
*   **Estatísticas de Uso:** Contabilizamos o tempo de foco em cada grupo de abas para exibir gráficos de produtividade.

## 2. Como Usamos as Informações

As informações coletadas são utilizadas exclusivamente para:

*   **Organização Automática:** Classificar e agrupar abas automaticamente com base no seu conteúdo.
*   **Resumos Inteligentes:** Gerar resumos textuais sobre o que você está pesquisando em um determinado grupo de abas.
*   **Gerenciamento de Sessões:** Permitir que você salve e restaure conjuntos de abas posteriormente.

## 3. Processamento de Dados e IA (Gemini Nano)

**Todo o processamento é realizado localmente no seu dispositivo (On-Device).**

*   Utilizamos a tecnologia **Gemini Nano** (integrada ao Chrome) ou algoritmos heurísticos locais para analisar os títulos e URLs.
*   **Nenhum dado de navegação é enviado para servidores externos** ou para a nuvem da Google/OpenAI/etc. para fins de processamento pela extensão. A IA roda diretamente no seu navegador.

## 4. Armazenamento de Dados

*   Todos os dados (configurações, sessões salvas, estatísticas) são armazenados localmente no seu navegador utilizando a API `chrome.storage.local`.
*   Esses dados não são sincronizados com servidores externos e são removidos se você desinstalar a extensão ou limpar os dados de navegação.

## 5. Compartilhamento com Terceiros

**Nós não vendemos, trocamos ou transferimos suas informações pessoais para terceiros.** A extensão funciona de forma autônoma e offline (no sentido de não depender de um backend próprio).

## 6. Permissões Solicitadas

*   `tabs` e `tabGroups`: Para ler, agrupar e organizar suas abas.
*   `storage`: Para salvar suas preferências e sessões localmente.
*   `sidePanel`: Para exibir a interface da extensão.
*   `host_permissions` (`<all_urls>`): Necessário para que a IA possa ler o título/URL de qualquer site que você visite para categorizá-lo.

## 7. Contato

Se você tiver dúvidas sobre esta política de privacidade, entre em contato através da página de suporte na Chrome Web Store.
