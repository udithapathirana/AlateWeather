export const TILE_CONFIG = {
  size: parseInt(process.env.TILE_SIZE) || 256,
  minZoom: parseInt(process.env.MIN_ZOOM) || 0,
  maxZoom: parseInt(process.env.MAX_ZOOM) || 14,
  cacheDir: process.env.TILE_CACHE_DIR || './tiles',
  
  layers: {
    rain: {
      colorStops: [
        { value: 0, color: [0, 0, 0, 0] },
        { value: 1, color: [0, 100, 255, 100] },
        { value: 5, color: [0, 150, 255, 150] },
        { value: 10, color: [0, 200, 255, 200] },
        { value: 20, color: [100, 50, 255, 255] }
      ],
      unit: 'mm/h'
    },
    wind: {
      colorStops: [
        { value: 0, color: [255, 255, 100, 0] },
        { value: 5, color: [255, 255, 100, 100] },
        { value: 15, color: [255, 200, 0, 150] },
        { value: 25, color: [255, 100, 0, 200] },
        { value: 40, color: [255, 0, 0, 255] }
      ],
      unit: 'm/s'
    },
    temperature: {
      colorStops: [
        { value: -20, color: [0, 0, 255, 200] },
        { value: 0, color: [0, 200, 255, 200] },
        { value: 15, color: [0, 255, 0, 200] },
        { value: 25, color: [255, 255, 0, 200] },
        { value: 40, color: [255, 0, 0, 200] }
      ],
      unit: '°C'
    },
    clouds: {
      colorStops: [
        { value: 0, color: [200, 200, 200, 0] },
        { value: 50, color: [200, 200, 200, 100] },
        { value: 100, color: [150, 150, 150, 180] }
      ],
      unit: '%'
    },
    storm: {
      colorStops: [
        { value: 0, color: [139, 0, 139, 0] },
        { value: 30, color: [139, 0, 139, 150] },
        { value: 70, color: [200, 0, 200, 255] }
      ],
      unit: 'index'
    }
  }
};

export const COUNTRIES = {
  US: { 
    name: 'United States',
    bounds: { minLat: 25, maxLat: 49, minLng: -125, maxLng: -66 },
    center: [40, -95]
  },
  GB: { 
    name: 'United Kingdom',
    bounds: { minLat: 50, maxLat: 59, minLng: -8, maxLng: 2 },
    center: [54, -2]
  },
  AU: { 
    name: 'Australia',
    bounds: { minLat: -44, maxLat: -10, minLng: 113, maxLng: 154 },
    center: [-25, 133]
  },
  JP: { 
    name: 'Japan',
    bounds: { minLat: 24, maxLat: 46, minLng: 123, maxLng: 146 },
    center: [36, 138]
  },
  BR: { 
    name: 'Brazil',
    bounds: { minLat: -34, maxLat: 5, minLng: -74, maxLng: -34 },
    center: [-10, -55]
  },
  IN: { 
    name: 'India',
    bounds: { minLat: 8, maxLat: 35, minLng: 68, maxLng: 97 },
    center: [20, 77]
  }
};