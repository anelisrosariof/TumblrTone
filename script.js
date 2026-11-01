document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("canvas-container");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  function drawImageToCanvas(img) {
    const maxW = 600;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  // Load placeholder
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => drawImageToCanvas(img);
  img.src = "https://picsum.photos/800/600";

  // Handle file input
  document.getElementById("fileInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => drawImageToCanvas(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Handle camera
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
    } catch (err) { alert("Camera access denied."); }
  });

  // Handle filter buttons
  document.getElementById("filters").addEventListener("click", e => {
    if (e.target.tagName !== "BUTTON") return;
    document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    
    container.className = "";
    if (e.target.dataset.filter !== "none") {
      container.classList.add(`filter-${e.target.dataset.filter}`);
    }
  });
});

