const express = require("express");
const router = express.Router();
const {
  getAllSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  getSubmissionsByPhone,
  exportCSV,
  exportExcel,
} = require("../controllers/dashboardController");

// GET /api/records - Get all submissions
router.get("/records", getAllSubmissions);

// GET /api/record/:id - Get submission details
router.get("/record/:id", getSubmissionById);

// POST /api/record/:id/status - Update submission status
router.post("/record/:id/status", updateSubmissionStatus);

// GET /api/status/:phone - Check status by phone number (for submitter)
router.get("/status/:phone", getSubmissionsByPhone);

// GET /api/export/csv - Export all submissions as CSV
router.get("/export/csv", exportCSV);

// GET /api/export/excel - Export all submissions as Excel
router.get("/export/excel", exportExcel);

module.exports = router;
