const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("drawings.db");

db.serialize(() => {
  // Create the drawings table
  db.run(
    `CREATE TABLE IF NOT EXISTS drawings (
    startX REAL,
    startY REAL,
    endX REAL,
    endY REAL,
    color TEXT DEFAULT '#000000',
    width INTEGER DEFAULT 5
  )`,
    (err) => {
      if (err) {
        console.error("Error creating drawings table:", err);
      }
    }
  );

  db.run("PRAGMA journal_mode=WAL;", (err) => {
    if (err) {
      console.error("Error setting WAL journal mode:", err);
    }
  });
});
module.exports = {
  insertDrawingData(data) {
    const { startX, startY, endX, endY, color, width } = data;

    let sql, params;

    if (color) {
      sql =
        "INSERT INTO drawings (startX, startY, endX, endY, color, width) VALUES (?, ?, ?, ?, ?, ?)";
      params = [startX, startY, endX, endY, color, width];
    } else {
      sql =
        "INSERT INTO drawings (startX, startY, endX, endY, width) VALUES (?, ?, ?, ?, ?)";
      params = [startX, startY, endX, endY, width];
    }
    db.run(sql, params, (err) => {
      if (err) {
        console.error("Error inserting drawing data:", err);
      }
    });
  },

  getAllDrawingData(callback) {
    db.all("SELECT * FROM drawings", [], (err, results) => {
      if (err) {
        console.error("Error getting all drawing data:", err);
        callback(err, null);
        return;
      }
      callback(null, results);
    });
  },

  clearCanvas(callback) {
    db.run("DELETE FROM drawings", (err) => {
      if (err) {
        console.error("Error clearing canvas:", err);
        callback(false);
      } else {
        callback(true);
      }
    });
  },
};
