import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ICP } from "../../../types";
import {
  Swords,
  Mic,
  MicOff,
  Play,
  Square,
  Star,
  MessageCircle,
  ArrowRight,
  RotateCcw,
  Volume2,
  Shield,
} from "lucide-react";

interface ObjectionTrainerProps {
  icp: ICP | null;
}

interface TrainingMessage {
  id: string;
  role: "ai_prospect" | "user_rep";
  text: string;
}

interface ScoreResult {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  rebuttalTip: string;
}

export function ObjectionTrainer({ icp }: ObjectionTrainerProps) {
  const [mode, setMode] = useState<"setup" | "sparring" | "review">("setup");
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [selectedObjection, setSelectedObjection] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const icpObjections = icp?.objections || [
    "We already have a solution for that",
    "It's too expensive for our budget",
    "We need to think about it",
    "Send me an email instead",
    "We're not interested right now"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSparring = async () => {
    if (!selectedObjection) return;
    setMode("sparring");
    setMessages([]);
    setIsLoading(true);

    const difficultyInstruction = {
      easy: "Be somewhat receptive, raise the objection mildly, and be open to counter-arguments.",
      medium: "Be moderately resistant. Push back firmly but fairly. Give the rep a chance but make them work for it.",
      hard: "Be very resistant and aggressive. Interrupt, be dismissive, pile on multiple objections. Make this extremely challenging."
    };

    try {
      const result: any = await invoke("analyze_call_transcript", {
        transcript: JSON.stringify([]),
        leadName: "Training Prospect",
        leadCompany: "Simulated Corp",
        icp: JSON.stringify({
          ...icp,
          _trainingMode: true,
          _trainingPrompt: `You are NOT analyzing a transcript. Instead, you are ROLE-PLAYING as a tough prospect in a sales objection training exercise. 
          
The objection you must raise: "${selectedObjection}"
Difficulty: ${difficulty} — ${difficultyInstruction[difficulty]}
ICP Context: ${icp ? JSON.stringify(icp) : "Generic B2B prospect"}

Start by introducing yourself briefly as a skeptical prospect. Then raise the objection naturally. Keep responses short (1-3 sentences). Be realistic.

Return a JSON object with:
- summary: Your opening line as the prospect (raise the objection)
- sentiment: "${difficulty === "hard" ? "Negative" : difficulty === "medium" ? "Mixed" : "Neutral"}"
- objectionsRaised: ["${selectedObjection}"]
- keyInsights: ["Training mode active"]
- nextSteps: ["Respond to the objection"]
- followUpEmail: ""
- emailSubject: ""`
        }),
      });

      setMessages([{
        id: Date.now().toString(),
        role: "ai_prospect",
        text: result.summary || `Look, I'll be honest with you — ${selectedObjection.toLowerCase()}.`
      }]);
    } catch (err) {
      console.error("Failed to start training:", err);
      // Fallback
      setMessages([{
        id: Date.now().toString(),
        role: "ai_prospect",
        text: `Look, I appreciate the call, but honestly — ${selectedObjection.toLowerCase()}. Why should I change what we're doing?`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReply = async () => {
    if (!userInput.trim()) return;
    const userMsg: TrainingMessage = {
      id: Date.now().toString(),
      role: "user_rep",
      text: userInput.trim(),
    };
    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsLoading(true);

    // After 4+ exchanges, auto-review
    if (messages.length >= 5) {
      await generateScore([...messages, userMsg]);
      return;
    }

    try {
      const result: any = await invoke("analyze_call_transcript", {
        transcript: JSON.stringify([...messages, userMsg].map(m => ({
          role: m.role === "ai_prospect" ? "model" : "user",
          text: m.text,
        }))),
        leadName: "Training Prospect",
        leadCompany: "Simulated Corp",
        icp: JSON.stringify({
          ...icp,
          _trainingMode: true,
          _trainingPrompt: `Continue role-playing as the resistant prospect. The rep just said: "${userInput.trim()}"
          
Previous conversation: ${messages.map(m => `${m.role === "ai_prospect" ? "Prospect" : "Rep"}: ${m.text}`).join("\n")}

Stay in character. Push back with a follow-up objection or respond to their rebuttal. Keep responses short (1-3 sentences). Difficulty: ${difficulty}.

Return JSON with:
- summary: Your next line as the prospect
- sentiment: "Mixed"
- objectionsRaised: []
- keyInsights: []
- nextSteps: []
- followUpEmail: ""
- emailSubject: ""`
        }),
      });

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai_prospect",
        text: result.summary || "Hmm, I'm not fully convinced. Can you give me more specifics?"
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai_prospect",
        text: "I hear you, but I'm still not sure this is the right fit for us. What makes you different from everyone else?"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateScore = async (allMessages: TrainingMessage[]) => {
    try {
      const result: any = await invoke("analyze_call_transcript", {
        transcript: JSON.stringify(allMessages.map(m => ({
          role: m.role === "ai_prospect" ? "model" : "user",
          text: m.text,
        }))),
        leadName: "Training Review",
        leadCompany: "Score",
        icp: JSON.stringify({
          _trainingMode: true,
          _trainingPrompt: `You are a world-class sales coach. Score this objection handling practice session.

Objection: "${selectedObjection}"
Difficulty: ${difficulty}

Conversation:
${allMessages.map(m => `${m.role === "ai_prospect" ? "Prospect" : "Rep"}: ${m.text}`).join("\n")}

Return JSON with:
- summary: A score out of 100 as a number string, e.g., "78"
- sentiment: "Positive" if score >= 70, "Mixed" if 50-69, "Negative" if < 50
- objectionsRaised: Array of 2-3 things the rep did WELL (strengths)
- keyInsights: Array of 2-3 things the rep could IMPROVE
- nextSteps: ["One specific rebuttal tip for this objection"]
- followUpEmail: ""
- emailSubject: ""`
        }),
      });

      const score = parseInt(result.summary) || 65;
      setScoreResult({
        overallScore: Math.min(100, Math.max(0, score)),
        strengths: result.objectionsRaised || ["Good opening response"],
        improvements: result.keyInsights || ["Be more specific with data"],
        rebuttalTip: result.nextSteps?.[0] || "Try acknowledging the objection before rebutting."
      });
      setMode("review");
    } catch (err) {
      setScoreResult({
        overallScore: 70,
        strengths: ["Engaged with the prospect", "Stayed professional"],
        improvements: ["Use more specific data points", "Ask follow-up questions"],
        rebuttalTip: "Try the 'feel-felt-found' technique: 'I understand how you feel. Others have felt the same way. What they found was...'"
      });
      setMode("review");
    } finally {
      setIsLoading(false);
    }
  };

  const resetTraining = () => {
    setMode("setup");
    setMessages([]);
    setScoreResult(null);
    setUserInput("");
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-400" :
    score >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto py-6 px-4 lg:px-8 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center">
          <Swords className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Sales Coach</h1>
          <p className="text-gray-500 text-sm">Your personal trainer for handling tough objections before real calls.</p>
        </div>
      </div>

      {mode === "setup" && (
        <div className="space-y-6">
          {/* Select Objection */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
            <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Select an Objection to Practice
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {icpObjections.map((obj, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedObjection(obj)}
                  className={`text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                    selectedObjection === obj
                      ? "bg-red-500/10 text-red-300 border-red-500/30"
                      : "bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/15"
                  }`}
                >
                  ⚡ "{obj}"
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
            <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">
              Difficulty Level
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "easy", label: "Rookie", desc: "Receptive prospect", color: "emerald" },
                { key: "medium", label: "Pro", desc: "Firm pushback", color: "amber" },
                { key: "hard", label: "Elite", desc: "Aggressive resistance", color: "red" },
              ] as const).map(d => (
                <button
                  key={d.key}
                  onClick={() => setDifficulty(d.key)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    difficulty === d.key
                      ? `bg-${d.color}-500/10 border-${d.color}-500/30 text-${d.color}-400`
                      : "bg-[#1a1a1a] border-white/5 text-gray-500 hover:border-white/15"
                  }`}
                >
                  <div className="text-sm font-bold">{d.label}</div>
                  <div className="text-xs mt-1 opacity-70">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startSparring}
            disabled={!selectedObjection}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-900/20"
          >
            <Play className="w-5 h-5" /> Start Sparring Session
          </button>
        </div>
      )}

      {mode === "sparring" && (
        <div className="flex flex-col flex-1">
          {/* Objection Badge */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4 text-xs text-red-400 flex items-center gap-2">
            <Swords className="w-3 h-3" />
            <span className="font-medium">Active Objection:</span> "{selectedObjection}"
            <span className="ml-auto text-gray-500 font-mono">{Math.ceil(messages.length / 2)}/3 rounds</span>
          </div>

          {/* Chat */}
          <div className="flex-1 bg-[#111] border border-white/5 rounded-2xl p-5 overflow-y-auto mb-4 space-y-4 min-h-[300px]">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user_rep" ? "justify-end" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "ai_prospect" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                }`}>
                  {msg.role === "ai_prospect" ? <Volume2 className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "ai_prospect"
                    ? "bg-red-500/5 text-red-100 border border-red-500/10"
                    : "bg-blue-600/20 text-blue-100 border border-blue-500/20"
                }`}>
                  <div className="text-[10px] text-gray-600 mb-1">{msg.role === "ai_prospect" ? "PROSPECT" : "YOU"}</div>
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Volume2 className="w-3 h-3 text-red-400 animate-pulse" />
                </div>
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl px-4 py-3 text-sm text-gray-500 animate-pulse">
                  Prospect is responding...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder="Type your rebuttal..."
              className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
              disabled={isLoading}
            />
            <button
              onClick={sendReply}
              disabled={!userInput.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => generateScore(messages)}
              disabled={messages.length < 2 || isLoading}
              className="bg-amber-600/20 hover:bg-amber-600/30 disabled:bg-gray-800 disabled:text-gray-600 text-amber-400 px-4 py-3 rounded-xl border border-amber-500/20 transition-colors"
              title="End session and get score"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {mode === "review" && scoreResult && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-8 text-center">
            <div className={`text-7xl font-black tabular-nums ${scoreColor(scoreResult.overallScore)}`}>
              {scoreResult.overallScore}
            </div>
            <div className="text-gray-500 text-sm mt-2">Objection Handling Score</div>
            <div className="flex items-center justify-center gap-1 mt-3">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className={`w-5 h-5 ${n <= Math.ceil(scoreResult.overallScore / 20) ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
              ))}
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#111] border border-emerald-500/10 rounded-2xl p-5">
              <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3">✅ What You Did Well</h3>
              <ul className="space-y-2">
                {scoreResult.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-emerald-200 bg-emerald-500/5 rounded-xl px-4 py-2 border border-emerald-500/10">
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#111] border border-amber-500/10 rounded-2xl p-5">
              <h3 className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-3">🔧 Areas to Improve</h3>
              <ul className="space-y-2">
                {scoreResult.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-amber-200 bg-amber-500/5 rounded-xl px-4 py-2 border border-amber-500/10">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Coach's Tip */}
          <div className="bg-[#0a0a0a] border border-purple-500/20 rounded-2xl p-5">
            <h3 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MessageCircle className="w-3 h-3" /> Coach's Rebuttal Tip
            </h3>
            <p className="text-sm text-purple-200 leading-relaxed">{scoreResult.rebuttalTip}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetTraining}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-medium transition-colors border border-white/10"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
            <button
              onClick={() => {
                setSelectedObjection("");
                resetTraining();
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white py-3 rounded-xl font-medium transition-colors"
            >
              <Swords className="w-4 h-4" /> New Objection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
