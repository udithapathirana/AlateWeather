// backend/src/utils/colorMapper.js

/**
 * Interpolate color based on value and color stops
 * @param {Number} value - Value to map to color
 * @param {Array} colorStops - Array of {value, color} objects
 * @returns {Array} RGBA color array [r, g, b, a]
 */
export function interpolateColor(value, colorStops) {
  if (!colorStops || colorStops.length === 0) {
    return [0, 0, 0, 0];
  }

  // Sort color stops by value
  const sorted = [...colorStops].sort((a, b) => a.value - b.value);

  // Value is below the first stop
  if (value <= sorted[0].value) {
    return sorted[0].color;
  }

  // Value is above the last stop
  if (value >= sorted[sorted.length - 1].value) {
    return sorted[sorted.length - 1].color;
  }

  // Find the two stops to interpolate between
  for (let i = 0; i < sorted.length - 1; i++) {
    const lower = sorted[i];
    const upper = sorted[i + 1];

    if (value >= lower.value && value <= upper.value) {
      // Linear interpolation
      const ratio = (value - lower.value) / (upper.value - lower.value);
      
      return [
        Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * ratio),
        Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * ratio),
        Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * ratio),
        Math.round(lower.color[3] + (upper.color[3] - lower.color[3]) * ratio)
      ];
    }
  }

  return [0, 0, 0, 0];
}

/**
 * Convert RGBA values to hex color string
 * @param {Number} r - Red (0-255)
 * @param {Number} g - Green (0-255)
 * @param {Number} b - Blue (0-255)
 * @param {Number} a - Alpha (0-255)
 * @returns {String} Hex color string
 */
export function rgbaToHex(r, g, b, a = 255) {
  const toHex = (n) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
}

/**
 * Convert hex color string to RGBA object
 * @param {String} hex - Hex color string
 * @returns {Object} {r, g, b, a} object
 */
export function hexToRgba(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: result[4] ? parseInt(result[4], 16) : 255
  } : null;
}

/**
 * Convert RGBA to CSS color string
 * @param {Number} r - Red (0-255)
 * @param {Number} g - Green (0-255)
 * @param {Number} b - Blue (0-255)
 * @param {Number} a - Alpha (0-255)
 * @returns {String} CSS rgba string
 */
export function rgbaToCss(r, g, b, a) {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

/**
 * Get color for value using predefined color scale
 * @param {Number} value - Value to map
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @param {String} colorScale - Color scale name
 * @returns {Array} RGBA color array
 */
export function getColorForValue(value, min, max, colorScale = 'viridis') {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  const colorScales = {
    viridis: [
      [68, 1, 84, 255],
      [59, 82, 139, 255],
      [33, 145, 140, 255],
      [94, 201, 98, 255],
      [253, 231, 37, 255]
    ],
    plasma: [
      [13, 8, 135, 255],
      [126, 3, 168, 255],
      [204, 71, 120, 255],
      [248, 149, 64, 255],
      [240, 249, 33, 255]
    ],
    temperature: [
      [0, 0, 255, 200],      // Cold - Blue
      [0, 255, 255, 200],    // Cool - Cyan
      [0, 255, 0, 200],      // Mild - Green
      [255, 255, 0, 200],    // Warm - Yellow
      [255, 0, 0, 200]       // Hot - Red
    ],
    rain: [
      [255, 255, 255, 0],    // No rain - Transparent
      [200, 200, 255, 100],  // Light rain - Light blue
      [100, 150, 255, 150],  // Moderate rain - Blue
      [50, 100, 255, 200],   // Heavy rain - Dark blue
      [100, 50, 200, 255]    // Very heavy - Purple
    ],
    wind: [
      [255, 255, 200, 50],   // Calm - Light yellow
      [255, 255, 100, 100],  // Light breeze
      [255, 200, 0, 150],    // Moderate wind - Orange
      [255, 100, 0, 200],    // Strong wind
      [255, 0, 0, 255]       // Very strong - Red
    ],
    clouds: [
      [240, 240, 240, 0],    // Clear - Transparent
      [220, 220, 220, 100],  // Partly cloudy
      [180, 180, 180, 150],  // Mostly cloudy
      [140, 140, 140, 200]   // Overcast - Dark gray
    ],
    storm: [
      [139, 0, 139, 0],      // No storm - Transparent
      [139, 0, 139, 100],    // Developing
      [180, 0, 180, 180],    // Active storm
      [220, 0, 220, 255]     // Severe - Bright purple
    ]
  };
  
  const scale = colorScales[colorScale] || colorScales.viridis;
  const index = normalized * (scale.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const ratio = index - lower;
  
  if (lower === upper) {
    return scale[lower];
  }
  
  const lowerColor = scale[lower];
  const upperColor = scale[upper];
  
  return lowerColor.map((c, i) => 
    Math.round(c + (upperColor[i] - c) * ratio)
  );
}

/**
 * Generate gradient array between two colors
 * @param {Array} startColor - Starting RGBA color
 * @param {Array} endColor - Ending RGBA color
 * @param {Number} steps - Number of gradient steps
 * @returns {Array} Array of RGBA colors
 */
export function generateGradient(startColor, endColor, steps = 10) {
  const gradient = [];
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const color = startColor.map((c, index) => 
      Math.round(c + (endColor[index] - c) * ratio)
    );
    gradient.push(color);
  }
  
  return gradient;
}

/**
 * Apply color map to data array
 * @param {Array} data - Data points with 'value' property
 * @param {String} colorScale - Color scale name
 * @returns {Array} Data with added 'color' property
 */
export function applyColorMap(data, colorScale = 'viridis') {
  if (!data || data.length === 0) return data;
  
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return data.map(d => ({
    ...d,
    color: getColorForValue(d.value, min, max, colorScale)
  }));
}

/**
 * Blend two colors
 * @param {Array} color1 - First RGBA color
 * @param {Array} color2 - Second RGBA color
 * @param {Number} ratio - Blend ratio (0-1)
 * @returns {Array} Blended RGBA color
 */
export function blendColors(color1, color2, ratio = 0.5) {
  return color1.map((c, i) => 
    Math.round(c + (color2[i] - c) * ratio)
  );
}

/**
 * Adjust color brightness
 * @param {Array} color - RGBA color
 * @param {Number} factor - Brightness factor (-1 to 1)
 * @returns {Array} Adjusted RGBA color
 */
export function adjustBrightness(color, factor) {
  const adjustment = factor * 255;
  return [
    Math.max(0, Math.min(255, color[0] + adjustment)),
    Math.max(0, Math.min(255, color[1] + adjustment)),
    Math.max(0, Math.min(255, color[2] + adjustment)),
    color[3]
  ];
}

/**
 * Adjust color opacity
 * @param {Array} color - RGBA color
 * @param {Number} opacity - Opacity value (0-1)
 * @returns {Array} Color with adjusted opacity
 */
export function adjustOpacity(color, opacity) {
  return [
    color[0],
    color[1],
    color[2],
    Math.round(opacity * 255)
  ];
}

/**
 * Convert color to grayscale
 * @param {Array} color - RGBA color
 * @returns {Array} Grayscale RGBA color
 */
export function toGrayscale(color) {
  const gray = Math.round(0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]);
  return [gray, gray, gray, color[3]];
}

/**
 * Get complementary color
 * @param {Array} color - RGBA color
 * @returns {Array} Complementary RGBA color
 */
export function getComplementary(color) {
  return [
    255 - color[0],
    255 - color[1],
    255 - color[2],
    color[3]
  ];
}

/**
 * Create heatmap color scheme
 * @param {String} type - Type of heatmap (rain, wind, temperature, etc.)
 * @returns {Array} Array of color stops
 */
export function createHeatmapColorScheme(type) {
  const schemes = {
    rain: [
      { value: 0, color: [0, 0, 0, 0] },
      { value: 0.5, color: [100, 150, 255, 80] },
      { value: 2, color: [50, 100, 255, 150] },
      { value: 5, color: [0, 50, 200, 200] },
      { value: 10, color: [80, 30, 180, 255] }
    ],
    wind: [
      { value: 0, color: [255, 255, 200, 0] },
      { value: 5, color: [255, 255, 100, 100] },
      { value: 10, color: [255, 200, 0, 150] },
      { value: 20, color: [255, 100, 0, 200] },
      { value: 30, color: [255, 0, 0, 255] }
    ],
    temperature: [
      { value: -20, color: [0, 0, 255, 200] },
      { value: -5, color: [100, 100, 255, 200] },
      { value: 0, color: [0, 200, 255, 200] },
      { value: 10, color: [0, 255, 100, 200] },
      { value: 20, color: [255, 255, 0, 200] },
      { value: 30, color: [255, 100, 0, 200] },
      { value: 40, color: [255, 0, 0, 200] }
    ],
    clouds: [
      { value: 0, color: [240, 240, 240, 0] },
      { value: 30, color: [220, 220, 220, 80] },
      { value: 60, color: [180, 180, 180, 140] },
      { value: 100, color: [140, 140, 140, 200] }
    ],
    storm: [
      { value: 0, color: [139, 0, 139, 0] },
      { value: 30, color: [139, 0, 139, 120] },
      { value: 60, color: [180, 0, 180, 200] },
      { value: 100, color: [220, 0, 220, 255] }
    ]
  };
  
  return schemes[type] || schemes.temperature;
}