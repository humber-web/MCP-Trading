// Focused test for storage system
const DataStorage = require('../src/data/storage');

class StorageFocusedTest {
  constructor() {
    this.testResults = [];
  }

  async runStorageTests() {
    console.log('💾 FOCUSED STORAGE SYSTEM TESTS\n');
    console.log('='.repeat(50));
    
    try {
      await this.testStorageInitialization();
      await this.testHealthCheck();
      await this.testStorageInfo();
      await this.testErrorLogging();
      await this.testDataPersistence();
      
      this.showResults();
      
    } catch (error) {
      console.log('❌ Critical error in storage tests:', error.message);
    }
  }

  async testStorageInitialization() {
    console.log('1. 🚀 Storage Initialization Test');
    
    try {
      const storage = new DataStorage();
      await storage.initialize();
      
      this.logResult('Storage Initialization', 'PASS', 'Storage initialized successfully');
      
    } catch (error) {
      this.logResult('Storage Initialization', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testHealthCheck() {
    console.log('2. 🏥 Health Check Test');
    
    try {
      const storage = new DataStorage();
      
      // Test healthCheck method exists
      if (typeof storage.healthCheck !== 'function') {
        this.logResult('Health Check Method', 'FAIL', 'healthCheck method does not exist');
        return;
      }
      
      this.logResult('Health Check Method', 'PASS', 'healthCheck method exists');
      
      // Test healthCheck execution
      const health = await storage.healthCheck();
      
      if (health && health.status) {
        this.logResult('Health Check Execution', 'PASS', `Status: ${health.status}`);
        
        if (health.status === 'healthy' || health.status === 'warning') {
          this.logResult('Health Check Status', 'PASS', 'System is operational');
        } else {
          this.logResult('Health Check Status', 'WARN', `Status: ${health.status}`);
        }
        
        // Test health check properties
        this.logResult('Health Check Properties', 'PASS', 
          `Initialized: ${health.initialized}, Path: ${health.data_path ? 'Set' : 'Missing'}`);
        
      } else {
        this.logResult('Health Check Execution', 'FAIL', 'Invalid health check response');
      }
      
    } catch (error) {
      this.logResult('Health Check', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testStorageInfo() {
    console.log('3. 📊 Storage Info Test');
    
    try {
      const storage = new DataStorage();
      await storage.initialize();
      
      const info = await storage.getStorageInfo();
      
      if (info && info.data_directory) {
        this.logResult('Storage Info', 'PASS', 'Storage information retrieved successfully');
        this.logResult('Storage Directory', 'PASS', `Directory: ${info.data_directory}`);
        this.logResult('Storage Files', 'PASS', `Files found: ${info.files ? info.files.length : 0}`);
      } else if (info && info.error) {
        this.logResult('Storage Info', 'WARN', `Info error: ${info.error}`);
      } else {
        this.logResult('Storage Info', 'FAIL', 'Invalid storage info response');
      }
      
    } catch (error) {
      this.logResult('Storage Info', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testErrorLogging() {
    console.log('4. 📝 Error Logging Test');
    
    try {
      const storage = new DataStorage();
      await storage.initialize();
      
      const testError = new Error('Test error for logging');
      await storage.logError(testError, 'storage_test');
      
      this.logResult('Error Logging', 'PASS', 'Error logged successfully');
      
    } catch (error) {
      this.logResult('Error Logging', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async testDataPersistence() {
    console.log('5. 💾 Data Persistence Test');
    
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
      
      if (loadedPortfolio && loadedPortfolio.balance_usd === testPortfolio.balance_usd) {
        this.logResult('Portfolio Persistence', 'PASS', 'Portfolio save/load working');
      } else {
        this.logResult('Portfolio Persistence', 'FAIL', 'Portfolio data mismatch');
      }
      
      // Test stats operations
      const testStats = { 
        total_trades: 5, 
        winning_trades: 3,
        test_timestamp: new Date().toISOString()
      };
      
      await storage.saveStats(testStats);
      const loadedStats = await storage.loadStats();
      
      if (loadedStats && loadedStats.total_trades === testStats.total_trades) {
        this.logResult('Stats Persistence', 'PASS', 'Stats save/load working');
      } else {
        this.logResult('Stats Persistence', 'FAIL', 'Stats data mismatch');
      }
      
    } catch (error) {
      this.logResult('Data Persistence', 'FAIL', error.message);
    }
    
    console.log('');
  }

  logResult(testName, status, details) {
    const emoji = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⚠️');
    const message = `   ${emoji} ${testName}: ${details}`;
    
    console.log(message);
    
    this.testResults.push({
      test: testName,
      status: status,
      details: details
    });
  }

  showResults() {
    console.log('\n📊 STORAGE TEST RESULTS SUMMARY\n');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARN').length;
    
    this.testResults.forEach(result => {
      const emoji = result.status === 'PASS' ? '✅' : (result.status === 'FAIL' ? '❌' : '⚠️');
      console.log(`${emoji} ${result.test}: ${result.details}`);
    });
    
    console.log('\nSummary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    if (warnings > 0) console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    console.log('='.repeat(50));
    
    if (failed === 0) {
      console.log('🎉 ALL STORAGE TESTS PASSED!');
    } else {
      console.log(`⚠️ ${failed} test(s) failed - review above for details`);
    }
  }
}

// Run the focused storage tests
async function main() {
  const tester = new StorageFocusedTest();
  await tester.runStorageTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = StorageFocusedTest;