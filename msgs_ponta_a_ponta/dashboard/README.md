# 📊 Dashboard de Servidores P2P

Gerenciador visual e intuitivo para todos os seus servidores de sinalização WebSocket.

## 🚀 Início Rápido

```bash
# Instalar dependências (se necessário)
npm install
npm install pg

# Iniciar dashboard (padrão: porta 3000)
node src/server.js

# Abrir no navegador
http://localhost:3000
```

## 📁 Estrutura de Arquivos

```
dashboard/
├── public/                    # Arquivos estáticos (frontend)
│   ├── index.html            # Página HTML principal
│   ├── css/
│   │   └── styles.css        # Estilos CSS
│   └── js/
│       └── app.js            # JavaScript do cliente
│
├── src/                       # Código do servidor (backend)
│   └── server.js             # Servidor HTTP + API
│
├── data/                      # Dados persistentes
│   ├── dashboard.db          # Banco de Dados SQLite
│   ├── servers-config.json               # Configuração atual
│   └── servers-config.example.json       # Exemplo com 11 servidores
│
├── package.json              # Dependências do projeto
└── README.md                 # Este arquivo
```

## ✨ Recursos

- ✅ **Interface moderna** - Design responsivo e intuitivo
- ✅ **CRUD completo** - Criar, ler, atualizar, deletar servidores
- ✅ **Filtros** - Por status (Ativos, Inativos, Standby)
- ✅ **Estatísticas** - Total, ativos, inativos, capacidade
- ✅ **Cópia de tokens** - Um clique para copiar
- ✅ **Acesso direto** - Clique e acesse o servidor
- ✅ **Responsivo** - Funciona em desktop, tablet, mobile
- ✅ **API REST** - Integração fácil com outros apps

## 🔌 API REST

### GET /api/servers
Obter lista de todos os servidores

```bash
curl http://localhost:10080/api/servers
```

Resposta:
```json
[
  {
    "id": "server-1",
    "name": "Servidor Principal",
    "host": "localhost",
    "port": 8080,
    "protocol": "ws",
    "token": "token-aqui",
    "status": "active",
    "region": "Local",
    "maxClients": 10000,
    "createdAt": "2026-01-28T00:00:00Z",
    "notes": "..."
  }
]
```

### POST /api/servers
Criar novo servidor

```bash
curl -X POST http://localhost:10080/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "server-2",
    "name": "Novo Servidor",
    "host": "localhost",
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
Atualizar servidor existente

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
Deletar servidor

```bash
curl -X DELETE http://localhost:10080/api/servers \
  -H "Content-Type: application/json" \
  -d '{"id": "server-1"}'
```

## 📚 Campos de um Servidor

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-----------|-----------|
| id | string | Sim | Identificador único |
| name | string | Sim | Nome exibido |
| description | string | Não | Descrição detalhada |
| host | string | Sim | IP ou hostname |
| port | number | Sim | Porta (1-65535) |
| protocol | string | Sim | ws ou wss |
| token | string | Sim | Token de autenticação |
| status | string | Sim | active, inactive, standby |
| region | string | Não | Localização geográfica |
| maxClients | number | Sim | Capacidade máxima |
| createdAt | string | Sim | Data ISO 8601 |
| notes | string | Não | Anotações |

## 🎨 Estatísticas

O dashboard mostra em tempo real:

- **Total de Servidores** - Contagem total
- **Servidores Ativos** - Com status = "active"
- **Servidores Inativos** - Com status = "inactive"
- **Capacidade Total** - Soma de maxClients

## 🔍 Filtros

Use os botões de filtro para:

- **Todos** - Mostrar todos os servidores
- **Ativos** - 🟢 Apenas em funcionamento
- **Inativos** - 🔴 Apenas parados
- **Standby** - 🟡 Em modo de espera

## 💾 Dados Persistentes

Os dados são armazenados de forma robusta e segura no banco de dados **PostgreSQL**.

O arquivo `data/servers-config.json` é mantido apenas para:
- Importação inicial (migração automática na primeira execução)
- Backup manual legível

Você pode:
- ✅ Editar manualmente
- ✅ Fazer backup facilmente
- ✅ Versionar no Git
- ✅ Compartilhar com o time

### Configuração do Banco de Dados

Defina a variável de ambiente `DATABASE_URL` antes de iniciar:

`DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco`

## 📦 Estrutura de Diretórios Recomendada

```
seu-projeto/
├── server/               # Servidor WebSocket original
│   └── server.js
│
├── dashboard/            # Dashboard (este projeto)
│   ├── public/
│   ├── src/
│   ├── data/
│   └── package.json
│
└── README.md
```

## 🔗 Integração com Servidor Principal

Se estiver usando o servidor principal (`../server/server.js`):

```javascript
// Em server.js
const { initDashboard } = require('../dashboard/src/server.js');

// Na inicialização do servidor
const dashboardPort = config.port + 2000;
initDashboard(dashboardPort);
```

## 🆘 Troubleshooting

### Dashboard não carrega
```bash
# Verifique se está rodando
curl http://localhost:10080

# Se não funcionar, inicie manualmente
node src/server.js
```

### Arquivo de configuração vazio
```bash
# Copie o arquivo de exemplo
cp data/servers-config.example.json data/servers-config.json
```

### Porta ocupada
```bash
# Use outra porta ao iniciar
PORT=9000 node src/server.js
```

## 📖 Arquivos de Referência

- **public/index.html** - Estrutura HTML
- **public/css/styles.css** - Estilos e layout
- **public/js/app.js** - Lógica do cliente
- **src/server.js** - Servidor HTTP e API

## 🚀 Próximos Passos

1. Customize os estilos em `public/css/styles.css`
2. Adicione seus servidores via dashboard
3. Integre a API com suas aplicações
4. Configure para produção

## 📝 Notas

- O dashboard é totalmente independente
- Não requer dependências Node.js externas
- Usa apenas módulos built-in do Node
- JSON como banco de dados padrão
- Fácil migrar para BD no futuro

## 📄 Licença

Mesmo do projeto principal

---

**Dashboard de Servidores P2P - v1.0.0** ✨
