const db = require("../database/db");
const { processOCR } = require("../middleware/ocrProcessor");
const path = require("path");

// Handle form submission with file upload
async function submitCertificate(req, res) {
  try {
    const { full_name, phone, civil_id } = req.body;
    const file = req.file;

    // Validation
    if (!full_name || !phone || !civil_id || !file) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (name, phone, civil_id) and certificate file are required",
      });
    }

    console.log("📝 New submission:", { full_name, phone, civil_id });

    // Process OCR
    const ocrResult = await processOCR(file.path);

    // Store in database
    const stmt = db.prepare(`
      INSERT INTO submissions (
        full_name, 
        phone, 
        civil_id, 
        certificate_path, 
        ocr_text, 
        extracted_student_id, 
        extracted_university, 
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      full_name,
      phone,
      civil_id,
      file.filename, // Store only filename
      ocrResult.rawText,
      ocrResult.studentID,
      ocrResult.universityName,
      "PENDING",
    );

    console.log("✓ Submission saved with ID:", result.lastInsertRowid);

    res.status(200).json({
      success: true,
      message: "Certificate submitted successfully",
      submissionId: result.lastInsertRowid,
      extractedData: {
        studentID: ocrResult.studentID,
        universityName: ocrResult.universityName,
      },
    });
  } catch (error) {
    console.error("✗ Error in submitCertificate:", error.message);
    res.status(500).json({
      success: false,
      message: "Error processing submission: " + error.message,
    });
  }
}

module.exports = {
  submitCertificate,
};
