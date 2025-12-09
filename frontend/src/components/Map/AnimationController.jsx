// frontend/src/components/Map/AnimationController.jsx
import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Settings } from 'lucide-react';

const AnimationController = ({ 
  isPlaying, 
  onPlayPause, 
  currentFrame,
  totalFrames,
  onFrameChange,
  speed = 1,
  onSpeedChange
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(speed);

  useEffect(() => {
    if (onSpeedChange) {
      onSpeedChange(animationSpeed);
    }
  }, [animationSpeed, onSpeedChange]);

  const handlePrevFrame = () => {
    const newFrame = currentFrame > 0 ? currentFrame - 1 : totalFrames - 1;
    if (onFrameChange) onFrameChange(newFrame);
  };

  const handleNextFrame = () => {
    const newFrame = currentFrame < totalFrames - 1 ? currentFrame + 1 : 0;
    if (onFrameChange) onFrameChange(newFrame);
  };

  const handleSliderChange = (e) => {
    const frame = parseInt(e.target.value);
    if (onFrameChange) onFrameChange(frame);
  };

  const speedOptions = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' }
  ];

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-95 rounded-lg shadow-2xl p-4 min-w-96">
      {/* Main Controls */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <button
          onClick={handlePrevFrame}
          className="p-2 hover:bg-gray-700 rounded transition"
          title="Previous Frame"
        >
          <SkipBack className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={onPlayPause}
          className={`p-3 rounded-lg transition ${
            isPlaying 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white" />
          )}
        </button>

        <button
          onClick={handleNextFrame}
          className="p-2 hover:bg-gray-700 rounded transition"
          title="Next Frame"
        >
          <SkipForward className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded transition ${
            showSettings ? 'bg-gray-700' : 'hover:bg-gray-700'
          }`}
          title="Settings"
        >
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Timeline Slider */}
      <div className="mb-2">
        <input
          type="range"
          min="0"
          max={totalFrames - 1}
          value={currentFrame}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentFrame / (totalFrames - 1)) * 100}%, #374151 ${(currentFrame / (totalFrames - 1)) * 100}%, #374151 100%)`
          }}
        />
      </div>

      {/* Frame Info */}
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>Frame {currentFrame + 1} of {totalFrames}</span>
        <span>{animationSpeed}x Speed</span>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="mb-2">
            <label className="text-sm text-gray-400 block mb-2">
              Animation Speed
            </label>
            <div className="flex gap-2">
              {speedOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setAnimationSpeed(option.value)}
                  className={`px-3 py-1 rounded text-sm transition ${
                    animationSpeed === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimationController;