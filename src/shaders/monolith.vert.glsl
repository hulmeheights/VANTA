// ---------------------------------------------------------------------------
// Monolith — vertex stage
// Reproject a per-vertex unit direction onto a superellipsoid whose exponent can
// morph live (sphere ↔ slab), displace it along the surface by a slow breathing
// field, and recompute the normal by finite difference so the breathing surface
// shades correctly (never reuse the static base normal).
// ---------------------------------------------------------------------------

#include ./lib/noise.glsl

uniform float uTime;
uniform float uBreathAmp;     // breath displacement amplitude (world units)
uniform float uMorphExponent; // superellipsoid exponent — form sharpness
uniform vec3  uSize;          // half-extents

attribute vec3 aDir;          // unit-sphere direction per vertex

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vObjPos;
varying float vThickness;      // shared field → thin-film thickness in fragment

// Superellipsoid surface point along direction d, exponent e, half-extents s.
vec3 superPos(vec3 d, float e, vec3 s) {
  vec3 q = abs(d / s);
  float denom = pow(q.x, e) + pow(q.y, e) + pow(q.z, e);
  float k = pow(max(denom, 1e-6), -1.0 / e);
  return d * k;
}

// Analytic superellipsoid normal (gradient of the implicit form) — used as the
// direction to displace along.
vec3 superNormal(vec3 P, float e, vec3 s) {
  vec3 g = vec3(
    sign(P.x) * pow(abs(P.x) / s.x, e - 1.0) / s.x,
    sign(P.y) * pow(abs(P.y) / s.y, e - 1.0) / s.y,
    sign(P.z) * pow(abs(P.z) / s.z, e - 1.0) / s.z
  );
  return normalize(g);
}

// Shared low-frequency breathing field (domain-warped fbm).
float breathField(vec3 p) {
  float t = uTime * 0.08;
  vec3 warp = vec3(
    snoise(p * 0.7 + vec3(0.0, t, 0.0)),
    snoise(p * 0.7 + vec3(5.2, t, 1.3)),
    snoise(p * 0.7 + vec3(1.7, t, 9.2))
  );
  return fbm(p * 1.05 + warp * 0.45 + vec3(0.0, t * 0.5, 0.0));
}

// Point on the breathing surface for a given direction; outputs the field value.
vec3 displaced(vec3 d, out float field) {
  vec3 base = superPos(d, uMorphExponent, uSize);
  float n = breathField(base);
  field = n;
  vec3 nrm = superNormal(base, uMorphExponent, uSize);
  float amp = uBreathAmp * (1.0 + 0.06 * sin(uTime * 0.45));
  return base + nrm * n * amp;
}

void main() {
  float f0;
  vec3 p0 = displaced(aDir, f0);

  // Two tangents in direction-space to finite-difference the displaced surface.
  vec3 up = abs(aDir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(aDir, up));
  vec3 t2 = normalize(cross(aDir, t1));
  float eps = 0.018;
  float fa, fb;
  vec3 pA = displaced(normalize(aDir + t1 * eps), fa);
  vec3 pB = displaced(normalize(aDir + t2 * eps), fb);

  vec3 objNormal = normalize(cross(pA - p0, pB - p0));
  if (dot(objNormal, aDir) < 0.0) objNormal = -objNormal;

  vObjPos = p0;
  vThickness = f0;

  vec4 world = modelMatrix * vec4(p0, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * objNormal);

  gl_Position = projectionMatrix * viewMatrix * world;
}
