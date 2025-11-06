// src/server.js
// Load environment variables first (before any other imports)
require('dotenv').config();

// DEBUG: Log all environment variables that might be relevant
console.error('\n🔍 DEBUG - Environment Variables Check:');
console.error('==========================================');

// Check for CoinGecko related variables
const envVars = Object.keys(process.env).filter(key =>
  key.includes('COIN') || key.includes('GECKO') || key.includes('API')
);

if (envVars.length > 0) {
  console.error('📋 Found environment variables:');
  envVars.forEach(key => {
    if (key.includes('KEY') || key.includes('SECRET')) {
      const value = process.env[key];
      if (value && value.length > 10) {
        console.error(`   ${key}: ${value.substring(0, 6)}...${value.substring(value.length - 4)}`);
      } else {
        console.error(`   ${key}: ${value || '(empty)'}`);
      }
    } else {
      console.error(`   ${key}: ${process.env[key]}`);
    }
  });
} else {
  console.error('⚠️  No CoinGecko/API related environment variables found!');
}

console.error('\n🎯 Specific Check:');
console.error(`   process.env.COINGECKO_API_KEY = ${process.env.COINGECKO_API_KEY ? 'EXISTS (length: ' + process.env.COINGECKO_API_KEY.length + ')' : 'UNDEFINED'}`);
console.error('==========================================\n');

const CommunicationHandler = require('./handlers/communication');
const ResourcesHandler = require('./handlers/resources');
const ToolsHandler = require('./handlers/tools');
const CacheManager = require('./utils/cache');
const DataStorage = require('./data/storage');
const OrderManager = require('./trading/orders');
const PricesManager = require('./market/prices');
const WebServer = require('./web-server');
const ExchangeFactory = require('./exchange/exchange-factory');
const TelegramNotifier = require('./notifications/telegram-notifier');
const TradingAgent = require('./ai/trading-agent');
const config = require('./utils/config');

// DEBUG: Check if config loaded the API key
console.error('🔍 DEBUG - Config Object:');
console.error(`   config.apis.coingecko.api_key = ${config.apis.coingecko.api_key ? 'EXISTS' : 'NULL/UNDEFINED'}`);
console.error('');

class CryptoTradingServer {
  constructor() {
    // Inicializar componentes principais
    this.communication = new CommunicationHandler();
    this.cache = new CacheManager();
    this.storage = new DataStorage();
    
    // Handlers especializados
    this.resourcesHandler = null;
    this.toolsHandler = null;
    this.orderManager = null;
    this.pricesManager = null;
    this.webServer = null;
    this.exchange = null;
    this.notifier = null;
    this.tradingAgent = null;

    // Estado do servidor
    this.portfolio = null;
    this.stats = {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_fees_paid: 0,
      best_trade: 0,
      worst_trade: 0,
      api_calls: 0,
      cache_hits: 0,
      server_start: new Date().toISOString()
    };
  }

  async initialize() {
    try {
      console.error('🚀 Inicializando CryptoTrader MCP Revolutionary...');

      // Debug: Show environment variable status
      console.error('\n🔧 Environment Configuration:');
      console.error(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.error(`   PORT: ${process.env.PORT || 'not set (using default)'}`);

      // CoinGecko API Key status
      if (process.env.COINGECKO_API_KEY) {
        const keyPreview = process.env.COINGECKO_API_KEY.substring(0, 6) + '...' +
                          process.env.COINGECKO_API_KEY.substring(process.env.COINGECKO_API_KEY.length - 4);
        console.error(`   ✅ COINGECKO_API_KEY: ${keyPreview} (detected)`);
      } else {
        console.error(`   ⚠️  COINGECKO_API_KEY: not set (using free tier)`);
      }

      console.error(`   AI_TRADING_ENABLED: ${process.env.AI_TRADING_ENABLED || 'false'}`);
      console.error(`   TRADING_MODE: ${process.env.TRADING_MODE || 'PAPER'}\n`);

      // 1. Inicializar armazenamento
      await this.storage.initialize();

      // 2. Carregar portfolio e stats
      await this.loadData();

      // 3. Inicializar handlers especializados
      await this.initializeHandlers();

      // 4. Registar handlers MCP
      this.registerMCPHandlers();

      // 5. Inicializar comunicação
      this.communication.initialize();

      // 6. Inicializar web server (se não estiver em modo MCP puro)
      if (process.env.ENABLE_WEB !== 'false') {
        this.webServer = new WebServer(this);
        await this.webServer.start();
      }

      // 7. Setup de shutdown gracioso
      this.setupShutdownHandlers();

      // 8. Start AI Trading Agent if enabled
      if (this.tradingAgent && this.tradingAgent.enabled) {
        await this.tradingAgent.start();
      }

      console.error('✅ Servidor iniciado com sucesso!');
      console.error(`💰 Portfolio: $${this.portfolio.total_value.toFixed(2)}`);
      console.error(`📊 Posições: ${Object.keys(this.portfolio.positions).length}`);
      console.error(`📈 Total trades: ${this.stats.total_trades}`);

    } catch (error) {
      console.error('❌ Erro ao inicializar servidor:', error.message);
      await this.storage.logError(error, 'server_initialization');
      process.exit(1);
    }
  }

  async loadData() {
    try {
      // Carregar portfolio
      this.portfolio = await this.storage.loadPortfolio();
      
      // Carregar estatísticas
      const savedStats = await this.storage.loadStats();
      this.stats = { ...this.stats, ...savedStats };
      
      console.error('✅ Dados carregados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error.message);
      throw error;
    }
  }

  async initializeHandlers() {
    // Initialize Telegram notifications
    this.notifier = new TelegramNotifier();

    // Initialize prices manager FIRST (needed by exchange)
    this.pricesManager = new PricesManager({
      cache: this.cache,
      storage: this.storage,
      stats: this.stats
    });

    // Print exchange configuration
    console.error('\n💱 Exchange Configuration:');
    ExchangeFactory.printConfig();

    // Initialize exchange (defaults to PAPER mode)
    this.exchange = ExchangeFactory.create({
      dependencies: {
        pricesManager: this.pricesManager,
        portfolio: this.portfolio
      }
    });

    await this.exchange.initialize();

    // Initialize order manager
    this.orderManager = new OrderManager({
      storage: this.storage,
      pricesManager: this.pricesManager,
      cache: this.cache,
      portfolio: this.portfolio,
      onOrderExecuted: this.handleOrderExecuted.bind(this)
    });

    // Initialize OrderManager
    await this.orderManager.initialize();

    // Inicializar handlers com dependências
    this.resourcesHandler = new ResourcesHandler({
      portfolio: this.portfolio,
      cache: this.cache,
      storage: this.storage,
      stats: this.stats,
      exchange: this.exchange,
      notifier: this.notifier
    });

    this.toolsHandler = new ToolsHandler({
      portfolio: this.portfolio,
      cache: this.cache,
      storage: this.storage,
      stats: this.stats,
      orderManager: this.orderManager,
      onPortfolioUpdate: this.handlePortfolioUpdate.bind(this),
      onStatsUpdate: this.handleStatsUpdate.bind(this)
    });

    // Initialize AI Trading Agent
    const aiStrategy = process.env.AI_STRATEGY || 'BALANCED';
    const aiEnabled = process.env.AI_TRADING_ENABLED === 'true';
    const aiCheckInterval = parseInt(process.env.AI_CHECK_INTERVAL_HOURS || '6') * 60 * 60 * 1000;

    this.tradingAgent = new TradingAgent({
      pricesManager: this.pricesManager,
      toolsHandler: this.toolsHandler,
      portfolio: this.portfolio,
      storage: this.storage,
      notifier: this.notifier,
      strategy: aiStrategy,
      enabled: aiEnabled,
      checkInterval: aiCheckInterval
    });

    // Auto-start AI trading if enabled
    if (aiEnabled) {
      console.error('\n🤖 AI Trading Agent configuration:');
      console.error(`   Strategy: ${aiStrategy}`);
      console.error(`   Check interval: ${aiCheckInterval / (60 * 60 * 1000)}h`);
      console.error(`   Auto-start: ${aiEnabled}`);
    }

    console.error('✅ Handlers especializados inicializados');
  }

  registerMCPHandlers() {
    // Registar handlers básicos
    this.communication.registerHandlers(
      this.communication.getStandardHandlers()
    );

    // Registar handlers de recursos
    this.communication.registerHandler(
      'resources/list', 
      this.resourcesHandler.listResources.bind(this.resourcesHandler)
    );

    this.communication.registerHandler(
      'resources/read', 
      this.resourcesHandler.readResource.bind(this.resourcesHandler)
    );

    // Registar handlers de ferramentas
    this.communication.registerHandler(
      'tools/list', 
      this.toolsHandler.listTools.bind(this.toolsHandler)
    );

    this.communication.registerHandler(
      'tools/call', 
      this.toolsHandler.callTool.bind(this.toolsHandler)
    );

    // Registar handlers de sistema
    this.communication.registerHandler(
      'system/health',
      this.handleHealthCheck.bind(this)
    );

    this.communication.registerHandler(
      'system/stats',
      this.handleSystemStats.bind(this)
    );

    console.error('✅ Handlers MCP registados');
  }

  setupShutdownHandlers() {
    // Graceful shutdown em diferentes sinais
    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
    
    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        console.error(`📡 Recebido ${signal}, a encerrar graciosamente...`);
        await this.shutdown();
      });
    });

    // Shutdown em erros não capturados
    process.on('uncaughtException', async (error) => {
      console.error('❌ Erro não capturado:', error);
      await this.storage.logError(error, 'uncaught_exception');
      await this.shutdown();
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      await this.storage.logError(new Error(reason), 'unhandled_rejection');
      await this.shutdown();
    });
  }

  // Callbacks para updates
  async handlePortfolioUpdate(updatedPortfolio) {
    this.portfolio = updatedPortfolio;

    try {
      await this.storage.savePortfolio(this.portfolio);

      // Rescan protective orders after portfolio update
      if (this.orderManager) {
        await this.orderManager.scanPortfolioForProtectiveOrders();
      }
    } catch (error) {
      console.error('❌ Erro ao salvar portfolio:', error.message);
      await this.storage.logError(error, 'portfolio_save');
    }
  }

  async handleStatsUpdate(updatedStats) {
    this.stats = { ...this.stats, ...updatedStats };

    try {
      await this.storage.saveStats(this.stats);
    } catch (error) {
      console.error('❌ Erro ao salvar stats:', error.message);
      await this.storage.logError(error, 'stats_save');
    }
  }

  // Callback for automatic order execution
  async handleOrderExecuted(orderData) {
    try {
      console.error(`🤖 Auto-executing order: ${orderData.type} ${orderData.coin}`);

      if (orderData.type === 'BUY') {
        const result = await this.toolsHandler.buyCrypto(
          orderData.coin,
          orderData.amount_usd,
          null,
          null
        );

        // Send notification for limit buy order
        if (this.notifier && orderData.triggerType === 'LIMIT') {
          await this.notifier.notifyLimitOrderFilled(
            'BUY',
            orderData.coin,
            orderData.quantity,
            orderData.price,
            orderData.amount_usd
          );
        }
      } else if (orderData.type === 'SELL') {
        const position = this.portfolio.positions[orderData.coin];
        const result = await this.toolsHandler.sellCrypto(
          orderData.coin,
          orderData.percentage
        );

        // Send appropriate notification based on trigger type
        if (this.notifier && position) {
          const soldQty = position.quantity * (orderData.percentage / 100);
          const soldValue = soldQty * orderData.price;

          if (orderData.triggerType === 'STOP_LOSS') {
            const loss = soldValue - (soldQty * position.avg_price);
            await this.notifier.notifyStopLoss(
              orderData.coin,
              soldQty,
              orderData.price,
              soldValue,
              Math.abs(loss)
            );
          } else if (orderData.triggerType === 'TAKE_PROFIT') {
            const profit = soldValue - (soldQty * position.avg_price);
            await this.notifier.notifyTakeProfit(
              orderData.coin,
              soldQty,
              orderData.price,
              soldValue,
              profit
            );
          } else if (orderData.triggerType === 'LIMIT') {
            await this.notifier.notifyLimitOrderFilled(
              'SELL',
              orderData.coin,
              soldQty,
              orderData.price,
              soldValue
            );
          }
        }
      }

      console.error(`✅ Auto-order executed successfully`);
    } catch (error) {
      console.error(`❌ Error executing automatic order:`, error.message);

      // Send error notification
      if (this.notifier) {
        await this.notifier.notifyError(
          'Order Execution Error',
          error.message,
          {
            coin: orderData.coin,
            type: orderData.type,
            triggerType: orderData.triggerType
          }
        );
      }
      await this.storage.logError(error, 'automatic_order_execution');
    }
  }

  // Handlers de sistema
  async handleHealthCheck(params) {
    const health = this.communication.healthCheck();
    const portfolioHealth = this.checkPortfolioHealth();
    const cacheHealth = this.cache.getStats();
    const orderStats = this.orderManager ? this.orderManager.getOrderStats() : null;
    const exchangeStatus = this.exchange ? this.exchange.getStatus() : null;
    const notificationStatus = this.notifier ? this.notifier.getConfig() : null;

    return {
      ...health,
      portfolio: portfolioHealth,
      cache: cacheHealth,
      trading: {
        total_value: this.portfolio.total_value,
        positions: Object.keys(this.portfolio.positions).length,
        total_trades: this.stats.total_trades
      },
      orders: orderStats,
      exchange: exchangeStatus,
      notifications: notificationStatus
    };
  }

  async handleSystemStats(params) {
    const orderStats = this.orderManager ? this.orderManager.getOrderStats() : null;

    return {
      server: this.communication.getStats(),
      cache: this.cache.getStats(),
      trading: this.stats,
      portfolio: {
        total_value: this.portfolio.total_value,
        balance_usd: this.portfolio.balance_usd,
        positions_count: Object.keys(this.portfolio.positions).length,
        total_pnl: this.portfolio.pnl,
        roi_percent: ((this.portfolio.total_value - config.trading.initial_balance) / config.trading.initial_balance) * 100
      },
      orders: orderStats,
      storage: await this.storage.getStorageInfo()
    };
  }

  checkPortfolioHealth() {
    const totalValue = this.portfolio.total_value;
    const initialValue = config.trading.initial_balance;
    const roi = ((totalValue - initialValue) / initialValue) * 100;
    
    let status = 'healthy';
    const warnings = [];

    // Verificar perdas excessivas
    if (roi < -50) {
      status = 'critical';
      warnings.push('Portfolio perdeu mais de 50%');
    } else if (roi < -20) {
      status = 'warning';
      warnings.push('Portfolio perdeu mais de 20%');
    }

    // Verificar concentração de posições
    const positions = Object.keys(this.portfolio.positions).length;
    if (positions === 1) {
      warnings.push('Portfolio muito concentrado em uma posição');
    }

    // Verificar cash muito baixo
    const cashPercent = (this.portfolio.balance_usd / totalValue) * 100;
    if (cashPercent < 5) {
      warnings.push('Cash muito baixo (<5%)');
    }

    return {
      status,
      warnings,
      roi_percent: roi,
      positions_count: positions,
      cash_percent: cashPercent
    };
  }

  async shutdown() {
    try {
      console.error('📊 Salvando dados finais...');

      // Shutdown AI trading agent
      if (this.tradingAgent && this.tradingAgent.isRunning) {
        this.tradingAgent.stop();
      }

      // Shutdown web server
      if (this.webServer) {
        this.webServer.stop();
      }

      // Shutdown order manager first to stop monitoring
      if (this.orderManager) {
        await this.orderManager.shutdown();
      }

      // Salvar portfolio e stats uma última vez
      await this.storage.savePortfolio(this.portfolio);
      await this.storage.saveStats({
        ...this.stats,
        last_shutdown: new Date().toISOString()
      });

      // Exportar dados como backup
      await this.storage.exportData();

      console.error('✅ Shutdown concluído');
      this.communication.shutdown();
      process.exit(0);

    } catch (error) {
      console.error('❌ Erro durante shutdown:', error.message);
      process.exit(1);
    }
  }

  // Métodos utilitários
  getPortfolio() {
    return this.portfolio;
  }

  getStats() {
    return this.stats;
  }

  getCache() {
    return this.cache;
  }

  getStorage() {
    return this.storage;
  }
}

// Inicializar e executar servidor
async function main() {
  const server = new CryptoTradingServer();
  await server.initialize();
}

// Executar apenas se for o ficheiro principal
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = CryptoTradingServer;