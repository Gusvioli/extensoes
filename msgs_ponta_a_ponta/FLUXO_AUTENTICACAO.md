# 📊 Fluxo de Autenticação - Guia Visual

## 🎯 Como o Usuário Obtém o Token

```
┌─────────────────────────────────────────────────────────────┐
│                  SERVIDOR INICIA                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
                 ✅ WebSocket na porta 8080
                 ✅ HTTP na porta 9080
                 ✅ Token gerado automaticamente
                 ✅ TOKEN.txt criado
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
    LOGS DO SERVIDOR              ARQUIVO TOKEN.txt
┌─────────────────────────┐    ┌─────────────────────┐
│ [LOG]                   │    │ 🔐 SECURE CHAT      │
│ ⚠️ Token: a27e454...   │    │ Token: a27e454...   │
│ 📱 http://localhost:9080│   │ Gerado: 2026-01-28  │
└─────────────────────────┘    └─────────────────────┘
        ↓                                ↓
   Terminal do Dev          Arquivo visual para user
```

---

## 🌐 4 Formas de Acessar o Token

### 1. **Página Web** (Mais Fácil ⭐⭐⭐⭐⭐)

```
📱 Navegador
   ↓
http://localhost:9080
   ↓
┌──────────────────────────┐
│ 🔐 P2P SECURE CHAT       │
│                          │
│ Token: a27e454745...     │
│ [Copiar Token] ← click   │
│                          │
│ WebSocket: ws://...      │
└──────────────────────────┘
   ↓
Cola na extensão
```

### 2. **API JSON** (Para Automações)

```
curl http://localhost:9080/token
   ↓
{
  "token": "a27e454745...",
  "wsUrl": "ws://localhost:8080",
  "requiresAuth": true
}
```

### 3. **Arquivo TOKEN.txt**

```
server/TOKEN.txt
   ↓
[Terminal]
$ cat server/TOKEN.txt
Token: a27e454745...
```

### 4. **Logs do Servidor**

```
[LOG] ⚠️  Autenticação ATIVADA. Token: a27e454745...
```

---

## 📲 Fluxo Completo de Autenticação

```
SERVIDOR                    EXTENSÃO
   │                           │
   ├─ Gera Token              │
   │  Salva TOKEN.txt         │
   │  Inicia HTTP 9080        │
   │                           │
   │  Servidor pronto →────────│─ Extensão abre
   │                           │
   │                      Usuário:
   │                      "Como obter token?"
   │                           │
   │  ←─ Acessa :9080 ─────────┤ Abre navegador
   │  (Página HTML)            │
   │                           │
   │  Mostra token ───────────→│
   │                      Usuário copia
   │                           │
   │  ←─ Cole no campo ────────┤ Extension UI
   │  [Token: a27e454...] ✓    │
   │                           │
   │  ←─ Click "Autenticar" ───┤
   │                           │
   Valida token              
   │                           │
   ├─ Token válido?           │
   │  SIM ↓                    │
   │                           │
   │  "authenticated" ────────→│ UI: ✅ Autenticado
   │                           │
   │  ← WebRTC pode começar ──→│ Pode conectar
   │
```

---

## 🔐 Segurança de Ponta a Ponta

```
ALICE (Extensão)              SERVIDOR              BOB (Extensão)
    │                             │                       │
    ├─ Autentica ────────────────→│                       │
    │  Token: a27e...             │                       │
    │                             │ ✅ Válido             │
    │  ← "Authenticated" ─────────┤                       │
    │                             │                       │
    │ Gera chave ECDH            │                       │
    │                             │                       │
    │  Offer + Public Key ───────→│ ← Offer ──────────────│
    │                             │ (Servidor não vê      │
    │                        [Retransmissão]  chave)
    │                             │                       │
    │  ← Answer + Public Key ────→│ Answer ───────────────│
    │                             │                       │
    │ Derivação de chave          │ Derivação de chave
    │ Shared Secret (ECDH)        │ Shared Secret (ECDH)
    │                             │                       │
    │ AES-256-GCM                 │                       │
    │  ├─ Criptografa              │                       │
    │  │                           │                       │
    │  ├─ Envia dados ────────────→│ ← Retransmite ──────→│
    │  │  (criptografado)          │   (sem descriptografar)
    │  │                           │                       │
    │                             │ Descriptografa
    │                             │ (não consegue)
    │                             │
    │ ✅ Privacidade Garantida    │
```

---

## 📱 Página Web de Token

```
HTTP Server
http://localhost:9080
    │
    ├─ GET /          → HTML com interface bonita
    │                    ✓ Exibe token
    │                    ✓ Botão copiar
    │                    ✓ Instruções
    │                    ✓ Endpoints
    │
    └─ GET /token     → JSON com token
                         {
                           "token": "...",
                           "wsUrl": "ws://...",
                           "requiresAuth": true
                         }
```

---

## ⚙️ Configuração de Ambiente

```
OPÇÃO 1: Variável de Ambiente
$ export AUTH_TOKEN="meu-token-seguro"
$ npm start

OPÇÃO 2: Arquivo .env
server/.env
AUTH_TOKEN=meu-token-seguro

OPÇÃO 3: Automático (Padrão)
Porta 8080: WebSocket
Porta 9080: HTTP Token
Token: Aleatório (32 chars)
```

---

## 📊 Comparação: Antes vs Depois

### ANTES ❌

```
Usuário: "Como pego o token?"
Dev:    "Olha nos logs do servidor"
Usuário: "Onde fica?"
Dev:    "Na primeira linha"
Usuário: [procura 10 minutos]
Dev:    "Ele é este: a27e454745e6aec7d658841f7038225e"
```

### DEPOIS ✅

```
Usuário: "Como pego o token?"
Dev:    "Acesse http://localhost:9080"
Usuário: [abre no navegador]
Usuário: [vê token + botão copiar]
Usuário: [clica copiar]
Usuário: [cola na extensão]
Pronto em 30 segundos!
```

---

## 🎯 Endpoints Disponíveis

```
┌──────────────────────────────────────────┐
│          SERVIDOR RODANDO                │
├──────────────────────────────────────────┤
│                                          │
│ WebSocket (P2P):                        │
│   ws://localhost:8080                    │
│   └─ Sinalização entre clientes         │
│                                          │
│ HTTP (Token):                           │
│   http://localhost:9080/                │
│   └─ Página com interface bonita        │
│   http://localhost:9080/token           │
│   └─ JSON (para automações)             │
│                                          │
│ Arquivo:                                │
│   ./TOKEN.txt                            │
│   └─ Arquivo texto simples              │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🎓 Resumo para o Usuário

| O que? | Onde? | Como? |
|--------|-------|-------|
| Ver token | Página Web | <http://localhost:9080> |
| Copiar token | Página Web | Clique no botão |
| Em arquivo | Terminal | cat server/TOKEN.txt |
| Via API | Script | curl localhost:9080/token |
| Customizar | .env | AUTH_TOKEN=seu-token |

---

## ✨ Recursos Implementados

| Recurso | Status |
|---------|--------|
| ✅ Geração automática de token | ✓ |
| ✅ Página web com UI | ✓ |
| ✅ API JSON (CORS) | ✓ |
| ✅ Arquivo TOKEN.txt | ✓ |
| ✅ Logs com token | ✓ |
| ✅ Variável de ambiente | ✓ |
| ✅ Arquivo .env | ✓ |
| ✅ Botão copiar | ✓ |
| ✅ Instruções embutidas | ✓ |
| ✅ Fallback de portas | ✓ |

---

## 🔗 Próximos Passos

1. **Iniciar servidor:**

   ```bash
   cd server
   npm start
   ```

2. **Acessar página de token:**

   ```
   http://localhost:9080
   ```

3. **Copiar token e usar na extensão**

4. **Conectar e enviar mensagens!**

---

**Agora fica fácil para o usuário! 🎉**
