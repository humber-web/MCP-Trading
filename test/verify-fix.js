// Verify the healthCheck fix works exactly as the original test expected
const CryptoTradingServer = require('../src/server');

async function verifyStorageHealthCheckFix() {
  console.log('🔍 VERIFYING STORAGE HEALTH CHECK FIX\n');
  
  let server = null;
  try {
    // Initialize server just like the original test
    server = new CryptoTradingServer();
    await server.initialize();
    
    console.log('✅ Server initialized successfully');
    
    // Get storage exactly like the original test
    const storage = server.getStorage();
    console.log('✅ Storage reference obtained');
    
    // Test the healthCheck method that was failing
    if (typeof storage.healthCheck !== 'function') {
      console.log('❌ FAIL: healthCheck method still missing');
      return false;
    }
    
    console.log('✅ healthCheck method exists');
    
    // Execute the health check
    const health = await storage.healthCheck();
    console.log('✅ healthCheck executed successfully');
    
    // Verify response format
    if (!health || !health.status) {
      console.log('❌ FAIL: Invalid health check response');
      return false;
    }
    
    console.log(`✅ Health status: ${health.status}`);
    
    // Test exactly what the original test was checking
    if (health.status === 'healthy' || health.status === 'warning') {
      console.log('✅ PASS: Health check returns acceptable status');
      
      // Show detailed results like original test expected
      console.log(`   📊 Status: ${health.status}`);
      console.log(`   🏗️ Initialized: ${health.initialized}`);
      console.log(`   📁 Data Path: ${health.data_path}`);
      console.log(`   📄 Portfolio Status: ${health.portfolio_status}`);
      if (health.warnings) {
        console.log(`   ⚠️ Warnings: ${health.warnings.join(', ')}`);
      }
      
      console.log('\n🎉 STORAGE HEALTH CHECK FIX VERIFIED SUCCESSFULLY!');
      console.log('✅ The failing test should now pass');
      return true;
      
    } else {
      console.log(`❌ FAIL: Unexpected health status: ${health.status}`);
      if (health.error) {
        console.log(`   Error details: ${health.error}`);
      }
      return false;
    }
    
  } catch (error) {
    console.log('❌ FAIL: Error during verification:', error.message);
    return false;
    
  } finally {
    if (server) {
      await server.shutdown();
      console.log('🔄 Server shutdown completed');
    }
  }
}

// Run verification
if (require.main === module) {
  verifyStorageHealthCheckFix().then(success => {
    if (success) {
      console.log('\n✅ VERIFICATION SUCCESSFUL - Fix is working!');
      process.exit(0);
    } else {
      console.log('\n❌ VERIFICATION FAILED - Fix needs more work');
      process.exit(1);
    }
  }).catch(error => {
    console.error('💥 Verification error:', error);
    process.exit(1);
  });
}

module.exports = { verifyStorageHealthCheckFix };