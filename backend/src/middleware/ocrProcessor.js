const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");
const db = require("../database/db");

async function processOCR(filePath) {
  try {
    console.log("🔄 Processing OCR for:", filePath);

    let ocrText = "";
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".pdf") {
      ocrText = await extractTextFromPdf(filePath);
    }

    if (!ocrText || !ocrText.trim()) {
      ocrText = await extractTextWithTesseract(filePath);
    }

    if (!ocrText || !ocrText.trim()) {
      throw new Error("No text detected in certificate");
    }

    console.log("✓ OCR text extracted");

    const extracted = extractDataFromOCR(ocrText);

    return {
      rawText: ocrText,
      studentID: extracted.studentID,
      universityName: extracted.universityName,
    };
  } catch (error) {
    throw new Error("OCR processing failed: " + error.message);
  }
}

async function extractTextFromPdf(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    return pdfData.text || "";
  } catch (error) {
    console.warn(
      "⚠️ PDF text extraction failed, falling back to OCR:",
      error.message,
    );
    return "";
  }
}

async function extractTextWithTesseract(filePath) {
  const result = await Tesseract.recognize(filePath, "eng+ara");
  return result.data.text || "";
}

function extractDataFromOCR(ocrText) {
  // Normalize text: fix merged columns from PDF extraction
  let cleanedText = ocrText.replace(/\r/g, "");
  
  // Insert newlines before common labels that might be merged
  cleanedText = cleanedText.replace(/(Registration\s*Number)/gi, "\n$1");
  cleanedText = cleanedText.replace(/(HESA\s*Number)/gi, "\n$1");
  cleanedText = cleanedText.replace(/(Student\s*Number)/gi, "\n$1");
  
  const lowerText = cleanedText.toLowerCase();

  console.log("📄 Cleaned OCR text (first 500 chars):", cleanedText.substring(0, 500));

  const studentID = findStudentId(cleanedText);
  const universityName = findUniversityName(cleanedText, lowerText);

  return { studentID, universityName };
}

function findStudentId(text) {
  // Patterns for University of Bath transcripts and similar formats
  // PDF extraction may merge columns, so patterns handle various formats
  const idPatterns = [
    // "Registration Number: 123456789" or "Registration Number:123456789"
    /Registration\s*Number\s*[:\s]\s*(\d{6,13})/i,
    // Handle merged text: "EnglishRegistration Number:" followed by number on next line
    /Registration\s*Number\s*[:\s]*\n?\s*(\d{6,13})/i,
    // "Student Number: 123344567"
    /Student\s*Number\s*[:\s]\s*(\d{6,13})/i,
    // "HESA Number: 0000012345678"
    /HESA\s*Number\s*[:\s]\s*(\d{6,13})/i,
    // Generic ID pattern
    /ID\s*(?:Number|No\.?)\s*[:\s]\s*(\d{6,13})/i,
  ];

  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match) {
      console.log("✓ Found ID with pattern:", pattern.toString(), "->", match[1]);
      return sanitizeId(match[1]);
    }
  }

  // Fallback: extract all numbers 6-13 digits, pick the one that looks like a student ID
  // Prefer 9-digit numbers (common student ID length), then longest
  const numericCandidates = text.match(/\b\d{6,13}\b/g);
  if (numericCandidates && numericCandidates.length) {
    console.log("📊 Numeric candidates found:", numericCandidates);
    
    // Prefer 9-digit numbers (typical student ID)
    const nineDigit = numericCandidates.find(n => n.length === 9);
    if (nineDigit) {
      console.log("✓ Selected 9-digit ID:", nineDigit);
      return nineDigit;
    }
    
    // Otherwise return the first reasonable one (not starting with many zeros)
    const reasonable = numericCandidates.find(n => !n.startsWith("0000"));
    if (reasonable) {
      console.log("✓ Selected reasonable ID:", reasonable);
      return reasonable;
    }
    
    // Last resort: longest number
    return numericCandidates.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
    );
  }

  return null;
}

function findUniversityName(text, textLower) {
  const labelMatch = text.match(/University\s*(?:Name)?\s*[:\-]\s*([^\n]+)/i);
  if (labelMatch) {
    return cleanUniversityName(labelMatch[1]);
  }

  const ofPattern = text.match(/(University of [A-Za-z ,&]+)/i);
  if (ofPattern) {
    return cleanUniversityName(ofPattern[1]);
  }

  const suffixPattern = text.match(/([A-Za-z ,&]+ University)/i);
  if (suffixPattern) {
    return cleanUniversityName(suffixPattern[1]);
  }

  const universities = db.prepare("SELECT name FROM universities").all();
  for (const uni of universities) {
    if (textLower.includes(uni.name.toLowerCase())) {
      return uni.name;
    }
  }

  return null;
}

function sanitizeId(value) {
  if (!value) return null;
  return value.replace(/[^A-Z0-9]/gi, "").trim();
}

function cleanUniversityName(value) {
  if (!value) return null;
  return value
    .replace(/[^A-Za-z ,&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { processOCR, extractDataFromOCR };
