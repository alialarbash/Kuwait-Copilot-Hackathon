const db = require("../database/db");
const XLSX = require("xlsx");

// Get all submissions for dashboard
function getAllSubmissions(req, res) {
  try {
    const submissions = db
      .prepare(
        `
      SELECT 
        id, 
        full_name, 
        phone, 
        civil_id, 
        extracted_student_id, 
        extracted_university, 
        status, 
        created_at 
      FROM submissions 
      ORDER BY created_at DESC
    `,
      )
      .all();

    res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    console.error("✗ Error in getAllSubmissions:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching submissions",
    });
  }
}

// Get single submission details
function getSubmissionById(req, res) {
  try {
    const { id } = req.params;

    const submission = db
      .prepare(
        `
      SELECT * FROM submissions WHERE id = ?
    `,
      )
      .get(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error("✗ Error in getSubmissionById:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching submission",
    });
  }
}

// Update submission status (PENDING, VERIFIED, REJECTED)
function updateSubmissionStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ["PENDING", "VERIFIED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be PENDING, VERIFIED, or REJECTED",
      });
    }

    const stmt = db.prepare(`
      UPDATE submissions 
      SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(status, notes || null, id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    console.log("✓ Submission", id, "status updated to:", status);

    res.status(200).json({
      success: true,
      message: "Submission status updated successfully",
    });
  } catch (error) {
    console.error("✗ Error in updateSubmissionStatus:", error.message);
    res.status(500).json({
      success: false,
      message: "Error updating submission status",
    });
  }
}

// Get submissions by phone number (for submitter to check status)
function getSubmissionsByPhone(req, res) {
  try {
    const { phone } = req.params;

    const submissions = db
      .prepare(
        `
      SELECT 
        id,
        full_name,
        civil_id,
        status,
        notes,
        created_at,
        updated_at
      FROM submissions 
      WHERE phone = ?
      ORDER BY created_at DESC
    `,
      )
      .all(phone);

    res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    console.error("✗ Error in getSubmissionsByPhone:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching submissions",
    });
  }
}

// Get all submissions data for export
function getExportData() {
  return db
    .prepare(
      `
      SELECT 
        id,
        full_name,
        phone,
        civil_id,
        extracted_student_id,
        extracted_university,
        status,
        notes,
        created_at,
        updated_at
      FROM submissions 
      ORDER BY created_at DESC
    `,
    )
    .all();
}

// Export submissions as CSV
function exportCSV(req, res) {
  try {
    const submissions = getExportData();

    if (!submissions.length) {
      return res.status(404).json({
        success: false,
        message: "No data to export",
      });
    }

    // Create CSV header
    const headers = [
      "ID",
      "Full Name",
      "Phone",
      "Civil ID",
      "Student ID",
      "University",
      "Status",
      "Notes",
      "Created At",
      "Updated At",
    ];

    // Create CSV rows
    const rows = submissions.map((s) => [
      s.id,
      s.full_name,
      s.phone,
      s.civil_id,
      s.extracted_student_id || "",
      s.extracted_university || "",
      s.status,
      s.notes || "",
      s.created_at,
      s.updated_at || "",
    ]);

    // Build CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=submissions_${Date.now()}.csv`,
    );

    res.send(csvContent);
  } catch (error) {
    console.error("✗ Error in exportCSV:", error.message);
    res.status(500).json({
      success: false,
      message: "Error exporting CSV",
    });
  }
}

// Export submissions as Excel
function exportExcel(req, res) {
  try {
    const submissions = getExportData();

    if (!submissions.length) {
      return res.status(404).json({
        success: false,
        message: "No data to export",
      });
    }

    // Prepare data for Excel
    const data = submissions.map((s) => ({
      ID: s.id,
      "Full Name": s.full_name,
      Phone: s.phone,
      "Civil ID": s.civil_id,
      "Student ID": s.extracted_student_id || "",
      University: s.extracted_university || "",
      Status: s.status,
      Notes: s.notes || "",
      "Created At": s.created_at,
      "Updated At": s.updated_at || "",
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 5 }, // ID
      { wch: 25 }, // Full Name
      { wch: 15 }, // Phone
      { wch: 15 }, // Civil ID
      { wch: 15 }, // Student ID
      { wch: 30 }, // University
      { wch: 12 }, // Status
      { wch: 30 }, // Notes
      { wch: 20 }, // Created At
      { wch: 20 }, // Updated At
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=submissions_${Date.now()}.xlsx`,
    );

    res.send(buffer);
  } catch (error) {
    console.error("✗ Error in exportExcel:", error.message);
    res.status(500).json({
      success: false,
      message: "Error exporting Excel",
    });
  }
}

module.exports = {
  getAllSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  getSubmissionsByPhone,
  exportCSV,
  exportExcel,
};
