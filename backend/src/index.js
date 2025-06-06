const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');
const http = require('http');
const GeminiCostTracker = require('./cost-tracker');
const DatabaseManager = require('./database');
const SentimentAnalyzer = require('./sentiment-analyzer');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');

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
        this.maxQrCodeAttempts = 5; // Aumentado de 3 para 5
        this.lastQrCodeTime = null; // Timestamp do último QR code
        this.healthCheckInterval = null; // Interval para verificar saúde da conexão
        this.reconnectAttempts = 0; // Contador de tentativas de reconexão
        this.maxReconnectAttempts = 10; // Máximo de tentativas de reconexão
        this.isReconnecting = false; // Flag para evitar múltiplas reconexões
        this.lastHealthCheck = Date.now(); // Timestamp do último healthcheck
        this.connectionLostTime = null; // Quando a conexão foi perdida
    }

    // Inicializar cliente WhatsApp para este tenant
    initializeClient() {
        if (this.isInitializing) {
            console.log(`⏳ [Tenant ${this.tenantId}] Inicialização já em andamento...`);
            return this.client;
        }

        if (this.client) {
            console.log(`🔄 [Tenant ${this.tenantId}] Destruindo cliente existente...`);
            try {
                this.client.destroy();
            } catch (error) {
                console.log(`⚠️ [Tenant ${this.tenantId}] Erro ao destruir cliente anterior:`, error.message);
            }
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
                    '--disable-extensions-http-throttling',
                    '--disable-blink-features=AutomationControlled',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                ],
                timeout: 120000, // Aumentado para 120 segundos
                ignoreDefaultArgs: ['--disable-extensions'],
                handleSIGINT: false,
                handleSIGTERM: false,
                handleSIGHUP: false
            }
        });
        
        this.setupClientEvents();
        this.startHealthCheck(); // Iniciar monitoramento de saúde
        return this.client;
    }

    // Configurar eventos do cliente
    setupClientEvents() {
        if (!this.client) return;
        
        // Tratamento de erros gerais do cliente com auto-reconexão
        this.client.on('error', async (error) => {
            console.error(`❌ [Tenant ${this.tenantId}] Erro no cliente WhatsApp:`, error.message);
            
            // Se for erro crítico, tentar reconectar
            if (error.message.includes('Protocol error') || 
                error.message.includes('Target closed') ||
                error.message.includes('Session closed')) {
                await this.handleConnectionLoss('Erro crítico detectado');
            }
        });
        
        // QR Code gerado - com controle de duplicatas e timeout otimizado
        this.client.on('qr', async (qr) => {
            // Evitar logs repetidos do mesmo QR code
            if (this.lastQrCode === qr) {
                return;
            }
            
            // Verificar se excedeu tentativas máximas
            if (this.qrCodeAttempts >= this.maxQrCodeAttempts) {
                console.log(`⏹️ [Tenant ${this.tenantId}] Máximo de tentativas de QR code atingido (${this.maxQrCodeAttempts}). Aguardando scan do último QR code...`);
                
                // NÃO reiniciar automaticamente - apenas aguardar o scan do último QR code
                await this.updateStatus({
                    connected: false,
                    authenticated: false,
                    qrCode: this.lastQrCode, // Manter o último QR code válido
                    message: `📱 Escaneie o QR Code com seu WhatsApp (${this.maxQrCodeAttempts}/${this.maxQrCodeAttempts}) - Último código disponível`
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
            
            // Timeout mais longo para o último QR code
            const timeoutDuration = this.qrCodeAttempts >= this.maxQrCodeAttempts ? 300000 : 90000; // 5 minutos para o último, 90s para os outros
            
            this.qrCodeTimeout = setTimeout(async () => {
                if (!this.currentStatus.authenticated) {
                    console.log(`⏰ [Tenant ${this.tenantId}] QR Code expirou após ${timeoutDuration/1000} segundos`);
                    
                    // Se foi o último QR code, não gerar novo - aguardar restart manual
                    if (this.qrCodeAttempts >= this.maxQrCodeAttempts) {
                        await this.updateStatus({
                            connected: false,
                            authenticated: false,
                            qrCode: null,
                            message: '🔴 QR Code expirou. Use "Reconectar" para gerar um novo código.'
                        });
                    } else {
                        await this.updateStatus({
                            connected: false,
                            authenticated: false,
                            qrCode: null,
                            message: 'QR Code expirou. Gerando novo...'
                        });
                    }
                }
            }, timeoutDuration);
            
            await this.updateStatus({
                connected: false,
                authenticated: false,
                qrCode: qr,
                message: `📱 Escaneie o QR Code com seu WhatsApp (${this.qrCodeAttempts}/${this.maxQrCodeAttempts})`
            });
        });

        // Cliente pronto - resetar contadores e iniciar monitoramento
        this.client.on('ready', async () => {
            console.log(`✅ [Tenant ${this.tenantId}] WhatsApp conectado e pronto!`);
            this.isInitializing = false;
            this.isReconnecting = false;
            this.lastQrCode = null;
            this.connectionLostTime = null;
            
            // Limpar timeout e resetar contadores quando conectar com sucesso
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
                this.qrCodeTimeout = null;
            }
            this.qrCodeAttempts = 0;
            this.reconnectAttempts = 0;
            this.lastQrCodeTime = null;
            this.lastHealthCheck = Date.now();
            
            // Marcar tenant como conectado no banco
            await updateTenantConnectionStatus(this.tenantId, true);
            
            await this.updateStatus({
                connected: true,
                authenticated: true,
                qrCode: null,
                message: '✅ WhatsApp conectado e ativo!'
            });
        });

        // Autenticado - limpar timeouts
        this.client.on('authenticated', async () => {
            console.log(`🔐 [Tenant ${this.tenantId}] Autenticação realizada!`);
            
            // Limpar timeout quando autenticar
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
                this.qrCodeTimeout = null;
            }
            
            this.lastHealthCheck = Date.now();
            
            await this.updateStatus({
                connected: true,
                authenticated: true,
                qrCode: null,
                message: '🔐 Autenticação realizada com sucesso!'
            });
        });

        // Erro de autenticação - tentar reconectar
        this.client.on('auth_failure', async (msg) => {
            console.error(`❌ [Tenant ${this.tenantId}] Falha na autenticação:`, msg);
            this.isInitializing = false;
            this.lastQrCode = null;
            
            await this.updateStatus({
                connected: false,
                authenticated: false,
                qrCode: null,
                message: `❌ Erro na autenticação: ${msg}`
            });
            
            // Agendar reconexão após falha de autenticação
            setTimeout(async () => {
                await this.handleConnectionLoss('Falha de autenticação');
            }, 10000); // 10 segundos
        });

        // Desconectado - implementar reconexão automática
        this.client.on('disconnected', async (reason) => {
            console.log(`🔌 [Tenant ${this.tenantId}] Cliente desconectado:`, reason);
            this.isInitializing = false;
            this.lastQrCode = null;
            
            // Marcar tenant como desconectado no banco
            await updateTenantConnectionStatus(this.tenantId, false);
            
            await this.updateStatus({
                connected: false,
                authenticated: false,
                qrCode: null,
                message: `🔌 Desconectado: ${reason}`
            });
            
            // Se não foi logout manual, tentar reconectar
            if (reason !== 'LOGOUT') {
                await this.handleConnectionLoss(`Desconectado: ${reason}`);
            }
        });

        // Mensagens recebidas
        this.client.on('message_create', async (message) => {
            try {
                // Atualizar timestamp do último healthcheck
                this.lastHealthCheck = Date.now();
                await this.handleMessage(message);
            } catch (messageError) {
                console.error(`❌ [Tenant ${this.tenantId}] Erro ao processar mensagem:`, messageError.message);
            }
        });
    }

    // Sistema de monitoramento de saúde da conexão
    startHealthCheck() {
        // Limpar interval anterior se existir
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        // Verificar a cada 2 minutos
        this.healthCheckInterval = setInterval(async () => {
            if (this.currentStatus.authenticated && this.client) {
                const now = Date.now();
                const timeSinceLastActivity = now - this.lastHealthCheck;
                
                // Se passou mais de 10 minutos sem atividade, verificar conexão (aumentado de 5 para 10)
                if (timeSinceLastActivity > 10 * 60 * 1000) {
                    console.log(`🏥 [Tenant ${this.tenantId}] Verificando saúde da conexão...`);
                    
                    try {
                        // Tentar obter informações do cliente
                        const info = await Promise.race([
                            this.client.info,
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                        ]);
                        
                        if (info) {
                            this.lastHealthCheck = now;
                            console.log(`✅ [Tenant ${this.tenantId}] Conexão saudável`);
                        }
                    } catch (healthError) {
                        // Só reconectar se for erro crítico
                        if (healthError.message.includes('Protocol error') || 
                            healthError.message.includes('Target closed') ||
                            healthError.message.includes('Session closed')) {
                            console.error(`⚠️ [Tenant ${this.tenantId}] Conexão parece instável:`, healthError.message);
                            await this.handleConnectionLoss('Healthcheck falhou');
                        } else {
                            console.log(`⚠️ [Tenant ${this.tenantId}] Healthcheck falhou, mas não é crítico:`, healthError.message);
                            this.lastHealthCheck = now; // Resetar para não ficar tentando
                        }
                    }
                }
            }
        }, 120000); // 2 minutos ao invés de 1
    }

    // Gerenciar perda de conexão com reconexão automática
    async handleConnectionLoss(reason) {
        // Se já está conectado e funcionando, não fazer nada
        if (this.currentStatus.connected && this.currentStatus.authenticated) {
            console.log(`✅ [Tenant ${this.tenantId}] Sistema já conectado, ignorando perda de conexão: ${reason}`);
            return;
        }
        
        if (this.isReconnecting) {
            console.log(`⏳ [Tenant ${this.tenantId}] Reconexão já em andamento...`);
            return;
        }
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log(`⏹️ [Tenant ${this.tenantId}] Máximo de tentativas de reconexão atingido (${this.maxReconnectAttempts})`);
            await this.updateStatus({
                connected: false,
                authenticated: false,
                qrCode: null,
                message: `🔴 Falha na conexão. Use "Reconectar" para tentar novamente.`
            });
            return;
        }
        
        this.isReconnecting = true;
        this.reconnectAttempts++;
        this.connectionLostTime = this.connectionLostTime || Date.now();
        
        console.log(`🔄 [Tenant ${this.tenantId}] Iniciando reconexão automática (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts}) - Motivo: ${reason}`);
        
        await this.updateStatus({
            connected: false,
            authenticated: false,
            qrCode: null,
            message: `🔄 Reconectando automaticamente... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        });
        
        // Aguardar antes de tentar reconectar (backoff exponencial mais conservador)
        const backoffTime = Math.min(10000 * Math.pow(1.5, this.reconnectAttempts - 1), 60000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        // Verificar novamente se ainda precisa reconectar
        if (this.currentStatus.connected && this.currentStatus.authenticated) {
            console.log(`✅ [Tenant ${this.tenantId}] Sistema já reconectado durante aguardo, cancelando restart`);
            this.isReconnecting = false;
            return;
        }
        
        try {
            // Tentar restart
            await this.restart();
        } catch (error) {
            console.error(`❌ [Tenant ${this.tenantId}] Erro na reconexão:`, error.message);
            this.isReconnecting = false;
            
            // Tentar novamente após um tempo maior
            setTimeout(async () => {
                await this.handleConnectionLoss('Retry após erro');
            }, 30000); // 30 segundos ao invés de 15
        }
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
                    'x-tenant-id': this.tenantId.toString() // Usar header especial para comunicação interna
                },
                body: JSON.stringify(statusWithTimestamp)
            });
            
            if (response.ok) {
                // Log apenas mudanças importantes  
                if (status.qrCode) console.log(`📱 [Tenant ${this.tenantId}] QR Code enviado`);
                if (status.connected) console.log(`✅ [Tenant ${this.tenantId}] Conectado!`);
            } else {
                console.error(`❌ [Tenant ${this.tenantId}] API Error:`, response.status);
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
            
            // Novo timer
            bufferData.timer = setTimeout(() => {
                this.processBufferedMessages(phoneNumber);
            }, timeout);
            
        } else {
            // Primeiro buffer para este usuário
            const timeout = this.calculateDynamicTimeout(phoneNumber, true);
            
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
        
        try {
            // Gera resposta para todas as mensagens agrupadas
            const aiResponse = await generateResponse(messages.map(m => m.body), phoneNumber, userName, this.tenantId);
            
            if (!aiResponse) {
                console.error(`❌ [Tenant ${this.tenantId}] Falha ao gerar resposta`);
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
            
        } catch (error) {
            console.error(`❌ [Tenant ${this.tenantId}] Erro ao processar mensagens:`, error.message);
            try {
                const originalMessage = lastMessage.originalMessage || lastMessage;
                await originalMessage.reply('Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes. 🔧');
            } catch (replyError) {
                console.error(`❌ [Tenant ${this.tenantId}] Erro ao enviar mensagem de erro:`, replyError.message);
            }
        } finally {
            // Remove do buffer após processar
            this.messageBuffer.delete(phoneNumber);
        }
    }

    // Reiniciar cliente
    async restart() {
        console.log(`🔄 [Tenant ${this.tenantId}] Reiniciando cliente WhatsApp...`);
        
        // Marcar como não reconectando para permitir restart manual
        this.isReconnecting = false;
        
        // Limpar todos os timeouts e intervals
        if (this.qrCodeTimeout) {
            clearTimeout(this.qrCodeTimeout);
            this.qrCodeTimeout = null;
        }
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        // Resetar contadores para permitir novas tentativas
        this.qrCodeAttempts = 0;
        this.lastQrCode = null;
        this.lastQrCodeTime = null;
        this.isInitializing = false;
        this.connectionLostTime = null;
        
        await this.updateStatus({
            connected: false,
            authenticated: false,
            qrCode: null,
            message: '🔄 Reiniciando conexão...'
        });

        try {
            if (this.client) {
                console.log(`🧹 [Tenant ${this.tenantId}] Limpando cliente anterior...`);
                
                // Tentar fechar graciosamente primeiro
                try {
                    await Promise.race([
                        this.client.destroy(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                    ]);
                } catch (destroyError) {
                    console.log(`⚠️ [Tenant ${this.tenantId}] Forçando destruição do cliente:`, destroyError.message);
                }
                
                this.client = null;
            }
        } catch (error) {
            console.log(`⚠️ [Tenant ${this.tenantId}] Erro ao destruir cliente:`, error.message);
        }

        // Aguardar um tempo antes de reinicializar (permitir limpeza completa)
        console.log(`⏳ [Tenant ${this.tenantId}] Aguardando limpeza do sistema...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos
        
        try {
            console.log(`🚀 [Tenant ${this.tenantId}] Criando novo cliente...`);
            this.initializeClient();
            
            // Aguardar um pouco antes de inicializar
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log(`📡 [Tenant ${this.tenantId}] Inicializando cliente...`);
            await this.client.initialize();
            
            console.log(`✅ [Tenant ${this.tenantId}] Restart concluído com sucesso!`);
        } catch (initError) {
            console.error(`❌ [Tenant ${this.tenantId}] Erro na inicialização após restart:`, initError.message);
            
            await this.updateStatus({
                connected: false,
                authenticated: false,
                qrCode: null,
                message: `❌ Erro no restart: ${initError.message}. Tente novamente.`
            });
            
            throw initError;
        }
    }

    // Fazer logout
    async logout() {
        try {
            console.log(`🔄 [Tenant ${this.tenantId}] Fazendo logout...`);
            
            // Parar reconexões automáticas
            this.isReconnecting = false;
            this.reconnectAttempts = this.maxReconnectAttempts; // Impedir novas tentativas
            
            // Limpar todos os timeouts e intervals
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
                this.qrCodeTimeout = null;
            }
            
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }
            
            await this.updateStatus({
                message: '🔄 Removendo sessão...',
                connected: false,
                authenticated: false,
                qrCode: null
            });
            
            if (this.client) {
                console.log(`🧹 [Tenant ${this.tenantId}] Destruindo cliente WhatsApp...`);
                
                try {
                    // Tentar logout gracioso com timeout
                    await Promise.race([
                        this.client.logout(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 15000))
                    ]);
                } catch (logoutError) {
                    console.log(`⚠️ [Tenant ${this.tenantId}] Erro no logout, forçando destruição:`, logoutError.message);
                }
                
                try {
                    // Destruir cliente com timeout
                    await Promise.race([
                        this.client.destroy(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Destroy timeout')), 10000))
                    ]);
                } catch (destroyError) {
                    console.log(`⚠️ [Tenant ${this.tenantId}] Erro na destruição:`, destroyError.message);
                }
                
                this.client = null;
            }
            
            // Limpar sessão específica do tenant
            const fs = require('fs');
            const path = require('path');
            const sessionPath = path.join(__dirname, '..', '.wwebjs_auth', `session-whatsapp-tenant-${this.tenantId}`);
            
            if (fs.existsSync(sessionPath)) {
                console.log(`🗂️ [Tenant ${this.tenantId}] Removendo arquivos de sessão...`);
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`✅ [Tenant ${this.tenantId}] Sessão removida!`);
            }
            
            // Resetar todos os contadores e flags
            this.isInitializing = false;
            this.qrCodeAttempts = 0;
            this.reconnectAttempts = 0;
            this.lastQrCode = null;
            this.lastQrCodeTime = null;
            this.lastHealthCheck = Date.now();
            this.connectionLostTime = null;
            
            // Marcar tenant como desconectado no banco
            await updateTenantConnectionStatus(this.tenantId, false);
            
            await this.updateStatus({
                message: '🔴 Desconectado! Clique em "Reconectar" para escanear um novo QR Code',
                connected: false,
                authenticated: false,
                qrCode: null
            });
            
            console.log(`✅ [Tenant ${this.tenantId}] Logout concluído com sucesso!`);
            return true;
        } catch (error) {
            console.error(`❌ [Tenant ${this.tenantId}] Erro ao fazer logout:`, error);
            
            // Mesmo com erro, resetar estado
            await this.updateStatus({
                message: '⚠️ Logout com falhas, mas sessão removida. Use "Reconectar"',
                connected: false,
                authenticated: false,
                qrCode: null
            });
            
            return false;
        }
    }
}

// Função para obter ou criar instância de um tenant
async function getOrCreateInstance(tenantId) {
    try {
        if (!whatsappInstances.has(tenantId)) {
            console.log(`🆕 [Tenant ${tenantId}] Criando nova instância WhatsApp...`);
            
            // Buscar info do tenant com retry
            let tenantInfo;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    tenantInfo = await getTenantInfo(tenantId);
                    break;
                } catch (tenantError) {
                    retryCount++;
                    console.log(`⚠️ [Tenant ${tenantId}] Erro ao buscar tenant (tentativa ${retryCount}/${maxRetries}):`, tenantError.message);
                    if (retryCount >= maxRetries) throw tenantError;
                    await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Backoff
                }
            }
            
            const instance = new WhatsAppInstance(tenantId, tenantInfo);
            whatsappInstances.set(tenantId, instance);
            
            // Inicializar com tratamento robusto de erro
            try {
                console.log(`🚀 [Tenant ${tenantId}] Inicializando cliente WhatsApp...`);
                instance.initializeClient();
                
                // Aguardar um tempo apropriado antes de inicializar
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos
                
                // Tentar inicializar com timeout
                const initPromise = instance.client.initialize();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout na inicialização')), 60000) // 60 segundos
                );
                
                await Promise.race([initPromise, timeoutPromise]);
                console.log(`✅ [Tenant ${tenantId}] Cliente inicializado com sucesso!`);
                
            } catch (clientError) {
                console.error(`❌ [Tenant ${tenantId}] Erro ao criar/inicializar cliente:`, clientError.message);
                
                // Limpar instância defeituosa
                try {
                    if (instance.client) {
                        await instance.client.destroy();
                    }
                } catch (cleanupError) {
                    console.log(`⚠️ [Tenant ${tenantId}] Erro na limpeza:`, cleanupError.message);
                }
                
                whatsappInstances.delete(tenantId);
                
                // Tentar novamente após um tempo se for erro recuperável
                if (clientError.message.includes('Timeout') || 
                    clientError.message.includes('Protocol error')) {
                    console.log(`🔄 [Tenant ${tenantId}] Agendando nova tentativa em 30 segundos...`);
                    setTimeout(async () => {
                        try {
                            await getOrCreateInstance(tenantId);
                        } catch (retryError) {
                            console.error(`❌ [Tenant ${tenantId}] Erro na segunda tentativa:`, retryError.message);
                        }
                    }, 30000);
                }
                
                throw clientError;
            }
        } else {
            const existingInstance = whatsappInstances.get(tenantId);
            console.log(`🔄 [Tenant ${tenantId}] Utilizando instância existente`);
            
            // Verificar se a instância existente está saudável
            if (existingInstance && !existingInstance.isInitializing) {
                try {
                    // Verificar se o cliente ainda está ativo
                    if (existingInstance.client && existingInstance.currentStatus.authenticated) {
                        const info = await Promise.race([
                            existingInstance.client.info,
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Healthcheck timeout')), 5000)
                            )
                        ]);
                        
                        if (!info) {
                            console.log(`⚠️ [Tenant ${tenantId}] Instância não responsiva, criando nova...`);
                            whatsappInstances.delete(tenantId);
                            return await getOrCreateInstance(tenantId);
                        }
                    }
                } catch (healthError) {
                    console.log(`⚠️ [Tenant ${tenantId}] Healthcheck falhou, instância pode estar instável:`, healthError.message);
                }
            }
        }
        
        return whatsappInstances.get(tenantId);
    } catch (error) {
        console.error(`❌ [Tenant ${tenantId}] Erro crítico ao obter/criar instância:`, error.message);
        
        // Tentar limpar estado corrompido
        if (whatsappInstances.has(tenantId)) {
            const faultyInstance = whatsappInstances.get(tenantId);
            try {
                if (faultyInstance.client) {
                    await faultyInstance.client.destroy();
                }
                if (faultyInstance.healthCheckInterval) {
                    clearInterval(faultyInstance.healthCheckInterval);
                }
                if (faultyInstance.qrCodeTimeout) {
                    clearTimeout(faultyInstance.qrCodeTimeout);
                }
            } catch (cleanupError) {
                console.log(`⚠️ [Tenant ${tenantId}] Erro na limpeza de instância corrompida:`, cleanupError.message);
            }
            whatsappInstances.delete(tenantId);
        }
        
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

// Função para buscar prompt personalizado do tenant
async function getTenantPrompt(tenantId) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/prompts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId.toString()
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ [Tenant ${tenantId}] Prompt e modelo carregados:`, {
                prompt_length: data.data.base_prompt?.length || 0,
                ai_model: data.data.ai_model || 'gemini-1.5-flash'
            });
            
            return {
                prompt: data.data.base_prompt || 'Você é um assistente útil.',
                ai_model: data.data.ai_model || 'gemini-1.5-flash'
            };
        } else {
            console.log(`⚠️ [Tenant ${tenantId}] Erro ao buscar prompt da API, usando padrão`);
            return {
                prompt: 'Você é um assistente útil.',
                ai_model: 'gemini-1.5-flash'
            };
        }
    } catch (error) {
        console.error(`❌ [Tenant ${tenantId}] Erro ao conectar com API:`, error.message);
        return {
            prompt: 'Você é um assistente útil.',
            ai_model: 'gemini-1.5-flash'
        };
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
            
        // Valida parâmetros de entrada
        if (!messages || messages.length === 0 || !phoneNumber || !userName) {
            console.error(`❌ [Tenant ${tenantId}] Parâmetros inválidos para generateResponse`);
            return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente. 😅';
        }
        
        // Buscar ou criar usuário no banco (com tenant_id)
        const user = await database.findOrCreateUser(phoneNumber, userName, tenantId);
        if (!user) {
            console.error(`❌ [Tenant ${tenantId}] Erro ao acessar banco de dados`);
            return 'Desculpe, ocorreu um erro interno. Tente novamente. 😅';
        }
        
        // Buscar ou criar conversa do dia (reutiliza se já existe)
        const conversation = await database.findOrCreateConversation(user.id, tenantId);
        if (!conversation) {
            console.error(`❌ [Tenant ${tenantId}] Erro ao acessar banco de dados`);
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
        }
        
        // Se a mensagem atual é um áudio, adiciona contexto especial
        if (hasAudio) {
            contextText += "\nIMPORTANTE: O cliente acabou de enviar uma MENSAGEM DE ÁUDIO. ";
            contextText += "Transcreva o que está sendo dito no áudio e responda baseado no conteúdo real da mensagem de voz.\n\n";
        }
        
        // Monta o prompt completo
        const tenantData = await getTenantPrompt(tenantId);
        const fullPrompt = tenantData.prompt + contextText + `\nCliente: ${combinedMessage}\n\nVocê:`;
        
        console.log(`🧠 [DEBUG] Usando modelo AI: ${tenantData.ai_model} para tenant ${tenantId}`);
        
        // Criar modelo dinâmico baseado na configuração do tenant
        const tenantModel = genAI.getGenerativeModel({ model: tenantData.ai_model });
        
        let result;
        if (hasAudio && audioData) {
            console.log('🎵 Processando áudio com IA...');
            
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
            
            result = await tenantModel.generateContent(parts);
        } else {
            // Só texto
            result = await tenantModel.generateContent(fullPrompt);
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
            try {
                // Buscar mensagens para análise (últimas 20)
                const messagesForAnalysis = await database.getMessagesForAnalysis(user.id, 20);
                
                if (messagesForAnalysis.length > 0) {
                    // Executar análise usando o mesmo modelo do tenant
                    const analysis = await sentimentAnalyzer.analyzeConversation(
                        messagesForAnalysis, 
                        userName, 
                        tenantData.ai_model
                    );
                    
                    // Atualizar banco com os resultados
                    await database.updateAnalysis(
                        user.id, 
                        analysis.sentiment, 
                        analysis.observations, 
                        analysis.stage
                    );
                    
                    console.log(`📊 Análise com ${tenantData.ai_model}: ${analysis.sentiment} | ${analysis.stage}`);
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
            
        } catch (costError) {
            console.error('⚠️ Erro ao registrar custo:', costError.message);
        }
        
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
    
    try {
        // Usar o método correto para indicar digitação
        await chat.sendStateTyping();
        
        // Aguarda o tempo calculado
        await new Promise(resolve => setTimeout(resolve, typingTime));
        
        // Para de indicar digitação
        await chat.clearState();
    } catch (error) {
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
        console.log('🔄 Inicializando instâncias WhatsApp que estavam conectadas...');
        
        // Inicializar automaticamente instâncias que estavam conectadas
        setTimeout(() => {
            initializeExistingTenants();
        }, 3000); // Aguarda 3 segundos para o sistema estabilizar
        
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

// Servidor HTTP para comandos administrativos
const httpApp = express();
httpApp.use(express.json());

// Endpoint para reiniciar instância específica
httpApp.post('/restart', async (req, res) => {
    const { tenant_id } = req.body;
    
    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }
    
    console.log(`🔄 Comando de reinicialização recebido para tenant ${tenant_id}`);
    
    try {
        // Se for erro de instância morta, limpar primeiro
        if (whatsappInstances.has(tenant_id)) {
            const existingInstance = whatsappInstances.get(tenant_id);
            try {
                // Tentar verificar se está viva
                if (existingInstance.client) {
                    await Promise.race([
                        existingInstance.client.getState(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Healthcheck timeout')), 3000)
                        )
                    ]);
                }
            } catch (healthError) {
                console.log(`💀 [Tenant ${tenant_id}] Instância morta detectada no restart, limpando...`);
                whatsappInstances.delete(tenant_id);
            }
        }
        
        const instance = await getOrCreateInstance(tenant_id);
        await instance.restart();
        res.json({ message: `Instância ${tenant_id} reiniciada com sucesso` });
    } catch (error) {
        console.error(`❌ Erro ao reiniciar instância ${tenant_id}:`, error);
        
        // Se for erro de Target closed, forçar limpeza e recriar
        if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
            console.log(`🔄 [Tenant ${tenant_id}] Erro de instância morta no restart, forçando recriação...`);
            try {
                whatsappInstances.delete(tenant_id);
                const newInstance = await getOrCreateInstance(tenant_id);
                res.json({ message: `Instância ${tenant_id} recriada após erro` });
                return;
            } catch (retryError) {
                console.error(`❌ [Tenant ${tenant_id}] Erro na recriação:`, retryError);
                res.status(500).json({ error: `Erro persistente: ${retryError.message}` });
                return;
            }
        }
        
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para deslogar instância específica
httpApp.post('/logout', async (req, res) => {
    const { tenant_id } = req.body;
    
    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }
    
    console.log(`🚪 Comando de logout recebido para tenant ${tenant_id}`);
    
    try {
        const instance = whatsappInstances.get(tenant_id);
        if (instance) {
            await instance.logout();
        }
        res.json({ message: `Logout realizado para tenant ${tenant_id}` });
    } catch (error) {
        console.error(`❌ Erro ao fazer logout da instância ${tenant_id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para inicializar instância específica
httpApp.post('/initialize', async (req, res) => {
    const { tenant_id } = req.body;
    
    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }
    
    console.log(`🆕 Comando de inicialização recebido via HTTP para tenant ${tenant_id}`);
    
    try {
        // Verificar se já existe uma instância e se ela está morta
        if (whatsappInstances.has(tenant_id)) {
            const existingInstance = whatsappInstances.get(tenant_id);
            console.log(`🔍 [Tenant ${tenant_id}] Verificando estado da instância existente...`);
            
            try {
                // Tentar um healthcheck simples na instância existente
                if (existingInstance.client) {
                    await Promise.race([
                        existingInstance.client.getState(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Healthcheck timeout')), 3000)
                        )
                    ]);
                    console.log(`✅ [Tenant ${tenant_id}] Instância existente está ativa`);
                } else {
                    throw new Error('Cliente não existe');
                }
            } catch (healthError) {
                console.log(`💀 [Tenant ${tenant_id}] Instância existente está morta (${healthError.message}), removendo...`);
                
                // Limpar instância morta
                try {
                    if (existingInstance.client) {
                        await existingInstance.client.destroy();
                    }
                    if (existingInstance.healthCheckInterval) {
                        clearInterval(existingInstance.healthCheckInterval);
                    }
                    if (existingInstance.qrCodeTimeout) {
                        clearTimeout(existingInstance.qrCodeTimeout);
                    }
                } catch (cleanupError) {
                    console.log(`⚠️ [Tenant ${tenant_id}] Erro na limpeza:`, cleanupError.message);
                }
                
                whatsappInstances.delete(tenant_id);
                console.log(`🗑️ [Tenant ${tenant_id}] Instância morta removida`);
            }
        }
        
        const instance = await getOrCreateInstance(tenant_id);
        res.json({ message: `Instância ${tenant_id} inicializada com sucesso` });
    } catch (error) {
        console.error(`❌ Erro ao inicializar instância ${tenant_id}:`, error);
        
        // Se for erro de Target closed, tentar uma vez limpar e recriar
        if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
            console.log(`🔄 [Tenant ${tenant_id}] Detectado erro de instância morta, tentando limpeza forçada...`);
            
            try {
                whatsappInstances.delete(tenant_id);
                const newInstance = await getOrCreateInstance(tenant_id);
                res.json({ message: `Instância ${tenant_id} recriada após limpeza` });
                return;
            } catch (retryError) {
                console.error(`❌ [Tenant ${tenant_id}] Erro após tentativa de limpeza:`, retryError);
                res.status(500).json({ error: `Erro persistente: ${retryError.message}` });
                return;
            }
        }
        
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para enviar follow-up manual
httpApp.post('/send-followup', async (req, res) => {
    const { tenant_id, phone, message } = req.body;
    
    if (!tenant_id || !phone || !message) {
        return res.status(400).json({ 
            error: 'tenant_id, phone e message são obrigatórios' 
        });
    }
    
    console.log(`📧 Enviando follow-up para tenant ${tenant_id} - ${phone}`);
    
    try {
        const instance = whatsappInstances.get(tenant_id);
        
        if (!instance || !instance.client || !instance.currentStatus.connected) {
            return res.status(400).json({ 
                error: 'Instância WhatsApp não está conectada' 
            });
        }
        
        // Formatar número para WhatsApp
        const whatsappId = phone.includes('@') ? phone : `${phone}@c.us`;
        
        // Enviar mensagem
        await instance.client.sendMessage(whatsappId, message);
        
        console.log(`✅ Follow-up enviado para ${phone}`);
        res.json({ 
            success: true, 
            message: 'Follow-up enviado com sucesso' 
        });
        
    } catch (error) {
        console.error(`❌ Erro ao enviar follow-up:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para limpar instâncias mortas
httpApp.post('/cleanup', async (req, res) => {
    console.log('🧹 Iniciando limpeza de instâncias mortas...');
    
    const cleanup = [];
    const promises = [];
    
    whatsappInstances.forEach((instance, tenantId) => {
        const checkPromise = (async () => {
            try {
                if (instance.client) {
                    await Promise.race([
                        instance.client.getState(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Timeout')), 3000)
                        )
                    ]);
                    console.log(`✅ [Tenant ${tenantId}] Instância está viva`);
                } else {
                    throw new Error('Cliente não existe');
                }
            } catch (error) {
                console.log(`💀 [Tenant ${tenantId}] Instância morta detectada: ${error.message}`);
                cleanup.push(tenantId);
            }
        })();
        
        promises.push(checkPromise);
    });
    
    await Promise.all(promises);
    
    // Limpar instâncias mortas
    let cleanedCount = 0;
    for (const tenantId of cleanup) {
        try {
            const instance = whatsappInstances.get(tenantId);
            if (instance) {
                if (instance.client) await instance.client.destroy();
                if (instance.healthCheckInterval) clearInterval(instance.healthCheckInterval);
                if (instance.qrCodeTimeout) clearTimeout(instance.qrCodeTimeout);
            }
            whatsappInstances.delete(tenantId);
            cleanedCount++;
            console.log(`🗑️ [Tenant ${tenantId}] Instância morta removida`);
        } catch (cleanupError) {
            console.error(`❌ [Tenant ${tenantId}] Erro na limpeza:`, cleanupError.message);
        }
    }
    
    res.json({
        message: `Limpeza concluída: ${cleanedCount} instâncias mortas removidas`,
        cleanedInstances: cleanup,
        remainingInstances: whatsappInstances.size
    });
});

// Endpoint para status de todas as instâncias
httpApp.get('/status', (req, res) => {
    const status = {};
    
    whatsappInstances.forEach((instance, key) => {
        // A chave já é o tenantId, não precisa fazer replace
        const tenantId = key.toString();
        status[tenantId] = {
            connected: instance.isReady || false,
            authenticated: instance.isAuthenticated || false,
            lastActivity: instance.lastActivity || null,
            clientId: instance.clientId || null
        };
    });
    
    res.json({
        totalInstances: whatsappInstances.size,
        instances: status,
        timestamp: new Date().toISOString()
    });
});

// Start backend server
httpApp.listen(3002, () => {
    console.log('🔧 Servidor multi-instância do backend ativo na porta 3002');
    console.log('   • POST http://localhost:3002/restart - Reiniciar WhatsApp (tenant_id obrigatório)');
    console.log('   • POST http://localhost:3002/logout - Deslogar WhatsApp (tenant_id obrigatório)');
    console.log('   • POST http://localhost:3002/initialize - Inicializar WhatsApp (tenant_id obrigatório)');
    console.log('   • GET  http://localhost:3002/status - Status de todas as instâncias');
});

// Função para marcar tenant como conectado no banco
async function updateTenantConnectionStatus(tenantId, connected) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/tenants/${tenantId}/connection-status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ whatsapp_connected: connected })
        });
        
        if (response.ok) {
            console.log(`✅ [Tenant ${tenantId}] Status de conexão atualizado no banco: ${connected}`);
        } else {
            console.log(`⚠️ [Tenant ${tenantId}] Não foi possível atualizar status no banco`);
        }
    } catch (error) {
        console.log(`⚠️ [Tenant ${tenantId}] Erro ao atualizar status no banco:`, error.message);
    }
}

// Função para inicializar automaticamente instâncias de tenants que estavam conectados
async function initializeExistingTenants() {
    try {
        console.log('🔍 Buscando tenants que estavam conectados para reinicializar...');
        
        const response = await fetch(`${API_BASE}/api/v1/tenants/connected`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const connectedTenants = result.data || [];
            
            if (connectedTenants.length === 0) {
                console.log('📝 Nenhum tenant estava conectado anteriormente');
                return;
            }
            
            console.log(`📋 Encontrados ${connectedTenants.length} tenants conectados para reinicializar:`);
            connectedTenants.forEach(tenant => {
                console.log(`   • Tenant ${tenant.id}: ${tenant.company_name}`);
            });
            
            // Inicializar instâncias COM DELAY para evitar conflitos
            for (let i = 0; i < connectedTenants.length; i++) {
                const tenant = connectedTenants[i];
                
                try {
                    console.log(`🔄 [${i+1}/${connectedTenants.length}] Reinicializando tenant ${tenant.id} (${tenant.company_name})`);
                    const instance = await getOrCreateInstance(tenant.id);
                    
                    // DELAY entre inicializações para evitar conflitos
                    if (i < connectedTenants.length - 1) {
                        console.log(`⏳ Aguardando 0,2s antes da próxima inicialização...`);
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                } catch (instanceError) {
                    console.error(`❌ Erro ao reinicializar tenant ${tenant.id}:`, instanceError.message);
                    // Marcar como desconectado se falhar
                    await updateTenantConnectionStatus(tenant.id, false);
                    // Continua com o próximo tenant mesmo se um falhar
                }
            }
            
            console.log(`✅ Processo de reinicialização automática concluído!`);
        } else {
            console.log('⚠️ Não foi possível buscar tenants conectados - endpoint pode não existir ainda');
            console.log('💡 Instâncias serão criadas conforme demanda');
        }
    } catch (error) {
        console.log('⚠️ Não foi possível buscar tenants conectados:', error.message);
        console.log('💡 Instâncias serão criadas conforme demanda');
    }
}