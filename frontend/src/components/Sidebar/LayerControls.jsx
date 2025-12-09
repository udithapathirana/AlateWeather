// frontend/src/components/Sidebar/LayerControls.jsx
import React from 'react';
import { Droplets, Wind, Thermometer, Cloud, Zap, Eye, EyeOff } from 'lucide-react';

const LAYERS = [
  { key: 'rain', icon: Droplets, label: 'Precipitation', color: 'text-blue-400' },
  { key: 'wind', icon: Wind, label: 'Wind Speed', color: 'text-yellow-400' },
  { key: 'temperature', icon: Thermometer, label: 'Temperature', color: 'text-red-400' },
  { key: 'clouds', icon: Cloud, label: 'Cloud Cover', color: 'text-gray-400' },
  { key: 'storm', icon: Zap, label: 'Storm Activity', color: 'text-purple-400' }
];

const LayerControls = ({ activeFilters, onToggleFilter, showWindParticles, onToggleWindParticles }) => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Weather Layers</h2>
      <div className="space-y-2">
        {LAYERS.map(({ key, icon: Icon, label, color }) => (
          <button
            key={key}
            onClick={() => onToggleFilter(key)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
              activeFilters[key] 
                ? 'bg-gray-700 border-2 border-blue-500' 
                : 'bg-gray-900 border-2 border-gray-700 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="font-medium">{label}</span>
            </div>
            {activeFilters[key] ? (
              <Eye className="w-4 h-4 text-blue-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-500" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 p-4 bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-cyan-400" />
            <span className="font-medium">Wind Particles</span>
          </div>
          <button
            onClick={onToggleWindParticles}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              showWindParticles
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {showWindParticles ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Animated particles showing wind direction and speed
        </p>
      </div>
    </div>
  );
};

export default LayerControls;