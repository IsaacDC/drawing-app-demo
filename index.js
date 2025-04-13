const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("node:http");
const { join } = require("node:path");
const helmet = require("helmet");
const db = require("./src/database/sqlite");
require("dotenv").config();

const serverHost = process.env.SERVER_HOST;
const serverPort = process.env.SERVER_PORT;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  origin: `http://${serverHost}:${serverPort}`,
  credentials: true,
});

app.set("io", io);
app.set("trust proxy", 1);

app.use(express.static("public"));
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const routes = require("./src/routes/index");
app.use(routes);

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "./public/index.html"));
});

io.on("connection", (socket) => {
  // start drawing event
  socket.on("draw", (data) => {
    db.insertDrawingData(data);
    socket.broadcast.emit("draw", data.data);
  });
});

server.listen(serverPort, () => {
  console.log(`Server running at ${serverHost}:${serverPort}`);
});
