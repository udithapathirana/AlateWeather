import React, { useState, useEffect } from 'react';
import MapContainer from './components/Map/MapContainer';
import CountrySelector from './components/Sidebar/CountrySelector';
import LayerControls from './components/Sidebar/LayerControls';
import TimelineSlider from './components/Sidebar/TimelineSlider';
import Legend from './components/Sidebar/Legend';
import { LoadingSpinner } from './components/UI/LoadingSpinner';
import { ErrorMessage } from './components/UI/ErrorMessage';
import useWeatherData from './hooks/useWeatherData';

import { Cloud } from 'lucide-react';

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
    // Future forecast fetch can go here
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 flex flex-col border-r border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="w-6 h-6 text-blue-400" />
            Weather Heatmap
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Real-time weather visualization with dynamic heatmaps
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            <div className="bg-gray-900 rounded-lg p-4">
              <LoadingSpinner message="Loading weather data..." />
            </div>
          )}

          {error && (
            <ErrorMessage message={error} onRetry={refetch} />
          )}

          <div className="bg-gray-900 p-4 rounded-lg text-sm">
            <h3 className="font-semibold mb-2 text-blue-400">💡 How to Use</h3>
            <ul className="space-y-1 text-gray-400">
              <li>• Select a country to start</li>
              <li>• Toggle weather layers</li>
              <li>• Drag to pan, scroll to zoom</li>
              <li>• Watch wind particles move</li>
              <li>• Use timeline for forecast</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {!selectedCountry ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Cloud className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-400 mb-2">
                Select a Country
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
