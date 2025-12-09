// frontend/src/components/Sidebar/TimelineSlider.jsx
import React from 'react';
import { Clock, Play, Pause } from 'lucide-react';

const TimelineSlider = ({ currentHour, maxHours, onHourChange }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onHourChange((currentHour + 1) % (maxHours + 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentHour, maxHours, onHourChange]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-5 h-5 text-green-400" />
        Forecast Timeline
      </h2>
      
      <div className="bg-gray-900 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm">
            <div className="text-gray-400">Current Time</div>
            <div className="text-xl font-bold text-white">
              {currentHour === 0 ? 'Now' : `+${currentHour}h`}
            </div>
          </div>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-green-600 hover:bg-green-700 rounded-lg transition"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
        </div>

        <input
          type="range"
          min="0"
          max={maxHours}
          value={currentHour}
          onChange={(e) => onHourChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />

        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Now</span>
          <span>+{maxHours}h</span>
        </div>
      </div>
    </div>
  );
};

export default TimelineSlider;