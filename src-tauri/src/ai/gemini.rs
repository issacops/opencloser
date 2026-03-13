use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;

#[derive(Serialize, Deserialize, Debug)]
pub struct LeadSimulation {
    pub name: String,
    pub company: String,
    pub phone: String,
    pub score: i32,
}

#[tauri::command]
pub async fn simulate_lead_scraping(
    query: String,
    location: String,
    icp: Option<Value>,
) -> Result<Vec<LeadSimulation>, String> {
    let api_key = env::var("GEMINI_API_KEY").unwrap_or_default();
    if api_key.is_empty() || api_key == "MY_GEMINI_API_KEY" {
        // Fallback mock mode if no API key is provided
        println!("MOCK MODE: Simulating lead scraping because GEMINI_API_KEY is not set.");
        
        let mock_leads = vec![
            LeadSimulation {
                name: "Richard Vance".to_string(),
                company: "Vance Heavy Engineering ($8M ARR)".to_string(),
                phone: "+1-512-555-0199".to_string(),
                score: 98,
            },
            LeadSimulation {
                name: "Elena Rostova".to_string(),
                company: "Rostova Commercial Builds (Procore User)".to_string(),
                phone: "+1-512-555-0102".to_string(),
                score: 94,
            },
            LeadSimulation {
                name: "Marcus Thorne".to_string(),
                company: "Thorne Industrial Partners ($12M ARR)".to_string(),
                phone: "+1-512-555-0103".to_string(),
                score: 96,
            },
            LeadSimulation {
                name: "Sarah Williams".to_string(),
                company: "SafeBuild Development ($5M ARR)".to_string(),
                phone: "+1-512-555-0104".to_string(),
                score: 89,
            },
        ];
        return Ok(mock_leads);
    }

    let icp_str = match &icp {
        Some(val) => serde_json::to_string(val).unwrap_or("Not provided".to_string()),
        None => "Not provided".to_string(),
    };

    let prompt = format!(
        "You are simulating a headless browser scraping engine for an elite B2B sales tool.
        The user is searching for: \"{}\" in \"{}\".
        
        Their Ideal Customer Profile (ICP) is incredibly specific:
        {}
        
        You MUST meticulously analyze the provided ICP's exact needs. Any generated lead MUST mathematically and logically fit the target audience. If the ICP targets enterprise clients, do not generate local mom-and-pop shops. If it targets a specific revenue or toolstack, the generated companies must logically fit criteria.
        
        Generate 4 highly realistic, fictional business leads that EXACTLY match this search and ICP constraints.
        Ensure the names, companies, and phone numbers look completely authentic for the requested location and industry. Use complex heuristic naming.
        Score them between 85 and 99 based on how perfectly they match the ICP.",
        query, location, icp_str
    );

    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        api_key
    );

    let payload = json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "name": { "type": "STRING" },
                        "company": { "type": "STRING" },
                        "phone": { "type": "STRING" },
                        "score": { "type": "INTEGER" }
                    },
                    "required": ["name", "company", "phone", "score"]
                }
            }
        }
    });

    let res = client.post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Gemini API error: {}", err_text));
    }

    let body: Value = res.json().await.map_err(|e| format!("Failed to parse response JSON: {}", e))?;
    
    let text = body["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("[]");

    let leads: Vec<LeadSimulation> = serde_json::from_str(text).map_err(|e| format!("Failed to parse simulated leads: {}", e))?;
    Ok(leads)
}

#[derive(Serialize, Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct IcpResponseData {
    pub isComplete: bool,
    pub reply: Option<String>,
    pub icp: Option<Value>,
}

#[tauri::command]
pub async fn process_onboarding_chat(messages: Vec<Value>) -> Result<IcpResponseData, String> {
    let api_key = env::var("GEMINI_API_KEY").unwrap_or_default();
    if api_key.is_empty() || api_key == "MY_GEMINI_API_KEY" {
        // Fallback mock mode if no API key is provided
        println!("MOCK MODE: Simulating AI chat because GEMINI_API_KEY is not set.");

        if messages.len() > 3 {
            // User replied a few times, let's complete onboarding with a deep strategy
            let mock_icp = json!({
                "targetAudience": "Mid-market commercial contractors prioritizing heavy engineering (Revenue $5M-$20M ARR, heavy Procore users) actively burning cash on generic general liability policies.",
                "painPoints": [
                    "SITUATION: Currently using generic business owner policies that leave critical heavy equipment uninsured during complex transports.",
                    "PROBLEM: Cash flow is inherently tight, and a recent incident forced them to pay $150k out-of-pocket due to a minor policy loophole.",
                    "IMPLICATION: One more denied claim on a $500k piece of equipment can literally bankrupt their operation within 3 months.",
                    "NEED-PAYOFF: A specialized, tailored contractor policy guaranteeing exact equipment coverage, enabling them to confidently bid on $10M+ city contracts without existential fear."
                ],
                "valueProposition": "We don't just sell insurance; we protect your livelihood with contractor-specific policies that definitively eliminate $100k+ coverage gaps and empower you to safely scale your operations.",
                "salesMethodology": "SPIN Selling & Challenger Methodology",
                "systemPrompt": "You are a Challenger Sales SDR. Do not just take orders. Challenge the contractor on their current coverage gaps. Ask implication questions: 'What exactly happens to your Q3 payroll if your primary excavator is stolen overnight and your generic policy automatically denies the claim?'"
            });
            return Ok(IcpResponseData {
                isComplete: true,
                reply: None,
                icp: Some(mock_icp),
            });
        } else {
            // Still need more info
            return Ok(IcpResponseData {
                isComplete: false,
                reply: Some("MOCK MODE: That's a great start. To really nail down an outreach strategy using the SPIN methodology, what is the most costly consequence (Implication) your contractors face when their current insurance falls short during a critical project?".to_string()),
                icp: None,
            });
        }
    }

    let mut history = String::new();
    for m in messages {
        let role = m["role"].as_str().unwrap_or("UNKNOWN").to_uppercase();
        let content = m["content"].as_str().unwrap_or("");
        history.push_str(&format!("{}: {}\n", role, content));
    }

    let prompt = format!(
        "You are an elite, Enterprise-grade AI Sales Strategist building an outbound engine for \"OpenCloser\".
        Your goal is to interview the user to build an incredibly potent, high-converting Ideal Customer Profile (ICP) leveraging the best modern sales frameworks: SPIN (Situation, Problem, Implication, Need-payoff) and the Challenger Sale.
        
        Do not settle for generic answers like \"small businesses who need marketing\". You MUST push deep. You MUST demand precise metrics, revenue constraints, exact toolstacks, and highly specific pain points.
        
        Here is the conversation so far:
        {}
        
        Analyze the conversation.
        If you DO NOT have a complete picture of the EXACT Situation (e.g., revenue size, current tech stack), the EXACT Problem with quantifiable metrics, the painful Implications of that problem, and the ultimate Need-payoff, you MUST ask ONE highly strategic, challenging follow-up question to dig deeper. Talk like a seasoned VP of Sales mentoring a founder. Do not finalize the ICP until you have concrete, measurable constraints.
        
        If you DO have enough deep, actionable intelligence with clear metrics and constraints, generate the final ICP output. The final ICP must be highly specific, contrarian if necessary, and use the exact language of their industry. It must represent their EXACT needs.",
        history
    );

    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        api_key
    );

    let payload = json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "isComplete": { "type": "BOOLEAN" },
                    "reply": { "type": "STRING" },
                    "icp": {
                        "type": "OBJECT",
                        "properties": {
                            "targetAudience": { "type": "STRING" },
                            "painPoints": {
                                "type": "ARRAY",
                                "items": { "type": "STRING" }
                            },
                            "valueProposition": { "type": "STRING" },
                            "salesMethodology": { "type": "STRING" },
                            "systemPrompt": { "type": "STRING" }
                        }
                    }
                },
                "required": ["isComplete"]
            }
        }
    });

    let res = client.post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Gemini API error: {}", err_text));
    }

    let body: Value = res.json().await.map_err(|e| format!("Failed to parse response JSON: {}", e))?;
    
    let text = body["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("{}");

    let response_data: IcpResponseData = serde_json::from_str(text).map_err(|e| format!("Failed to parse structured response: {}", e))?;
    Ok(response_data)
}

#[tauri::command]
pub async fn analyze_call_transcript(
    transcript: String,
    lead_name: String,
    lead_company: String,
    icp: Option<String>,
) -> Result<Value, String> {
    let api_key = env::var("GEMINI_API_KEY").unwrap_or_default();
    
    if api_key.is_empty() || api_key == "MY_GEMINI_API_KEY" {
        // Mock fallback
        return Ok(json!({
            "summary": "The AI agent connected with the prospect and had a productive 3-minute conversation. The prospect expressed interest in learning more about the solution but wants to consult with their team before committing to a meeting.",
            "sentiment": "Positive",
            "objectionsRaised": ["Need to check with my business partner", "Current solution might be adequate"],
            "keyInsights": [
                "Prospect is actively evaluating alternatives",
                "Budget is approved for Q2",
                "Decision involves 2 stakeholders"
            ],
            "nextSteps": [
                "Send follow-up email within 24 hours",
                "Schedule a follow-up call for next Tuesday",
                "Prepare a custom ROI analysis"
            ],
            "followUpEmail": format!("Hi {},\n\nGreat chatting with you earlier today. I really appreciate you taking the time to walk me through what's happening at {}.\n\nAs we discussed, I'll put together that tailored overview for you and your team. I think once you see how specifically this addresses the challenges you mentioned, it'll make the conversation with your partner much easier.\n\nWould next Tuesday afternoon work for a quick 15-minute follow-up? I'll come prepared with everything we talked about.\n\nLooking forward to it!", lead_name, lead_company),
            "emailSubject": format!("Great connecting today, {} — quick follow-up", lead_name)
        }));
    }

    let icp_context = icp.unwrap_or("Not provided".to_string());

    let prompt = format!(
        "You are an elite sales intelligence analyst. Analyze this sales call transcript and produce a comprehensive debrief.

        LEAD: {} at {}
        ICP CONTEXT: {}

        TRANSCRIPT:
        {}

        ANTI-HALLUCINATION RULES:
        - Only reference things ACTUALLY said in the transcript.
        - Do NOT fabricate quotes or sentiments not expressed.
        - If unclear, say 'unclear from transcript'.

        Generate a JSON object with:
        1. 'summary' - 2-3 sentence executive summary
        2. 'sentiment' - Prospect sentiment: 'Positive', 'Neutral', 'Negative', or 'Mixed'
        3. 'objectionsRaised' - Array of specific objections (empty if none)
        4. 'keyInsights' - Array of 2-4 key takeaways
        5. 'nextSteps' - Array of recommended next steps
        6. 'followUpEmail' - Professional follow-up email body referencing specific topics discussed
        7. 'emailSubject' - Compelling email subject line",
        lead_name, lead_company, icp_context, transcript
    );

    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        api_key
    );

    let payload = json!({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "summary": { "type": "STRING" },
                    "sentiment": { "type": "STRING" },
                    "objectionsRaised": { "type": "ARRAY", "items": { "type": "STRING" } },
                    "keyInsights": { "type": "ARRAY", "items": { "type": "STRING" } },
                    "nextSteps": { "type": "ARRAY", "items": { "type": "STRING" } },
                    "followUpEmail": { "type": "STRING" },
                    "emailSubject": { "type": "STRING" }
                },
                "required": ["summary", "sentiment", "objectionsRaised", "keyInsights", "nextSteps", "followUpEmail", "emailSubject"]
            }
        }
    });

    let res = client.post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Gemini API error: {}", err_text));
    }

    let body: Value = res.json().await.map_err(|e| format!("Failed to parse response JSON: {}", e))?;
    
    let text = body["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("{}");

    let result: Value = serde_json::from_str(text).map_err(|e| format!("Failed to parse analysis: {}", e))?;
    Ok(result)
}
