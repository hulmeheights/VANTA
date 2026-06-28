import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

// VANTA — Vite config.
// glsl() lets us author shaders in .glsl/.vert/.frag files with #include support,
// so the noise library lives in one place (src/shaders/lib/noise.glsl).
export default defineConfig({
  plugins: [
    // Author shaders in .glsl/.vert/.frag with #include support.
    glsl(),
  ],
  server: {
    host: true,
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0, // never inline fonts; keep them as cacheable files
  },
})
