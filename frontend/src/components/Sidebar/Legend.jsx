// frontend/src/components/Sidebar/Legend.jsx
import React from 'react';

const LEGEND_DATA = {
  rain: {
    name: 'Precipitation',
    unit: 'mm/h',
    gradient: 'linear-gradient(to right, rgba(33,102,172,0.3), rgba(67,147,195,0.5), rgba(103,169,207,0.8), rgba(5,52,112,0.9))',
    min: '0',
    max: '50+'
  },
  wind: {
    name: 'Wind Speed',
    unit: 'm/s',
    gradient: 'linear-gradient(to right, rgba(255,255,178,0.3), rgba(254,204,92,0.5), rgba(253,141,60,0.7), rgba(240,59,32,0.8), rgba(189,0,38,0.9))',
    min: '0',
    max: '40+'
  },
  temperature: {
    name: 'Temperature',
    unit: '°C',
    gradient: 'linear-gradient(to right, rgba(69,117,180,0.5), rgba(116,173,209,0.6), rgba(254,224,144,0.7), rgba(244,109,67,0.8), rgba(215,48,39,0.9))',
    min: '-10',
    max: '40+'
  },
  clouds: {
    name: 'Cloud Cover',
    unit: '%',
    gradient: 'linear-gradient(to right, rgba(247,247,247,0.3), rgba(204,204,204,0.5), rgba(150,150,150,0.7), rgba(82,82,82,0.8))',
    min: '0',
    max: '100'
  },
  storm: {
    name: 'Storm Activity',
    unit: 'index',
    gradient: 'linear-gradient(to right, rgba(158,1,66,0.3), rgba(213,62,79,0.5), rgba(244,109,67,0.7), rgba(254,224,139,0.9))',
    min: '0',
    max: '100'
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
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-white mb-4">Legend</h3>
      
      <div className="space-y-4">
        {activeLayers.map((layerId) => {
          const legend = LEGEND_DATA[layerId];
          if (!legend) return null;

          return (
            <div key={layerId} className="bg-gray-850 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-white">
                {legend.name}
              </div>
              
              <div className="relative h-3 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-0"
                  style={{ background: legend.gradient }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-400">
                <span>{legend.min} {legend.unit}</span>
                <span>{legend.max} {legend.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Legend;