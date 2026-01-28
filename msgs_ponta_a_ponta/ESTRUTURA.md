# 📁 Estrutura do Projeto - P2P Secure Chat

```
msgs_ponta_a_ponta/
│
├── 📄 README.md (principal)
├── 📄 QUICKSTART.md (setup rápido)
├── 📄 GUIA_SEGURANÇA.md (documentação de segurança)
├── 📄 IMPLEMENTACAO_RESUMO.md (resumo das mudanças)
├── 📄 CHANGELOG.md (histórico de versões)
│
├── 📦 secure-p2p-chat/ (extensão do navegador)
│   ├── 📄 README.md (guia da extensão)
│   ├── 📄 manifest.json (configuração da extensão)
│   │
│   ├── 🎨 popup.html (interface principal)
│   ├── 💄 popup.css (estilos)
│   ├── 📱 popup.js (lógica principal - ~900 linhas)
│   │
│   ├── 🔐 crypto-handler.js (criptografia E2EE)
│   ├── 🔌 webrtc-handler.js (WebRTC P2P)
│   │
│   └── 🎨 icons/ (ícones da extensão)
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── 🖥️ server/ (servidor de sinalização)
│   ├── 📄 README.md (guia completo do servidor)
│   ├── 📄 package.json (dependências)
│   │
│   ├── 🔐 server.js (código principal - ~350 linhas)
│   ├── 🧪 test-security.js (testes de segurança)
│   ├── 🚀 start.sh (script de inicialização)
│   │
│   ├── 📋 .env.example (exemplo de configuração)
│   └── 📋 .gitignore (arquivos ignorados)
│
├── 🐳 Docker/ (containerização)
│   ├── Dockerfile (imagem Docker)
│   └── docker-compose.yml (orquestração)
│
└── 📄 create-project.js (setup inicial)
```

## 📊 Arquivos por Categoria

### 📚 Documentação
| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| README.md | Principal | Visão geral do projeto |
| QUICKSTART.md | Setup | 5 minutos para começar |
| GUIA_SEGURANÇA.md | Segurança | Detalhes de implementação |
| IMPLEMENTACAO_RESUMO.md | Resumo | O que foi feito |
| CHANGELOG.md | Histórico | Versões e mudanças |
| server/README.md | Servidor | Documentação completa |
| secure-p2p-chat/README.md | Extensão | Guia da extensão |

### 🖥️ Servidor (Node.js)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| server/server.js | ~350 | Servidor WebSocket seguro |
| server/test-security.js | ~200 | Testes automatizados |
| server/package.json | ~20 | Dependências |
| server/start.sh | ~80 | Script de inicialização |
| server/.env.example | ~60 | Exemplo de config |

### 🎨 Extensão (Chrome/Chromium)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| secure-p2p-chat/popup.js | ~900 | Lógica principal |
| secure-p2p-chat/popup.html | ~180 | Interface |
| secure-p2p-chat/popup.css | ~200 | Estilos |
| secure-p2p-chat/crypto-handler.js | ~150 | Criptografia E2EE |
| secure-p2p-chat/webrtc-handler.js | ~164 | WebRTC P2P |
| secure-p2p-chat/manifest.json | ~25 | Metadados |

### 🐳 Docker
| Arquivo | Descrição |
|---------|-----------|
| Dockerfile | Imagem Docker Alpine |
| docker-compose.yml | Orquestração completa |

## 🔄 Fluxo de Dados

### Servidor → Cliente
```
┌─────────────────────────────────────────────────────────────┐
│ Servidor de Sinalização (server.js)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Gera ID seguro (crypto.randomBytes)                     │
│ 2. Envia: { type: 'your-id', id: '...', requiresAuth: true}│
│ 3. Aguarda: { type: 'authenticate', token: '...' }        │
│ 4. Valida token                                             │
│ 5. Marca cliente como autenticado                           │
│ 6. Encaminha mensagens entre clientes P2P                  │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Cliente → Servidor → Cliente
```
┌──────────────────────────────────────────────────────────────────┐
│ Cliente 1 (popup.js + crypto-handler.js + webrtc-handler.js)   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ 1. Conecta ao servidor (popup.js)                               │
│ 2. Recebe ID e flag requiresAuth                                │
│ 3. Autentica com token (popup.js)                               │
│ 4. Obtém ID do Cliente 2                                        │
│ 5. Gera par ECDH (crypto-handler.js)                            │
│ 6. Envia key-exchange com chave pública                         │
│ 7. Recebe chave pública do Cliente 2                            │
│ 8. Deriva chave secreta (crypto-handler.js)                     │
│ 9. Estabelece conexão WebRTC P2P (webrtc-handler.js)           │
│ 10. Criptografa mensagens com AES-256-GCM                      │
│ 11. Envia via DataChannel WebRTC                               │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## 🔐 Camadas de Segurança

```
┌─────────────────────────────────────────────────┐
│ Nível 1: Autenticação do Servidor              │
│ - Token obrigatório                            │
│ - Válido via crypto.timingSafeEqual (futuro)   │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Nível 2: Validação de Mensagens                │
│ - Estrutura (type, target, payload)            │
│ - Rate limiting (100 msgs/segundo)             │
│ - Permissões (alvo autenticado)                │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Nível 3: Criptografia de Transporte            │
│ - WebSocket com compressão desabilitada        │
│ - Sem CRIME attacks possível                   │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Nível 4: Criptografia E2EE                     │
│ - ECDH P-256 para troca de chaves              │
│ - AES-256-GCM para mensagens                   │
│ - IV aleatório por mensagem                    │
│ - Safety Number para verificação               │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Nível 5: WebRTC P2P Direto                     │
│ - Conexão direta entre clientes                │
│ - Servidor não vê payload                      │
│ - STUN servers públicos para NAT               │
└─────────────────────────────────────────────────┘
```

## 🚀 Lifecycle da Aplicação

### Servidor
```
1. Inicialização (server.js)
   ├─ Carrega variáveis de ambiente
   ├─ Valida configuração
   ├─ Exibe informações de segurança
   └─ Inicia WebSocket na porta

2. Conexão de Cliente
   ├─ Gera ID criptográfico
   ├─ Envia ID + flag requiresAuth
   └─ Aguarda autenticação

3. Autenticação
   ├─ Recebe token
   ├─ Valida token
   ├─ Marca como autenticado
   └─ Pronto para conectar

4. Operação Normal
   ├─ Recebe mensagens de clientes autenticados
   ├─ Valida estrutura
   ├─ Aplica rate limit
   ├─ Encaminha para destino
   └─ Registra atividade

5. Encerramento
   ├─ Recebe SIGTERM/SIGINT
   ├─ Fecha conexões clientes
   ├─ Limpa recursos
   └─ Sai com código 0
```

### Extensão
```
1. Instalação
   ├─ Carrega manifest.json
   ├─ Inicializa storage
   └─ Pronta para usar

2. Primeiro Uso
   ├─ Conecta ao servidor
   ├─ Recebe ID
   ├─ Exibe UI de autenticação
   └─ Aguarda token

3. Autenticação
   ├─ Usuário insere token
   ├─ Envia para servidor
   ├─ Aguarda confirmação
   └─ Ativa campo de conexão

4. Conexão a Par
   ├─ Usuário insere ID do par
   ├─ Gera par ECDH
   ├─ Envia key-exchange
   ├─ Aguarda resposta
   ├─ Estabelece WebRTC
   └─ Inicia chat

5. Chat Ativo
   ├─ Usuário digita mensagem
   ├─ Criptografa com AES-256-GCM
   ├─ Envia via WebRTC
   ├─ Recebe e decripta
   └─ Exibe na conversa

6. Encerramento
   ├─ Usuário clica "Encerrar Sessão"
   ├─ Fecha conexão WebRTC
   ├─ Apaga chave secreta
   └─ Volta à tela inicial
```

## 📈 Tamanho do Projeto

```
Código-fonte:
  - Servidor: ~400 linhas
  - Extensão: ~1.500 linhas
  - Total: ~1.900 linhas

Documentação:
  - Guias: ~2.000 linhas
  - Exemplos: ~200 linhas
  - Total: ~2.200 linhas

Dependências:
  - npm: 1 pacote (ws)
  - Chrome API: nativo

Tamanho total em disco:
  - Código: ~50KB
  - node_modules: ~1MB
  - Ícones: ~100KB
  - Total: ~1,2MB
```

## 🔧 Configurações Padrão

```javascript
// Segurança (padrão)
PORT = 8080
REQUIRE_AUTH = true
AUTH_TOKEN = (gerado automaticamente)
DISABLE_DEFLATE = true
MAX_CLIENTS = 10000

// Rate Limiting (padrão)
RATE_LIMIT_WINDOW = 1000ms
RATE_LIMIT_MAX = 100 mensagens

// Heartbeat (padrão)
HEARTBEAT_INTERVAL = 30000ms
HEARTBEAT_TIMEOUT = 5000ms

// Monitoramento (padrão)
ENABLE_METRICS = false
```

## 🎯 Objetivos de Design

1. **Segurança Máxima** - Múltiplas camadas
2. **Documentação Clara** - Fácil de entender
3. **Sem Dependências** - Apenas `ws` necessário
4. **Escalável** - Suporta 10k+ clientes
5. **Leve** - ~1MB total com dependencies
6. **Pronto para Produção** - Docker, logs, health checks

---

Estrutura mantém clareza, segurança e simplicidade como prioridades! 🔒
