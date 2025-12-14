// frontend/src/components/Sidebar/LayerControls.jsx
import React from 'react';
import { CloudRain, Wind, Thermometer, Cloud, Zap, Eye } from 'lucide-react';

const LAYERS = [
  { id: 'rain', name: 'Precipitation', icon: CloudRain, color: '#3b82f6' },
  { id: 'wind', name: 'Wind Speed', icon: Wind, color: '#f59e0b' },
  { id: 'temperature', name: 'Temperature', icon: Thermometer, color: '#ef4444' },
  { id: 'clouds', name: 'Cloud Cover', icon: Cloud, color: '#9ca3af' },
  { id: 'storm', name: 'Storm Activity', icon: Zap, color: '#8b5cf6' }
];

const LayerControls = ({ 
  activeFilters, 
  onToggleFilter,
  showWindParticles,
  onToggleWindParticles
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-white mb-4">Weather Layers</h3>
      
      <div className="space-y-2">
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeFilters[layer.id];
          
          return (
            <button
              key={layer.id}
              onClick={() => onToggleFilter(layer.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                ${isActive
                  ? 'bg-gray-800 border-l-4'
                  : 'bg-gray-850 hover:bg-gray-800'
                }
              `}
              style={{
                borderLeftColor: isActive ? layer.color : 'transparent'
              }}
            >
              <div 
                className={`
                  p-2 rounded-lg transition-all
                  ${isActive ? 'bg-opacity-20' : 'bg-gray-800'}
                `}
                style={{
                  backgroundColor: isActive ? `${layer.color}30` : undefined
                }}
              >
                <Icon 
                  className="w-4 h-4"
                  style={{ color: isActive ? layer.color : '#9ca3af' }}
                />
              </div>
              
              <span className={`text-sm font-medium flex-1 text-left ${
                isActive ? 'text-white' : 'text-gray-400'
              }`}>
                {layer.name}
              </span>
              
              <div className={`
                w-10 h-5 rounded-full transition-all relative
                ${isActive ? 'bg-blue-500' : 'bg-gray-700'}
              `}>
                <div className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white
                  transition-all duration-200
                  ${isActive ? 'right-0.5' : 'left-0.5'}
                `} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Wind Particles Toggle */}
      <div className="pt-4 border-t border-gray-800">
        <button
          onClick={onToggleWindParticles}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-lg
            transition-all duration-200
            ${showWindParticles
              ? 'bg-gray-800 border-l-4 border-cyan-400'
              : 'bg-gray-850 hover:bg-gray-800'
            }
          `}
        >
          <div 
            className={`
              p-2 rounded-lg transition-all
              ${showWindParticles ? 'bg-cyan-400 bg-opacity-20' : 'bg-gray-800'}
            `}
          >
            <Eye 
              className="w-4 h-4"
              style={{ color: showWindParticles ? '#22d3ee' : '#9ca3af' }}
            />
          </div>
          
          <span className={`text-sm font-medium flex-1 text-left ${
            showWindParticles ? 'text-white' : 'text-gray-400'
          }`}>
            Wind Particles
          </span>
          
          <div className={`
            w-10 h-5 rounded-full transition-all relative
            ${showWindParticles ? 'bg-cyan-500' : 'bg-gray-700'}
          `}>
            <div className={`
              absolute top-0.5 w-4 h-4 rounded-full bg-white
              transition-all duration-200
              ${showWindParticles ? 'right-0.5' : 'left-0.5'}
            `} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default LayerControls;