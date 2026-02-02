// server/server.js

const crypto = require('crypto'); // Módulo nativo para criptografia segura
let WebSocket;

try {
    WebSocket = require('ws');
} catch (e) {
    console.error("\n❌ Erro Crítico: O módulo 'ws' não foi encontrado.");
    console.error("Isso indica que as dependências não foram instaladas no ambiente.");
    console.error("👉 NO RENDER: Vá em 'Settings' > 'Root Directory' e defina como 'server' (ou o nome da pasta onde está o package.json).");
    console.error("👉 LOCALMENTE: Entre na pasta do servidor e rode 'npm install'.\n");
    process.exit(1);
}

// Inicia o servidor WebSocket na porta 8080.
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ 
    port: port,
    // Desabilita compressão por padrão para mitigar ataques do tipo CRIME/BREACH em conexões criptografadas
    perMessageDeflate: false 
});

// Um Map para armazenar os clientes conectados, associando um ID único a cada socket.
const clients = new Map();

console.log(`✅ Servidor de sinalização iniciado na porta ${port}...`);

wss.on('connection', (ws, req) => {
    // Gera um ID criptograficamente seguro (96 bits de entropia)
    // Nota: ID via query string foi removido por segurança (conforme Changelog)
    const id = crypto.randomBytes(12).toString('hex');

    clients.set(id, ws);
    console.log(`🔌 Cliente conectado com ID: ${id}`);

    // Envia o ID gerado de volta para o cliente para que ele saiba quem é.
    ws.send(JSON.stringify({ type: 'your-id', id }));

    ws.on('message', (messageAsString) => {
        let data;
        try {
            data = JSON.parse(messageAsString);
        } catch (e) {
            console.error('❌ Mensagem JSON inválida recebida:', messageAsString);
            return;
        }

        const targetClient = clients.get(data.target);

        // Verifica se o cliente de destino existe e está com a conexão aberta.
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            // Adiciona o ID do remetente à mensagem para que o destinatário saiba de quem veio.
            data.from = id;
            console.log(`➡️  Retransmitindo mensagem de ${id} para ${data.target} (tipo: ${data.type})`);
            
            // O servidor NUNCA inspeciona o conteúdo de 'payload'.
            // Ele apenas retransmite a mensagem, garantindo a privacidade.
            targetClient.send(JSON.stringify(data));
        } else {
            console.warn(`⚠️  Cliente alvo ${data.target} não encontrado ou desconectado.`);
        }
    });

    ws.on('close', () => {
        // Quando um cliente se desconecta, remove-o do mapa.
        clients.delete(id);
        console.log(`🔌 Cliente ${id} desconectado.`);
    });

    ws.on('error', (error) => {
        console.error(`❌ Erro no WebSocket do cliente ${id}:`, error);
    });
});