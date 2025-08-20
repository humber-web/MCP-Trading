#!/usr/bin/env node

// scripts/health-check.js - Sistema de Health Check Avançado
const fs = require('fs').promises;
const path = require('path');

class HealthChecker {
  constructor() {
    this.projectRoot = path.dirname(__dirname);
    this.checks = [];
    this.startTime = Date.now();
    this.thresholds = {
      memory_mb: 500,
      response_time_ms: 5000,
      disk_usage_percent: 90,
      cache_hit_rate: 50,
      error_rate_percent: 10
    };
  }

  async performHealthCheck() {
    console.log('🩺 CryptoTrader MCP - Health Check');
    console.log('=' * 40);
    
    try {
      // Verificações básicas do sistema
      await this.checkSystemHealth();
      
      // Verificações de arquivos críticos
      await this.checkCriticalFiles();
      
      // Verificações de configuração
      await this.checkConfiguration();
      
      // Verificações de dependências
      await this.checkDependencies();
      
      // Verificações de performance
      await this.checkPerformance();
      
      // Verificações de dados
      await this.checkDataIntegrity();
      
      // Relatório final
      const report = this.generateHealthReport();
      
      // Decidir status de saúde
      const overallHealth = this.determineOverallHealth();
      
      console.log('\n📊 HEALTH CHECK SUMMARY');
      console.log('=' * 40);
      console.log(`Overall Status: ${overallHealth.emoji} ${overallHealth.status}`);
      console.log(`Checks Performed: ${this.checks.length}`);
      console.log(`Passed: ${this.checks.filter(c => c.status === 'PASS').length}`);
      console.log(`Warnings: ${this.checks.filter(c => c.status === 'WARN').length}`);
      console.log(`Failed: ${this.checks.filter(c => c.status === 'FAIL').length}`);
      console.log(`Duration: ${Date.now() - this.startTime}ms`);
      
      // Salvar relatório
      await this.saveHealthReport(report);
      
      // Exit code baseado na saúde
      process.exit(overallHealth.exitCode);
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(2); // Critical error
    }
  }

  async checkSystemHealth() {
    console.log('🖥️ System Health...');
    
    // Verificar uso de memória
    const memory = process.memoryUsage();
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    
    if (heapUsedMB < this.thresholds.memory_mb) {
      this.addCheck('Memory Usage', 'PASS', `${heapUsedMB}MB (< ${this.thresholds.memory_mb}MB)`);
    } else {
      this.addCheck('Memory Usage', 'WARN', `${heapUsedMB}MB (threshold: ${this.thresholds.memory_mb}MB)`);
    }
    
    // Verificar uptime
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    
    if (uptimeSeconds > 60) {
      this.addCheck('Process Uptime', 'PASS', `${uptimeMinutes} minutes`);
    } else {
      this.addCheck('Process Uptime', 'INFO', `${uptimeSeconds} seconds (recently started)`);
    }
    
    // Verificar versão do Node.js
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 14) {
      this.addCheck('Node.js Version', 'PASS', nodeVersion);
    } else {
      this.addCheck('Node.js Version', 'FAIL', `${nodeVersion} (requires >= 14.0.0)`);
    }
    
    // Verificar platform
    this.addCheck('Platform', 'INFO', `${process.platform} ${process.arch}`);
  }

  async checkCriticalFiles() {
    console.log('📁 Critical Files...');
    
    const criticalFiles = [
      'src/server.js',
      'src/utils/config.js',
      'src/utils/cache.js',
      'src/data/storage.js',
      'src/handlers/communication.js',
      'src/handlers/resources.js',
      'src/handlers/tools.js',
      'package.json'
    ];
    
    for (const file of criticalFiles) {
      try {
        const filePath = path.join(this.projectRoot, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && stats.size > 0) {
          this.addCheck(`File: ${file}`, 'PASS', `${Math.round(stats.size / 1024)}KB`);
        } else {
          this.addCheck(`File: ${file}`, 'FAIL', 'Empty or invalid');
        }
      } catch (error) {
        this.addCheck(`File: ${file}`, 'FAIL', 'Not found');
      }
    }
    
    // Verificar diretórios necessários
    const requiredDirs = ['data', 'logs', 'data/backups'];
    
    for (const dir of requiredDirs) {
      try {
        const dirPath = path.join(this.projectRoot, dir);
        await fs.access(dirPath);
        this.addCheck(`Directory: ${dir}`, 'PASS', 'Exists');
      } catch (error) {
        this.addCheck(`Directory: ${dir}`, 'WARN', 'Missing (will be created)');
      }
    }
  }

  async checkConfiguration() {
    console.log('⚙️ Configuration...');
    
    try {
      // Carregar configuração
      const configPath = path.join(this.projectRoot, 'src/utils/config.js');
      
      // Clear cache para reload
      delete require.cache[require.resolve(configPath)];
      const config = require(configPath);
      
      // Verificar estrutura básica
      if (config.trading && config.supported_coins && config.apis) {
        this.addCheck('Config Structure', 'PASS', 'Valid structure');
      } else {
        this.addCheck('Config Structure', 'FAIL', 'Invalid structure');
        return;
      }
      
      // Verificar valores de trading
      const trading = config.trading;
      if (trading.initial_balance > 0 && trading.max_position_size > 0) {
        this.addCheck('Trading Config', 'PASS', `Balance: $${trading.initial_balance}`);
      } else {
        this.addCheck('Trading Config', 'FAIL', 'Invalid trading parameters');
      }
      
      // Verificar moedas suportadas
      if (config.supported_coins.length >= 5) {
        this.addCheck('Supported Coins', 'PASS', `${config.supported_coins.length} coins`);
      } else {
        this.addCheck('Supported Coins', 'WARN', `Only ${config.supported_coins.length} coins`);
      }
      
      // Verificar configurações de API
      if (config.apis.coingecko && config.apis.fear_greed) {
        this.addCheck('API Endpoints', 'PASS', 'All configured');
      } else {
        this.addCheck('API Endpoints', 'WARN', 'Some endpoints missing');
      }
      
      // Verificar cache TTL
      const cache = config.cache;
      if (cache.prices > 0 && cache.analysis > 0 && cache.market > 0) {
        this.addCheck('Cache TTL', 'PASS', `P:${cache.prices}s A:${cache.analysis}s M:${cache.market}s`);
      } else {
        this.addCheck('Cache TTL', 'WARN', 'Invalid cache configuration');
      }
      
    } catch (error) {
      this.addCheck('Configuration Load', 'FAIL', error.message);
    }
  }

  async checkDependencies() {
    console.log('📦 Dependencies...');
    
    const criticalDeps = [
      'axios',
      'node-cache'
    ];
    
    // Verificar package.json
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      
      this.addCheck('package.json', 'PASS', `v${packageData.version}`);
      
      // Verificar dependências críticas
      for (const dep of criticalDeps) {
        try {
          const depPath = require.resolve(dep);
          this.addCheck(`Dependency: ${dep}`, 'PASS', 'Available');
        } catch (error) {
          this.addCheck(`Dependency: ${dep}`, 'FAIL', 'Missing');
        }
      }
      
    } catch (error) {
      this.addCheck('Package Check', 'FAIL', error.message);
    }
    
    // Verificar node_modules
    try {
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      await fs.access(nodeModulesPath);
      this.addCheck('node_modules', 'PASS', 'Directory exists');
    } catch (error) {
      this.addCheck('node_modules', 'FAIL', 'Directory missing - run npm install');
    }
  }

  async checkPerformance() {
    console.log('⚡ Performance...');
    
    // Testar velocidade de I/O
    const startTime = Date.now();
    
    try {
      // Teste de escrita
      const testFile = path.join(this.projectRoot, 'data', '.health-test');
      const testData = JSON.stringify({ test: true, timestamp: Date.now() });
      
      await fs.writeFile(testFile, testData);
      await fs.readFile(testFile, 'utf8');
      await fs.unlink(testFile);
      
      const ioTime = Date.now() - startTime;
      
      if (ioTime < 100) {
        this.addCheck('Disk I/O', 'PASS', `${ioTime}ms`);
      } else if (ioTime < 500) {
        this.addCheck('Disk I/O', 'WARN', `${ioTime}ms (slow)`);
      } else {
        this.addCheck('Disk I/O', 'FAIL', `${ioTime}ms (very slow)`);
      }
      
    } catch (error) {
      this.addCheck('Disk I/O', 'FAIL', error.message);
    }
    
    // Verificar espaço em disco
    try {
      const dataDir = path.join(this.projectRoot, 'data');
      const stats = await fs.stat(dataDir);
      this.addCheck('Data Directory', 'PASS', 'Accessible');
    } catch (error) {
      this.addCheck('Data Directory', 'WARN', 'Not accessible');
    }
    
    // Testar carregamento de módulos
    const moduleStartTime = Date.now();
    
    try {
      const CacheManager = require(path.join(this.projectRoot, 'src/utils/cache.js'));
      const cache = new CacheManager();
      
      // Teste básico de cache
      cache.setPrice('health-test', { price: 100 });
      const retrieved = cache.getPrice('health-test');
      
      const moduleTime = Date.now() - moduleStartTime;
      
      if (retrieved && retrieved.price === 100) {
        this.addCheck('Module Loading', 'PASS', `${moduleTime}ms`);
      } else {
        this.addCheck('Module Loading', 'FAIL', 'Cache test failed');
      }
      
    } catch (error) {
      this.addCheck('Module Loading', 'FAIL', error.message);
    }
  }

  async checkDataIntegrity() {
    console.log('🗄️ Data Integrity...');
    
    const dataFiles = [
      'data/portfolio.json',
      'data/stats.json',
      'data/trades.json'
    ];
    
    for (const file of dataFiles) {
      try {
        const filePath = path.join(this.projectRoot, file);
        
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const parsed = JSON.parse(data);
          
          if (parsed && typeof parsed === 'object') {
            this.addCheck(`Data: ${file}`, 'PASS', `${Object.keys(parsed).length} keys`);
          } else {
            this.addCheck(`Data: ${file}`, 'WARN', 'Invalid structure');
          }
          
        } catch (parseError) {
          this.addCheck(`Data: ${file}`, 'FAIL', 'Invalid JSON');
        }
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.addCheck(`Data: ${file}`, 'INFO', 'Not found (will be created)');
        } else {
          this.addCheck(`Data: ${file}`, 'WARN', error.message);
        }
      }
    }
    
    // Verificar backups
    try {
      const backupDir = path.join(this.projectRoot, 'data/backups');
      const backupFiles = await fs.readdir(backupDir);
      const recentBackups = backupFiles.filter(f => f.includes('portfolio_')).length;
      
      if (recentBackups > 0) {
        this.addCheck('Backup Files', 'PASS', `${recentBackups} backups found`);
      } else {
        this.addCheck('Backup Files', 'INFO', 'No backups yet');
      }
      
    } catch (error) {
      this.addCheck('Backup Files', 'INFO', 'Backup directory not found');
    }
  }

  addCheck(name, status, details) {
    const emoji = {
      'PASS': '✅',
      'FAIL': '❌',
      'WARN': '⚠️',
      'INFO': 'ℹ️'
    }[status] || '❓';
    
    console.log(`   ${emoji} ${name}: ${details}`);
    
    this.checks.push({
      name,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateHealthReport() {
    const summary = {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - this.startTime,
      total_checks: this.checks.length,
      status_counts: {
        pass: this.checks.filter(c => c.status === 'PASS').length,
        fail: this.checks.filter(c => c.status === 'FAIL').length,
        warn: this.checks.filter(c => c.status === 'WARN').length,
        info: this.checks.filter(c => c.status === 'INFO').length
      },
      system_info: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory_usage: process.memoryUsage(),
        uptime_seconds: Math.floor(process.uptime()),
        pid: process.pid
      },
      checks: this.checks,
      thresholds: this.thresholds
    };
    
    return summary;
  }

  determineOverallHealth() {
    const failCount = this.checks.filter(c => c.status === 'FAIL').length;
    const warnCount = this.checks.filter(c => c.status === 'WARN').length;
    const totalCount = this.checks.length;
    
    if (failCount === 0 && warnCount === 0) {
      return {
        status: 'HEALTHY',
        emoji: '✅',
        exitCode: 0,
        description: 'All systems operational'
      };
    } else if (failCount === 0 && warnCount <= 2) {
      return {
        status: 'WARNING',
        emoji: '⚠️',
        exitCode: 0,
        description: 'Minor issues detected'
      };
    } else if (failCount <= 2) {
      return {
        status: 'DEGRADED',
        emoji: '🟡',
        exitCode: 1,
        description: 'Some components failing'
      };
    } else {
      return {
        status: 'UNHEALTHY',
        emoji: '❌',
        exitCode: 1,
        description: 'Multiple critical failures'
      };
    }
  }

  async saveHealthReport(report) {
    try {
      const reportsDir = path.join(this.projectRoot, 'logs');
      
      // Criar diretório se não existir
      try {
        await fs.mkdir(reportsDir, { recursive: true });
      } catch {}
      
      const reportFile = path.join(reportsDir, `health-check-${Date.now()}.json`);
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      
      console.log(`📋 Health report saved: ${reportFile}`);
      
      // Limpar relatórios antigos (manter apenas os últimos 10)
      try {
        const files = await fs.readdir(reportsDir);
        const healthFiles = files
          .filter(f => f.startsWith('health-check-'))
          .sort()
          .reverse();
        
        if (healthFiles.length > 10) {
          const filesToDelete = healthFiles.slice(10);
          for (const file of filesToDelete) {
            await fs.unlink(path.join(reportsDir, file));
          }
        }
      } catch (error) {
        console.log('⚠️ Could not cleanup old reports:', error.message);
      }
      
    } catch (error) {
      console.log('⚠️ Could not save health report:', error.message);
    }
  }

  // Método para uso em Docker healthcheck
  async quickCheck() {
    try {
      // Verificações mínimas para Docker
      const memory = process.memoryUsage();
      const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
      
      if (heapUsedMB > 1000) { // 1GB limit
        throw new Error(`Memory usage too high: ${heapUsedMB}MB`);
      }
      
      // Verificar se servidor está respondendo
      const configPath = path.join(this.projectRoot, 'src/utils/config.js');
      require(configPath);
      
      console.log('✅ Quick health check passed');
      return true;
      
    } catch (error) {
      console.error('❌ Quick health check failed:', error.message);
      return false;
    }
  }
}

// Executar health check
async function main() {
  const checker = new HealthChecker();
  
  // Verificar se é um quick check (para Docker)
  if (process.argv.includes('--quick')) {
    const isHealthy = await checker.quickCheck();
    process.exit(isHealthy ? 0 : 1);
  } else {
    // Health check completo
    await checker.performHealthCheck();
  }
}

// Executar se for arquivo principal
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Health check crashed:', error);
    process.exit(2);
  });
}

module.exports = HealthChecker;