// backend/src/controllers/weatherController.js
import weatherService from '../services/weatherService.js';
import windParticleService from '../services/windParticleService.js';
import { db } from '../config/database.js';

export const getCountryWeather = async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { layers } = req.query;
    
    if (!countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Country code is required'
      });
    }
    
    const layerArray = layers ? layers.split(',') : ['rain', 'wind', 'temperature'];
    
    console.log(`Fetching weather for ${countryCode}, layers: ${layerArray.join(', ')}`);
    
    const weatherData = await weatherService.fetchCountryWeather(
      countryCode,
      layerArray
    );
    
    // Save snapshot to database
    await db.saveWeatherSnapshot(countryCode, weatherData);
    
    res.json({
      success: true,
      data: weatherData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching country weather:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch weather data'
    });
  }
};

export const getHeatmapData = async (req, res) => {
  try {
    const { bounds, zoom, layer } = req.query;
    
    if (!bounds) {
      return res.status(400).json({
        success: false,
        error: 'Bounds parameter is required (format: minLat,minLng,maxLat,maxLng)'
      });
    }
    
    const boundsArray = bounds.split(',').map(Number);
    
    if (boundsArray.length !== 4 || boundsArray.some(isNaN)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounds format. Expected: minLat,minLng,maxLat,maxLng'
      });
    }
    
    const [minLat, minLng, maxLat, maxLng] = boundsArray;
    
    const boundsObj = {
      west: minLng,
      south: minLat,
      east: maxLng,
      north: maxLat
    };
    
    const zoomLevel = parseInt(zoom) || 5;
    const layerType = layer || 'temperature';
    
    console.log(`Generating heatmap: layer=${layerType}, zoom=${zoomLevel}, bounds=${bounds}`);
    
    const weatherData = await weatherService.fetchWeatherForTile(
      layerType,
      boundsObj,
      zoomLevel
    );
    
    res.json({
      success: true,
      data: {
        points: weatherData,
        bounds: boundsObj,
        layer: layerType,
        zoom: zoomLevel,
        count: weatherData.length
      }
    });
  } catch (error) {
    console.error('Error generating heatmap:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate heatmap data'
    });
  }
};

export const getWindVectors = async (req, res) => {
  try {
    const { bounds, resolution } = req.query;
    
    if (!bounds) {
      return res.status(400).json({
        success: false,
        error: 'Bounds parameter is required (format: minLat,minLng,maxLat,maxLng)'
      });
    }
    
    const boundsArray = bounds.split(',').map(Number);
    
    if (boundsArray.length !== 4 || boundsArray.some(isNaN)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounds format'
      });
    }
    
    const [minLat, minLng, maxLat, maxLng] = boundsArray;
    
    const boundsObj = {
      west: minLng,
      south: minLat,
      east: maxLng,
      north: maxLat
    };
    
    const gridResolution = parseInt(resolution) || 50;
    
    console.log(`Fetching wind vectors: resolution=${gridResolution}, bounds=${bounds}`);
    
    const vectorField = await windParticleService.getWindVectorField(
      boundsObj,
      gridResolution
    );
    
    res.json({
      success: true,
      data: vectorField
    });
  } catch (error) {
    console.error('Error fetching wind vectors:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch wind vector data'
    });
  }
};

export const getAvailableLayers = (req, res) => {
  res.json({
    success: true,
    layers: [
      { 
        id: 'rain', 
        name: 'Precipitation', 
        unit: 'mm/h', 
        color: '#00c8ff',
        description: 'Rainfall intensity and accumulation',
        minValue: 0,
        maxValue: 50
      },
      { 
        id: 'wind', 
        name: 'Wind Speed', 
        unit: 'm/s', 
        color: '#ffc800',
        description: 'Wind speed and direction',
        minValue: 0,
        maxValue: 40
      },
      { 
        id: 'temperature', 
        name: 'Temperature', 
        unit: '°C', 
        color: '#ff4444',
        description: 'Air temperature at surface level',
        minValue: -30,
        maxValue: 50
      },
      { 
        id: 'clouds', 
        name: 'Cloud Cover', 
        unit: '%', 
        color: '#cccccc',
        description: 'Cloud coverage percentage',
        minValue: 0,
        maxValue: 100
      },
      { 
        id: 'storm', 
        name: 'Storm Intensity', 
        unit: 'index', 
        color: '#8b008b',
        description: 'Combined storm severity index',
        minValue: 0,
        maxValue: 100
      }
    ]
  });
};

export const getForecastTimeline = async (req, res) => {
  try {
    const { countryCode, hours } = req.query;
    
    if (!countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Country code is required'
      });
    }
    
    const hoursAhead = parseInt(hours) || 6;
    const timeline = [];
    
    // Generate forecast timeline
    for (let i = 0; i <= hoursAhead; i++) {
      const timestamp = new Date(Date.now() + i * 3600000);
      timeline.push({
        timestamp: timestamp.toISOString(),
        hour: i,
        label: i === 0 ? 'Now' : `+${i}h`,
        dataAvailable: true
      });
    }
    
    res.json({
      success: true,
      data: {
        country: countryCode,
        timeline,
        totalHours: hoursAhead
      }
    });
  } catch (error) {
    console.error('Error fetching forecast timeline:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch forecast timeline'
    });
  }
};

export const getWeatherHistory = async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { limit } = req.query;
    
    if (!countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Country code is required'
      });
    }
    
    const historyLimit = parseInt(limit) || 10;
    const snapshots = await db.getWeatherSnapshots(countryCode, historyLimit);
    
    res.json({
      success: true,
      data: {
        country: countryCode,
        snapshots,
        count: snapshots.length
      }
    });
  } catch (error) {
    console.error('Error fetching weather history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch weather history'
    });
  }
};

export const getDatabaseStats = async (req, res) => {
  try {
    const stats = db.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

