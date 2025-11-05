// src/exchange/binance-exchange.js

const ExchangeInterface = require('./exchange-interface');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Binance Exchange Implementation
 * Supports both testnet (paper trading) and mainnet (live trading)
 */
class BinanceExchange extends ExchangeInterface {
  constructor(config = {}) {
    super(config);
    this.name = 'Binance';
    this.apiKey = config.apiKey || process.env.BINANCE_API_KEY || null;
    this.apiSecret = config.apiSecret || process.env.BINANCE_API_SECRET || null;

    // Use testnet for PAPER mode, mainnet for LIVE mode
    this.baseUrl = this.isPaperMode()
      ? 'https://testnet.binance.vision'  // Testnet (paper trading)
      : 'https://api.binance.com';         // Mainnet (real money)

    // Symbol mapping: coin name -> Binance symbol
    this.symbolMap = {
      'bitcoin': 'BTCUSDT',
      'ethereum': 'ETHUSDT',
      'cardano': 'ADAUSDT',
      'polkadot': 'DOTUSDT',
      'chainlink': 'LINKUSDT',
      'solana': 'SOLUSDT',
      'polygon': 'MATICUSDT',
      'avalanche-2': 'AVAXUSDT',
      'uniswap': 'UNIUSDT',
      'aave': 'AAVEUSDT'
    };

    // Reverse mapping
    this.coinMap = Object.fromEntries(
      Object.entries(this.symbolMap).map(([k, v]) => [v, k])
    );
  }

  async initialize() {
    try {
      // Check if we're in PAPER mode without credentials (use public API only)
      if (this.isPaperMode() && (!this.apiKey || !this.apiSecret)) {
        console.log('⚠️  Binance initialized in PAPER mode (public API only)');
        this.isInitialized = true;
        return true;
      }

      // Validate credentials if provided
      if (this.apiKey && this.apiSecret) {
        const isValid = await this.validateCredentials();
        if (!isValid) {
          throw new Error('Invalid Binance API credentials');
        }
      }

      console.log(`✅ Binance initialized in ${this.mode} mode`);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Binance:', error.message);
      throw error;
    }
  }

  /**
   * Sign request for authenticated endpoints
   */
  _signRequest(params = {}) {
    if (!this.apiSecret) {
      throw new Error('API secret required for authenticated requests');
    }

    const timestamp = Date.now();
    const queryString = new URLSearchParams({
      ...params,
      timestamp
    }).toString();

    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');

    return `${queryString}&signature=${signature}`;
  }

  /**
   * Make authenticated API request
   */
  async _makeRequest(endpoint, method = 'GET', params = {}, requiresAuth = false) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {};

      if (requiresAuth) {
        if (!this.apiKey) {
          throw new Error('API key required for authenticated requests');
        }
        headers['X-MBX-APIKEY'] = this.apiKey;
      }

      let fullUrl = url;
      if (method === 'GET' && requiresAuth) {
        fullUrl = `${url}?${this._signRequest(params)}`;
      } else if (method === 'GET' && Object.keys(params).length > 0) {
        fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
      }

      const response = await axios({
        method,
        url: fullUrl,
        headers,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Binance API error: ${error.response.data.msg || error.response.statusText}`);
      }
      throw new Error(`Binance request failed: ${error.message}`);
    }
  }

  async validateCredentials() {
    try {
      // Try to get account info
      await this._makeRequest('/api/v3/account', 'GET', {}, true);
      return true;
    } catch (error) {
      console.error('Credential validation failed:', error.message);
      return false;
    }
  }

  async getCurrentPrice(symbol) {
    try {
      const binanceSymbol = this.coinToSymbol(symbol);
      const data = await this._makeRequest('/api/v3/ticker/price', 'GET', {
        symbol: binanceSymbol
      });

      return {
        price: parseFloat(data.price),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get price for ${symbol}: ${error.message}`);
    }
  }

  async getHistoricalPrices(symbol, days = 7) {
    try {
      const binanceSymbol = this.coinToSymbol(symbol);
      const interval = days <= 1 ? '1h' : '1d';
      const limit = days <= 1 ? 24 : days;

      const data = await this._makeRequest('/api/v3/klines', 'GET', {
        symbol: binanceSymbol,
        interval,
        limit
      });

      return data.map(candle => ({
        timestamp: new Date(candle[0]).toISOString(),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (error) {
      throw new Error(`Failed to get historical prices: ${error.message}`);
    }
  }

  async executeBuyOrder(symbol, quantity, price = null, options = {}) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required for trading');
    }

    try {
      const binanceSymbol = this.coinToSymbol(symbol);
      const params = {
        symbol: binanceSymbol,
        side: 'BUY',
        type: price ? 'LIMIT' : 'MARKET',
        quantity: quantity.toFixed(8)
      };

      if (price) {
        params.price = price.toFixed(8);
        params.timeInForce = 'GTC'; // Good Till Cancelled
      }

      const result = await this._makeRequest('/api/v3/order', 'POST', params, true);

      return {
        orderId: result.orderId.toString(),
        status: result.status,
        executedQty: parseFloat(result.executedQty),
        executedPrice: parseFloat(result.fills?.[0]?.price || result.price || 0),
        timestamp: new Date(result.transactTime).toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to execute buy order: ${error.message}`);
    }
  }

  async executeSellOrder(symbol, quantity, price = null, options = {}) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required for trading');
    }

    try {
      const binanceSymbol = this.coinToSymbol(symbol);
      const params = {
        symbol: binanceSymbol,
        side: 'SELL',
        type: price ? 'LIMIT' : 'MARKET',
        quantity: quantity.toFixed(8)
      };

      if (price) {
        params.price = price.toFixed(8);
        params.timeInForce = 'GTC';
      }

      const result = await this._makeRequest('/api/v3/order', 'POST', params, true);

      return {
        orderId: result.orderId.toString(),
        status: result.status,
        executedQty: parseFloat(result.executedQty),
        executedPrice: parseFloat(result.fills?.[0]?.price || result.price || 0),
        timestamp: new Date(result.transactTime).toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to execute sell order: ${error.message}`);
    }
  }

  async getBalance() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required to get balance');
    }

    try {
      const account = await this._makeRequest('/api/v3/account', 'GET', {}, true);

      // Get USDT balance
      const usdtBalance = account.balances.find(b => b.asset === 'USDT') || {
        free: '0',
        locked: '0'
      };

      return {
        available: parseFloat(usdtBalance.free),
        locked: parseFloat(usdtBalance.locked),
        total: parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked)
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async getOpenPositions() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required to get positions');
    }

    try {
      const account = await this._makeRequest('/api/v3/account', 'GET', {}, true);

      // Filter out zero balances and USDT
      const positions = account.balances
        .filter(b => parseFloat(b.free) > 0 && b.asset !== 'USDT')
        .map(balance => ({
          symbol: `${balance.asset}USDT`,
          coin: this.symbolToCoin(`${balance.asset}USDT`),
          quantity: parseFloat(balance.free),
          locked: parseFloat(balance.locked)
        }));

      return positions;
    } catch (error) {
      throw new Error(`Failed to get open positions: ${error.message}`);
    }
  }

  async getOrderStatus(orderId) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required to get order status');
    }

    try {
      // Note: Need symbol to query order - this is a limitation
      // In practice, we'd store order metadata locally
      throw new Error('getOrderStatus requires symbol - use local order tracking instead');
    } catch (error) {
      throw new Error(`Failed to get order status: ${error.message}`);
    }
  }

  async cancelOrder(orderId, symbol) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required to cancel orders');
    }

    try {
      const binanceSymbol = this.coinToSymbol(symbol);
      const result = await this._makeRequest('/api/v3/order', 'DELETE', {
        symbol: binanceSymbol,
        orderId: parseInt(orderId)
      }, true);

      return result.status === 'CANCELED';
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  coinToSymbol(coin) {
    // If already a symbol (e.g., 'BTCUSDT'), return as-is
    if (coin.endsWith('USDT')) {
      return coin;
    }

    const symbol = this.symbolMap[coin.toLowerCase()];
    if (!symbol) {
      throw new Error(`Unsupported coin: ${coin}`);
    }
    return symbol;
  }

  symbolToCoin(symbol) {
    const coin = this.coinMap[symbol];
    if (!coin) {
      // Try to convert back from symbol (e.g., 'BTCUSDT' -> 'bitcoin')
      const base = symbol.replace('USDT', '').toLowerCase();
      return base;
    }
    return coin;
  }

  /**
   * Get Binance server time
   */
  async getServerTime() {
    const data = await this._makeRequest('/api/v3/time', 'GET');
    return new Date(data.serverTime);
  }

  /**
   * Get exchange info (trading rules, supported symbols, etc.)
   */
  async getExchangeInfo() {
    return await this._makeRequest('/api/v3/exchangeInfo', 'GET');
  }
}

module.exports = BinanceExchange;
