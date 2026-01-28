const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeDatabase } = require("./database/init");

// Import routes
const submitRoute = require("./routes/submitRoute");
const dashboardRoute = require("./routes/dashboardRoute");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../public")));

// Serve uploaded certificates
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/submit", submitRoute);
app.use("/api", dashboardRoute);

// Serve main pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("✗ Error:", err.message);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Certificate Verification System - POC     ║
║  Backend running on http://localhost:${PORT} ║
╚════════════════════════════════════════════╝
  `);
});
