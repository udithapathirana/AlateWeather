// backend/src/config/database.js
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
// Currently using in-memory storage, but can be extended to use MongoDB, PostgreSQL, etc.

export const dbConfig = {
  // If using MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/weather-heatmap',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // If using PostgreSQL
  postgresql: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'weather_heatmap',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  
  // Cache configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 1800, // 30 minutes
    checkPeriod: 600 // 10 minutes
  }
};

// In-memory data store (for development without external database)
class InMemoryDB {
  constructor() {
    this.data = {
      weatherSnapshots: [],
      tileMetadata: [],
      userPreferences: new Map()
    };
  }

  // Weather snapshot operations
  async saveWeatherSnapshot(countryCode, data) {
    const snapshot = {
      id: Date.now().toString(),
      countryCode,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.data.weatherSnapshots.push(snapshot);
    
    // Keep only last 100 snapshots
    if (this.data.weatherSnapshots.length > 100) {
      this.data.weatherSnapshots.shift();
    }
    
    return snapshot;
  }

  async getWeatherSnapshots(countryCode, limit = 10) {
    return this.data.weatherSnapshots
      .filter(s => s.countryCode === countryCode)
      .slice(-limit)
      .reverse();
  }

  async getLatestWeatherSnapshot(countryCode) {
    const snapshots = this.data.weatherSnapshots.filter(
      s => s.countryCode === countryCode
    );
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  // Tile metadata operations
  async saveTileMetadata(layer, z, x, y, metadata) {
    const key = `${layer}-${z}-${x}-${y}`;
    const existing = this.data.tileMetadata.findIndex(t => t.key === key);
    
    const tile = {
      key,
      layer,
      z,
      x,
      y,
      ...metadata,
      updatedAt: new Date().toISOString()
    };
    
    if (existing >= 0) {
      this.data.tileMetadata[existing] = tile;
    } else {
      this.data.tileMetadata.push(tile);
    }
    
    return tile;
  }

  async getTileMetadata(layer, z, x, y) {
    const key = `${layer}-${z}-${x}-${y}`;
    return this.data.tileMetadata.find(t => t.key === key);
  }

  async cleanOldTileMetadata(maxAge = 3600000) { // 1 hour
    const cutoff = new Date(Date.now() - maxAge).toISOString();
    this.data.tileMetadata = this.data.tileMetadata.filter(
      t => t.updatedAt > cutoff
    );
  }

  // User preferences (for future features)
  async saveUserPreference(userId, preferences) {
    this.data.userPreferences.set(userId, {
      ...preferences,
      updatedAt: new Date().toISOString()
    });
  }

  async getUserPreference(userId) {
    return this.data.userPreferences.get(userId) || null;
  }

  // Statistics
  getStats() {
    return {
      weatherSnapshots: this.data.weatherSnapshots.length,
      tileMetadata: this.data.tileMetadata.length,
      userPreferences: this.data.userPreferences.size,
      oldestSnapshot: this.data.weatherSnapshots[0]?.timestamp,
      newestSnapshot: this.data.weatherSnapshots[this.data.weatherSnapshots.length - 1]?.timestamp
    };
  }

  // Clear all data
  clear() {
    this.data.weatherSnapshots = [];
    this.data.tileMetadata = [];
    this.data.userPreferences.clear();
  }
}

// Export singleton instance
export const db = new InMemoryDB();

// MongoDB connection function (optional, for production)
export async function connectMongoDB() {
  try {
    // Uncomment if using MongoDB
    /*
    const mongoose = require('mongoose');
    await mongoose.connect(dbConfig.mongodb.uri, dbConfig.mongodb.options);
    console.log('✅ MongoDB connected');
    */
    console.log('ℹ️  Using in-memory database (no external DB configured)');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// PostgreSQL connection function (optional, for production)
export async function connectPostgreSQL() {
  try {
    // Uncomment if using PostgreSQL
    /*
    const { Pool } = require('pg');
    const pool = new Pool(dbConfig.postgresql);
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');
    return pool;
    */
    console.log('ℹ️  Using in-memory database (no external DB configured)');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export default db;