// frontend/src/utils/windVectors.js
export const calculateWindDirection = (u, v) => {
  return (Math.atan2(v, u) * 180 / Math.PI + 360) % 360;
};

export const calculateWindSpeed = (u, v) => {
  return Math.sqrt(u * u + v * v);
};

export const windComponentsFromSpeedDirection = (speed, direction) => {
  const radians = (270 - direction) * (Math.PI / 180);
  return {
    u: speed * Math.cos(radians),
    v: speed * Math.sin(radians)
  };
};