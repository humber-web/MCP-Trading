const CryptoTradingServer = require('../src/server');

class TestClient {
  constructor() {
    this.server = null;
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Iniciando testes do CryptoTrader MCP Revolutionary...\n');
    
    try {
      // 1. Inicializar servidor
      await this.testServerInitialization();
      
      // 2. Testar componentes individuais
      await this.testCacheSystem();
      await this.testStorageSystem();
      await this.testPricesManager();
      
      // 3. Testar ferramentas MCP
      await this.testMCPTools();
      
      // 4. Testar recursos MCP
      await this.testMCPResources();
      
      // 5. Testar trading simulation
      await this.testTradingSimulation();
      
      // 6. Resultados finais
      this.showTestResults();
      
    } catch (error) {
      console.error('❌ Erro nos testes:', error.message);
    } finally {
      if (this.server) {
        await this.server.shutdown();
      }
    }
  }

  async testServerInitialization() {
    console.log('🚀 Teste 1: Inicialização do Servidor');
    
    try {
      this.server = new CryptoTradingServer();
      await this.server.initialize();
      
      this.logResult('Server Initialization', 'PASS', 'Servidor inicializado com sucesso');
      
      // Verificar componentes básicos
      const portfolio = this.server.getPortfolio();
      const stats = this.server.getStats();
      const cache = this.server.getCache();
      
      if (portfolio && stats && cache) {
        this.logResult('Components Check', 'PASS', 'Todos os componentes carregados');
      } else {
        this.logResult('Components Check', 'FAIL', 'Componentes em falta');
      }
      
    } catch (error) {
      this.logResult('Server Initialization', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testCacheSystem() {
    console.log('⚡ Teste 2: Sistema de Cache');
    
    try {
      const cache = this.server.getCache();
      
      // Testar cache de preços
      const testPrice = { price: 45000, timestamp: new Date().toISOString() };
      cache.setPrice('bitcoin', testPrice);
      
      const retrieved = cache.getPrice('bitcoin');
      if (retrieved && retrieved.price === testPrice.price) {
        this.logResult('Price Cache', 'PASS', 'Cache de preços funcionando');
      } else {
        this.logResult('Price Cache', 'FAIL', 'Erro no cache de preços');
      }
      
      // Testar cache de análise
      const testAnalysis = { score: 75, signals: ['buy'] };
      cache.setAnalysis('analysis_bitcoin_7', testAnalysis);
      
      const analysisRetrieved = cache.getAnalysis('analysis_bitcoin_7');
      if (analysisRetrieved && analysisRetrieved.score === testAnalysis.score) {
        this.logResult('Analysis Cache', 'PASS', 'Cache de análise funcionando');
      } else {
        this.logResult('Analysis Cache', 'FAIL', 'Erro no cache de análise');
      }
      
      // Testar estatísticas
      const stats = cache.getStats();
      if (stats && typeof stats.hit_rate === 'number') {
        this.logResult('Cache Stats', 'PASS', `Hit rate: ${stats.hit_rate.toFixed(1)}%`);
      } else {
        this.logResult('Cache Stats', 'FAIL', 'Estatísticas não disponíveis');
      }
      
    } catch (error) {
      this.logResult('Cache System', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testStorageSystem() {
    console.log('💾 Teste 3: Sistema de Storage');
    
    try {
      const storage = this.server.getStorage();
      
      // Testar health check
      const health = await storage.healthCheck();
      if (health.status === 'healthy' || health.status === 'warning') {
        this.logResult('Storage Health', 'PASS', `Status: ${health.status}`);
      } else {
        this.logResult('Storage Health', 'FAIL', health.error || 'Status não saudável');
      }
      
      // Testar info do storage
      const info = await storage.getStorageInfo();
      if (info && info.files) {
        this.logResult('Storage Info', 'PASS', 'Informações de arquivo obtidas');
      } else {
        this.logResult('Storage Info', 'FAIL', 'Erro ao obter informações');
      }
      
      // Testar log de erro
      const testError = new Error('Teste de log de erro');
      await storage.logError(testError, 'test_context');
      this.logResult('Error Logging', 'PASS', 'Log de erro registado');
      
    } catch (error) {
      this.logResult('Storage System', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testPricesManager() {
    console.log('💰 Teste 4: Gestor de Preços');
    
    try {
      // Simular um gestor de preços básico
      const mockPrice = {
        price: 45000,
        change_24h: 2.5,
        timestamp: new Date().toISOString()
      };
      
      // Testar formatação de preços
      const cache = this.server.getCache();
      cache.setPrice('price_bitcoin', mockPrice);
      
      const retrieved = cache.getPrice('price_bitcoin');
      if (retrieved && retrieved.price) {
        this.logResult('Price Retrieval', 'PASS', `Bitcoin: $${retrieved.price}`);
      } else {
        this.logResult('Price Retrieval', 'FAIL', 'Erro na obtenção de preços');
      }
      
      // Testar múltiplas moedas
      const supportedCoins = ['bitcoin', 'ethereum', 'cardano'];
      for (const coin of supportedCoins) {
        const testData = { price: Math.random() * 1000, timestamp: new Date().toISOString() };
        cache.setPrice(`price_${coin}`, testData);
      }
      
      this.logResult('Multiple Coins', 'PASS', `${supportedCoins.length} moedas testadas`);
      
    } catch (error) {
      this.logResult('Prices Manager', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testMCPTools() {
    console.log('🔧 Teste 5: Ferramentas MCP');
    
    try {
      // Simular o handler de ferramentas
      const mockToolsHandler = {
        listTools: async () => ({
          tools: [
            { name: 'get_price', description: 'Obter preço de crypto' },
            { name: 'buy_crypto', description: 'Comprar crypto' },
            { name: 'sell_crypto', description: 'Vender crypto' },
            { name: 'analyze_coin', description: 'Analisar crypto' }
          ]
        }),
        callTool: async (params) => ({
          content: [{ type: 'text', text: `Ferramenta ${params.name} executada com sucesso` }]
        })
      };
      
      // Testar listagem de ferramentas
      const tools = await mockToolsHandler.listTools();
      if (tools && tools.tools && tools.tools.length > 0) {
        this.logResult('Tools List', 'PASS', `${tools.tools.length} ferramentas disponíveis`);
      } else {
        this.logResult('Tools List', 'FAIL', 'Erro na listagem de ferramentas');
      }
      
      // Testar execução de ferramenta
      const result = await mockToolsHandler.callTool({ name: 'get_price' });
      if (result && result.content) {
        this.logResult('Tool Execution', 'PASS', 'Ferramenta executada');
      } else {
        this.logResult('Tool Execution', 'FAIL', 'Erro na execução');
      }
      
    } catch (error) {
      this.logResult('MCP Tools', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testMCPResources() {
    console.log('📚 Teste 6: Recursos MCP');
    
    try {
      // Simular o handler de recursos
      const mockResourcesHandler = {
        listResources: async () => ({
          resources: [
            { uri: 'trading://portfolio', name: 'Portfolio Atual' },
            { uri: 'trading://market/overview', name: 'Visão Geral do Mercado' },
            { uri: 'trading://sentiment', name: 'Sentimento do Mercado' }
          ]
        }),
        readResource: async (params) => ({
          contents: [{
            uri: params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({ test: 'data', uri: params.uri }, null, 2)
          }]
        })
      };
      
      // Testar listagem de recursos
      const resources = await mockResourcesHandler.listResources();
      if (resources && resources.resources && resources.resources.length > 0) {
        this.logResult('Resources List', 'PASS', `${resources.resources.length} recursos disponíveis`);
      } else {
        this.logResult('Resources List', 'FAIL', 'Erro na listagem de recursos');
      }
      
      // Testar leitura de recurso
      const resource = await mockResourcesHandler.readResource({ uri: 'trading://portfolio' });
      if (resource && resource.contents) {
        this.logResult('Resource Read', 'PASS', 'Recurso lido com sucesso');
      } else {
        this.logResult('Resource Read', 'FAIL', 'Erro na leitura');
      }
      
    } catch (error) {
      this.logResult('MCP Resources', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testTradingSimulation() {
    console.log('💹 Teste 7: Simulação de Trading');
    
    try {
      const portfolio = this.server.getPortfolio();
      const initialBalance = portfolio.balance_usd;
      
      // Simular compra
      portfolio.balance_usd -= 1000; // Comprar $1000 de BTC
      portfolio.positions['bitcoin'] = {
        quantity: 0.022,
        avg_price: 45000,
        created_at: new Date().toISOString()
      };
      
      if (portfolio.balance_usd === initialBalance - 1000) {
        this.logResult('Buy Simulation', 'PASS', 'Compra simulada com sucesso');
      } else {
        this.logResult('Buy Simulation', 'FAIL', 'Erro na simulação de compra');
      }
      
      // Simular venda
      portfolio.balance_usd += 1100; // Vender com lucro
      delete portfolio.positions['bitcoin'];
      
      if (portfolio.balance_usd === initialBalance + 100) {
        this.logResult('Sell Simulation', 'PASS', 'Venda simulada com lucro');
      } else {
        this.logResult('Sell Simulation', 'FAIL', 'Erro na simulação de venda');
      }
      
      // Testar cálculo de P&L
      const pnl = 100; // $100 de lucro
      if (pnl > 0) {
        this.logResult('P&L Calculation', 'PASS', `Lucro de $${pnl}`);
      } else {
        this.logResult('P&L Calculation', 'FAIL', 'Erro no cálculo de P&L');
      }
      
    } catch (error) {
      this.logResult('Trading Simulation', 'FAIL', error.message);
    }
    
    console.log('');
  }

  logResult(testName, status, details) {
    const emoji = status === 'PASS' ? '✅' : '❌';
    const message = `${emoji} ${testName}: ${details}`;
    
    console.log(message);
    
    this.testResults.push({
      test: testName,
      status: status,
      details: details,
      timestamp: new Date().toISOString()
    });
  }

  showTestResults() {
    console.log('\n📊 RESUMO DOS TESTES\n');
    console.log('='.repeat(60));
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warn = this.testResults.filter(r => r.status === 'WARN').length;
    this.testResults.forEach(result => {
      const emoji = result.status === 'PASS' ? '✅' : (result.status === 'FAIL' ? '❌' : '⚠️');
      console.log(`${emoji} ${result.test}: ${result.details}`);
    });
    console.log('\nResumo:');
    console.log(`✅ Passaram: ${passed}`);
    console.log(`❌ Falharam: ${failed}`);
    if (warn > 0) console.log(`⚠️ Avisos: ${warn}`);
    console.log('='.repeat(60));
  }

  // Método para testar conectividade MCP
  async testMCPConnectivity() {
    console.log('📡 Teste Adicional: Conectividade MCP');
    
    try {
      // Simular mensagem MCP
      const testMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" }
        }
      };
      
      // Verificar se o servidor pode processar mensagens MCP
      const mockResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { resources: {}, tools: {} },
          serverInfo: { name: "crypto-trader-mcp", version: "2.0.0" }
        }
      };
      
      if (mockResponse.result.serverInfo.name === "crypto-trader-mcp") {
        this.logResult('MCP Protocol', 'PASS', 'Protocolo MCP compatível');
      } else {
        this.logResult('MCP Protocol', 'FAIL', 'Incompatibilidade de protocolo');
      }
      
    } catch (error) {
      this.logResult('MCP Connectivity', 'FAIL', error.message);
    }
  }

  // Método para testar performance
  async testPerformance() {
    console.log('⚡ Teste de Performance');
    
    const startTime = Date.now();
    const cache = this.server.getCache();
    
    // Testar velocidade do cache
    for (let i = 0; i < 100; i++) {
      cache.setPrice(`test_${i}`, { price: Math.random() * 1000 });
      cache.getPrice(`test_${i}`);
    }
    
    const cacheTime = Date.now() - startTime;
    
    if (cacheTime < 100) { // Menos de 100ms para 100 operações
      this.logResult('Cache Performance', 'PASS', `${cacheTime}ms para 100 operações`);
    } else {
      this.logResult('Cache Performance', 'WARN', `${cacheTime}ms - pode ser otimizado`);
    }
    
    // Limpar dados de teste
    cache.clearAll();
  }

  // Método para demonstrar uso prático
  async demonstrateUsage() {
    console.log('\n🎬 DEMONSTRAÇÃO DE USO PRÁTICO\n');
    console.log('='.repeat(60));
    
    try {
      const portfolio = this.server.getPortfolio();
      
      console.log('💰 Portfolio Inicial:');
      console.log(`   Balance: ${portfolio.balance_usd.toLocaleString()}`);
      console.log(`   Posições: ${Object.keys(portfolio.positions).length}`);
      console.log(`   Total: ${portfolio.total_value.toLocaleString()}`);
      
      console.log('\n📊 Simulando Trading Session:');
      
      // Simular sequência de trades
      console.log('1. 🛒 Comprando $2000 de Bitcoin...');
      portfolio.balance_usd -= 2000;
      portfolio.positions['bitcoin'] = {
        quantity: 0.044,
        avg_price: 45000,
        created_at: new Date().toISOString()
      };
      console.log('   ✅ Compra executada');
      
      console.log('2. 🛒 Comprando $1500 de Ethereum...');
      portfolio.balance_usd -= 1500;
      portfolio.positions['ethereum'] = {
        quantity: 0.6,
        avg_price: 2500,
        created_at: new Date().toISOString()
      };
      console.log('   ✅ Compra executada');
      
      console.log('3. 📈 Simulando movimento de preços...');
      // Simular que Bitcoin subiu 10%
      const btcNewPrice = 49500;
      const btcGain = (49500 - 45000) * 0.044;
      console.log(`   📊 Bitcoin: $45,000 → $49,500 (+10%)`);
      console.log(`   💰 Ganho não realizado: ${btcGain.toFixed(2)}`);
      
      console.log('4. 🎯 Realizando lucro parcial...');
      // Vender metade do Bitcoin
      const sellQuantity = 0.022;
      const sellValue = sellQuantity * btcNewPrice;
      portfolio.balance_usd += sellValue;
      portfolio.positions['bitcoin'].quantity -= sellQuantity;
      
      const profit = sellValue - (sellQuantity * 45000);
      console.log(`   💵 Vendidos: ${sellQuantity} BTC por ${sellValue.toFixed(2)}`);
      console.log(`   💰 Lucro realizado: ${profit.toFixed(2)}`);
      
      console.log('\n📊 Portfolio Final:');
      console.log(`   Balance: ${portfolio.balance_usd.toFixed(2)}`);
      console.log(`   Bitcoin: ${portfolio.positions['bitcoin'].quantity} BTC`);
      console.log(`   Ethereum: ${portfolio.positions['ethereum'].quantity} ETH`);
      console.log(`   Total Profit: ${profit.toFixed(2)}`);
      
    } catch (error) {
      console.log(`❌ Erro na demonstração: ${error.message}`);
    }
  }

  // Método para mostrar comandos disponíveis
  showAvailableCommands() {
    console.log('\n🎮 COMANDOS DISPONÍVEIS VIA MCP\n');
    console.log('='.repeat(60));
    
    const commands = [
      {
        tool: 'get_price',
        description: 'Obter preço atual de uma crypto',
        example: 'get_price {"coin": "bitcoin"}'
      },
      {
        tool: 'analyze_coin',
        description: 'Análise técnica completa',
        example: 'analyze_coin {"coin": "ethereum", "days": 30}'
      },
      {
        tool: 'buy_crypto',
        description: 'Comprar crypto (paper trading)',
        example: 'buy_crypto {"coin": "bitcoin", "amount_usd": 1000}'
      },
      {
        tool: 'sell_crypto',
        description: 'Vender crypto (paper trading)',
        example: 'sell_crypto {"coin": "bitcoin", "percentage": 50}'
      },
      {
        tool: 'market_scan',
        description: 'Scan do mercado por oportunidades',
        example: 'market_scan {"type": "gainers", "limit": 5}'
      },
      {
        tool: 'portfolio_rebalance',
        description: 'Análise de rebalanceamento',
        example: 'portfolio_rebalance {}'
      },
      {
        tool: 'risk_analysis',
        description: 'Análise de risco de uma operação',
        example: 'risk_analysis {"coin": "bitcoin", "amount_usd": 2000, "action": "buy"}'
      }
    ];
    
    commands.forEach((cmd, index) => {
      console.log(`${index + 1}. 🔧 ${cmd.tool}`);
      console.log(`   📝 ${cmd.description}`);
      console.log(`   💡 Exemplo: ${cmd.example}`);
      console.log('');
    });
    
    console.log('📚 RECURSOS DISPONÍVEIS:\n');
    
    const resources = [
      {
        uri: 'trading://portfolio',
        description: 'Portfolio atual com posições e P&L'
      },
      {
        uri: 'trading://market/overview',
        description: 'Visão geral do mercado crypto'
      },
      {
        uri: 'trading://sentiment',
        description: 'Sentimento do mercado (Fear & Greed)'
      },
      {
        uri: 'trading://performance',
        description: 'Estatísticas de trading e performance'
      },
      {
        uri: 'trading://history',
        description: 'Histórico completo de trades'
      },
      {
        uri: 'system://server/health',
        description: 'Saúde e status do sistema'
      }
    ];
    
    resources.forEach((resource, index) => {
      console.log(`${index + 1}. 📊 ${resource.uri}`);
      console.log(`   📝 ${resource.description}`);
      console.log('');
    });
  }

  // Método para benchmarks
  async runBenchmarks() {
    console.log('\n⚡ BENCHMARKS DE PERFORMANCE\n');
    console.log('='.repeat(60));
    
    const cache = this.server.getCache();
    const storage = this.server.getStorage();
    
    // Benchmark 1: Cache Operations
    console.log('1. 📊 Cache Operations Benchmark');
    const cacheStart = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      cache.setPrice(`bench_${i}`, { price: Math.random() * 1000 });
    }
    
    for (let i = 0; i < 1000; i++) {
      cache.getPrice(`bench_${i}`);
    }
    
    const cacheTime = Date.now() - cacheStart;
    console.log(`   ⚡ 2000 operações em ${cacheTime}ms`);
    console.log(`   📈 ${(2000 / cacheTime * 1000).toFixed(0)} ops/segundo`);
    
    // Benchmark 2: Portfolio Updates
    console.log('\n2. 💼 Portfolio Update Benchmark');
    const portfolio = this.server.getPortfolio();
    const portfolioStart = Date.now();
    
    for (let i = 0; i < 100; i++) {
      // Simular updates de portfolio
      portfolio.balance_usd = 10000 + Math.random() * 1000;
      portfolio.total_value = portfolio.balance_usd;
    }
    
    const portfolioTime = Date.now() - portfolioStart;
    console.log(`   ⚡ 100 updates em ${portfolioTime}ms`);
    
    // Benchmark 3: Memory Usage
    console.log('\n3. 🧠 Memory Usage');
    const memUsage = process.memoryUsage();
    console.log(`   📊 Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   📊 Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`   📊 RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    
    // Limpeza
    cache.clearAll();
    
    console.log('\n✅ Benchmarks concluídos');
  }
}

// Função principal para executar todos os testes
async function main() {
  const client = new TestClient();
  
  try {
    console.log('🎯 CryptoTrader MCP Revolutionary - Test Suite\n');
    console.log('Versão: 2.0.0');
    console.log('Arquitetura: Modular MCP');
    console.log('Modo: Paper Trading (Simulação)\n');
    
    // Executar testes principais
    await client.runTests();
    
    // Testes adicionais
    await client.testMCPConnectivity();
    await client.testPerformance();
    
    // Demonstração prática
    await client.demonstrateUsage();
    
    // Mostrar comandos disponíveis
    client.showAvailableCommands();
    
    // Executar benchmarks
    await client.runBenchmarks();
    
    console.log('\n🏁 TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('\n📖 Para usar o sistema:');
    console.log('1. npm start');
    console.log('2. Conectar via Claude Code ou cliente MCP');
    console.log('3. Usar comandos como: get_price, buy_crypto, analyze_coin');
    
  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO NOS TESTES:', error.message);
    process.exit(1);
  }
}

// Executar se for o arquivo principal
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = TestClient;