const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const { submitCertificate } = require("../controllers/submissionController");

// POST /api/submit - Handle form submission with file upload
router.post("/", upload.single("certificate"), submitCertificate);

module.exports = router;
