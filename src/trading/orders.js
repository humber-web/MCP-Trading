// src/trading/orders.js
const config = require('../utils/config');
const Formatter = require('../utils/formatter');

class OrderManager {
  constructor(dependencies) {
    this.storage = dependencies.storage;
    this.pricesManager = dependencies.pricesManager;
    this.cache = dependencies.cache;
    this.portfolio = dependencies.portfolio;
    this.onOrderExecuted = dependencies.onOrderExecuted;

    // Order queues
    this.pendingOrders = [];
    this.activeStopLossTakeProfitOrders = [];

    // Monitoring
    this.monitoringInterval = null;
    this.monitoringFrequency = 10000; // Check every 10 seconds
  }

  async initialize() {
    try {
      // Load pending orders from storage
      this.pendingOrders = await this.storage.loadPendingOrders() || [];

      // Scan portfolio for stop-loss/take-profit positions
      await this.scanPortfolioForProtectiveOrders();

      // Start monitoring
      this.startMonitoring();

      console.error('✅ OrderManager initialized');
      console.error(`📋 Pending orders: ${this.pendingOrders.length}`);
      console.error(`🛡️ Stop-Loss/Take-Profit orders: ${this.activeStopLossTakeProfitOrders.length}`);
    } catch (error) {
      console.error('❌ Error initializing OrderManager:', error.message);
      throw error;
    }
  }

  // Scan portfolio for positions with stop-loss/take-profit
  async scanPortfolioForProtectiveOrders() {
    this.activeStopLossTakeProfitOrders = [];

    if (!this.portfolio || !this.portfolio.positions) {
      return;
    }

    for (const [coin, position] of Object.entries(this.portfolio.positions)) {
      if (position.stop_loss || position.take_profit) {
        this.activeStopLossTakeProfitOrders.push({
          coin,
          stop_loss: position.stop_loss,
          take_profit: position.take_profit,
          quantity: position.quantity,
          avg_price: position.avg_price
        });
      }
    }
  }

  // Start background monitoring
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkLimitOrders();
        await this.checkStopLossTakeProfitOrders();
      } catch (error) {
        console.error('⚠️ Error in monitoring loop:', error.message);
      }
    }, this.monitoringFrequency);

    console.error('✅ Order monitoring started');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.error('⏸️ Order monitoring stopped');
    }
  }

  // Check and execute limit orders
  async checkLimitOrders() {
    if (this.pendingOrders.length === 0) return;

    const ordersToExecute = [];
    const remainingOrders = [];

    for (const order of this.pendingOrders) {
      try {
        const priceData = await this.pricesManager.getCurrentPrice(order.coin);
        const currentPrice = priceData.price;

        let shouldExecute = false;

        if (order.type === 'BUY_LIMIT' && currentPrice <= order.limit_price) {
          shouldExecute = true;
        } else if (order.type === 'SELL_LIMIT' && currentPrice >= order.limit_price) {
          shouldExecute = true;
        }

        if (shouldExecute) {
          ordersToExecute.push({ order, currentPrice });
        } else {
          remainingOrders.push(order);
        }
      } catch (error) {
        console.error(`⚠️ Error checking limit order for ${order.coin}:`, error.message);
        remainingOrders.push(order);
      }
    }

    // Execute triggered orders
    for (const { order, currentPrice } of ordersToExecute) {
      await this.executeLimitOrder(order, currentPrice);
    }

    // Update pending orders
    this.pendingOrders = remainingOrders;
    await this.storage.savePendingOrders(this.pendingOrders);
  }

  // Check and execute stop-loss/take-profit orders
  async checkStopLossTakeProfitOrders() {
    if (this.activeStopLossTakeProfitOrders.length === 0) return;

    const ordersToExecute = [];

    for (const protectiveOrder of this.activeStopLossTakeProfitOrders) {
      try {
        // Check if position still exists
        const position = this.portfolio.positions[protectiveOrder.coin];
        if (!position) {
          continue; // Position was closed, skip
        }

        const priceData = await this.pricesManager.getCurrentPrice(protectiveOrder.coin);
        const currentPrice = priceData.price;

        let triggerType = null;

        // Check stop-loss
        if (protectiveOrder.stop_loss && currentPrice <= protectiveOrder.stop_loss) {
          triggerType = 'STOP_LOSS';
        }
        // Check take-profit
        else if (protectiveOrder.take_profit && currentPrice >= protectiveOrder.take_profit) {
          triggerType = 'TAKE_PROFIT';
        }

        if (triggerType) {
          ordersToExecute.push({
            coin: protectiveOrder.coin,
            triggerType,
            currentPrice,
            quantity: position.quantity
          });
        }
      } catch (error) {
        console.error(`⚠️ Error checking protective order for ${protectiveOrder.coin}:`, error.message);
      }
    }

    // Execute triggered protective orders
    for (const order of ordersToExecute) {
      await this.executeProtectiveOrder(order);
    }

    // Refresh protective orders after execution
    if (ordersToExecute.length > 0) {
      await this.scanPortfolioForProtectiveOrders();
    }
  }

  // Execute a limit order
  async executeLimitOrder(order, currentPrice) {
    try {
      console.error(`🎯 Executing ${order.type} for ${order.coin} at $${currentPrice}`);

      if (order.type === 'BUY_LIMIT') {
        // Execute buy
        if (this.onOrderExecuted) {
          await this.onOrderExecuted({
            type: 'BUY',
            coin: order.coin,
            amount_usd: order.amount_usd,
            price: currentPrice,
            order_id: order.id,
            trigger_type: 'LIMIT_ORDER'
          });
        }
      } else if (order.type === 'SELL_LIMIT') {
        // Execute sell
        if (this.onOrderExecuted) {
          await this.onOrderExecuted({
            type: 'SELL',
            coin: order.coin,
            percentage: order.percentage || 100,
            price: currentPrice,
            order_id: order.id,
            trigger_type: 'LIMIT_ORDER'
          });
        }
      }

      console.error(`✅ Limit order executed: ${order.coin} at $${currentPrice}`);
    } catch (error) {
      console.error(`❌ Error executing limit order:`, error.message);
      // Re-add to pending orders on failure
      this.pendingOrders.push(order);
    }
  }

  // Execute a protective order (stop-loss or take-profit)
  async executeProtectiveOrder(order) {
    try {
      const { coin, triggerType, currentPrice, quantity } = order;

      console.error(`🛡️ ${triggerType} triggered for ${coin} at $${currentPrice}`);

      if (this.onOrderExecuted) {
        await this.onOrderExecuted({
          type: 'SELL',
          coin: coin,
          percentage: 100, // Sell entire position
          price: currentPrice,
          trigger_type: triggerType,
          reason: triggerType === 'STOP_LOSS' ?
            'Stop-loss triggered - limiting losses' :
            'Take-profit triggered - securing gains'
        });
      }

      console.error(`✅ ${triggerType} executed: Sold ${coin} at $${currentPrice}`);
    } catch (error) {
      console.error(`❌ Error executing protective order:`, error.message);
    }
  }

  // Add a new limit order
  async addLimitOrder(type, coin, limitPrice, amountUsd = null, percentage = null) {
    try {
      // Validate inputs
      if (!['BUY_LIMIT', 'SELL_LIMIT'].includes(type)) {
        throw new Error('Invalid order type. Must be BUY_LIMIT or SELL_LIMIT');
      }

      if (type === 'BUY_LIMIT' && (!amountUsd || amountUsd <= 0)) {
        throw new Error('Amount USD is required for BUY_LIMIT orders');
      }

      if (type === 'SELL_LIMIT' && !this.portfolio.positions[coin]) {
        throw new Error(`No position in ${coin} to sell`);
      }

      const order = {
        id: Formatter.generateTradeId(),
        type,
        coin,
        limit_price: limitPrice,
        amount_usd: amountUsd,
        percentage: percentage || 100,
        created_at: Formatter.getTimestamp(),
        status: 'PENDING'
      };

      this.pendingOrders.push(order);
      await this.storage.savePendingOrders(this.pendingOrders);

      console.error(`✅ Limit order created: ${type} ${coin} at $${limitPrice}`);
      return order;
    } catch (error) {
      throw new Error(`Error creating limit order: ${error.message}`);
    }
  }

  // Cancel a limit order
  async cancelLimitOrder(orderId) {
    const index = this.pendingOrders.findIndex(o => o.id === orderId);

    if (index === -1) {
      throw new Error('Order not found');
    }

    const cancelledOrder = this.pendingOrders.splice(index, 1)[0];
    await this.storage.savePendingOrders(this.pendingOrders);

    console.error(`❌ Limit order cancelled: ${cancelledOrder.coin}`);
    return cancelledOrder;
  }

  // Get all pending orders
  getPendingOrders() {
    return this.pendingOrders;
  }

  // Get all protective orders
  getProtectiveOrders() {
    return this.activeStopLossTakeProfitOrders;
  }

  // Update stop-loss/take-profit for a position
  async updateProtectiveOrders(coin, stopLoss = null, takeProfit = null) {
    if (!this.portfolio.positions[coin]) {
      throw new Error(`No position in ${coin}`);
    }

    // Update position
    if (stopLoss !== null) {
      this.portfolio.positions[coin].stop_loss = stopLoss;
    }
    if (takeProfit !== null) {
      this.portfolio.positions[coin].take_profit = takeProfit;
    }

    // Rescan protective orders
    await this.scanPortfolioForProtectiveOrders();

    console.error(`✅ Protective orders updated for ${coin}`);
    return this.portfolio.positions[coin];
  }

  // Get order statistics
  getOrderStats() {
    return {
      pending_limit_orders: this.pendingOrders.length,
      active_stop_loss_orders: this.activeStopLossTakeProfitOrders.filter(o => o.stop_loss).length,
      active_take_profit_orders: this.activeStopLossTakeProfitOrders.filter(o => o.take_profit).length,
      monitoring_active: this.monitoringInterval !== null,
      monitoring_frequency_ms: this.monitoringFrequency
    };
  }

  // Cleanup on shutdown
  async shutdown() {
    this.stopMonitoring();
    await this.storage.savePendingOrders(this.pendingOrders);
    console.error('✅ OrderManager shutdown complete');
  }
}

module.exports = OrderManager;
