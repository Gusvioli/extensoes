# 🔐 Guia de Segurança - P2P Secure Chat

## Mudanças de Segurança Implementadas

### Servidor (server/server.js)

#### 1. **IDs Criptograficamente Seguros**
- Antes: `Math.random().toString(36)` (previsível)
- Agora: `crypto.randomBytes(12).toString("hex")` (96 bits de entropia)
- **Impacto**: Torna impossível adivinhar ou forçar brutos nos IDs dos usuários

#### 2. **Autenticação Obrigatória**
- Novo fluxo: Cliente conecta → Recebe ID → Autentica com token → Pode usar o chat
- Token pode ser definido via `AUTH_TOKEN` ou é gerado automaticamente
- Sem autenticação, o cliente não consegue enviar/receber mensagens
- **Impacto**: Apenas usuários autorizados podem usar o servidor

#### 3. **Sem ID via Query String**
- Antes: `?id=customid` permitia força bruta
- Agora: Servidor gera ID seguro, cliente não pode escolher
- **Impacto**: Elimina atacantes tentando reutilizar IDs conhecidos

#### 4. **Validação de Permissões**
- Verifica se cliente alvo está autenticado e conectado
- Rejeita mensagens para clientes não validados
- **Impacto**: Evita envio de mensagens para usuários offline ou não autenticados

#### 5. **Proteção contra CRIME (Compressão)**
- `perMessageDeflate` desabilitado por padrão
- Previne ataques de oracle em WebSocket
- **Impacto**: Protege contra compressão oracle attacks

#### 6. **Métricas Desabilitadas por Padrão**
- Antes: Métricas ativadas automaticamente
- Agora: Precisa de `ENABLE_METRICS=true` explicitamente
- **Impacto**: Evita exposição de informações em logs de produção

### Extensão (secure-p2p-chat/)

#### 1. **Suporte a Autenticação**
- Nova interface para inserir token do servidor
- Campo aparece automaticamente se servidor exigir autenticação
- Token salvo localmente no navegador

#### 2. **IDs Seguros Automaticamente**
- Não permite mais escolher ID via query string
- Apenas copia/compartilha o ID gerado pelo servidor
- Impede confusão de IDs

#### 3. **Mensagens de Sistema Melhoradas**
- Feedback claro sobre autenticação
- Status de conexão segura visível

## Como Usar

### Iniciar o Servidor com Autenticação

```bash
cd server
npm install
npm start
```

O servidor exibirá no console:
```
⚠️  Autenticação ATIVADA. Token obrigatório: a1b2c3d4...
```

### Usar Novo Token Customizado

```bash
AUTH_TOKEN="seu-token-secreto-aqui" npm start
```

### Desabilitar Autenticação (Não Recomendado)

```bash
REQUIRE_AUTH=false npm start
```

### Usar a Extensão

1. **Abra a extensão** no navegador
2. **Espere conectar** ao servidor
   - Se exigir autenticação, um campo 🔐 aparecerá
3. **Insira o token** (fornecido pelo administrador do servidor)
4. **Clique "Autenticar"** ou pressione Enter
5. **Agora pode conectar** a um par

## Variáveis de Ambiente do Servidor

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `8080` | Porta do servidor |
| `MAX_CLIENTS` | `10000` | Limite de clientes simultâneos |
| `REQUIRE_AUTH` | `true` | Ativar/desativar autenticação |
| `AUTH_TOKEN` | `(aleatório)` | Token de autenticação obrigatório |
| `DISABLE_DEFLATE` | `true` | Desabilitar compressão WebSocket |
| `ENABLE_METRICS` | `false` | Exibir métricas periodicamente |
| `HEARTBEAT_INTERVAL` | `30000` | Intervalo de heartbeat (ms) |
| `RATE_LIMIT_WINDOW` | `1000` | Janela de rate limit (ms) |
| `RATE_LIMIT_MAX` | `100` | Máximo de mensagens por janela |

## Fluxo de Conexão Seguro

```
┌─ Extensão ──────────────────────────────────────────────────────┐
│                                                                  │
│ 1. Conecta via WebSocket (sem ID em URL)                       │
│    ↓                                                             │
│ 2. Recebe ID único do servidor (crypto.randomBytes)            │
│    ↓                                                             │
│ 3. Se servidor exigir autenticação:                            │
│    - Mostra campo de token                                      │
│    - Aguarda inserção do token                                  │
│    ↓                                                             │
│ 4. Envia tipo "authenticate" com token                         │
│    ↓                                                             │
│ 5. Se válido: servidor envia "authenticated"                   │
│    ↓                                                             │
│ 6. Agora pode conectar a outro usuário                         │
│    - Envia "key-exchange" com chave pública                    │
│    - Estabelece conexão P2P com WebRTC                        │
│    - Troca de mensagens criptografadas                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Boas Práticas de Segurança

### Para Administradores
- ✅ Use um `AUTH_TOKEN` forte (32+ caracteres)
- ✅ Mude o token periodicamente
- ✅ Distribua o token por canal seguro (não por email/chat)
- ✅ Monitore logs para tentativas de autenticação falha
- ✅ Mantenha o servidor atualizado

### Para Usuários
- ✅ Guarde o token do servidor com segurança
- ✅ Não compartilhe o token pessoalmente
- ✅ Verifique o "Safety Number" na conversa
- ✅ Desconecte quando não usar mais

## Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **ID do Cliente** | Previsível (Math.random) | Criptográfico (96 bits) |
| **Autenticação** | Nenhuma | Token obrigatório |
| **ID via URL** | Permitido (`?id=...`) | Bloqueado |
| **Permissões** | Nenhuma validação | Verifica autenticação |
| **Compressão** | Ativada (CRIME) | Desabilitada |
| **Métricas** | Ativadas (expõe info) | Desabilitadas |
| **Validação** | Mínima | Rigorosa |

## Contato e Suporte

Para reportar vulnerabilidades ou sugerir melhorias de segurança, abra uma issue no repositório.

🔒 **Segurança é prioridade. Use responsavelmente.**
