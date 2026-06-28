// Fog billboard — fragment. Soft radial card with animated fbm density, additively
// blended so it reads as luminous haze. Warms toward the key light so the fog pools
// where the sodium light is, dark elsewhere. Cheap stand-in for true volumetrics.

#include ./lib/noise.glsl

uniform float uTime;
uniform vec3  uColor;     // base cool haze
uniform vec3  uWarm;      // pooled warmth near the light
uniform vec3  uLightPos;  // world-space light position
uniform float uOpacity;
uniform float uScale;
uniform vec2  uSeed;      // per-layer offset/phase
uniform float uDrift;

varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  // Radial falloff removes the hard quad edge.
  vec2 p = vUv - 0.5;
  float mask = smoothstep(0.5, 0.02, length(p));
  mask *= mask;

  // Animated, domain-warped cloud density.
  vec3 q = vec3(vUv * uScale + uSeed, uTime * uDrift);
  float warp = snoise(q * 0.6);
  float n = fbm(q + warp * 0.4);
  n = smoothstep(-0.15, 0.8, n * 0.5 + 0.5);

  float a = mask * n * uOpacity;

  // Pool warmth near the light.
  float d = distance(vWorldPos, uLightPos);
  float warm = exp(-d * 0.24);
  vec3 col = mix(uColor, uWarm, clamp(warm, 0.0, 1.0));

  gl_FragColor = vec4(col * a, a);
}
