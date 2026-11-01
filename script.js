document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true
  });

  const fileInput = document.getElementById("fileInput");
  const cameraBtn = document.getElementById("cameraBtn");
  const filtersContainer = document.getElementById("filters");

  let originalImage = null;
  let activeFilter = "none";

  const MAX_DIMENSION = 2400;

  // ========================================
  // FILTER PRESETS
  // ========================================

  const presets = {
    none: {
      brightness: 0,
      contrast: 1,
      saturation: 1,
      warmth: 0,
      pink: 0,
      fade: 0,
      grain: 0,
      vignette: 0
    },

    bleach: {
      brightness: -5,
      contrast: 1.35,
      saturation: 0.35,
      warmth: -5,
      pink: 0,
      fade: 0,
      grain: 12,
      vignette: 0.25
    },

    "2014": {
      brightness: 12,
      contrast: 0.88,
      saturation: 0.82,
      warmth: 6,
      pink: 12,
      fade: 15,
      grain: 8,
      vignette: 0.1
    },

    amaro: {
      brightness: 15,
      contrast: 0.95,
      saturation: 0.9,
      warmth: 12,
      pink: 2,
      fade: 8,
      grain: 5,
      vignette: 0.2
    },

    nashville: {
      brightness: 18,
      contrast: 0.82,
      saturation: 0.75,
      warmth: 16,
      pink: 18,
      fade: 20,
      grain: 7,
      vignette: 0.05
    },

    valencia: {
      brightness: 14,
      contrast: 0.9,
      saturation: 0.85,
      warmth: 18,
      pink: 2,
      fade: 10,
      grain: 4,
      vignette: 0.08
    },

    "1977": {
      brightness: 8,
      contrast: 0.9,
      saturation: 1.12,
      warmth: 20,
      pink: 14,
      fade: 12,
      grain: 15,
      vignette: 0.18
    },

    moon: {
      brightness: 4,
      contrast: 1.12,
      saturation: 0,
      warmth: -8,
      pink: 0,
      fade: 8,
      grain: 12,
      vignette: 0.2
    },

    dreamgirl: {
      brightness: 20,
      contrast: 0.82,
      saturation: 0.78,
      warmth: 5,
      pink: 22,
      fade: 18,
      grain: 5,
      vignette: 0.04
    },

    digital: {
      brightness: 4,
      contrast: 1.2,
      saturation: 1.18,
      warmth: -10,
      pink: 0,
      fade: 0,
      grain: 10,
      vignette: 0.12
    }
  };

  // ========================================
  // HELPERS
  // ========================================

  function clamp(value) {
    return Math.max(0, Math.min(255, value));
  }

  function loadImage(source) {
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(
        1,
        MAX_DIMENSION / Math.max(img.width, img.height)
      );

      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      originalImage = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      applyFilter(activeFilter);
    };

    img.onerror = () => {
      console.error("Unable to load image.");
    };

    img.src = source;
  }

  // ========================================
  // IMAGE PROCESSING
  // ========================================

  function applyFilter(name) {
    if (!originalImage) return;

    const preset = presets[name] || presets.none;

    const imageData = new ImageData(
      new Uint8ClampedArray(originalImage.data),
      originalImage.width,
      originalImage.height
    );

    const data = imageData.data;

    const width = imageData.width;
    const height = imageData.height;

    const centerX = width / 2;
    const centerY = height / 2;

    const maxDistance = Math.sqrt(
      centerX * centerX + centerY * centerY
    );

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        r += preset.brightness;
        g += preset.brightness;
        b += preset.brightness;

        // Contrast
        r = (r - 128) * preset.contrast + 128;
        g = (g - 128) * preset.contrast + 128;
        b = (b - 128) * preset.contrast + 128;

        // Saturation
        const gray =
          0.299 * r +
          0.587 * g +
          0.114 * b;

        r = gray + (r - gray) * preset.saturation;
        g = gray + (g - gray) * preset.saturation;
        b = gray + (b - gray) * preset.saturation;

        // Warmth
        r += preset.warmth;
        b -= preset.warmth * 0.65;

        // Pink tint
        r += preset.pink;
        g -= preset.pink * 0.35;
        b += preset.pink * 0.45;

        // Faded blacks
        if (preset.fade > 0) {
          const fadeAmount = preset.fade / 100;

          r = r * (1 - fadeAmount) + 235 * fadeAmount;
          g = g * (1 - fadeAmount) + 220 * fadeAmount;
          b = b * (1 - fadeAmount) + 215 * fadeAmount;
        }

        // Grain
        if (preset.grain > 0) {
          const noise =
            (Math.random() - 0.5) * preset.grain * 2;

          r += noise;
          g += noise;
          b += noise;
        }

        // Vignette
        if (preset.vignette > 0) {
          const dx = x - centerX;
          const dy = y - centerY;

          const distance =
            Math.sqrt(dx * dx + dy * dy) / maxDistance;

          const vignette =
            1 - preset.vignette * Math.pow(distance, 1.7);

          r *= vignette;
          g *= vignette;
          b *= vignette;
        }

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ========================================
  // FILE UPLOAD
  // ========================================

  fileInput.addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = event => {
      loadImage(event.target.result);
    };

    reader.readAsDataURL(file);
  });

  // ========================================
  // CAMERA
  // ========================================

  cameraBtn.addEventListener("click", async () => {
    let stream;

    try {
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

      await new Promise(resolve => {
        if (video.readyState >= 2) {
          resolve();
        } else {
          video.addEventListener(
            "loadeddata",
            resolve,
            { once: true }
          );
        }
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      originalImage = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      applyFilter(activeFilter);

    } catch (error) {
      console.error(error);
      alert("Unable to access camera.");
    } finally {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  });

  // ========================================
  // FILTER SELECTION
  // ========================================

  filtersContainer.addEventListener("click", event => {
    const button = event.target.closest("button");

    if (!button) return;

    const filter = button.dataset.filter;

    if (!presets[filter]) return;

    activeFilter = filter;

    document.querySelectorAll("#filters button")
      .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

    applyFilter(filter);
  });

  // ========================================
  // DOWNLOAD
  // ========================================

  function downloadImage() {
    if (!originalImage) return;

    const link = document.createElement("a");

    link.download = `tumblrtone-${activeFilter}.png`;
    link.href = canvas.toDataURL("image/png");

    link.click();
  }

  const downloadBtn = document.getElementById("downloadBtn");

  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadImage);
  }
});
