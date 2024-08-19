const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("node:http");
const { join } = require("node:path");

const app = express();
const server = createServer(app);

const io = new Server(server);
app.use(express.static(join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "./public/index.html"));
});

// Store the canvas state
let canvasState = [];

io.on("connection", (socket) => {
  let lastDrawTime = Date.now();
  let drawCount = 0;
  let drawCountResetTimeout;

  // Send the current canvas state to the new connection
  socket.emit("canvasState", canvasState);

  // Handle drawing events
  socket.on("draw", (data) => {
    const now = Date.now();
    drawCount++;

    // Limit to 300 draw events per minute
    if (drawCount > 500) {
      socket.emit("drawingLimitReached");
      return;
    }

    lastDrawTime = now;

    // Reset draw count every minute
    clearTimeout(drawCountResetTimeout);
    drawCountResetTimeout = setTimeout(() => {
      drawCount = 0;
    }, 60 * 1000);

    canvasState.push(data);
    socket.broadcast.emit("draw", data);
  });
});

server.listen(3000, () => {
  console.log(`Server running at http://127.0.0.1:3000`);
});
