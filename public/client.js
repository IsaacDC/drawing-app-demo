"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const socket = io.connect();
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const offscreenCanvas = document.getElementById("offscreenCanvas");
  const offscreenCtx = offscreenCanvas.getContext("2d");

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let color = "#000000";
  let strokeWidth = 10;
  let pencilColor = color;
  let currentTool = "pencil";

  const canvasWidth = 2560;
  const canvasHeight = 1440;

  // Set up canvas
  canvas.width = offscreenCanvas.width = canvasWidth;
  canvas.height = offscreenCanvas.height = canvasHeight;

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
    .getElementById("stroke-color")
    .addEventListener("input", updateStrokeColor);
  document
    .getElementById("pencil-btn")
    .addEventListener("click", () => setActiveTool("pencil"));
  document
    .getElementById("eraser-btn")
    .addEventListener("click", () => setActiveTool("eraser"));
  document
    .getElementById("download-btn")
    .addEventListener("click", downloadImage);
  document
    .getElementById("stroke-width-slider")
    .addEventListener("input", updateStrokeWidth);
  document
    .getElementById("slider-value")
    .addEventListener("input", updateStrokeWidth);

  loadDrawings();
  setActiveTool("pencil");

  function updateStrokeColor(e) {
    if (currentTool === "pencil") {
      color = pencilColor = e.target.value;
    }
  }

  function setActiveTool(tool) {
    const pencilButton = document.getElementById("pencil-btn");
    const eraserButton = document.getElementById("eraser-btn");

    switch (tool) {
      case "pencil":
        pencilButton.classList.add("active");
        eraserButton.classList.remove("active");
        color = pencilColor;
        break;
      case "eraser":
        eraserButton.classList.add("active");
        pencilButton.classList.remove("active");
        color = "white";
        break;
    }
    currentTool = tool;
  }

  function downloadImage() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement("a");
    link.href = tempCanvas.toDataURL("image/png");
    link.download = "drawing.png";
    link.click();
  }

  function updateStrokeWidth(e) {
    const value = e.target.value;
    strokeWidth = value;
    document.getElementById("stroke-width-slider").value = value;
    document.getElementById("slider-value").value = value;
    ctx.lineWidth = value;
  }

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
    if (!isDrawing) return;
    e.preventDefault();

    const { x, y } = getCoordinates(e);

    drawLine(lastX, lastY, x, y, color, strokeWidth, true);

    [lastX, lastY] = [x, y];
  }

  function stopDrawing() {
    isDrawing = false;
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

  function drawLine(startX, startY, endX, endY, color, width, emit) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();

    if (emit) {
      socket.emit("draw", { startX, startY, endX, endY, color, width });
    }
  }

  function loadDrawings() {
    fetch("/getDrawingData")
      .then((response) => response.json())
      .then((drawingData) => {
        offscreenCtx.clearRect(
          0,
          0,
          offscreenCanvas.width,
          offscreenCanvas.height
        );
        drawingData.forEach((data) => {
          offscreenCtx.beginPath();
          offscreenCtx.moveTo(data.startX, data.startY);
          offscreenCtx.lineTo(data.endX, data.endY);
          offscreenCtx.strokeStyle = data.color;
          offscreenCtx.lineWidth = data.width;
          offscreenCtx.lineCap = "round";
          offscreenCtx.stroke();
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscreenCanvas, 0, 0);
      })
      .catch((error) => {
        console.error("Error fetching drawing data:", error);
      });
  }

  socket.on("updateCanvas", () => {
    loadDrawings();
  });

  // draws on the non-drawing client(s) screen(s)
  socket.on("draw", (data) => {
    drawLine(
      data.startX,
      data.startY,
      data.endX,
      data.endY,
      data.color,
      data.width,
      false
    );
  });
});
