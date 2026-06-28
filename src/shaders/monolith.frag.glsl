// ---------------------------------------------------------------------------
// Monolith — fragment stage
// A near-black graphite slab read almost entirely by ONE sodium light:
//   (a) dark albedo with a faint vertical gradient,
//   (b) spatially varying roughness — broad faces near-mirror, flanks satin,
//   (c) anisotropic GGX so the highlight is a vertical streak, not a dot,
//   (d) a fresnel-gated thin-film rim, tinted to the accent, living only on the edge,
//   (e) per-fragment height fog so the base dissolves into the floor.
// Outputs LINEAR colour into the postprocessing chain; under -DPREVIEW it tonemaps
// itself so the scene is viewable before the composer is wired.
// ---------------------------------------------------------------------------

#include ./lib/noise.glsl

uniform vec3  uLightDir;       // direction TO the light (world space)
uniform vec3  uLightColor;
uniform float uLightIntensity;
uniform vec3  uAccent;
uniform vec3  uAlbedo;
uniform vec3  uFogColor;
uniform float uFogDensity;
uniform float uTime;
uniform float uFresnelPower;
uniform float uIriFreq;
uniform float uIriStrength;
uniform float uIriSat;
uniform float uRoughLow;
uniform float uRoughHigh;
uniform float uAniso;
uniform float uExposure;
uniform float uAmbient;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vObjPos;
varying float vThickness;

const float PI = 3.141592653589793;

float D_GGX_aniso(float NoH, float HoX, float HoY, float ax, float ay) {
  float d = HoX * HoX / (ax * ax) + HoY * HoY / (ay * ay) + NoH * NoH;
  return 1.0 / (PI * ax * ay * d * d);
}
float V_Smith(float NoV, float NoL, float a) {
  float k = a * a * 0.5;
  float gv = NoL * (NoV * (1.0 - k) + k);
  float gl = NoV * (NoL * (1.0 - k) + k);
  return 0.5 / max(gv + gl, 1e-5);
}
vec3 F_Schlick(float VoH, vec3 f0) {
  return f0 + (1.0 - f0) * pow(1.0 - VoH, 5.0);
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uLightDir);
  vec3 H = normalize(L + V);

  float NoV = max(dot(N, V), 1e-4);
  float NoL = max(dot(N, L), 0.0);
  float NoH = max(dot(N, H), 0.0);
  float VoH = max(dot(V, H), 0.0);

  // Spatial roughness: broad faces near-mirror, flanks satin.
  float rn = fbm(vObjPos * 2.4 + 11.3);
  float rough = mix(uRoughLow, uRoughHigh, smoothstep(-0.45, 0.6, rn));
  float a = max(rough * rough, 1e-3);

  // Anisotropy along the object's vertical → vertical streak highlight.
  vec3 T = normalize(vec3(0.0, 1.0, 0.0) - N * dot(N, vec3(0.0, 1.0, 0.0)));
  vec3 B = normalize(cross(N, T));
  float ax = a * (1.0 + uAniso);
  float ay = a / (1.0 + uAniso);

  vec3 f0 = mix(vec3(0.04), uAlbedo + 0.18, 0.55); // dark, slightly metallic
  float D = D_GGX_aniso(NoH, dot(H, T), dot(H, B), ax, ay);
  float Vis = V_Smith(NoV, NoL, a);
  vec3 F = F_Schlick(VoH, f0);
  vec3 spec = D * Vis * F * NoL * uLightColor * uLightIntensity;

  // Hemispheric ambient — a whisper of cool from above, warm-dark from below —
  // gives the broad face faint volume instead of a flat void.
  float hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(vec3(0.04, 0.032, 0.024), vec3(0.05, 0.06, 0.085), hemi) * uAmbient;

  // Dark diffuse term.
  vec3 diff = uAlbedo * (0.6 * NoL) * uLightColor;

  // Thin-film fresnel rim — predominantly sodium, with a faint interference shift
  // only at extreme grazing. Lives on the silhouette edge, and is gated by the
  // light so it reads as an edge catching light, not a uniform neon outline.
  float fres = pow(1.0 - NoV, uFresnelPower);
  float thick = 0.55 + 0.5 * vThickness + 0.12 * sin(uTime * 0.3);
  // Narrow RGB phase spread keeps the chroma subtle rather than full-rainbow.
  vec3 iri = 0.5 + 0.5 * cos(uIriFreq * thick * vec3(1.0, 1.1, 1.22));
  iri = mix(vec3(dot(iri, vec3(0.3333))), iri, uIriSat); // desaturate toward grey
  vec3 rimCol = uAccent * (0.6 + 0.9 * iri);             // then carry it on the accent
  float rimLight = mix(0.12, 1.0, smoothstep(-0.55, 0.7, dot(N, L)));
  vec3 rim = fres * rimCol * uIriStrength * rimLight;

  // Faint vertical gradient on the base albedo.
  float grad = smoothstep(-1.7, 1.7, vObjPos.y);
  vec3 baseCol = uAlbedo * (0.5 + 0.5 * grad);

  vec3 color = baseCol * 0.4 + ambient + diff + spec + rim;
  color *= uExposure;

  // Per-fragment exponential height fog (denser low) → base melts into the floor.
  float dist = length(cameraPosition - vWorldPos);
  float fog = 1.0 - exp(-uFogDensity * dist);
  fog += (0.5 - smoothstep(-2.2, 1.2, vWorldPos.y)) * 0.18;
  fog = clamp(fog, 0.0, 1.0);
  color = mix(color, uFogColor, fog);

#ifdef PREVIEW
  color = aces(color);
  color = pow(color, vec3(1.0 / 2.2));
#endif

  gl_FragColor = vec4(color, 1.0);
}
