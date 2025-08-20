// src/trading/portfolio.js
const config = require('../utils/config');
const Formatter = require('../utils/formatter');

class PortfolioManager {
  constructor(dependencies) {
    this.storage = dependencies.storage;
    this.pricesManager = dependencies.pricesManager;
    this.cache = dependencies.cache;
    this.portfolio = null;
    this.performanceMetrics = {};
  }

  async initialize(portfolioData) {
    this.portfolio = portfolioData || await this.createInitialPortfolio();
    await this.calculatePerformanceMetrics();
  }

  async updatePortfolioValue() {
    let totalValue = this.portfolio.balance_usd;
    const positionValues = {};

    for (const [coin, position] of Object.entries(this.portfolio.positions)) {
      try {
        const currentPrice = await this.pricesManager.getCurrentPrice(coin);
        const positionValue = position.quantity * currentPrice.price;
        positionValues[coin] = {
          ...position,
          current_price: currentPrice.price,
          current_value: positionValue,
          unrealized_pnl: positionValue - (position.quantity * position.avg_price),
          unrealized_pnl_percent: ((positionValue - (position.quantity * position.avg_price)) / (position.quantity * position.avg_price)) * 100
        };
        totalValue += positionValue;
      } catch (error) {
        console.error(`⚠️ Erro ao atualizar ${coin}:`, error.message);
      }
    }

    this.portfolio.total_value = totalValue;
    this.portfolio.positions_values = positionValues;
    this.portfolio.allocation = this.calculateAllocation();
    
    return this.portfolio;
  }

  addPosition(coin, quantity, price, metadata = {}) {
    if (this.portfolio.positions[coin]) {
      const existing = this.portfolio.positions[coin];
      const existingValue = existing.quantity * existing.avg_price;
      const newValue = quantity * price;
      const totalQuantity = existing.quantity + quantity;
      
      this.portfolio.positions[coin] = {
        ...existing,
        quantity: totalQuantity,
        avg_price: (existingValue + newValue) / totalQuantity,
        last_updated: Formatter.getTimestamp()
      };
    } else {
      this.portfolio.positions[coin] = {
        quantity,
        avg_price: price,
        created_at: Formatter.getTimestamp(),
        last_updated: Formatter.getTimestamp(),
        ...metadata
      };
    }
  }

  removePosition(coin, quantity) {
    if (!this.portfolio.positions[coin]) {
      throw new Error(`Posição não encontrada: ${coin}`);
    }

    const position = this.portfolio.positions[coin];
    if (quantity >= position.quantity) {
      delete this.portfolio.positions[coin];
    } else {
      this.portfolio.positions[coin].quantity -= quantity;
      this.portfolio.positions[coin].last_updated = Formatter.getTimestamp();
    }
  }

  calculateAllocation() {
    const allocation = {
      cash: {
        value: this.portfolio.balance_usd,
        percentage: (this.portfolio.balance_usd / this.portfolio.total_value) * 100
      },
      positions: {}
    };

    Object.entries(this.portfolio.positions_values || {}).forEach(([coin, data]) => {
      allocation.positions[coin] = {
        value: data.current_value,
        percentage: (data.current_value / this.portfolio.total_value) * 100,
        coin_name: Formatter.formatCoinName(coin)
      };
    });

    return allocation;
  }

  async calculatePerformanceMetrics() {
    const initialValue = config.trading.initial_balance;
    const currentValue = this.portfolio.total_value;
    const totalReturn = ((currentValue - initialValue) / initialValue) * 100;

    const trades = this.portfolio.trades_history || [];
    const sellTrades = trades.filter(t => t.type === 'SELL' && t.pnl !== undefined);
    const winningTrades = sellTrades.filter(t => t.pnl > 0);
    const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0;

    this.performanceMetrics = {
      total_return: totalReturn,
      win_rate: winRate,
      total_trades: trades.length,
      winning_trades: winningTrades.length,
      avg_trade_return: sellTrades.length > 0 ? 
        sellTrades.reduce((sum, t) => sum + (t.pnl_percent || 0), 0) / sellTrades.length : 0
    };

    return this.performanceMetrics;
  }

  getTopPerformers(limit = 3) {
    if (!this.portfolio.positions_values) return [];
    
    return Object.entries(this.portfolio.positions_values)
      .filter(([_, position]) => position.unrealized_pnl_percent !== undefined)
      .sort((a, b) => b[1].unrealized_pnl_percent - a[1].unrealized_pnl_percent)
      .slice(0, limit)
      .map(([coin, position]) => ({
        coin,
        coin_name: Formatter.formatCoinName(coin),
        pnl_percent: position.unrealized_pnl_percent,
        pnl: position.unrealized_pnl
      }));
  }

  async createInitialPortfolio() {
    return {
      balance_usd: config.trading.initial_balance,
      positions: {},
      total_value: config.trading.initial_balance,
      trades_history: [],
      pnl: 0,
      created_at: Formatter.getTimestamp()
    };
  }
}

module.exports = PortfolioManager;