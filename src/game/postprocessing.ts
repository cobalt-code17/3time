import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { TimelineId } from './types';

const ChronoGlitchDistortionShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uSeed: { value: 1 },
    uEraColor: { value: new THREE.Color(0x10b981) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uSeed;
    uniform vec3 uEraColor;
    varying vec2 vUv;

    float hash11(float p) {
      p = fract(p * 0.1031);
      p *= p + 33.33;
      p *= p + p;
      return fract(p);
    }

    float hash21(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;

      if (uIntensity <= 0.001) {
        gl_FragColor = texture2D(tDiffuse, uv);
        return;
      }

      float strength = clamp(uIntensity, 0.0, 1.0);
      float burst = strength * strength;

      // 1. Expanding radial shockwave & lens warp distortion
      vec2 centered = uv - 0.5;
      float dist = length(centered);
      vec2 dir = dist > 0.0001 ? centered / dist : vec2(0.0);

      float waveRadius = (1.0 - strength) * 0.85;
      float ringMask = exp(-pow((dist - waveRadius) * 7.5, 2.0));
      float ripple = sin(dist * 34.0 - uTime * 28.0) * 0.018 * strength;
      float barrel = -0.11 * burst * dist * dist;

      vec2 warpedUv = uv + dir * (ripple + ringMask * 0.042 * strength + barrel);

      // 2. Stepped horizontal glitch slice displacement
      float coarseBand = floor(uv.y * 22.0 + uSeed * 7.0);
      float fineBand = floor(uv.y * 96.0 + uTime * 35.0);
      float coarseRand = hash11(coarseBand + floor(uTime * 24.0) + uSeed * 13.7);
      float fineRand = hash11(fineBand + floor(uTime * 48.0) + uSeed * 5.3);

      float sliceShift = 0.0;
      if (coarseRand > 0.72) {
        sliceShift += (coarseRand - 0.86) * 0.18 * strength;
      }
      if (fineRand > 0.82) {
        sliceShift += (fineRand - 0.91) * 0.11 * burst;
      }

      warpedUv.x += sliceShift;

      // Vertical micro-jitter at peak phase shift
      float jitterY = (hash11(floor(uTime * 60.0) + uSeed) - 0.5) * 0.018 * burst;
      warpedUv.y = clamp(warpedUv.y + jitterY, 0.001, 0.999);
      warpedUv.x = clamp(warpedUv.x, 0.001, 0.999);

      // 3. Directional + radial RGB chromatic aberration split
      float chromaOffset = (0.008 + 0.036 * burst) * (0.35 + dist + abs(sliceShift) * 6.0);
      vec2 rUv = clamp(warpedUv + dir * chromaOffset + vec2(sliceShift * 0.4, 0.0), 0.001, 0.999);
      vec2 bUv = clamp(warpedUv - dir * chromaOffset - vec2(sliceShift * 0.4, 0.0), 0.001, 0.999);

      float r = texture2D(tDiffuse, rUv).r;
      float g = texture2D(tDiffuse, warpedUv).g;
      float b = texture2D(tDiffuse, bUv).b;
      vec3 col = vec3(r, g, b);

      // 4. Temporal scanlines, digital noise grain & era color surge
      float scanline = 0.5 + 0.5 * sin(uv.y * 540.0 + uTime * 20.0);
      col *= 1.0 - (0.14 * strength * scanline);

      float grain = (hash21(uv * 320.0 + uTime * 41.0) - 0.5) * 0.14 * burst;
      col += grain;

      // Era-tinted edge & shockwave ring glow
      float edgeVignette = smoothstep(0.25, 0.82, dist);
      float tintAmount = (edgeVignette * 0.34 + ringMask * 0.28) * strength;
      col = mix(col, uEraColor * 1.15, clamp(tintAmount, 0.0, 0.55));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class ChronoPostProcessor {
  private composer: EffectComposer;
  private glitchPass: ShaderPass;
  private intensity = 0;
  private duration = 0.42;
  private timer = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.glitchPass = new ShaderPass(ChronoGlitchDistortionShader);
    this.glitchPass.enabled = false;
    this.composer.addPass(this.glitchPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  public triggerPhaseShift(targetEra: TimelineId) {
    this.duration = 0.42;
    this.timer = this.duration;
    this.intensity = 1.0;
    this.glitchPass.enabled = true;
    this.glitchPass.uniforms.uSeed.value = Math.random() * 100;

    const eraHex =
      targetEra === 'past' ? 0xf59e0b : targetEra === 'present' ? 0x10b981 : 0xe879f9;
    (this.glitchPass.uniforms.uEraColor.value as THREE.Color).setHex(eraHex);
  }

  public triggerChronalStasis() {
    this.duration = 0.34;
    this.timer = this.duration;
    this.intensity = 0.82;
    this.glitchPass.enabled = true;
    this.glitchPass.uniforms.uSeed.value = Math.random() * 100;
    (this.glitchPass.uniforms.uEraColor.value as THREE.Color).setHex(0x22d3ee);
  }

  public update(dt: number, elapsed: number) {
    if (this.timer > 0) {
      this.timer = Math.max(0, this.timer - dt);
      // Fast punchy onset, smooth exponential-like decay
      const norm = this.timer / this.duration;
      this.intensity = Math.pow(norm, 1.35);
      this.glitchPass.uniforms.uTime.value = elapsed;
      this.glitchPass.uniforms.uIntensity.value = this.intensity;
      if (this.timer <= 0) {
        this.intensity = 0;
        this.glitchPass.uniforms.uIntensity.value = 0;
        this.glitchPass.enabled = false;
      }
    }
  }

  public render() {
    this.composer.render();
  }

  public setSize(width: number, height: number, pixelRatio: number) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  public dispose() {
    this.glitchPass.dispose();
    this.composer.dispose();
  }
}
