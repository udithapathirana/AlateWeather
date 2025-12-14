// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import MapContainer from './components/Map/MapContainer';
import CountrySelector from './components/Sidebar/CountrySelector';
import LayerControls from './components/Sidebar/LayerControls';
import TimelineSlider from './components/Sidebar/TimelineSlider';
import Legend from './components/Sidebar/Legend';
import { LoadingSpinner } from './components/UI/LoadingSpinner';
import { ErrorMessage } from './components/UI/ErrorMessage';
import useWeatherData from './hooks/useWeatherData';
import { CloudRain } from 'lucide-react';

function App() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    rain: false,
    wind: true,
    temperature: false,
    clouds: false,
    storm: false
  });
  const [showWindParticles, setShowWindParticles] = useState(true);
  const [timelineHour, setTimelineHour] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const { weatherData, loading, error, refetch } = useWeatherData(
    selectedCountry,
    activeFilters
  );

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
  };

  const toggleFilter = (filter) => {
    setActiveFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  };

  const handleTimelineChange = (hour) => {
    setTimelineHour(hour);
  };

  return (
    <div className="flex h-screen bg-[#0a0e1a] text-white overflow-hidden">
      {/* Modern Sidebar */}
      <div className="w-80 bg-[#0f1419] flex flex-col border-r border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-center">
          <img 
            src="/logo.png" 
            alt="Alate Weather" 
           className="w-full h-full object-contain"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <CountrySelector 
            selectedCountry={selectedCountry}
            onSelectCountry={handleCountrySelect}
          />

          {selectedCountry && (
            <>
              <LayerControls 
                activeFilters={activeFilters}
                onToggleFilter={toggleFilter}
                showWindParticles={showWindParticles}
                onToggleWindParticles={() => setShowWindParticles(!showWindParticles)}
              />

              <TimelineSlider
                currentHour={timelineHour}
                maxHours={6}
                onHourChange={handleTimelineChange}
              />

              <Legend activeFilters={activeFilters} />
            </>
          )}

          {loading && (
            <div className="bg-gray-850 rounded-lg p-4">
              <LoadingSpinner message="Loading weather data..." />
            </div>
          )}

          {error && (
            <ErrorMessage message={error} onRetry={refetch} />
          )}

          {/* Info Card */}
          <div className="bg-gradient-to-br from-gray-850 to-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 text-white text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live Data
            </h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Select region to view weather</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Toggle layers to customize view</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Zoom and pan to explore</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Wind particles show real-time flow</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0a0e14]">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Powered by OpenWeather</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {!selectedCountry ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a]">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CloudRain className="w-12 h-12 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Select a Region
              </h2>
              <p className="text-gray-500">
                Choose a country from the sidebar to view weather data
              </p>
            </div>
          </div>
        ) : (
          <MapContainer
            country={selectedCountry}
            activeFilters={activeFilters}
            weatherData={weatherData}
            showWindParticles={showWindParticles}
            timelineHour={timelineHour}
            onMapReady={() => setMapReady(true)}
          />
        )}
      </div>
    </div>
  );
}

export default App;