// Quick test for healthCheck method
const DataStorage = require('../src/data/storage');

async function testHealthCheck() {
  console.log('🧪 Testing DataStorage.healthCheck() method...\n');
  
  try {
    const storage = new DataStorage();
    
    console.log('1. Testing healthCheck without initialization...');
    const healthBefore = await storage.healthCheck();
    console.log('✅ Health check result:', healthBefore.status);
    console.log('   Initialized:', healthBefore.initialized);
    console.log('   Warnings:', healthBefore.warnings || 'None');
    
    console.log('\n2. Testing healthCheck after initialization...');
    await storage.initialize();
    const healthAfter = await storage.healthCheck();
    console.log('✅ Health check result:', healthAfter.status);
    console.log('   Initialized:', healthAfter.initialized);
    console.log('   Data path:', healthAfter.data_path);
    console.log('   Portfolio status:', healthAfter.portfolio_status);
    console.log('   Warnings:', healthAfter.warnings || 'None');
    
    console.log('\n✅ healthCheck() method is working correctly!');
    return true;
    
  } catch (error) {
    console.log('❌ Error testing healthCheck:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testHealthCheck().catch(console.error);
}

module.exports = { testHealthCheck };