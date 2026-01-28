# 🧪 Guia de Testes - Sistema de Nome de Exibição

## ✅ Checklist de Testes

### 1️⃣ Testes Básicos de Interface

#### Teste 1.1: Carregamento Inicial
```
Pré-requisito: Extensão instalada
Ação:
1. Abrir a extensão
2. Conectar ao servidor
3. Observar header

Esperado:
✅ ID aparece em "Seu ID: [id] ..."
✅ Botão ✏️ visível ao lado
✅ Sem erro no console

Console:
Não deve conter erros relacionados a displayName
```

---

#### Teste 1.2: Botão de Edição
```
Ação:
1. Ver header com ID
2. Clicar no botão ✏️

Esperado:
✅ Modal abre com fade (background 50% cinza)
✅ Modal centralizado na tela
✅ Input focado automaticamente
✅ ID original visível (read-only)
```

---

#### Teste 1.3: Modal com Campo Vazio
```
Ação:
1. Abrir modal (1º vez, sem nome salvo)
2. Observar estado

Esperado:
✅ Campo de input está vazio
✅ ID original é: "abc123..." (não editável)
✅ Botões [Cancelar] e [Salvar] presentes
✅ Aviso: "Deixe em branco para usar o ID"
```

---

### 2️⃣ Testes de Edição

#### Teste 2.1: Digitar Nome Simples
```
Ação:
1. Abrir modal
2. Digitar: "Alice"
3. Clicar [Salvar]

Esperado:
✅ Modal fecha
✅ Header mostra: "Seu ID: abc123... (Alice) ✏️"
✅ Nome "Alice" em cor verde
✅ Mensagem de sucesso: "✅ Nome alterado para: 'Alice'"
```

**Verificação Extra:**
```
LocalStorage:
  localStorage.getItem("displayName_abc123def456")
  → Deve retornar: "Alice"
```

---

#### Teste 2.2: Digitar Nome com Espaços
```
Ação:
1. Abrir modal
2. Digitar: "  Alice  " (com espaços)
3. Clicar [Salvar]

Esperado:
✅ Modal fecha
✅ Header mostra: "Seu ID: abc123... (Alice) ✏️"
✅ Espaços extras removidos automaticamente
```

---

#### Teste 2.3: Digitar Nome Longo
```
Ação:
1. Abrir modal
2. Digitar: "Desenvolvimento e Suporte Técnico"
3. Clicar [Salvar]

Esperado:
✅ Modal fecha
✅ Header mostra todo o nome (sem truncar no modal)
✅ Mensagens mostram nome completo
✅ Sem quebra de layout
```

---

#### Teste 2.4: Caracteres Especiais
```
Ação:
1. Abrir modal
2. Digitar: "Alice & Bob / Dev"
3. Clicar [Salvar]

Esperado:
✅ Todos os caracteres salvos
✅ Sem erro de caracteres
✅ Header mostra: "Seu ID: abc123... (Alice & Bob / Dev) ✏️"
```

---

#### Teste 2.5: Emoji
```
Ação:
1. Abrir modal
2. Digitar: "Alice 🚀"
3. Clicar [Salvar]

Esperado:
✅ Emoji salvo e exibido
✅ Header mostra: "Seu ID: abc123... (Alice 🚀) ✏️"
```

---

### 3️⃣ Testes de Cancelamento

#### Teste 3.1: Clicar Cancelar
```
Ação:
1. Abrir modal
2. Digitar nome diferente
3. Clicar [Cancelar]

Esperado:
✅ Modal fecha
✅ Nome não é salvo
✅ Header mantém nome anterior
```

---

#### Teste 3.2: Clicar Fora do Modal
```
Ação:
1. Abrir modal
2. Clicar na área cinza (fora do modal)
3. Observar

Esperado:
✅ Modal fecha
✅ Nome não é salvo
✅ Nenhum erro no console
```

---

#### Teste 3.3: Tecla ESC
```
Ação:
1. Abrir modal
2. Digitar algo
3. Pressionar ESC

Esperado:
✅ Modal fecha
✅ Nome não é salvo
❌ (ESC pode não funcionar, dependência HTML)
```

---

### 4️⃣ Testes de Resetar Nome

#### Teste 4.1: Limpar Campo
```
Ação:
1. Ter um nome salvo (ex: "Alice")
2. Abrir modal
3. Campo mostra: "Alice"
4. Limpar campo (Ctrl+A, Delete)
5. Clicar [Salvar]

Esperado:
✅ Modal fecha
✅ Header volta a mostrar: "Seu ID: abc123... ✏️" (sem nome)
✅ Primeiros 8 caracteres do ID aparecem nas mensagens
✅ Mensagem: "✅ Nome redefinido para padrão"

LocalStorage:
  localStorage.getItem("displayName_abc123def456")
  → Deve retornar: null (ou undefined)
```

---

#### Teste 4.2: Editar Novamente Após Reset
```
Ação:
1. Ter resetado o nome (teste anterior)
2. Abrir modal novamente
3. Digitar novo nome: "Bob"
4. Clicar [Salvar]

Esperado:
✅ Modal fecha
✅ Header mostra: "Seu ID: abc123... (Bob) ✏️"
✅ Mensagens mostram: "📤 Você (Bob)"
```

---

### 5️⃣ Testes em Mensagens

#### Teste 5.1: Mensagem Enviada
```
Pré-requisito: Nome salvo como "Alice"
Ação:
1. Conectar com outro usuário
2. Digitar mensagem: "Olá Bob!"
3. Enviar

Esperado:
📤 Você (Alice)
Olá Bob!
14:30

✅ Nome "Alice" aparece no cabeçalho da mensagem
✅ Ícone 📤 indica que foi enviada
✅ Timestamp correto
```

---

#### Teste 5.2: Mensagem Recebida
```
Pré-requisito: Outro usuário tem nome "Bob"
Ação:
1. Receber mensagem de Bob
2. Observar display

Esperado:
📥 Bob
Oi Alice!
14:31

✅ Nome "Bob" aparece no cabeçalho
✅ Ícone 📥 indica que foi recebida
✅ Timestamp correto
```

---

#### Teste 5.3: Múltiplas Mensagens
```
Ação:
1. Trocar 5+ mensagens rapidamente
2. Observar todas as linhas

Esperado:
✅ Cada mensagem mostra o nome correto
✅ Sem confusão de quem enviou o quê
✅ Nomes consistentes em todas as mensagens
✅ Scroll suave
```

---

### 6️⃣ Testes com Imagens

#### Teste 6.1: Enviar Imagem
```
Pré-requisito: Nome salvo como "Alice"
Ação:
1. Clicar em 🖼️ (ícone de imagem)
2. Selecionar arquivo de imagem
3. Aguardar envio

Esperado:
📤 Você (Alice)
[Imagem exibida]
14:30

✅ Nome "Alice" aparece acima da imagem
✅ Ícone 📤
✅ Imagem carregada corretamente
```

---

#### Teste 6.2: Receber Imagem
```
Ação:
1. Outro usuário "Bob" envia imagem
2. Observar display

Esperado:
📥 Bob
[Imagem exibida]
14:31

✅ Nome "Bob" aparece
✅ Ícone 📥
```

---

### 7️⃣ Testes de Persistência

#### Teste 7.1: Fechar e Abrir Extensão
```
Ação:
1. Ter nome "Alice" salvo
2. Fechar extensão (fechar popup)
3. Abrir novamente
4. Conectar ao servidor

Esperado:
✅ Header mostra: "Seu ID: abc123... (Alice) ✏️"
✅ Nome carregado do localStorage
✅ Sem perder dados

LocalStorage:
  Dados persistem entre sessões
```

---

#### Teste 7.2: Recarregar Página
```
Ação:
1. Se popup.html puder ser recarregada:
   - F5 ou Ctrl+R
2. Observar estado

Esperado:
✅ Nome mantido
✅ ID mantido
✅ Sem erro na console
```

---

#### Teste 7.3: Limpar Cache do Navegador
```
Ação:
1. Abrir DevTools
2. Ir em Application → Storage
3. Limpar localStorage
4. Fechar/abrir extensão

Esperado:
✅ Nome volta ao padrão
✅ ID continua igual (está em Chrome Storage)
✅ Header mostra: "Seu ID: abc123... ✏️" (sem nome)
```

---

### 8️⃣ Testes de Múltiplos Usuários

#### Teste 8.1: Dois Usuários (Mesmo PC)
```
Setup:
1. Janela 1: Extensão de Alice (ID: abc123...)
2. Janela 2: Extensão de Bob (ID: xyz789...)

Teste:
1. Alice edita nome para "Alice"
2. Bob edita nome para "Bob"
3. Conectam um ao outro

Esperado:
Mensagem de Alice em Bob:
📤 Você (Bob)     ← Bob vê seu próprio nome
Oi Alice!

📥 Alice          ← Bob vê nome de Alice
Oi Bob!

Mensagem de Bob em Alice:
📤 Você (Alice)   ← Alice vê seu próprio nome
Oi Bob!

📥 Bob            ← Alice vê nome de Bob
Oi Alice!

✅ Cada um vê sua própria perspectiva
✅ Nomes corretos para cada usuário
```

---

#### Teste 8.2: Dois Computadores Diferentes
```
Setup:
PC 1: Alice
├─ ID: abc123def456
├─ Nome: "Alice em Casa"

PC 2: Alice (mesma conta Chrome)
├─ ID: abc123def456 (sincronizado)
├─ Nome: (vazio no início)

Teste:
1. PC 2: editar nome para "Alice no Trabalho"
2. PC 1: abrir modal novamente

Esperado:
✅ PC 1 mostra: "Seu ID: abc123... (Alice em Casa)"
✅ PC 2 mostra: "Seu ID: abc123... (Alice no Trabalho)"
✅ ID é o mesmo (Chrome Storage sincronizado)
✅ Nomes são diferentes (localStorage local)

Verificação localStorage:
PC 1: displayName_abc123def456 = "Alice em Casa"
PC 2: displayName_abc123def456 = "Alice no Trabalho"
```

---

### 9️⃣ Testes de Segurança

#### Teste 9.1: ID Não Pode Ser Editado
```
Ação:
1. Abrir modal
2. Tentar clicar no campo ID
3. Tentar editar

Esperado:
✅ Campo é read-only
✅ Não permite digitação
✅ Fundo cinzento/desabilitado
```

---

#### Teste 9.2: Criptografia Não Afetada
```
Ação:
1. Alice muda nome para "Alice"
2. Bob muda nome para "Bob"
3. Trocam 10 mensagens
4. Verificar DevTools (Network)

Esperado:
✅ Mensagens ainda criptografadas (não em plaintext)
✅ Nomes não aparecem na transmissão
✅ Apenas a criptografia do conteúdo
```

---

#### Teste 9.3: Nomes Locais (Não no Servidor)
```
Ação:
1. Abrir DevTools
2. Network → WebSocket
3. Enviar mensagem
4. Ver os dados enviados

Esperado:
✅ Nome NÃO aparece nas mensagens do WebSocket
✅ Apenas ID original e conteúdo criptografado
✅ Nomes são apenas para display local
```

---

### 🔟 Testes de Performance

#### Teste 10.1: Salvar Múltiplos Nomes
```
Ação:
1. Executar em um loop:
   - Abrir modal
   - Digitar "Nome 1", salvar
   - Abrir modal
   - Digitar "Nome 2", salvar
   - (10 vezes)

Esperado:
✅ Todas as operações rápidas (< 100ms)
✅ Sem lag na interface
✅ Sem erro na console
```

---

#### Teste 10.2: Muitas Mensagens com Nomes
```
Ação:
1. Enviar 100+ mensagens rapidamente
2. Observar performance

Esperado:
✅ Cada mensagem mostra nome
✅ Scroll suave
✅ Sem travamento
✅ Memória não cresce descontroladamente
```

---

### 1️⃣1️⃣ Testes de Acessibilidade

#### Teste 11.1: Navegação com Tab
```
Ação:
1. Abrir modal
2. Pressionar Tab
3. Navegar pelos elementos

Esperado:
✅ Foco visível em cada elemento
✅ Ordem lógica: ID → Input → Cancelar → Salvar
```

---

#### Teste 11.2: Leitura de Tela
```
Ação:
1. Usar leitor de tela (se disponível)
2. Navegar pelo modal

Esperado:
✅ Labels dos campos são lidos
✅ Botões são identificados
✅ Mensagens são claras
```

---

### 1️⃣2️⃣ Testes de Erro

#### Teste 12.1: Nome com Null Bytes
```
Ação:
1. (Se possível) Tentar enviar null bytes
2. Digitar: "Alice\0Bob"

Esperado:
✅ Sistema trata como string normal
✅ Sem erros de segurança
```

---

#### Teste 12.2: Muito Texto
```
Ação:
1. Copiar um texto muito grande (1000+ caracteres)
2. Colar no campo de nome
3. Salvar

Esperado:
✅ Texto salvo completamente (ou truncado com aviso)
✅ Layout não quebra
✅ Scroll permite ver tudo
```

---

## 📊 Matriz de Testes

| ID | Teste | Resultado | Observações |
|---|---|---|---|
| 1.1 | Carregamento | ✅/❌ | |
| 1.2 | Botão ✏️ | ✅/❌ | |
| 1.3 | Modal vazio | ✅/❌ | |
| 2.1 | Digitar nome simples | ✅/❌ | |
| 2.2 | Espaços extras | ✅/❌ | |
| 2.3 | Nome longo | ✅/❌ | |
| 2.4 | Caracteres especiais | ✅/❌ | |
| 2.5 | Emoji | ✅/❌ | |
| 3.1 | Cancelar | ✅/❌ | |
| 3.2 | Clicar fora | ✅/❌ | |
| 4.1 | Resetar nome | ✅/❌ | |
| 5.1 | Mensagem enviada | ✅/❌ | |
| 5.2 | Mensagem recebida | ✅/❌ | |
| 6.1 | Enviar imagem | ✅/❌ | |
| 7.1 | Persistência | ✅/❌ | |
| 8.1 | Dois usuários | ✅/❌ | |
| 8.2 | Dois PCs | ✅/❌ | |
| 9.1 | ID read-only | ✅/❌ | |
| 9.2 | Criptografia OK | ✅/❌ | |
| 10.1 | Performance | ✅/❌ | |

---

## 🎯 Cenário de Teste Completo

### Do Zero ao Sucesso

```
1. Instalar extensão
   ↓
2. Conectar ao servidor
   ✅ ID aparece no header
   ↓
3. Clicar em ✏️
   ✅ Modal abre
   ↓
4. Digitar "Meu Nome"
   ✅ Input funciona
   ↓
5. Clicar [Salvar]
   ✅ Nome salvo e exibido
   ↓
6. Conectar com outro usuário
   ✅ Ambos têm nomes editáveis
   ↓
7. Trocar mensagens
   ✅ Nomes aparecem em cada mensagem
   ↓
8. Enviar imagem
   ✅ Nome aparece acima da imagem
   ↓
9. Fechar e reabrir
   ✅ Nome persiste
   ↓
10. Editar novamente
    ✅ Modal funciona novamente
    
🎉 TESTE COMPLETO COM SUCESSO!
```

---

**Todos os testes devem passar para considera Produção-Ready! ✅**
