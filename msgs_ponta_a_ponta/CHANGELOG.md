# 📜 Changelog - P2P Secure Chat

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [Não Lançado]

### 🔐 Segurança (Major)

#### Adicionado

- **Autenticação Obrigatória**: Token necessário para conectar ao servidor
- **IDs Criptograficamente Seguros**: Usando `crypto.randomBytes(12)` (96 bits)
- **Validação de Autenticação**: Clientes precisam autenticar antes de enviar mensagens
- **Proteção contra CRIME**: Desabilitar compressão WebSocket por padrão
- **Mapa de Clientes Autenticados**: Rastreamento de autenticação
- **Validação de Destino**: Verifica se cliente alvo está autenticado

#### Modificado

- **Configuração de Métricas**: Agora desabilitado por padrão (`false` ao invés de `true`)
- **Fluxo de Conexão**: Agora requer autenticação antes de qualquer operação
- **Resposta "your-id"**: Inclui flag `requiresAuth`
- **Logging**: Agora exibe token obrigatório e compressão desabilitada

#### Removido

- **ID via Query String**: Não é mais possível especificar ID via `?id=...`
- **IDs Previsíveis**: Removido `Math.random().toString(36)`

### 📱 Extensão (Major)

#### Adicionado

- **Campo de Token**: Interface para inserir token de autenticação
- **Função de Autenticação**: `authenticateWithServer()`
- **Suporte ao Tipo "authenticate"**: Novo tipo de mensagem
- **Handling de "authenticated"**: Resposta do servidor processada
- **Flag requiresAuth**: Detecta se servidor exige autenticação
- **Botão de Autenticação**: UI para enviar token

#### Modificado

- **Fluxo de Conexão**: Agora autentica antes de conectar a par
- **Handler de mensagens**: Valida autenticação antes de processar
- **startConnection()**: Verifica autenticação antes de conectar
- **Edição de ID**: Agora apenas gera novo ID do servidor

#### Removido

- **ID via Query String**: Removido suporte a `?id=...`
- **Customização de ID**: Não permite mais escolher ID

### 📚 Documentação

#### Adicionado

- **GUIA_SEGURANÇA.md**: Guia completo de segurança em português
- **server/README.md**: Documentação do servidor
- **secure-p2p-chat/README.md**: Documentação da extensão
- **QUICKSTART.md**: Setup rápido em 5 minutos
- **IMPLEMENTACAO_RESUMO.md**: Resumo de tudo que foi feito
- **server/.env.example**: Exemplo de configuração
- **Dockerfile**: Container Docker pronto
- **docker-compose.yml**: Orquestração de container

### 🛠️ Ferramentas

#### Adicionado

- **server/start.sh**: Script bash para iniciar servidor com configurações
- **server/test-security.js**: Suite de testes de segurança

## [1.0.0] - 2026-01-27

### 🎉 Lançamento Inicial

#### Características

- ✅ Comunicação P2P criptografada E2EE
- ✅ WebRTC para conexão direta
- ✅ ECDH para troca de chaves
- ✅ AES-256-GCM para criptografia
- ✅ Servidor de sinalização WebSocket
- ✅ Extensão Chrome/Chromium
- ✅ Suporte a texto e imagens
- ✅ Contatos salvos
- ✅ Safety Number para verificação
- ✅ Interface responsiva

## 🔄 Versionamento

Este projeto segue [Semantic Versioning](https://semver.org/):

- **MAJOR**: Mudanças incompatíveis
- **MINOR**: Novas funcionalidades compatíveis
- **PATCH**: Correções de bugs

## 📋 Tipos de Mudança

Usamos as seguintes categorias:

- 🔐 **Segurança**: Correções e melhorias de segurança
- ✨ **Características**: Novas funcionalidades
- 🐛 **Bugs**: Correções de bugs
- ♻️ **Refatoração**: Mudanças internas sem alteração funcional
- 📚 **Documentação**: Mudanças em documentação
- ⚡ **Performance**: Melhorias de performance
- 🎨 **UI**: Mudanças visuais ou de interface

## 🏗️ Roadmap

### Curto Prazo (v1.1)

- [ ] Teste de segurança melhorado
- [ ] Melhor gerenciamento de erros
- [ ] Logging estruturado em JSON

### Médio Prazo (v1.2)

- [ ] Suporte a múltiplas conversas simultâneas
- [ ] Histórico criptografado persistente
- [ ] Temas de interface (escuro/claro)

### Longo Prazo (v2.0)

- [ ] Chamadas de voz/vídeo
- [ ] Compartilhamento de arquivos seguro
- [ ] Sincronização multi-dispositivo
- [ ] Dashboard de administração
- [ ] Webhooks de eventos

## 🤝 Contribuições

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

## 📜 Licença

MIT - Veja [LICENSE](LICENSE)

---

**Nota**: Este projeto prioriza segurança e privacidade acima de tudo.
