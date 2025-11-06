// src/market/prices.js
const axios = require('axios');
const config = require('../utils/config');
const Formatter = require('../utils/formatter');

class PricesManager {
  constructor(dependencies) {
    this.cache = dependencies.cache;
    this.storage = dependencies.storage;
    this.stats = dependencies.stats || { api_calls: 0, rate_limit_hits: 0, retries: 0 };

    // Price feed configuration
    this.priceFeeds = {
      primary: {
        name: 'CoinGecko',
        baseUrl: config.apis.coingecko.base_url,
        timeout: config.apis.coingecko.timeout,
        rateLimitPerMinute: 10 // Conservative for CoinGecko free tier (10-30 req/min)
      },
      // Future: Add more price feeds for redundancy
      // secondary: {
      //   name: 'CoinMarketCap',
      //   baseUrl: 'https://api.coinmarketcap.com/v1',
      //   timeout: 10000
      // }
    };

    // Rate limiting with sliding window
    this.requestQueue = [];
    this.rateLimitWindow = 60000; // 1 minute
    this.minRequestInterval = 4000; // 4 seconds between requests (15 req/min max)
    this.lastRequestTime = 0;

    // Retry configuration
    this.retryConfig = {
      maxRetries: 5,
      baseDelay: 5000, // Start with 5 seconds
      maxDelay: 60000 // Max 60 seconds
    };
  }

  // SINGLE PRICE OPERATIONS

  async getCurrentPrice(coin) {
    const cacheKey = this.cache.constructor.keys.price(coin);
    let cached = this.cache.getPrice(cacheKey);
    
    if (cached) {
      return {
        price: cached.price,
        source: 'cache',
        timestamp: cached.timestamp,
        change_24h: cached.change_24h || null
      };
    }

    return await this.fetchPriceFromAPI(coin);
  }

  async getPriceHistory(coin, days = 7, interval = 'daily') {
    const cacheKey = `price_history_${coin}_${days}_${interval}`;
    let cached = this.cache.getAnalysis(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const priceHistory = await this.executeWithRetry(async () => {
        await this.checkRateLimit();

        const response = await axios.get(`${this.priceFeeds.primary.baseUrl}/coins/${coin}/market_chart`, {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: interval === 'hourly' && days <= 1 ? 'hourly' : 'daily'
          },
          timeout: this.priceFeeds.primary.timeout
        });

        this.stats.api_calls++;

        return {
          coin: coin,
          days: days,
          interval: interval,
          prices: response.data.prices.map(([timestamp, price]) => ({
            timestamp: new Date(timestamp).toISOString(),
            price: price,
            formatted_price: Formatter.formatPrice(price),
            formatted_time: Formatter.formatDateTime(timestamp)
          })),
          volumes: response.data.total_volumes.map(([timestamp, volume]) => ({
            timestamp: new Date(timestamp).toISOString(),
            volume: volume,
            formatted_volume: Formatter.formatNumber(volume)
          })),
          market_caps: response.data.market_caps?.map(([timestamp, cap]) => ({
            timestamp: new Date(timestamp).toISOString(),
            market_cap: cap,
            formatted_cap: Formatter.formatNumber(cap)
          })) || [],
          fetched_at: Formatter.getTimestamp()
        };
      }, `histórico de ${coin}`);

      this.cache.setAnalysis(cacheKey, priceHistory);
      return priceHistory;

    } catch (error) {
      throw new Error(`Erro ao obter histórico de ${coin}: ${error.message}`);
    }
  }

  // BATCH PRICE OPERATIONS

  async getMultiplePrices(coins) {
    const cacheKey = `multi_prices_${coins.sort().join('_')}`;
    let cached = this.cache.getPrice(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await this.executeWithRetry(async () => {
        await this.checkRateLimit();

        const response = await axios.get(`${this.priceFeeds.primary.baseUrl}/simple/price`, {
          params: {
            ids: coins.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_24hr_vol: true,
            include_market_cap: true,
            include_last_updated_at: true
          },
          timeout: this.priceFeeds.primary.timeout
        });

        this.stats.api_calls++;

        const pricesData = Object.entries(response.data).reduce((acc, [coinId, data]) => {
          acc[coinId] = {
            price: data.usd,
            change_24h: data.usd_24h_change || 0,
            volume_24h: data.usd_24h_vol || 0,
            market_cap: data.usd_market_cap || 0,
            last_updated: data.last_updated_at ? new Date(data.last_updated_at * 1000).toISOString() : null,
            formatted: {
              price: Formatter.formatPrice(data.usd),
              change_24h: Formatter.formatPriceChange(data.usd_24h_change || 0),
              volume_24h: Formatter.formatNumber(data.usd_24h_vol || 0),
              market_cap: Formatter.formatNumber(data.usd_market_cap || 0)
            }
          };
          return acc;
        }, {});

        return {
          prices: pricesData,
          fetched_at: Formatter.getTimestamp(),
          source: 'api',
          coins_count: coins.length
        };
      }, `preços de ${coins.length} moedas`);

      this.cache.setPrice(cacheKey, result);
      return result;

    } catch (error) {
      throw new Error(`Erro ao obter preços múltiplos: ${error.message}`);
    }
  }

  async getMarketOverview() {
    const cacheKey = 'market_overview_full';
    let cached = this.cache.getMarket(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const pricesData = await this.getMultiplePrices(config.supported_coins);
      
      const overview = Object.entries(pricesData.prices).map(([coinId, data]) => ({
        coin_id: coinId,
        name: Formatter.formatCoinName(coinId),
        ...data
      })).sort((a, b) => b.market_cap - a.market_cap);

      const marketSummary = {
        total_market_cap: overview.reduce((sum, coin) => sum + (coin.market_cap || 0), 0),
        total_volume_24h: overview.reduce((sum, coin) => sum + (coin.volume_24h || 0), 0),
        gainers: overview.filter(coin => coin.change_24h > 0).length,
        losers: overview.filter(coin => coin.change_24h < 0).length,
        neutral: overview.filter(coin => Math.abs(coin.change_24h) < 1).length,
        avg_change: overview.reduce((sum, coin) => sum + coin.change_24h, 0) / overview.length
      };

      const result = {
        overview: overview,
        summary: {
          ...marketSummary,
          formatted: {
            total_market_cap: Formatter.formatNumber(marketSummary.total_market_cap),
            total_volume_24h: Formatter.formatNumber(marketSummary.total_volume_24h),
            avg_change: Formatter.formatPercent(marketSummary.avg_change)
          }
        },
        timestamp: Formatter.getTimestamp(),
        coins_analyzed: overview.length
      };

      this.cache.setMarket(cacheKey, result);
      return result;

    } catch (error) {
      throw new Error(`Erro ao obter overview do mercado: ${error.message}`);
    }
  }

  // PRICE MONITORING & ALERTS

  async monitorPriceChanges(coins, thresholdPercent = 5) {
    const alerts = [];
    
    try {
      const currentPrices = await this.getMultiplePrices(coins);
      
      for (const [coinId, priceData] of Object.entries(currentPrices.prices)) {
        const change24h = Math.abs(priceData.change_24h);
        
        if (change24h >= thresholdPercent) {
          alerts.push({
            coin: coinId,
            coin_name: Formatter.formatCoinName(coinId),
            price: priceData.price,
            change_24h: priceData.change_24h,
            alert_type: priceData.change_24h > 0 ? 'surge' : 'drop',
            severity: change24h >= 15 ? 'high' : change24h >= 10 ? 'medium' : 'low',
            formatted: {
              price: priceData.formatted.price,
              change: priceData.formatted.change_24h
            },
            timestamp: Formatter.getTimestamp()
          });
        }
      }

      return {
        alerts: alerts,
        monitored_coins: coins.length,
        threshold_percent: thresholdPercent,
        alerts_count: alerts.length
      };

    } catch (error) {
      throw new Error(`Erro no monitoramento de preços: ${error.message}`);
    }
  }

  // PRICE COMPARISON & ARBITRAGE

  async compareExchanges(coin) {
    // Future implementation: Compare prices across different exchanges
    // For now, return single source data with note
    
    try {
      const priceData = await this.getCurrentPrice(coin);
      
      return {
        coin: coin,
        coin_name: Formatter.formatCoinName(coin),
        exchanges: {
          coingecko_aggregate: {
            price: priceData.price,
            source: 'CoinGecko (Aggregated)',
            formatted_price: Formatter.formatPrice(priceData.price)
          }
        },
        best_price: priceData.price,
        arbitrage_opportunity: false,
        note: 'Single source implementation - multi-exchange coming soon',
        timestamp: Formatter.getTimestamp()
      };

    } catch (error) {
      throw new Error(`Erro na comparação de preços: ${error.message}`);
    }
  }

  // UTILITY METHODS

  async fetchPriceFromAPI(coin) {
    try {
      const priceData = await this.executeWithRetry(async () => {
        await this.checkRateLimit();

        const response = await axios.get(`${this.priceFeeds.primary.baseUrl}/simple/price`, {
          params: {
            ids: coin,
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_last_updated_at: true
          },
          timeout: this.priceFeeds.primary.timeout
        });

        this.stats.api_calls++;

        const data = response.data[coin];
        return {
          price: data.usd,
          change_24h: data.usd_24h_change || 0,
          timestamp: data.last_updated_at ?
            new Date(data.last_updated_at * 1000).toISOString() :
            Formatter.getTimestamp(),
          source: 'api'
        };
      }, `preço de ${coin}`);

      // Cache the result
      const cacheKey = this.cache.constructor.keys.price(coin);
      this.cache.setPrice(cacheKey, priceData);

      return priceData;

    } catch (error) {
      throw new Error(`Erro ao buscar preço de ${coin}: ${error.message}`);
    }
  }

  async checkRateLimit() {
    const now = Date.now();

    // Remove requests older than the rate limit window (sliding window)
    this.requestQueue = this.requestQueue.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );

    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check if we're at the rate limit
    if (this.requestQueue.length >= this.priceFeeds.primary.rateLimitPerMinute) {
      const oldestRequest = this.requestQueue[0];
      const waitTime = this.rateLimitWindow - (now - oldestRequest) + 100; // Add 100ms buffer

      if (waitTime > 0) {
        console.error(`⏰ Rate limit atingido (${this.requestQueue.length}/${this.priceFeeds.primary.rateLimitPerMinute}), aguardando ${Math.ceil(waitTime / 1000)}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Clean up old requests after waiting
        const afterWait = Date.now();
        this.requestQueue = this.requestQueue.filter(
          timestamp => afterWait - timestamp < this.rateLimitWindow
        );
      }
    }

    // Record this request
    const requestTime = Date.now();
    this.requestQueue.push(requestTime);
    this.lastRequestTime = requestTime;
  }

  async executeWithRetry(apiCall, context = '') {
    let lastError;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;

        // Check if it's a rate limit error (429)
        const isRateLimitError = error.response?.status === 429 ||
                                 error.message?.includes('429') ||
                                 error.message?.includes('Too Many Requests');

        // Check if it's a network error that should be retried
        const isNetworkError = error.code === 'ECONNRESET' ||
                              error.code === 'ETIMEDOUT' ||
                              error.code === 'ENOTFOUND';

        const shouldRetry = (isRateLimitError || isNetworkError) && attempt < this.retryConfig.maxRetries;

        if (!shouldRetry) {
          // Don't retry for other errors or if we've exhausted retries
          throw error;
        }

        // Calculate exponential backoff delay
        const baseDelay = isRateLimitError ?
          this.retryConfig.baseDelay * 2 : // Longer delays for rate limits
          this.retryConfig.baseDelay;

        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // Add up to 1s random jitter
        const delay = Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay);

        const errorType = isRateLimitError ? '429 Rate Limit' : 'Network Error';
        console.error(`⚠️  ${errorType} ${context ? `(${context})` : ''}: Tentativa ${attempt + 1}/${this.retryConfig.maxRetries}, aguardando ${Math.ceil(delay / 1000)}s...`);

        this.stats.retries++;
        if (isRateLimitError) {
          this.stats.rate_limit_hits++;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    throw lastError;
  }

  // STATISTICS & HEALTH

  getPriceStats() {
    return {
      api_calls: this.stats.api_calls,
      rate_limit_hits: this.stats.rate_limit_hits,
      retries: this.stats.retries,
      rate_limit_info: {
        requests_in_window: this.requestQueue.length,
        limit_per_minute: this.priceFeeds.primary.rateLimitPerMinute,
        window_size_ms: this.rateLimitWindow,
        min_interval_ms: this.minRequestInterval,
        last_request: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : null
      },
      cache_stats: this.cache.getStats(),
      supported_coins: config.supported_coins.length,
      primary_feed: this.priceFeeds.primary.name
    };
  }

  async healthCheck() {
    try {
      // Test API connectivity with a simple request
      const testCoin = 'bitcoin';
      const startTime = Date.now();
      await this.getCurrentPrice(testCoin);
      const responseTime = Date.now() - startTime;

      const utilizationPercent = (this.requestQueue.length / this.priceFeeds.primary.rateLimitPerMinute) * 100;
      let rateLimitStatus = 'ok';
      if (utilizationPercent >= 90) rateLimitStatus = 'critical';
      else if (utilizationPercent >= 70) rateLimitStatus = 'warning';

      return {
        status: 'healthy',
        api_connectivity: 'ok',
        response_time_ms: responseTime,
        primary_feed: this.priceFeeds.primary.name,
        rate_limit_status: rateLimitStatus,
        rate_limit_utilization: `${Math.round(utilizationPercent)}%`,
        retry_stats: {
          total_retries: this.stats.retries,
          rate_limit_hits: this.stats.rate_limit_hits
        },
        last_check: Formatter.getTimestamp()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        api_connectivity: 'failed',
        last_check: Formatter.getTimestamp()
      };
    }
  }

  // PRICE FORMATTING UTILITIES

  formatPriceData(priceData, includeFormatted = true) {
    const formatted = {
      ...priceData,
      coin_name: Formatter.formatCoinName(priceData.coin || 'unknown')
    };

    if (includeFormatted) {
      formatted.formatted = {
        price: Formatter.formatPrice(priceData.price),
        change_24h: priceData.change_24h ? Formatter.formatPriceChange(priceData.change_24h) : 'N/A',
        timestamp: Formatter.formatDateTime(priceData.timestamp)
      };
    }

    return formatted;
  }

  formatMultiplePrices(pricesData, sortBy = 'market_cap') {
    const sorted = Object.entries(pricesData.prices)
      .map(([coinId, data]) => ({
        coin_id: coinId,
        ...this.formatPriceData({ ...data, coin: coinId })
      }))
      .sort((a, b) => {
        if (sortBy === 'market_cap') return (b.market_cap || 0) - (a.market_cap || 0);
        if (sortBy === 'change_24h') return (b.change_24h || 0) - (a.change_24h || 0);
        if (sortBy === 'volume_24h') return (b.volume_24h || 0) - (a.volume_24h || 0);
        return 0;
      });

    return {
      ...pricesData,
      prices_formatted: sorted
    };
  }
}

module.exports = PricesManager;