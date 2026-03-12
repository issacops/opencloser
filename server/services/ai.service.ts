import { GoogleGenAI, Type } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function simulateLeadScraping(query: string, location: string, icp: any) {
    const prompt = `
  You are simulating a headless browser scraping engine for a B2B sales tool.
  The user is searching for: "${query}" in "${location}".
  
  Their Ideal Customer Profile (ICP) is:
  - Industry: ${icp?.industry || "Not specified"}
  - Target Audience: ${icp?.targetAudience || "Not specified"}
  - Company Size: ${icp?.companySize || "Not specified"}
  - Decision Maker Titles: ${icp?.decisionMakerTitles?.join(", ") || "Not specified"}
  - Pain Points: ${icp?.painPoints?.join(", ") || "Not specified"}
  - Competitors to beat: ${icp?.competitorNames?.join(", ") || "Not specified"}
  
  Generate 4 highly realistic, fictional business leads that match this search AND the ICP profile above.
  Ensure the names, companies, and phone numbers look completely authentic for the requested location and industry.
  Score them between 60 and 99 based on how well they match the ICP.
  Leads with decision-maker titles matching the ICP should score higher.
  
  Return a JSON array of objects with the following keys: name, company, phone, score.
  `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        company: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        score: { type: Type.INTEGER },
                    },
                    required: ["name", "company", "phone", "score"],
                },
            },
        },
    });

    return JSON.parse(response.text || "[]");
}

export async function processOnboardingChat(messages: any[]) {
    const conversationHistory = messages
        .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\\n");

    const prompt = `
  You are an elite AI Sales Strategist for "OpenCloser", a world-class AI SDR platform.
  Your job is to deeply interview the user using the SPIN (Situation, Problem, Implication, Need-Payoff) interview framework to build an extremely detailed Ideal Customer Profile (ICP).
  
  CRITICAL INTERVIEWING RULES:
  1. Ask ONE question at a time. Never ask multiple questions in a single message.
  2. Probe deeply. Do not accept surface-level answers. If the user says "we sell software", ask "What specific problem does your software solve, and for whom?"
  3. Cover ALL of these dimensions before completing:
     - What exactly the company does (product/service)
     - Which industry they serve
     - The ideal company size of their customers (SMB, Mid-Market, Enterprise)
     - The job titles of the decision-makers they sell to
     - The top 3-5 pain points their customers experience
     - Their unique value proposition (why customers choose them over competitors)
     - Who their main competitors are
     - The most common objections prospects raise on sales calls
  4. You need at least 4-5 exchanges with the user before you have enough information. Do NOT generate the ICP after only 1-2 messages.
  5. Be warm, professional, and conversational. Use the prospect's previous answers to build context in your next question.
  
  ANTI-HALLUCINATION RULES:
  - ONLY use information the user has explicitly provided. 
  - Do NOT invent, assume, or fabricate any details about the user's business, customers, competitors, or market.
  - If you are unsure about something, ASK rather than guess.
  
  Here is the conversation so far:
  ${conversationHistory}
  
  Analyze the conversation carefully.
  If you DO NOT have enough information across ALL dimensions listed above, ask ONE targeted follow-up question.
  If you DO have comprehensive information, generate the final ICP with an extremely detailed system prompt.
  
  The systemPrompt you generate must be a comprehensive behavioral script for an AI phone agent, including:
  - A clear opening line
  - Discovery questions to ask
  - How to handle the top 3 objections
  - A clear call-to-action (e.g., book a meeting)
  - Instructions to NEVER fabricate statistics, case studies, or claims not grounded in the ICP data
  
  You MUST return your response as a JSON object matching this schema:
  {
    "isComplete": boolean,
    "reply": string,
    "icp": {
      "targetAudience": string,
      "industry": string,
      "companySize": string,
      "decisionMakerTitles": string[],
      "painPoints": string[],
      "objections": string[],
      "competitorNames": string[],
      "valueProposition": string,
      "salesMethodology": "SPIN Selling" | "Challenger Sale" | "Sandler System" | "Straight Line Persuasion",
      "systemPrompt": string
    }
  }
  `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isComplete: { type: Type.BOOLEAN },
                    reply: { type: Type.STRING },
                    icp: {
                        type: Type.OBJECT,
                        properties: {
                            targetAudience: { type: Type.STRING },
                            industry: { type: Type.STRING },
                            companySize: { type: Type.STRING },
                            decisionMakerTitles: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                            },
                            painPoints: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                            },
                            objections: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                            },
                            competitorNames: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                            },
                            valueProposition: { type: Type.STRING },
                            salesMethodology: { type: Type.STRING },
                            systemPrompt: { type: Type.STRING },
                        },
                    },
                },
                required: ["isComplete"],
            },
        },
    });

    return JSON.parse(response.text || "{}");
}

export async function analyzeCallTranscript(
    transcript: any[],
    leadName: string,
    leadCompany: string,
    icp: any
) {
    const transcriptText = transcript
        .map((t: any) => `${t.role === 'model' ? 'AI Agent' : 'Prospect'}: ${t.text}`)
        .join("\n");

    const prompt = `
  You are an elite sales intelligence analyst. Analyze the following sales call transcript and produce a comprehensive debrief.

  LEAD: ${leadName} at ${leadCompany}
  ICP CONTEXT: ${icp ? JSON.stringify(icp) : "Not provided"}

  TRANSCRIPT:
  ${transcriptText}

  ANTI-HALLUCINATION RULES:
  - Only reference things that were ACTUALLY said in the transcript.
  - Do NOT fabricate quotes, statements, or sentiments that were not expressed.
  - If something is unclear, say "unclear from transcript" rather than guessing.

  Generate a JSON object with:
  1. "summary" - A 2-3 sentence executive summary of the call outcome.
  2. "sentiment" - The prospect's overall sentiment: "Positive", "Neutral", "Negative", or "Mixed".
  3. "objectionsRaised" - An array of specific objections the prospect raised (empty array if none).
  4. "keyInsights" - An array of 2-4 key takeaways from the conversation.
  5. "nextSteps" - An array of recommended next steps.
  6. "followUpEmail" - A professional, personalized follow-up email body (NOT including subject line). Reference specific topics discussed in the call. Keep it concise (3-4 paragraphs max).
  7. "emailSubject" - A compelling email subject line for the follow-up.
  `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    sentiment: { type: Type.STRING },
                    objectionsRaised: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                    keyInsights: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                    nextSteps: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                    followUpEmail: { type: Type.STRING },
                    emailSubject: { type: Type.STRING },
                },
                required: ["summary", "sentiment", "objectionsRaised", "keyInsights", "nextSteps", "followUpEmail", "emailSubject"],
            },
        },
    });

    return JSON.parse(response.text || "{}");
}
