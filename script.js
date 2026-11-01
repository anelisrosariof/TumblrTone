let currentFilter = "none";

function applyFilter(name) {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  // Re‑load the image for a clean state (the canvas may hold the previous result)
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function () {
    const ctx = canvas.getContext("2d");
    const maxW = 640; // good for phones
    const scale = Math.min(1, maxW / img.width);
    canvas.width  = img.width * scale;
    canvas.height = img.height * scale;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);

    // Apply the selected Caman preset
    Caman(canvas, function () {
      this.revert(false);
      switch (name) {
        case "bleach":
          this.brightness(-5)
              .contrast(20)
              .saturation(-30)
              .colorize(255,255,255,10)
              .gamma(0.95);
          break;
        case "2014":
          this.brightness(10)
              .contrast(5)
              .saturation(-20)
              .colorize(255,140,0,6);
          break;
        case "amaro":
          this.brightness(5)
              .contrast(5)
              .saturation(-10)
              .vibrance(15)
              .curves('rgb', [0,0,255,255])
              .exposure(0.06);
          break;
        case "nashville":
          this.brightness(5)
              .contrast(10)
              .saturation(-15)
              .colorize(255,120,0,8)
              .gamma(0.95);
          break;
        case "none":
        default:
          // nothing – keep original
          break;
      }
      this.render();
    });
  };
  // Use a tiny blob placeholder – the exact image data doesn't matter here
  img.src = canvas.toDataURL("image/png");
}

/* UI wiring */
document.getElementById("fileInput")?.addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  applyFilter(currentFilter);
});

document.getElementById("cameraBtn")?.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video:true });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();
    video.addEventListener("loadeddata", () => {
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      stream.getTracks().forEach(t => t.stop());
      applyFilter(currentFilter);
    });
  } catch(err) {
    alert("Camera access denied.");
    console.error(err);
  }
});

document.getElementById("filters")?.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  // Highlight active button
  document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilter(currentFilter);
});

/* Load a placeholder on first load */
window.addEventListener("load", () => {
  const placeholder = "https://picsum.photos/800/600";
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const scale = Math.min(1, 640 / img.width);
    canvas.width  = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    applyFilter(currentFilter);
  };
  img.src = placeholder;
});
