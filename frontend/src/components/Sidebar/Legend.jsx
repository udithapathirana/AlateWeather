// frontend/src/components/Sidebar/Legend.jsx
import React from 'react';

const LEGEND_DATA = {
  rain: {
    label: 'Precipitation',
    colors: ['#0064ff', '#00c8ff', '#64ffff'],
    values: ['0mm', '10mm', '20mm+']
  },
  wind: {
    label: 'Wind Speed',
    colors: ['#ffff64', '#ffc800', '#ff6400'],
    values: ['0 m/s', '15 m/s', '30 m/s+']
  },
  temperature: {
    label: 'Temperature',
    colors: ['#0000ff', '#00ff00', '#ffff00', '#ff0000'],
    values: ['-10°C', '10°C', '25°C', '40°C+']
  },
  clouds: {
    label: 'Cloud Cover',
    colors: ['#cccccc40', '#cccccc80', '#ccccccc0'],
    values: ['0%', '50%', '100%']
  },
  storm: {
    label: 'Storm Intensity',
    colors: ['#8b008b', '#c800c8', '#ff00ff'],
    values: ['Low', 'Medium', 'High']
  }
};

const Legend = ({ activeFilters }) => {
  const activeLayers = Object.entries(activeFilters)
    .filter(([_, active]) => active)
    .map(([key]) => key);

  if (activeLayers.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Legend</h2>
      <div className="space-y-4">
        {activeLayers.map(layer => {
          const data = LEGEND_DATA[layer];
          if (!data) return null;

          return (
            <div key={layer} className="bg-gray-900 p-4 rounded-lg">
              <div className="font-semibold text-sm mb-2">{data.label}</div>
              <div className="space-y-2">
                {data.colors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-6 h-4 rounded border border-gray-700"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-gray-400">{data.values[index]}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Legend;