document.addEventListener("DOMContentLoaded", () => {
  const socket = io.connect();
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const offscreenCanvas = document.getElementById("offscreenCanvas");
  offscreenCanvas.width = canvas.width;
  offscreenCanvas.height = canvas.height;
  const offscreenCtx = offscreenCanvas.getContext("2d");

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let color = "#000000";
  let strokeWidth = 5;
  const canvasWidth = 1920;
  const canvasHeight = 1080;

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

  // Update stroke color
  $("#stroke-color").on("input", () => {
    color = $("#stroke-color").val();
  });

  // Update stroke width
  function updateValues(value) {
    strokeWidth = value;
    $("#stroke-width").val(value);
    $("#slider-value").val(value);
    ctx.lineWidth = value;
  }

  $("#stroke-width, #slider-value").on("input", function () {
    updateValues($(this).val());
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
      offscreenCtx.stroke();
    });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreenCanvas, 0, 0);
  });

  socket.on("drawingLimitReached", () => {
    alert("You've reached the drawing limit. Please wait a few minutes before drawing again.");
    isDrawing = false;
  });
});
