import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "opencloser.db");
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency and NORMAL synchronous for speed
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration INTEGER DEFAULT 0,
      FOREIGN KEY(lead_id) REFERENCES leads(id)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_criteria TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed initial data if empty
  const count = db.prepare("SELECT COUNT(*) as count FROM leads").get() as {
    count: number;
  };
  if (count.count === 0) {
    const insertLead = db.prepare(
      "INSERT INTO leads (id, name, company, phone, status, score) VALUES (?, ?, ?, ?, ?, ?)",
    );

    insertLead.run("lead_1", "Sarah Jenkins", "Acme Corp", "+1 (555) 019-2834", "Discovery", 85);
    insertLead.run("lead_2", "Marcus Chen", "TechFlow Solutions", "+1 (555) 823-1044", "Discovery", 92);
    insertLead.run("lead_3", "Elena Rodriguez", "Global Logistics", "+1 (555) 392-8841", "Outbound Call", 78);
    insertLead.run("lead_4", "David Kim", "Apex Financial", "+1 (555) 744-2910", "Audit Requested", 95);
  }
}
