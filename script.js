document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ========================================
  // ELEMENTS
  // ========================================

  const canvas = document.getElementById("canvas");

  const ctx = canvas.getContext("2d", {
    willReadFrequently: true
  });

  const fileInput = document.getElementById("fileInput");
  const cameraBtn = document.getElementById("cameraBtn");

  const canvasContainer =
    document.getElementById("canvas-container");

  const emptyState =
    document.getElementById("emptyState");

  const imageInfo =
    document.getElementById("imageInfo");

  const filtersContainer =
    document.getElementById("filters");

  const filterIntensity =
    document.getElementById("filterIntensity");

  const filterIntensityValue =
    document.getElementById("filterIntensityValue");

  const adjustmentControls =
    document.getElementById("adjustmentControls");

  const effectControls =
    document.getElementById("effectControls");

  const compareBtn =
    document.getElementById("compareBtn");

  const resetBtn =
    document.getElementById("resetBtn");

  const downloadBtn =
    document.getElementById("downloadBtn");

  const exportFormat =
    document.getElementById("exportFormat");

  const exportQuality =
    document.getElementById("exportQuality");

  // ========================================
  // CONFIGURATION
  // ========================================

  const MAX_PREVIEW_DIMENSION = 1100;

  const DEFAULT_ADJUSTMENTS = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    highlights: 0,
    shadows: 0
  };

  const DEFAULT_EFFECTS = {
    grain: 0,
    vignette: 0,
    sharpen: 0
  };

  const state = {
    source: null,
    sourceWidth: 0,
    sourceHeight: 0,

    originalPreview: null,

    filter: "none",
    intensity: 100,

    adjustments: {
      ...DEFAULT_ADJUSTMENTS
    },

    effects: {
      ...DEFAULT_EFFECTS
    },

    comparing: false
  };

  let renderQueued = false;
  let rendering = false;

  // ========================================
  // FILTER RECIPES
  // ========================================

  /*
   * Curves use five control points:
   *
   * [black, shadows, midtones, highlights, white]
   *
   * Values represent output intensity at:
   * [0, 64, 128, 192, 255].
   *
   * The recipes are original approximations.
   */

  const NEUTRAL_CURVE = [0, 64, 128, 192, 255];

  const presets = {
    none: {
      red: NEUTRAL_CURVE,
      green: NEUTRAL_CURVE,
      blue: NEUTRAL_CURVE,

      contrast: 0,
      saturation: 0,
      brightness: 0,

      grain: 0,
      vignette: 0
    },

    bleach: {
      red: [0, 53, 127, 202, 255],
      green: [0, 55, 128, 201, 255],
      blue: [2, 60, 132, 199, 250],

      contrast: 24,
      saturation: -48,
      brightness: -3,

      grain: 9,
      vignette: 20
    },

    "2014": {
      red: [7, 68, 137, 202, 255],
      green: [3, 61, 128, 193, 251],
      blue: [15, 75, 126, 179, 235],

      contrast: 10,
      saturation: -7,
      brightness: 3,

      grain: 8,
      vignette: 11
    },

    nashville: {
      red: [24, 89, 151, 211, 255],
      green: [15, 76, 137, 198, 249],
      blue: [18, 74, 126, 180, 233],

      contrast: -15,
      saturation: -22,
      brightness: 8,

      grain: 7,
      vignette: 5
    },

    amaro: {
      red: [13, 78, 145, 208, 255],
      green: [10, 73, 137, 201, 252],
      blue: [18, 82, 139, 193, 245],

      contrast: -5,
      saturation: -9,
      brightness: 8,

      grain: 5,
      vignette: 13
    },

    valencia: {
      red: [12, 78, 143, 207, 255],
      green: [9, 73, 137, 200, 253],
      blue: [7, 66, 125, 185, 241],

      contrast: -8,
      saturation: -12,
      brightness: 7,

      grain: 4,
      vignette: 7
    },

    "1977": {
      red: [19, 85, 149, 211, 255],
      green: [9, 71, 132, 193, 247],
      blue: [15, 69, 119, 174, 232],

      contrast: -4,
      saturation: 12,
      brightness: 3,

      grain: 16,
      vignette: 17
    },

    keef: {
      red: [5, 62, 130, 202, 255],
      green: [3, 59, 126, 196, 252],
      blue: [14, 73, 136, 202, 255],

      contrast: 17,
      saturation: -16,
      brightness: -3,

      grain: 10,
      vignette: 19
    },

    nuke: {
      red: [0, 49, 132, 215, 255],
      green: [0, 48, 130, 210, 255],
      blue: [0, 56, 139, 211, 255],

      contrast: 30,
      saturation: 16,
      brightness: -5,

      grain: 14,
      vignette: 22
    },

    haunted: {
      red: [9, 55, 119, 184, 240],
      green: [12, 61, 119, 177, 229],
      blue: [22, 78, 142, 195, 245],

      contrast: 14,
      saturation: -35,
      brightness: -12,

      grain: 23,
      vignette: 35
    },

    purple: {
      red: [17, 75, 143, 205, 255],
      green: [5, 57, 119, 184, 241],
      blue: [28, 89, 153, 211, 255],

      contrast: 7,
      saturation: -8,
      brightness: 0,

      grain: 12,
      vignette: 16
    },

    moon: {
      red: [10, 69, 132, 197, 252],
      green: [10, 69, 132, 197, 252],
      blue: [10, 69, 132, 197, 252],

      contrast: 13,
      saturation: -100,
      brightness: 0,

      grain: 12,
      vignette: 20
    }
  };

  // ========================================
  // SLIDER DEFINITIONS
  // ========================================

  const adjustmentDefinitions = [
    {
      key: "brightness",
      label: "Brightness",
      min: -100,
      max: 100
    },
    {
      key: "contrast",
      label: "Contrast",
      min: -100,
      max: 100
    },
    {
      key: "saturation",
      label: "Saturation",
      min: -100,
      max: 100
    },
    {
      key: "temperature",
      label: "Temperature",
      min: -100,
      max: 100
    },
    {
      key: "tint",
      label: "Tint",
      min: -100,
      max: 100
    },
    {
      key: "highlights",
      label: "Highlights",
      min: -100,
      max: 100
    },
    {
      key: "shadows",
      label: "Shadows",
      min: -100,
      max: 100
    }
  ];

  const effectDefinitions = [
    {
      key: "grain",
      label: "Film Grain",
      min: 0,
      max: 100
    },
    {
      key: "vignette",
      label: "Vignette Strength",
      min: 0,
      max: 100
    },
    {
      key: "sharpen",
      label: "Sharpen",
      min: 0,
      max: 100
    }
  ];

  // ========================================
  // HELPERS
  // ========================================

  function clamp(value, min = 0, max = 255) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp(
      (value - edge0) / (edge1 - edge0),
      0,
      1
    );

    return t * t * (3 - 2 * t);
  }

  function createCurveLUT(points) {
    const lut = new Uint8Array(256);

    const positions = [0, 64, 128, 192, 255];

    for (let i = 0; i < 256; i++) {
      let segment = 0;

      while (
        segment < 3 &&
        i > positions[segment + 1]
      ) {
        segment++;
      }

      const start = positions[segment];
      const end = positions[segment + 1];

      const t = (i - start) / (end - start);

      lut[i] = clamp(
        lerp(points[segment], points[segment + 1], t)
      );
    }

    return lut;
  }

  function buildCurveTables(preset) {
    return {
      r: createCurveLUT(preset.red),
      g: createCurveLUT(preset.green),
      b: createCurveLUT(preset.blue)
    };
  }

  // ========================================
  // CREATE SLIDERS
  // ========================================

  function createSlider(definition, group, container) {
    const wrapper = document.createElement("div");
    wrapper.className = "slider-group";

    const heading = document.createElement("div");
    heading.className = "slider-heading";

    const label = document.createElement("label");
    label.textContent = definition.label;

    const output = document.createElement("output");
    output.textContent = "0";

    const input = document.createElement("input");

    input.type = "range";
    input.min = definition.min;
    input.max = definition.max;
    input.value = "0";

    input.id = `${group}-${definition.key}`;
    label.htmlFor = input.id;

    input.addEventListener("input", () => {
      const value = Number(input.value);

      state[group][definition.key] = value;
      output.textContent = value;

      scheduleRender();
    });

    heading.append(label, output);
    wrapper.append(heading, input);
    container.appendChild(wrapper);

    return {
      input,
      output
    };
  }

  const adjustmentSliders = {};
  const effectSliders = {};

  adjustmentDefinitions.forEach(definition => {
    adjustmentSliders[definition.key] = createSlider(
      definition,
      "adjustments",
      adjustmentControls
    );
  });

  effectDefinitions.forEach(definition => {
    effectSliders[definition.key] = createSlider(
      definition,
      "effects",
      effectControls
    );
  });

  // ========================================
  // EDITOR TABS
  // ========================================

  document.querySelectorAll(".editor-tabs .tab")
    .forEach(button => {
      button.addEventListener("click", () => {
        const tab = button.dataset.tab;

        document.querySelectorAll(".editor-tabs .tab")
          .forEach(item => {
            item.classList.toggle(
              "active",
              item === button
            );
          });

        document.querySelectorAll(".editor-panel")
          .forEach(panel => {
            panel.classList.remove("active");
          });

        document
          .getElementById(`${tab}Panel`)
          .classList.add("active");
      });
    });

  // ========================================
  // LOAD IMAGE
  // ========================================

  async function loadImageFromFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(
        file,
        { imageOrientation: "from-image" }
      );

      setSource(bitmap);

    } catch (error) {
      console.error(error);
      alert("This image could not be opened.");
    }
  }

  function setSource(source) {
    if (state.source && state.source.close) {
      state.source.close();
    }

    state.source = source;

    state.sourceWidth = source.width;
    state.sourceHeight = source.height;

    const scale = Math.min(
      1,
      MAX_PREVIEW_DIMENSION /
        Math.max(source.width, source.height)
    );

    const width = Math.max(
      1,
      Math.round(source.width * scale)
    );

    const height = Math.max(
      1,
      Math.round(source.height * scale)
    );

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    ctx.drawImage(
      source,
      0,
      0,
      width,
      height
    );

    state.originalPreview = ctx.getImageData(
      0,
      0,
      width,
      height
    );

    canvasContainer.classList.add("visible");
    emptyState.style.display = "none";

    imageInfo.textContent =
      `${state.sourceWidth} × ${state.sourceHeight}`;

    scheduleRender();
  }

  fileInput.addEventListener("change", event => {
    const file = event.target.files[0];

    if (file) {
      loadImageFromFile(file);
    }

    fileInput.value = "";
  });

  // ========================================
  // CAMERA
  // ========================================

  cameraBtn.addEventListener("click", async () => {
    let stream = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API unavailable.");
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        },
        audio: false
      });

      const video = document.createElement("video");

      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await video.play();

      if (!video.videoWidth || !video.videoHeight) {
        await new Promise(resolve => {
          video.addEventListener(
            "loadeddata",
            resolve,
            { once: true }
          );
        });
      }

      const captureCanvas =
        document.createElement("canvas");

      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;

      captureCanvas
        .getContext("2d")
        .drawImage(
          video,
          0,
          0,
          captureCanvas.width,
          captureCanvas.height
        );

      const bitmap = await createImageBitmap(captureCanvas);

      setSource(bitmap);

    } catch (error) {
      console.error(error);

      alert(
        "Camera access failed. Use HTTPS or localhost and allow camera permissions."
      );

    } finally {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  });

  // ========================================
  // IMAGE PROCESSING
  // ========================================

  function processImage(original, settings) {
    const width = original.width;
    const height = original.height;

    const result = new ImageData(
      new Uint8ClampedArray(original.data),
      width,
      height
    );

    const data = result.data;

    const preset = presets[settings.filter];
    const curves = buildCurveTables(preset);

    const intensity = settings.intensity / 100;

    const adj = settings.adjustments;
    const fx = settings.effects;

    const brightness =
      adj.brightness * 0.8 +
      preset.brightness * intensity;

    const contrast =
      1 +
      (adj.contrast + preset.contrast * intensity) / 100;

    const saturation =
      Math.max(
        0,
        1 +
        (adj.saturation +
          preset.saturation * intensity) / 100
      );

    const temperature = adj.temperature * 0.35;
    const tint = adj.tint * 0.3;

    const grainAmount =
      fx.grain * 0.4 +
      preset.grain * intensity;

    const vignetteAmount =
      clamp(
        fx.vignette +
          preset.vignette * intensity,
        0,
        100
      ) / 100;

    const centerX = width / 2;
    const centerY = height / 2;

    const radiusX = Math.max(1, centerX);
    const radiusY = Math.max(1, centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // ------------------------------
        // RGB CURVES
        // ------------------------------

        r = lerp(r, curves.r[r], intensity);
        g = lerp(g, curves.g[g], intensity);
        b = lerp(b, curves.b[b], intensity);

        // ------------------------------
        // BRIGHTNESS
        // ------------------------------

        r += brightness;
        g += brightness;
        b += brightness;

        // ------------------------------
        // CONTRAST
        // ------------------------------

        r = (r - 128) * contrast + 128;
        g = (g - 128) * contrast + 128;
        b = (b - 128) * contrast + 128;

        // ------------------------------
        // SATURATION
        // ------------------------------

        const luminance =
          0.2126 * r +
          0.7152 * g +
          0.0722 * b;

        r = luminance + (r - luminance) * saturation;
        g = luminance + (g - luminance) * saturation;
        b = luminance + (b - luminance) * saturation;

        // ------------------------------
        // TEMPERATURE
        // ------------------------------

        r += temperature;
        g += temperature * 0.08;
        b -= temperature;

        // ------------------------------
        // TINT
        // ------------------------------

        r += tint;
        g -= tint;
        b += tint;

        // ------------------------------
        // HIGHLIGHTS / SHADOWS
        // ------------------------------

        const normalizedLuma =
          clamp(luminance / 255, 0, 1);

        const shadowMask =
          1 - smoothstep(0.05, 0.6, normalizedLuma);

        const highlightMask =
          smoothstep(0.4, 0.95, normalizedLuma);

        const toneAdjustment =
          adj.shadows * shadowMask * 0.65 +
          adj.highlights * highlightMask * 0.65;

        r += toneAdjustment;
        g += toneAdjustment;
        b += toneAdjustment;

        // ------------------------------
        // FILM GRAIN
        // ------------------------------

        if (grainAmount > 0) {
          /*
           * Deterministic noise.
           *
           * The same pixel receives the same
           * grain value on every render.
           */

          let seed =
            Math.imul(x + 1, 374761393) +
            Math.imul(y + 1, 668265263);

          seed = Math.imul(
            seed ^ (seed >>> 13),
            1274126177
          );

          const noise =
            ((seed >>> 0) / 4294967295 - 0.5) *
            grainAmount *
            2;

          r += noise;
          g += noise;
          b += noise;
        }

        // ------------------------------
        // VIGNETTE
        // ------------------------------

        if (vignetteAmount > 0) {
          const dx = (x - centerX) / radiusX;
          const dy = (y - centerY) / radiusY;

          const distance = Math.sqrt(
            dx * dx + dy * dy
          ) / Math.SQRT2;

          const edge = smoothstep(
            0.25,
            1,
            distance
          );

          const multiplier =
            1 - vignetteAmount * edge * 0.85;

          r *= multiplier;
          g *= multiplier;
          b *= multiplier;
        }

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
      }
    }

    if (fx.sharpen > 0) {
      return sharpenImage(result, fx.sharpen / 100);
    }

    return result;
  }

  // ========================================
  // SHARPEN
  // ========================================

  function sharpenImage(imageData, amount) {
    const width = imageData.width;
    const height = imageData.height;

    const source = imageData.data;

    const result = new ImageData(
      new Uint8ClampedArray(source),
      width,
      height
    );

    const output = result.data;

    const strength = amount * 0.8;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;

        for (let channel = 0; channel < 3; channel++) {
          const center = source[i + channel];

          const top =
            source[i - width * 4 + channel];

          const bottom =
            source[i + width * 4 + channel];

          const left =
            source[i - 4 + channel];

          const right =
            source[i + 4 + channel];

          const sharpened =
            center * 5 -
            top -
            bottom -
            left -
            right;

          output[i + channel] = clamp(
            lerp(center, sharpened, strength)
          );
        }
      }
    }

    return result;
  }

  // ========================================
  // RENDERING
  // ========================================

  function getSettings() {
    return {
      filter: state.filter,
      intensity: state.intensity,

      adjustments: {
        ...state.adjustments
      },

      effects: {
        ...state.effects
      }
    };
  }

  function scheduleRender() {
    if (!state.originalPreview) return;

    if (renderQueued) return;

    renderQueued = true;

    requestAnimationFrame(() => {
      renderQueued = false;
      renderPreview();
    });
  }

  function renderPreview() {
    if (!state.originalPreview) return;

    if (state.comparing) {
      ctx.putImageData(
        state.originalPreview,
        0,
        0
      );

      return;
    }

    const processed = processImage(
      state.originalPreview,
      getSettings()
    );

    ctx.putImageData(processed, 0, 0);
  }

  // ========================================
  // FILTER SELECTION
  // ========================================

  filtersContainer.addEventListener("click", event => {
    const button = event.target.closest("button");

    if (!button) return;

    const filter = button.dataset.filter;

    if (!presets[filter]) return;

    state.filter = filter;

    filtersContainer
      .querySelectorAll("button")
      .forEach(item => {
        item.classList.toggle(
          "active",
          item === button
        );
      });

    scheduleRender();
  });

  filterIntensity.addEventListener("input", () => {
    state.intensity = Number(filterIntensity.value);

    filterIntensityValue.textContent =
      state.intensity;

    scheduleRender();
  });

  // ========================================
  // BEFORE / AFTER
  // ========================================

  function startCompare(event) {
    if (!state.originalPreview) return;

    event.preventDefault();

    state.comparing = true;

    ctx.putImageData(
      state.originalPreview,
      0,
      0
    );
  }

  function stopCompare() {
    if (!state.comparing) return;

    state.comparing = false;

    scheduleRender();
  }

  compareBtn.addEventListener(
    "pointerdown",
    startCompare
  );

  window.addEventListener(
    "pointerup",
    stopCompare
  );

  window.addEventListener(
    "pointercancel",
    stopCompare
  );

  compareBtn.addEventListener(
    "pointerleave",
    stopCompare
  );

  compareBtn.addEventListener("keydown", event => {
    if (
      event.key === " " ||
      event.key === "Enter"
    ) {
      startCompare(event);
    }
  });

  compareBtn.addEventListener(
    "keyup",
    stopCompare
  );

  compareBtn.addEventListener(
    "blur",
    stopCompare
  );

  // ========================================
  // RESET
  // ========================================

  function resetEditor() {
    state.filter = "none";
    state.intensity = 100;

    state.adjustments = {
      ...DEFAULT_ADJUSTMENTS
    };

    state.effects = {
      ...DEFAULT_EFFECTS
    };

    filterIntensity.value = 100;
    filterIntensityValue.textContent = "100";

    filtersContainer
      .querySelectorAll("button")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.filter === "none"
        );
      });

    Object.entries(adjustmentSliders)
      .forEach(([key, slider]) => {
        slider.input.value = 0;
        slider.output.textContent = "0";
      });

    Object.entries(effectSliders)
      .forEach(([key, slider]) => {
        slider.input.value = 0;
        slider.output.textContent = "0";
      });

    scheduleRender();
  }

  resetBtn.addEventListener(
    "click",
    resetEditor
  );

  // ========================================
  // EXPORT
  // ========================================

  async function exportImage() {
    if (!state.source) {
      alert("Choose a photo first.");
      return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = "SAVING...";

    try {
      const exportCanvas =
        document.createElement("canvas");

      exportCanvas.width = state.sourceWidth;
      exportCanvas.height = state.sourceHeight;

      const exportCtx = exportCanvas.getContext(
        "2d",
        { willReadFrequently: true }
      );

      exportCtx.drawImage(
        state.source,
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
      );

      const original = exportCtx.getImageData(
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
      );

      const processed = processImage(
        original,
        getSettings()
      );

      exportCtx.putImageData(
        processed,
        0,
        0
      );

      const mimeType = exportFormat.value;

      const quality = Number(
        exportQuality.value
      );

      const blob = await new Promise(resolve => {
        exportCanvas.toBlob(
          resolve,
          mimeType,
          quality
        );
      });

      if (!blob) {
        throw new Error("Export failed.");
      }

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      const extension =
        mimeType === "image/jpeg" ? "jpg" : "png";

      link.href = url;

      link.download =
        `tumblr-tone-${state.filter}.${extension}`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

    } catch (error) {
      console.error(error);

      alert(
        "Unable to save this photo. Try a smaller image."
      );

    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = "♡ Save Photo";
    }
  }

  downloadBtn.addEventListener(
    "click",
    exportImage
  );

  // ========================================
  // INITIAL STATE
  // ========================================

  compareBtn.disabled = true;
  downloadBtn.disabled = true;

  const originalSetSource = setSource;

  setSource = function(source) {
    originalSetSource(source);

    compareBtn.disabled = false;
    downloadBtn.disabled = false;
  };

});
