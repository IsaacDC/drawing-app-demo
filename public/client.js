document.addEventListener("DOMContentLoaded", () => {
  const socket = io.connect();
  const canvasContainer = document.getElementById("canvas-container");
  const localCanvas = document.getElementById("local-canvas");
  const localCtx = localCanvas.getContext("2d");

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let color = "#000000";
  let strokeWidth = 5;

  const remoteCanvases = {};

  // Set up local canvas
  localCanvas.width = 1280;
  localCanvas.height = 720;

  // Mouse events (only for local canvas)
  localCanvas.addEventListener("mousedown", startDrawing);
  localCanvas.addEventListener("mousemove", draw);
  localCanvas.addEventListener("mouseup", stopDrawing);
  localCanvas.addEventListener("mouseleave", stopDrawing);

  // Touch events (only for local canvas)
  localCanvas.addEventListener("touchstart", startDrawing);
  localCanvas.addEventListener("touchmove", draw);
  localCanvas.addEventListener("touchend", stopDrawing);
  localCanvas.addEventListener("touchcancel", stopDrawing);

  // Clear all drawings
  $("#clear-all").on("click", () => {
    if (confirm("Are you sure you want to clear all drawings?")) {
      clearCanvas(localCtx);
      Object.values(remoteCanvases).forEach(({ctx}) => clearCanvas(ctx));
      socket.emit("clearDrawings");
    }
  });

  // Update stroke color
  $("#stroke-color").on("input", () => {
    color = $("#stroke-color").val();
    socket.emit("changeStrokeColor", color);
  });

  // Update stroke width
  function updateValues(value) {
    strokeWidth = value;
    $("#stroke-width").val(value);
    $("#slider-value").val(value);
    localCtx.lineWidth = value;
    socket.emit("changeStrokeWidth", value);
  }

  $("#stroke-width, #slider-value").on("input", function() {
    updateValues($(this).val());
  });

  $("#slider-value").on("blur", function() {
    let value = $(this).val();
    value = Math.max(1, Math.min(value, 100));
    updateValues(value);
  });

  function getCoordinates(e) {
    const rect = localCanvas.getBoundingClientRect();
    if (e.type.startsWith("mouse")) {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    } else {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
  }

  function startDrawing(e) {
    isDrawing = true;
    const { x, y } = getCoordinates(e);
    [lastX, lastY] = [x, y];

    localCtx.beginPath();
    localCtx.moveTo(lastX, lastY);
    localCtx.lineCap = "round";
    localCtx.lineWidth = strokeWidth;
    localCtx.strokeStyle = color;

    socket.emit("startDrawing", { x: lastX, y: lastY, color, width: strokeWidth });
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();

    const { x, y } = getCoordinates(e);

    localCtx.lineTo(x, y);
    localCtx.stroke();

    socket.emit("draw", { x, y, color, width: strokeWidth });

    [lastX, lastY] = [x, y];
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    localCtx.beginPath();
    socket.emit("stopDrawing");
  }

  function clearCanvas(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  function createRemoteCanvas(socketId) {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvasContainer.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    remoteCanvases[socketId] = { canvas, ctx };
  }

  // Socket event handlers
  socket.on("incomingStartDrawing", ({ x, y, color, width, socketId }) => {
    if (!remoteCanvases[socketId]) {
      createRemoteCanvas(socketId);
    }
    const { ctx } = remoteCanvases[socketId];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
  });

  socket.on("incomingDraw", ({ x, y, socketId }) => {
    if (remoteCanvases[socketId]) {
      const { ctx } = remoteCanvases[socketId];
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  });

  socket.on("incomingStopDrawing", ({ socketId }) => {
    if (remoteCanvases[socketId]) {
      const { ctx } = remoteCanvases[socketId];
      ctx.beginPath();
    }
  });

  socket.on("changeStrokeColor", ({ socketId, color }) => {
    if (remoteCanvases[socketId]) {
      const { ctx } = remoteCanvases[socketId];
      ctx.strokeStyle = color;
    }
  });

  socket.on("changeStrokeWidth", ({ socketId, width }) => {
    if (remoteCanvases[socketId]) {
      const { ctx } = remoteCanvases[socketId];
      ctx.lineWidth = width;
    }
  });

  socket.on("clearDrawings", () => {
    Object.values(remoteCanvases).forEach(({ctx}) => clearCanvas(ctx));
  });

  socket.on("userDisconnected", (socketId) => {
    if (remoteCanvases[socketId]) {
      canvasContainer.removeChild(remoteCanvases[socketId].canvas);
      delete remoteCanvases[socketId];
    }
  });
});