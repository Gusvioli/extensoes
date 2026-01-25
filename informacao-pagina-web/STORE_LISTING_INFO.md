# Informações para Publicação na Chrome Web Store

Este documento reúne todas as informações necessárias para preencher os campos de cadastro da extensão "Analisador de Página Web" no Painel do Desenvolvedor do Chrome.

## 1. Detalhes da Loja (Store Listing)

**Nome da Extensão:**  
Analisador de Página Web

**Resumo (Short Description):**  
Analisa a página ativa para extrair metadados, SEO, tecnologias e dados técnicos.

**Descrição Detalhada (Description):**  
O Analisador de Página Web é uma ferramenta essencial para desenvolvedores, especialistas em SEO e curiosos que desejam entender profundamente a estrutura de qualquer página na internet. Com apenas um clique, obtenha um raio-X completo do site que você está visitando.

Principais Funcionalidades:

📊 **Análise de SEO Completa**

- Pontuação de SEO (0 a 100) baseada em boas práticas de mercado.
- Verificação detalhada de Títulos e Meta Descrições (tamanho e qualidade).
- Validação de Tags H1 e hierarquia de conteúdo.
- Checagem de texto alternativo (Alt) em imagens para acessibilidade.
- Detecção de Tags Canônicas, Viewport (Mobile), Open Graph e Twitter Cards.

🛠️ **Informações Técnicas Detalhadas**

- Tempo de carregamento da página.
- Contagem de Cookies, LocalStorage e SessionStorage.
- Detecção de tecnologias, frameworks e bibliotecas usadas (React, Vue, jQuery, Bootstrap, etc.).
- Informações sobre o servidor e cabeçalhos de segurança.

🔍 **Elementos Ocultos e Estrutura**

- Revele campos de formulário ocultos (hidden inputs).
- Visualize comentários HTML deixados no código-fonte.
- Acesse dados estruturados (JSON-LD).
- Identifique iframes e scripts externos.

📄 **Relatórios e Exportação**

- Visualize os dados em uma interface limpa e organizada por abas.
- Gere um Relatório Completo em HTML para compartilhar com clientes ou equipe.
- Exporte todos os dados brutos em formato JSON para análise posterior.

**Privacidade em Primeiro Lugar:**  
Toda a análise é feita localmente no seu navegador. Nenhum dado é enviado para servidores externos.

**Categoria:**  
Ferramentas do desenvolvedor (Developer Tools)

**Idioma:**  
Português (Brasil)

---

## 2. Práticas de Privacidade (Privacy Practices)

Ao preencher a aba "Privacidade", utilize as seguintes informações baseadas na análise técnica do código:

**Finalidade Única (Single Purpose):**  
Analisa e exibe informações técnicas, de SEO e metadados da página web ativa para auxiliar desenvolvedores e profissionais de marketing.

**Justificativa de Permissões:**

- **activeTab:** Concede acesso temporário à aba atual somente quando o usuário clica no ícone da extensão. Isso permite que a ferramenta analise o conteúdo da página (DOM) sob demanda, sem exigir permissões amplas de leitura para todos os sites visitados, garantindo maior privacidade e segurança.
- **scripting:** Essencial para a funcionalidade principal de análise. Permite que a extensão injete e execute o script (`extractPageDetails`) na página ativa para coletar metadados, informações de SEO, tecnologias utilizadas e outros dados técnicos exibidos no relatório.
- **tabs:** Utilizada para monitorar a navegação em segundo plano (eventos `onUpdated` e `onActivated`) para atualizar o ícone da extensão (Badge), indicando visualmente se a página é suportada, e para abrir novas abas ao gerar o Relatório Completo.

**Coleta de Dados (Data Usage):**  
Marque as seguintes categorias de dados que a extensão processa (mesmo que localmente):

1. **Conteúdo do site (Website Content)**
   - *O que é coletado:* Textos, imagens, links, metadados e elementos ocultos da página.
   - *Uso:* Funcionalidade do aplicativo (A extensão precisa ler o conteúdo para gerar o relatório).

2. **Histórico da Web (Web History)**
   - *O que é coletado:* A URL da página visitada e o título.
   - *Uso:* Funcionalidade do aplicativo (Para identificar a página no relatório e verificar suporte).

---

## 3. Política de Privacidade (Privacy Policy)

*Copie e cole o texto abaixo no campo de Política de Privacidade ou hospede este conteúdo em uma URL pública.*

### Política de Privacidade - Analisador de Página Web

**Última atualização:** 21 de Janeiro de 2026

A privacidade dos nossos usuários é uma prioridade absoluta. Esta política descreve de forma transparente como a extensão "Analisador de Página Web" interage com seus dados.

#### 1. Coleta e Uso de Dados

A extensão foi projetada para processar dados estritamente para sua funcionalidade principal: analisar a página que você está visitando.

- **Conteúdo do Site:** A extensão lê o código-fonte da página ativa (DOM) para extrair textos, imagens, links, metadados, scripts e elementos ocultos. Isso é necessário para gerar as estatísticas e o relatório de SEO.
- **Histórico da Web:** A extensão acessa a URL e o título da aba ativa para identificar a página no relatório gerado e verificar se a extensão pode ser executada naquele contexto.

#### 2. Processamento de Dados

**Todo o processamento é local.**

- A extensão **não** possui servidores backend.
- A extensão **não** envia, transmite ou sincroniza seus dados com terceiros.
- Os dados analisados permanecem na memória do seu navegador apenas enquanto a extensão está aberta e são descartados logo após, a menos que você opte manualmente por exportá-los.

#### 3. Compartilhamento de Dados

Nós não vendemos, trocamos ou transferimos suas informações. A única forma de os dados saírem do ambiente do seu navegador é através de ação direta do usuário, utilizando os botões "Exportar JSON" ou "Ver Relatório Completo", que geram arquivos locais no seu dispositivo.

#### 4. Contato

Para questões relacionadas a esta política ou ao funcionamento da extensão, entre em contato através do suporte na Chrome Web Store ou pelo repositório oficial do projeto.

---

## 4. Resolução de Avisos (Troubleshooting)

**Aviso: "Essa extensão não é considerada confiável pelo recurso Navegação segura com proteção reforçada"**

Este aviso é comum para novos desenvolvedores e não indica necessariamente um erro no código. Para resolvê-lo e ganhar o selo de "Confiável", siga estes passos no Painel do Desenvolvedor:

1. **Verificação da Conta:** Certifique-se de que pagou a taxa de registro e verificou seu e-mail e número de telefone.
2. **Autenticação de Dois Fatores (2FA):** Ative a verificação em duas etapas na sua conta Google usada para publicar.
3. **Histórico:** O Google exige alguns meses de histórico positivo (sem violações de política) e um certo número de instalações ativas para remover este aviso automaticamente.
4. **Política de Privacidade:** Mantenha o link da Política de Privacidade sempre ativo e atualizado na aba "Privacidade" do painel.
5. **Permissões:** Se o aviso persistir por muito tempo, considere remover a permissão `tabs` (se possível), pois ela é considerada de alto risco e exige maior nível de confiança.

*Nota: Este processo é automático pelo algoritmo do Google e pode levar de algumas semanas a meses.*
