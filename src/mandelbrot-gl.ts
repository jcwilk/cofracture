import type { Bounds } from "./bounds";

const MAX_ITER = 128;

const VERTEX_SHADER = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const MANDELBROT_GLSL = `
vec3 palette(float t) {
  return vec3(
    9.0 * (1.0 - t) * t * t * t,
    15.0 * (1.0 - t) * (1.0 - t) * t * t,
    8.5 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t
  );
}

vec4 colorAt(vec2 c) {
  vec2 z = vec2(0.0);
  float iter = 0.0;
  for (int i = 0; i < ${MAX_ITER}; i++) {
    if (dot(z, z) > 4.0) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    iter = float(i + 1);
  }
  if (iter >= ${MAX_ITER}.0) return vec4(0.0, 0.0, 0.0, 0.0);
  return vec4(palette(iter / ${MAX_ITER}.0), 1.0);
}

// Nested glass faces: 8×8 macro × 8×8 nest = 64 micro-faces across the view (matches zoom partition).
const float GLASS_N = 64.0;
const float GLASS_GAP = 0.028;
const float GLASS_SOFT = 0.03; // soft mortar AA band (partial transparency, no hard cliff)
const float GLASS_CORNER = 0.26;
const float GLASS_K = 0.28;
const float GLASS_LENS = 0.85;

// One consistent cell id + local [-1,1] from UV (avoids floor/fract disagreement + mediump beat).
void glassCell(vec2 uv, out vec2 id, out vec2 p) {
  highp vec2 g = uv * GLASS_N;
  id = floor(g);
  p = (g - id) * 2.0 - 1.0;
}

// Rounded-rect SDF in local [-1,1]: mostly square, soft corners.
float glassTileDist(vec2 p) {
  vec2 q = abs(p) - (1.0 - GLASS_CORNER);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - GLASS_CORNER;
}

// Soft coverage: partial alpha across the mortar edge (no opaque grid strokes).
// AA width is a fixed ~1.25px in local space so it doesn't beat against non-integer px/cell.
float glassCoverage(vec2 p) {
  float d = glassTileDist(p);
  float pxPerCell = max(u_resolution.x / GLASS_N, 1.0);
  float w = max(GLASS_SOFT, 2.5 / pxPerCell);
  return 1.0 - smoothstep(-GLASS_GAP - w, -GLASS_GAP + w, d);
}

// Light face warp — hint of dome, mostly flat tile.
vec2 glassUv(vec2 id, vec2 p) {
  float r2 = dot(p, p);
  vec2 ps = p * (1.0 + GLASS_K * r2) * GLASS_LENS;
  return (id + clamp(ps * 0.5 + 0.5, 0.0, 1.0)) / GLASS_N;
}

// Specular-led glass: long tapering L from upper-right + soft complementary catch at bottom-left.
vec4 glassShade(vec4 col, vec2 p) {
  float d = glassTileDist(p);
  float r = length(p);
  float edge = smoothstep(-0.24, -0.02, d);

  float dome = 1.0 - 0.10 * smoothstep(0.18, 0.92, r);
  float rim = smoothstep(0.55, 0.96, r) * 0.07;

  float bevel = p.x * 0.11 - p.y * 0.13;
  float hi = max(0.0, -bevel) * (0.25 + 0.75 * edge);
  float lo = max(0.0, bevel) * (0.2 + 0.8 * edge);

  // Primary L: starts at upper-right, stretches most of the way toward UL / LR, tapering thinner.
  float alongTop = clamp((0.92 - p.x) / 1.95, 0.0, 1.0);   // 0 at UR → 1 near UL
  float alongRight = clamp((0.92 - p.y) / 1.95, 0.0, 1.0); // 0 at UR → 1 near LR
  float topWidth = mix(3.6, 11.0, alongTop);               // thicker near corner, thinner at tip
  float rightWidth = mix(3.6, 11.0, alongRight);
  float topFall = pow(1.0 - alongTop, 0.45);               // slower falloff so arms stay visible longer
  float rightFall = pow(1.0 - alongRight, 0.45);
  float topArm = pow(max(0.0, 1.0 - abs(p.y - 0.92) * topWidth), 2.8) * topFall
               * smoothstep(-0.98, -0.88, p.x) * smoothstep(0.99, 0.90, p.x);
  float rightArm = pow(max(0.0, 1.0 - abs(p.x - 0.92) * rightWidth), 2.8) * rightFall
                 * smoothstep(-0.98, -0.88, p.y) * smoothstep(0.99, 0.90, p.y);
  float corner = pow(max(0.0, 1.0 - length(p - vec2(0.90, 0.90)) * 2.2), 2.4);
  float rimSpec = max(topArm, max(rightArm, corner * 0.95)) * (0.4 + 0.6 * edge);
  float hot = pow(max(0.0, 1.0 - length(p - vec2(0.88, 0.90)) * 2.4), 5.0);

  // Complementary bottom-left: soft crescent + short edge glints (different nature than the sharp L)
  float softCrescent = pow(max(0.0, 1.0 - length(p - vec2(-0.70, -0.70)) * 1.35), 2.0) * 0.45;
  float bottomGlint = pow(max(0.0, 1.0 - abs(p.y + 0.90) * 7.5), 2.8)
                    * smoothstep(0.05, -0.55, p.x) * smoothstep(-0.98, -0.70, p.x) * 0.55;
  float leftGlint = pow(max(0.0, 1.0 - abs(p.x + 0.90) * 7.5), 2.8)
                  * smoothstep(0.05, -0.55, p.y) * smoothstep(-0.98, -0.70, p.y) * 0.55;
  float catchLight = max(softCrescent, max(bottomGlint, leftGlint)) * (0.35 + 0.65 * edge);

  // Minimum substrate milkiness only on transparent fractal samples; thins toward the edge
  float milkAmt = (1.0 - col.a) * (1.0 - 0.55 * edge);
  float milkA = 0.07 * milkAmt;
  vec3 milkRgb = vec3(0.86, 0.90, 0.98);

  if (col.a < 0.5) {
    float face = 0.008 * (1.0 - 0.5 * edge);
    float a = max(milkA, face + hi * 0.08 + lo * 0.02 + rimSpec * 0.7 + hot * 0.55 + catchLight * 0.5);
    vec3 rgb = mix(milkRgb, vec3(1.0), clamp(rimSpec * 0.7 + hot * 0.55 + catchLight * 0.45, 0.0, 1.0));
    return vec4(rgb, clamp(a, 0.0, 0.68));
  }

  // Opaque fractal: no milkiness — only bevel / specular on the color
  vec3 rgb = col.rgb * (dome - rim + hi * 0.3 - lo * 0.35)
           + vec3(rimSpec * 0.4 + hot * 0.35 + catchLight * 0.28);
  return vec4(rgb, 1.0);
}

vec4 colorAtGlass(vec4 b, vec2 uv) {
  vec2 id;
  vec2 p;
  glassCell(uv, id, p);
  float cover = glassCoverage(p);
  if (cover <= 0.001) return vec4(0.0);
  vec2 u = glassUv(id, p);
  float re = b.x + u.x * (b.y - b.x);
  float im = b.w - (1.0 - u.y) * (b.w - b.z);
  vec4 shaded = glassShade(colorAt(vec2(re, im)), p);
  shaded.a *= cover;
  return shaded;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_uv;
uniform vec4 u_bounds;
uniform vec2 u_resolution;
${MANDELBROT_GLSL}

void main() {
  gl_FragColor = colorAtGlass(u_bounds, v_uv);
}
`;

const FRAGMENT_SHADER_ZOOM = `
precision mediump float;
varying vec2 v_uv;
uniform vec4 u_boundsFrom;
uniform vec4 u_boundsTo;
uniform vec4 u_pickupTileRect;
uniform vec2 u_resolution;
uniform sampler2D u_background;
uniform float u_progress;
uniform float u_zoomIn;
// Exact same offsets as idle canvas (JS-packed into a 64×1 RG texture).
uniform sampler2D u_macroOffTex;
${MANDELBROT_GLSL}

const float TILE_GAP = 3.0;

// O(1) lookup — WebGL1 forbids dynamic indexing of uniform arrays.
vec2 macroOffset(float row, float col) {
  float idx = row * 8.0 + col;
  vec2 enc = texture2D(u_macroOffTex, vec2((idx + 0.5) / 64.0, 0.5)).rg;
  return enc * 8.0 - 4.0;
}

vec4 over(vec4 src, vec4 dst) {
  float outA = src.a + dst.a * (1.0 - src.a);
  vec3 outRgb = outA > 1e-4
    ? (src.rgb * src.a + dst.rgb * dst.a * (1.0 - src.a)) / outA
    : vec3(0.0);
  return vec4(outRgb, outA);
}

// Idle-style wandering macros for the fading parent/background during zoom.
vec4 wanderingMacros(
  float sx,
  float sy,
  bool sampleBg,
  float alphaMul,
  bool holePickup
) {
  float cell = u_resolution.x / 8.0;
  float halfGap = TILE_GAP * 0.5;
  float dest = cell - TILE_GAP;
  float animCol = u_pickupTileRect.x / cell;
  float animRow = u_pickupTileRect.y / cell;

  for (int row = 0; row < 8; row++) {
    for (int col = 0; col < 8; col++) {
      float rf = float(row);
      float cf = float(col);
      if (holePickup && abs(rf - animRow) < 0.1 && abs(cf - animCol) < 0.1) continue;

      vec2 off = macroOffset(rf, cf);
      vec2 origin = vec2(cf, rf) * cell + vec2(halfGap) + off;
      vec2 local = (vec2(sx, sy) - origin) / dest;
      if (local.x < 0.0 || local.x >= 1.0 || local.y < 0.0 || local.y >= 1.0) continue;

      vec2 logicalUv = vec2(
        (cf + local.x) / 8.0,
        1.0 - (rf + local.y) / 8.0
      );
      vec4 sample = sampleBg
        ? texture2D(u_background, logicalUv)
        : colorAtGlass(u_boundsTo, logicalUv);
      return vec4(sample.rgb, sample.a * alphaMul);
    }
  }
  return vec4(0.0);
}

// Zoom-in fly-apart with wandered start (selected tile) and end (destination macros).
vec4 zoomInFlyApart(float sx, float sy) {
  float t = clamp(u_progress, 0.0, 1.0);
  const float SCALE_HOLD = 0.25;
  float moveT = t * t;
  float sizeU = clamp((t - SCALE_HOLD) / (1.0 - SCALE_HOLD), 0.0, 1.0);
  float sizeT = sizeU * sizeU;

  float cell = u_resolution.x / 8.0;
  float halfGap = TILE_GAP * 0.5;
  float startFace = (cell - TILE_GAP) / 8.0;
  float endFace = cell - TILE_GAP;
  float animCol = u_pickupTileRect.x / cell;
  float animRow = u_pickupTileRect.y / cell;
  vec2 pickOff = macroOffset(animRow, animCol);
  vec2 pickOrigin = u_pickupTileRect.xy + pickOff + vec2(halfGap);

  for (int j = 0; j < 8; j++) {
    for (int i = 0; i < 8; i++) {
      vec2 idF = vec2(float(i), float(j));
      vec2 startC = pickOrigin + (idF + 0.5) * startFace;
      vec2 endOff = macroOffset(idF.y, idF.x);
      vec2 endC = idF * cell + vec2(halfGap) + endOff + vec2(0.5 * endFace);
      vec2 c = mix(startC, endC, moveT);
      vec2 sz = mix(vec2(startFace), vec2(endFace), sizeT);
      vec2 local = (vec2(sx, sy) - (c - sz * 0.5)) / sz;
      if (local.x < 0.0 || local.x >= 1.0 || local.y < 0.0 || local.y >= 1.0) continue;

      vec2 parentUv = vec2(
        (animCol + (idF.x + local.x) / 8.0) / 8.0,
        1.0 - (animRow + (idF.y + local.y) / 8.0) / 8.0
      );
      vec4 fromLook = colorAtGlass(u_boundsFrom, parentUv);
      if (sizeT <= 0.0) return fromLook;

      vec2 cellUv = vec2(
        (idF.x + local.x) / 8.0,
        1.0 - (idF.y + local.y) / 8.0
      );
      return mix(fromLook, colorAtGlass(u_boundsTo, cellUv), sizeT);
    }
  }
  return vec4(0.0);
}

// Zoom-out fly-together: shrink from wandered macros into wandered parent nested faces.
vec4 zoomOutFlyTogether(float sx, float sy) {
  float t = clamp(u_progress, 0.0, 1.0);
  const float MOVE_HOLD = 0.25;
  float sizeT = t * t;
  float moveU = clamp((t - MOVE_HOLD) / (1.0 - MOVE_HOLD), 0.0, 1.0);
  float moveT = moveU * moveU;

  float cell = u_resolution.x / 8.0;
  float halfGap = TILE_GAP * 0.5;
  float startFace = cell - TILE_GAP;
  float endFace = (cell - TILE_GAP) / 8.0;
  float animCol = u_pickupTileRect.x / cell;
  float animRow = u_pickupTileRect.y / cell;
  vec2 pickOff = macroOffset(animRow, animCol);
  vec2 pickOrigin = u_pickupTileRect.xy + pickOff + vec2(halfGap);

  for (int j = 0; j < 8; j++) {
    for (int i = 0; i < 8; i++) {
      vec2 idF = vec2(float(i), float(j));
      vec2 startOff = macroOffset(idF.y, idF.x);
      vec2 startC = idF * cell + vec2(halfGap) + startOff + vec2(0.5 * startFace);
      vec2 endC = pickOrigin + (idF + 0.5) * endFace;
      vec2 c = mix(startC, endC, moveT);
      vec2 sz = mix(vec2(startFace), vec2(endFace), sizeT);
      vec2 local = (vec2(sx, sy) - (c - sz * 0.5)) / sz;
      if (local.x < 0.0 || local.x >= 1.0 || local.y < 0.0 || local.y >= 1.0) continue;

      vec2 cellUv = vec2(
        (idF.x + local.x) / 8.0,
        1.0 - (idF.y + local.y) / 8.0
      );
      vec4 fromLook = colorAtGlass(u_boundsFrom, cellUv);
      if (sizeT <= 0.0) return fromLook;

      vec2 parentUv = vec2(
        (animCol + (idF.x + local.x) / 8.0) / 8.0,
        1.0 - (animRow + (idF.y + local.y) / 8.0) / 8.0
      );
      return mix(fromLook, colorAtGlass(u_boundsTo, parentUv), sizeT);
    }
  }
  return vec4(0.0);
}

void main() {
  float screenX = v_uv.x * u_resolution.x;
  float screenY = (1.0 - v_uv.y) * u_resolution.y;

  if (u_zoomIn > 0.5) {
    vec4 under = wanderingMacros(screenX, screenY, true, 1.0 - u_progress, true);
    gl_FragColor = over(zoomInFlyApart(screenX, screenY), under);
    return;
  }

  vec4 under = wanderingMacros(screenX, screenY, false, u_progress, true);
  gl_FragColor = over(zoomOutFlyTogether(screenX, screenY), under);
}
`;

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GlProgram {
  program: WebGLProgram;
  posLoc: number;
}

interface NormalUniforms {
  bounds: WebGLUniformLocation;
  resolution: WebGLUniformLocation;
}

interface ZoomUniforms {
  boundsFrom: WebGLUniformLocation;
  boundsTo: WebGLUniformLocation;
  tileRect: WebGLUniformLocation | null; // unused by fly shaders; may be optimized out
  pickupTileRect: WebGLUniformLocation;
  resolution: WebGLUniformLocation;
  background: WebGLUniformLocation;
  progress: WebGLUniformLocation;
  zoomIn: WebGLUniformLocation;
  macroOffTex: WebGLUniformLocation;
}

/** Encode px offsets in [-4, 4] as RG bytes for a 64×1 NEAREST texture. */
const MACRO_OFF_ENCODE = 8; // decode: rg * 8 - 4
const MACRO_OFF_BIAS = 4;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown";
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

function linkProgram(
  gl: WebGLRenderingContext,
  vs: WebGLShader,
  fsSource: string,
): GlProgram {
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown";
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log}`);
  }
  return { program, posLoc: gl.getAttribLocation(program, "a_pos") };
}

export class MandelbrotGlRenderer {
  private glCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private vertexShader: WebGLShader | null = null;
  private normal: (GlProgram & { uniforms: NormalUniforms }) | null = null;
  private zoom: (GlProgram & { uniforms: ZoomUniforms }) | null = null;
  private buffer: WebGLBuffer | null = null;
  private glWidth = 0;
  private glHeight = 0;
  private backgroundTexture: WebGLTexture | null = null;
  private backgroundFb: WebGLFramebuffer | null = null;
  private backgroundReady = false;
  private macroOffTexture: WebGLTexture | null = null;
  private macroOffBytes = new Uint8Array(64 * 4);

  private constructor(glCanvas: HTMLCanvasElement) {
    this.glCanvas = glCanvas;
  }

  static create(): MandelbrotGlRenderer {
    const glCanvas = document.createElement("canvas");
    const gl =
      glCanvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }) ??
      glCanvas.getContext("experimental-webgl");
    if (!gl) {
      throw new Error("WebGL is required but unavailable in this browser");
    }
    return new MandelbrotGlRenderer(glCanvas);
  }

  private ensureGl(width: number, height: number): WebGLRenderingContext {
    // Snap to a multiple of 64 so each micro-face gets the same integer pixel width
    // (avoids periodic bright columns from uneven px/cell + soft-edge beat).
    const snap = (n: number) => Math.max(64, Math.round(n / 64) * 64);
    width = snap(width);
    height = snap(height);

    if (this.gl && width === this.glWidth && height === this.glHeight) {
      return this.gl;
    }

    this.glWidth = width;
    this.glHeight = height;
    this.glCanvas.width = width;
    this.glCanvas.height = height;
    this.backgroundReady = false;

    const gl =
      this.glCanvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        depth: false,
        preserveDrawingBuffer: true,
        desynchronized: true,
        powerPreference: "high-performance",
      }) ?? this.glCanvas.getContext("experimental-webgl");
    if (!gl) throw new Error("WebGL unavailable");

    const webgl = gl as WebGLRenderingContext;
    if (this.vertexShader) webgl.deleteShader(this.vertexShader);
    this.vertexShader = compileShader(webgl, webgl.VERTEX_SHADER, VERTEX_SHADER);

    const normal = linkProgram(webgl, this.vertexShader, FRAGMENT_SHADER);
    const bounds = webgl.getUniformLocation(normal.program, "u_bounds");
    const normalResolution = webgl.getUniformLocation(normal.program, "u_resolution");
    if (bounds === null || normalResolution === null) throw new Error("Missing normal uniforms");

    const zoom = linkProgram(webgl, this.vertexShader, FRAGMENT_SHADER_ZOOM);
    const boundsFrom = webgl.getUniformLocation(zoom.program, "u_boundsFrom");
    const boundsTo = webgl.getUniformLocation(zoom.program, "u_boundsTo");
    const tileRect = webgl.getUniformLocation(zoom.program, "u_tileRect");
    const pickupTileRect = webgl.getUniformLocation(zoom.program, "u_pickupTileRect");
    const resolution = webgl.getUniformLocation(zoom.program, "u_resolution");
    const background = webgl.getUniformLocation(zoom.program, "u_background");
    const progress = webgl.getUniformLocation(zoom.program, "u_progress");
    const zoomIn = webgl.getUniformLocation(zoom.program, "u_zoomIn");
    const macroOffTex = webgl.getUniformLocation(zoom.program, "u_macroOffTex");
    if (
      boundsFrom === null ||
      boundsTo === null ||
      pickupTileRect === null ||
      resolution === null ||
      background === null ||
      progress === null ||
      zoomIn === null ||
      macroOffTex === null
    ) {
      throw new Error("Missing zoom uniforms");
    }

    const buffer = webgl.createBuffer();
    if (!buffer) throw new Error("Failed to create buffer");
    webgl.bindBuffer(webgl.ARRAY_BUFFER, buffer);
    webgl.bufferData(
      webgl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      webgl.STATIC_DRAW,
    );

    if (this.macroOffTexture) webgl.deleteTexture(this.macroOffTexture);
    const macroTex = webgl.createTexture();
    if (!macroTex) throw new Error("Failed to create macro-off texture");
    webgl.bindTexture(webgl.TEXTURE_2D, macroTex);
    webgl.texImage2D(
      webgl.TEXTURE_2D,
      0,
      webgl.RGBA,
      64,
      1,
      0,
      webgl.RGBA,
      webgl.UNSIGNED_BYTE,
      null,
    );
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE);
    this.macroOffTexture = macroTex;

    this.gl = webgl;
    this.normal = { ...normal, uniforms: { bounds, resolution: normalResolution } };
    this.zoom = {
      ...zoom,
      uniforms: {
        boundsFrom,
        boundsTo,
        tileRect,
        pickupTileRect,
        resolution,
        background,
        progress,
        zoomIn,
        macroOffTex,
      },
    };
    this.buffer = buffer;
    return webgl;
  }

  private uploadMacroOffsets(gl: WebGLRenderingContext, offsets: Float32Array): void {
    const bytes = this.macroOffBytes;
    for (let i = 0; i < 64; i++) {
      const x = offsets[i * 2] ?? 0;
      const y = offsets[i * 2 + 1] ?? 0;
      const o = i * 4;
      bytes[o] = Math.max(0, Math.min(255, Math.round(((x + MACRO_OFF_BIAS) / MACRO_OFF_ENCODE) * 255)));
      bytes[o + 1] = Math.max(
        0,
        Math.min(255, Math.round(((y + MACRO_OFF_BIAS) / MACRO_OFF_ENCODE) * 255)),
      );
      bytes[o + 2] = 0;
      bytes[o + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.macroOffTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
  }

  private ensureBackgroundTarget(gl: WebGLRenderingContext, width: number, height: number): void {
    if (this.backgroundTexture && this.backgroundFb && this.backgroundReady) {
      return;
    }

    if (this.backgroundTexture) gl.deleteTexture(this.backgroundTexture);
    if (this.backgroundFb) gl.deleteFramebuffer(this.backgroundFb);

    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fb = gl.createFramebuffer();
    if (!fb) throw new Error("Failed to create framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    this.backgroundTexture = texture;
    this.backgroundFb = fb;
    this.backgroundReady = true;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private bindVertexAttrib(gl: WebGLRenderingContext, posLoc: number): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer!);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  }

  private drawNormal(
    gl: WebGLRenderingContext,
    width: number,
    height: number,
    bounds: Bounds,
    targetFb: WebGLFramebuffer | null,
  ): void {
    const { program, posLoc, uniforms } = this.normal!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFb);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform4f(
      uniforms.bounds,
      bounds.reMin,
      bounds.reMax,
      bounds.imMin,
      bounds.imMax,
    );
    gl.uniform2f(uniforms.resolution, width, height);
    this.bindVertexAttrib(gl, posLoc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Bake the pre-zoom view into a GPU texture (once per zoom). */
  cacheZoomBackground(width: number, height: number, bounds: Bounds): void {
    const gl = this.ensureGl(width, height);
    this.backgroundReady = false;
    this.ensureBackgroundTarget(gl, width, height);
    this.drawNormal(gl, width, height, bounds, this.backgroundFb);
    this.backgroundReady = true;
  }

  clearZoomBackground(): void {
    this.backgroundReady = false;
  }

  render(width: number, height: number, bounds: Bounds): HTMLCanvasElement {
    const gl = this.ensureGl(width, height);
    this.drawNormal(gl, width, height, bounds, null);
    return this.glCanvas;
  }

  renderZoom(
    width: number,
    height: number,
    boundsFrom: Bounds,
    boundsTo: Bounds,
    tile: TileRect,
    pickupTile: TileRect,
    progress: number,
    zoomIn: boolean,
    macroOffsets: Float32Array,
  ): HTMLCanvasElement {
    const gl = this.ensureGl(width, height);
    if (zoomIn && !this.backgroundReady) {
      this.cacheZoomBackground(width, height, boundsFrom);
    }

    const { program, posLoc, uniforms } = this.zoom!;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Composite in-shader with straight alpha (same as idle); blending would double-multiply.
    gl.disable(gl.BLEND);
    gl.useProgram(program);
    gl.uniform4f(
      uniforms.boundsFrom,
      boundsFrom.reMin,
      boundsFrom.reMax,
      boundsFrom.imMin,
      boundsFrom.imMax,
    );
    gl.uniform4f(
      uniforms.boundsTo,
      boundsTo.reMin,
      boundsTo.reMax,
      boundsTo.imMin,
      boundsTo.imMax,
    );
    if (uniforms.tileRect !== null) {
      gl.uniform4f(uniforms.tileRect, tile.x, tile.y, tile.w, tile.h);
    }
    gl.uniform4f(uniforms.pickupTileRect, pickupTile.x, pickupTile.y, pickupTile.w, pickupTile.h);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform1f(uniforms.zoomIn, zoomIn ? 1 : 0);
    this.uploadMacroOffsets(gl, macroOffsets);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
    gl.uniform1i(uniforms.background, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.macroOffTexture);
    gl.uniform1i(uniforms.macroOffTex, 1);
    this.bindVertexAttrib(gl, posLoc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    return this.glCanvas;
  }
}
