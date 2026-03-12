import React, { useState, useEffect } from "react";
import { Phone, Clock, FileText, ChevronDown, ChevronUp, CheckCircle2, XCircle, BarChart3, TrendingUp, Timer, Voicemail } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface CallLog {
  id: string;
  lead_id: string;
  duration_seconds: number;
  transcript: string;
  status: string;
  created_at: string;
  lead_name: string | null;
  lead_company: string | null;
}

export function CallLogsView() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data: CallLog[] = await invoke("get_call_logs");
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch call logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Analytics Computations
  const totalCalls = logs.length;
  const successCalls = logs.filter(l => l.status === "Success").length;
  const voicemailCalls = logs.filter(l => l.status === "Voicemail").length;
  const rejectedCalls = logs.filter(l => l.status === "Rejected").length;
  const successRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0;
  const avgDuration = totalCalls > 0 ? Math.round(logs.reduce((sum, l) => sum + l.duration_seconds, 0) / totalCalls) : 0;
  const totalTalkTime = logs.reduce((sum, l) => sum + l.duration_seconds, 0);

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto py-10 px-4 lg:px-8 custom-scrollbar h-full overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center gap-5 mb-10 animate-fade-in relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="relative">
           <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-md animate-pulse"></div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center border border-indigo-500/30 relative z-10 glow-indigo">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Call Intelligence Center
          </h2>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">
            Your AI Sales Manager's performance report — metrics, transcripts, and outcomes.
          </p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 stagger-children relative z-10">
          
          <div className="glass-card rounded-3xl p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 blur-xl rounded-full group-hover:bg-white/10 transition-colors duration-500 pointer-events-none"></div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-4 font-mono uppercase tracking-[0.15em] relative z-10">
              <Phone className="w-3.5 h-3.5" /> Total Invocations
            </div>
            <div className="text-4xl font-extrabold text-white tabular-nums tracking-tight relative z-10">{totalCalls}</div>
            <div className="text-[12px] text-gray-500 mt-2 font-medium relative z-10">{formatDuration(totalTalkTime)} cumulative duration</div>
          </div>
          
          <div className="glass-card rounded-3xl p-6 flex flex-col border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition-colors duration-500">
             <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 blur-xl pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity duration-1000"></div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 mb-4 font-mono uppercase tracking-[0.15em] relative z-10">
              <TrendingUp className="w-3.5 h-3.5" /> Conversion Rate
            </div>
            <div className="text-4xl font-extrabold text-emerald-400 tabular-nums tracking-tight relative z-10">{successRate}%</div>
            <div className="text-[12px] text-gray-500 mt-2 font-medium relative z-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
              {successCalls} successful engagements
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 blur-xl rounded-full group-hover:bg-white/10 transition-colors duration-500 pointer-events-none"></div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-4 font-mono uppercase tracking-[0.15em] relative z-10">
              <Timer className="w-3.5 h-3.5" /> Mean Duration
            </div>
            <div className="text-4xl font-extrabold text-white tabular-nums tracking-tight relative z-10">{formatDuration(avgDuration)}</div>
            <div className="text-[12px] text-gray-500 mt-2 font-medium relative z-10">active acoustic connection</div>
          </div>

          <div className="glass-card rounded-3xl p-6 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-5 font-mono uppercase tracking-[0.15em]">
              <BarChart3 className="w-3.5 h-3.5" /> Outcome Distribution
            </div>
            <div className="flex gap-1 h-2.5 rounded-full overflow-hidden mb-4 shadow-inner bg-black/50">
              {successCalls > 0 && <div className="bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ flex: successCalls }}></div>}
              {voicemailCalls > 0 && <div className="bg-gradient-to-r from-yellow-500 to-yellow-400" style={{ flex: voicemailCalls }}></div>}
              {rejectedCalls > 0 && <div className="bg-gradient-to-r from-red-500 to-red-400" style={{ flex: rejectedCalls }}></div>}
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 font-medium">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{successCalls} ✓</span>
              <span className="text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">{voicemailCalls} VM</span>
              <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{rejectedCalls} ✗</span>
            </div>
          </div>
        </div>
      )}

      {/* Logs List */}
      <h3 className="text-xl font-bold text-white tracking-tight mb-6 animate-fade-in relative z-10">Chronological Record</h3>

      {loading ? (
        <div className="flex items-center justify-center h-64 relative z-10">
           <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="shimmer text-indigo-400 font-mono text-sm tracking-widest uppercase relative z-10">Retrieving Logs...</div>
           </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 glass-card rounded-3xl relative z-10 border border-white/[0.05]">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
            <Phone className="w-8 h-8 opacity-40" />
          </div>
          <p className="font-medium">Telemetry database vacant. Initiate connection sequence.</p>
        </div>
      ) : (
        <div className="space-y-4 relative z-10 pb-10">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            let transcriptData: any[] = [];
            try {
               transcriptData = JSON.parse(log.transcript);
            } catch (e) {
               // Fallback
            }
            
            return (
              <div key={log.id} className={`glass-card rounded-[2rem] overflow-hidden transition-all duration-300 ${isExpanded ? 'border-white/[0.1] shadow-2xl shadow-indigo-900/10' : 'hover:border-white/[0.08] hover:-translate-y-0.5'}`}>
                <div 
                  className={`flex items-center justify-between p-6 md:p-8 cursor-pointer relative overflow-hidden group ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                  onClick={() => toggleExpand(log.id)}
                >
                  {isExpanded && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>}
                  
                  <div className="flex items-center gap-6 md:gap-8 relative z-10">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-white tracking-tight">{log.lead_name || 'Unknown Entity'}</span>
                      <span className="text-sm text-gray-400 mt-1">{log.lead_company || 'Unspecified Org'}</span>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-6">
                      <div className="flex items-center gap-2 text-[13px] font-mono text-gray-300 bg-white/[0.03] px-3.5 py-2 rounded-xl border border-white/[0.05]">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {formatDuration(log.duration_seconds)}
                      </div>
                      <div className="hidden lg:flex items-center gap-2 text-[13px] text-gray-400">
                         <FileText className="w-4 h-4 text-gray-600" />
                         {new Date(log.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-5 relative z-10">
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border uppercase tracking-wider ${
                       log.status === "Success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : 
                       log.status === "Voicemail" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : 
                       "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}>
                      {log.status === "Success" ? <CheckCircle2 className="w-3.5 h-3.5"/> : log.status === "Voicemail" ? <Voicemail className="w-3.5 h-3.5"/> : <XCircle className="w-3.5 h-3.5"/>}
                      {log.status}
                    </span>
                    <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'bg-white/10 rotate-180' : 'bg-white/5 group-hover:bg-white/10'}`}>
                      <ChevronDown className={`w-4 h-4 text-gray-400 ${isExpanded ? 'text-white' : ''}`} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/[0.05] bg-[#030303] p-6 md:p-8 animate-slide-in-up relative">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[60px] rounded-full pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <h4 className="text-[11px] font-mono text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        Acoustic Transcription Matrix
                      </h4>
                    </div>
                    
                    {Array.isArray(transcriptData) && transcriptData.length > 0 ? (
                       <div className="space-y-5 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar relative z-10">
                          {transcriptData.map((entry, idx) => (
                            <div key={idx} className={`flex gap-4 ${entry.role === 'user' ? 'justify-end' : ''}`}>
                              {entry.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-indigo-500/10">
                                   <div className="text-indigo-400 text-[10px] font-bold">AI</div>
                                </div>
                              )}
                               <div className={`max-w-[80%] lg:max-w-[70%] px-5 py-4 text-[15px] leading-relaxed relative ${
                                  entry.role === 'user' 
                                  ? 'bg-gradient-to-br from-indigo-600/30 to-blue-600/30 text-indigo-50 border border-indigo-500/30 rounded-3xl rounded-tr-sm shadow-lg shadow-indigo-900/20' 
                                  : 'bg-[#0a0a0a] text-gray-200 border border-white/10 rounded-3xl rounded-tl-sm shadow-lg'
                               }`}>
                                  {entry.text}
                               </div>
                               {entry.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                                   <div className="text-gray-400 text-[10px] font-bold uppercase">{log.lead_name?.charAt(0) || 'U'}</div>
                                </div>
                               )}
                            </div>
                          ))}
                       </div>
                    ) : (
                       <div className="text-[14px] text-gray-500 italic bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 text-center relative z-10">
                         No readable acoustic data detected for this session.
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
