// backend/src/services/cacheService.js
import NodeCache from 'node-cache';

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL) || 1800,
      checkperiod: 600,
      useClones: false
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  set(key, value, ttl) {
    this.stats.sets++;
    if (ttl) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  del(key) {
    return this.cache.del(key);
  }

  flush() {
    return this.cache.flushAll();
  }

  getStats() {
    return {
      ...this.stats,
      keys: this.cache.keys().length,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  has(key) {
    return this.cache.has(key);
  }
}

export default new CacheService();