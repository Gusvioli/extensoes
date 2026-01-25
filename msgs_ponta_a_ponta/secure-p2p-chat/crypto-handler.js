// extension/crypto-handler.js

/**
 * Módulo para encapsular toda a lógica de criptografia usando a Web Crypto API.
 * Garante que as operações criptográficas sejam seguras e isoladas.
 */
const CryptoHandler = {
    ecdhParams: { name: 'ECDH', namedCurve: 'P-256' },
    aesParams: { name: 'AES-GCM', length: 256 },

    /**
     * Gera um par de chaves criptográficas (pública e privada) para a troca de chaves Diffie-Hellman.
     * @returns {Promise<CryptoKeyPair>} Um par de chaves.
     */
    async generateKeys() {
        return await window.crypto.subtle.generateKey(
            this.ecdhParams,
            true, // Chave extraível para exportação da chave pública
            ['deriveKey']
        );
    },

    /**
     * Deriva uma chave secreta compartilhada usando nossa chave privada e a chave pública do par.
     * @param {CryptoKey} privateKey - Nossa chave privada ECDH.
     * @param {JsonWebKey} publicKeyJwk - A chave pública do par no formato JWK.
     * @returns {Promise<CryptoKey>} A chave AES-GCM compartilhada.
     */
    async deriveSharedSecret(privateKey, publicKeyJwk) {
        const importedPublicKey = await window.crypto.subtle.importKey(
            'jwk',
            publicKeyJwk,
            this.ecdhParams,
            true,
            []
        );

        return await window.crypto.subtle.deriveKey(
            { name: 'ECDH', public: importedPublicKey },
            privateKey,
            this.aesParams,
            false, // A chave derivada não precisa ser extraível.
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Criptografa dados (texto ou arquivo) usando a chave secreta compartilhada.
     * @param {CryptoKey} sharedKey - A chave AES-GCM.
     * @param {string|ArrayBuffer} data - Os dados a serem criptografados.
     * @returns {Promise<ArrayBuffer>} Um buffer contendo o IV + dados criptografados.
     */
    async encrypt(sharedKey, data) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const dataBuffer = (typeof data === 'string') 
            ? new TextEncoder().encode(data)
            : data;

        const encryptedData = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            sharedKey,
            dataBuffer
        );

        const resultBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
        resultBuffer.set(iv);
        resultBuffer.set(new Uint8Array(encryptedData), iv.length);
        
        return resultBuffer.buffer;
    },

    /**
     * Decriptografa dados recebidos usando a chave secreta compartilhada.
     * @param {CryptoKey} sharedKey - A chave AES-GCM.
     * @param {ArrayBuffer} encryptedBuffer - O buffer contendo IV + dados criptografados.
     * @returns {Promise<ArrayBuffer|null>} Os dados originais decriptografados ou null em caso de falha.
     */
    async decrypt(sharedKey, encryptedBuffer) {
        const iv = encryptedBuffer.slice(0, 12);
        const data = encryptedBuffer.slice(12);

        try {
            return await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                sharedKey,
                data
            );
        } catch (e) {
            console.error("❌ Falha na decriptografia.", e);
            return null;
        }
    },

    /**
     * Exporta uma chave pública para o formato JSON Web Key (JWK).
     * @param {CryptoKey} key - A chave pública a ser exportada.
     * @returns {Promise<JsonWebKey>} A chave no formato JWK.
     */
    async exportPublicKey(key) {
        return await window.crypto.subtle.exportKey('jwk', key);
    }
};