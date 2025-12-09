// frontend/src/hooks/useTimeline.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { weatherAPI } from '../services/api';

const useTimeline = (country, maxHours = 6) => {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [timeline, setTimeline] = useState([]);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  // Fetch forecast timeline
  const fetchTimeline = useCallback(async () => {
    if (!country) return;

    setLoading(true);

    try {
      const response = await weatherAPI.getForecastTimeline(
        country.code,
        maxHours
      );

      if (response.success) {
        setTimeline(response.data.timeline);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
      // Generate fallback timeline
      const fallbackTimeline = [];
      for (let i = 0; i <= maxHours; i++) {
        const timestamp = new Date(Date.now() + i * 3600000);
        fallbackTimeline.push({
          timestamp: timestamp.toISOString(),
          hour: i,
          label: i === 0 ? 'Now' : `+${i}h`,
          dataAvailable: true
        });
      }
      setTimeline(fallbackTimeline);
    } finally {
      setLoading(false);
    }
  }, [country, maxHours]);

  // Initialize timeline
  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Play/pause animation
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / speed;
      
      intervalRef.current = setInterval(() => {
        setCurrentHour(prev => {
          const next = prev + 1;
          if (next > maxHours) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, maxHours]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Go to specific hour
  const goToHour = useCallback((hour) => {
    setCurrentHour(Math.max(0, Math.min(maxHours, hour)));
  }, [maxHours]);

  // Go to next hour
  const nextHour = useCallback(() => {
    setCurrentHour(prev => Math.min(maxHours, prev + 1));
  }, [maxHours]);

  // Go to previous hour
  const previousHour = useCallback(() => {
    setCurrentHour(prev => Math.max(0, prev - 1));
  }, []);

  // Reset to current time
  const reset = useCallback(() => {
    setCurrentHour(0);
    setIsPlaying(false);
  }, []);

  // Change playback speed
  const changeSpeed = useCallback((newSpeed) => {
    setSpeed(newSpeed);
  }, []);

  // Get current frame data
  const getCurrentFrame = useCallback(() => {
    if (timeline.length === 0) return null;
    return timeline[currentHour];
  }, [timeline, currentHour]);

  // Get frame label
  const getFrameLabel = useCallback(() => {
    const frame = getCurrentFrame();
    return frame ? frame.label : 'Now';
  }, [getCurrentFrame]);

  // Get progress percentage
  const getProgress = useCallback(() => {
    return (currentHour / maxHours) * 100;
  }, [currentHour, maxHours]);

  // Fetch forecast data for current hour
  const fetchForecastForHour = useCallback(async (hour) => {
    if (!country) return;

    try {
      // In a real application, you would fetch specific forecast data here
      // For now, we'll use the current weather data
      const response = await weatherAPI.getCountryWeather(
        country.code,
        ['rain', 'wind', 'temperature']
      );

      if (response.success) {
        setForecastData(response.data);
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
    }
  }, [country]);

  // Update forecast when hour changes
  useEffect(() => {
    fetchForecastForHour(currentHour);
  }, [currentHour, fetchForecastForHour]);

  return {
    currentHour,
    maxHours,
    isPlaying,
    speed,
    timeline,
    forecastData,
    loading,
    togglePlayPause,
    goToHour,
    nextHour,
    previousHour,
    reset,
    changeSpeed,
    getCurrentFrame,
    getFrameLabel,
    getProgress,
    refetch: fetchTimeline
  };
};

export default useTimeline;