/* ---------- Helper: load image into canvas ---------- */
function loadImage(src) {
  const img = new Image();
  img.crossOrigin = "anonymous";          // needed for camera blobs
  img.onload = () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    // keep aspect ratio, fit width ≤ 480 px (good for phones)
    const maxW = 480;
    const scale = Math.min(1, maxW / img.width);
    canvas.width  = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    applyFilter(currentFilter);           // render the currently selected filter
  };
  img.src = src;
}

/* ---------- Filter definitions (CamanJS) ---------- */
function applyFilter(name) {
  const canvas = document.getElementById("canvas");
  Caman(canvas, function () {
    this.revert(false);               // start from the original pixels

    if (name === "bleach") {
      // Bleach Bypass approximation
      this.brightness(-5)
          .contrast(20)
          .saturation(-30)
          .colorize(255, 255, 255, 10)   // faint white overlay
          .gamma(0.95);
    } else if (name === "2014") {
      this.brightness(10)
          .contrast(5)
          .saturation(-20)
          .exposure(0.05)
          .colorize(255, 140, 0, 6);    // warm orange tint
    } else if (name === "amaro") {
      this.brightness(5)
          .contrast(5)
          .saturation(-10)
          .vibrance(15)
          .curves('rgb', [0, 0, 255, 255])
          .exposure(0.06);
    } else if (name === "nashville") {
      this.brightness(5)
          .contrast(10)
          .saturation(-15)
          .colorize(255, 120, 0, 8)    // soft pink/orange
          .gamma(0.95);
    }
    this.render();
  });
}

/* ---------- UI wiring ---------- */
let currentFilter = "none";

document.getElementById("fileInput").addEventListener("change", e => {
  if (e.target.files[0]) {
    const url = URL.createObjectURL(e.target.files[0]);
    loadImage(url);
  }
});

document.getElementById("cameraBtn").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();

    // Take a snapshot after the first frame is ready
    video.addEventListener("loadeddata", () => {
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop()); // stop camera
      applyFilter(currentFilter);
    });
  } catch (err) {
    alert("Camera access denied.");
    console.error(err);
  }
});

document.getElementById("filters").addEventListener("click", e => {
  if (e.target.tagName !== "BUTTON") return;
  const btn = e.target;
  currentFilter = btn.dataset.filter;
  // highlight active button
  document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilter(currentFilter);
});

/* ---------- Load a placeholder on first visit ---------- */
window.addEventListener("load", () => {
  loadImage("https://picsum.photos/800/600"); // random placeholder
});
