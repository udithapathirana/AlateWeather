// frontend/src/components/Map/MapControls.jsx
import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RefreshCw, 
  Locate,
  Layers
} from 'lucide-react';

const MapControls = ({ 
  map, 
  onZoomIn, 
  onZoomOut, 
  onReset, 
  onRefresh,
  onLocate,
  showLayerToggle = false,
  onToggleLayers
}) => {
  const handleZoomIn = () => {
    if (map) {
      map.zoomIn();
    }
    if (onZoomIn) onZoomIn();
  };

  const handleZoomOut = () => {
    if (map) {
      map.zoomOut();
    }
    if (onZoomOut) onZoomOut();
  };

  const handleReset = () => {
    if (map) {
      map.flyTo({
        zoom: 5,
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
    }
    if (onReset) onReset();
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
  };

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (map) {
            map.flyTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: 10,
              duration: 2000
            });
          }
          if (onLocate) onLocate(position);
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      {/* Zoom In */}
      <button
        onClick={handleZoomIn}
        className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg shadow-lg transition-all hover:scale-105"
        title="Zoom In"
      >
        <ZoomIn className="w-5 h-5 text-white" />
      </button>

      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg shadow-lg transition-all hover:scale-105"
        title="Zoom Out"
      >
        <ZoomOut className="w-5 h-5 text-white" />
      </button>

      {/* Reset View */}
      <button
        onClick={handleReset}
        className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg shadow-lg transition-all hover:scale-105"
        title="Reset View"
      >
        <Maximize className="w-5 h-5 text-white" />
      </button>

      {/* Refresh Data */}
      <button
        onClick={handleRefresh}
        className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg shadow-lg transition-all hover:scale-105"
        title="Refresh Weather Data"
      >
        <RefreshCw className="w-5 h-5 text-white" />
      </button>

      {/* Locate Me */}
      <button
        onClick={handleLocate}
        className="bg-green-600 hover:bg-green-700 p-3 rounded-lg shadow-lg transition-all hover:scale-105"
        title="My Location"
      >
        <Locate className="w-5 h-5 text-white" />
      </button>

      {/* Layer Toggle (optional) */}
      {showLayerToggle && (
        <button
          onClick={onToggleLayers}
          className="bg-purple-600 hover:bg-purple-700 p-3 rounded-lg shadow-lg transition-all hover:scale-105"
          title="Toggle Layers"
        >
          <Layers className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
};

export default MapControls;