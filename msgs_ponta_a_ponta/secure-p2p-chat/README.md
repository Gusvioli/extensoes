# 🔐 P2P Secure Chat - Extensão do Navegador

Extensão de navegador para comunicação privada P2P com criptografia de ponta a ponta (E2EE).

## ✨ Características

- 🔒 **E2EE (Criptografia de Ponta a Ponta)** - Apenas você e o destinatário veem as mensagens
- 🔐 **Autenticação Segura** - Token obrigatório para conectar ao servidor
- 🆔 **IDs Seguros** - Gerados criptograficamente pelo servidor
- 🤝 **WebRTC P2P** - Conexão direta sem passar pelo servidor
- 💬 **Texto e Imagens** - Suporte completo para diferentes tipos de mídia
- 💾 **Contatos Salvos** - Salve IDs com apelidos para acesso rápido
- 🔍 **Safety Numbers** - Verifique a impressão digital do seu par
- 📌 **Janela Flutuante** - Fixe a janela do chat em uma aba separada

## 📦 Instalação

### Método 1: Chrome Web Store (quando disponível)

1. Acesse a Chrome Web Store
2. Procure por "P2P Secure Chat"
3. Clique em "Adicionar ao Chrome"

### Método 2: Manual (Desenvolvimento)

1. **Abra o Chrome** e vá para `chrome://extensions/`
2. **Ative "Modo de desenvolvedor"** (canto superior direito)
3. **Clique "Carregar extensão sem empacotamento"**
4. **Selecione a pasta** `secure-p2p-chat/`

## 🚀 Primeira Execução

### 1. Iniciar o Servidor

```bash
cd server
npm install
npm start
```

Você verá:
```
✅ Servidor de sinalização iniciado na porta 8080
⚠️  Autenticação ATIVADA. Token obrigatório: a1b2c3d4...
```

**Copie o token** que aparece no console.

### 2. Abrir a Extensão

1. **Clique no ícone** da extensão na barra de ferramentas
2. **Configure a URL do servidor:**
   - Padrão: `ws://localhost:8080`
   - Remoto: `wss://seu-servidor.com`

### 3. Autenticar

1. **Um campo 🔐 aparecerá** (se autenticação for obrigatória)
2. **Cole o token** do servidor
3. **Clique "Autenticar"** ou pressione Enter

### 4. Conectar a um Par

1. **Copie seu ID** (clique no seu ID para copiar)
2. **Compartilhe seu ID** com a outra pessoa de forma segura
3. **Cole o ID do outro** no campo "ID do outro usuário"
4. **Clique "Conectar"**
5. **Verifique o "Safety Number"** para garantir autenticidade

## 📱 Interface

### Header
- **Seu ID**: Seu identificador único (clique para copiar)
- **Status do Par**: Online/Offline/Digitando
- **Botão ✏️**: Editar ID (servidor gera automaticamente)
- **Botão 📌**: Fixar em janela separada

### Chat
- **Campo de Mensagem**: Digite e pressione Enter para enviar
- **🖼️ Ícone**: Enviar imagens
- **➤ Botão**: Enviar mensagem
- **Encerrar Sessão**: Desconectar do par

### Contatos
- **Salvar Contato**: Apelido + ID
- **Lista de Contatos**: Clique para pré-preencer ID
- **Deletar**: Remove contato da lista

## 🔐 Segurança

### Autenticação
- Servidor exige token válido antes de permitir qualquer operação
- Sem token válido, você não consegue enviar/receber mensagens

### Criptografia
1. **Troca de Chaves**: ECDH (P-256) para estabelecer chave secreta
2. **Criptografia**: AES-256-GCM para mensagens
3. **Integridade**: GCM garante autenticidade dos dados

### Verificação
- **Safety Number**: Hash SHA-256 das chaves públicas
- Compare o "Safety Number" com o seu par por outro canal
- Se forem iguais, a conexão é autêntica

## 🔄 Fluxo de Conexão

```
┌─ Você ──────────┐        ┌─ Servidor ──────┐        ┌─ Par ──────────┐
│                │        │                 │        │                │
│ Conecta        │───────→│ Gera ID         │        │                │
│                │        │                 │        │                │
│ Insere Token   │───────→│ Autentica       │        │                │
│                │        │                 │        │                │
│ Digita ID do   │        │                 │        │ Conecta        │
│ Par            │        │                 │        │ Insere Token   │
│                │        │                 │        │                │
│ Clica Conectar │───────→│ Encaminha       │───────→│ Recebe Oferta  │
│                │        │ Key Exchange    │        │                │
│                │        │                 │        │ Gera Chave Sec│
│ Recebe Resposta│←───────│ Encaminha       │←───────│ Envia Resposta │
│                │        │ Key Exchange    │        │                │
│ Estabelece WebRTC (P2P direto, sem passar pelo servidor)           │
│                │        │                 │        │                │
│ Criptografa +  │←─────────────────────────────────→│ Decripta       │
│ Envia via P2P  │        │                 │        │ Recebe         │
│                │        │                 │        │                │
└────────────────┘        └─────────────────┘        └────────────────┘
```

## 🛠️ Configurações

### URL do Servidor
- **Local**: `ws://localhost:8080`
- **Remoto HTTPS**: `wss://seu-servidor.com`
- A extensão salva a URL automaticamente

### Token de Autenticação
- Fornecido pelo administrador do servidor
- Salvo localmente no navegador
- Necessário para cada sessão

### Contatos
- Salvos no armazenamento local do navegador
- Incluem: ID, Apelido
- Podem ser deletados a qualquer momento

## 📋 Tipos de Mensagem

### Texto
- Criptografado com AES-256-GCM
- Timestamp do envio incluído
- Suporta mensagens longas

### Imagens
- Criptografadas como arquivo
- Convertidas para base64
- Armazenadas em cache do navegador

### Indicador de Digitação
- Enviado a cada 2 segundos enquanto digita
- Mostra "digitando..." na barra de status
- Não contém conteúdo da mensagem

## 🐛 Troubleshooting

### "Não foi possível conectar ao servidor"
- Verifique se a URL está correta
- Certifique-se se o servidor está rodando
- Teste em um terminal: `telnet localhost 8080`

### "Autenticação obrigatória mas sem campo de token"
- Atualize a página (F5)
- Verifique se o servidor exige autenticação
- Teste a autenticação no `test-security.js`

### "Cliente alvo não encontrado"
- Verifique se o ID está correto
- O par precisa estar conectado E autenticado
- Espere alguns segundos e tente novamente

### "Erro ao descriptografar"
- A chave secreta não corresponde
- Pode indicar um par diferente respondendo
- Verifique o Safety Number

### "Imagem não aparece"
- Alguns navegadores limitam tamanho de blob
- Tente com imagens menores
- Suporte a formatos: JPG, PNG, GIF, WebP

## 🔒 Boas Práticas

1. **Verifique o Safety Number** com seu par por outro canal antes de compartilhar informações sensíveis
2. **Não compartilhe seu token do servidor** - cada usuário precisa autenticar com sua própria credencial
3. **Guarde seu ID em sigilo** - apenas compartilhe com pessoas que confiar
4. **Use HTTPS (WSS)** em produção
5. **Feche a aba** quando terminar de conversar
6. **Limpe histórico** se usar computador compartilhado

## 🎨 Customização

### Alterar Servidor
- Clique no campo URL do servidor
- Digite a nova URL
- A extensão reconecta automaticamente

### Editar ID
- Clique no botão ✏️ ao lado do seu ID
- O servidor gera um novo ID automaticamente
- Você será reconectado

### Fixar Janela
- Clique no botão 📌
- A extensão abre em uma janela separada
- Clique ❌ para fechar a janela

## 📊 Informações Técnicas

### Permissões Usadas
- `storage` - Salvar configurações e contatos
- `notifications` - Notificações de nova mensagem
- `ws://*`, `wss://*` - Acesso ao WebSocket

### Tecnologias
- **Criptografia**: Web Crypto API (ECDH, AES-GCM, SHA-256)
- **P2P**: WebRTC (Data Channels)
- **Sinalização**: WebSocket

### Armazenamento Local
- URL do servidor
- ID salvo (se customizado)
- Lista de contatos
- Última URL usada

## 🚀 Performance

- **Memória**: ~5-10MB em repouso
- **Processamento**: Negligível até conectar
- **Banda**: ~1-5KB/mensagem (criptografado)

## ❓ FAQ

**P: Meu ID é privado?**
R: Não. Seu ID é público e precisa ser compartilhado. Use o Safety Number para verificar autenticidade.

**P: As mensagens são armazenadas?**
R: Não. A extensão apenas mostra as mensagens na memória. Feche a aba para apagá-las.

**P: Posso usar sem o servidor?**
R: Não. O servidor é necessário para sinalização (troca de IDs e chaves). A conexão é P2P apenas após isso.

**P: E se esquecer meu ID?**
R: Reconecte ao servidor. Você receberá um novo ID.

**P: Posso usar em múltiplos abas?**
R: Sim, mas apenas uma por vez pode estar conectada a um par.

## 🐛 Reportar Problemas

1. Abra o DevTools (F12)
2. Vá para "Console"
3. Reproduza o problema
4. Copie os erros que aparecem
5. Abra uma issue no GitHub com os detalhes

## 📜 Licença

MIT - Veja LICENSE para detalhes

---

**🔒 Sua privacidade é importante. Use com responsabilidade.**
