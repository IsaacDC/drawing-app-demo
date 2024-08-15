const express = require("express");
const { Server } = require("socket.io");
const { sessionMiddleware, wrap } = require("./server/sessionStore");
const { createServer } = require("node:http");
const { join } = require("node:path");

const app = express();
const server = createServer(app);

const db = require("./databases/dbChooser");
const config = require("./server/config");
const { banCheckMiddleware } = require("./server/middleware");

const io = new Server(server, config.cors);

const WorkerPool = require("./server/workerPool");
const workers = new WorkerPool(1, "./drawingWorker");

app.use(sessionMiddleware);
app.use(banCheckMiddleware);

app.set("view engine", "ejs");
app.set("views", join(__dirname, "./admin"));

app.get("/", (req, res) => {
  if (!req.session.initialized) {
    req.session.initialized = true;
    req.session.visitCount = 1;
  } else {
    req.session.visitCount = (req.session.visitCount || 0) + 1;
  }
  res.sendFile(join(__dirname, "./public/index.html"));
});

app.use(express.static("public"));
app.use(express.static("admin"));

app.get("/admin", (req, res) => {
  db.getAllDrawingData((drawingData) => {
    db.getBannedSessions((bannedSessions) => {
      res.render("admin", { drawingData, bannedSessions });
    });
  });
});

app.delete("/delete/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  db.deleteDrawingsBySessionID(sessionId, (result) => {
    res.json({ success: result });
  });
});

app.post("/ban/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  db.banSessionID(sessionId, (err) => {
    if (err) {
      console.error("Error banning sessionID:", err);
      res.status(500).json({ success: false, message: "Server error" });
    } else {
      io.sockets.sockets.forEach((socket) => {
        if (socket.request.sessionID === sessionId) {
          socket.emit("banUser");
        }
      });
      res.json({ success: true });
    }
  });
});

app.delete("/unban/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  db.unbanSessionId(sessionId, (err) => {
    if (err) {
      console.error("Error unbanning sessionID:", err);
      res.status(500).json({ success: false, message: "Server error" });
    } else {
      res.json({ success: true });
    }
  });
});

app.get('/getDrawingData', (req, res) => {
  db.getAllDrawingData((drawingData) => {
    res.json(drawingData);
  });
});

app.get("/getBannedSessions", (req, res) => {
  db.getBannedSessions((rows) => {
    res.json({
      success: true,
      bannedSessions: rows.map((row) => row.sessionID),
    });
  });
});

app.delete("/clearCanvas", (req, res) => {
  db.clearCanvas((result) => {
    res.json({ success: result });
  });
});

io.use(wrap(sessionMiddleware));
io.use((socket, next) => {
  const session = socket.request.session;
  if (session && session.id) {
    next();
  } else {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const sessionId = socket.request.sessionID;

  workers.runTask({ type: "loadDrawingData" }, (data) => {
    socket.emit("loadDrawingData", data.data);
  });

  // start drawing event
  socket.on("startDrawing", ({ x, y, color, width }) => {
    const data = { type: "start", x, y, color, width, sessionId };
    db.insertDrawingData(sessionId, data);
    socket.broadcast.emit("incomingStartDrawing", data);
  });

  // draw event
  socket.on("draw", ({ x, y, color, width }) => {
    const data = { type: "draw", x, y, color, width, sessionId };
    db.insertDrawingData(sessionId, data);
    socket.broadcast.emit("incomingDraw", data);
  });

  // stop drawing event
  socket.on("stopDrawing", () => {
    const data = { type: "stop", sessionId };
    db.insertDrawingData(sessionId, data);
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

  // clear drawings event
  socket.on("clearDrawings", () => {
    db.deleteDrawingsBySessionID(sessionId);
    socket.broadcast.emit("clearSessionsDrawings", sessionId);
  });
});

server.listen(config.server.port, () => {
  console.log(`Server running at http://127.0.0.1:${config.server.port}`);
});
