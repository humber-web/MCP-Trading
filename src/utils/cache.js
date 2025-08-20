const NodeCache = require('node-cache');
const config = require('./config');

class CacheManager {
  constructor() {
    // Cache para preços (30 segundos)
    this.priceCache = new NodeCache({ 
      stdTTL: config.cache.prices,
      checkperiod: 60 
    });
    
    // Cache para análise (5 minutos)
    this.analysisCache = new NodeCache({ 
      stdTTL: config.cache.analysis,
      checkperiod: 60 
    });
    
    // Cache para dados de mercado (1 minuto)
    this.marketCache = new NodeCache({ 
      stdTTL: config.cache.market,
      checkperiod: 60 
    });

    // Estatísticas de cache
    this.stats = {
      hits: 0,
      misses: 0
    };

    this.setupEvents();
  }

  setupEvents() {
    // Eventos de logging para debugging
    [this.priceCache, this.analysisCache, this.marketCache].forEach(cache => {
      cache.on('set', (key) => {
        console.error(`💾 Cache SET: ${key}`);
      });
      
      cache.on('del', (key) => {
        console.error(`🗑️ Cache DEL: ${key}`);
      });
      
      cache.on('expired', (key) => {
        console.error(`⏰ Cache EXPIRED: ${key}`);
      });
    });
  }

  // Métodos para cache de preços
  getPrice(key) {
    const value = this.priceCache.get(key);
    if (value) {
      this.stats.hits++;
      console.error(`🎯 Price Cache HIT: ${key}`);
    } else {
      this.stats.misses++;
      console.error(`❌ Price Cache MISS: ${key}`);
    }
    return value;
  }

  setPrice(key, value) {
    return this.priceCache.set(key, value);
  }

  // Métodos para cache de análise
  getAnalysis(key) {
    const value = this.analysisCache.get(key);
    if (value) {
      this.stats.hits++;
      console.error(`🎯 Analysis Cache HIT: ${key}`);
    } else {
      this.stats.misses++;
      console.error(`❌ Analysis Cache MISS: ${key}`);
    }
    return value;
  }

  setAnalysis(key, value) {
    return this.analysisCache.set(key, value);
  }

  // Métodos para cache de mercado
  getMarket(key) {
    const value = this.marketCache.get(key);
    if (value) {
      this.stats.hits++;
      console.error(`🎯 Market Cache HIT: ${key}`);
    } else {
      this.stats.misses++;
      console.error(`❌ Market Cache MISS: ${key}`);
    }
    return value;
  }

  setMarket(key, value) {
    return this.marketCache.set(key, value);
  }

  // Métodos utilitários
  clearAll() {
    const priceKeys = this.priceCache.keys().length;
    const analysisKeys = this.analysisCache.keys().length;
    const marketKeys = this.marketCache.keys().length;
    
    this.priceCache.flushAll();
    this.analysisCache.flushAll();
    this.marketCache.flushAll();
    
    return {
      cleared: priceKeys + analysisKeys + marketKeys,
      by_type: {
        prices: priceKeys,
        analysis: analysisKeys,
        market: marketKeys
      }
    };
  }

  getStats() {
    const totalKeys = this.priceCache.keys().length + 
                     this.analysisCache.keys().length + 
                     this.marketCache.keys().length;

    return {
      total_keys: totalKeys,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hit_rate: this.stats.hits + this.stats.misses > 0 ? 
        (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 : 0,
      by_cache: {
        prices: {
          keys: this.priceCache.keys().length,
          stats: this.priceCache.getStats()
        },
        analysis: {
          keys: this.analysisCache.keys().length,
          stats: this.analysisCache.getStats()
        },
        market: {
          keys: this.marketCache.keys().length,
          stats: this.marketCache.getStats()
        }
      }
    };
  }

  // Métodos para chaves padronizadas
  static keys = {
    price: (coin) => `price_${coin}`,
    analysis: (coin, days) => `analysis_${coin}_${days}`,
    market: (type) => `market_${type}`,
    sentiment: () => 'sentiment_data',
    overview: () => 'market_overview'
  };
}

module.exports = CacheManager;