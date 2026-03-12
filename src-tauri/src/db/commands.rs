use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct Lead {
    pub id: String,
    pub name: String,
    pub company: String,
    pub phone: String,
    pub status: String,
    pub score: i32,
    pub created_at: String,
}

#[tauri::command]
pub fn get_leads(app: AppHandle) -> Result<Vec<Lead>, String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, company, phone, status, score, created_at FROM leads ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let lead_iter = stmt
        .query_map([], |row| {
            Ok(Lead {
                id: row.get(0)?,
                name: row.get(1)?,
                company: row.get(2)?,
                phone: row.get(3)?,
                status: row.get(4)?,
                score: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut leads = Vec::new();
    for lead in lead_iter {
        leads.push(lead.map_err(|e| e.to_string())?);
    }

    Ok(leads)
}

#[tauri::command]
pub fn update_lead_status(app: AppHandle, id: String, status: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE leads SET status = ?1 WHERE id = ?2",
        [&status, &id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(serde::Deserialize)]
pub struct NewLead {
    pub id: String,
    pub name: String,
    pub company: String,
    pub phone: String,
    pub score: i32,
}

#[tauri::command]
pub fn add_leads(app: AppHandle, leads: Vec<NewLead>) -> Result<usize, String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let mut conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    let mut inserted_count = 0;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    {
        // Check if phone number already exists
        let mut check_stmt = tx.prepare("SELECT COUNT(*) FROM leads WHERE phone = ?1")
            .map_err(|e| e.to_string())?;
            
        let mut insert_stmt = tx.prepare(
            "INSERT INTO leads (id, name, company, phone, status, score) VALUES (?1, ?2, ?3, ?4, 'Discovery', ?5)"
        ).map_err(|e| e.to_string())?;
        
        for lead in leads {
            let count: i32 = check_stmt.query_row([&lead.phone], |row| row.get(0))
                .unwrap_or(0);
                
            if count == 0 {
                insert_stmt.execute(
                    rusqlite::params![lead.id, lead.name, lead.company, lead.phone, lead.score]
                ).map_err(|e| e.to_string())?;
                inserted_count += 1;
            }
        }
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(inserted_count)
}

#[derive(Serialize)]
pub struct CallLog {
    pub id: String,
    pub lead_id: String,
    pub duration_seconds: i32,
    pub transcript: String,
    pub status: String,
    pub created_at: String,
    // Joined from leads
    pub lead_name: Option<String>,
    pub lead_company: Option<String>,
}

#[tauri::command]
pub fn get_call_logs(app: AppHandle) -> Result<Vec<CallLog>, String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.lead_id, c.duration_seconds, c.transcript, c.status, c.created_at, l.name as lead_name, l.company as lead_company 
             FROM call_logs c 
             LEFT JOIN leads l ON c.lead_id = l.id 
             ORDER BY c.created_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(CallLog {
                id: row.get(0)?,
                lead_id: row.get(1)?,
                duration_seconds: row.get(2)?,
                transcript: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
                lead_name: row.get(6).ok(),
                lead_company: row.get(7).ok(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for log in iter {
        logs.push(log.map_err(|e| e.to_string())?);
    }

    Ok(logs)
}

#[tauri::command]
pub fn add_call_log(
    app: AppHandle, 
    id: String, 
    lead_id: String, 
    duration_seconds: i32, 
    transcript: String, 
    status: String
) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO call_logs (id, lead_id, duration_seconds, transcript, status) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, lead_id, duration_seconds, transcript, status],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_lead_call_logs(app: AppHandle, lead_id: String) -> Result<Vec<CallLog>, String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.lead_id, c.duration_seconds, c.transcript, c.status, c.created_at, l.name, l.company
             FROM call_logs c
             LEFT JOIN leads l ON c.lead_id = l.id
             WHERE c.lead_id = ?1
             ORDER BY c.created_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([&lead_id], |row| {
            Ok(CallLog {
                id: row.get(0)?,
                lead_id: row.get(1)?,
                duration_seconds: row.get(2)?,
                transcript: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
                lead_name: row.get(6).ok(),
                lead_company: row.get(7).ok(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for log in iter {
        logs.push(log.map_err(|e| e.to_string())?);
    }

    Ok(logs)
}

#[derive(Serialize)]
pub struct LeadNote {
    pub id: String,
    pub lead_id: String,
    pub content: String,
    pub created_at: String,
}

#[tauri::command]
pub fn get_lead_notes(app: AppHandle, lead_id: String) -> Result<Vec<LeadNote>, String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, lead_id, content, created_at FROM lead_notes WHERE lead_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([&lead_id], |row| {
            Ok(LeadNote {
                id: row.get(0)?,
                lead_id: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for note in iter {
        notes.push(note.map_err(|e| e.to_string())?);
    }

    Ok(notes)
}

#[tauri::command]
pub fn add_lead_note(app: AppHandle, id: String, lead_id: String, content: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO lead_notes (id, lead_id, content) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, lead_id, content],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_lead(app: AppHandle, id: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let db_path = app_dir.join("opencloser.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Delete associated data first
    conn.execute("DELETE FROM lead_notes WHERE lead_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM call_logs WHERE lead_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM activities WHERE lead_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM leads WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
