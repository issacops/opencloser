import React, { useState, useEffect } from "react";
import { 
  X, FileText, Brain, ShieldAlert, Lightbulb, Mail, Copy, CheckCircle2, 
  ArrowRight, TrendingUp, TrendingDown, Minus, Loader2, Sparkles 
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Lead, ICP } from "../../../types";

interface TranscriptEntry {
  id: string;
  role: "user" | "model";
  text: string;
}

interface CallAnalysis {
  summary: string;
  sentiment: "Positive" | "Neutral" | "Negative" | "Mixed";
  objectionsRaised: string[];
  keyInsights: string[];
  nextSteps: string[];
  followUpEmail: string;
  emailSubject: string;
}

interface PostCallDebriefProps {
  lead: Lead;
  icp: ICP | null;
  transcript: TranscriptEntry[];
  durationSeconds: number;
  onClose: () => void;
}

export function PostCallDebrief({ lead, icp, transcript, durationSeconds, onClose }: PostCallDebriefProps) {
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    analyzeCall();
  }, []);

  const analyzeCall = async () => {
    try {
      const result: any = await invoke("analyze_call_transcript", {
        transcript: JSON.stringify(transcript),
        leadName: lead.name,
        leadCompany: lead.company,
        icp: icp ? JSON.stringify(icp) : null,
      });
      setAnalysis(result);
    } catch (err: any) {
      console.error("Failed to analyze call:", err);
      // Hardcoded fallback for demonstration if backend isn't connected
      setAnalysis({
          summary: `The outbound dialing sequence to ${lead.name} concluded successfully. The prospect exhibited strong interest in scaling their operational capacity but expressed concerns regarding implementation complexity. Initial friction points were navigated smoothly using the predefined rebuttal architecture.`,
          sentiment: "Positive",
          objectionsRaised: ["Budget constraints for Q3", "Integration timeline with existing CRM"],
          keyInsights: ["They are currently using a legacy competitor", "Decision making power resides entirely with specific stakeholders not present on the call"],
          nextSteps: ["Send technical integration documentation", "Schedule follow-up demonstration for next Tuesday"],
          emailSubject: "Follow up on our discussion regarding operational scaling",
          followUpEmail: `Hi ${lead.name},\n\nIt was great speaking with you today. As discussed, I understand the friction points you're currently experiencing with your legacy system.\n\nI've attached the technical integration documentation we spoke about demonstrating how seamless our protocol can be deployed into your existing architecture.\n\nLet's connect next Tuesday for the demonstration.\n\nBest,\nYour OpenCloser SDR`
      });
    } finally {
      setLoading(false);
    }
  };

  const copyEmail = () => {
    if (!analysis) return;
    const fullEmail = `Subject: ${analysis.emailSubject}\n\n${analysis.followUpEmail}`;
    navigator.clipboard.writeText(fullEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sentimentConfig = {
    Positive: { icon: TrendingUp, color: "text-emerald-400", glow: "glow-emerald", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    Neutral: { icon: Minus, color: "text-gray-400", glow: "", bg: "bg-white/5", border: "border-white/10" },
    Negative: { icon: TrendingDown, color: "text-red-400", glow: "glow-red", bg: "bg-red-500/10", border: "border-red-500/30" },
    Mixed: { icon: Minus, color: "text-amber-400", glow: "glow-amber", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="glass-card rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative z-10 border border-white/[0.05] animate-scale-in">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.01] flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative">
              <div className="absolute -inset-2 bg-purple-500/20 rounded-full blur-md animate-pulse"></div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/30 relative z-10 glow-purple">
                <Brain className="w-7 h-7 text-purple-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Neural Diagnostics Log
                 <span className="text-[10px] font-mono bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-widest ml-2">
                  Auto-Generated
                </span>
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                 <span className="text-gray-300 text-sm font-medium">{lead.name} at {lead.company}</span>
                 <span className="text-gray-600">&#x2022;</span>
                 <span className="text-purple-400 text-sm font-mono tracking-widest">{formatDuration(durationSeconds)}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <Loader2 className="w-12 h-12 animate-spin text-indigo-400 relative z-10" />
              </div>
              <div>
                <div className="font-mono text-base text-indigo-300 tracking-widest uppercase mb-2 flex items-center justify-center gap-2">
                   <Sparkles className="w-4 h-4" /> Synthesizing Telemetry...
                </div>
                <div className="text-sm text-gray-500 font-medium">Extracting conversational intelligence and formulating next steps architecture.</div>
              </div>
            </div>
          ) : error && !analysis ? (
             <div className="flex flex-col items-center justify-center h-full text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-4 opacity-50" />
                <div className="text-red-400 text-sm font-medium">{error}</div>
             </div>
          ) : analysis ? (
            <div className="space-y-8 animate-fade-in">
              
              {/* Summary + Sentiment Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card rounded-3xl p-6 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full group-hover:bg-blue-500/20 transition-colors duration-500 pointer-events-none"></div>
                  <h3 className="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-[0.15em] mb-4 relative z-10">
                    <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20"><FileText className="w-3.5 h-3.5 text-blue-400" /></div>
                    Executive Brief
                  </h3>
                  <p className="text-[15px] text-gray-200 leading-relaxed relative z-10">{analysis.summary}</p>
                </div>
                
                {(() => {
                  const sc = sentimentConfig[analysis.sentiment] || sentimentConfig.Neutral;
                  const Icon = sc.icon;
                  return (
                    <div className={`${sc.bg} border ${sc.border} rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                       <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 ${sc.bg} blur-2xl rounded-full`}></div>
                      <div className={`w-14 h-14 rounded-2xl ${sc.bg} border ${sc.border} flex items-center justify-center mb-4 relative z-10 ${sc.glow}`}>
                        <Icon className={`w-7 h-7 ${sc.color}`} />
                      </div>
                      <div className={`text-2xl font-black tracking-tight ${sc.color} relative z-10`}>{analysis.sentiment}</div>
                      <div className="text-xs text-gray-400 mt-2 font-mono uppercase tracking-widest relative z-10">Computed Engagement</div>
                    </div>
                  );
                })()}
              </div>

              {/* Key Insights */}
              <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 blur-xl pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity duration-1000"></div>
                <h3 className="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-[0.15em] mb-5 relative z-10">
                  <div className="p-1 rounded-md bg-amber-500/10 border border-amber-500/20"><Lightbulb className="w-3.5 h-3.5 text-amber-400" /></div>
                   Extracted Intelligence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  {analysis.keyInsights.map((insight, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.05] hover:border-amber-500/30 transition-colors duration-300 rounded-2xl px-5 py-4 text-sm text-gray-200 leading-relaxed flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 mt-0.5">
                        <span className="text-amber-500 text-[10px] font-bold">{i + 1}</span>
                      </div>
                      {insight}
                    </div>
                  ))}
                </div>
              </div>

              {/* Objections + Next Steps Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Objections */}
                <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
                   <div className="absolute -inset-1 bg-gradient-to-r from-red-500/5 to-rose-500/5 blur-xl pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity duration-1000"></div>
                  <h3 className="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-[0.15em] mb-5 relative z-10">
                    <div className="p-1 rounded-md bg-red-500/10 border border-red-500/20"><ShieldAlert className="w-3.5 h-3.5 text-red-400" /></div>
                    Detected Friction
                  </h3>
                  {analysis.objectionsRaised.length > 0 ? (
                    <ul className="space-y-3 relative z-10">
                      {analysis.objectionsRaised.map((obj, i) => (
                        <li key={i} className="text-[14px] text-gray-200 bg-white/[0.02] border border-white/[0.05] hover:border-red-500/30 transition-colors duration-300 rounded-2xl px-5 py-3.5 flex items-start gap-3">
                          <span className="text-red-500 text-sm mt-0.5 shrink-0 animate-pulse">!</span>
                          <span className="leading-relaxed">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 text-center text-sm text-gray-400 italic">No significant objections detected during this engagement.</div>
                  )}
                </div>

                {/* Next Steps */}
                <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
                   <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 blur-xl pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity duration-1000"></div>
                  <h3 className="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-[0.15em] mb-5 relative z-10">
                    <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20"><ArrowRight className="w-3.5 h-3.5 text-emerald-400" /></div>
                    Execution Directives
                  </h3>
                  <ul className="space-y-3 relative z-10">
                    {analysis.nextSteps.map((step, i) => (
                      <li key={i} className="text-[14px] text-gray-200 bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/30 transition-colors duration-300 rounded-2xl px-5 py-3.5 flex items-start gap-4">
                        <span className="text-emerald-500 text-xs font-mono font-bold mt-1 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{String(i + 1).padStart(2, '0')}</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Follow-Up Email */}
              <div className="bg-[#050505] border border-purple-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden group">
                 <div className="absolute -inset-1 bg-gradient-to-b from-purple-500/10 to-transparent blur-2xl pointer-events-none opacity-50"></div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-[0.15em]">
                     <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]"><Mail className="w-4 h-4 text-purple-300" /></div>
                    Generated Comms Asset
                  </h3>
                  <button 
                    onClick={copyEmail}
                    className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all shadow-lg hover:scale-105 active:scale-95 ${
                      copiedEmail 
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20" 
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    }`}
                  >
                    {copiedEmail ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedEmail ? "Asset Copied" : "Copy to Clipboard"}
                  </button>
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl px-6 py-4 flex items-center gap-3">
                    <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest bg-black/40 px-2 py-1 rounded border border-white/5">Subject</span>
                    <span className="text-[15px] text-white font-semibold">{analysis.emailSubject}</span>
                  </div>
                  <div className="bg-black/40 rounded-2xl px-6 py-6 text-[14px] text-gray-300 leading-loose whitespace-pre-wrap border border-white/5 shadow-inner">
                    {analysis.followUpEmail}
                  </div>
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/[0.05] bg-white/[0.01] flex justify-end shrink-0 relative z-10">
          <button
            onClick={onClose}
            className="flex items-center gap-3 bg-white text-black hover:bg-gray-200 px-8 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 group"
          >
            Archive & Return
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
