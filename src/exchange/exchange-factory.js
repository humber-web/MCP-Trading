// src/exchange/exchange-factory.js

const PaperExchange = require('./paper-exchange');
const BinanceExchange = require('./binance-exchange');

/**
 * Exchange Factory
 * Creates and manages exchange instances based on configuration
 *
 * Usage:
 * - PAPER mode (default, safe): Uses CoinGecko + local simulation
 * - LIVE mode: Uses real exchange APIs (Binance, Coinbase, etc.)
 */
class ExchangeFactory {
  /**
   * Create an exchange instance
   * @param {object} config - Configuration
   * @param {string} config.mode - 'PAPER' or 'LIVE'
   * @param {string} config.exchange - Exchange name ('binance', 'coinbase', etc.)
   * @param {object} config.dependencies - Required dependencies (pricesManager, portfolio, etc.)
   * @returns {ExchangeInterface} Exchange instance
   */
  static create(config = {}) {
    const mode = (config.mode || process.env.TRADING_MODE || 'PAPER').toUpperCase();
    const exchangeName = (config.exchange || process.env.EXCHANGE_NAME || 'paper').toLowerCase();

    console.log(`\n🏦 Initializing exchange: ${exchangeName} in ${mode} mode`);

    // Safety check: Warn if using LIVE mode
    if (mode === 'LIVE') {
      console.warn('⚠️  WARNING: LIVE TRADING MODE ENABLED - REAL MONEY AT RISK!');
      console.warn('⚠️  Make sure you have set proper API keys and tested thoroughly!');

      // Check if we have a safety confirmation
      if (!process.env.CONFIRM_LIVE_TRADING) {
        throw new Error(
          'LIVE mode requires CONFIRM_LIVE_TRADING=true in environment variables.\n' +
          'This is a safety measure to prevent accidental live trading.\n' +
          'Add to .env: CONFIRM_LIVE_TRADING=true'
        );
      }
    }

    // Select exchange based on mode and name
    if (mode === 'PAPER') {
      // Paper trading always uses PaperExchange
      return new PaperExchange({
        mode: 'PAPER',
        ...config,
        pricesManager: config.dependencies?.pricesManager,
        portfolio: config.dependencies?.portfolio
      });
    }

    // LIVE mode - select real exchange
    switch (exchangeName) {
      case 'binance':
        return new BinanceExchange({
          mode: 'LIVE',
          apiKey: config.apiKey || process.env.BINANCE_API_KEY,
          apiSecret: config.apiSecret || process.env.BINANCE_API_SECRET,
          ...config
        });

      case 'coinbase':
        // TODO: Implement Coinbase exchange
        throw new Error('Coinbase exchange not yet implemented. Use "binance" instead.');

      case 'kraken':
        // TODO: Implement Kraken exchange
        throw new Error('Kraken exchange not yet implemented. Use "binance" instead.');

      default:
        throw new Error(
          `Unknown exchange: ${exchangeName}.\n` +
          `Supported exchanges: binance, coinbase, kraken\n` +
          `For paper trading, set TRADING_MODE=PAPER`
        );
    }
  }

  /**
   * Get supported exchanges list
   */
  static getSupportedExchanges() {
    return {
      paper: {
        name: 'Paper Trading',
        description: 'Simulated trading with no real money',
        requiresCredentials: false,
        supported: true
      },
      binance: {
        name: 'Binance',
        description: 'World\'s largest cryptocurrency exchange',
        requiresCredentials: true,
        supported: true,
        testnet: true
      },
      coinbase: {
        name: 'Coinbase Pro',
        description: 'Popular US-based exchange',
        requiresCredentials: true,
        supported: false, // TODO
        testnet: true
      },
      kraken: {
        name: 'Kraken',
        description: 'Reliable European exchange',
        requiresCredentials: true,
        supported: false, // TODO
        testnet: false
      }
    };
  }

  /**
   * Validate exchange configuration
   */
  static validateConfig(config = {}) {
    const errors = [];
    const mode = (config.mode || 'PAPER').toUpperCase();
    const exchangeName = (config.exchange || 'paper').toLowerCase();

    // Validate mode
    if (!['PAPER', 'LIVE'].includes(mode)) {
      errors.push(`Invalid mode: ${mode}. Must be 'PAPER' or 'LIVE'`);
    }

    // Validate exchange name
    const supported = this.getSupportedExchanges();
    if (!supported[exchangeName]) {
      errors.push(`Unknown exchange: ${exchangeName}`);
    } else if (!supported[exchangeName].supported) {
      errors.push(`Exchange not yet supported: ${exchangeName}`);
    }

    // Validate credentials for LIVE mode
    if (mode === 'LIVE' && exchangeName !== 'paper') {
      if (exchangeName === 'binance') {
        if (!config.apiKey && !process.env.BINANCE_API_KEY) {
          errors.push('Missing BINANCE_API_KEY for live trading');
        }
        if (!config.apiSecret && !process.env.BINANCE_API_SECRET) {
          errors.push('Missing BINANCE_API_SECRET for live trading');
        }
      }

      if (!process.env.CONFIRM_LIVE_TRADING) {
        errors.push('LIVE mode requires CONFIRM_LIVE_TRADING=true environment variable');
      }
    }

    // Validate dependencies for PAPER mode
    if (mode === 'PAPER') {
      if (!config.dependencies?.pricesManager) {
        errors.push('Paper mode requires pricesManager dependency');
      }
      if (!config.dependencies?.portfolio) {
        errors.push('Paper mode requires portfolio dependency');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      config: {
        mode,
        exchange: exchangeName,
        requiresCredentials: supported[exchangeName]?.requiresCredentials || false
      }
    };
  }

  /**
   * Get configuration from environment variables
   */
  static getConfigFromEnv() {
    return {
      mode: process.env.TRADING_MODE || 'PAPER',
      exchange: process.env.EXCHANGE_NAME || 'paper',
      apiKey: process.env.BINANCE_API_KEY || process.env.COINBASE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET || process.env.COINBASE_API_SECRET,
      confirmLiveTrading: process.env.CONFIRM_LIVE_TRADING === 'true'
    };
  }

  /**
   * Print exchange configuration info
   */
  static printConfig() {
    const config = this.getConfigFromEnv();
    const validation = this.validateConfig(config);

    console.log('\n📊 Exchange Configuration:');
    console.log(`   Mode: ${config.mode}`);
    console.log(`   Exchange: ${config.exchange}`);
    console.log(`   Has API Key: ${config.apiKey ? '✅ Yes' : '❌ No'}`);
    console.log(`   Live Trading Confirmed: ${config.confirmLiveTrading ? '✅ Yes' : '❌ No'}`);

    if (!validation.valid) {
      console.log('\n⚠️  Configuration Issues:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('   ✅ Configuration valid\n');
    }

    return validation;
  }
}

module.exports = ExchangeFactory;
