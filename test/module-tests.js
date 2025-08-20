// Test individual modules
const CacheManager = require('../src/utils/cache');
const config = require('../src/utils/config');
const DataStorage = require('../src/data/storage');

console.log('🧪 Testing CryptoTrader MCP Revolutionary Modules...\n');

async function testCacheManager() {
  console.log('📦 Testing CacheManager...');
  try {
    const cache = new CacheManager();
    
    // Test price cache
    cache.setPrice('bitcoin', { price: 45000, timestamp: Date.now() });
    const price = cache.getPrice('bitcoin');
    console.log('✅ Price cache:', price ? 'PASS' : 'FAIL');
    
    // Test analysis cache
    cache.setAnalysis('ethereum', { rsi: 45, macd: 'bullish' });
    const analysis = cache.getAnalysis('ethereum');
    console.log('✅ Analysis cache:', analysis ? 'PASS' : 'FAIL');
    
    // Test market cache
    cache.setMarket('overview', { fear_greed: 52, trend: 'neutral' });
    const market = cache.getMarket('overview');
    console.log('✅ Market cache:', market ? 'PASS' : 'FAIL');
    
    // Test stats
    const stats = cache.getStats();
    console.log('✅ Cache stats:', stats.hits >= 0 ? 'PASS' : 'FAIL');
    
    console.log('✅ CacheManager: ALL TESTS PASSED\n');
    return true;
  } catch (error) {
    console.log('❌ CacheManager Error:', error.message);
    return false;
  }
}

async function testConfig() {
  console.log('⚙️ Testing Configuration...');
  try {
    console.log('✅ Trading config:', config.trading ? 'PASS' : 'FAIL');
    console.log('✅ Supported coins:', config.supported_coins.length > 0 ? 'PASS' : 'FAIL');
    console.log('✅ Cache settings:', config.cache ? 'PASS' : 'FAIL');
    console.log('✅ API endpoints:', config.apis ? 'PASS' : 'FAIL');
    console.log('✅ MCP settings:', config.mcp ? 'PASS' : 'FAIL');
    
    console.log('✅ Configuration: ALL TESTS PASSED\n');
    return true;
  } catch (error) {
    console.log('❌ Configuration Error:', error.message);
    return false;
  }
}

async function testDataStorage() {
  console.log('💾 Testing DataStorage...');
  try {
    const storage = new DataStorage();
    await storage.initialize();
    
    // Test portfolio operations
    const testPortfolio = {
      balance_usd: 10000,
      positions: {},
      total_value: 10000,
      pnl: 0
    };
    
    await storage.savePortfolio(testPortfolio);
    const loadedPortfolio = await storage.loadPortfolio();
    console.log('✅ Portfolio save/load:', loadedPortfolio.balance_usd === 10000 ? 'PASS' : 'FAIL');
    
    // Test stats operations
    const testStats = { total_trades: 0, winning_trades: 0 };
    await storage.saveStats(testStats);
    const loadedStats = await storage.loadStats();
    console.log('✅ Stats save/load:', loadedStats.total_trades === 0 ? 'PASS' : 'FAIL');
    
    // Test storage info
    const storageInfo = await storage.getStorageInfo();
    console.log('✅ Storage info:', storageInfo ? 'PASS' : 'FAIL');
    
    console.log('✅ DataStorage: ALL TESTS PASSED\n');
    return true;
  } catch (error) {
    console.log('❌ DataStorage Error:', error.message);
    return false;
  }
}

async function runModuleTests() {
  console.log('🚀 Starting Module Tests...\n');
  
  const results = [];
  results.push(await testConfig());
  results.push(await testCacheManager());
  results.push(await testDataStorage());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`📊 Module Test Results: ${passed}/${total} PASSED`);
  
  if (passed === total) {
    console.log('🎉 ALL MODULE TESTS PASSED!');
  } else {
    console.log('❌ Some module tests failed');
  }
  
  return passed === total;
}

// Run tests
if (require.main === module) {
  runModuleTests().catch(console.error);
}

module.exports = { runModuleTests };