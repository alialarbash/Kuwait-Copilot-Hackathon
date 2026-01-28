const db = require("./db");

// Initialize database schema
function initializeDatabase() {
  try {
    // Create Universities table
    db.exec(`
      CREATE TABLE IF NOT EXISTS universities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Students table
    db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_number TEXT NOT NULL UNIQUE,
        university_id INTEGER NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (university_id) REFERENCES universities(id)
      );
    `);

    // Create Submissions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        civil_id TEXT NOT NULL,
        certificate_path TEXT NOT NULL,
        ocr_text TEXT,
        extracted_student_id TEXT,
        extracted_university TEXT,
        status TEXT DEFAULT 'PENDING',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✓ Database schema initialized successfully");
    seedInitialData();
  } catch (error) {
    console.error("✗ Error initializing database:", error.message);
  }
}

// Seed initial universities
function seedInitialData() {
  try {
    const universities = [
      "Kuwait University",
      "American University of Kuwait",
      "Canadian University of Kuwait",
      "Arab Open University",
      "Gulf University for Science and Technology",
      "Dasman Institute for Medical Research",
    ];

    for (let uni of universities) {
      try {
        db.prepare("INSERT INTO universities (name) VALUES (?)").run(uni);
      } catch (error) {
        // University already exists, skip
      }
    }

    console.log("✓ Initial universities seeded");
  } catch (error) {
    console.error("✗ Error seeding data:", error.message);
  }
}

module.exports = { initializeDatabase };
