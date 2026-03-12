import { Router } from "express";
import { processOnboardingChat } from "../services/ai.service.js";

const router = Router();

router.post("/chat", async (req, res) => {
    try {
        const { messages } = req.body;
        const result = await processOnboardingChat(messages);
        res.json(result);
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "Failed to process chat" });
    }
});

export default router;
