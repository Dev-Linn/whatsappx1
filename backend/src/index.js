const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');
const http = require('http');
const PROMPTS = require('./prompts');
const GeminiCostTracker = require('./cost-tracker');
const DatabaseManager = require('./database');
const SentimentAnalyzer = require('./sentiment-analyzer');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Configuração do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Inicializa o tracker de custos, banco de dados e analisador de sentimento
const costTracker = new GeminiCostTracker();
const database = new DatabaseManager();
const sentimentAnalyzer = new SentimentAnalyzer(process.env.GEMINI_API_KEY);

// Configuração da API
const API_BASE = 'http://localhost:3001';

// 🔥 SISTEMA MULTI-INSTÂNCIA WHATSAPP
// Map para gerenciar múltiplas instâncias: tenant_id -> { client, status, messageBuffer }
const whatsappInstances = new Map();

// Classe para gerenciar uma instância WhatsApp de um tenant
class WhatsAppInstance {
    constructor(tenantId, tenantInfo) {
        this.tenantId = tenantId;
        this.tenantInfo = tenantInfo;
        this.client = null;
        this.messageBuffer = new Map(); // phoneNumber -> { messages, timer, etc }
        this.currentStatus = {
            connected: false,
            authenticated: false,
            qrCode: null,
            message: 'Inicializando...'
        };
        this.lastQrCode = null; // Para evitar QR codes duplicados
        this.isInitializing = false; // Para evitar múltiplas inicializações
        this.qrCodeTimeout = null; // Timeout para QR codes
        this.qrCodeAttempts = 0; // Contador de tentativas de QR code
        this.maxQrCodeAttempts = 3; // Máximo de tentativas antes de parar
        this.lastQrCodeTime = null; // Timestamp do último QR code
    }

    // Inicializar cliente WhatsApp para este tenant
    initializeClient() {
        if (this.isInitializing) {
            console.log(`⏳ [Tenant ${this.tenantId}] Inicialização já em andamento...`);
            return this.client;
        }

        if (this.client) {
            console.log(`🔄 [Tenant ${this.tenantId}] Destruindo cliente existente...`);
            this.client.destroy();
        }
        
        this.isInitializing = true;
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: `whatsapp-tenant-${this.tenantId}` // Sessão única por tenant
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-ipc-flooding-protection',
                    '--no-default-browser-check',
                    '--no-experiments',
                    '--disable-extensions-http-throttling'
                ],
                timeout: 60000, // 60 segundos de timeout
                ignoreDefaultArgs: ['--disable-extensions']
            }
        });
        
        this.setupClientEvents();
        return this.client;
    }

    // Configurar eventos do cliente
    setupClientEvents() {
        if (!this.client) return;
        
        // Tratamento de erros gerais do cliente
        this.client.on('error', (error) => {
            console.error(`❌ [Tenant ${this.tenantId}] Erro no cliente WhatsApp:`, error.message);
        });
        
        // QR Code gerado - com controle de duplicatas e timeout
        this.client.on('qr', async (qr) => {
            // Evitar logs repetidos do mesmo QR code
            if (this.lastQrCode === qr) {
                return;
            }
            
            // Verificar se excedeu tentativas máximas
            if (this.qrCodeAttempts >= this.maxQrCodeAttempts) {
                console.log(`⏹️ [Tenant ${this.tenantId}] Máximo de tentativas de QR code atingido (${this.maxQrCodeAttempts}). Parando...`);
                await this.updateStatus({
                    connected: false,
                    authenticated: false,
                    qrCode: null,
                    message: `🔴 DESCONECTADO - Máximo de tentativas atingido. Use "Reconectar" para tentar novamente.`
                });
                return;
            }
            
            this.qrCodeAttempts++;
            this.lastQrCode = qr;
            this.lastQrCodeTime = Date.now();
            
            console.log(`📱 [Tenant ${this.tenantId}] QR Code gerado (tentativa ${this.qrCodeAttempts}/${this.maxQrCodeAttempts})`);
            
            // Limpar timeout anterior se existir
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
            }
            
            // Definir timeout de 2 minutos para o QR code
            this.qrCodeTimeout = setTimeout(async () => {
                if (!this.currentStatus.authenticated) {
                    console.log(`⏰ [Tenant ${this.tenantId}] QR Code expirou após 2 minutos`);
                    await this.updateStatus({
                        connected: false,
                        authenticated: false,
                        qrCode: null,
                        message: 'QR Code expirou. Gerando novo...'
                    });
                }
            }, 2 * 60 * 1000); // 2 minutos
            
            await this.updateStatus({
                connected: false,
                authenticated: false,
                qrCode: qr,
                message: `Escaneie o QR Code com seu WhatsApp (tentativa ${this.qrCodeAttempts}/${this.maxQrCodeAttempts})`
            });
        });

        // Cliente pronto
        this.client.on('ready', async () => {
            console.log(`✅ [Tenant ${this.tenantId}] WhatsApp conectado e pronto!`);
            this.isInitializing = false;
            this.lastQrCode = null;
            
            // Limpar timeout e resetar contadores quando conectar com sucesso
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
                this.qrCodeTimeout = null;
            }
            this.qrCodeAttempts = 0;
            this.lastQrCodeTime = null;
            
            await this.updateStatus({
                connected: true,
                authenticated: true,
                qrCode: null,
                message: 'WhatsApp conectado e ativo!'
            });
        });

        // Autenticado
        this.client.on('authenticated', async () => {
            console.log(`🔐 [Tenant ${this.tenantId}] Autenticação realizada!`);
            
            // Limpar timeout quando autenticar
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
                this.qrCodeTimeout = null;
            }
            
            await this.updateStatus({
                connected: true,
                authenticated: true,
                qrCode: null,
                message: 'Autenticação realizada com sucesso!'
            });
        });

        // Erro de autenticação
        this.client.on('auth_failure', async (msg) => {
            console.error(`❌ [Tenant ${this.tenantId}] Falha na autenticação:`, msg);
            this.isInitializing = false;
            this.lastQrCode = null;
            
            await this.updateStatus({
                connected: false,
                authenticated: false,
                qrCode: null,
                message: `Erro na autenticação: ${msg}`
            });
        });

        // Desconectado
        this.client.on('disconnected', async (reason) => {
            console.log(`🔌 [Tenant ${this.tenantId}] Cliente desconectado:`, reason);
            this.isInitializing = false;
            this.lastQrCode = null;
            
            await this.updateStatus({
                connected: false,
                authenticated: false,
                qrCode: null,
                message: `Desconectado: ${reason}`
            });
        });

        // Mensagens recebidas
        this.client.on('message_create', async (message) => {
            try {
                await this.handleMessage(message);
            } catch (messageError) {
                console.error(`❌ [Tenant ${this.tenantId}] Erro ao processar mensagem:`, messageError.message);
            }
        });
    }

    // Atualizar status e comunicar com API - com controle de duplicatas
    async updateStatus(newStatus) {
        const previousStatus = { ...this.currentStatus };
        this.currentStatus = { ...this.currentStatus, ...newStatus };
        
        // Só comunica com API se houve mudança significativa
        const hasSignificantChange = 
            previousStatus.connected !== this.currentStatus.connected ||
            previousStatus.authenticated !== this.currentStatus.authenticated ||
            (previousStatus.qrCode !== this.currentStatus.qrCode && this.currentStatus.qrCode) ||
            previousStatus.message !== this.currentStatus.message;
            
        if (hasSignificantChange) {
            await this.communicateWithAPI(this.currentStatus);
        }
    }

    // Comunicar com API - com logs reduzidos
    async communicateWithAPI(status) {
        try {
            const statusWithTimestamp = {
                ...status,
                tenant_id: this.tenantId,
                lastUpdate: new Date().toISOString()
            };
            
            const response = await fetch(`${API_BASE}/api/v1/whatsapp/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(statusWithTimestamp)
            });
            
            if (response.ok) {
                // Log reduzido - apenas mudanças importantes
                if (status.connected || status.qrCode || status.message.includes('Erro')) {
                    console.log(`✅ [Tenant ${this.tenantId}] Status: ${status.message}`);
                }
            } else {
                console.error(`❌ [Tenant ${this.tenantId}] Erro API:`, response.status);
            }
        } catch (error) {
            console.error(`❌ [Tenant ${this.tenantId}] Erro ao comunicar com API:`, error.message);
        }
    }

    // Processar mensagens (aqui você coloca toda a lógica de IA)
    async handleMessage(message) {
        try {
            // Ignorar mensagens próprias
            if (message.fromMe) return;
            
            const chat = await message.getChat();
            const contact = await message.getContact();
            
            // Ignorar grupos
            if (chat.isGroup) return;
            
            // Ignorar canais de notícias, broadcasts e outros tipos especiais
            if (chat.isBroadcast || chat.isReadOnly) {
                console.log(`📢 [Tenant ${this.tenantId}] Canal/Broadcast ignorado: ${contact.name || contact.pushname || 'Desconhecido'}`);
                return;
            }
            
            // Filtra números suspeitos (canais, empresas, etc.)
            const phoneNumber = contact.number || contact.id.user || message.from.replace('@c.us', '');
            
            // Ignora números que claramente são de canais/serviços (muito longos ou com padrões específicos)
            if (phoneNumber && (
                phoneNumber.length > 15 || // Números muito longos são suspeitos
                phoneNumber.startsWith('120') || // Padrão de canais
                phoneNumber.includes('newsletter') ||
                phoneNumber.includes('broadcast')
            )) {
                console.log(`🚫 [Tenant ${this.tenantId}] Número suspeito ignorado: ${phoneNumber} (${contact.name || contact.pushname || 'Desconhecido'})`);
                return;
            }
            
            // Processa mensagens de texto e áudio
            if (message.type !== 'chat' && message.type !== 'ptt') {
                console.log(`📎 [Tenant ${this.tenantId}] Mensagem de mídia ignorada (tipo: ${message.type})`);
                return;
            }
            
            let messageContent = '';
            let isAudioMessage = false;
            let audioPath = null;
            let audioDuration = null;
            
            if (message.type === 'ptt') {
                // Mensagem de áudio
                isAudioMessage = true;
                console.log(`🎵 [Tenant ${this.tenantId}] Mensagem de áudio recebida`);
                
                try {
                    // Baixa o áudio apenas para memória (não salva em disco)
                    const media = await message.downloadMedia();
                    if (media) {
                        console.log(`🎵 [Tenant ${this.tenantId}] Áudio baixado para memória (não salvo em disco)`);
                        console.log(`🎵 [Tenant ${this.tenantId}] Formato: ${media.mimetype}, Tamanho: ${Math.round(media.data.length / 1024)}KB`);
                        
                        // Armazena dados do áudio para enviar ao Gemini
                        audioPath = media; // Armazena o objeto media ao invés do caminho
                        messageContent = '[Mensagem de áudio - processando com IA...]';
                        audioDuration = 0; // Placeholder
                        
                        console.log(`🎵 [Tenant ${this.tenantId}] Áudio pronto para transcrição via Gemini`);
                    } else {
                        console.error(`❌ [Tenant ${this.tenantId}] Erro ao baixar áudio`);
                        messageContent = '[Erro ao processar áudio]';
                    }
                } catch (audioError) {
                    console.error(`❌ [Tenant ${this.tenantId}] Erro ao processar áudio:`, audioError);
                    messageContent = '[Erro ao processar mensagem de áudio]';
                }
            } else {
                // Mensagem de texto
                if (!message.body || message.body.trim() === '') {
                    console.log(`📝 [Tenant ${this.tenantId}] Mensagem vazia ignorada`);
                    return;
                }
                messageContent = message.body;
            }
            
            const userName = contact.pushname || contact.name || contact.number || 'Usuário';
            
            // Verificar se temos um número válido
            if (!phoneNumber) {
                console.log(`⚠️ [Tenant ${this.tenantId}] Número de telefone não identificado, ignorando mensagem`);
                return;
            }
            
            // Buscar dados do usuário no banco
            let user = null;
            let isReturning = false;
            
            try {
                user = await database.findOrCreateUser(phoneNumber, userName, this.tenantId);
                if (user) {
                    isReturning = await database.isReturningUser(user.id, this.tenantId);
                }
            } catch (dbError) {
                console.error(`⚠️ [Tenant ${this.tenantId}] Erro ao acessar banco, continuando sem histórico:`, dbError.message);
            }
            
            console.log('');
            if (isAudioMessage) {
                console.log(`🎵 [Tenant ${this.tenantId}] Áudio de ${userName} (${phoneNumber})`);
            } else {
                console.log(`💬 [Tenant ${this.tenantId}] ${userName}: ${messageContent}`);
            }
            
            if (isReturning && user) {
                const lastContact = new Date(user.last_contact).toLocaleDateString('pt-BR');
                console.log(`🔄 [Tenant ${this.tenantId}] Cliente recorrente - Última conversa: ${lastContact}`);
            } else {
                console.log(`✨ [Tenant ${this.tenantId}] Novo cliente`);
            }
            
            // Adiciona mensagem ao buffer (modificando para incluir informações de áudio)
            const messageObject = {
                ...message,
                body: messageContent,
                isAudio: isAudioMessage,
                audioPath: audioPath,
                audioDuration: audioDuration,
                originalMessage: message  // Manter referência à mensagem original
            };
            
            this.addToBuffer(phoneNumber, userName, messageObject);
            
        } catch (error) {
            console.error(`❌ [Tenant ${this.tenantId}] Erro ao processar mensagem:`, error);
            
            try {
                // Envia mensagem de erro para o usuário
                await message.reply('Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes. 🔧');
            } catch (replyError) {
                console.error(`❌ [Tenant ${this.tenantId}] Erro ao enviar mensagem de erro:`, replyError);
            }
        }
    }

    // Adicionar ao buffer (adaptado da lógica original)
    addToBuffer(phoneNumber, userName, message) {
        const now = Date.now();
        
        if (this.messageBuffer.has(phoneNumber)) {
            // Já existe buffer para este usuário
            const bufferData = this.messageBuffer.get(phoneNumber);
            
            // Cancela timer anterior
            clearTimeout(bufferData.timer);
            
            // Calcula se foi digitação rápida
            const timeSinceLastMessage = now - bufferData.lastMessageTime;
            const wasQuickMessage = timeSinceLastMessage < 3000; // 3 segundos
            
            // Adiciona nova mensagem
            bufferData.messages.push(message);
            bufferData.lastMessage = message;
            bufferData.lastMessageTime = now;
            
            // Calcula timeout dinâmico baseado no histórico
            const timeout = this.calculateDynamicTimeout(phoneNumber, false);
            
            console.log(`📝 [Tenant ${this.tenantId}] Mensagem adicionada ao buffer (${bufferData.messages.length} mensagens)`);
            console.log(`⏳ [Tenant ${this.tenantId}] Aguardando ${timeout/1000}s para ver se chegam mais mensagens...`);
            
            // Novo timer
            bufferData.timer = setTimeout(() => {
                this.processBufferedMessages(phoneNumber);
            }, timeout);
            
        } else {
            // Primeiro buffer para este usuário
            console.log(`📝 [Tenant ${this.tenantId}] Iniciando novo buffer para ${userName}`);
            
            const timeout = this.calculateDynamicTimeout(phoneNumber, true);
            console.log(`⏳ [Tenant ${this.tenantId}] Aguardando ${timeout/1000}s para ver se chegam mais mensagens...`);
            
            this.messageBuffer.set(phoneNumber, {
                messages: [message],
                userName: userName,
                lastMessage: message,
                lastMessageTime: now,
                timer: setTimeout(() => {
                    this.processBufferedMessages(phoneNumber);
                }, timeout)
            });
        }
    }

    // Calcular timeout dinâmico
    calculateDynamicTimeout(phoneNumber, isFirstMessage = false) {
        const bufferData = this.messageBuffer.get(phoneNumber);
        
        if (isFirstMessage || !bufferData) {
            return 15000; // 15 segundos para primeira mensagem
        }
        
        const messageCount = bufferData.messages.length;
        const now = Date.now();
        const timeSinceLastMessage = now - bufferData.lastMessageTime;
        
        // Se chegou rapidamente (< 3s), o usuário provavelmente está digitando mais
        if (timeSinceLastMessage < 3000) {
            return Math.max(8000, 6000 + (messageCount * 2000)); // 6s + 2s por mensagem adicional
        }
        
        // Se demorou mais, provavelmente terminou
        return 6000; // Timeout menor para finalizar
    }

    // Processar mensagens agrupadas
    async processBufferedMessages(phoneNumber) {
        if (!this.messageBuffer.has(phoneNumber)) return;
        
        const bufferData = this.messageBuffer.get(phoneNumber);
        const { messages, userName, lastMessage } = bufferData;
        
        console.log(`⏰ [Tenant ${this.tenantId}] Processando ${messages.length} mensagem(s) de ${userName}`);
        
        try {
            // Gera resposta para todas as mensagens agrupadas
            const aiResponse = await generateResponse(messages.map(m => m.body), phoneNumber, userName, this.tenantId);
            
            if (!aiResponse) {
                console.error(`❌ [Tenant ${this.tenantId}] Falha ao gerar resposta para mensagens agrupadas`);
                const originalMessage = lastMessage.originalMessage || lastMessage;
                await originalMessage.reply('Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes. 🔧');
                return;
            }
            
            // Obtém o chat para simular digitação - usa a mensagem original
            const originalMessage = lastMessage.originalMessage || lastMessage;
            const chat = await originalMessage.getChat();
            
            // Simula digitação humana realista
            await simulateTyping(chat, aiResponse);
            
            // Envia a resposta
            await originalMessage.reply(aiResponse);
            
            console.log(`✅ [Tenant ${this.tenantId}] Resposta enviada!`);
            
        } catch (error) {
            console.error(`❌ [Tenant ${this.tenantId}] Erro ao processar mensagens agrupadas:`, error);
            try {
                const originalMessage = lastMessage.originalMessage || lastMessage;
                await originalMessage.reply('Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes. 🔧');
            } catch (replyError) {
                console.error(`❌ [Tenant ${this.tenantId}] Erro ao enviar mensagem de erro:`, replyError);
            }
        } finally {
            // Remove do buffer após processar
            this.messageBuffer.delete(phoneNumber);
        }
    }

    // Reiniciar cliente
    async restart() {
        console.log(`🔄 [Tenant ${this.tenantId}] Reiniciando cliente WhatsApp...`);
        
        // Limpar timeouts
        if (this.qrCodeTimeout) {
            clearTimeout(this.qrCodeTimeout);
            this.qrCodeTimeout = null;
        }
        
        // Resetar contadores para permitir novas tentativas
        this.qrCodeAttempts = 0;
        this.lastQrCode = null;
        this.lastQrCodeTime = null;
        this.isInitializing = false;
        
        await this.updateStatus({
            connected: false,
            authenticated: false,
            qrCode: null,
            message: 'Reiniciando conexão...'
        });

        try {
            if (this.client) {
                await this.client.destroy();
            }
        } catch (error) {
            console.log(`⚠️ [Tenant ${this.tenantId}] Erro ao destruir cliente:`, error.message);
        }

        // Aguardar um pouco antes de reinicializar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.initializeClient();
        await this.client.initialize();
    }

    // Fazer logout
    async logout() {
        try {
            console.log(`🔄 [Tenant ${this.tenantId}] Fazendo logout...`);
            
            await this.updateStatus({
                message: 'Removendo sessão...',
                connected: false,
                authenticated: false,
                qrCode: null
            });
            
            if (this.client) {
                await this.client.destroy();
            }
            
            // Limpar sessão específica do tenant
            const fs = require('fs');
            const path = require('path');
            const sessionPath = path.join(__dirname, '..', '.wwebjs_auth', `session-whatsapp-tenant-${this.tenantId}`);
            
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`✅ [Tenant ${this.tenantId}] Sessão removida!`);
            }
            
            this.client = null;
            
            await this.updateStatus({
                message: '🔴 DESCONECTADO! Clique em "Reconectar" para escanear um novo QR Code',
                connected: false,
                authenticated: false,
                qrCode: null
            });
            
            return true;
        } catch (error) {
            console.error(`❌ [Tenant ${this.tenantId}] Erro ao fazer logout:`, error);
            return false;
        }
    }
}

// Função para obter ou criar instância de um tenant
async function getOrCreateInstance(tenantId) {
    try {
        if (!whatsappInstances.has(tenantId)) {
            console.log(`🆕 [Tenant ${tenantId}] Criando nova instância WhatsApp...`);
            
            // Buscar info do tenant
            const tenantInfo = await getTenantInfo(tenantId);
            const instance = new WhatsAppInstance(tenantId, tenantInfo);
            
            whatsappInstances.set(tenantId, instance);
            
            // Inicializar com delay e tratamento de erro
            try {
                instance.initializeClient();
                
                // Aguardar um pouco antes de inicializar
                setTimeout(() => {
                    try {
                        instance.client.initialize();
                    } catch (initError) {
                        console.error(`❌ [Tenant ${tenantId}] Erro ao inicializar cliente:`, initError.message);
                    }
                }, 1000); // 1 segundo de delay
                
            } catch (clientError) {
                console.error(`❌ [Tenant ${tenantId}] Erro ao criar cliente:`, clientError.message);
                whatsappInstances.delete(tenantId); // Remove a instância defeituosa
                throw clientError;
            }
        }
        
        return whatsappInstances.get(tenantId);
    } catch (error) {
        console.error(`❌ [Tenant ${tenantId}] Erro ao obter/criar instância:`, error.message);
        throw error;
    }
}

// Buscar informações do tenant
async function getTenantInfo(tenantId) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/tenants/${tenantId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.data;
        }
        
        return { id: tenantId, company_name: `Tenant ${tenantId}` };
    } catch (error) {
        console.error(`❌ Erro ao buscar tenant ${tenantId}:`, error);
        return { id: tenantId, company_name: `Tenant ${tenantId}` };
    }
}

// Função para obter o tenant padrão (primeiro tenant cadastrado)
async function getDefaultTenantId() {
    try {
        // Se existe um tenant padrão salvo em memory, usa ele
        if (global.defaultTenantId) {
            return global.defaultTenantId;
        }
        
        // Busca o primeiro tenant do banco de dados
        const response = await fetch(`${API_BASE}/api/v1/tenants/first`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                // Salva em memory para próximas chamadas
                global.defaultTenantId = result.data.id;
                console.log(`✅ Tenant padrão definido: ${result.data.id} (${result.data.company_name})`);
                return result.data.id;
            }
        }
        
        // Fallback para tenant 1 se não conseguir buscar
        console.log('⚠️ Não foi possível obter tenant do banco, usando fallback: 1');
        return 1;
    } catch (error) {
        console.error('❌ Erro ao buscar tenant padrão:', error.message);
        return 1; // Fallback
    }
}

// Função para gerar resposta usando Gemini (agora aceita múltiplas mensagens e áudio)
async function generateResponse(messages, phoneNumber, userName, tenantId) {
    try {
        // Obtém a instância do tenant
        const instance = whatsappInstances.get(tenantId);
        if (!instance) {
            console.error(`❌ Instância não encontrada para tenant ${tenantId}`);
            return 'Desculpe, ocorreu um erro interno. Tente novamente. 😅';
        }

        // Obtém informações de áudio do buffer se existir
        const audioBufferData = instance.messageBuffer.get(phoneNumber);
        let hasAudio = false;
        let audioData = null;
        
        if (audioBufferData && audioBufferData.messages.length > 0) {
            // Verifica se alguma das mensagens no buffer é áudio
            const audioMessage = audioBufferData.messages.find(msg => msg.isAudio);
            if (audioMessage && audioMessage.audioPath && audioMessage.audioPath.data) {
                hasAudio = true;
                audioData = audioMessage.audioPath; // Objeto media com data e mimetype
                console.log(`🎵 [Tenant ${tenantId}] Áudio detectado no buffer - enviando para Gemini`);
            }
        }
        
        // Combina todas as mensagens em uma string
        const combinedMessage = messages.length > 1 
            ? messages.map((msg, index) => `Mensagem ${index + 1}: ${msg}`).join('\n\n')
            : messages[0];
            
        console.log(`📤 [Tenant ${tenantId}] Enviando mensagem para Gemini:`, combinedMessage);
        if (hasAudio) {
            console.log(`🎵 [Tenant ${tenantId}] + Áudio anexado para transcrição e análise`);
        }
        
        // Valida parâmetros de entrada
        if (!messages || messages.length === 0 || !phoneNumber || !userName) {
            console.error(`❌ [Tenant ${tenantId}] Parâmetros inválidos para generateResponse`);
            return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente. 😅';
        }
        
        // Buscar ou criar usuário no banco (com tenant_id)
        const user = await database.findOrCreateUser(phoneNumber, userName, tenantId);
        if (!user) {
            console.error(`❌ [Tenant ${tenantId}] Erro ao buscar/criar usuário no banco`);
            return 'Desculpe, ocorreu um erro interno. Tente novamente. 😅';
        }
        
        // Buscar ou criar conversa do dia (reutiliza se já existe)
        const conversation = await database.findOrCreateConversation(user.id, tenantId);
        if (!conversation) {
            console.error(`❌ [Tenant ${tenantId}] Erro ao buscar/criar conversa`);
            return 'Desculpe, ocorreu um erro interno. Tente novamente. 😅';
        }
        
        // Obter informações de áudio do buffer
        const bufferData = instance.messageBuffer.get(phoneNumber);
        let isAudio = false;
        let audioPath = null;
        let audioDuration = null;
        
        if (bufferData && bufferData.messages.length > 0) {
            // Verifica se alguma das mensagens no buffer é áudio
            const audioMessage = bufferData.messages.find(msg => msg.isAudio);
            if (audioMessage) {
                isAudio = true;
                audioPath = '[Mensagem de áudio processada via IA]'; // Descrição ao invés de caminho
                audioDuration = audioMessage.audioDuration;
            }
        }
        
        // Salvar mensagem do usuário (incluindo informações de áudio se aplicável)
        const userMessageRecord = await database.saveMessage(
            user.id, 
            conversation.id, 
            combinedMessage, 
            false, 
            isAudio, 
            audioPath, 
            audioDuration,
            tenantId
        );
        
        // Buscar contexto de conversas anteriores
        const contextMessages = await database.getContextForAI(user.id, tenantId, 10);
        
        // Verificar se é usuário recorrente
        const isReturning = await database.isReturningUser(user.id, tenantId);
        
        // Montar contexto para IA
        let contextText = '';
        if (isReturning && contextMessages.length > 0) {
            console.log(`🧠 Usuário recorrente detectado: ${userName} (${contextMessages.length} mensagens de contexto)`);
            
            contextText = `\n--- HISTÓRICO DE CONVERSAS COM ${userName.toUpperCase()} ---\n`;
            contextText += `Primeiro contato: ${new Date(user.first_contact).toLocaleDateString('pt-BR')}\n`;
            contextText += `Total de mensagens: ${user.total_messages}\n`;
            contextText += `Última conversa: ${new Date(user.last_contact).toLocaleDateString('pt-BR')}\n`;
            
            // Adicionar informações de análise automática
            if (user.sentiment || user.observations || user.stage) {
                contextText += `\n--- ANÁLISE AUTOMÁTICA ---\n`;
                contextText += `🎯 Stage: ${user.stage || 'lead_frio'}\n`;
                contextText += `😊 Sentimento: ${user.sentiment || 'neutro'}\n`;
                if (user.observations) {
                    contextText += `📝 Observações: ${user.observations}\n`;
                }
                if (user.last_analysis_at) {
                    contextText += `🕒 Última análise: ${new Date(user.last_analysis_at).toLocaleDateString('pt-BR')}\n`;
                }
                contextText += `--- FIM DA ANÁLISE ---\n`;
            }
            
            contextText += "\nÚLTIMAS MENSAGENS:\n";
            contextMessages.forEach((msg, index) => {
                const sender = msg.is_bot ? "Você (Maria Clara)" : userName;
                const msgDate = new Date(msg.timestamp).toLocaleDateString('pt-BR');
                const msgTime = new Date(msg.timestamp).toLocaleTimeString('pt-BR');
                const msgType = msg.is_audio ? " [ÁUDIO]" : "";
                contextText += `${index + 1}. [${msgDate} ${msgTime}] ${sender}${msgType}: ${msg.content}\n`;
            });
            
            contextText += "\n--- FIM DO HISTÓRICO ---\n";
            contextText += "IMPORTANTE: Use essas informações para dar continuidade natural à conversa. ";
            contextText += "Considere o STAGE e SENTIMENTO do cliente para adaptar sua abordagem. ";
            contextText += "Se o cliente já demonstrou interesse antes, seja mais direto. ";
            contextText += "Se já explicou algo, não repita. Seja natural como se fosse uma conversa contínua.\n\n";
        } else {
            console.log(`👋 Novo usuário detectado: ${userName}`);
        }
        
        // Se a mensagem atual é um áudio, adiciona contexto especial
        if (hasAudio) {
            contextText += "\nIMPORTANTE: O cliente acabou de enviar uma MENSAGEM DE ÁUDIO. ";
            contextText += "Transcreva o que está sendo dito no áudio e responda baseado no conteúdo real da mensagem de voz.\n\n";
        }
        
        // Monta o prompt completo
        const fullPrompt = PROMPTS.BASE_PROMPT + contextText + `\nCliente: ${combinedMessage}\n\nVocê:`;
        
        let result;
        if (hasAudio && audioData) {
            console.log('🎵 Enviando áudio para Gemini transcrever e entender...');
            
            // Prepara o conteúdo multimodal (texto + áudio)
            const parts = [
                { text: fullPrompt },
                {
                    inlineData: {
                        mimeType: audioData.mimetype,
                        data: audioData.data
                    }
                }
            ];
            
            result = await model.generateContent(parts);
            console.log('🎵 ✅ Gemini processou o áudio com sucesso!');
        } else {
            // Só texto
            result = await model.generateContent(fullPrompt);
        }
        
        const response = await result.response;
        const text = response.text();
        
        // Se foi áudio, mostra no console a resposta (que deve incluir transcrição)
        if (hasAudio) {
            console.log('🎵 📝 Resposta baseada no áudio:', text.substring(0, 200) + '...');
        }
        
        // Valida se a resposta foi gerada corretamente
        if (!text || text.trim() === '') {
            throw new Error('Resposta vazia do Gemini');
        }
        
        // Salvar resposta do bot (sempre texto)
        const botMessageRecord = await database.saveMessage(user.id, conversation.id, text, true, false, null, null, tenantId);
        
        // Incrementar contador de mensagens desde última análise
        await database.incrementMessagesSinceAnalysis(user.id);
        
        // Verificar se precisa fazer análise automática
        const needsAnalysis = await database.needsAnalysis(user.id, 5); // A cada 5 mensagens
        
        if (needsAnalysis) {
            console.log('🧠 Iniciando análise automática de sentimento...');
            
            try {
                // Buscar mensagens para análise (últimas 20)
                const messagesForAnalysis = await database.getMessagesForAnalysis(user.id, 20);
                
                if (messagesForAnalysis.length > 0) {
                    // Executar análise
                    const analysis = await sentimentAnalyzer.analyzeConversation(messagesForAnalysis, userName);
                    
                    // Atualizar banco com os resultados
                    await database.updateAnalysis(
                        user.id, 
                        analysis.sentiment, 
                        analysis.observations, 
                        analysis.stage
                    );
                    
                    console.log(`✅ Análise concluída: ${analysis.sentiment} | ${analysis.stage} | "${analysis.observations}"`);
                } else {
                    console.log('⚠️ Não há mensagens suficientes para análise');
                }
            } catch (analysisError) {
                console.error('❌ Erro na análise automática:', analysisError.message);
            }
        }
        
        // Registrar custo da API (com tratamento de erro)
        try {
            const costData = costTracker.logRequest(fullPrompt, text);
            
            // Salvar custo no banco também
            if (botMessageRecord) {
                await database.logApiCost(
                    user.id,
                    botMessageRecord.id,
                    costData.inputTokens,
                    costData.outputTokens,
                    costData.costUSD,
                    costData.costBRL,
                    tenantId
                );
            }
            
            console.log(`💰 Custo desta requisição: R$ ${costData.costBRL.toFixed(4)} (${costData.totalTokens} tokens)`);
        } catch (costError) {
            console.error('⚠️ Erro ao registrar custo:', costError.message);
        }
        
        console.log('📥 Resposta do Gemini:', text);
        
        return text;
    } catch (error) {
        console.error('❌ Erro ao gerar resposta:', error);
        return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes. 😅';
    }
}

// Função para simular digitação humana realista
function calculateTypingTime(text) {
    // Velocidade base: 25-35 palavras por minuto (mais lenta, mais realista)
    const wordsPerMinute = 25 + Math.random() * 10; // 25-35 WPM (mais lento)
    const charactersPerMinute = wordsPerMinute * 5; // Média de 5 caracteres por palavra
    const charactersPerSecond = charactersPerMinute / 60;
    
    // Conta caracteres da mensagem
    const characterCount = text.length;
    
    // Tempo base de digitação (mais lento)
    let typingTime = (characterCount / charactersPerSecond) * 1000; // em milissegundos
    
    // Adiciona pausas naturais para pontuação e quebras de linha (maiores)
    const punctuationPauses = (text.match(/[.!?]/g) || []).length * 1500; // 1.5s por ponto final
    const commaPauses = (text.match(/[,;]/g) || []).length * 800; // 800ms por vírgula
    const lineBreaks = (text.match(/\n/g) || []).length * 2000; // 2s por quebra de linha
    
    // Adiciona tempo de "pensamento" para mensagens longas (maior)
    const thoughtTime = characterCount > 100 ? Math.random() * 3000 + 2000 : Math.random() * 1000 + 1000; // 1-4s base, 3-5s para longas
    
    // Soma todos os tempos
    const totalTime = typingTime + punctuationPauses + commaPauses + lineBreaks + thoughtTime;
    
    // Limita entre 5 segundos (mínimo) e 30 segundos (máximo) - mais lento
    return Math.max(5000, Math.min(30000, totalTime));
}

// Função para simular digitação com indicador visual
async function simulateTyping(chat, message) {
    const typingTime = calculateTypingTime(message);
    
    console.log(`⌨️ Simulando digitação por ${(typingTime/1000).toFixed(1)}s...`);
    
    try {
        // Usar o método correto para indicar digitação
        await chat.sendStateTyping();
        
        // Aguarda o tempo calculado
        await new Promise(resolve => setTimeout(resolve, typingTime));
        
        // Para de indicar digitação
        await chat.clearState();
    } catch (error) {
        console.log('⚠️ Simulação de digitação não suportada, continuando...');
        // Só espera o tempo sem indicar digitação
        await new Promise(resolve => setTimeout(resolve, typingTime));
    }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Se for erro do Puppeteer, não encerra o processo
    if (reason && reason.message && (
        reason.message.includes('Execution context was destroyed') ||
        reason.message.includes('Protocol error') ||
        reason.message.includes('Target closed')
    )) {
        console.log('⚠️ Erro do Puppeteer detectado, continuando execução...');
        return;
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    
    // Se for erro crítico que não é do Puppeteer, encerra
    if (!error.message.includes('Execution context was destroyed') && 
        !error.message.includes('Protocol error')) {
        process.exit(1);
    }
    
    console.log('⚠️ Erro não crítico, continuando execução...');
});

// Inicialização do cliente
console.log('🚀 Iniciando WhatsApp Gemini Chatbot...');
console.log('');

// Verifica se a API key do Gemini está configurada
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'sua_chave_api_aqui') {
    console.error('❌ ERRO: Configure sua GEMINI_API_KEY no arquivo .env');
    console.log('');
    console.log('📋 Passos para configurar:');
    console.log('1. Acesse: https://makersuite.google.com/app/apikey');
    console.log('2. Crie uma nova API key');
    console.log('3. Substitua "sua_chave_api_aqui" no arquivo .env pela sua chave');
    console.log('');
    process.exit(1);
}

console.log('✅ Chave API do Gemini configurada com sucesso!');
console.log('');

// Inicializar banco de dados antes do cliente WhatsApp
database.initialize().then((success) => {
    if (success) {
        console.log('📊 Sistema de banco de dados pronto!');
        console.log('💡 Instâncias WhatsApp serão criadas sob demanda quando necessário');
        
        // Não inicializar automaticamente todos os tenants
        // initializeExistingTenants(); // REMOVIDO
        
    } else {
        console.error('❌ Falha ao inicializar banco de dados');
        process.exit(1);
    }
});

// Limpeza ao fechar aplicação
process.on('SIGINT', async () => {
    console.log('\n🔄 Fechando aplicação...');
    
    // Limpa todos os timers do buffer de todas as instâncias
    whatsappInstances.forEach((instance, tenantId) => {
        console.log(`🧹 [Tenant ${tenantId}] Limpando timers...`);
        instance.messageBuffer.forEach((bufferData) => {
            clearTimeout(bufferData.timer);
        });
        instance.messageBuffer.clear();
    });
    
    await database.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Fechando aplicação...');
    
    // Limpa todos os timers do buffer de todas as instâncias
    whatsappInstances.forEach((instance, tenantId) => {
        console.log(`🧹 [Tenant ${tenantId}] Limpando timers...`);
        instance.messageBuffer.forEach((bufferData) => {
            clearTimeout(bufferData.timer);
        });
        instance.messageBuffer.clear();
    });
    
    await database.close();
    process.exit(0);
});

// Servidor HTTP para comandos multi-instância do backend
const backendServer = http.createServer((req, res) => {
    const url = req.url;
    const method = req.method;
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Parse body para comandos POST
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', async () => {
        try {
            const data = body ? JSON.parse(body) : {};
            
            if (method === 'POST' && url === '/restart') {
                console.log('🔄 Comando de restart recebido via HTTP');
                
                const { tenant_id } = data;
                if (!tenant_id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'tenant_id obrigatório' }));
                    return;
                }
                
                const instance = await getOrCreateInstance(tenant_id);
                const success = await instance.restart();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success, 
                    message: success ? `Restart iniciado para tenant ${tenant_id}` : 'Erro no restart' 
                }));
                return;
            }
            
            if (method === 'POST' && url === '/logout') {
                console.log('🔄 Comando de logout recebido via HTTP');
                
                const { tenant_id } = data;
                if (!tenant_id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'tenant_id obrigatório' }));
                    return;
                }
                
                const instance = await getOrCreateInstance(tenant_id);
                const success = await instance.logout();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success, 
                    message: success ? `Logout realizado para tenant ${tenant_id}` : 'Erro no logout' 
                }));
                return;
            }
            
            if (method === 'GET' && url === '/status') {
                const statusList = {};
                whatsappInstances.forEach((instance, tenantId) => {
                    statusList[tenantId] = instance.currentStatus;
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(statusList));
                return;
            }
            
            if (method === 'POST' && url === '/initialize') {
                console.log('🆕 Comando de inicialização recebido via HTTP');
                
                const { tenant_id } = data;
                if (!tenant_id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'tenant_id obrigatório' }));
                    return;
                }
                
                const instance = await getOrCreateInstance(tenant_id);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Instância WhatsApp criada para tenant ${tenant_id}` 
                }));
                return;
            }
            
            // 404 para outras rotas
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
            
        } catch (error) {
            console.error('❌ Erro no servidor HTTP:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
        }
    });
});

// Start backend server
backendServer.listen(3002, () => {
    console.log('🔧 Servidor multi-instância do backend ativo na porta 3002');
    console.log('   • POST http://localhost:3002/restart - Reiniciar WhatsApp (tenant_id obrigatório)');
    console.log('   • POST http://localhost:3002/logout - Deslogar WhatsApp (tenant_id obrigatório)');
    console.log('   • POST http://localhost:3002/initialize - Inicializar WhatsApp (tenant_id obrigatório)');
    console.log('   • GET  http://localhost:3002/status - Status de todas as instâncias');
});

// Função para inicializar automaticamente instâncias de tenants existentes
async function initializeExistingTenants() {
    try {
        console.log('🔍 Buscando tenants existentes para inicializar...');
        
        const response = await fetch(`${API_BASE}/api/v1/tenants/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const tenants = result.data || [];
            
            console.log(`📋 Encontrados ${tenants.length} tenants para inicializar`);
            
            // Inicializar instâncias COM DELAY para evitar conflitos
            for (let i = 0; i < tenants.length; i++) {
                const tenant = tenants[i];
                
                try {
                    console.log(`🆕 Inicializando tenant ${tenant.id} (${tenant.company_name})`);
                    await getOrCreateInstance(tenant.id);
                    
                    // DELAY entre inicializações para evitar conflitos do Puppeteer
                    if (i < tenants.length - 1) {
                        console.log(`⏳ Aguardando 3s antes da próxima inicialização...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                } catch (instanceError) {
                    console.error(`❌ Erro ao inicializar tenant ${tenant.id}:`, instanceError.message);
                    // Continua com o próximo tenant mesmo se um falhar
                }
            }
            
            console.log(`✅ Processo de inicialização concluído!`);
        }
    } catch (error) {
        console.log('⚠️ Não foi possível buscar tenants existentes:', error.message);
        console.log('💡 Instâncias serão criadas conforme demanda');
    }
}