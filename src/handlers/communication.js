// src/handlers/communication.js
const config = require('../utils/config');

class CommunicationHandler {
  constructor() {
    this.messageId = 0;
    this.buffer = '';
    this.requestHandlers = new Map();
    this.stats = {
      messages_received: 0,
      messages_sent: 0,
      errors: 0
    };
  }

  initialize() {
    console.error('🚀 CryptoTrader MCP Revolutionary iniciado!');
    console.error(`📡 Protocolo: ${config.mcp.protocol_version}`);
    
    this.setupInputStream();
    this.sendInitializedMessage();
  }

  setupInputStream() {
    process.stdin.on('data', (chunk) => {
      this.buffer += chunk.toString();
      this.processBuffer();
    });

    process.stdin.on('end', () => {
      console.error('📡 Conexão encerrada');
      process.exit(0);
    });

    process.stdin.on('error', (error) => {
      console.error('❌ Erro na entrada:', error.message);
      this.stats.errors++;
    });
  }

  processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        this.processMessage(line.trim());
      }
    }
  }

  async processMessage(messageStr) {
    try {
      const message = JSON.parse(messageStr);
      this.stats.messages_received++;
      
      console.error(`📨 ${message.method || 'response'} (ID: ${message.id})`);

      // Verificar se é uma resposta ou um request
      if (message.method) {
        await this.handleRequest(message);
      } else {
        await this.handleResponse(message);
      }

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error.message);
      this.stats.errors++;
      
      // Tentar extrair ID da mensagem para responder com erro
      try {
        const partialMessage = JSON.parse(messageStr);
        if (partialMessage.id) {
          this.sendErrorResponse(partialMessage.id, {
            code: -32603,
            message: 'Erro interno do servidor',
            data: error.message
          });
        }
      } catch {
        // Não conseguimos nem fazer parse parcial
      }
    }
  }

  async handleRequest(message) {
    const handler = this.requestHandlers.get(message.method);
    
    if (!handler) {
      this.sendErrorResponse(message.id, {
        code: -32601,
        message: `Método não encontrado: ${message.method}`
      });
      return;
    }

    try {
      const result = await handler(message.params || {});
      this.sendSuccessResponse(message.id, result);
    } catch (error) {
      console.error(`❌ Erro no handler ${message.method}:`, error.message);
      this.sendErrorResponse(message.id, {
        code: -32603,
        message: error.message
      });
    }
  }

  async handleResponse(message) {
    // Para futuras implementações de requests bidirecionais
    console.error(`📥 Resposta recebida (ID: ${message.id})`);
  }

  // Registar handlers para diferentes métodos
  registerHandler(method, handler) {
    this.requestHandlers.set(method, handler);
    console.error(`🔧 Handler registado: ${method}`);
  }

  registerHandlers(handlers) {
    Object.entries(handlers).forEach(([method, handler]) => {
      this.registerHandler(method, handler);
    });
  }

  // Envio de mensagens
  sendMessage(message) {
    try {
      const messageStr = JSON.stringify(message);
      console.log(messageStr);
      this.stats.messages_sent++;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      this.stats.errors++;
    }
  }

  sendSuccessResponse(id, result) {
    this.sendMessage({
      jsonrpc: "2.0",
      id: id,
      result: result
    });
  }

  sendErrorResponse(id, error) {
    this.sendMessage({
      jsonrpc: "2.0",
      id: id,
      error: error
    });
  }

  sendInitializedMessage() {
    this.sendMessage({
      jsonrpc: "2.0",
      method: "initialized",
      params: {}
    });
  }

  // Handlers padrão para métodos MCP básicos
  getStandardHandlers() {
    return {
      'initialize': this.handleInitialize.bind(this),
    };
  }

  async handleInitialize(params) {
    console.error('🤝 Cliente conectado e inicializado');
    
    return {
      protocolVersion: config.mcp.protocol_version,
      capabilities: {
        resources: {},
        tools: {}
      },
      serverInfo: config.mcp.server_info
    };
  }

  // Métodos para requests do servidor (para futuras funcionalidades)
  async sendRequest(method, params = {}) {
    const id = ++this.messageId;
    
    return new Promise((resolve, reject) => {
      // Implementar timeout e gestão de resposta
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout no request ${method}`));
      }, 10000);

      this.sendMessage({
        jsonrpc: "2.0",
        id: id,
        method: method,
        params: params
      });

      // Armazenar promise para resolver quando resposta chegar
      // (implementação futura)
    });
  }

  // Notificações (sem resposta esperada)
  sendNotification(method, params = {}) {
    this.sendMessage({
      jsonrpc: "2.0",
      method: method,
      params: params
    });
  }

  // Utilitários
  getStats() {
    return {
      ...this.stats,
      handlers_registered: this.requestHandlers.size,
      uptime_seconds: process.uptime(),
      memory_usage: process.memoryUsage()
    };
  }

  // Shutdown gracioso
  shutdown() {
    console.error('📡 A encerrar servidor MCP...');
    
    // Enviar notificação de shutdown (se necessário)
    this.sendNotification('server/shutdown', {
      reason: 'Graceful shutdown',
      timestamp: new Date().toISOString()
    });

    // Dar tempo para mensagem ser enviada
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }

  // Validação de mensagens
  validateMessage(message) {
    if (!message.jsonrpc || message.jsonrpc !== "2.0") {
      throw new Error('Campo jsonrpc inválido ou ausente');
    }

    if (message.method && typeof message.method !== 'string') {
      throw new Error('Campo method deve ser string');
    }

    if (message.id !== undefined && 
        typeof message.id !== 'string' && 
        typeof message.id !== 'number') {
      throw new Error('Campo id deve ser string ou número');
    }

    return true;
  }

  // Logging estruturado
  logMessage(direction, message, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      direction: direction, // 'incoming' or 'outgoing'
      method: message.method,
      id: message.id,
      error: error,
      session: process.pid
    };

    // Em ambiente de produção, isto iria para um sistema de logs
    if (error) {
      console.error('📝 Erro na mensagem:', JSON.stringify(logEntry));
    }
  }

  // Health check
  healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      stats: this.stats,
      handlers: Array.from(this.requestHandlers.keys())
    };

    // Verificar condições de saúde
    if (this.stats.errors > 100) {
      health.status = 'degraded';
      health.warnings = ['Alto número de erros'];
    }

    if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) { // 500MB
      health.status = 'degraded';
      health.warnings = health.warnings || [];
      health.warnings.push('Alto uso de memória');
    }

    return health;
  }
}

module.exports = CommunicationHandler;