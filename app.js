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

io.on("connection", (socket) => {
  // start drawing event
  socket.on("startDrawing", ({ x, y, color, width }) => {
    const data = { type: "start", x, y, color, width };
    socket.broadcast.emit("incomingStartDrawing", data);
  });

  // draw event
  socket.on("draw", ({ x, y, color, width }) => {
    const data = { type: "draw", x, y, color, width };
    socket.broadcast.emit("incomingDraw", data);
  });

  // stop drawing event
  socket.on("stopDrawing", () => {
    const data = { type: "stop" };
    socket.broadcast.emit("incomingStopDrawing", data);
  });

  // change stroke color event
  socket.on("changeStrokeColor", (color) => {
    socket.broadcast.emit("changeStrokeColor", { socketId: socket.id, color });
  });

  //change stroke width event
  socket.on("changeStrokeWidth", (width) => {
    socket.broadcast.emit("changeStrokeWidth", { socketId: socket.id, width });
  });
});

server.listen(3000, () => {
  console.log(`Server running at http://127.0.0.1:3000`);
});
