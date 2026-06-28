// Fog billboard — vertex. Passes uv and world position; the mesh is oriented to
// face the camera each frame (see Fog.ts), so these are camera-facing haze cards.

varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
