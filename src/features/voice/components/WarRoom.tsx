import React, { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, PhoneOff, Activity, Bot, User, Smartphone, Timer, Lightbulb, TrendingUp } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { Lead, ICP } from "../../../types";
import { AIPersona, DEFAULT_PERSONA } from "../../../types/persona";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface WarRoomProps {
  lead: Lead;
  icp: ICP | null;
  onClose: (transcript?: any[], durationSeconds?: number) => void;
}

interface TranscriptEntry {
  id: string;
  role: "user" | "model";
  text: string;
}

export function WarRoom({ lead, icp, onClose }: WarRoomProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [usePhoneLink, setUsePhoneLink] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio playback queue
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const nextPlayTimeRef = useRef(0);

  useEffect(() => {
    startCall();
    return () => {
      endCall();
    };
  }, []);

  // Live Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Coaching hints engine
  const getCoachingHints = (): string[] => {
    const savedPersonaStr = localStorage.getItem("ai_persona");
    const persona = savedPersonaStr ? JSON.parse(savedPersonaStr) as AIPersona : DEFAULT_PERSONA;
    const hints: string[] = [];
    const msgCount = transcript.length;
    const userMsgs = transcript.filter(t => t.role === 'user').length;
    const modelMsgs = transcript.filter(t => t.role === 'model').length;

    if (msgCount === 0) {
      hints.push("🎯 Opening: Build rapport fast. Mirror their energy.");
    } else if (msgCount < 4) {
      if (persona.framework === 'SPIN Selling') {
        hints.push("📋 SPIN Phase 1: Ask a Situation question about their current process.");
      } else if (persona.framework === 'Challenger Sale') {
        hints.push("💡 Challenger: Teach them something surprising about their industry.");
      } else if (persona.framework === 'Sandler System') {
        hints.push("🤝 Sandler: Establish an upfront contract — agree on the agenda.");
      } else {
        hints.push("⚡ Straight Line: Build certainty about yourself first.");
      }
    } else if (msgCount < 8) {
      if (persona.framework === 'SPIN Selling') {
        hints.push("🔍 SPIN Phase 2: Probe for Problems. What's not working?");
      } else if (persona.framework === 'Challenger Sale') {
        hints.push("🎯 Challenger: Reframe their perspective. Connect to their pain.");
      } else if (persona.framework === 'Sandler System') {
        hints.push("💰 Sandler: Qualify the budget before you pitch.");
      } else {
        hints.push("🚀 Straight Line: Build certainty about the product. Use proof.");
      }
    } else {
      hints.push("🏁 Close: Ask for the meeting. Be direct and confident.");
    }

    if (modelMsgs > userMsgs * 2 && msgCount > 3) {
      hints.push("⚠️ AI is talking too much. Encourage the prospect to speak.");
    }
    if (elapsedSeconds > 300) {
      hints.push("⏱️ 5+ min call. Push for a commitment or next step.");
    }

    return hints;
  };

  const getCallPhase = (): { label: string; color: string } => {
    const msgCount = transcript.length;
    if (msgCount === 0) return { label: "Connecting", color: "text-yellow-400" };
    if (msgCount < 4) return { label: "Opening", color: "text-blue-400" };
    if (msgCount < 8) return { label: "Discovery", color: "text-purple-400" };
    if (msgCount < 12) return { label: "Pitch", color: "text-emerald-400" };
    return { label: "Close", color: "text-amber-400" };
  };

  const startCall = async () => {
    try {
      // Fetch selected devices from settings
      const preferredMicId = localStorage.getItem("preferredMicId");
      const preferredSpeakerId = localStorage.getItem("preferredSpeakerId");

      // Initialize Audio Context
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const ac = new AudioContextClass({ sampleRate: 16000 });
      
      // Apply speaker output (Virtual Audio Cable) if supported
      if (preferredSpeakerId && typeof (ac as any).setSinkId === "function") {
          try {
              await (ac as any).setSinkId(preferredSpeakerId);
          } catch (e) {
              console.warn("Browser or device does not support setting Sink ID:", e);
          }
      }
      audioContextRef.current = ac;

      // Get Microphone Access with specific Virtual Cable input if selected
      const audioConstraints: boolean | MediaTrackConstraints = preferredMicId 
          ? { deviceId: { exact: preferredMicId } } 
          : true;

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current,
      );

      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1,
      );

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Initialize Gemini Live API
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY is missing. Please ensure it is set in the environment.",
        );
      }
      const ai = new GoogleGenAI({ apiKey });

      // Fetch Persona Constraints
      const savedPersonaStr = localStorage.getItem("ai_persona");
      const persona: AIPersona = savedPersonaStr ? JSON.parse(savedPersonaStr) : DEFAULT_PERSONA;

      const systemInstructionBase = icp?.systemPrompt
        ? `You are calling ${lead.name} at ${lead.company}. ${icp.systemPrompt} `
        : `You are an AI Sales Development Representative calling ${lead.name} at ${lead.company}. Your goal is to qualify them and book a meeting.`;

      // HYPER-REALISM INJECTION
      const realismPrompt = `CRITICAL CONVERSATIONAL RULES: You are a human salesperson. You must sound completely natural. Use conversational fillers like 'um', 'ah', and 'you know' occasionally. Laugh slightly if appropriate. Vary your speaking pace. Ask open-ended questions and actually listen. Do not sound like a robot reading a script.`;
      
      // SALES FRAMEWORK INJECTION
      const frameworkPrompt = `SALES METHODOLOGY (${persona.framework}): ` + 
        (persona.framework === "SPIN Selling" ? "Focus purely on Situation, Problem, Implication, and Need-Payoff questions. Uncover the pain before pitching." :
         persona.framework === "Challenger Sale" ? "Take control of the conversation. Challenge the prospect's assumptions. Teach them something new about their business." :
         persona.framework === "Sandler System" ? "Focus on mutual qualification. Uncover pain, budget, and decision-making process before ever presenting a solution. Be willing to walk away." :
         "Maintain high energy. Maintain control. Move the prospect directly in a straight line toward the close.");

      // EMOTIONAL MODULATION INJECTION
      const emotionPrompt = `BEHAVIORAL MODIFIERS: 
      - Empathy Level (${persona.emotionalModulation.empathy}/100): ${persona.emotionalModulation.empathy > 70 ? "Listen deeply, show extreme understanding of their pain." : "Be assertive and push past objections quickly."}
      - Energy Level (${persona.emotionalModulation.energy}/100): ${persona.emotionalModulation.energy > 70 ? "Speak with high urgency, enthusiasm, and octane." : "Speak calmly, methodically, and relaxed."}
      - Formality (${persona.emotionalModulation.formality}/100): ${persona.emotionalModulation.formality > 70 ? "Use highly professional corporate language. No slang." : "Speak casually, like you're talking to a friend at a highly relatable level."}
      - Primary Language: ${persona.language}`;

      // ANTI-HALLUCINATION GUARDRAILS
      const antiHallucinationPrompt = `ABSOLUTE RULES - ZERO TOLERANCE FOR HALLUCINATION:
      1. You must NEVER fabricate statistics, percentages, case studies, customer names, or ROI figures.
      2. You must NEVER claim your product does something that was not explicitly stated in the ICP data.
      3. If the prospect asks a question you don't have the answer to, say: "That's a great question. I want to make sure I give you the most accurate answer, so let me have our team follow up with the exact details."
      4. NEVER make up competitor comparisons or benchmarks.
      5. Stick ONLY to the value proposition, pain points, and objections provided in your training data below.`;

      // ICP CONTEXT INJECTION (enriched)
      const icpContextPrompt = icp ? `GROUNDED ICP INTELLIGENCE:
      - Industry: ${icp.industry || "Not specified"}
      - Company Size Target: ${icp.companySize || "Not specified"}
      - Decision Makers: ${icp.decisionMakerTitles?.join(", ") || "Not specified"}
      - Pain Points: ${icp.painPoints?.join(" | ") || "Not specified"}
      - Known Objections: ${icp.objections?.join(" | ") || "Not specified"}
      - Competitors: ${icp.competitorNames?.join(", ") || "Not specified"}
      - Value Proposition: ${icp.valueProposition || "Not specified"}` : "";

      const finalSystemInstruction = `${systemInstructionBase}\n\n${realismPrompt}\n\n${frameworkPrompt}\n\n${emotionPrompt}\n\n${antiHallucinationPrompt}\n\n${icpContextPrompt}`;

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voiceId } },
          },
          systemInstruction: finalSystemInstruction,
          // @ts-ignore
          inputAudioTranscription: { model: "gemini-2.5-flash" },
          // @ts-ignore
          outputAudioTranscription: { model: "gemini-2.5-flash" },
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            startTimeRef.current = Date.now();

            // Trigger System Dialer if enabled
            if (usePhoneLink) {
              const formattedPhone = lead.phone.replace(/[^0-9+]/g, '');
              open(`tel:${formattedPhone}`).catch(e => {
                 console.error("Failed to open system dialer:", e);
                 // Fallback gently, Windows Phone Link might not be setup but AI still runs
              });
            }

            // Start processing audio
            processorRef.current!.onaudioprocess = (e) => {
              if (isMuted) return;

              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }

              // Base64 encode
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = "";
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                });
              });
            };
          },
          onmessage: (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playAudio(base64Audio);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
            }

            // Handle Transcriptions
            const textPart = message.serverContent?.modelTurn?.parts?.find(
              (p) => p.text,
            )?.text;
            if (textPart) {
              setTranscript((prev) => [
                ...prev,
                { id: Date.now().toString(), role: "model", text: textPart },
              ]);
            }
          },
          onclose: () => {
            setIsConnected(false);
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Connection error. Please try again.");
          },
        },
      });

      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error("Failed to start call:", err);
      setError(err.message || "Failed to access microphone or connect to AI.");
    }
  };

  const playAudio = (base64Audio: string) => {
    if (!audioContextRef.current) return;

    // Decode base64 to Int16Array
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);

    // Convert Int16 to Float32
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
    }

    playbackQueueRef.current.push(float32Array);
    scheduleNextBuffer();
  };

  const scheduleNextBuffer = () => {
    if (!audioContextRef.current || playbackQueueRef.current.length === 0)
      return;

    const currentTime = audioContextRef.current.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    while (playbackQueueRef.current.length > 0) {
      const bufferData = playbackQueueRef.current.shift()!;
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        bufferData.length,
        24000,
      ); // Output sample rate is 24000
      audioBuffer.getChannelData(0).set(bufferData);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(nextPlayTimeRef.current);

      nextPlayTimeRef.current += audioBuffer.duration;
    }
  };

  const endCall = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    if (sessionRef.current) {
      sessionRef.current
        .then((session: any) => {
          if (session && typeof session.close === "function") {
            session.close();
          }
        })
        .catch(console.error);
    }
    
    // Calculate Duration and determine status
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTimeRef.current) / 1000);
    
    // Simple heuristic for demo: If transcript has > 3 user messages, call it a 'Success'. 
    // If only 1 or 2 messages, 'Rejected'. If very short and AI spoke mostly, 'Voicemail'.
    let status = "Rejected";
    const userMessages = transcript.filter(t => t.role === "user").length;
    if (userMessages >= 3) status = "Success";
    else if (durationSeconds < 15) status = "Voicemail";
    
    // Save to DB
    const callLogId = `call_${Date.now()}`;
    invoke('add_call_log', {
      id: callLogId,
      leadId: lead.id,
      durationSeconds,
      transcript: JSON.stringify(transcript),
      status
    }).catch(e => console.error("Failed to save call log:", e));

    setIsConnected(false);
    onClose(transcript, durationSeconds);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 relative">
              <Activity className="w-6 h-6 text-red-400" />
              {isConnected && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                War Room: Active Call
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Dialing {lead.name} at {lead.company}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Live Timer */}
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
              <Timer className="w-4 h-4 text-red-400" />
              <span className="font-mono text-red-400 text-sm font-bold tabular-nums">{formatTimer(elapsedSeconds)}</span>
            </div>
            {/* Call Phase */}
            <div className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 ${getCallPhase().color}`}>
              {getCallPhase().label}
            </div>
            <button
              onClick={endCall}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Transcript */}
          <div className="flex-1 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
            <div className="p-4 border-b border-white/5 text-xs font-mono text-gray-500 uppercase tracking-wider">
              Live Transcript
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error ? (
                <div className="text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                  {error}
                </div>
              ) : transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
                  <Activity className="w-8 h-8 animate-pulse" />
                  <p className="text-sm">Connecting to AI Voice Agent...</p>
                </div>
              ) : (
                transcript.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex gap - 3 ${entry.role === "user" ? "flex-row-reverse" : ""} `}
                  >
                    <div
                      className={`w - 8 h - 8 rounded - full flex items - center justify - center shrink - 0 ${entry.role === "user"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-emerald-500/20 text-emerald-400"
                        } `}
                    >
                      {entry.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`max - w - [80 %] rounded - 2xl px - 4 py - 2.5 text - sm ${entry.role === "user"
                          ? "bg-blue-600/20 text-blue-50"
                          : "bg-[#1a1a1a] text-gray-200"
                        } `}
                    >
                      {entry.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Context & Controls */}
          <div className="w-80 bg-[#111] flex flex-col">
            <div className="p-4 border-b border-white/5 text-xs font-mono text-gray-500 uppercase tracking-wider">
              Agent Context
            </div>
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="space-y-5">
                {/* Live Coaching */}
                <div>
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-amber-400" /> Live Coaching
                  </div>
                  <div className="space-y-2">
                    {getCoachingHints().map((hint, i) => (
                      <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2.5 text-xs text-amber-200 leading-relaxed">
                        {hint}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call Stats */}
                <div>
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-emerald-400" /> Live Stats
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#1a1a1a] rounded-lg p-2.5 border border-white/5 text-center">
                      <div className="text-lg font-bold text-white tabular-nums">{transcript.filter(t => t.role === 'model').length}</div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500">AI Turns</div>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-lg p-2.5 border border-white/5 text-center">
                      <div className="text-lg font-bold text-white tabular-nums">{transcript.filter(t => t.role === 'user').length}</div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500">Prospect Turns</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Lead Info</div>
                  <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-sm text-gray-300">
                    <div className="font-medium text-white">{lead.name}</div>
                    <div>{lead.company}</div>
                    <div className="font-mono text-emerald-400 mt-1">
                      {lead.phone}
                    </div>
                  </div>
                </div>

                {icp && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Active Processing Modifiers
                    </div>
                    <div className="bg-black p-3 rounded-xl border border-white/5 text-xs font-mono text-purple-400 h-48 overflow-y-auto space-y-4">
                      <div>
                        <span className="text-gray-500 block mb-1">--- SYSTEM PROMPT ---</span>
                        <span className="text-emerald-500/80">{icp.systemPrompt}</span>
                      </div>
                      
                      {(() => {
                        const currentPersonaStr = localStorage.getItem("ai_persona");
                        const currentPersona = currentPersonaStr ? JSON.parse(currentPersonaStr) as AIPersona : DEFAULT_PERSONA;
                        return (
                          <div>
                            <span className="text-gray-500 block mb-1">--- BEHAVIORAL INJECTION ---</span>
                            <div className="text-purple-400">
                               <div>Voice: {currentPersona.voiceId} | Lang: {currentPersona.language}</div>
                               <div>Protocol: {currentPersona.framework}</div>
                               <div>EMP:{currentPersona.emotionalModulation.empathy} | ENG:{currentPersona.emotionalModulation.energy} | FRM:{currentPersona.emotionalModulation.formality}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Call Controls */}
            <div className="p-6 border-t border-white/10 bg-[#1a1a1a] flex flex-col gap-4">
              <button
                onClick={() => setUsePhoneLink(!usePhoneLink)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  usePhoneLink 
                   ? "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20" 
                   : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                }`}
                title="If enabled, this will securely prompt your connected mobile device (via Windows Phone Link or Mac Continuity) to officially dial the number."
              >
                <Smartphone className="w-4 h-4" />
                {usePhoneLink ? "Phone Link Active" : "Use Phone Link"}
              </button>

              <div className="flex justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isMuted
                      ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button
                  onClick={endCall}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-red-900/20"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
