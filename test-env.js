#!/usr/bin/env node
// Simple script to test environment variable loading

console.log('\n🧪 Environment Variable Test Script');
console.log('====================================\n');

// Load dotenv
require('dotenv').config();

console.log('1️⃣  Testing dotenv loading...');
console.log(`   dotenv loaded: ✅\n`);

console.log('2️⃣  Checking COINGECKO_API_KEY:');
if (process.env.COINGECKO_API_KEY) {
  const key = process.env.COINGECKO_API_KEY;
  console.log(`   ✅ FOUND!`);
  console.log(`   Length: ${key.length} characters`);
  console.log(`   Preview: ${key.substring(0, 6)}...${key.substring(key.length - 4)}`);
  console.log(`   Starts with 'CG-': ${key.startsWith('CG-') ? '✅ Yes' : '❌ No'}`);
} else {
  console.log(`   ❌ NOT FOUND (undefined or null)`);
  console.log(`   Value: ${process.env.COINGECKO_API_KEY}`);
}

console.log('\n3️⃣  Listing all environment variables with "COIN", "GECKO", or "API":');
const relatedVars = Object.keys(process.env).filter(key =>
  key.includes('COIN') || key.includes('GECKO') || key.includes('API')
);

if (relatedVars.length > 0) {
  relatedVars.forEach(key => {
    const value = process.env[key];
    if (key.includes('KEY') || key.includes('SECRET')) {
      console.log(`   ${key}: ${value ? value.substring(0, 6) + '...' : '(empty)'}`);
    } else {
      console.log(`   ${key}: ${value}`);
    }
  });
} else {
  console.log(`   (none found)`);
}

console.log('\n4️⃣  Loading config module...');
try {
  const config = require('./src/utils/config');
  console.log(`   Config loaded: ✅`);
  console.log(`   config.apis.coingecko.api_key: ${config.apis.coingecko.api_key ? 'EXISTS ✅' : 'NULL/UNDEFINED ❌'}`);
  console.log(`   config.apis.coingecko.base_url: ${config.apis.coingecko.base_url}`);
} catch (error) {
  console.log(`   ❌ Error loading config: ${error.message}`);
}

console.log('\n5️⃣  Recommendation:');
if (process.env.COINGECKO_API_KEY) {
  console.log(`   ✅ Environment variable is set correctly!`);
  console.log(`   The bot should detect your API key on startup.`);
} else {
  console.log(`   ⚠️  Environment variable NOT detected.`);
  console.log(`\n   Possible solutions:`);
  console.log(`   1. On Render: Check dashboard Environment tab`);
  console.log(`      - Variable name must be exactly: COINGECKO_API_KEY`);
  console.log(`      - After adding, redeploy the service`);
  console.log(`   2. For local development: Create .env file with:`);
  console.log(`      COINGECKO_API_KEY=CG-your-key-here`);
  console.log(`   3. Check for typos in the variable name`);
}

console.log('\n====================================\n');
