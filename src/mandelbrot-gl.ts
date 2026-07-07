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
  if (iter >= ${MAX_ITER}.0) return vec4(0.0, 0.0, 0.0, 1.0);
  return vec4(palette(iter / ${MAX_ITER}.0), 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_uv;
uniform vec4 u_bounds;
${MANDELBROT_GLSL}

void main() {
  float re = u_bounds.x + v_uv.x * (u_bounds.y - u_bounds.x);
  float im = u_bounds.w - (1.0 - v_uv.y) * (u_bounds.w - u_bounds.z);
  gl_FragColor = colorAt(vec2(re, im));
}
`;

const FRAGMENT_SHADER_ZOOM = `
precision mediump float;
varying vec2 v_uv;
uniform vec4 u_boundsFrom;
uniform vec4 u_boundsTo;
uniform vec4 u_tileRect;
uniform vec2 u_resolution;
uniform sampler2D u_background;
uniform float u_progress;
uniform float u_zoomIn;
${MANDELBROT_GLSL}

vec4 sampleBounds(vec4 b) {
  float re = b.x + v_uv.x * (b.y - b.x);
  float im = b.w - (1.0 - v_uv.y) * (b.w - b.z);
  return colorAt(vec2(re, im));
}

void main() {
  float screenX = v_uv.x * u_resolution.x;
  float screenY = (1.0 - v_uv.y) * u_resolution.y;

  float tileL = u_tileRect.x;
  float tileT = u_tileRect.y;
  bool inTile = screenX >= tileL && screenX < tileL + u_tileRect.z &&
                screenY >= tileT && screenY < tileT + u_tileRect.w;

  if (inTile) {
    float u = (screenX - tileL) / u_tileRect.z;
    float v = (screenY - tileT) / u_tileRect.w;
    vec4 b = u_zoomIn > 0.5 ? u_boundsTo : u_boundsFrom;
    float re = b.x + u * (b.y - b.x);
    float im = b.w - v * (b.w - b.z);
    gl_FragColor = colorAt(vec2(re, im));
  } else if (u_zoomIn > 0.5) {
    vec4 bg = texture2D(u_background, v_uv);
    gl_FragColor = vec4(bg.rgb, bg.a * (1.0 - u_progress));
  } else {
    vec4 parent = sampleBounds(u_boundsTo);
    gl_FragColor = vec4(parent.rgb, parent.a * u_progress);
  }
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
}

interface ZoomUniforms {
  boundsFrom: WebGLUniformLocation;
  boundsTo: WebGLUniformLocation;
  tileRect: WebGLUniformLocation;
  resolution: WebGLUniformLocation;
  background: WebGLUniformLocation;
  progress: WebGLUniformLocation;
  zoomIn: WebGLUniformLocation;
}

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

  private constructor(glCanvas: HTMLCanvasElement) {
    this.glCanvas = glCanvas;
  }

  static create(): MandelbrotGlRenderer {
    const glCanvas = document.createElement("canvas");
    const gl =
      glCanvas.getContext("webgl") ?? glCanvas.getContext("experimental-webgl");
    if (!gl) {
      throw new Error("WebGL is required but unavailable in this browser");
    }
    return new MandelbrotGlRenderer(glCanvas);
  }

  private ensureGl(width: number, height: number): WebGLRenderingContext {
    const needW = Math.max(width, this.glWidth);
    const needH = Math.max(height, this.glHeight);
    if (this.gl && needW === this.glWidth && needH === this.glHeight) {
      return this.gl;
    }

    this.glWidth = needW;
    this.glHeight = needH;
    this.glCanvas.width = needW;
    this.glCanvas.height = needH;
    this.backgroundReady = false;

    const gl =
      this.glCanvas.getContext("webgl", {
        alpha: true,
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
    if (bounds === null) throw new Error("Missing normal uniforms");

    const zoom = linkProgram(webgl, this.vertexShader, FRAGMENT_SHADER_ZOOM);
    const boundsFrom = webgl.getUniformLocation(zoom.program, "u_boundsFrom");
    const boundsTo = webgl.getUniformLocation(zoom.program, "u_boundsTo");
    const tileRect = webgl.getUniformLocation(zoom.program, "u_tileRect");
    const resolution = webgl.getUniformLocation(zoom.program, "u_resolution");
    const background = webgl.getUniformLocation(zoom.program, "u_background");
    const progress = webgl.getUniformLocation(zoom.program, "u_progress");
    const zoomIn = webgl.getUniformLocation(zoom.program, "u_zoomIn");
    if (
      boundsFrom === null ||
      boundsTo === null ||
      tileRect === null ||
      resolution === null ||
      background === null ||
      progress === null ||
      zoomIn === null
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

    this.gl = webgl;
    this.normal = { ...normal, uniforms: { bounds } };
    this.zoom = {
      ...zoom,
      uniforms: { boundsFrom, boundsTo, tileRect, resolution, background, progress, zoomIn },
    };
    this.buffer = buffer;
    return webgl;
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
    gl.useProgram(program);
    gl.uniform4f(
      uniforms.bounds,
      bounds.reMin,
      bounds.reMax,
      bounds.imMin,
      bounds.imMax,
    );
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
    progress: number,
    zoomIn: boolean,
  ): HTMLCanvasElement {
    const gl = this.ensureGl(width, height);
    if (zoomIn && !this.backgroundReady) {
      this.cacheZoomBackground(width, height, boundsFrom);
    }

    const { program, posLoc, uniforms } = this.zoom!;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
    gl.uniform4f(uniforms.tileRect, tile.x, tile.y, tile.w, tile.h);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform1f(uniforms.zoomIn, zoomIn ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
    gl.uniform1i(uniforms.background, 0);
    this.bindVertexAttrib(gl, posLoc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);

    return this.glCanvas;
  }
}
