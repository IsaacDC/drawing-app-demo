document.addEventListener("DOMContentLoaded", () => {
  const socket = io.connect();
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const offscreenCanvas = document.getElementById("offscreenCanvas");
  const offscreenCtx = offscreenCanvas.getContext("2d");

  const pencilButton = document.getElementById("pencil-btn");
  const eraserButton = document.getElementById("eraser-btn");

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let color = "#000000";
  let strokeWidth = 5;
  let pencilColor = "#000000";
  let pencilWidth = 5;
  let currentTool = "pencil";

  const canvasWidth = 2560;
  const canvasHeight = 1440;

  // Set up canvas
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  offscreenCanvas.width = canvasWidth;
  offscreenCanvas.height = canvasHeight;

  // Mouse events
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseleave", stopDrawing);

  // Touch events
  canvas.addEventListener("touchstart", touchStart);
  canvas.addEventListener("touchmove", touchMove);
  canvas.addEventListener("touchend", stopDrawing);
  canvas.addEventListener("touchcancel", stopDrawing);

  document
    .getElementById("download-btn")
    .addEventListener("click", function () {
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "drawing.png";

      // Create a temporary canvas to draw the white background
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;
      const tempCtx = tempCanvas.getContext("2d");

      // Draw the white background
      tempCtx.fillStyle = "#ffffff";
      tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw the original canvas onto the temporary canvas
      tempCtx.drawImage(canvas, 0, 0);

      // Get the data URL of the temporary canvas with the white background
      const tempImage = tempCanvas.toDataURL("image/png");

      // Update the link href to the temporary image data URL
      link.href = tempImage;

      link.click();
    });

    pencilButton.addEventListener("click", function () {
      setActiveTool("pencil");
      color = pencilColor;
      strokeWidth = pencilWidth;
      updateValues(strokeWidth);
    });
  
    eraserButton.addEventListener("click", function () {
      setActiveTool("eraser");
      color = "white";
      strokeWidth = 20;
      updateValues(strokeWidth);
    });
    
  // Update stroke color
  document
    .getElementById("stroke-color")
    .addEventListener("input", function () {
      color = this.value;
    });

  // Update stroke width based on slider value
  document
    .getElementById("stroke-width-slider")
    .addEventListener("input", function () {
      updateValues(this.value);
    });

  // Update stroke width based on input value
  document
    .getElementById("slider-value")
    .addEventListener("input", function () {
      updateValues(this.value);
    });

  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.type.startsWith("mouse")) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    } else {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
  }

  function toggleButton(button) {
    button.classList.toggle("active");
  }

  function setActiveTool(tool) {
    if (currentTool !== tool) {
      if (tool === "pencil") {
        toggleButton(pencilButton);
        eraserButton.classList.remove("active");
      } else {
        toggleButton(eraserButton);
        pencilButton.classList.remove("active");
      }
      currentTool = tool;
    }
  }

  // Set pencil as the default active tool
  setActiveTool("pencil");

  // Update stroke width
  function updateValues(value) {
    strokeWidth = value;
    document.getElementById("stroke-width-slider").value = value;
    document.getElementById("slider-value").value = value;
    ctx.lineWidth = value;
  }

  function startDrawing(e) {
    isDrawing = true;
    const { x, y } = getCoordinates(e);
    [lastX, lastY] = [x, y];

    drawLine(lastX, lastY, x, y, color, strokeWidth, true);
  }

  function draw(e) {
    e.preventDefault();
    if (!isDrawing) return;

    const { x, y } = getCoordinates(e);

    drawLine(lastX, lastY, x, y, color, strokeWidth, true);

    [lastX, lastY] = [x, y];
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function drawLine(x1, y1, x2, y2, color, width, emit) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();

    if (emit) {
      socket.emit("draw", { x1, y1, x2, y2, color, width });
    }
  }

  function touchStart(e) {
    if (e.touches.length === 1) {
      startDrawing(e);
    }
  }

  function touchMove(e) {
    if (e.touches.length === 1) {
      draw(e);
    }
  }

  // Incoming
  socket.on("draw", (data) => {
    drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.width, false);
  });

  socket.on("canvasState", (state) => {
    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    state.forEach((data) => {
      offscreenCtx.beginPath();
      offscreenCtx.moveTo(data.x1, data.y1);
      offscreenCtx.lineTo(data.x2, data.y2);
      offscreenCtx.strokeStyle = data.color;
      offscreenCtx.lineWidth = data.width;
      offscreenCtx.lineCap = "round";
      offscreenCtx.stroke();
    });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreenCanvas, 0, 0);
  });

  socket.on("drawingLimitReached", () => {
    alert(
      "You've reached the drawing limit. Please wait a few minutes before drawing again."
    );
    isDrawing = false;
  });
});
