import React, { useState } from "react";
import { Bot, SlidersHorizontal, Mic2, Languages, BookOpen, Save, Volume2, Activity, Zap, Shield, Play } from "lucide-react";
import { AIPersona, DEFAULT_PERSONA, AIVoiceId, SalesFramework } from "../../../types/persona";

interface AIPersonaBuilderProps {
  initialPersona?: AIPersona;
  onSave: (persona: AIPersona) => void;
}

const VOICES: { id: AIVoiceId; name: string; desc: string; tone: string; color: string }[] = [
  { id: "Zephyr", name: "Zephyr", desc: "Professional, confident female", tone: "Mid-pitch, energetic", color: "emerald" },
  { id: "Puck", name: "Puck", desc: "Warm, relatable male", tone: "Mid-pitch, approachable", color: "blue" },
  { id: "Charon", name: "Charon", desc: "Authoritative, deep male", tone: "Low-pitch, serious", color: "indigo" },
  { id: "Kore", name: "Kore", desc: "Youthful, friendly female", tone: "High-pitch, enthusiastic", color: "rose" },
  { id: "Aoede", name: "Aoede", desc: "Sophisticated, calm female", tone: "Low-pitch, measured", color: "purple" },
  { id: "Fenrir", name: "Fenrir", desc: "Dynamic, raspy male", tone: "Mid-pitch, intense", color: "amber" }
];

const FRAMEWORKS: { id: SalesFramework; name: string; desc: string }[] = [
  { id: "SPIN Selling", name: "SPIN Selling", desc: "Focuses on Situation, Problem, Implication, and Need-Payoff questions." },
  { id: "Challenger Sale", name: "The Challenger Sale", desc: "Takes control, challenges the prospect's assumptions, and teaches them." },
  { id: "Sandler System", name: "Sandler System", desc: "Focuses on mutual qualification, uncovering pain, and budget before presenting." },
  { id: "Straight Line Persuasion", name: "Straight Line System", desc: "High-energy, focused entirely on moving the prospect directly to the close." }
];

const LANGUAGES = [
  "English (US) - Conversational",
  "English (British) - RP Accent",
  "Spanish (Latin America)",
  "Spanish (Spain)",
  "French (Standard)",
  "German (Standard)"
];

export function AIPersonaBuilder({ initialPersona, onSave }: AIPersonaBuilderProps) {
  const [persona, setPersona] = useState<AIPersona>(initialPersona || DEFAULT_PERSONA);
  const [playingVoice, setPlayingVoice] = useState<AIVoiceId | null>(null);

  const updateModulation = (key: keyof AIPersona['emotionalModulation'], value: number | boolean) => {
    setPersona(prev => ({
      ...prev,
      emotionalModulation: {
        ...prev.emotionalModulation,
        [key]: value
      }
    }));
  };

  const handlePlayVoice = (id: AIVoiceId, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingVoice(id);
    // Simulate playing audio duration
    setTimeout(() => setPlayingVoice(null), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 lg:px-8 text-white font-sans animate-scale-in h-full overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex items-center gap-5 mb-10 p-6 glass-card rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center border border-purple-500/30 glow-purple shrink-0">
          <Bot className="w-8 h-8 text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            AI Persona Architect 
            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md border border-purple-500/30 uppercase tracking-widest flex items-center gap-1.5 shine">
              <Zap className="w-3 h-3" /> v3.0 Neuromorphic
            </span>
          </h2>
          <p className="text-gray-400 text-sm mt-2 max-w-2xl leading-relaxed font-medium">
            Genetically engineer your AI Caller's neural pathways. Control its vocal identity, emotional resonance, and real-time behavioral responses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Voice & Language */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          <section className="glass-card border border-white/5 rounded-3xl p-6 flex-1 flex flex-col relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
            
            <h3 className="text-sm font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-6">
              <Mic2 className="w-4 h-4 text-emerald-400" /> Vocal Identity
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 relative z-10">
              {VOICES.map(v => {
                const isSelected = persona.voiceId === v.id;
                const isPlaying = playingVoice === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setPersona({...persona, voiceId: v.id})}
                    className={`p-4 rounded-2xl border text-left flex flex-col transition-all duration-300 overflow-hidden relative group/btn ${
                      isSelected 
                      ? `bg-${v.color}-500/10 border-${v.color}-500/50 shadow-[0_0_20px_rgba(var(--${v.color}-rgb),0.15)]` 
                      : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className={`font-semibold ${isSelected ? `text-${v.color}-400` : "text-gray-200"}`}>{v.name}</span>
                       <button 
                         onClick={(e) => handlePlayVoice(v.id, e)}
                         className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                           isPlaying ? `bg-${v.color}-500/20 text-${v.color}-400 animate-pulse` : 
                           isSelected ? `bg-${v.color}-500/10 text-${v.color}-400/50 hover:bg-${v.color}-500/20 hover:text-${v.color}-400` : 
                           "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white"
                         }`}
                       >
                         {isPlaying ? <Volume2 className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                       </button>
                    </div>
                    <span className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">{v.desc}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-mono mt-auto ${isSelected ? `text-${v.color}-400/70` : "text-gray-600"}`}>
                      {v.tone}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-6 border-t border-white/5 mt-auto relative z-10">
              <label className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-gray-500 mb-3">
                <span className="flex items-center gap-2"><Languages className="w-4 h-4 text-emerald-400" /> Origin</span>
              </label>
              <div className="relative">
                <select 
                  value={persona.language}
                  onChange={e => setPersona({...persona, language: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 appearance-none transition-colors"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/20 transition-all duration-500">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full group-hover:bg-blue-500/10 transition-colors duration-500"></div>
             <h3 className="text-sm font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-blue-400" /> Methodology
            </h3>
            <p className="text-[11px] text-gray-500 mb-6 font-medium">Instructs core questioning and closing behaviors.</p>
            
            <div className="space-y-3 relative z-10">
              {FRAMEWORKS.map(f => (
                 <label 
                   key={f.id}
                   className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                     persona.framework === f.id ? "bg-blue-500/10 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                   }`}
                 >
                   <div className="pt-0.5">
                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${persona.framework === f.id ? "border-blue-400 bg-blue-500/20" : "border-gray-600 bg-black/40"}`}>
                       {persona.framework === f.id && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                     </div>
                   </div>
                   <div>
                     <div className={`text-sm font-semibold mb-1 ${persona.framework === f.id ? "text-blue-400" : "text-gray-200"}`}>{f.name}</div>
                     <div className="text-[11px] text-gray-400 leading-relaxed font-medium">{f.desc}</div>
                   </div>
                 </label>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column: Neuromorphic Control Panel */}
        <div className="lg:col-span-7 space-y-6">
          <section className="glass-card border border-white/5 rounded-3xl p-8 h-full flex flex-col relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-50"></div>
            
            <div className="flex items-center justify-between mb-2 relative z-10">
              <h3 className="text-sm font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" /> Neural Modulation Matrix
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Dynamic Tone Shift</span>
                <button
                  onClick={() => updateModulation('dynamicToneShift', !persona.emotionalModulation.dynamicToneShift)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 ${persona.emotionalModulation.dynamicToneShift ? 'bg-indigo-500' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${persona.emotionalModulation.dynamicToneShift ? 'translate-x-5 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            
            <p className="text-[11px] text-gray-400 mb-10 leading-relaxed font-medium max-w-xl relative z-10">
              Fine-tune the AI's cognitive parameters. These sliders dictate behavior, pacing, and emotional intelligence in real-time.
            </p>

            <div className="space-y-10 flex-1 relative z-10">
              
              {/* Render sliders */}
              {[
                { key: 'empathy', labelFull: 'Empathy & Listening', labelLeft: 'Aggressive', labelRight: 'Empathetic', color: 'rose', val: persona.emotionalModulation.empathy },
                { key: 'energy', labelFull: 'Energy Level', labelLeft: 'Calm', labelRight: 'High-Octane', color: 'amber', val: persona.emotionalModulation.energy },
                { key: 'formality', labelFull: 'Formality Tone', labelLeft: 'Casual', labelRight: 'Professional', color: 'cyan', val: persona.emotionalModulation.formality },
                { key: 'pacing', labelFull: 'Speech Pacing (WPM)', labelLeft: 'Deliberate', labelRight: 'Rapid-Fire', color: 'violet', val: persona.emotionalModulation.pacing },
                { key: 'interruptionHandling', labelFull: 'Interruption Tolerance', labelLeft: 'Strict', labelRight: 'Conversational', color: 'emerald', val: persona.emotionalModulation.interruptionHandling },
              ].map((slider) => (
                <div key={slider.key} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-gray-500">{slider.labelFull}</span>
                    <span className={`text-xs font-mono font-bold text-${slider.color}-400 bg-${slider.color}-500/10 px-2 py-0.5 rounded border border-${slider.color}-500/20`}>
                      {slider.val}
                    </span>
                  </div>
                  <div className="relative group/slider">
                    <div className="absolute inset-y-0 left-0 w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full bg-gradient-to-r from-${slider.color}-600 to-${slider.color}-400 transition-all duration-300 ease-out`}
                        style={{ width: `${slider.val}%` }}
                      />
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={slider.val as number}
                      onChange={(e) => updateModulation(slider.key as any, parseInt(e.target.value))}
                      className="absolute inset-y-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                    />
                    {/* Custom thumb (visual only) */}
                    <div 
                      className={`absolute top-1/2 -mt-2.5 w-5 h-5 rounded-full bg-[#1a1a1a] border-2 border-${slider.color}-400 shadow-[0_0_10px_rgba(var(--${slider.color}-rgb),0.5)] pointer-events-none transition-all duration-150 group-hover/slider:scale-110`}
                      style={{ left: `calc(${slider.val}% - 10px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-gray-600">
                    <span>{slider.labelLeft}</span>
                    <span>{slider.labelRight}</span>
                  </div>
                </div>
              ))}

            </div>

             <div className="pt-8 mt-10 border-t border-white/5 relative z-10">
                <button 
                  onClick={() => onSave(persona)}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] active:scale-[0.98]"
                >
                  <Save className="w-5 h-5" /> Compile & Save Neural Pathways
                </button>
             </div>

          </section>
        </div>

      </div>
    </div>
  );
}
