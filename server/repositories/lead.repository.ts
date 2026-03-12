import { db } from "../db/database.js";

export function getLeads() {
    return db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
}

export function insertLead(
    name: string,
    company: string,
    phone: string,
    status: string,
    score: number,
) {
    const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = db.prepare(
        "INSERT INTO leads (id, name, company, phone, status, score) VALUES (?, ?, ?, ?, ?, ?)",
    );
    stmt.run(id, name, company, phone, status, score);
    return id;
}

export function updateLeadStatus(id: string, status: string) {
    const stmt = db.prepare("UPDATE leads SET status = ? WHERE id = ?");
    stmt.run(status, id);
}

export function addActivity(leadId: string, type: string, description: string) {
    const id = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = db.prepare(
        "INSERT INTO activities (id, lead_id, type, description) VALUES (?, ?, ?, ?)",
    );
    stmt.run(id, leadId, type, description);
}
