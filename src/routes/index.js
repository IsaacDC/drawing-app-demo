const express = require("express");

const dataRoutes = require("./dataRoutes");

const router = express.Router();

// Combine all routes
router.use(dataRoutes);

module.exports = router;
