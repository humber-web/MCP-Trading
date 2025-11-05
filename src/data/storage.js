const fs = require('fs').promises;
const path = require('path');
const config = require('../utils/config');

class DataStorage {
  constructor() {
    this.dataPath = path.join(process.cwd(), config.paths.data_dir);
    this.portfolioPath = path.join(this.dataPath, config.paths.portfolio_file);
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Criar directório de dados se não existir
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Criar directório de logs se não existir
      const logsPath = path.join(process.cwd(), config.paths.logs_dir);
      await fs.mkdir(logsPath, { recursive: true });
      
      this.initialized = true;
      console.error('✅ Sistema de armazenamento inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar armazenamento:', error.message);
      throw error;
    }
  }

  // Métodos para portfolio
  async loadPortfolio() {
    await this.initialize();
    
    try {
      const data = await fs.readFile(this.portfolioPath, 'utf8');
      const portfolio = JSON.parse(data);
      console.error(`✅ Portfolio carregado: $${portfolio.total_value.toFixed(2)}`);
      return portfolio;
    } catch (error) {
      // Se ficheiro não existe, criar portfolio inicial
      console.error('📝 Criando novo portfolio...');
      return this.createInitialPortfolio();
    }
  }

  async savePortfolio(portfolio) {
    await this.initialize();
    
    try {
      // Backup do portfolio anterior (se existir)
      await this.backupPortfolio();
      
      // Salvar novo portfolio
      const portfolioData = {
        ...portfolio,
        last_saved: new Date().toISOString(),
        version: config.mcp.server_info.version
      };
      
      await fs.writeFile(
        this.portfolioPath, 
        JSON.stringify(portfolioData, null, 2)
      );
      
      console.error(`💾 Portfolio salvo: $${portfolio.total_value.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar portfolio:', error.message);
      throw error;
    }
  }

  async backupPortfolio() {
    try {
      const backupPath = path.join(
        this.dataPath, 
        `portfolio_backup_${Date.now()}.json`
      );
      
      // Verificar se ficheiro original existe
      await fs.access(this.portfolioPath);
      
      // Copiar para backup
      await fs.copyFile(this.portfolioPath, backupPath);
      
      // Manter apenas os últimos 5 backups
      await this.cleanupBackups();
      
    } catch (error) {
      // Ficheiro original não existe, sem problema
      if (error.code !== 'ENOENT') {
        console.error('⚠️ Erro ao fazer backup:', error.message);
      }
    }
  }

  async cleanupBackups() {
    try {
      const files = await fs.readdir(this.dataPath);
      const backupFiles = files
        .filter(file => file.startsWith('portfolio_backup_'))
        .map(file => ({
          name: file,
          path: path.join(this.dataPath, file),
          time: parseInt(file.match(/portfolio_backup_(\d+)\.json/)[1])
        }))
        .sort((a, b) => b.time - a.time); // Mais recente primeiro
      
      // Manter apenas os 5 mais recentes
      const toDelete = backupFiles.slice(5);
      
      for (const backup of toDelete) {
        await fs.unlink(backup.path);
        console.error(`🗑️ Backup antigo removido: ${backup.name}`);
      }
      
    } catch (error) {
      console.error('⚠️ Erro ao limpar backups:', error.message);
    }
  }

  createInitialPortfolio() {
    return {
      balance_usd: config.trading.initial_balance,
      positions: {},
      total_value: config.trading.initial_balance,
      trades_history: [],
      pnl: 0,
      created_at: new Date().toISOString(),
      version: config.mcp.server_info.version
    };
  }

  // Métodos para logs
  async logTrade(trade) {
    try {
      const logPath = path.join(
        process.cwd(), 
        config.paths.logs_dir, 
        'trades.log'
      );
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        trade: trade,
        session: process.pid
      };
      
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logPath, logLine);
      
    } catch (error) {
      console.error('⚠️ Erro ao registar trade:', error.message);
    }
  }

  async logError(error, context = '') {
    try {
      const logPath = path.join(
        process.cwd(), 
        config.paths.logs_dir, 
        'errors.log'
      );
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          context: context
        },
        session: process.pid
      };
      
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logPath, logLine);
      
    } catch (logError) {
      console.error('⚠️ Erro ao registar erro:', logError.message);
    }
  }

  // Métodos para estatísticas
  async saveStats(stats) {
    try {
      const statsPath = path.join(this.dataPath, 'stats.json');
      const statsData = {
        ...stats,
        last_updated: new Date().toISOString(),
        session: process.pid
      };
      
      await fs.writeFile(
        statsPath, 
        JSON.stringify(statsData, null, 2)
      );
      
    } catch (error) {
      console.error('⚠️ Erro ao salvar estatísticas:', error.message);
    }
  }

  async loadStats() {
    try {
      const statsPath = path.join(this.dataPath, 'stats.json');
      const data = await fs.readFile(statsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Retornar stats vazias se ficheiro não existe
      return {
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_fees_paid: 0,
        best_trade: 0,
        worst_trade: 0,
        api_calls: 0,
        cache_hits: 0,
        sessions: 1,
        first_run: new Date().toISOString()
      };
    }
  }

  // Methods for pending orders
  async loadPendingOrders() {
    try {
      const ordersPath = path.join(this.dataPath, 'pending_orders.json');
      const data = await fs.readFile(ordersPath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.orders || [];
    } catch (error) {
      // Return empty array if file doesn't exist
      return [];
    }
  }

  async savePendingOrders(orders) {
    try {
      const ordersPath = path.join(this.dataPath, 'pending_orders.json');
      const ordersData = {
        orders: orders,
        last_updated: new Date().toISOString(),
        count: orders.length
      };

      await fs.writeFile(
        ordersPath,
        JSON.stringify(ordersData, null, 2)
      );

      return true;
    } catch (error) {
      console.error('⚠️ Error saving pending orders:', error.message);
      throw error;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      // Check if storage is initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check if data directory exists and is writable
      await fs.access(this.dataPath, fs.constants.F_OK | fs.constants.W_OK);
      
      // Check if portfolio file is accessible
      let portfolioStatus = 'healthy';
      try {
        await fs.access(this.portfolioPath, fs.constants.F_OK);
      } catch (error) {
        if (error.code === 'ENOENT') {
          portfolioStatus = 'warning'; // File doesn't exist but can be created
        } else {
          portfolioStatus = 'error';
        }
      }
      
      // Check disk space (basic check)
      const storageInfo = await this.getStorageInfo();
      const hasStorageInfo = storageInfo && !storageInfo.error;
      
      // Determine overall status
      let overallStatus = 'healthy';
      const warnings = [];
      
      if (portfolioStatus === 'warning') {
        warnings.push('Portfolio file not found (will be created)');
      } else if (portfolioStatus === 'error') {
        overallStatus = 'error';
        warnings.push('Portfolio file access error');
      }
      
      if (!hasStorageInfo) {
        overallStatus = 'warning';
        warnings.push('Storage info unavailable');
      }
      
      return {
        status: overallStatus,
        initialized: this.initialized,
        data_path: this.dataPath,
        portfolio_status: portfolioStatus,
        warnings: warnings.length > 0 ? warnings : undefined,
        storage_info: hasStorageInfo ? storageInfo : undefined,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Métodos utilitários
  async getStorageInfo() {
    try {
      const files = await fs.readdir(this.dataPath);
      const info = {
        data_directory: this.dataPath,
        files: [],
        total_size: 0
      };
      
      for (const file of files) {
        const filePath = path.join(this.dataPath, file);
        const stats = await fs.stat(filePath);
        
        info.files.push({
          name: file,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
        
        info.total_size += stats.size;
      }
      
      return info;
    } catch (error) {
      console.error('⚠️ Erro ao obter info de armazenamento:', error.message);
      return { error: error.message };
    }
  }

  async exportData() {
    try {
      const portfolio = await this.loadPortfolio();
      const stats = await this.loadStats();
      const storageInfo = await this.getStorageInfo();
      
      const exportData = {
        portfolio,
        stats,
        storage_info: storageInfo,
        export_timestamp: new Date().toISOString(),
        version: config.mcp.server_info.version
      };
      
      const exportPath = path.join(
        this.dataPath, 
        `export_${Date.now()}.json`
      );
      
      await fs.writeFile(
        exportPath, 
        JSON.stringify(exportData, null, 2)
      );
      
      console.error(`📤 Dados exportados para: ${exportPath}`);
      return exportPath;
      
    } catch (error) {
      console.error('❌ Erro ao exportar dados:', error.message);
      throw error;
    }
  }
}

module.exports = DataStorage;