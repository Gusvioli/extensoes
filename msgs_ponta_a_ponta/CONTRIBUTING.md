# Contribuindo para o 5uv1

Obrigado pelo interesse em contribuir para o 5uv1! 🎉

Somos um projeto de código aberto focado em privacidade e segurança, e cada contribuição ajuda a tornar a comunicação segura acessível a todos.

## 📋 Como Contribuir

### 🐛 Reportando Bugs

Se você encontrou um bug, por favor abra uma **Issue** no GitHub com:

1. Um título claro e descritivo.
2. Passos para reproduzir o problema.
3. O comportamento esperado vs. o comportamento real.
4. Screenshots ou logs (se aplicável).
5. Informações do ambiente (Navegador, SO, Versão do Node.js).

### 💡 Sugerindo Recursos

Tem uma ideia para melhorar o 5uv1?

1. Verifique se a ideia já não foi sugerida nas Issues.
2. Abra uma nova Issue com a tag `enhancement`.
3. Descreva o problema que sua sugestão resolve e como ela funcionaria.

### 💻 Contribuindo com Código

1. **Fork** o repositório.
2. Clone o projeto para sua máquina:

   ```bash
   git clone https://github.com/SEU_USUARIO/msgs_ponta_a_ponta.git
   ```

3. Crie uma **branch** para sua feature ou correção:

   ```bash
   git checkout -b feature/minha-nova-feature
   ```

4. Faça suas alterações e **commit**:

   ```bash
   git commit -m "Adiciona suporte a XYZ"
   ```

   *Siga as convenções de commit semântico se possível (ex: `feat:`, `fix:`, `docs:`).*
5. **Push** para o seu fork:

   ```bash
   git push origin feature/minha-nova-feature
   ```

6. Abra um **Pull Request** (PR) para a branch `main` do repositório original.

## 🛠️ Configuração do Ambiente de Desenvolvimento

Para rodar o projeto localmente:

1. Certifique-se de ter **Node.js (v16+)** instalado.
2. Instale as dependências e inicie os serviços:

   ```bash
   ./start-app.sh all
   ```

   Isso iniciará o Servidor WebSocket e o Dashboard.

## 🎨 Padrões de Código

- **JavaScript:** Utilizamos ES6+ moderno. Mantenha o código limpo e comentado onde necessário.
- **Estilo:** Tente seguir o estilo de indentação e formatação existente (Prettier é recomendado).
- **Segurança:** Como este é um app de segurança, evite adicionar dependências externas desnecessárias e sempre valide inputs.

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a **GNU AGPLv3**, a mesma licença do projeto.

---

Obrigado por fazer parte da comunidade 5uv1! 🚀
