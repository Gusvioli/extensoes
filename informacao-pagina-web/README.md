# Analisador de Página Web

Esta é uma extensão para o Google Chrome que extrai e exibe informações detalhadas de uma página da web, incluindo análise de SEO e elementos ocultos.

## Funcionalidades

- **Metadados:** Extrai o título, descrição, palavras-chave, autor, e tags de redes sociais (Open Graph, Twitter Cards).
- **Conteúdo:** Extrai os cabeçalhos (H1-H6) e links da página.
- **Informações Técnicas:** Exibe métricas de performance (Core Web Vitals: LCP e CLS), análise de scripts lentos, tempo de carregamento, cookies, armazenamento local/sessão, tecnologias detectadas e dados do navegador.
- **Elementos Ocultos:** Revela inputs ocultos, comentários HTML, dados estruturados (JSON-LD), iframes e regras de robots.txt.
- **Análise SEO:** Sistema de pontuação (0-100) avançado com verificação de SEO On-Page, Técnico e Social, incluindo densidade de conteúdo, HTTPS e dados estruturados.
- **Relatórios:** Gera um relatório completo em HTML e permite a exportação dos dados.
- **Exportação de Dados:** Permite exportar todas as informações coletadas para um arquivo JSON ou copiar para a área de transferência.

## Como Usar

1. Clone este repositório: `git clone https://github.com/seu-usuario/analisador-de-pagina-web.git`
2. Abra o Google Chrome e vá para `chrome://extensions/`.
3. Ative o "Modo do desenvolvedor".
4. Clique em "Carregar sem compactação" e selecione a pasta da extensão.
5. A extensão estará ativa e pronta para ser usada.

## Como Contribuir

1. Faça um fork deste repositório.
2. Crie uma nova branch: `git checkout -b minha-feature`
3. Faça suas alterações e commit: `git commit -m 'Adiciona minha feature'`
4. Envie para a branch original: `git push origin minha-feature`
5. Crie um pull request.

## Histórico de Versões (Changelog)

### v1.4.0 (23/02/2026)

- **Tecnologias:** Detecção aprimorada verificando variáveis globais (React, Vue, jQuery, etc.) através da execução no contexto principal da página.

### v1.3.0 (23/02/2026)

- **Técnico:** Adicionada análise de scripts externos (Resource Timing API) para identificar gargalos de carregamento.
- **Melhorias:** Refinamento nas descrições das métricas de performance.
- **Performance:** Adicionada monitoramento de Core Web Vitals (LCP e CLS) na aba Técnica.
- **SEO:** Atualização do motor de análise de SEO para nível sênior, cobrindo critérios On-Page, Técnicos e Sociais com maior profundidade.

### v1.1.5 (21/01/2026)

- **Correção:** Resolução do problema de fechamento do navegador ao exportar arquivos JSON grandes (processamento movido para background).
- **Funcionalidade:** Adicionado botão para copiar o JSON diretamente para a área de transferência.
- **Melhorias:** Ajustes nas permissões do manifesto e otimização do processo de download.

### v1.1 (21/01/2026)

- **Internacionalização:** Suporte completo para Português (pt_BR) e Inglês (en), com seletor de idioma dinâmico.
- **Doações:** Integração com PayPal e geração de QR Code para facilitar o apoio ao desenvolvimento.
- **Interface:** Adicionado indicador de carregamento (spinner) para melhor feedback visual.
- **Correções:** Tratamento de erros para URLs restritas (`chrome://`, `chrome-extension://`) e correções na estrutura de pastas (`_locales`).
- **Relatórios:** Adicionado gráfico visual de distribuição de cabeçalhos (H1-H6) no relatório completo.

### v1.0

- Lançamento inicial com análise de metadados, SEO, conteúdo técnico e elementos ocultos.

## Criador

- **Gustavo Violi** - [GitHub](https://github.com/gusvioli) | [LinkedIn](https://www.linkedin.com/in/gustavo-violi/)
