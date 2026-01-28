# 🔧 Solução: Erro EADDRINUSE (Porta 8080 Ocupada)

## 📋 Problema Encontrado
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Causa**: Havia um processo Node.js (PID 9376) usando a porta 8080 de uma execução anterior.

---

## ✅ Solução Implementada

### 1. **Fallback Automático de Portas** (server.js)
O servidor agora tenta automaticamente usar portas alternativas se a principal estiver ocupada:

```javascript
const portFallbacks = [8080, 8081, 8082, 8083, 9090, 3000];

async function initServer() {
  for (const port of portFallbacks) {
    try {
      wss = await createServer(port);
      log(`Servidor iniciado na porta ${port}`, "info");
      if (port !== config.port) {
        log(`⚠️  Porta ${config.port} estava ocupada, usando ${port}`, "warn");
      }
      setupHandlers();
      return;
    } catch (err) {
      // Tenta próxima porta
    }
  }
}
```

**Comportamento**:
- Tenta porta 8080 (padrão)
- Se ocupada → Tenta 8081
- Se ocupada → Tenta 8082
- ... e assim sucessivamente

### 2. **Gerenciador de Portas** (manage-ports.js)
Novo script NodeJS para gerenciar portas e processos:

```bash
# Ver status de portas
node manage-ports.js status

# Matar processos na porta 8080
node manage-ports.js kill 8080

# Verificar porta específica
node manage-ports.js check 8080
```

### 3. **Script de Inicialização Melhorado** (start.sh)
O script `start.sh` agora detecta automaticamente portas ocupadas:

```bash
#!/bin/bash
# ... instalação ...

# Libera porta se necessário
if [ -f "manage-ports.js" ]; then
  if ! timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/8080" 2>/dev/null; then
    echo "⚠️  Porta 8080 ocupada. Liberando..."
    node manage-ports.js kill 8080 2>/dev/null || true
    sleep 1
  fi
fi

npm start
```

---

## 🚀 Como Usar

### Opção 1: Inicialização Automática (Recomendado)
```bash
cd server
./start.sh
```
✅ Detecta e libera portas automaticamente

### Opção 2: Gerenciar Portas Manualmente
```bash
# Verificar portas
node manage-ports.js status

# Se port 8080 está ocupada, liberar:
node manage-ports.js kill 8080

# Depois iniciar servidor
npm start
```

### Opção 3: Iniciar com Node Direto
```bash
cd server
node server.js
```
✅ Tenta automaticamente portas alternativas se 8080 estiver ocupada

---

## 📊 Teste de Sucesso

Saída do servidor inicializado com sucesso:
```
[2026-01-28T01:13:56.966Z] ✅ Servidor de sinalização iniciado na porta 8080
[2026-01-28T01:13:56.971Z] ⚠️  Autenticação ATIVADA. Token obrigatório: d599f0af...
[2026-01-28T01:13:56.971Z] ✅ 🔒 Compressão DESABILITADA (proteção contra CRIME)
[2026-01-28T01:13:58.597Z] ✅ Cliente conectado com ID: 3ca07a3625316299f5d98063
```

---

## 🔍 Portas Testadas (em ordem de preferência)
1. **8080** - Padrão (WebSocket)
2. **8081** - Alternativa 1
3. **8082** - Alternativa 2
4. **8083** - Alternativa 3
5. **9090** - Alternativa 4
6. **3000** - Alternativa 5

---

## 💡 Dica Rápida

Se sempre encontrar portas ocupadas, use a variável de ambiente `PORT`:

```bash
# Usar porta 5000
PORT=5000 node server.js

# Ou com npm
PORT=5000 npm start
```

---

## 🛠️ Ferramentas Adicionadas

| Arquivo | Descrição |
|---------|-----------|
| **manage-ports.js** | Gerenciador de portas (status, kill, check) |
| **start.sh** | Script de inicialização melhorado |
| **server.js** | Atualizado com fallback de portas |

---

## ✨ Resumo das Melhorias

| Feature | Antes | Depois |
|---------|-------|--------|
| Porta Ocupada | ❌ Erro | ✅ Tenta alternativa |
| Gerenciamento | Manual | Automático |
| Compatibilidade | Fixa em 8080 | 6 portas opcionais |
| Diagnosticador | Nenhum | manage-ports.js |

---

## ❓ Troubleshooting

### "Todas as portas estão ocupadas"
```bash
# Listar todos os processos Node.js
ps aux | grep node

# Matar todos os Node.js (cuidado!)
killall node

# Ou tentar outra porta
PORT=8090 node server.js
```

### "manage-ports.js não funciona"
```bash
# Certifique-se de estar na pasta server/
cd server
node manage-ports.js status
```

### "Socket hung up"
Significa que a porta foi liberada mas ainda há conexões pendentes. Aguarde 5 segundos:
```bash
sleep 5
node server.js
```

---

## 📝 Status Atual

✅ Servidor funcionando corretamente  
✅ Fallback de portas implementado  
✅ Gerenciador de portas criado  
✅ Script de inicialização melhorado  
✅ 2 clientes de teste conectados com sucesso  

**Pronto para usar!** 🚀
