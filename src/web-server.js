// src/web-server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

class WebServer {
  constructor(cryptoTradingServer) {
    this.tradingServer = cryptoTradingServer;
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      const exchangeStatus = this.tradingServer.exchange ? this.tradingServer.exchange.getStatus() : null;
      const notificationStatus = this.tradingServer.notifier ? this.tradingServer.notifier.getConfig() : null;

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        exchange: exchangeStatus,
        notifications: notificationStatus,
        portfolio: {
          total_value: this.tradingServer.getPortfolio().total_value,
          balance: this.tradingServer.getPortfolio().balance_usd,
          positions: Object.keys(this.tradingServer.getPortfolio().positions).length
        }
      });
    });

    // API Routes
    this.app.get('/api/portfolio', async (req, res) => {
      try {
        const portfolio = this.tradingServer.getPortfolio();

        // Update portfolio values with current prices
        const pricesManager = this.tradingServer.pricesManager;
        const updatedPositions = {};

        for (const [coin, position] of Object.entries(portfolio.positions)) {
          try {
            const priceData = await pricesManager.getCurrentPrice(coin);
            const currentValue = position.quantity * priceData.price;
            const unrealizedPnL = currentValue - (position.quantity * position.avg_price);
            const unrealizedPnLPercent = (unrealizedPnL / (position.quantity * position.avg_price)) * 100;

            updatedPositions[coin] = {
              ...position,
              current_price: priceData.price,
              current_value: currentValue,
              unrealized_pnl: unrealizedPnL,
              unrealized_pnl_percent: unrealizedPnLPercent
            };
          } catch (error) {
            updatedPositions[coin] = position;
          }
        }

        res.json({
          balance_usd: portfolio.balance_usd,
          total_value: portfolio.balance_usd + Object.values(updatedPositions).reduce((sum, p) => sum + (p.current_value || 0), 0),
          positions: updatedPositions,
          trades_history: portfolio.trades_history || []
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get orders
    this.app.get('/api/orders', (req, res) => {
      try {
        const orderManager = this.tradingServer.orderManager;
        const stats = orderManager.getOrderStats();
        const pendingOrders = orderManager.getPendingOrders();
        const protectiveOrders = orderManager.getProtectiveOrders();

        res.json({
          stats,
          pending_orders: pendingOrders,
          protective_orders: protectiveOrders
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get price
    this.app.get('/api/price/:coin', async (req, res) => {
      try {
        const { coin } = req.params;
        const priceData = await this.tradingServer.pricesManager.getCurrentPrice(coin);
        res.json(priceData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Buy crypto
    this.app.post('/api/buy', async (req, res) => {
      try {
        const { coin, amount_usd, stop_loss, take_profit } = req.body;

        const result = await this.tradingServer.toolsHandler.buyCrypto(
          coin,
          amount_usd,
          stop_loss || null,
          take_profit || null
        );

        res.json({
          success: true,
          message: result
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // Sell crypto
    this.app.post('/api/sell', async (req, res) => {
      try {
        const { coin, percentage } = req.body;

        const result = await this.tradingServer.toolsHandler.sellCrypto(
          coin,
          percentage || 100
        );

        res.json({
          success: true,
          message: result
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // Market scan
    this.app.get('/api/market/scan', async (req, res) => {
      try {
        const { type = 'gainers', limit = 5 } = req.query;

        const result = await this.tradingServer.toolsHandler.marketScan(type, parseInt(limit));

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get stats
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = this.tradingServer.getStats();
        const orderStats = this.tradingServer.orderManager.getOrderStats();

        res.json({
          trading_stats: stats,
          order_stats: orderStats
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add limit order
    this.app.post('/api/orders/limit', async (req, res) => {
      try {
        const { type, coin, limit_price, amount_usd, percentage } = req.body;

        const order = await this.tradingServer.orderManager.addLimitOrder(
          type,
          coin,
          limit_price,
          amount_usd || null,
          percentage || null
        );

        res.json({
          success: true,
          order
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // Cancel limit order
    this.app.delete('/api/orders/limit/:orderId', async (req, res) => {
      try {
        const { orderId } = req.params;

        const cancelledOrder = await this.tradingServer.orderManager.cancelLimitOrder(orderId);

        res.json({
          success: true,
          cancelled_order: cancelledOrder
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // Update protective orders
    this.app.put('/api/orders/protective/:coin', async (req, res) => {
      try {
        const { coin } = req.params;
        const { stop_loss, take_profit } = req.body;

        const updatedPosition = await this.tradingServer.orderManager.updateProtectiveOrders(
          coin,
          stop_loss || null,
          take_profit || null
        );

        res.json({
          success: true,
          position: updatedPosition
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // Serve dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
          console.error(`🌐 Web dashboard: http://localhost:${this.port}`);
          console.error(`📊 API endpoints: http://localhost:${this.port}/api`);
          console.error(`🏥 Health check: http://localhost:${this.port}/health`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.error('🌐 Web server stopped');
    }
  }
}

module.exports = WebServer;
