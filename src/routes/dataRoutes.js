const express = require("express");
const db = require("../database/sqlite");
const router = express.Router();

const getAllDrawingData = () => {
  return new Promise((resolve, reject) => {
    db.getAllDrawingData((err, drawingData) => {
      if (err) reject(err);
      else resolve(drawingData);
    });
  });
};

const clearCanvas = () => {
  return new Promise((resolve, reject) => {
    db.clearCanvas((result) => {
      resolve(result);
    });
  });
};

router.get("/getDrawingData", async (req, res) => {
  try {
    const drawingData = await getAllDrawingData();
    res.json(drawingData);
  } catch (err) {
    console.error("Error in getDrawingData route:", err);
    res.status(500).json({ error: "Error fetching data" });
  }
});

// Clear the canvas of all drawings
router.delete("/clearCanvas", async (req, res) => {
  try {
    const result = await clearCanvas();
    res.json({ success: result });
  } catch (err) {
    console.error("Error in clearCanvas route:", err);
    res.status(500).json({ error: "Error clearing canvas" });
  }
});

module.exports = router;
