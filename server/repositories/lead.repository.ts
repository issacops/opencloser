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
    email: string = "",
    title: string = "",
    linkedin_url: string = "",
) {
    const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(
        "INSERT INTO leads (id, name, company, phone, status, score, email, title, linkedin_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, name, company, phone, status, score, email, title, linkedin_url);
    return id;
}

export function updateLeadStatus(id: string, status: string) {
    db.prepare("UPDATE leads SET status = ? WHERE id = ?").run(status, id);
}

export function addActivity(leadId: string, type: string, description: string) {
    const id = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(
        "INSERT INTO activities (id, lead_id, type, description) VALUES (?, ?, ?, ?)"
    ).run(id, leadId, type, description);
}
