/* Tumblr Tone — the digital darkroom.
 * Live camera + photo/video editing, all on-device with WebGL. */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const FILTERS = window.TT_FILTERS;
  const GROUPS = window.TT_GROUPS;
  const byId = Object.fromEntries(FILTERS.map((f) => [f.id, f]));
  const ROLL_ORDER = ["nashville", "kiev", "2014", "amaro", "nuke", "cash", "pandora", "sepia", "fresh",
    "ghost", "threeam", "pinkroom", "sugar", "afterparty"];
  const groupIndex = (g) => GROUPS.findIndex((x) => x.id === g);
  const LOOKS = FILTERS.filter((f) => f.id !== "none").sort((a, b) =>
    groupIndex(a.group) - groupIndex(b.group) ||
    (a.group === "roll" ? ROLL_ORDER.indexOf(a.id) - ROLL_ORDER.indexOf(b.id) : 0));
  LOOKS.push(byId.none);

  // ======================================================
  // SETTINGS
  // ======================================================

  const ADJUST = [
    { key: "exposure", label: "Exposure", min: -100, max: 100 },
    { key: "contrast", label: "Contrast", min: -100, max: 100 },
    { key: "saturation", label: "Saturation", min: -100, max: 100 },
    { key: "warmth", label: "Warmth", min: -100, max: 100 },
    { key: "tint", label: "Tint", min: -100, max: 100 },
    { key: "highlights", label: "Highlights", min: -100, max: 100 },
    { key: "shadows", label: "Shadows", min: -100, max: 100 },
    { key: "fade", label: "Fade", min: 0, max: 100 }
  ];

  const EFFECTS = [
    { key: "grain", label: "Film grain" },
    { key: "vignette", label: "Vignette" },
    { key: "leak", label: "Light leak" },
    { key: "dust", label: "Dust & scratches" },
    { key: "glow", label: "Dreamy glow" },
    { key: "halation", label: "Halation (red halos)" },
    { key: "flash", label: "Flash pop" },
    { key: "chroma", label: "Chromatic fringe" },
    { key: "oldphone", label: "Old phone sensor" },
    { key: "lowsize", label: "Image size (shrink)" },
    { key: "lowres", label: "Low-res digicam" },
    { key: "sharpen", label: "Crunchy sharpen" }
  ].map((d) => ({ ...d, min: 0, max: 100 }));

  const STAMPS = [
    { id: "off", name: "Off" },
    { id: "today", name: "Today" },
    { id: "2014", name: "Back in 2014" },
    { id: "custom", name: "Pick a date" }
  ];
  const STAMP_COLORS = ["#ff8a2b", "#ff4b3a", "#ffd23f", "#ff6fb5", "#9ff0ff"];
  const FRAMES = [
    { id: "none", name: "None" },
    { id: "polaroid", name: "Instant" },
    { id: "film", name: "35mm" },
    { id: "digicam", name: "Viewfinder" },
    { id: "postcard", name: "Postcard" },
    { id: "gingham", name: "Gingham" }
  ];
  const QUALITY = [
    { id: "full", name: "Full size", max: 3200, q: 0.95 },
    { id: "small", name: "Smaller file", max: 1600, q: 0.88 }
  ];
  const ASPECTS = ["3:4", "1:1", "9:16", "4:3"];

  const defaults = () => ({
    filterId: "4s",
    intensity: 100,
    adjust: Object.fromEntries(ADJUST.map((d) => [d.key, 0])),
    effects: Object.fromEntries(EFFECTS.map((d) => [d.key, 0])),
    leakSeed: 0.37,
    stamp: "off",
    stampColor: STAMP_COLORS[0],
    customDate: "",
    frame: "none",
    caption: ""
  });

  let S = defaults();

  const app = {
    mode: "empty", // empty | camera | image | video
    image: null, // HTMLCanvasElement/Image for still edits
    originalBlob: null,
    facing: "environment",
    stream: null,
    camMode: "photo",
    aspect: "3:4",
    timer: 0,
    flash: false,
    grid: false,
    quality: "full",
    sound: true,
    recorder: null,
    comparing: false,
    busy: false,
    fileVideo: null
  };

  // ======================================================
  // CURVES → LUT
  // ======================================================

  const XS = [0, 64, 128, 192, 255];

  function curveTable(pts) {
    const n = XS.length;
    const d = [], m = [];
    for (let i = 0; i < n - 1; i++) d[i] = (pts[i + 1] - pts[i]) / (XS[i + 1] - XS[i]);
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    const out = new Uint8Array(256);
    for (let x = 0; x < 256; x++) {
      let i = 0;
      while (i < n - 2 && x > XS[i + 1]) i++;
      const h = XS[i + 1] - XS[i], t = (x - XS[i]) / h;
      const t2 = t * t, t3 = t2 * t;
      const y = (2 * t3 - 3 * t2 + 1) * pts[i] + (t3 - 2 * t2 + t) * h * m[i] +
        (-2 * t3 + 3 * t2) * pts[i + 1] + (t3 - t2) * h * m[i + 1];
      out[x] = Math.max(0, Math.min(255, Math.round(y)));
    }
    return out;
  }

  const lutCache = {};
  function lutFor(f) {
    if (lutCache[f.id]) return lutCache[f.id];
    const r = curveTable(f.r), g = curveTable(f.g), b = curveTable(f.b);
    const data = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      data[i * 4] = r[i]; data[i * 4 + 1] = g[i]; data[i * 4 + 2] = b[i]; data[i * 4 + 3] = 255;
    }
    return (lutCache[f.id] = data);
  }

  // ======================================================
  // WEBGL RENDERER
  // ======================================================

  const VS = `
    attribute vec2 p;
    varying vec2 vUv;
    void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const FS = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 vUv;
    uniform sampler2D uSrc, uLut;
    uniform vec2 uRes;
    uniform vec4 uCrop;
    uniform float uMirror, uIntensity, uTime, uSeed, uLive;
    uniform float pSat, pCon, pBri, pFade, pTemp, pTint, pMono;
    uniform vec3 pSh, pHi;
    uniform float aExp, aCon, aSat, aTemp, aTint, aHi, aSh, aFade;
    uniform float eGrain, eVig, eGlow, eHal, eCA, eLeak, eDust, ePix, eSharp, eFlash, eOld, eRes;

    const vec3 W = vec3(0.299, 0.587, 0.114);

    vec2 srcUv(vec2 uv) {
      if (uMirror > 0.5) uv.x = 1.0 - uv.x;
      return uCrop.xy + clamp(uv, 0.0, 1.0) * uCrop.zw;
    }
    vec3 tex0(vec2 uv) { return texture2D(uSrc, srcUv(uv)).rgb; }
    // "image size": read the photo as if it were shrunk to a few hundred pixels
    // and stretched back up (bilinear), like a re-saved 2010 upload
    vec3 tex(vec2 uv) {
      if (eRes <= 0.0) return tex0(uv);
      float rows = mix(1100.0, 280.0, eRes);
      vec2 cells = vec2(rows * uRes.x / uRes.y, rows);
      vec2 q = uv * cells - 0.5;
      vec2 i = floor(q), fr = fract(q);
      vec3 a = tex0((i + vec2(0.5, 0.5)) / cells), b = tex0((i + vec2(1.5, 0.5)) / cells);
      vec3 c = tex0((i + vec2(0.5, 1.5)) / cells), d = tex0((i + vec2(1.5, 1.5)) / cells);
      return mix(mix(a, b, fr.x), mix(c, d, fr.x), fr.y);
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    vec3 lut(vec3 c) {
      c = clamp(c, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0;
      return vec3(texture2D(uLut, vec2(c.r, 0.5)).r,
                  texture2D(uLut, vec2(c.g, 0.5)).g,
                  texture2D(uLut, vec2(c.b, 0.5)).b);
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uRes.x / uRes.y;

      // low-res digicam
      if (ePix > 0.0) {
        float rows = min(uRes.y, 900.0 / (1.0 + ePix * 12.0));
        vec2 cells = vec2(rows * aspect, rows);
        uv = (floor(uv * cells) + 0.5) / cells;
      }

      // chromatic fringe
      vec3 c;
      if (eCA > 0.0) {
        vec2 dir = (uv - 0.5) * eCA * 0.018;
        c = vec3(tex(uv + dir).r, tex(uv).g, tex(uv - dir).b);
      } else {
        c = tex(uv);
      }

      // sharpen
      if (eSharp > 0.0) {
        vec2 px = 1.0 / uRes;
        vec3 n = tex(uv + vec2(px.x, 0.0)) + tex(uv - vec2(px.x, 0.0)) +
                 tex(uv + vec2(0.0, px.y)) + tex(uv - vec2(0.0, px.y));
        c += (c - n * 0.25) * eSharp * 1.6;
      }

      // old phone sensor, part 1: soft optics, JPEG chroma blocks, oversharpening.
      // Sizes are in "sensor pixels" of a ~900-row image so preview and saved photo match.
      if (eOld > 0.0) {
        vec2 sp = vec2(1.0 / (900.0 * aspect), 1.0 / 900.0);
        vec3 b1 = (tex(uv + vec2(sp.x, 0.0)) + tex(uv - vec2(sp.x, 0.0)) +
                   tex(uv + vec2(0.0, sp.y)) + tex(uv - vec2(0.0, sp.y))) * 0.25;
        c = mix(c, b1, eOld * 0.6);
        vec2 cells = vec2(900.0 * aspect, 900.0) / 4.0;
        vec3 cb = tex((floor(uv * cells) + 0.5) / cells);
        c = mix(c, vec3(dot(c, W)) + (cb - dot(cb, W)), eOld * 0.65);
        vec3 b2 = (tex(uv + vec2(sp.x * 2.5, 0.0)) + tex(uv - vec2(sp.x * 2.5, 0.0)) +
                   tex(uv + vec2(0.0, sp.y * 2.5)) + tex(uv - vec2(0.0, sp.y * 2.5))) * 0.25;
        c += (c - b2) * eOld * 0.8;
      }

      // glow + halation: ring of highlight samples
      if (eGlow > 0.0 || eHal > 0.0) {
        vec3 acc = vec3(0.0);
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 0.5236;
          float r = 0.010 + 0.012 * mod(float(i), 2.0);
          vec3 s = tex(uv + vec2(cos(a) / aspect, sin(a)) * r);
          acc += s * smoothstep(0.5, 1.0, dot(s, W));
        }
        acc /= 12.0;
        c = 1.0 - (1.0 - c) * (1.0 - acc * eGlow * 1.6);
        c += vec3(1.0, 0.22, 0.08) * dot(acc, W) * eHal * 1.8;
      }

      // ---- filter recipe ----
      vec3 o = c;
      vec3 f = c;
      if (pMono > 0.5) f = vec3(dot(f, W));
      f = lut(f);
      float l = dot(f, W);
      f = mix(vec3(l), f, 1.0 + pSat);
      f = (f - 0.5) * (1.0 + pCon) + 0.5 + pBri;
      f += vec3(pTemp * 0.1, pTemp * 0.02, -pTemp * 0.1);
      f += vec3(-pTint * 0.03, pTint * 0.07, -pTint * 0.03);
      l = clamp(dot(f, W), 0.0, 1.0);
      f += pSh * (1.0 - smoothstep(0.0, 0.6, l)) + pHi * smoothstep(0.4, 1.0, l);
      f = f * (1.0 - pFade * 0.22) + pFade * 0.22;
      c = mix(o, f, uIntensity);

      // ---- your adjustments ----
      c *= exp2(aExp);
      l = clamp(dot(c, W), 0.0, 1.0);
      c += aSh * 0.3 * (1.0 - smoothstep(0.0, 0.55, l));
      c += aHi * 0.3 * smoothstep(0.45, 1.0, l);
      c = (c - 0.5) * (1.0 + aCon) + 0.5;
      l = dot(c, W);
      c = mix(vec3(l), c, 1.0 + aSat);
      c += vec3(aTemp * 0.1, aTemp * 0.02, -aTemp * 0.1);
      c += vec3(-aTint * 0.03, aTint * 0.07, -aTint * 0.03);
      c = c * (1.0 - aFade * 0.25) + aFade * 0.25;

      vec2 d = (uv - 0.5) * vec2(aspect, 1.0) / max(aspect, 1.0);

      // flash pop
      if (eFlash > 0.0) {
        float fl = exp(-dot(d, d) * 5.0);
        c = c * (1.0 + eFlash * 0.45 * fl) + eFlash * 0.03 * fl;
        c *= 1.0 - eFlash * 0.45 * (1.0 - fl);
      }

      // light leak
      if (eLeak > 0.0) {
        float s = uSeed;
        vec2 p1 = vec2(step(0.5, fract(s * 7.31)), fract(s * 3.17));
        vec2 p2 = vec2(fract(s * 5.13), step(0.5, fract(s * 2.71)));
        vec3 warm = mix(vec3(1.0, 0.38, 0.08), vec3(1.0, 0.12, 0.35), fract(s * 9.7));
        float b1 = exp(-dot(vUv - p1, vUv - p1) / (0.06 + 0.08 * fract(s * 4.3)));
        float b2 = exp(-dot(vUv - p2, vUv - p2) / 0.03);
        vec3 leak = warm * b1 + vec3(1.0, 0.75, 0.3) * b2 * 0.7;
        c = 1.0 - (1.0 - c) * (1.0 - clamp(leak * eLeak * 1.3, 0.0, 1.0));
      }

      // vignette
      if (eVig > 0.0) {
        float r = length((vUv - 0.5) * vec2(1.0, 1.0)) * 1.414;
        c *= 1.0 - eVig * 0.85 * smoothstep(0.35, 1.15, r);
      }

      // dust & scratches
      if (eDust > 0.0) {
        float ds = uSeed + floor(uTime * 6.0) * uLive;
        vec2 g = vUv * vec2(aspect, 1.0) * 55.0;
        vec2 id = floor(g);
        float h = hash(id + ds * 13.1);
        if (h > 0.982) {
          vec2 cp = vec2(hash(id + 1.7 + ds), hash(id + 4.3 + ds));
          float rr = 0.06 + 0.16 * hash(id + 2.9);
          float m = smoothstep(rr, rr * 0.3, length(fract(g) - cp));
          c = mix(c, vec3(h > 0.991 ? 0.96 : 0.06), m * eDust);
        }
        float sx = hash(vec2(floor(uTime * 5.0) * uLive + ds, 3.3));
        float line = 1.0 - smoothstep(0.0, 0.0009, abs(vUv.x - sx));
        c = mix(c, vec3(0.92), line * eDust * 0.5 * step(0.4, hash(vec2(sx, 9.0))));
      }

      // grain
      if (eGrain > 0.0) {
        vec2 gp = vUv * vec2(aspect, 1.0) * 620.0 + uTime * uLive * vec2(113.0, 71.0);
        float n = vnoise(gp) + vnoise(gp * 2.1 + 17.0) * 0.5;
        n = n / 1.5 - 0.5;
        float lm = clamp(dot(c, W), 0.0, 1.0);
        c += n * eGrain * 0.32 * (0.5 + lm * (1.0 - lm) * 2.0);
      }

      // old phone sensor, part 2: speckly luma noise, blotchy colour noise in the
      // shadows, and clipped highlights
      if (eOld > 0.0) {
        float tt = floor(uTime * 24.0) * uLive;
        vec2 g = vUv * vec2(aspect, 1.0) * 900.0;
        float lm = clamp(dot(c, W), 0.0, 1.0);
        float dark = 1.0 - smoothstep(0.0, 0.7, lm);
        float ln = hash(floor(g) + vec2(tt * 1.7, tt * 2.3)) - 0.5;
        vec2 g2 = g / 2.6 + tt * 3.1;
        vec3 cn = vec3(vnoise(g2), vnoise(g2 + 31.7), vnoise(g2 + 67.3)) - 0.5;
        cn -= dot(cn, W);
        c += ln * eOld * (0.05 + 0.11 * dark);
        c += cn * eOld * (0.12 + 0.30 * dark);
        c = mix(c, smoothstep(0.0, 0.92, c), eOld * 0.45);
      }

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  const glCanvas = document.createElement("canvas");
  const gl = glCanvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false }) ||
    glCanvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });

  let prog, U = {}, srcTex, thumbTex, lutTex, maxTex = 4096;

  function initGL() {
    if (!gl) return false;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(prog, i).name;
      U[name] = gl.getUniformLocation(prog, name);
    }
    maxTex = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));

    const mk = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    srcTex = mk();
    thumbTex = mk();
    lutTex = mk();
    gl.uniform1i(U.uSrc, 0);
    gl.uniform1i(U.uLut, 1);
    return true;
  }

  function upload(tex, el) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
  }

  let currentLut = null;
  function setLut(f) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lutTex);
    if (currentLut === f.id) return;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutFor(f));
    currentLut = f.id;
  }

  /* Draw `tex` (srcW×srcH) into the GL canvas at w×h, cropped to fill. */
  function renderGL(tex, srcW, srcH, w, h, opts) {
    const o = Object.assign({ settings: S, mirror: false, live: false, plain: false }, opts);
    const st = o.settings;
    if (glCanvas.width !== w || glCanvas.height !== h) { glCanvas.width = w; glCanvas.height = h; }
    gl.viewport(0, 0, w, h);

    const f = o.plain ? byId.none : (byId[st.filterId] || byId.none);
    setLut(f);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // crop to fill
    const sa = srcW / srcH, ta = w / h;
    let cw = 1, ch = 1;
    if (sa > ta) cw = ta / sa; else ch = sa / ta;
    gl.uniform4f(U.uCrop, (1 - cw) / 2, (1 - ch) / 2, cw, ch);
    gl.uniform2f(U.uRes, w, h);
    gl.uniform1f(U.uMirror, o.mirror ? 1 : 0);
    gl.uniform1f(U.uTime, o.live ? (performance.now() / 1000) % 20 : 0);
    gl.uniform1f(U.uLive, o.live ? 1 : 0);
    gl.uniform1f(U.uSeed, st.leakSeed);

    const k = o.plain ? 0 : st.intensity / 100;
    gl.uniform1f(U.uIntensity, k);
    gl.uniform1f(U.pSat, f.sat); gl.uniform1f(U.pCon, f.con); gl.uniform1f(U.pBri, f.bri);
    gl.uniform1f(U.pFade, f.fade); gl.uniform1f(U.pTemp, f.temp); gl.uniform1f(U.pTint, f.tint);
    gl.uniform1f(U.pMono, f.mono ? 1 : 0);
    gl.uniform3fv(U.pSh, f.sh); gl.uniform3fv(U.pHi, f.hi);

    const a = o.plain ? {} : st.adjust;
    const v = (x) => (x || 0) / 100;
    gl.uniform1f(U.aExp, v(a.exposure) * 1.2);
    gl.uniform1f(U.aCon, v(a.contrast) * 0.6);
    gl.uniform1f(U.aSat, v(a.saturation));
    gl.uniform1f(U.aTemp, v(a.warmth));
    gl.uniform1f(U.aTint, v(a.tint));
    gl.uniform1f(U.aHi, v(a.highlights));
    gl.uniform1f(U.aSh, v(a.shadows));
    gl.uniform1f(U.aFade, v(a.fade));

    const e = o.plain ? {} : st.effects;
    const fx = f.fx || {};
    const mix = (user, preset) => Math.min(1, v(user) + (preset || 0) * k);
    gl.uniform1f(U.eGrain, mix(e.grain, fx.grain));
    gl.uniform1f(U.eVig, mix(e.vignette, fx.vig));
    gl.uniform1f(U.eGlow, mix(e.glow, fx.glow));
    gl.uniform1f(U.eHal, mix(e.halation, fx.hal));
    gl.uniform1f(U.eCA, mix(e.chroma, fx.ca));
    gl.uniform1f(U.eLeak, mix(e.leak, fx.leak));
    gl.uniform1f(U.eDust, mix(e.dust, fx.dust));
    gl.uniform1f(U.ePix, mix(e.lowres, fx.pix));
    gl.uniform1f(U.eSharp, mix(e.sharpen, fx.sharp));
    gl.uniform1f(U.eFlash, mix(e.flash, fx.flash));
    gl.uniform1f(U.eOld, mix(e.oldphone, fx.old));
    gl.uniform1f(U.eRes, mix(e.lowsize, fx.res));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ======================================================
  // FRAMES, DATE STAMP & COMPOSITING
  // ======================================================

  function layout(frame, iw, ih) {
    const u = Math.min(iw, ih);
    const pads = {
      none: [0, 0, 0, 0],
      polaroid: [0.06, 0.06, 0.06, 0.26],
      film: [0.05, 0.13, 0.05, 0.13],
      digicam: [0, 0, 0, 0],
      postcard: [0.08, 0.08, 0.08, 0.17],
      gingham: [0.075, 0.075, 0.075, 0.075]
    }[frame] || [0, 0, 0, 0];
    const [l, t, r, b] = pads.map((p) => Math.round(p * u));
    return { W: iw + l + r, H: ih + t + b, x: l, y: t, w: iw, h: ih, u };
  }

  function stampText(st) {
    let d = new Date();
    if (st.stamp === "2014") d.setFullYear(2014);
    if (st.stamp === "custom" && st.customDate) {
      const [y, m, dd] = st.customDate.split("-").map(Number);
      d = new Date(y, m - 1, dd);
    }
    const p = (n) => String(n).padStart(2, " ");
    return `'${String(d.getFullYear()).slice(-2)} ${p(d.getMonth() + 1)} ${p(d.getDate())}`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawUnder(ctx, L, st) {
    const { W, H, u } = L;
    switch (st.frame) {
      case "polaroid":
        ctx.fillStyle = "#fbf8f1"; ctx.fillRect(0, 0, W, H); break;
      case "film": {
        ctx.fillStyle = "#16110f"; ctx.fillRect(0, 0, W, H);
        const hw = u * 0.045, hh = u * 0.06, gap = u * 0.035;
        ctx.fillStyle = "#f6efe4";
        for (let x = gap / 2; x < W; x += hw + gap) {
          roundRect(ctx, x, L.y * 0.22, hw, hh, hw * 0.2); ctx.fill();
          roundRect(ctx, x, H - L.y * 0.22 - hh, hw, hh, hw * 0.2); ctx.fill();
        }
        ctx.fillStyle = "#ff9b3d";
        ctx.font = `${Math.round(u * 0.032)}px "VT323", monospace`;
        ctx.textBaseline = "middle";
        ctx.fillText("TUMBLR TONE 400", L.x, L.y * 0.8);
        ctx.textAlign = "right";
        ctx.fillText("14A  ▶", W - L.x, H - L.y * 0.8);
        ctx.textAlign = "left";
        break;
      }
      case "postcard":
        ctx.fillStyle = "#fffbf5"; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "#f5bfcb";
        ctx.lineWidth = u * 0.025;
        ctx.setLineDash([u * 0.025, u * 0.02]);
        ctx.strokeRect(u * 0.0125, u * 0.0125, W - u * 0.025, H - u * 0.025);
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(91,23,23,0.75)";
        ctx.lineWidth = Math.max(1, u * 0.003);
        ctx.strokeRect(u * 0.04, u * 0.04, W - u * 0.08, H - u * 0.08);
        break;
      case "gingham": {
        ctx.fillStyle = "#fce0e6"; ctx.fillRect(0, 0, W, H);
        const c = u * 0.04;
        ctx.fillStyle = "rgba(238,98,162,0.45)";
        for (let x = 0; x < W; x += c * 2) ctx.fillRect(x, 0, c, H);
        for (let y = 0; y < H; y += c * 2) ctx.fillRect(0, y, W, c);
        ctx.fillStyle = "#fffbf5";
        const m = u * 0.018;
        ctx.fillRect(L.x - m, L.y - m, L.w + m * 2, L.h + m * 2);
        break;
      }
    }
  }

  function drawOver(ctx, L, st) {
    const { x, y, w, h, u } = L;

    if (st.frame === "digicam") {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.lineWidth = Math.max(1.5, u * 0.006);
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = u * 0.006;
      const m = u * 0.05, c = u * 0.07;
      [[x + m, y + m, 1, 1], [x + w - m, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m, y + h - m, -1, -1]]
        .forEach(([px, py, sx, sy]) => {
          ctx.beginPath(); ctx.moveTo(px, py + c * sy); ctx.lineTo(px, py); ctx.lineTo(px + c * sx, py); ctx.stroke();
        });
      ctx.font = `${Math.round(u * 0.05)}px "VT323", monospace`;
      ctx.textBaseline = "top";
      ctx.fillText("▣ AUTO", x + m * 1.6, y + m * 1.5);
      ctx.textAlign = "right";
      ctx.fillText("FINE [14]", x + w - m * 1.6, y + m * 1.5);
      // battery
      const bw = u * 0.07, bh = u * 0.034, bx = x + w - m * 1.6 - bw, by = y + m * 1.5 + u * 0.06;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillRect(bx + bw, by + bh * 0.3, bw * 0.08, bh * 0.4);
      for (let i = 0; i < 3; i++) ctx.fillRect(bx + bw * (0.08 + i * 0.3), by + bh * 0.2, bw * 0.24, bh * 0.6);
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("1/60 F2.8 ISO400", x + m * 1.6, y + h - m * 1.5);
      // focus box
      const fb = u * 0.12;
      ctx.lineWidth = Math.max(1, u * 0.004);
      ctx.strokeStyle = "rgba(140,255,140,0.9)";
      ctx.strokeRect(x + w / 2 - fb / 2, y + h / 2 - fb / 2, fb, fb);
      ctx.restore();
    }

    if ((st.frame === "polaroid" || st.frame === "postcard") && st.caption) {
      ctx.save();
      ctx.fillStyle = "#5b1717";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fs = Math.round(u * (st.frame === "polaroid" ? 0.085 : 0.065));
      ctx.font = `700 ${fs}px "Snell Roundhand", "Great Vibes", cursive`;
      const cy = st.frame === "polaroid" ? y + h + (L.H - y - h) * 0.5 : y + h + (L.H - y - h) * 0.45;
      ctx.fillText(st.caption, L.W / 2, cy, L.W * 0.86);
      ctx.restore();
    }

    if (st.stamp !== "off") {
      ctx.save();
      const fs = Math.round(u * 0.068);
      ctx.font = `${fs}px "VT323", monospace`;
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      const tx = x + w - u * 0.05;
      const ty = y + h - u * (st.frame === "digicam" ? 0.11 : 0.05);
      ctx.shadowColor = st.stampColor;
      ctx.shadowBlur = u * 0.02;
      ctx.fillStyle = st.stampColor;
      ctx.globalAlpha = 0.92;
      const t = stampText(st);
      ctx.fillText(t, tx, ty);
      ctx.shadowBlur = u * 0.006;
      ctx.fillText(t, tx, ty);
      ctx.restore();
    }
  }

  /* Render the full picture (GL + frame + stamp) into a 2D canvas. */
  function compose(target, tex, srcW, srcH, iw, ih, opts = {}) {
    const st = opts.settings || S;
    const plain = !!opts.plain;
    const L = layout(plain ? "none" : st.frame, iw, ih);
    if (target.width !== L.W || target.height !== L.H) { target.width = L.W; target.height = L.H; }
    const ctx = target.getContext("2d");
    renderGL(tex, srcW, srcH, iw, ih, opts);
    if (!plain) drawUnder(ctx, L, st);
    ctx.drawImage(glCanvas, L.x, L.y, L.w, L.h);
    if (!plain) drawOver(ctx, L, st);
    return target;
  }

  // ======================================================
  // SIZES
  // ======================================================

  function aspectRatio(a) { const [w, h] = a.split(":").map(Number); return w / h; }

  function fit(srcW, srcH, ratio, maxLong) {
    // largest w×h of `ratio` that fits inside the source, capped at maxLong
    let w = srcW, h = srcW / ratio;
    if (h > srcH) { h = srcH; w = srcH * ratio; }
    const s = Math.min(1, maxLong / Math.max(w, h));
    return [Math.max(2, Math.round(w * s)), Math.max(2, Math.round(h * s))];
  }

  function sourceSize() {
    if (app.mode === "camera") { const v = $("video"); return [v.videoWidth, v.videoHeight]; }
    if (app.mode === "video") return [app.fileVideo.videoWidth, app.fileVideo.videoHeight];
    if (app.mode === "image") return [app.image.width, app.image.height];
    return [0, 0];
  }

  function targetRatio() {
    const [sw, sh] = sourceSize();
    return app.mode === "camera" ? aspectRatio(app.aspect) : sw / sh;
  }

  // ======================================================
  // PREVIEW LOOP
  // ======================================================

  const out = $("out");
  let renderQueued = false, loopOn = false;

  function renderPreview() {
    if (app.mode === "empty") return;
    const [sw, sh] = sourceSize();
    if (!sw || !sh) return;
    const live = app.mode === "camera" || app.mode === "video";
    const [iw, ih] = fit(sw, sh, targetRatio(), live ? 1080 : 1500);
    if (live) upload(srcTex, app.mode === "camera" ? $("video") : app.fileVideo);
    compose(out, srcTex, sw, sh, iw, ih, {
      mirror: app.mode === "camera" && app.facing === "user",
      live: live,
      plain: app.comparing
    });
  }

  function scheduleRender() {
    if (loopOn || renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; renderPreview(); });
  }

  function loop() {
    if (!loopOn) return;
    const el = app.mode === "camera" ? $("video") : app.fileVideo;
    if (el && el.readyState >= 2) renderPreview();
    requestAnimationFrame(loop);
  }
  function startLoop() { if (!loopOn) { loopOn = true; requestAnimationFrame(loop); } }
  function stopLoop() { loopOn = false; }

  // ======================================================
  // THUMBNAILS
  // ======================================================

  const thumbSrc = document.createElement("canvas");
  thumbSrc.width = 132; thumbSrc.height = 168;

  function drawSampleScene(c) {
    const x = c.getContext("2d"), w = c.width, h = c.height;
    let g = x.createLinearGradient(0, 0, 0, h * 0.62);
    g.addColorStop(0, "#7fb4e8"); g.addColorStop(0.6, "#f7b7c8"); g.addColorStop(1, "#ffd9a8");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "#fff3c4"; x.beginPath(); x.arc(w * 0.66, h * 0.42, w * 0.16, 0, 7); x.fill();
    g = x.createLinearGradient(0, h * 0.6, 0, h);
    g.addColorStop(0, "#3d7fa8"); g.addColorStop(1, "#18465f");
    x.fillStyle = g; x.fillRect(0, h * 0.6, w, h * 0.2);
    x.fillStyle = "#e9c99a"; x.fillRect(0, h * 0.78, w, h * 0.22);
    x.fillStyle = "#ee62a2"; x.save(); x.translate(w * 0.3, h * 0.82); x.scale(w / 132, w / 132);
    x.beginPath(); x.moveTo(0, 6); x.bezierCurveTo(-16, -6, -8, -18, 0, -9); x.bezierCurveTo(8, -18, 16, -6, 0, 6); x.fill(); x.restore();
    x.fillStyle = "#2a1a1a"; x.fillRect(w * 0.12, h * 0.3, w * 0.03, h * 0.5);
  }

  function updateThumbSource() {
    const x = thumbSrc.getContext("2d");
    const [sw, sh] = sourceSize();
    if (!sw) { drawSampleScene(thumbSrc); return; }
    const el = app.mode === "camera" ? $("video") : app.mode === "video" ? app.fileVideo : app.image;
    const ta = thumbSrc.width / thumbSrc.height, sa = sw / sh;
    let cw = sw, ch = sh;
    if (sa > ta) cw = sh * ta; else ch = sw / ta;
    x.save();
    if (app.mode === "camera" && app.facing === "user") { x.translate(thumbSrc.width, 0); x.scale(-1, 1); }
    x.drawImage(el, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, thumbSrc.width, thumbSrc.height);
    x.restore();
  }

  function renderThumbs() {
    if (!gl) return;
    updateThumbSource();
    upload(thumbTex, thumbSrc);
    const thumbSettings = { ...S, intensity: 100, adjust: {}, effects: {} };
    document.querySelectorAll(".fthumb").forEach((btn) => {
      thumbSettings.filterId = btn.dataset.id;
      renderGL(thumbTex, thumbSrc.width, thumbSrc.height, thumbSrc.width, thumbSrc.height, { settings: thumbSettings });
      const c = btn.querySelector("canvas");
      c.getContext("2d").drawImage(glCanvas, 0, 0, c.width, c.height);
    });
    if (app.mode === "image") scheduleRender();
  }

  // ======================================================
  // UI BUILDERS
  // ======================================================

  function makeSlider(host, def, get, set) {
    const wrap = host.classList && host.classList.contains("slider") ? host : document.createElement("div");
    wrap.className = "slider";
    const id = "sl-" + def.key;
    wrap.innerHTML = `<div class="slider-head"><label for="${id}">${def.label}</label><output></output></div>
      <input type="range" id="${id}" min="${def.min}" max="${def.max}" step="1">`;
    const input = wrap.querySelector("input"), outEl = wrap.querySelector("output");
    const sync = () => { input.value = get(); outEl.textContent = get(); };
    input.addEventListener("input", () => { set(Number(input.value)); outEl.textContent = input.value; scheduleRender(); });
    input.addEventListener("dblclick", () => { set(def.key === "intensity" ? 100 : 0); sync(); scheduleRender(); });
    sync();
    if (wrap !== host) host.appendChild(wrap);
    wrap._sync = sync;
    return wrap;
  }

  function makeChips(host, items, get, set, cls = "chip") {
    host.innerHTML = "";
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.textContent = it.name;
      b.dataset.id = it.id;
      b.addEventListener("click", () => { set(it.id); paint(); scheduleRender(); });
      host.appendChild(b);
    });
    const paint = () => host.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.id === get()));
    paint();
    host._paint = paint;
  }

  const sliders = [];

  function buildUI() {
    // groups
    const groupsEl = $("filterGroups");
    let activeGroup = "all";
    makeChips(groupsEl, [{ id: "all", name: "All" }, ...GROUPS], () => activeGroup, (g) => {
      activeGroup = g;
      document.querySelectorAll(".fthumb").forEach((b) => {
        b.hidden = !(g === "all" || b.dataset.group === g || b.dataset.id === "none");
      });
      $("filterStrip").scrollLeft = 0;
    });

    // filter strip
    const strip = $("filterStrip");
    LOOKS.forEach((f) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fthumb";
      b.dataset.id = f.id;
      b.dataset.group = f.group;
      const c = document.createElement("canvas");
      c.width = 132; c.height = 168;
      const s = document.createElement("span");
      s.textContent = f.name;
      b.append(c, s);
      b.addEventListener("click", () => { S.filterId = f.id; paintFilter(); scheduleRender(); });
      strip.appendChild(b);
    });

    sliders.push(makeSlider(document.querySelector('[data-key="intensity"]'),
      { key: "intensity", label: "Filter strength", min: 0, max: 100 },
      () => S.intensity, (v) => { S.intensity = v; }));

    const adj = $("panel-adjust");
    ADJUST.forEach((d) => sliders.push(makeSlider(adj, d, () => S.adjust[d.key], (v) => { S.adjust[d.key] = v; })));

    const fx = $("panel-effects");
    EFFECTS.forEach((d) => sliders.push(makeSlider(fx, d, () => S.effects[d.key], (v) => { S.effects[d.key] = v; })));

    $("newLeakBtn").addEventListener("click", () => {
      S.leakSeed = Math.random();
      if (S.effects.leak === 0 && !((byId[S.filterId].fx || {}).leak)) { S.effects.leak = 45; syncAll(); }
      scheduleRender();
    });

    makeChips($("stampChips"), STAMPS, () => S.stamp, (v) => {
      S.stamp = v;
      $("customDateRow").hidden = v !== "custom";
    });
    makeChips($("stampColorChips"), STAMP_COLORS.map((c) => ({ id: c, name: "" })), () => S.stampColor, (v) => { S.stampColor = v; }, "swatch");
    $("stampColorChips").querySelectorAll(".swatch").forEach((b) => {
      b.style.background = b.dataset.id;
      b.setAttribute("aria-label", "Stamp colour " + b.dataset.id);
    });
    $("customDate").addEventListener("input", (e) => { S.customDate = e.target.value; scheduleRender(); });

    makeChips($("frameChips"), FRAMES, () => S.frame, (v) => {
      S.frame = v;
      $("captionRow").hidden = !(v === "polaroid" || v === "postcard");
    });
    $("caption").addEventListener("input", (e) => { S.caption = e.target.value; scheduleRender(); });

    makeChips($("qualityChips"), QUALITY, () => app.quality, (v) => { app.quality = v; });
    makeChips($("aspectChips"), ASPECTS.map((a) => ({ id: a, name: a })), () => app.aspect, (v) => { app.aspect = v; paintHud(); });
    makeChips($("gridChips"), [{ id: "off", name: "Off" }, { id: "on", name: "3×3" }], () => (app.grid ? "on" : "off"), (v) => {
      app.grid = v === "on";
      $("gridOverlay").hidden = !(app.mode === "camera" && app.grid);
    });
    makeChips($("soundChips"), [{ id: "on", name: "Beep" }, { id: "off", name: "Quiet" }], () => (app.sound ? "on" : "off"), (v) => { app.sound = v === "on"; });

    // tabs
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + t.dataset.tab));
    }));

    paintFilter();
  }

  function paintFilter() {
    document.querySelectorAll(".fthumb").forEach((b) => b.classList.toggle("active", b.dataset.id === S.filterId));
    $("filterBlurb").textContent = byId[S.filterId].blurb;
    $("hudLook").textContent = byId[S.filterId].name;
    paintBody();
  }

  // each camera look can bring its own painted body
  const BODY_FOR = { "4s": "phone4s", "5c": "phone5c", ix: "compact", fj: "compact", kh: "compact" };
  function paintBody() {
    const body = BODY_FOR[S.filterId] || "pink";
    if (document.body.dataset.body === body) return;
    document.body.dataset.body = body;
    $("camArt").src = body === "pink" ? "img/camera-blank.webp" : `img/body-${body}.webp`;
    const st = $("strap");
    st.classList.remove("jiggle"); void st.offsetWidth; st.classList.add("jiggle");
  }

  function paintHud() {
    $("hudFlash").textContent = app.flash ? "⚡ON" : "⚡OFF";
    $("hudFlash").hidden = app.camMode === "video" || app.mode !== "camera";
    $("hudTimer").textContent = app.timer ? `⏱${app.timer}s` : "";
    $("hudAspect").textContent = app.mode === "camera" ? app.aspect : "";
    $("hudMode").textContent = { camera: app.camMode === "video" ? "● MOVIE" : "AUTO", image: "EDIT", video: "EDIT", empty: "" }[app.mode];
    $("modeLabel").textContent = app.camMode === "video" ? "vid" : "pic";
    document.body.classList.toggle("cam-video", app.camMode === "video");
    $("dpUp").classList.toggle("on", app.flash);
    $("dpDown").classList.toggle("on", !!app.timer);
    const label = app.mode === "camera" ? (app.camMode === "video" ? (app.recorder ? "stop ■" : "rec ●") : "snap ♡") : app.mode === "empty" ? "on ♡" : "save ♡";
    $("shutterLabel").textContent = label;
    $("deckShutter").textContent = label;
    $("deckMode").textContent = app.camMode === "video" ? "vid" : "pic";
    $("deckFlash").classList.toggle("on", app.flash);
    $("deckTimer").classList.toggle("on", !!app.timer);
    $("shutter").classList.toggle("video", app.mode === "camera" && app.camMode === "video");
    $("shutter").setAttribute("aria-label", app.mode === "camera" ? (app.camMode === "video" ? "Start or stop recording" : "Take photo") : app.mode === "empty" ? "Turn camera on" : "Save");
  }

  // ---------- looks ----------

  let lookTimer;
  function stepLook(dir) {
    const i = LOOKS.findIndex((f) => f.id === S.filterId);
    const f = LOOKS[(i + dir + LOOKS.length) % LOOKS.length];
    S.filterId = f.id;
    paintFilter();
    scheduleRender();
    beep(dir > 0 ? 1320 : 1180, 0.03);
    const g = GROUPS.find((x) => x.id === f.group);
    $("lookToastGroup").textContent = g ? g.name.toUpperCase() : "NO FILTER";
    $("lookToastName").textContent = f.name;
    const t = $("lookToast");
    t.hidden = true; void t.offsetWidth; t.hidden = false;
    clearTimeout(lookTimer);
    lookTimer = setTimeout(() => (t.hidden = true), 1100);
    const thumb = document.querySelector(`.fthumb[data-id="${f.id}"]`);
    if (thumb && !$("menu").hidden) thumb.scrollIntoView({ inline: "center", block: "nearest" });
  }

  // ---------- little camera beeps ----------

  let beepCtx = null;
  function beep(freq = 1400, dur = 0.05, vol = 0.05) {
    if (!app.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      beepCtx = beepCtx || new AC();
      const o = beepCtx.createOscillator(), g = beepCtx.createGain();
      o.type = "square"; o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + dur);
      o.connect(g).connect(beepCtx.destination);
      o.start(); o.stop(beepCtx.currentTime + dur);
    } catch (e) { /* no sound, no problem */ }
  }
  function shutterSound() {
    if (!app.sound) return;
    beep(2200, 0.02, 0.06);
    setTimeout(() => beep(900, 0.06, 0.05), 70);
  }

  function syncAll() {
    sliders.forEach((s) => s._sync());
    ["stampChips", "stampColorChips", "frameChips", "qualityChips"].forEach((id) => $(id)._paint());
    $("customDateRow").hidden = S.stamp !== "custom";
    $("captionRow").hidden = !(S.frame === "polaroid" || S.frame === "postcard");
    $("customDate").value = S.customDate;
    $("caption").value = S.caption;
    paintFilter();
  }

  // ======================================================
  // MODES
  // ======================================================

  function setMode(mode) {
    app.mode = mode;
    document.body.className = "mode-" + mode;
    $("emptyState").hidden = mode !== "empty";
    if (mode === "empty") out.getContext("2d").clearRect(0, 0, out.width, out.height);
    paintHud();
    $("gridOverlay").hidden = !(mode === "camera" && app.grid);
    if (mode === "camera" || mode === "video") startLoop(); else stopLoop();
    if (mode !== "video" && app.fileVideo) { app.fileVideo.pause(); }
  }

  // ---------- camera ----------

  function stopCamera() {
    if (app.stream) app.stream.getTracks().forEach((t) => t.stop());
    app.stream = null;
    $("video").srcObject = null;
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Camera needs https and a modern browser ♡");
      return;
    }
    stopCamera();
    const video = { facingMode: app.facing, width: { ideal: 1920 }, height: { ideal: 1440 } };
    try {
      try {
        app.stream = await navigator.mediaDevices.getUserMedia({ video, audio: app.camMode === "video" });
      } catch (err) {
        if (app.camMode !== "video") throw err;
        app.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        toast("No microphone, videos will be silent");
      }
    } catch (err) {
      console.warn(err);
      toast(err.name === "NotAllowedError" ? "Camera permission was declined" : "Couldn't open the camera");
      if (app.mode === "camera") setMode(app.image ? "image" : "empty");
      return;
    }
    const v = $("video");
    v.srcObject = app.stream;
    v.muted = true;
    await v.play().catch(() => {});
    $("mediaInfo").textContent = "";
    setMode("camera");
    await waitFor(() => v.videoWidth > 0, 3000);
    setTimeout(renderThumbs, 300);
  }

  function waitFor(cond, ms) {
    return new Promise((res) => {
      const t0 = performance.now();
      const tick = () => (cond() || performance.now() - t0 > ms ? res() : setTimeout(tick, 50));
      tick();
    });
  }

  async function capturePhoto() {
    if (app.busy) return;
    app.busy = true;
    try {
      if (app.timer) await countdown(app.timer);
      let undoFlash = null;
      if (app.flash) undoFlash = await fireFlash();

      const v = $("video");
      const sw = v.videoWidth, sh = v.videoHeight;
      // freeze the raw frame (for re-editing later)
      const raw = document.createElement("canvas");
      const [rw, rh] = fit(sw, sh, aspectRatio(app.aspect), maxTex);
      raw.width = rw; raw.height = rh;
      const rx = raw.getContext("2d");
      const sa = sw / sh, ta = rw / rh;
      let cw = sw, ch = sh;
      if (sa > ta) cw = sh * ta; else ch = sw / ta;
      if (app.facing === "user") { rx.translate(rw, 0); rx.scale(-1, 1); }
      rx.drawImage(v, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, rw, rh);
      if (undoFlash) undoFlash();

      shutterSound();
      $("flash").classList.remove("go"); void $("flash").offsetWidth; $("flash").classList.add("go");
      setTimeout(() => $("flash").classList.remove("go"), 600);
      if (navigator.vibrate) navigator.vibrate(20);

      const blob = await renderStill(raw);
      const original = await toBlob(raw, "image/jpeg", 0.92);
      const item = await rollAdd({ type: "image", blob, original, settings: snapshot() });
      setPeek(item);
      toast("Developed ♥ tap the little photo to save it");
    } finally {
      app.busy = false;
    }
  }

  function countdown(n) {
    const el = $("countdown");
    el.hidden = false;
    return new Promise((res) => {
      const step = () => {
        if (n === 0) { el.hidden = true; res(); return; }
        el.textContent = n--;
        setTimeout(step, 1000);
      };
      step();
    });
  }

  async function fireFlash() {
    const track = app.stream && app.stream.getVideoTracks()[0];
    const caps = track && track.getCapabilities ? track.getCapabilities() : {};
    if (app.facing === "environment" && caps.torch) {
      try {
        await track.applyConstraints({ advanced: [{ torch: true }] });
        await new Promise((r) => setTimeout(r, 450));
        return () => track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
      } catch (e) { /* fall through to screen flash */ }
    }
    const d = document.createElement("div");
    d.className = "screen-flash";
    document.body.appendChild(d);
    await new Promise((r) => setTimeout(r, 380));
    return () => d.remove();
  }

  // ---------- video recording ----------

  function pickMime() {
    const list = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return list.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
  }

  function startRecording(audioTracks) {
    if (!window.MediaRecorder || !out.captureStream) { toast("Video recording isn't supported in this browser"); return null; }
    const stream = new MediaStream([...out.captureStream(30).getVideoTracks(), ...(audioTracks || [])]);
    const mimeType = pickMime();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6e6 } : {});
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.done = new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || mimeType || "video/webm" }));
    });
    rec.start(250);
    const t0 = Date.now();
    $("recBadge").hidden = false;
    rec.ticker = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      $("recTime").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }, 250);
    return rec;
  }

  async function stopRecording(rec) {
    clearInterval(rec.ticker);
    $("recBadge").hidden = true;
    $("recTime").textContent = "0:00";
    rec.stop();
    return rec.done;
  }

  async function toggleCameraRecording() {
    const sh = $("shutter");
    if (app.recorder) {
      const rec = app.recorder;
      app.recorder = null;
      sh.classList.remove("recording");
      paintHud();
      const blob = await stopRecording(rec);
      if (blob.size < 2000) { toast("That recording came out empty, try again"); return; }
      const item = await rollAdd({ type: "video", blob, settings: snapshot() });
      setPeek(item);
      openViewer(item);
    } else {
      app.recorder = startRecording(app.stream ? app.stream.getAudioTracks() : []);
      if (app.recorder) { sh.classList.add("recording"); beep(1600, 0.08); }
      paintHud();
    }
  }

  // ---------- files ----------

  async function loadFile(file) {
    if (!file) return;
    if (app.recorder) return;
    stopCamera();
    if (file.type.startsWith("video/")) return loadVideoFile(file);
    try {
      await loadImageBlob(file);
      app.originalBlob = file;
      $("mediaInfo").textContent = `${app.image.width}×${app.image.height}`;
    } catch (e) {
      console.warn(e);
      toast("Couldn't open that photo");
    }
  }

  async function loadImageBlob(blob) {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    URL.revokeObjectURL(url);
    // cap to GPU limits
    const [w, h] = fit(img.naturalWidth, img.naturalHeight, img.naturalWidth / img.naturalHeight, Math.min(maxTex, 4096));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    app.image = c;
    upload(srcTex, c);
    setMode("image");
    renderThumbs();
    scheduleRender();
  }

  async function loadVideoFile(file) {
    if (!app.fileVideo) {
      app.fileVideo = document.createElement("video");
      app.fileVideo.playsInline = true;
      app.fileVideo.setAttribute("playsinline", "");
      app.fileVideo.loop = true;
      app.fileVideo.muted = true;
    }
    const v = app.fileVideo;
    if (v.src) URL.revokeObjectURL(v.src);
    v.src = URL.createObjectURL(file);
    try {
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; });
      v.loop = true;
      v.muted = true;
      await v.play();
    } catch (e) {
      toast("Couldn't play that video here");
      return;
    }
    setMode("video");
    $("mediaInfo").textContent = `${Math.round(v.duration || 0)}s`;
    setTimeout(renderThumbs, 200);
  }

  let audioCtx = null, mediaSrcNode = null, audioDest = null;
  async function exportVideoFile() {
    const v = app.fileVideo;
    app.busy = true;
    $("shutter").disabled = true;
    $("shutterLabel").textContent = "developing…";
    let audioTracks = [];
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          audioCtx = new AC();
          mediaSrcNode = audioCtx.createMediaElementSource(v);
          audioDest = audioCtx.createMediaStreamDestination();
          mediaSrcNode.connect(audioDest);
        }
      }
      if (audioCtx) { await audioCtx.resume(); audioTracks = audioDest.stream.getAudioTracks(); }
    } catch (e) { console.warn("no audio", e); }

    v.pause();
    v.loop = false;
    v.currentTime = 0;
    v.muted = !audioCtx;
    await new Promise((r) => { v.onseeked = r; setTimeout(r, 600); });
    const rec = startRecording(audioTracks);
    if (!rec) { finish(); return; }
    await v.play();
    await new Promise((res) => { v.onended = res; });
    const blob = await stopRecording(rec);
    finish();
    if (blob.size < 2000) { toast("That video came out empty, try again"); return; }
    const item = await rollAdd({ type: "video", blob, settings: snapshot() });
    openViewer(item);

    function finish() {
      v.onended = null;
      v.loop = true;
      v.muted = true;
      v.play().catch(() => {});
      app.busy = false;
      $("shutter").disabled = false;
      paintHud();
    }
  }

  // ---------- stills ----------

  function toBlob(canvas, type, q) {
    return new Promise((res) => canvas.toBlob(res, type, q));
  }

  async function renderStill(srcCanvas, settings = S) {
    const Q = QUALITY.find((x) => x.id === app.quality);
    const [iw, ih] = fit(srcCanvas.width, srcCanvas.height, srcCanvas.width / srcCanvas.height, Math.min(Q.max, maxTex));
    upload(srcTex, srcCanvas);
    const target = document.createElement("canvas");
    compose(target, srcTex, srcCanvas.width, srcCanvas.height, iw, ih, { settings });
    const blob = await toBlob(target, "image/jpeg", Q.q);
    // restore preview texture
    if (app.mode === "image" && app.image && app.image !== srcCanvas) upload(srcTex, app.image);
    return blob;
  }

  async function saveCurrent() {
    if (app.busy) return;
    if (app.mode === "video") return exportVideoFile();
    if (app.mode !== "image") return;
    app.busy = true;
    try {
      const blob = await renderStill(app.image);
      const original = app.originalBlob || await toBlob(app.image, "image/jpeg", 0.92);
      const item = await rollAdd({ type: "image", blob, original, settings: snapshot() });
      openViewer(item);
    } finally {
      app.busy = false;
    }
  }

  function snapshot() { return JSON.parse(JSON.stringify(S)); }

  // ======================================================
  // THE ROLL (IndexedDB)
  // ======================================================

  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open("tumblrtone", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("roll", { keyPath: "id", autoIncrement: true });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction("roll", mode);
      const req = fn(t.objectStore("roll"));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  }

  const memRoll = []; // fallback when storage is blocked
  async function rollAdd(item) {
    item.created = Date.now();
    try {
      item.id = await tx("readwrite", (s) => s.add(item));
    } catch (e) {
      item.id = "m" + Date.now();
      memRoll.push(item);
    }
    await renderRoll();
    return item;
  }
  async function rollAll() {
    let items = [];
    try { items = await tx("readonly", (s) => s.getAll()); } catch (e) { /* ignore */ }
    return [...(items || []), ...memRoll].sort((a, b) => b.created - a.created);
  }
  async function rollDelete(id) {
    const i = memRoll.findIndex((m) => m.id === id);
    if (i >= 0) memRoll.splice(i, 1);
    else await tx("readwrite", (s) => s.delete(id)).catch(() => {});
    await renderRoll();
  }

  const urls = new Map();
  function urlFor(item) {
    if (!urls.has(item.id)) urls.set(item.id, URL.createObjectURL(item.blob));
    return urls.get(item.id);
  }

  async function renderRoll() {
    const items = await rollAll();
    const grid = $("rollGrid");
    grid.innerHTML = "";
    $("rollEmpty").hidden = items.length > 0;
    items.forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "roll-item";
      b.setAttribute("aria-label", item.type === "video" ? "Open video" : "Open photo");
      if (item.type === "video") {
        const v = document.createElement("video");
        v.src = urlFor(item) + "#t=0.1";
        v.muted = true; v.playsInline = true; v.preload = "metadata";
        const tag = document.createElement("span"); tag.className = "vid-tag"; tag.textContent = "VIDEO";
        b.append(v, tag);
      } else {
        const img = document.createElement("img");
        img.src = urlFor(item); img.alt = ""; img.loading = "lazy";
        b.appendChild(img);
      }
      b.addEventListener("click", () => openViewer(item));
      grid.appendChild(b);
    });
    setPeek(items[0]);
  }

  function setPeek(item) {
    const p = $("rollPeek");
    p.innerHTML = "";
    p._item = item || null;
    if (!item) { p.innerHTML = "<span>♡</span>"; return; }
    if (item.type === "video") p.innerHTML = "<span>▶</span>";
    else { const img = document.createElement("img"); img.src = urlFor(item); img.alt = ""; p.appendChild(img); }
  }

  // ---------- viewer ----------

  let viewing = null;
  function openViewer(item) {
    viewing = item;
    const m = $("viewerMedia");
    m.innerHTML = "";
    if (item.type === "video") {
      const v = document.createElement("video");
      v.src = urlFor(item); v.controls = true; v.playsInline = true; v.loop = true; v.autoplay = true;
      m.appendChild(v);
    } else {
      const img = document.createElement("img");
      img.src = urlFor(item); img.alt = "Your edited photo";
      m.appendChild(img);
    }
    $("viewerEdit").hidden = !item.original;
    $("viewerHint").textContent = item.type === "video"
      ? "On iPhone, pick “Save Video” in the share sheet."
      : "On iPhone, pick “Save Image” in the share sheet, or long-press the photo.";
    $("viewer").hidden = false;
  }
  function closeViewer() {
    $("viewer").hidden = true;
    $("viewerMedia").innerHTML = "";
    viewing = null;
  }

  async function shareItem(item) {
    const ext = item.blob.type.includes("mp4") ? "mp4" : item.blob.type.includes("webm") ? "webm" : "jpg";
    const name = `tumblrtone-${new Date(item.created).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`;
    const file = new File([item.blob], name, { type: item.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = urlFor(item);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ======================================================
  // MISC
  // ======================================================

  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  function openRoll() { $("roll").hidden = false; beep(1000, 0.04); }
  function closeRoll() { $("roll").hidden = true; }

  function openMenu() {
    $("menu").hidden = false;
    document.body.dataset.menu = "1";
    $("funcBtn").classList.add("on");
    renderThumbs();
    const a = document.querySelector(".fthumb.active");
    if (a) a.scrollIntoView({ inline: "center", block: "nearest" });
  }
  function closeMenu() { $("menu").hidden = true; delete document.body.dataset.menu; $("funcBtn").classList.remove("on"); }

  function powerOn() { if (app.mode !== "camera") startCamera(); }
  function powerOff() {
    if (app.recorder) return;
    stopCamera();
    closeMenu();
    setMode("empty");
  }

  function wire() {
    $("powerBtn").addEventListener("click", () => {
      beep(880, 0.08);
      if (app.mode === "empty") powerOn(); else powerOff();
    });
    $("emptyState").addEventListener("click", powerOn);
    $("emptyState").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") powerOn(); });
    $("fileInput").addEventListener("change", (e) => { closeMenu(); loadFile(e.target.files[0]); e.target.value = ""; });

    $("shutter").addEventListener("click", () => {
      if (app.mode === "empty") return powerOn();
      if (app.mode === "camera") {
        if (app.camMode === "video") toggleCameraRecording(); else capturePhoto();
        return;
      }
      shutterSound();
      saveCurrent();
    });
    $("flipBtn").addEventListener("click", () => {
      if (app.recorder) return;
      app.facing = app.facing === "user" ? "environment" : "user";
      beep(1200, 0.03);
      startCamera();
    });
    $("rollPeek").addEventListener("click", () => {
      const it = $("rollPeek")._item;
      if (it) openViewer(it); else openRoll();
    });
    $("rollBtn").addEventListener("click", openRoll);
    $("deck").addEventListener("click", (e) => {
      const b = e.target.closest("[data-for]");
      if (!b) return;
      if (b.dataset.for === "mode") { const m = document.querySelector(".mode:not(.active)"); if (m) m.click(); return; }
      $(b.dataset.for).click();
    });
    $("rollClose").addEventListener("click", closeRoll);
    $("roll").addEventListener("click", (e) => { if (e.target === $("roll")) closeRoll(); });

    // D-pad
    $("dpLeft").addEventListener("click", () => stepLook(-1));
    $("dpRight").addEventListener("click", () => stepLook(1));
    $("dpUp").addEventListener("click", () => {
      app.flash = !app.flash;
      beep(1500, 0.03);
      paintHud();
      toast(app.flash ? "Flash on ⚡" : "Flash off");
    });
    $("dpDown").addEventListener("click", () => {
      app.timer = { 0: 3, 3: 10, 10: 0 }[app.timer];
      beep(1500, 0.03);
      paintHud();
      toast(app.timer ? `Self-timer ${app.timer}s` : "Self-timer off");
    });
    $("funcBtn").addEventListener("click", () => {
      beep(1100, 0.04);
      if ($("menu").hidden) openMenu(); else closeMenu();
    });
    $("menuClose").addEventListener("click", closeMenu);

    document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => {
      if (app.recorder || b.dataset.mode === app.camMode) return;
      app.camMode = b.dataset.mode;
      document.querySelectorAll(".mode").forEach((x) => x.classList.toggle("active", x === b));
      beep(1300, 0.03);
      paintHud();
      if (app.mode === "camera") startCamera(); // reopen with / without microphone
    }));

    // screen: swipe to change looks, hold to compare (when editing)
    let downX = null, downY = 0, holdTimer = null;
    const off = () => { clearTimeout(holdTimer); if (app.comparing) { app.comparing = false; scheduleRender(); } };
    out.addEventListener("pointerdown", (e) => {
      downX = e.clientX; downY = e.clientY;
      if (app.mode === "image" || app.mode === "video") {
        holdTimer = setTimeout(() => { app.comparing = true; scheduleRender(); }, 180);
      }
    });
    out.addEventListener("pointerup", (e) => {
      off();
      if (downX === null) return;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      downX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) stepLook(dx < 0 ? 1 : -1);
    });
    out.addEventListener("pointerleave", () => { off(); downX = null; });
    out.addEventListener("pointercancel", () => { off(); downX = null; });
    out.addEventListener("contextmenu", (e) => e.preventDefault());

    $("resetBtn").addEventListener("click", () => {
      const keepFilter = S.filterId;
      S = defaults();
      S.filterId = keepFilter;
      syncAll();
      scheduleRender();
      toast("Back to fresh ♡");
    });

    $("viewerClose").addEventListener("click", closeViewer);
    $("viewer").addEventListener("click", (e) => { if (e.target === $("viewer")) closeViewer(); });
    $("viewerShare").addEventListener("click", () => viewing && shareItem(viewing));
    $("viewerDelete").addEventListener("click", async () => {
      if (!viewing) return;
      const id = viewing.id;
      closeViewer();
      await rollDelete(id);
      toast("Tossed it");
    });
    $("viewerEdit").addEventListener("click", async () => {
      const item = viewing;
      if (!item || !item.original) return;
      closeViewer();
      closeRoll();
      stopCamera();
      S = Object.assign(defaults(), item.settings || {});
      syncAll();
      app.originalBlob = item.original;
      await loadImageBlob(item.original);
      $("mediaInfo").textContent = `${app.image.width}×${app.image.height}`;
    });
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "Escape") { if (!$("viewer").hidden) closeViewer(); else if (!$("roll").hidden) closeRoll(); else closeMenu(); }
      if (e.key === "ArrowLeft") stepLook(-1);
      if (e.key === "ArrowRight") stepLook(1);
      if (e.key === " " && app.mode === "camera") { e.preventDefault(); $("shutter").click(); }
    });

    document.addEventListener("visibilitychange", () => {
      if (app.mode !== "camera") return;
      if (document.hidden) { if (!app.recorder) stopCamera(); }
      else if (!app.stream) startCamera();
    });
  }

  // ======================================================
  // BOOT
  // ======================================================

  function boot() {
    try {
      if (!initGL()) throw new Error("WebGL unavailable");
    } catch (e) {
      console.error(e);
      $("emptyState").querySelector("h2").textContent = "Oh no";
      $("emptyState").querySelector("p").textContent = "This browser can't run the camera (WebGL is off). Try Safari or Chrome.";
      return;
    }
    buildUI();
    wire();
    setMode("empty");
    renderThumbs();
    renderRoll();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if (document.fonts) document.fonts.ready.then(() => scheduleRender());
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    window.__tt = { app, get S() { return S; }, loadImageBlob, renderThumbs, renderPreview, stepLook, setMode, startLoop };
  }

  boot();
})();
