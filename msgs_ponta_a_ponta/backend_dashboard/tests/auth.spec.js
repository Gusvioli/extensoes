const { test, expect } = require('@playwright/test');

// Usamos um nome de servidor de teste único para evitar conflitos
const TEST_SERVER_NAME = `Test Server ${Date.now()}`;

test.describe('Admin User Flow', () => {
  // O Playwright vai reusar o login para todos os testes neste bloco
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('deve criar, verificar e deletar um servidor', async ({ page }) => {
    // 1. Navegar para a página principal
    await page.goto('/');

    // 2. Clicar no botão para adicionar um novo servidor
    // A interface pode variar, então usamos um seletor de texto robusto
    await page.getByRole('button', { name: /Adicionar Servidor/i }).click();

    // 3. Preencher o formulário de criação do servidor
    await page.getByLabel(/Nome do Servidor/i).fill(TEST_SERVER_NAME);
    await page.getByLabel(/Host/i).fill('localhost');
    await page.getByLabel(/Porta/i).fill('8080');
    await page.getByLabel(/Token/i).fill('automated-test-token');
    
    // Clicar em "Salvar" ou "Criar"
    await page.getByRole('button', { name: /Salvar|Criar/i }).click();

    // 4. Verificar se o servidor aparece na lista
    // Usamos `expect` para esperar o elemento aparecer, o que lida com assincronicidade
    const serverCard = page.locator('.server-card', { hasText: TEST_SERVER_NAME });
    await expect(serverCard).toBeVisible({ timeout: 10000 }); // Espera até 10s
    await expect(serverCard.getByText('localhost')).toBeVisible();
    await expect(serverCard.getByText('8080')).toBeVisible();

    // 5. Deletar o servidor criado
    await serverCard.getByRole('button', { name: /Deletar|Excluir/i }).click();

    // A aplicação pode pedir uma confirmação
    // O Playwright pode lidar com diálogos de confirmação nativos
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Confirmar|Sim/i }).click();

    // 6. Verificar se o servidor desapareceu da lista
    await expect(serverCard).not.toBeVisible({ timeout: 10000 });

    // 7. Fazer Logout
    await page.getByRole('button', { name: /Sair|Logout/i }).click();

    // 8. Verificar se voltamos para a tela de login
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});

// Este teste é executado primeiro para realizar o login e salvar o estado
test('Login e Autenticação do Admin', async ({ page }) => {
  await page.goto('/');

  // Clica no botão de login para abrir o modal
  await page.getByRole('button', { name: 'Entrar' }).click();
  
  // Preenche o formulário de login dentro do modal
  await page.locator('#login-username').fill('admin');
  await page.locator('#login-password').fill('admin123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Verifica se o login foi bem-sucedido esperando por um elemento que só existe após o login
  await expect(page.getByRole('button', { name: /Sair|Logout/i })).toBeVisible();
  
  // Salva o estado de autenticação (cookies, localStorage) em um arquivo
  // Isso permite que outros testes comecem já logados, economizando tempo
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
});
