// src/exchange/exchange-interface.js

/**
 * Base interface for all exchange implementations
 * Supports both paper trading and real exchanges (Binance, Coinbase, etc.)
 */
class ExchangeInterface {
  constructor(config = {}) {
    this.mode = config.mode || 'PAPER'; // PAPER or LIVE
    this.name = 'BaseExchange';
    this.isInitialized = false;
  }

  /**
   * Initialize the exchange connection
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Get current price for a coin
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT', 'bitcoin')
   * @returns {Promise<{price: number, timestamp: string}>}
   */
  async getCurrentPrice(symbol) {
    throw new Error('getCurrentPrice() must be implemented by subclass');
  }

  /**
   * Get historical price data
   * @param {string} symbol - Trading symbol
   * @param {number} days - Number of days of historical data
   * @returns {Promise<Array>} Array of price data points
   */
  async getHistoricalPrices(symbol, days = 7) {
    throw new Error('getHistoricalPrices() must be implemented by subclass');
  }

  /**
   * Execute a buy order
   * @param {string} symbol - Trading symbol
   * @param {number} quantity - Amount to buy
   * @param {number} price - Price per unit (null for market order)
   * @param {object} options - Additional options (stop_loss, take_profit, etc.)
   * @returns {Promise<{orderId: string, status: string, executedQty: number, executedPrice: number}>}
   */
  async executeBuyOrder(symbol, quantity, price = null, options = {}) {
    throw new Error('executeBuyOrder() must be implemented by subclass');
  }

  /**
   * Execute a sell order
   * @param {string} symbol - Trading symbol
   * @param {number} quantity - Amount to sell
   * @param {number} price - Price per unit (null for market order)
   * @param {object} options - Additional options
   * @returns {Promise<{orderId: string, status: string, executedQty: number, executedPrice: number}>}
   */
  async executeSellOrder(symbol, quantity, price = null, options = {}) {
    throw new Error('executeSellOrder() must be implemented by subclass');
  }

  /**
   * Get account balance
   * @returns {Promise<{available: number, locked: number, total: number}>}
   */
  async getBalance() {
    throw new Error('getBalance() must be implemented by subclass');
  }

  /**
   * Get current open positions
   * @returns {Promise<Array>} Array of open positions
   */
  async getOpenPositions() {
    throw new Error('getOpenPositions() must be implemented by subclass');
  }

  /**
   * Get order status
   * @param {string} orderId - Order ID
   * @returns {Promise<object>} Order status details
   */
  async getOrderStatus(orderId) {
    throw new Error('getOrderStatus() must be implemented by subclass');
  }

  /**
   * Cancel an open order
   * @param {string} orderId - Order ID to cancel
   * @returns {Promise<boolean>} Success status
   */
  async cancelOrder(orderId) {
    throw new Error('cancelOrder() must be implemented by subclass');
  }

  /**
   * Validate API credentials
   * @returns {Promise<boolean>} True if credentials are valid
   */
  async validateCredentials() {
    throw new Error('validateCredentials() must be implemented by subclass');
  }

  /**
   * Convert coin name to exchange symbol
   * @param {string} coin - Coin name (e.g., 'bitcoin')
   * @returns {string} Exchange symbol (e.g., 'BTCUSDT')
   */
  coinToSymbol(coin) {
    throw new Error('coinToSymbol() must be implemented by subclass');
  }

  /**
   * Convert exchange symbol to coin name
   * @param {string} symbol - Exchange symbol
   * @returns {string} Coin name
   */
  symbolToCoin(symbol) {
    throw new Error('symbolToCoin() must be implemented by subclass');
  }

  /**
   * Check if exchange is in paper trading mode
   * @returns {boolean}
   */
  isPaperMode() {
    return this.mode === 'PAPER';
  }

  /**
   * Check if exchange is in live trading mode
   * @returns {boolean}
   */
  isLiveMode() {
    return this.mode === 'LIVE';
  }

  /**
   * Get exchange name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Get exchange status
   * @returns {object}
   */
  getStatus() {
    return {
      name: this.name,
      mode: this.mode,
      initialized: this.isInitialized
    };
  }
}

module.exports = ExchangeInterface;
