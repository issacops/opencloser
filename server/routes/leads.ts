import { Router } from "express";
import {
    getLeads,
    updateLeadStatus,
    addActivity,
    insertLead,
} from "../repositories/lead.repository.js";
import { simulateLeadScraping } from "../services/ai.service.js";

const router = Router();

router.get("/", (req, res) => {
    try {
        const leads = getLeads();
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch leads" });
    }
});

router.post("/scrape", async (req, res) => {
    try {
        const { query, location, icp } = req.body;

        const generatedLeads = await simulateLeadScraping(query, location, icp);

        // Insert the generated leads into the SQLite database
        const insertedLeads = [];
        for (const lead of generatedLeads) {
            const id = insertLead(
                lead.name,
                lead.company,
                lead.phone,
                "Discovery",
                lead.score,
            );
            insertedLeads.push({ id, ...lead, status: "Discovery" });
            addActivity(
                id,
                "system_import",
                `Extracted via Lead Hunter: ${query} in ${location}`,
            );
        }

        res.json({ success: true, leads: insertedLeads });
    } catch (error) {
        console.error("Scraping Error:", error);
        res.status(500).json({ error: "Failed to extract leads" });
    }
});

router.put("/:id/status", (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: "Status is required" });
        }

        updateLeadStatus(id, status);

        // Log activity
        addActivity(id, "status_change", `Moved to ${status}`);

        res.json({ success: true, id, status });
    } catch (error) {
        res.status(500).json({ error: "Failed to update lead status" });
    }
});

export default router;
