import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Mic, MicOff, PhoneOff, Activity, Bot, User, Timer,
  Lightbulb, TrendingUp, Brain, AlertTriangle, ChevronRight,
  Smartphone, Zap
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { Lead, ICP } from "../../../types";
import { AIPersona, DEFAULT_PERSONA } from "../../../types/persona";
import { createCallerEngine, CallerEngine, CallState, TranscriptLine } from "../lib/caller-engine";
import { analyzeEmotions, EmotionAxes, EmotionShift, buildEmotionSystemPrompt } from "../lib/emotion-engine";
import { detectObjectionInTranscript, ObjectionMatch } from "../lib/objection-engine";
import { VoiceVisualizer } from "./VoiceVisualizer";

interface WarRoomProps {
  lead: Lead;
  icp: ICP | null;
  onClose: (transcript?: TranscriptLine[], durationSeconds?: number) => void;
}

type SentimentLevel = "hostile" | "cold" | "skeptical" | "neutral" | "warming" | "buying";

const SENTIMENT_CONFIG: Record<SentimentLevel, { label: string; emoji: string; color: string; bg: string }> = {
  hostile:   { label: "Hostile",   emoji: "😤", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30" },
  cold:      { label: "Cold",      emoji: "❄️", color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30" },
  skeptical: { label: "Skeptical", emoji: "🤔", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  neutral:   { label: "Neutral",   emoji: "😐", color: "text-gray-400",   bg: "bg-white/5 border-white/10" },
  warming:   { label: "Warming",   emoji: "🙂", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  buying:    { label: "Buying",    emoji: "🔥", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
};

const SENTIMENT_ORDER: SentimentLevel[] = ["hostile", "cold", "skeptical", "neutral", "warming", "buying"];

function getSentimentFromMood(mood: string): SentimentLevel {
  const m = mood.toLowerCase();
  if (m.includes("hostile")) return "hostile";
  if (m.includes("frustrat")) return "cold";
  if (m.includes("disengag")) return "skeptical";
  if (m.includes("hesitant")) return "skeptical";
  if (m.includes("interested")) return "warming";
  if (m.includes("buying")) return "buying";
  return "neutral";
}

export function WarRoom({ lead, icp, onClose }: WarRoomProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [usePhoneLink, setUsePhoneLink] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Emotion & Sentiment
  const [currentAxes, setCurrentAxes] = useState<EmotionAxes | null>(null);
  const [recentShifts, setRecentShifts] = useState<EmotionShift[]>([]);
  const [sentiment, setSentiment] = useState<SentimentLevel>("cold");
  const [sentimentLabel, setSentimentLabel] = useState("Neutral");

  // Objection coaching
  const [activeObjection, setActiveObjection] = useState<ObjectionMatch | null>(null);
  const [objectionHistory, setObjectionHistory] = useState<ObjectionMatch[]>([]);

  // Audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  // Playback
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const nextPlayTimeRef = useRef(0);

  // Engine
  const engineRef = useRef<CallerEngine | null>(null);
  const isMutedRef = useRef(false);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const startTimeRef = useRef(Date.now());

  // Persona
  const persona: AIPersona = (() => {
    const s = localStorage.getItem("ai_persona");
    return s ? JSON.parse(s) : DEFAULT_PERSONA;
  })();

  useEffect(() => {
    // Init emotion axes from persona
    setCurrentAxes({
      empathy: persona.emotionalModulation.empathy,
      energy: persona.emotionalModulation.energy,
      formality: persona.emotionalModulation.formality,
      assertiveness: persona.emotionalModulation.assertiveness ?? 45,
      humor: persona.emotionalModulation.humor ?? 30,
    });
    startCall();
    return () => { 
      workletNodeRef.current?.disconnect();
      sourceRef.current?.disconnect();
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      if (audioContextRef.current?.state !== "closed") audioContextRef.current?.close();
      engineRef.current?.disconnect();
    };
  }, []);

  // Timer
  useEffect(() => {
    if (callState !== "active" && callState !== "objection_mode" && callState !== "closing") return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // Real-time emotion + objection analysis every 4 transcript entries
  useEffect(() => {
    if (transcript.length === 0 || transcript.length % 2 !== 0) return;

    // Emotion analysis
    const baseAxes: EmotionAxes = currentAxes || {
      empathy: persona.emotionalModulation.empathy,
      energy: persona.emotionalModulation.energy,
      formality: persona.emotionalModulation.formality,
      assertiveness: persona.emotionalModulation.assertiveness ?? 45,
      humor: persona.emotionalModulation.humor ?? 30,
    };
    
    const analysis = analyzeEmotions(transcript, baseAxes);
    if (persona.emotionalModulation.dynamicToneShift) {
      setCurrentAxes(analysis.axes);
      if (analysis.shifts.length > 0) {
        setRecentShifts(analysis.shifts.slice(-3));
      }
    }
    setSentiment(getSentimentFromMood(analysis.dominantMood));
    setSentimentLabel(analysis.dominantMood);

    // Objection detection
    const objection = detectObjectionInTranscript(transcript);
    if (objection && objection.archetype !== activeObjection?.archetype) {
      setActiveObjection(objection);
      setObjectionHistory(prev => [objection, ...prev.slice(0, 4)]);
      setCallState("objection_mode");
      // Auto-clear after 20s
      setTimeout(() => {
        setActiveObjection(null);
        setCallState(prev => prev === "objection_mode" ? "active" : prev);
      }, 20000);
    }
  }, [transcript.length]);

  const buildSystemPrompt = (): string => {
    const persona: AIPersona = (() => {
      const s = localStorage.getItem("ai_persona");
      return s ? JSON.parse(s) : DEFAULT_PERSONA;
    })();

    const axes: EmotionAxes = currentAxes || {
      empathy: persona.emotionalModulation.empathy,
      energy: persona.emotionalModulation.energy,
      formality: persona.emotionalModulation.formality,
      assertiveness: persona.emotionalModulation.assertiveness ?? 45,
      humor: persona.emotionalModulation.humor ?? 30,
    };

    const baseInstruction = icp?.systemPrompt
      ? `You are calling ${lead.name} at ${lead.company}. ${icp.systemPrompt}`
      : `You are an elite AI Sales Development Representative calling ${lead.name} at ${lead.company}. Your goal is to qualify them and book a meeting.`;

    const frameworkPrompt = `SALES FRAMEWORK (${persona.framework}): ${
      persona.framework === "SPIN Selling"
        ? "Use Situation → Problem → Implication → Need-Payoff questions in sequence. Uncover the pain deeply before you mention your solution."
        : persona.framework === "Challenger Sale"
        ? "Teach them something counterintuitive about their industry first. Challenge their assumptions. Reframe the problem before presenting your solution."
        : persona.framework === "Sandler System"
        ? "Establish an upfront contract. Qualify pain, budget, and decision process BEFORE presenting anything. Be willing to walk away."
        : "Maintain momentum. Maintain certainty in yourself, your product, and the process. Move in a straight line toward yes or no. Never loop."
    }`;

    const emotionPrompt = buildEmotionSystemPrompt(axes, persona.speechPatterns);

    const icpContext = icp ? `
=== ICP INTELLIGENCE (USE ONLY THIS — DO NOT FABRICATE) ===
Industry: ${icp.industry || "Not specified"}
Company Size Target: ${icp.companySize || "Not specified"}
Decision Maker Titles: ${icp.decisionMakerTitles?.join(", ") || "Not specified"}
Pain Points: ${icp.painPoints?.join(" | ") || "Not specified"}
Known Objections: ${icp.objections?.join(" | ") || "Not specified"}
Competitors: ${icp.competitorNames?.join(", ") || "Not specified"}
Value Proposition: ${icp.valueProposition || "Not specified"}` : "";

    const antiHallucination = `
=== ABSOLUTE RULES (ZERO TOLERANCE) ===
1. NEVER fabricate statistics, percentages, ROI figures, case studies, or customer names.
2. NEVER claim the product does something not stated in your ICP intelligence above.
3. If asked something you don't know: "Great question — I want to get you the exact answer. Let me have our team follow up with specifics."
4. NEVER make up competitor comparisons.
5. Sound HUMAN. Not robotic. Not scripted. Natural.`;

    return `${baseInstruction}\n\n${frameworkPrompt}\n\n${emotionPrompt}\n\n${icpContext}\n\n${antiHallucination}`;
  };

  const startCall = async () => {
    try {
      const preferredMicId = localStorage.getItem("preferredMicId");
      const preferredSpeakerId = localStorage.getItem("preferredSpeakerId");
      const personaData: AIPersona = (() => {
        const s = localStorage.getItem("ai_persona");
        return s ? JSON.parse(s) : DEFAULT_PERSONA;
      })();

      // ── Audio Context ──────────────────────────────────────
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ac = new AudioContextClass({ sampleRate: 16000 });
      if (preferredSpeakerId && typeof (ac as any).setSinkId === "function") {
        try { await (ac as any).setSinkId(preferredSpeakerId); } catch (_) {}
      }
      audioContextRef.current = ac;

      // ── AudioWorklet ───────────────────────────────────────
      try {
        await ac.audioWorklet.addModule("/audio-processor.worklet.js");
      } catch (e) {
        console.warn("AudioWorklet load failed, falling back:", e);
      }

      // ── Microphone ─────────────────────────────────────────
      try {
        const audioConstraints: boolean | MediaTrackConstraints = preferredMicId
          ? { deviceId: { exact: preferredMicId } } : true;
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        sourceRef.current = ac.createMediaStreamSource(mediaStreamRef.current);

        // ── Analyser for visualizer ────────────────────────────
        const analyser = ac.createAnalyser();
        analyser.fftSize = 128;
        sourceRef.current.connect(analyser);
        analyserRef.current = analyser;
      } catch (err) {
        console.warn("No active microphone found, proceeding in text-only/simulation mode.");
      }

      const hasAnyKey = localStorage.getItem("gemini_api_key") || localStorage.getItem("openai_api_key") || localStorage.getItem("elevenlabs_api_key");
      
      if (!hasAnyKey || hasAnyKey === "MY_GEMINI_API_KEY") {
        // ── DEMO/NATIVE SIMULATION ─────────────────────────────
        setCallState("connecting");
        
        setTimeout(() => {
          setCallState("active");
          startTimeRef.current = Date.now();
          
          const script = [
            { text: `Hello? Who is this?`, role: "user", delay: 2000 },
            { text: `Hi ${lead.name}, this is the OpenCloser AI calling. I'm reaching out because I noticed ${lead.company} is scaling outbound, how are you doing today?`, role: "model", delay: 5000 },
            { text: `I'm incredibly busy right now. Is this a sales call? What is this about?`, role: "user", delay: 12000 },
            { text: `I completely understand. I'll be brief—we help companies like ${lead.company} scale their outbound using completely autonomous Voice AI. Is that something you'd be open to exploring?`, role: "model", delay: 18000 },
            { text: `We already have an SDR team. We don't need AI bots calling our clients.`, role: "user", delay: 26000 },
            { text: `That's exactly why I called. Our AI doesn't replace them—it handles the first 1,000 cold calls so your team only speaks to qualified buyers. If I could show you how we double live-connect rates in 10 minutes, would you be open to a quick demo next Tuesday?`, role: "model", delay: 31000 },
            { text: `Hmm. I guess I could see how that works. Send me a calendar invite and we'll talk.`, role: "user", delay: 40000 },
            { text: `Excellent. I will send that over to your email right now. Thanks for your time, and have a prosperous day!`, role: "model", delay: 45000 },
          ];

          script.forEach((line) => {
            setTimeout(() => {
               const newLine: TranscriptLine = { 
                 id: `msg_${Date.now()}_${Math.random()}`, 
                 role: line.role as any, 
                 text: line.text,
                 timestamp: Date.now()
               };
               setTranscript(prev => {
                  const next = [...prev, newLine];
                  transcriptRef.current = next;
                  return next;
               });
               
               // End call 3 seconds after the last message
               if (line === script[script.length - 1]) {
                  setTimeout(() => endCall(), 3000);
               }
            }, line.delay);
          });
        }, 1500);

        return; // Bail out from real engine connection
      }

      // ── CallerEngine ───────────────────────────────────────
      const provider = personaData.provider || "gemini";
      const engine = createCallerEngine(provider, {
        onState: (state) => {
          setCallState(state);
          if (state === "active") {
            startTimeRef.current = Date.now();
            if (usePhoneLink) {
              const phone = lead.phone.replace(/[^0-9+]/g, "");
              open(`tel:${phone}`).catch(() => {});
            }
          }
        },
        onAudio: (b64, sampleRate) => playAudio(b64, sampleRate),
        onTranscript: (line) => {
          setTranscript(prev => {
            const next = [...prev, line];
            transcriptRef.current = next;
            return next;
          });
        },
        onInterrupted: () => {
          playbackQueueRef.current = [];
        },
        onError: (err) => setError(err.message),
      });

      engineRef.current = engine;
      const systemPrompt = buildSystemPrompt();
      await engine.connect(systemPrompt, personaData.voiceId, personaData.language);

      // ── Wire AudioWorklet → Engine ─────────────────────────
      try {
        const worklet = new AudioWorkletNode(ac, "pcm-capture-processor");
        worklet.port.onmessage = (e) => {
          if (e.data.type === "audio" && !isMutedRef.current) {
            engine.sendAudio(e.data.buffer);
          }
        };
        sourceRef.current.connect(worklet);
        workletNodeRef.current = worklet;
      } catch (e) {
        // Fallback: ScriptProcessorNode if AudioWorklet not supported
        console.warn("Falling back to ScriptProcessorNode:", e);
        const processor = ac.createScriptProcessor(2048, 1, 1);
        processor.onaudioprocess = (ev) => {
          if (isMutedRef.current) return;
          engine.sendAudio(ev.inputBuffer.getChannelData(0).slice());
        };
        sourceRef.current.connect(processor);
        processor.connect(ac.destination);
      }

    } catch (err: any) {
      console.error("Failed to start call:", err);
      setError(err.message || "Failed to access microphone or connect to AI.");
    }
  };

  const playAudio = (b64: string, sampleRate: number = 24000) => {
    if (!audioContextRef.current) return;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }
    playbackQueueRef.current.push(float32);
    scheduleBuffer(sampleRate);
  };

  const scheduleBuffer = (sampleRate = 24000) => {
    const ac = audioContextRef.current;
    if (!ac || playbackQueueRef.current.length === 0) return;
    const now = ac.currentTime;
    if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now;
    while (playbackQueueRef.current.length > 0) {
      const data = playbackQueueRef.current.shift()!;
      const buf = ac.createBuffer(1, data.length, sampleRate);
      buf.getChannelData(0).set(data);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += buf.duration;
    }
  };

  const endCall = useCallback(() => {
    workletNodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    if (audioContextRef.current?.state !== "closed") audioContextRef.current?.close();
    engineRef.current?.disconnect();

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const t = transcriptRef.current;
    const userMessages = t.filter(e => e.role === "user").length;

    let status = "Rejected";
    if (userMessages >= 3) status = "Success";
    else if (durationSeconds < 15) status = "Voicemail";

    const callLogId = `call_${Date.now()}`;
    invoke("add_call_log", {
      id: callLogId, leadId: lead.id, durationSeconds,
      transcript: JSON.stringify(t), status,
    }).catch(console.error);

    onClose(t, durationSeconds);
  }, [lead.id, onClose]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    isMutedRef.current = next;
    workletNodeRef.current?.port.postMessage({ type: "setMuted", muted: next });
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getCallPhase = () => {
    if (callState === "objection_mode") return { label: "⚡ Objection", color: "text-orange-400" };
    if (callState === "closing") return { label: "🏁 Closing", color: "text-amber-400" };
    const n = transcript.length;
    if (n === 0) return { label: "Connecting", color: "text-yellow-400" };
    if (n < 4) return { label: "Opening", color: "text-blue-400" };
    if (n < 8) return { label: "Discovery", color: "text-purple-400" };
    if (n < 12) return { label: "Pitch", color: "text-emerald-400" };
    return { label: "🏁 Close", color: "text-amber-400" };
  };

  const getCoachingHints = (): string[] => {
    const hints: string[] = [];
    const n = transcript.length;
    const userMsgs = transcript.filter(t => t.role === "user").length;
    const aiMsgs = transcript.filter(t => t.role === "model").length;
    const personaLocal: AIPersona = (() => {
      const s = localStorage.getItem("ai_persona");
      return s ? JSON.parse(s) : DEFAULT_PERSONA;
    })();

    if (n === 0) { hints.push("🎯 Opening: Build rapport fast. Mirror their energy."); return hints; }

    const fw = personaLocal.framework;
    if (n < 4) {
      if (fw === "SPIN Selling") hints.push("📋 SPIN Situation: Ask about their current process. 'Walk me through how you currently handle X?'");
      else if (fw === "Challenger Sale") hints.push("💡 Challenger: Lead with an insight. Teach them something they don't know about their industry.");
      else if (fw === "Sandler System") hints.push("🤝 Sandler: Set an upfront contract. Agree on what happens at the end of this call.");
      else hints.push("⚡ Straight Line: Build certainty in yourself. Be warm, bold, and confident from the first line.");
    } else if (n < 8) {
      if (fw === "SPIN Selling") hints.push("🔍 SPIN Problem: Probe for pain. 'What's the biggest challenge you have with X right now?'");
      else if (fw === "Challenger Sale") hints.push("🎯 Challenger: Reframe. Connect your insight to their specific pain.");
      else if (fw === "Sandler System") hints.push("💰 Sandler: Qualify budget. 'If we solved this, do you have budget set aside to move on this?'");
      else hints.push("🚀 Straight Line: Build certainty in the product. Use vivid, outcome-focused language.");
    } else if (n < 12) {
      if (fw === "SPIN Selling") hints.push("📈 SPIN Implication: Amplify the pain. 'If this doesn't change, what does that mean for the business in 12 months?'");
      else hints.push("🎁 Present the solution. Tie every feature back to the pain they told you about.");
    } else {
      hints.push("🏁 Close Time: Ask for the meeting. 'Does what we've covered make sense to take to the next step?'");
    }

    if (aiMsgs > userMsgs * 2 && n > 3) hints.push("⚠️ AI is talking too much. Ask a question and actually listen.");
    if (elapsedSeconds > 300) hints.push("⏱️ 5+ min call. Pivot to the close. Don't let it drift.");

    return hints;
  };

  const sentimentInfo = SENTIMENT_CONFIG[sentiment];
  const isCallLive = callState === "active" || callState === "objection_mode" || callState === "closing";

  return (
    <div className="warroom-dark fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Ambient glow */}
      <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[180px] pointer-events-none transition-colors duration-3000 ${
        isCallLive ? "bg-red-500/8" : "bg-indigo-500/5"
      }`}></div>

      <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-[20px] w-full max-w-[1100px] h-[90vh] flex flex-col overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)] relative z-10 animate-scale-in">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-white/[0.06] bg-gradient-to-r from-[#111] to-[#0d0d0d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                isCallLive
                  ? "bg-red-500/15 border-red-500/30 animate-pulse-glow"
                  : "bg-white/5 border-white/10"
              }`}>
                <Activity className="w-5 h-5 text-red-400" />
              </div>
              {isCallLive && (
                <>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                </>
              )}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-white tracking-tight flex items-center gap-2">
                War Room
                <span className="text-[9px] font-mono bg-white/[0.06] text-gray-400 px-2 py-0.5 rounded-md border border-white/[0.05] uppercase tracking-widest">
                  AI Caller
                </span>
              </h2>
              <p className="text-gray-500 text-[12px] mt-0.5 font-medium">
                {callState === "connecting" ? "Establishing secure connection..." :
                 callState === "active" ? `Live · ${lead.name} at ${lead.company}` :
                 callState === "objection_mode" ? `⚡ Objection Active — ${lead.name}` :
                 callState === "ended" ? "Call ended" : `Dialing ${lead.name}...`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sentiment Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all duration-500 ${sentimentInfo.bg} ${sentimentInfo.color}`}>
              <span className="text-sm">{sentimentInfo.emoji}</span>
              <span>{sentimentInfo.label}</span>
            </div>
            {/* Timer */}
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${
              isCallLive ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10"
            }`}>
              <Timer className={`w-3.5 h-3.5 ${isCallLive ? "text-red-400" : "text-gray-500"}`} />
              <span className={`font-mono text-[12px] font-bold tabular-nums ${isCallLive ? "text-red-400" : "text-gray-500"}`}>
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
            {/* Phase */}
            <div className={`text-[10px] font-mono uppercase tracking-wider px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] font-bold ${getCallPhase().color}`}>
              {getCallPhase().label}
            </div>
            <button onClick={endCall} className="p-2 hover:bg-white/[0.06] rounded-xl transition-all btn-press">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: Transcript ── */}
          <div className="flex-1 flex flex-col border-r border-white/[0.06] bg-[#070707]">
            {/* Speaker Avatars */}
            <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-around bg-gradient-to-b from-[#0d0d0d] to-[#080808]">
              <div className="flex flex-col items-center gap-2.5">
                <div className="relative">
                  {isCallLive && <div className="absolute -inset-2 bg-indigo-500/20 rounded-full animate-breathe"></div>}
                  <VoiceVisualizer
                    isActive={isCallLive}
                    audioContext={audioContextRef.current}
                    analyser={outputAnalyserRef.current}
                    role="agent"
                    size={72}
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.15em] font-bold">AI Agent</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                {/* Connection status indicator */}
                <div className="flex items-center gap-1.5">
                  {isCallLive && (
                    <>
                      <div className="w-1 h-3 bg-indigo-500/60 rounded-full animate-waveform" style={{ animationDelay: "0s" }}></div>
                      <div className="w-1 h-4 bg-white/30 rounded-full animate-waveform" style={{ animationDelay: "0.15s" }}></div>
                      <div className="w-1 h-2 bg-emerald-500/60 rounded-full animate-waveform" style={{ animationDelay: "0.3s" }}></div>
                    </>
                  )}
                </div>
                <div className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all duration-500 font-bold ${
                  sentiment === "buying" ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" :
                  sentiment === "warming" ? "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20" :
                  sentiment === "hostile" || sentiment === "cold" ? "text-red-400 bg-red-500/10 border border-red-500/20" :
                  "text-gray-500 bg-white/[0.04] border border-white/[0.06]"
                }`}>{sentiment === "buying" ? "INTERESTED" : sentiment === "warming" ? "ENGAGED" : sentiment === "hostile" ? "HOSTILE" : "MONITORING"}</div>
              </div>
              <div className="flex flex-col items-center gap-2.5">
                <div className="relative">
                  {isCallLive && <div className="absolute -inset-2 bg-emerald-500/20 rounded-full animate-breathe" style={{ animationDelay: "0.5s" }}></div>}
                  <VoiceVisualizer
                    isActive={isCallLive}
                    audioContext={audioContextRef.current}
                    analyser={analyserRef.current}
                    role="prospect"
                    size={72}
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.15em] font-bold">Prospect</span>
              </div>
            </div>

            {/* Transcript Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar scroll-smooth">
              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 p-4 rounded-2xl border border-red-500/20 animate-fade-in flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {!error && transcript.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                  <div className="relative">
                    <div className="absolute -inset-3 bg-indigo-500/15 rounded-full animate-breathe"></div>
                    <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative z-10">
                      <Activity className="w-6 h-6 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-gray-400">
                      {callState === "connecting" ? "Establishing AI connection..." : "Waiting for audio stream..."}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-1 font-mono">Initializing neural pipeline</p>
                  </div>
                </div>
              )}
              {transcript.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex gap-3 animate-transcript-bubble ${entry.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    entry.role === "user"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {entry.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                    entry.role === "user"
                      ? "bg-emerald-600/12 text-emerald-50 border border-emerald-500/10"
                      : "bg-[#151515] text-gray-200 border border-white/[0.05]"
                  }`}>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Talk ratio bar */}
            {transcript.length > 0 && (() => {
              const ai = transcript.filter(t => t.role === "model").length;
              const pr = transcript.filter(t => t.role === "user").length;
              const total = ai + pr;
              const aiPct = total > 0 ? Math.round((ai / total) * 100) : 50;
              return (
                <div className="px-6 py-3.5 border-t border-white/[0.04] bg-[#0a0a0a]">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2 font-mono uppercase tracking-[0.15em]">
                    <span className="font-bold">Talk Ratio</span>
                    <span className={`ml-auto font-semibold ${aiPct > 65 ? "text-orange-400" : "text-gray-500"}`}>
                      {aiPct > 65 ? "⚠️ AI over-talking" : "✓ balanced"}
                    </span>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 bar-transition rounded-l-full" style={{ width: `${aiPct}%` }} />
                      <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 flex-1 rounded-r-full" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1.5 font-mono font-bold">
                    <span className="text-indigo-400/70">AI {aiPct}%</span>
                    <span className="text-emerald-400/70">Prospect {100 - aiPct}%</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Right: Intel Panel ── */}
          <div className="w-[320px] bg-[#0a0a0a] flex flex-col overflow-y-auto custom-scrollbar">

            {/* Sentiment Arc */}
            <div className="p-5 border-b border-white/[0.06]">
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.15em] mb-3.5 font-bold">Prospect Sentiment</div>
              <div className="flex items-center justify-between gap-1.5">
                {SENTIMENT_ORDER.map((s) => {
                  const cfg = SENTIMENT_CONFIG[s];
                  const isActive = s === sentiment;
                  return (
                    <div key={s} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className={`text-base transition-all duration-700 ${isActive ? "scale-[1.3]" : "opacity-25 scale-90"}`}>
                        {cfg.emoji}
                      </span>
                      <div className={`h-1.5 w-full rounded-full transition-all duration-700 ${
                        isActive ? "bg-gradient-to-r from-white/60 to-white shadow-[0_0_8px_rgba(255,255,255,0.2)]" : "bg-white/[0.06]"
                      }`} />
                    </div>
                  );
                })}
              </div>
              <p className={`text-[11px] mt-2.5 font-bold ${sentimentInfo.color}`}>{sentimentLabel}</p>
            </div>

            {/* Objection Alert */}
            {activeObjection && (
              <div className="mx-4 mt-4 p-4 bg-orange-500/8 border border-orange-500/25 rounded-2xl shrink-0 animate-objection-slide">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                    {activeObjection.emoji} {activeObjection.label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mb-3 font-mono bg-black/30 rounded-xl p-3 leading-relaxed border border-white/[0.03]">
                  "{activeObjection.counterScript.substring(0, 140)}..."
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-orange-400/60 font-mono font-bold">{activeObjection.framework}</span>
                  <button onClick={() => setActiveObjection(null)} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors btn-press">dismiss</button>
                </div>
              </div>
            )}

            {/* Live Coaching */}
            <div className="p-5 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2 mb-3 text-[10px] font-mono text-gray-500 uppercase tracking-[0.15em] font-bold">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                </div>
                Live Coaching
              </div>
              <div className="space-y-2">
                {getCoachingHints().map((hint, i) => (
                  <div key={i} className="bg-amber-500/[0.04] border border-amber-500/10 rounded-xl px-3 py-2.5 text-[11px] text-amber-200/90 leading-relaxed transition-all hover:bg-amber-500/[0.08] hover:border-amber-500/20">
                    {hint}
                  </div>
                ))}
              </div>
            </div>

            {/* Emotion Axes */}
            {currentAxes && (
              <div className="p-5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-mono text-gray-500 uppercase tracking-[0.15em] font-bold">
                  <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center">
                    <Brain className="w-3 h-3 text-purple-400" />
                  </div>
                  Emotion Matrix
                  {recentShifts.length > 0 && (
                    <span className="ml-auto text-purple-400 text-[9px] font-bold animate-pulse">● ADAPTING</span>
                  )}
                </div>
                <div className="space-y-2.5">
                  {([
                    { key: "empathy", label: "Empathy", gradient: "from-blue-500 to-blue-400" },
                    { key: "energy", label: "Energy", gradient: "from-amber-500 to-amber-400" },
                    { key: "assertiveness", label: "Assert.", gradient: "from-red-500 to-red-400" },
                    { key: "humor", label: "Humor", gradient: "from-pink-500 to-pink-400" },
                    { key: "formality", label: "Formality", gradient: "from-purple-500 to-purple-400" },
                  ] as const).map(({ key, label, gradient }) => {
                    const val = currentAxes[key as keyof EmotionAxes] as number;
                    const shift = recentShifts.find(s => s.axis === key);
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-500 font-mono font-semibold">{label}</span>
                          <div className="flex items-center gap-1.5">
                            {shift && (
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${shift.direction === "up" ? "text-emerald-400 bg-emerald-500/10" : "text-orange-400 bg-orange-500/10"}`}>
                                {shift.direction === "up" ? "↑" : "↓"}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-mono tabular-nums font-bold">{Math.round(val)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full bar-transition`}
                            style={{ width: `${val}%`, opacity: 0.8 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {recentShifts.length > 0 && (
                  <div className="mt-3 text-[10px] text-purple-400/60 font-mono italic">
                    {recentShifts[0].reason}
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="p-5 shrink-0">
              <div className="flex items-center gap-2 mb-3 text-[10px] font-mono text-gray-500 uppercase tracking-[0.15em] font-bold">
                <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                </div>
                Live Stats
              </div>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <div className="bg-[#111] rounded-xl p-3 border border-white/[0.05] text-center hover:border-white/[0.1] transition-all">
                  <div className="text-xl font-black text-white tabular-nums animate-count-up">{transcript.filter(t => t.role === "model").length}</div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-gray-500 font-bold mt-0.5">AI Turns</div>
                </div>
                <div className="bg-[#111] rounded-xl p-3 border border-white/[0.05] text-center hover:border-white/[0.1] transition-all">
                  <div className="text-xl font-black text-white tabular-nums animate-count-up">{transcript.filter(t => t.role === "user").length}</div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-gray-500 font-bold mt-0.5">Prospect</div>
                </div>
              </div>
              {objectionHistory.length > 0 && (
                <div className="text-[10px] text-gray-500 font-mono font-bold flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-orange-400" />
                  Objections Handled: {objectionHistory.length}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-auto p-5 border-t border-white/[0.06] bg-gradient-to-t from-[#111] to-[#0d0d0d] flex flex-col gap-3.5">
              <button
                onClick={() => setUsePhoneLink(!usePhoneLink)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-all btn-press border ${
                  usePhoneLink
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                    : "bg-white/[0.04] text-gray-500 border-white/[0.08]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                {usePhoneLink ? "Phone Link Active" : "Phone Link Off"}
              </button>
              <div className="flex justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all btn-press border ${
                    isMuted
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_16px_rgba(234,179,8,0.15)]"
                      : "bg-white/[0.06] text-white border-white/10 hover:bg-white/[0.1]"
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={endCall}
                  className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all btn-press shadow-[0_4px_24px_rgba(239,68,68,0.3)] hover:shadow-[0_8px_32px_rgba(239,68,68,0.4)]"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
