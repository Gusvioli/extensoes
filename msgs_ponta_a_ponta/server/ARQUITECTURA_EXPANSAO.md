# 🏗️ Arquitetura e Expansão do Dashboard

## Visão Geral da Arquitetura Atual

```
┌─────────────────────────────────────────┐
│   Dashboard (UI React/HTML+CSS+JS)      │
│   http://localhost:10080                │
└──────────────┬──────────────────────────┘
               │
               │ HTTP REST API
               │
┌──────────────▼──────────────────────────┐
│   dashboard-server.js                   │
│   ├─ GET /api/servers                   │
│   ├─ POST /api/servers                  │
│   ├─ PUT /api/servers                   │
│   └─ DELETE /api/servers                │
└──────────────┬──────────────────────────┘
               │
               │ File System
               │
┌──────────────▼──────────────────────────┐
│   servers-config.json                   │
│   (Armazenamento de dados)              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   server.js (WebSocket Server)          │
│   ws://localhost:8080 (ou outra porta)  │
└─────────────────────────────────────────┘
```

## 📚 Componentes Principais

### 1. **dashboard.html**
- Arquivo HTML único com CSS e JavaScript embutidos
- Interface responsiva e moderna
- Operações CRUD de servidores
- Filtros e busca por status
- Estatísticas em tempo real

### 2. **dashboard-server.js**
- Servidor HTTP para servir o dashboard
- API REST para CRUD de servidores
- Carregamento/salvamento de `servers-config.json`
- CORS habilitado para integração futura

### 3. **servers-config.json**
- Armazenamento persistente de dados
- Formato JSON padronizado
- Pode ser sincronizado com banco de dados no futuro

### 4. **server.js** (modificado)
- Inicializa `dashboard-server.js` na porta `config.port + 2000`
- Mantém compatibilidade com código existente
- Integração transparente

## 🚀 Plano de Expansão Futura

### Fase 1: Melhorias Imediatas (v1.1)
- [ ] Busca/filtro por nome de servidor
- [ ] Exportar configuração como JSON
- [ ] Importar configuração de arquivo
- [ ] Dark mode
- [ ] Responsividade mobile melhorada
- [ ] Validação mais robusta de tokens

### Fase 2: Banco de Dados (v1.2)
```javascript
// Migrar de JSON para PostgreSQL/MongoDB
// Estrutura exemplo:
{
  id: UUID,
  name: string,
  description: string,
  host: string,
  port: number,
  protocol: enum('ws', 'wss'),
  token: string,
  status: enum('active', 'inactive', 'standby'),
  region: string,
  maxClients: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  notes: text,
  metadata: json
}
```

### Fase 3: Monitoramento em Tempo Real (v1.3)
```javascript
// Dashboard com:
- Clientes conectados por servidor
- Gráfico de mensagens por segundo
- Histórico de uptime
- Alertas automáticos
- Logs em tempo real
```

### Fase 4: Autenticação e Autorização (v1.4)
```javascript
// Adicionar:
- Login de usuários
- Controle de acesso (RBAC)
- Auditoria de ações
- API keys para integração
- Autenticação OAuth2
```

### Fase 5: Escalabilidade (v1.5)
```javascript
// Implementar:
- Load balancing entre servidores
- Health checks automáticos
- Failover automático
- Sincronização de estado
- Métricas distribuídas
```

## 🗂️ Estrutura Proposta para Expansão

```
server/
├── server.js
├── dashboard-server.js
├── servers-config.json
├── dashboard.html
├── manage-servers.sh
│
├── lib/
│   ├── database.js          # Conexão com BD (futuro)
│   ├── auth.js              # Autenticação (futuro)
│   ├── monitoring.js        # Monitoramento (futuro)
│   ├── health-check.js      # Verificação de saúde (futuro)
│   └── logger.js            # Logging avançado (futuro)
│
├── routes/
│   ├── servers.js           # Rotas de servidores
│   ├── monitoring.js        # Rotas de monitoramento (futuro)
│   ├── auth.js              # Rotas de autenticação (futuro)
│   └── health.js            # Rotas de saúde (futuro)
│
├── models/
│   └── Server.js            # Modelo de servidor (futuro)
│
├── migrations/              # Migrações de BD (futuro)
│   └── 001_create_servers.sql
│
├── public/
│   ├── dashboard.html       # Mover arquivo HTML
│   ├── css/
│   │   └── dashboard.css    # Estilos separados (futuro)
│   └── js/
│       └── dashboard.js     # JavaScript separado (futuro)
│
└── tests/
    ├── servers.test.js      # Testes unitários (futuro)
    └── api.test.js          # Testes de API (futuro)
```

## 🔌 API Expandida (Futuro)

### Servidores
```
GET    /api/servers           # Lista com paginação
POST   /api/servers           # Criar
GET    /api/servers/:id       # Detalhe
PUT    /api/servers/:id       # Atualizar
DELETE /api/servers/:id       # Deletar
PATCH  /api/servers/:id/status # Mudar status
```

### Monitoramento
```
GET    /api/servers/:id/status     # Status atual
GET    /api/servers/:id/metrics    # Métricas
GET    /api/servers/:id/logs       # Logs
```

### Autenticação
```
POST   /api/auth/login         # Login
POST   /api/auth/register      # Registrar (futuro)
POST   /api/auth/logout        # Logout
GET    /api/auth/me            # Informações do usuário
```

### Health Check
```
GET    /api/health             # Status global
GET    /api/health/servers     # Health de todos
```

## 💾 Exemplo de Migração para Banco de Dados

### PostgreSQL Schema
```sql
CREATE TABLE servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  protocol VARCHAR(10) CHECK (protocol IN ('ws', 'wss')),
  token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'inactive',
  region VARCHAR(100),
  max_clients INTEGER DEFAULT 10000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  metadata JSONB,
  UNIQUE(host, port)
);

CREATE TABLE server_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  event_type VARCHAR(50),
  message TEXT,
  level VARCHAR(20),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE server_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  connected_clients INTEGER,
  messages_per_second FLOAT,
  uptime_seconds BIGINT,
  memory_usage FLOAT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Código Node.js para Migração
```javascript
// lib/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class ServerRepository {
  async findAll() {
    const result = await pool.query('SELECT * FROM servers ORDER BY created_at DESC');
    return result.rows;
  }

  async findById(id) {
    const result = await pool.query('SELECT * FROM servers WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create(server) {
    const query = `
      INSERT INTO servers (name, description, host, port, protocol, token, status, region, max_clients, notes, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await pool.query(query, [
      server.name, server.description, server.host, server.port,
      server.protocol, server.token, server.status, server.region,
      server.maxClients, server.notes, server.metadata || {}
    ]);
    return result.rows[0];
  }

  async update(id, server) {
    const query = `
      UPDATE servers
      SET name = $1, description = $2, host = $3, port = $4,
          protocol = $5, token = $6, status = $7, region = $8,
          max_clients = $9, notes = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;
    const result = await pool.query(query, [
      server.name, server.description, server.host, server.port,
      server.protocol, server.token, server.status, server.region,
      server.maxClients, server.notes, id
    ]);
    return result.rows[0];
  }

  async delete(id) {
    await pool.query('DELETE FROM servers WHERE id = $1', [id]);
  }
}

module.exports = new ServerRepository();
```

## 🧪 Testes (Futuro)

```javascript
// tests/api.test.js
const request = require('supertest');
const app = require('../server');

describe('Servers API', () => {
  it('GET /api/servers should return all servers', async () => {
    const res = await request(app)
      .get('/api/servers')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/servers should create a server', async () => {
    const res = await request(app)
      .post('/api/servers')
      .send({
        name: 'Test Server',
        host: 'localhost',
        port: 8080,
        protocol: 'ws',
        token: 'test-token'
      })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });
});
```

## 🔐 Segurança Futura

- [ ] Validação de entrada robusta
- [ ] Sanitização de dados
- [ ] Rate limiting por IP
- [ ] HTTPS/TLS obrigatório
- [ ] CORS restrictivo
- [ ] Auditoria de ações
- [ ] Backup automático
- [ ] Criptografia de tokens sensíveis

## 📊 Observabilidade

- [ ] Logging estruturado (Winston/Pino)
- [ ] Rastreamento distribuído (Jaeger)
- [ ] Métricas (Prometheus)
- [ ] Alertas (AlertManager)
- [ ] Dashboard de monitoramento (Grafana)

---

**Este é um roadmap vivo e pode ser atualizado conforme as necessidades evoluem!** 🚀
