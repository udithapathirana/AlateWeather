// backend/src/utils/dataProcessor.js

/**
 * Smooth data using moving average
 * @param {Array} data - Array of data points with 'value' property
 * @param {Number} kernelSize - Size of smoothing kernel
 * @returns {Array} Smoothed data
 */
export function smoothData(data, kernelSize = 3) {
  if (!data || data.length === 0) return data;
  
  const smoothed = [];
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let i = 0; i < data.length; i++) {
    const neighbors = [];
    
    for (let j = Math.max(0, i - halfKernel); j <= Math.min(data.length - 1, i + halfKernel); j++) {
      neighbors.push(data[j].value);
    }
    
    const avg = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
    
    smoothed.push({
      ...data[i],
      value: avg,
      originalValue: data[i].value
    });
  }
  
  return smoothed;
}

/**
 * Apply Gaussian smoothing to data
 * @param {Array} data - Data points
 * @param {Number} sigma - Standard deviation for Gaussian kernel
 * @returns {Array} Smoothed data
 */
export function gaussianSmooth(data, sigma = 1.0) {
  if (!data || data.length === 0) return data;
  
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
  const kernel = generateGaussianKernel(kernelSize, sigma);
  
  const smoothed = [];
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let i = 0; i < data.length; i++) {
    let weightedSum = 0;
    let weightTotal = 0;
    
    for (let j = -halfKernel; j <= halfKernel; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) {
        const weight = kernel[j + halfKernel];
        weightedSum += data[idx].value * weight;
        weightTotal += weight;
      }
    }
    
    smoothed.push({
      ...data[i],
      value: weightedSum / weightTotal,
      originalValue: data[i].value
    });
  }
  
  return smoothed;
}

/**
 * Generate Gaussian kernel
 * @param {Number} size - Kernel size
 * @param {Number} sigma - Standard deviation
 * @returns {Array} Gaussian kernel
 */
function generateGaussianKernel(size, sigma) {
  const kernel = [];
  const center = Math.floor(size / 2);
  let sum = 0;
  
  for (let i = 0; i < size; i++) {
    const x = i - center;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(value);
    sum += value;
  }
  
  // Normalize
  return kernel.map(v => v / sum);
}

/**
 * Interpolate data to a target resolution
 * @param {Array} data - Original data points
 * @param {Number} targetResolution - Target grid resolution
 * @returns {Array} Interpolated data
 */
export function interpolateGrid(data, targetResolution) {
  if (!data || data.length === 0) return data;
  
  // Find bounds
  const lats = data.map(d => d.lat);
  const lngs = data.map(d => d.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  const latStep = (maxLat - minLat) / targetResolution;
  const lngStep = (maxLng - minLng) / targetResolution;
  
  const interpolated = [];
  
  for (let i = 0; i <= targetResolution; i++) {
    for (let j = 0; j <= targetResolution; j++) {
      const lat = minLat + i * latStep;
      const lng = minLng + j * lngStep;
      
      const value = interpolatePoint(data, lat, lng);
      
      interpolated.push({ 
        lat: parseFloat(lat.toFixed(4)), 
        lng: parseFloat(lng.toFixed(4)), 
        value: parseFloat(value.toFixed(2))
      });
    }
  }
  
  return interpolated;
}

/**
 * Interpolate value at a specific point using inverse distance weighting
 * @param {Array} data - Data points
 * @param {Number} lat - Target latitude
 * @param {Number} lng - Target longitude
 * @param {Number} power - Power parameter for IDW (default: 2)
 * @returns {Number} Interpolated value
 */
export function interpolatePoint(data, lat, lng, power = 2) {
  if (!data || data.length === 0) return 0;
  
  // Calculate distances to all points
  const distances = data.map(d => ({
    ...d,
    distance: Math.sqrt(Math.pow(d.lat - lat, 2) + Math.pow(d.lng - lng, 2))
  }));
  
  // Sort by distance
  distances.sort((a, b) => a.distance - b.distance);
  
  // If very close to a point, return its value
  if (distances[0].distance < 0.0001) {
    return distances[0].value;
  }
  
  // Use nearest 4-8 points for interpolation
  const nearest = distances.slice(0, Math.min(8, distances.length));
  
  // Inverse distance weighting
  let weightedSum = 0;
  let weightTotal = 0;
  
  for (const point of nearest) {
    const weight = 1 / Math.pow(point.distance + 0.0001, power);
    weightedSum += point.value * weight;
    weightTotal += weight;
  }
  
  return weightedSum / weightTotal;
}

/**
 * Bilinear interpolation
 * @param {Array} data - Data points in grid format
 * @param {Number} lat - Target latitude
 * @param {Number} lng - Target longitude
 * @returns {Number} Interpolated value
 */
export function bilinearInterpolate(data, lat, lng) {
  // Find the 4 surrounding grid points
  const lats = [...new Set(data.map(d => d.lat))].sort((a, b) => a - b);
  const lngs = [...new Set(data.map(d => d.lng))].sort((a, b) => a - b);
  
  let lat0Index = lats.findIndex(l => l > lat) - 1;
  let lng0Index = lngs.findIndex(l => l > lng) - 1;
  
  if (lat0Index < 0) lat0Index = 0;
  if (lng0Index < 0) lng0Index = 0;
  if (lat0Index >= lats.length - 1) lat0Index = lats.length - 2;
  if (lng0Index >= lngs.length - 1) lng0Index = lngs.length - 2;
  
  const lat0 = lats[lat0Index];
  const lat1 = lats[lat0Index + 1];
  const lng0 = lngs[lng0Index];
  const lng1 = lngs[lng0Index + 1];
  
  // Get values at 4 corners
  const p00 = data.find(d => d.lat === lat0 && d.lng === lng0)?.value || 0;
  const p10 = data.find(d => d.lat === lat1 && d.lng === lng0)?.value || 0;
  const p01 = data.find(d => d.lat === lat0 && d.lng === lng1)?.value || 0;
  const p11 = data.find(d => d.lat === lat1 && d.lng === lng1)?.value || 0;
  
  // Interpolate
  const xRatio = (lng - lng0) / (lng1 - lng0);
  const yRatio = (lat - lat0) / (lat1 - lat0);
  
  const r0 = p00 * (1 - xRatio) + p01 * xRatio;
  const r1 = p10 * (1 - xRatio) + p11 * xRatio;
  
  return r0 * (1 - yRatio) + r1 * yRatio;
}

/**
 * Normalize data to a specific range
 * @param {Array} data - Data points
 * @param {Number} min - Target minimum value
 * @param {Number} max - Target maximum value
 * @returns {Array} Normalized data
 */
export function normalizeData(data, min = 0, max = 1) {
  if (!data || data.length === 0) return data;
  
  const values = data.map(d => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin;
  
  if (range === 0) return data.map(d => ({ ...d, value: min }));
  
  return data.map(d => ({
    ...d,
    value: min + ((d.value - dataMin) / range) * (max - min),
    originalValue: d.value
  }));
}

/**
 * Filter outliers using statistical methods
 * @param {Array} data - Data points
 * @param {Number} stdDevThreshold - Standard deviation threshold
 * @returns {Array} Filtered data
 */
export function filterOutliers(data, stdDevThreshold = 2) {
  if (!data || data.length === 0) return data;
  
  const values = data.map(d => d.value);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return data.filter(d => 
    Math.abs(d.value - mean) <= stdDevThreshold * stdDev
  );
}

/**
 * Aggregate data by region
 * @param {Array} data - Data points
 * @param {Array} regions - Array of region definitions
 * @returns {Object} Aggregated data by region
 */
export function aggregateByRegion(data, regions) {
  const aggregated = {};
  
  for (const region of regions) {
    const pointsInRegion = data.filter(d =>
      d.lat >= region.minLat &&
      d.lat <= region.maxLat &&
      d.lng >= region.minLng &&
      d.lng <= region.maxLng
    );
    
    if (pointsInRegion.length > 0) {
      const values = pointsInRegion.map(p => p.value);
      aggregated[region.id] = {
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: calculateMedian(values),
        count: values.length,
        stdDev: calculateStdDev(values)
      };
    }
  }
  
  return aggregated;
}

/**
 * Calculate median value
 * @param {Array} values - Array of numbers
 * @returns {Number} Median value
 */
function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

/**
 * Calculate standard deviation
 * @param {Array} values - Array of numbers
 * @returns {Number} Standard deviation
 */
function calculateStdDev(values) {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Downsample data by averaging in grid cells
 * @param {Array} data - Original data
 * @param {Number} factor - Downsampling factor
 * @returns {Array} Downsampled data
 */
export function downsampleData(data, factor = 2) {
  if (!data || data.length === 0 || factor <= 1) return data;
  
  const lats = [...new Set(data.map(d => d.lat))].sort((a, b) => a - b);
  const lngs = [...new Set(data.map(d => d.lng))].sort((a, b) => a - b);
  
  const downsampled = [];
  
  for (let i = 0; i < lats.length; i += factor) {
    for (let j = 0; j < lngs.length; j += factor) {
      const cellData = [];
      
      for (let di = 0; di < factor && i + di < lats.length; di++) {
        for (let dj = 0; dj < factor && j + dj < lngs.length; dj++) {
          const point = data.find(d => 
            d.lat === lats[i + di] && d.lng === lngs[j + dj]
          );
          if (point) cellData.push(point.value);
        }
      }
      
      if (cellData.length > 0) {
        const avgValue = cellData.reduce((sum, v) => sum + v, 0) / cellData.length;
        downsampled.push({
          lat: lats[i],
          lng: lngs[j],
          value: avgValue
        });
      }
    }
  }
  
  return downsampled;
}

/**
 * Apply temporal smoothing to time-series data
 * @param {Array} timeSeriesData - Array of data snapshots over time
 * @param {Number} windowSize - Temporal window size
 * @returns {Array} Temporally smoothed data
 */
export function temporalSmooth(timeSeriesData, windowSize = 3) {
  if (!timeSeriesData || timeSeriesData.length < windowSize) {
    return timeSeriesData;
  }
  
  const smoothed = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let t = 0; t < timeSeriesData.length; t++) {
    const snapshot = timeSeriesData[t];
    const smoothedData = [];
    
    for (const point of snapshot.data) {
      let valueSum = 0;
      let count = 0;
      
      for (let dt = -halfWindow; dt <= halfWindow; dt++) {
        const ti = t + dt;
        if (ti >= 0 && ti < timeSeriesData.length) {
          const otherPoint = timeSeriesData[ti].data.find(
            p => p.lat === point.lat && p.lng === point.lng
          );
          if (otherPoint) {
            valueSum += otherPoint.value;
            count++;
          }
        }
      }
      
      smoothedData.push({
        ...point,
        value: valueSum / count
      });
    }
    
    smoothed.push({
      ...snapshot,
      data: smoothedData
    });
  }
  
  return smoothed;
}