// frontend/src/utils/colorMaps.js
export const getColorForValue = (value, layer) => {
  const colorMaps = {
    rain: [
      { value: 0, color: [0, 0, 0, 0] },
      { value: 1, color: [0, 100, 255, 100] },
      { value: 10, color: [0, 200, 255, 200] },
      { value: 20, color: [100, 50, 255, 255] }
    ],
    wind: [
      { value: 0, color: [255, 255, 100, 0] },
      { value: 15, color: [255, 200, 0, 150] },
      { value: 30, color: [255, 0, 0, 255] }
    ],
    temperature: [
      { value: -10, color: [0, 0, 255, 200] },
      { value: 15, color: [0, 255, 0, 200] },
      { value: 40, color: [255, 0, 0, 200] }
    ]
  };

  const map = colorMaps[layer] || colorMaps.temperature;
  
  for (let i = 0; i < map.length - 1; i++) {
    if (value >= map[i].value && value <= map[i + 1].value) {
      const ratio = (value - map[i].value) / (map[i + 1].value - map[i].value);
      return map[i].color.map((c, idx) => 
        Math.round(c + (map[i + 1].color[idx] - c) * ratio)
      );
    }
  }
  
  return map[map.length - 1].color;
};