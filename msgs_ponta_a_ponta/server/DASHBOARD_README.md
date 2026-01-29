# 📊 Dashboard de Gerenciamento de Servidores P2P

Um painel de controle completo para gerenciar múltiplos servidores de sinalização WebSocket com escalabilidade futura em mente.

## 🎯 O que é?

O Dashboard de Servidores permite que você:

- ✅ **Listar todos os servidores** em um único lugar
- ✅ **Visualizar informações completas** de cada servidor (host, porta, protocolo, token, status)
- ✅ **Adicionar novos servidores** facilmente com um formulário simples
- ✅ **Editar servidores** existentes
- ✅ **Deletar servidores** da lista
- ✅ **Copiar tokens** com um clique
- ✅ **Acessar cada servidor** diretamente do dashboard
- ✅ **Ver estatísticas** (total de servidores, ativos, inativos, capacidade total)
- ✅ **Filtrar por status** (Ativos, Inativos, Em Standby)
- ✅ **Interface moderna e responsiva** (funciona em desktop, tablet e mobile)

## 🚀 Como Usar

### 1. Iniciar o Servidor

```bash
cd server
npm install
npm start
```

### 2. Acessar o Dashboard

Abra seu navegador e vá para:

```
http://localhost:10080
```

*(A porta é baseada na porta do servidor WebSocket: se usar 8080, o dashboard será 10080)*

### 3. Adicionar um Servidor

Clique no botão **"+ Novo Servidor"** e preencha os campos:

- **Nome do Servidor**: Nome exibível (ex: "Servidor Principal")
- **Descrição**: Descrição breve (opcional)
- **Host/IP**: Endereço do servidor (ex: localhost, 192.168.1.1, server.example.com)
- **Porta**: Porta do WebSocket (ex: 8080)
- **Protocolo**: ws ou wss (para conexões seguras)
- **Token de Autenticação**: Token único para autenticação
- **Região**: Localização do servidor (ex: Local, USA, Europa)
- **Máximo de Clientes**: Capacidade máxima de conexões
- **Status**: Ativo, Inativo ou Em Standby
- **Notas**: Informações adicionais (opcional)

### 4. Gerenciar Servidores

No painel de cada servidor, você pode:

- 🔗 **Abrir Servidor**: Acessa o servidor diretamente em uma nova aba
- ✏️ **Editar**: Modifica informações do servidor
- 🗑️ **Deletar**: Remove o servidor da lista
- 📋 **Copiar Token**: Copia o token para a área de transferência

## 📊 Estatísticas

O painel superior mostra em tempo real:

- **Total de Servidores**: Quantidade total de servidores cadastrados
- **Ativos**: Servidores em funcionamento
- **Inativos**: Servidores parados
- **Capacidade Total**: Soma de todas as capacidades de conexão

## 🔍 Filtros

Use os botões de filtro para visualizar:

- **Todos**: Mostra todos os servidores
- **Ativos**: Apenas servidores em funcionamento (🟢)
- **Inativos**: Apenas servidores parados (🔴)
- **Em Standby**: Apenas servidores em modo standby (🟡)

## 📁 Estrutura de Arquivos

```
server/
├── server.js              # Servidor principal (modificado)
├── dashboard.html         # Interface do dashboard
├── dashboard-server.js    # Backend do dashboard
├── servers-config.json    # Configuração de servidores (criado automaticamente)
├── TOKEN.txt              # Token de autenticação do servidor
├── package.json
└── README.md
```

## 💾 Configuração de Servidores (servers-config.json)

Os dados dos servidores são armazenados em `servers-config.json`:

```json
{
  "servers": [
    {
      "id": "server-1",
      "name": "Servidor Principal",
      "description": "Servidor de sinalização principal",
      "host": "localhost",
      "port": 8080,
      "protocol": "ws",
      "token": "seu-token-aqui",
      "status": "active",
      "region": "Local",
      "maxClients": 10000,
      "createdAt": "2026-01-28T00:00:00Z",
      "notes": "Anotações do servidor"
    }
  ]
}
```

### Campos explicados:

- **id**: Identificador único do servidor
- **name**: Nome exibido no dashboard
- **description**: Descrição detalhada
- **host**: Endereço IP ou hostname
- **port**: Porta WebSocket
- **protocol**: ws (insecuro) ou wss (seguro/HTTPS)
- **token**: Token de autenticação obrigatório
- **status**: active, inactive, standby
- **region**: Localização/região geográfica
- **maxClients**: Número máximo de conexões simultâneas
- **createdAt**: Data de criação (formato ISO 8601)
- **notes**: Anotações adicionais

## 🔌 API REST do Dashboard

### GET /api/servers
Retorna lista de todos os servidores

```bash
curl http://localhost:10080/api/servers
```

### POST /api/servers
Cria um novo servidor

```bash
curl -X POST http://localhost:10080/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "server-2",
    "name": "Novo Servidor",
    "host": "192.168.1.100",
    "port": 8081,
    "protocol": "ws",
    "token": "novo-token",
    "status": "active",
    "region": "Local",
    "maxClients": 5000,
    "createdAt": "2026-01-28T00:00:00Z"
  }'
```

### PUT /api/servers
Atualiza um servidor existente

```bash
curl -X PUT http://localhost:10080/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "server-1",
    "name": "Servidor Atualizado",
    ...
  }'
```

### DELETE /api/servers
Deleta um servidor

```bash
curl -X DELETE http://localhost:10080/api/servers \
  -H "Content-Type: application/json" \
  -d '{"id": "server-1"}'
```

## 🎨 Design e Responsividade

O dashboard foi projetado com:

- **Material Design**: Interface clara e intuitiva
- **Gradiente moderno**: Cores vivas e atrativas
- **Responsivo**: Funciona em qualquer tamanho de tela
- **Animações suaves**: Transições elegantes
- **Acessibilidade**: Cores contrastantes e fontes legíveis
- **Status visual**: Badges coloridas para status dos servidores

## 🔐 Segurança

- Os dados são armazenados localmente em `servers-config.json`
- Em produção, implemente autenticação na API
- Use CORS restritivo
- Proteja a porta do dashboard com firewall
- Use wss (WebSocket Secure) em produção

## 📈 Escalabilidade Futura

Este sistema foi projetado para suportar:

- ✅ Centenas de servidores
- ✅ Monitoramento de status em tempo real
- ✅ Histórico de conexões
- ✅ Métricas e analytics
- ✅ Alertas automáticos
- ✅ Load balancing
- ✅ Redundância e failover automático
- ✅ API de integração com outras ferramentas

## 🐛 Troubleshooting

### Dashboard não carrega

1. Verifique se o servidor está rodando
2. Confirme a porta (padrão: 10080 para servidor em 8080)
3. Verifique console do navegador (F12) para erros
4. Tente `http://localhost:10080` em vez de `localhost:10080`

### Não consigo acessar um servidor

1. Verifique se o host e porta estão corretos
2. Confirme se o servidor está rodando
3. Se for remoto, verifique firewall e acesso de rede

### Arquivo servers-config.json vazio

1. O arquivo é criado automaticamente na primeira mudança
2. Se estiver vazio, adicione um servidor via dashboard
3. Ou edite manualmente com dados válidos em JSON

## 📞 Suporte

Para mais informações sobre o servidor WebSocket principal, veja [README.md](./README.md) da pasta server.

## 📝 Versão

- Dashboard v1.0.0
- Compatível com servidor P2P Secure Chat v1.0.0+

---

**Desenvolvido para escalabilidade e facilidade de gerenciamento! 🚀**
