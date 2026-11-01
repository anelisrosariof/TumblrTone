const container = document.getElementById("canvas-container");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function drawImageToCanvas(img) {
  const maxW = 640;
  const scale = Math.min(1, maxW / img.width);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// Load a placeholder image on start
window.addEventListener("load", () => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => drawImageToCanvas(img);
  img.src = "https://picsum.photos/800/600";
});

// Handle photo upload
document.getElementById("fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => drawImageToCanvas(img);
  img.src = URL.createObjectURL(file);
});

// Handle camera snapshot
document.getElementById("cameraBtn").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();
    video.addEventListener("loadeddata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach(t => t.stop());
    });
  } catch (err) {
    alert("Camera access denied.");
    console.error(err);
  }
});

// Handle filter button clicks
document.getElementById("filters").addEventListener("click", e => {
  if (e.target.tagName !== "BUTTON") return;
  
  const filterName = e.target.dataset.filter;

  // Update active button state
  document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");

  // Apply CSS class to the container wrapping the canvas
  container.className = "";
  if (filterName !== "none") {
    container.classList.add(`filter-${filterName}`);
  }
});

