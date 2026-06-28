import { Effect } from 'postprocessing'
import { Uniform, Color } from 'three'

// Custom postprocessing effect — the film grade. Single-sample operations only
// (so it merges into the shared EffectPass): a gentle split-tone (warm shadows,
// neutral-cool highlights), a soft vignette to hold the negative space, and
// animated monochrome grain. ACES tonemapping runs just before this in the chain.

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uGrain;
uniform float uVignette;
uniform vec3  uLift;
uniform vec3  uGain;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;

  // Split-tone: lift the shadows slightly warm, keep highlights neutral-cool.
  c = c * uGain + uLift * (1.0 - c);

  // Vignette — squared radial falloff, zero at centre.
  vec2 q = uv - 0.5;
  float r = dot(q, q);
  float vig = 1.0 - uVignette * smoothstep(0.1, 0.75, r);
  c *= vig;

  // Animated monochrome film grain — scaled by luma so deep blacks stay clean.
  float g = hash21(uv * resolution.xy + fract(uTime) * 1000.0) - 0.5;
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  c += g * uGrain * (0.3 + 0.7 * sqrt(luma));

  outputColor = vec4(c, inputColor.a);
}
`

export interface GradeOptions {
  grain?: number
  vignette?: number
}

export class GradeEffect extends Effect {
  constructor({ grain = 0.045, vignette = 0.5 }: GradeOptions = {}) {
    super('GradeEffect', fragmentShader, {
      uniforms: new Map<string, Uniform<number | Color>>([
        ['uTime', new Uniform(0)],
        ['uGrain', new Uniform(grain)],
        ['uVignette', new Uniform(vignette)],
        ['uLift', new Uniform(new Color(0.004, 0.003, 0.0015))],
        ['uGain', new Uniform(new Color(1.0, 0.99, 0.965))],
      ]),
    })
  }

  override update(_renderer: unknown, _input: unknown, deltaTime: number): void {
    const t = this.uniforms.get('uTime') as Uniform<number>
    t.value += deltaTime
  }
}
