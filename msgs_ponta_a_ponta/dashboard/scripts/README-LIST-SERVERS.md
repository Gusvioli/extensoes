# Script de Listagem de Servidores

Script Node.js para listar servidores ativos de forma **interna** (arquivo local) e **externa** (via API HTTP), com informações formatadas para usuários e administradores.

## Instalação

O script usa apenas módulos nativos do Node.js, nenhuma dependência adicional necessária.

```bash
chmod +x dashboard/scripts/list-servers.js
```

## Uso

### Modo Padrão (Todos os servidores ativos - tabela)

```bash
node dashboard/scripts/list-servers.js
```

### Opções de Linha de Comando

Todas as opções usam o formato `--chave=valor`:

#### `--mode`
- `internal`: Apenas arquivo local (`servers-config.json`)
- `external`: Apenas via API HTTP
- `all` **(padrão)**: Ambos (combina e remove duplicatas)

```bash
# Apenas config local
node dashboard/scripts/list-servers.js --mode=internal

# Apenas API externa
node dashboard/scripts/list-servers.js --mode=external

# Ambos (padrão)
node dashboard/scripts/list-servers.js --mode=all
```

#### `--format`
- `table` **(padrão)**: Tabela formatada com cores
- `json`: JSON puro (para parsing)
- `csv`: CSV (para Excel/importação)

```bash
# Formato JSON
node dashboard/scripts/list-servers.js --format=json

# Formato CSV
node dashboard/scripts/list-servers.js --format=csv
```

#### `--role`
- `user` **(padrão)**: Informações básicas + instruções de conexão + tokens visíveis
- `admin`: Tudo + detalhes administrativos (ID, notas, timestamps)

```bash
# Modo administrativo
node dashboard/scripts/list-servers.js --role=admin
```

#### `--host` e `--port`
Define o host e porta para buscar dados da API externa.

```bash
# API em outro servidor
node dashboard/scripts/list-servers.js --host=192.168.1.100 --port=10080
```

## Exemplos de Uso

### 1. Usuário final - Listar servidores com instruções

```bash
node dashboard/scripts/list-servers.js --mode=external --role=user
```

**Output:**
```
🔄 Buscando servidores...

→ Buscando via API (localhost:3000)...
✓ 1 servidor(s) encontrado(s) externamente

📊 SERVIDORES ATIVOS

Nome                    | Host      | Porta | Protocolo | Status  | Região | Clientes
Servidor P2P Principal  | localhost | 8080  | ws        | active  | Brasil | 10000

🔑 INSTRUÇÕES PARA CONECTAR:

1. Servidor P2P Principal
   📍 Host:     localhost
   🔌 Porta:    8080
   🔗 WebSocket: ws://localhost:8080
   🔑 Token:    f88c4a4a81432a16dfbfcc6fc48daa51
   ↳ Cole este token na extensão para autenticar
```

### 2. Admin - Todos os detalhes

```bash
node dashboard/scripts/list-servers.js --role=admin --format=table
```

**Output inclui:**
- IDs internos
- Tokens completos
- Timestamps de criação
- Notas administrativas

### 3. Exportar para CSV

```bash
node dashboard/scripts/list-servers.js --format=csv > servers.csv
```

### 4. JSON para integração com outros scripts

```bash
node dashboard/scripts/list-servers.js --mode=external --format=json | jq '.[] | .name'
```

### 5. Cron job - Sincronizar e alertar sobre mudanças

```bash
# Adicione ao crontab (a cada hora)
0 * * * * cd /path/to/msgs_ponta_a_ponta && node dashboard/scripts/list-servers.js --mode=all --format=json > /tmp/servers-backup.json
```

## Comportamento

### Modo Usuário (`--role=user`)

- ✅ Mostra nome, host, porta, protocolo, status, região
- ✅ Mostra tokens (completos) para copiar
- ✅ Exibe instruções passo-a-passo para conectar
- ✅ Esconde detalhes administrativos

### Modo Admin (`--role=admin`)

- ✅ Mostra TUDO (tokens, IDs, notas, timestamps)
- ✅ Formato expandido com mais detalhes técnicos
- ✅ Ideal para monitoramento e auditoria

### Busca Interna vs Externa

| Modo | Fonte | Usa |
|------|-------|-----|
| `internal` | Arquivo local | `dashboard/data/servers-config.json` |
| `external` | API HTTP | `GET http://localhost:3000/api/public-servers?status=active` |
| `all` | Ambas | Combina e remove duplicatas |

## Caso de Uso

### Para Usuários Finais
```bash
# Mostrar como conectar
node dashboard/scripts/list-servers.js --mode=external --role=user
```

### Para Administradores
```bash
# Monitorar saúde do sistema
node dashboard/scripts/list-servers.js --role=admin --format=table
```

### Para Automação
```bash
# Exportar dados para integração
node dashboard/scripts/list-servers.js --format=json > /tmp/servers.json
curl -X POST -d @/tmp/servers.json https://monitoring-system.com/api/servers
```

## Códigos de Saída

- `0`: Sucesso
- `1`: Erro ao carregar/buscar servidores

## Troubleshooting

### "Timeout ao conectar em http://localhost:3000"

- Confirme que o dashboard está rodando: `curl http://localhost:3000/api/public-servers`
- Mude o host/porta: `node dashboard/scripts/list-servers.js --host=seu-ip --port=3000`

### "Arquivo não encontrado: .../servers-config.json"

- Execute em diretório correto ou use `--mode=external`

### "Nenhum servidor ativo encontrado"

- Confirme que há servidores com `status: "active"` na config
- Verifique filtros (`--mode`, etc.)
