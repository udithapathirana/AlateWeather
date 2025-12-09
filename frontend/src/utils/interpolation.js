// frontend/src/utils/interpolation.js
export const bilinearInterpolate = (p00, p10, p01, p11, x, y) => {
  const r0 = p00 * (1 - x) + p10 * x;
  const r1 = p01 * (1 - x) + p11 * x;
  return r0 * (1 - y) + r1 * y;
};

export const interpolateVector = (v1, v2, t) => {
  return {
    u: v1.u + (v2.u - v1.u) * t,
    v: v1.v + (v2.v - v1.v) * t
  };
};