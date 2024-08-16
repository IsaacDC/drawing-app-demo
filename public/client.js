document.addEventListener("DOMContentLoaded", () => {
  const socket = io.connect();
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 1280;
  canvas.height = 720;

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let color = "#000000";
  let strokeWidth = 5;

  const otherUsers = {};

  // mouse events
  $(canvas).on("mousedown", startDrawing);
  $(canvas).on("mousemove", draw);
  $(canvas).on("mouseup", stopDrawing);
  $(canvas).on("mouseleave", stopDrawing);

  // touch events
  $(canvas).on("touchstart", startDrawing);
  $(canvas).on("touchmove", draw);
  $(canvas).on("touchend", stopDrawing);
  $(canvas).on("touchcancel", stopDrawing);

  //Clears drawings
  $("#clear-all").on("click", () => {
    if (confirm("Are you sure you want to clear all drawings?")) {
      location.reload();
      socket.emit("clearDrawings");
    }
  });

  //updates stroke color
  $("#stroke-color").on("input", () => {
    color = $("#stroke-color").val();
    socket.emit("changeStrokeColor", color);
  });

  //change stroke width
  function updateValues(value) {
    strokeWidth = value;
    $("#stroke-width").val(value);
    $("#slider-value").val(value);
    ctx.lineWidth = value;
    socket.emit("changeStrokeWidth", value);
  }
  // Update input value and stroke width when slider changes
  $("#stroke-width").on("input", function () {
    const value = $(this).val();
    updateValues(value);
  });
  // Update slider and stroke width when input value changes
  $("#slider-value").on("input", function () {
    let value = $(this).val();
    value = Math.max(0, Math.min(value, 100));
    updateValues(value);
  });
  // invalid stroke value handler
  $("#slider-value").on("blur", function () {
    let value = $(this).val();
    if (value === "" || value < 1) {
      value = 1;
    } else {
      value = Math.min(value, 100);
    }
    updateValues(value);
  });

  //begins the drawing process
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.type.startsWith("mouse")) {
      return { x: e.offsetX, y: e.offsetY };
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

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineCap = "round";
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = color;

    socket.emit("startDrawing", {
      x: lastX,
      y: lastY,
      color,
      width: strokeWidth,
      socketId: socket.id,
    });
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();

    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();

    socket.emit("draw", {
      x,
      y,
      color,
      width: strokeWidth,
      socketId: socket.id,
    });

    [lastX, lastY] = [x, y];
  }

  function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.beginPath();
    socket.emit("stopDrawing", { socketId: socket.id });
  }

  // draws on the non-drawing client(s) screen(s)
  socket.on("incomingStartDrawing", ({ x, y, color, width, socketId }) => {
    if (!otherUsers[socketId]) {
      otherUsers[socketId] = { x, y, color, width, isDrawing: true };
    }
  });
  
  socket.on("incomingDraw", ({ x, y, color, width, socketId }) => {
    if (otherUsers[socketId] && otherUsers[socketId].isDrawing) {
      ctx.beginPath();
      ctx.moveTo(otherUsers[socketId].x, otherUsers[socketId].y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.stroke();
      otherUsers[socketId].x = x;
      otherUsers[socketId].y = y;
    }
  });
  
  socket.on("incomingStopDrawing", ({ socketId }) => {
    if (otherUsers[socketId]) {
      otherUsers[socketId].isDrawing = false;
    }
  });
  

  socket.on("changeStrokeColor", ({ socketId, color }) => {
    if (socketId !== socket.id) {
      ctx.strokeStyle = color;
    }
  });

  socket.on("changeStrokeWidth", ({ socketId, width }) => {
    if (socketId !== socket.id) {
      ctx.lineWidth = width;
    }
  });
});
