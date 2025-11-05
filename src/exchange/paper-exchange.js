// src/exchange/paper-exchange.js

const ExchangeInterface = require('./exchange-interface');

/**
 * Paper Trading Exchange
 * Uses existing CoinGecko API for prices and simulates all trades locally
 * This is the safe default mode - no real money involved
 */
class PaperExchange extends ExchangeInterface {
  constructor(config = {}) {
    super({ ...config, mode: 'PAPER' });
    this.name = 'PaperTrading';

    // Dependencies from the existing system
    this.pricesManager = config.pricesManager;
    this.portfolio = config.portfolio;

    // Symbol mapping (coin names we already support)
    this.symbolMap = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'cardano': 'ADA',
      'polkadot': 'DOT',
      'chainlink': 'LINK',
      'solana': 'SOL',
      'polygon': 'MATIC',
      'avalanche-2': 'AVAX',
      'uniswap': 'UNI',
      'aave': 'AAVE'
    };

    // Order ID counter for paper trading
    this.orderIdCounter = 1;
  }

  async initialize() {
    if (!this.pricesManager || !this.portfolio) {
      throw new Error('PaperExchange requires pricesManager and portfolio dependencies');
    }

    console.log('✅ Paper Trading mode initialized (no real money)');
    this.isInitialized = true;
    return true;
  }

  async validateCredentials() {
    // Paper trading doesn't require credentials
    return true;
  }

  async getCurrentPrice(symbol) {
    try {
      const coin = this.symbolToCoin(symbol);
      const priceData = await this.pricesManager.getCurrentPrice(coin);

      return {
        price: priceData.price,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get price for ${symbol}: ${error.message}`);
    }
  }

  async getHistoricalPrices(symbol, days = 7) {
    try {
      const coin = this.symbolToCoin(symbol);
      const historyData = await this.pricesManager.getHistoricalPrices(coin, days);

      return historyData.prices.map(point => ({
        timestamp: new Date(point[0]).toISOString(),
        price: point[1],
        // Simulate OHLC data (we only have closing prices from CoinGecko)
        open: point[1] * 0.998,
        high: point[1] * 1.002,
        low: point[1] * 0.998,
        close: point[1],
        volume: 0 // CoinGecko free API doesn't provide volume in historical data
      }));
    } catch (error) {
      throw new Error(`Failed to get historical prices: ${error.message}`);
    }
  }

  async executeBuyOrder(symbol, quantity, price = null, options = {}) {
    try {
      const coin = this.symbolToCoin(symbol);
      const currentPriceData = await this.getCurrentPrice(symbol);
      const executionPrice = price || currentPriceData.price;

      // Simulate order execution
      const orderId = `PAPER_BUY_${this.orderIdCounter++}`;

      // Calculate USD amount
      const usdAmount = quantity * executionPrice;

      // Check if we have enough balance
      if (usdAmount > this.portfolio.balance_usd) {
        throw new Error(`Insufficient balance: need $${usdAmount.toFixed(2)}, have $${this.portfolio.balance_usd.toFixed(2)}`);
      }

      return {
        orderId,
        status: 'FILLED',
        executedQty: quantity,
        executedPrice: executionPrice,
        totalCost: usdAmount,
        timestamp: new Date().toISOString(),
        mode: 'PAPER'
      };
    } catch (error) {
      throw new Error(`Failed to execute paper buy order: ${error.message}`);
    }
  }

  async executeSellOrder(symbol, quantity, price = null, options = {}) {
    try {
      const coin = this.symbolToCoin(symbol);
      const currentPriceData = await this.getCurrentPrice(symbol);
      const executionPrice = price || currentPriceData.price;

      // Check if we have the position
      const position = this.portfolio.positions[coin];
      if (!position || position.quantity < quantity) {
        const available = position ? position.quantity : 0;
        throw new Error(`Insufficient ${coin}: need ${quantity}, have ${available}`);
      }

      // Simulate order execution
      const orderId = `PAPER_SELL_${this.orderIdCounter++}`;
      const usdAmount = quantity * executionPrice;

      return {
        orderId,
        status: 'FILLED',
        executedQty: quantity,
        executedPrice: executionPrice,
        totalValue: usdAmount,
        timestamp: new Date().toISOString(),
        mode: 'PAPER'
      };
    } catch (error) {
      throw new Error(`Failed to execute paper sell order: ${error.message}`);
    }
  }

  async getBalance() {
    return {
      available: this.portfolio.balance_usd,
      locked: 0, // Paper trading doesn't lock funds
      total: this.portfolio.balance_usd
    };
  }

  async getOpenPositions() {
    const positions = [];

    for (const [coin, position] of Object.entries(this.portfolio.positions)) {
      const symbol = this.coinToSymbol(coin);

      positions.push({
        symbol,
        coin,
        quantity: position.quantity,
        avgPrice: position.avg_price,
        stopLoss: position.stop_loss,
        takeProfit: position.take_profit,
        lastUpdated: position.last_updated
      });
    }

    return positions;
  }

  async getOrderStatus(orderId) {
    // In paper trading, all orders are executed immediately
    return {
      orderId,
      status: 'FILLED',
      message: 'Paper trading orders are executed immediately'
    };
  }

  async cancelOrder(orderId) {
    // In paper trading, orders can't be cancelled (executed immediately)
    throw new Error('Paper trading orders are executed immediately and cannot be cancelled');
  }

  coinToSymbol(coin) {
    // If already looks like a symbol (e.g., 'BTC'), return as-is
    if (coin.length <= 5 && coin === coin.toUpperCase()) {
      return coin;
    }

    const symbol = this.symbolMap[coin.toLowerCase()];
    if (!symbol) {
      // Try to infer from coin name (e.g., 'bitcoin' -> 'BTC')
      return coin.substring(0, 4).toUpperCase();
    }
    return symbol;
  }

  symbolToCoin(symbol) {
    // If already looks like a coin name (e.g., 'bitcoin'), return as-is
    if (symbol.length > 5 || symbol.toLowerCase() === symbol) {
      return symbol.toLowerCase();
    }

    // Reverse lookup in symbol map
    for (const [coin, sym] of Object.entries(this.symbolMap)) {
      if (sym === symbol.toUpperCase()) {
        return coin;
      }
    }

    // If not found, return lowercase version
    return symbol.toLowerCase();
  }

  /**
   * Get paper trading statistics
   */
  getStats() {
    return {
      mode: 'PAPER',
      totalValue: this.portfolio.getTotalValue(),
      balance: this.portfolio.balance_usd,
      positions: Object.keys(this.portfolio.positions).length,
      warning: 'This is paper trading - no real money involved'
    };
  }
}

module.exports = PaperExchange;
