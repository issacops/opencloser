use log::{error, info};
use rusqlite::Connection;
use std::fs;
use tauri::{AppHandle, Manager};

pub fn init(app_handle: &AppHandle) {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    }

    let db_path = app_dir.join("opencloser.db");
    
    // Connect to SQLite
    let conn = Connection::open(&db_path).expect("Failed to open SQLite database");

    // Enable WAL mode
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        ",
    )
    .expect("Failed to set pragmas");

    // Initialize Schema
    conn.execute_batch(
        "
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

        CREATE TABLE IF NOT EXISTS call_logs (
            id TEXT PRIMARY KEY,
            lead_id TEXT NOT NULL,
            duration_seconds INTEGER NOT NULL,
            transcript TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(lead_id) REFERENCES leads(id)
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            target_criteria TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS lead_notes (
            id TEXT PRIMARY KEY,
            lead_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
        );
        ",
    )
    .expect("Failed to create database schema");

    // Seed data if empty
    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM leads", [], |row| row.get(0))
        .unwrap_or(0);

    if count == 0 {
        info!("Seeding initial leads data...");
        conn.execute_batch(
            "
            INSERT INTO leads (id, name, company, phone, status, score) VALUES 
                ('lead_1', 'Sarah Jenkins', 'Acme Corp', '+1 (555) 019-2834', 'Discovery', 85),
                ('lead_2', 'Marcus Chen', 'TechFlow Solutions', '+1 (555) 823-1044', 'Discovery', 92),
                ('lead_3', 'Elena Rodriguez', 'Global Logistics', '+1 (555) 392-8841', 'Outbound Call', 78),
                ('lead_4', 'David Kim', 'Apex Financial', '+1 (555) 744-2910', 'Audit Requested', 95);
            ",
        )
        .expect("Failed to seed data");
    } else {
        info!("Database already seeded with {} leads.", count);
    }
}
