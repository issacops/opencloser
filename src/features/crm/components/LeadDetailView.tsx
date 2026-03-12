import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lead, LeadStatus, ICP } from "../../../types";
import {
  ArrowLeft,
  Phone,
  Building2,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Activity,
  PhoneCall,
  User,
  Bot,
  Calendar,
} from "lucide-react";

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

interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
}

interface LeadDetailViewProps {
  lead: Lead;
  icp: ICP | null;
  onBack: () => void;
  onDial: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

const STATUSES: LeadStatus[] = ["Discovery", "Outbound Call", "Audit Requested", "Closed"];

export function LeadDetailView({ lead, icp, onBack, onDial, onDelete, onStatusChange }: LeadDetailViewProps) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "calls" | "notes">("timeline");

  useEffect(() => {
    loadData();
  }, [lead.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logs, leadNotes] = await Promise.all([
        invoke<CallLog[]>("get_lead_call_logs", { leadId: lead.id }),
        invoke<LeadNote[]>("get_lead_notes", { leadId: lead.id }),
      ]);
      setCallLogs(logs);
      setNotes(leadNotes);
    } catch (err) {
      console.error("Failed to load lead data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const noteId = `note_${Date.now()}`;
    try {
      await invoke("add_lead_note", { id: noteId, leadId: lead.id, content: newNote.trim() });
      setNewNote("");
      loadData();
    } catch (err) {
      console.error("Failed to add note:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${lead.name} and all associated data? This cannot be undone.`)) return;
    try {
      await invoke("delete_lead", { id: lead.id });
      onDelete(lead.id);
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  // Build unified timeline
  const timelineItems = [
    ...callLogs.map(cl => ({
      type: "call" as const,
      date: cl.created_at,
      data: cl,
    })),
    ...notes.map(n => ({
      type: "note" as const,
      date: n.created_at,
      data: n,
    })),
    {
      type: "created" as const,
      date: lead.created_at,
      data: null,
    }
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const scoreColor = lead.score >= 90 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
    : lead.score >= 75 ? "text-blue-400 bg-blue-500/10 border-blue-500/20" 
    : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  const statusColor: Record<string, string> = {
    "Discovery": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Outbound Call": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Audit Requested": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Closed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto py-8 lg:py-10 px-4 lg:px-8 custom-scrollbar overflow-y-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="group flex items-center gap-2 text-[13px] text-gray-500 hover:text-indigo-400 transition-colors duration-300 mb-8 w-fit font-medium"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Return to Pipeline
      </button>

      {/* Lead Header Card */}
      <div className="glass-card rounded-[2rem] p-8 mb-8 animate-fade-in relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-1000"></div>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
               <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-md animate-pulse"></div>
              <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-4xl font-black text-white glow-indigo relative z-10">
                {lead.name.charAt(0)}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{lead.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="flex items-center gap-2 text-[15px] font-medium text-gray-300 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.05]">
                  <Building2 className="w-4 h-4 text-gray-500" /> {lead.company}
                </span>
                <span className="flex items-center gap-2 text-[15px] text-gray-300 font-mono bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.05]">
                  <Phone className="w-4 h-4 text-gray-500" /> {lead.phone}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider ${statusColor[lead.status] || "bg-white/5 text-gray-400 border-white/10"}`}>
                  {lead.status}
                </span>
                <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${scoreColor}`}>
                  <Activity className="w-3.5 h-3.5" />
                  Score: {lead.score}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium ml-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-600" /> Acquired {formatDate(lead.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onDial(lead)}
              className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
            >
              <PhoneCall className="w-4 h-4" /> Initiate Sequence
            </button>
            <div className="relative group/select">
              <select
                value={lead.status}
                onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                className="bg-[#050505] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm font-medium text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-premium appearance-none cursor-pointer hover:border-white/20"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover/select:text-gray-300 transition-colors" />
            </div>
            <button
              onClick={handleDelete}
              className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all duration-300 hover:scale-105 active:scale-95"
              title="Purge Record"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-6 mb-8 stagger-children">
        <div className="glass-card rounded-[1.5rem] p-6 text-center relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 blur-[20px] rounded-full group-hover:bg-blue-500/20 transition-colors duration-500 pointer-events-none"></div>
          <div className="text-4xl font-extrabold text-white tabular-nums tracking-tight relative z-10">{callLogs.length}</div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 uppercase tracking-[0.15em] mt-3 font-mono relative z-10">
             <Phone className="w-3 h-3" /> Total Engagements
          </div>
        </div>
        <div className="glass-card rounded-[1.5rem] p-6 text-center relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 blur-[20px] rounded-full group-hover:bg-indigo-500/20 transition-colors duration-500 pointer-events-none"></div>
          <div className="text-4xl font-extrabold text-white tabular-nums tracking-tight relative z-10">
            {callLogs.length > 0 ? formatDuration(Math.round(callLogs.reduce((s, c) => s + c.duration_seconds, 0) / callLogs.length)) : "0:00"}
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 uppercase tracking-[0.15em] mt-3 font-mono relative z-10">
             <Clock className="w-3 h-3" /> Mean Duration
          </div>
        </div>
        <div className="glass-card rounded-[1.5rem] p-6 text-center relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 blur-[20px] rounded-full group-hover:bg-amber-500/20 transition-colors duration-500 pointer-events-none"></div>
          <div className="text-4xl font-extrabold text-white tabular-nums tracking-tight relative z-10">{notes.length}</div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 uppercase tracking-[0.15em] mt-3 font-mono relative z-10">
             <StickyNote className="w-3 h-3" /> Data Logs
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 glass-card rounded-2xl p-1.5 mb-8 relative z-10">
        {([
          { key: "timeline", label: "Timeline", icon: Activity },
          { key: "calls", label: `Calls (${callLogs.length})`, icon: Phone },
          { key: "notes", label: `Notes (${notes.length})`, icon: StickyNote },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeTab === tab.key
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {loading ? (
          <div className="flex justify-center items-center h-48">
             <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="shimmer text-indigo-400 font-mono text-sm tracking-widest uppercase relative z-10">Indexing Telemetry...</div>
             </div>
          </div>
        ) : activeTab === "timeline" ? (
          /* Timeline View */
          <div className="relative pl-10 ml-4">
            <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500/50 via-purple-500/20 to-transparent"></div>

            <div className="space-y-8 animate-fade-in relative z-10">
              {timelineItems.map((item, i) => (
                <div key={i} className="relative group">
                  <div className={`absolute -left-[45px] top-5 w-5 h-5 rounded-full border-4 shadow-lg z-20 transition-transform duration-300 group-hover:scale-125 ${
                    item.type === "call" ? "bg-[#0a0a0a] border-blue-500" :
                    item.type === "note" ? "bg-[#0a0a0a] border-amber-500" :
                    "bg-[#0a0a0a] border-gray-500"
                  }`}></div>

                  <div className="glass-card rounded-[1.5rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.08] hover:shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-2.5 text-[11px] font-mono uppercase tracking-[0.15em] text-gray-400">
                        {item.type === "call" && <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20"><Phone className="w-3.5 h-3.5 text-blue-400" /></div>}
                        {item.type === "note" && <div className="p-1 rounded-md bg-amber-500/10 border border-amber-500/20"><StickyNote className="w-3.5 h-3.5 text-amber-400" /></div>}
                        {item.type === "created" && <div className="p-1 rounded-md bg-gray-500/10 border border-gray-500/20"><Activity className="w-3.5 h-3.5 text-gray-400" /></div>}
                        <span className={item.type === 'call' ? 'text-blue-400' : item.type === 'note' ? 'text-amber-400' : 'text-gray-400'}>
                          {item.type === "call" ? "Acoustic Session" : item.type === "note" ? "Data Imprint" : "Node Initialized"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium font-mono">
                        {formatDate(item.date)} // {formatTime(item.date)}
                      </span>
                    </div>

                    <div className="relative z-10">
                      {item.type === "call" && item.data && (
                        <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl w-fit">
                          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border tracking-wide ${
                            (item.data as CallLog).status === "Success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                            (item.data as CallLog).status === "Voicemail" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                            "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}>
                            {(item.data as CallLog).status}
                          </span>
                          <span className="flex items-center gap-1.5 text-[13px] text-gray-400 font-mono">
                             <Clock className="w-3.5 h-3.5 text-gray-500" />
                            {formatDuration((item.data as CallLog).duration_seconds)}
                          </span>
                        </div>
                      )}

                      {item.type === "note" && item.data && (
                        <p className="text-[14px] text-gray-300 leading-relaxed pl-3 border-l-2 border-amber-500/30">
                          {(item.data as LeadNote).content}
                        </p>
                      )}

                      {item.type === "created" && (
                        <p className="text-[14px] text-gray-500 font-medium">Entity integrated into operational pipeline.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {timelineItems.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 glass-card rounded-3xl border border-white/[0.05]">
                  <Activity className="w-12 h-12 mb-4 text-gray-600 opacity-50" />
                  <p className="text-gray-400 font-medium">No operational history detected.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "calls" ? (
          /* Calls View */
          <div className="space-y-4 animate-fade-in">
            {callLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 glass-card rounded-3xl border border-white/[0.05]">
                <Phone className="w-12 h-12 mb-4 text-gray-600 opacity-50" />
                <p className="text-gray-400 font-medium">No acoustic sessions recorded.</p>
              </div>
            ) : callLogs.map(log => {
              const isExpanded = expandedCallId === log.id;
              let transcriptData: any[] = [];
              try { transcriptData = JSON.parse(log.transcript); } catch {}

              return (
                <div key={log.id} className={`glass-card rounded-[2rem] overflow-hidden transition-all duration-300 ${isExpanded ? 'border-white/[0.1] shadow-2xl' : 'hover:border-white/[0.08] hover:-translate-y-0.5'}`}>
                  <div 
                    className={`flex items-center justify-between p-6 cursor-pointer relative overflow-hidden group ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                    onClick={() => setExpandedCallId(isExpanded ? null : log.id)}
                  >
                    {isExpanded && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>}
                    <div className="flex items-center gap-5 relative z-10">
                      <span className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border uppercase tracking-wider ${
                        log.status === "Success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                        log.status === "Voicemail" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                        "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}>
                        {log.status === "Success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {log.status}
                      </span>
                      <span className="text-[13px] font-mono text-gray-300 flex items-center gap-2 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.05]">
                        <Clock className="w-3.5 h-3.5 text-gray-500" /> {formatDuration(log.duration_seconds)}
                      </span>
                      <span className="hidden md:flex text-[13px] text-gray-400">
                        {formatDate(log.created_at)} &bull; {formatTime(log.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-gray-500 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                        {Array.isArray(transcriptData) ? transcriptData.length : 0} nodes
                      </span>
                      <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'bg-white/10 rotate-180' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        <ChevronDown className={`w-4 h-4 ${isExpanded ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/[0.05] bg-[#030303] p-6 animate-slide-in-up relative">
                      <h4 className="flex items-center gap-2 text-[11px] font-mono text-blue-400 uppercase tracking-[0.2em] mb-5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        Acoustic Transcript
                      </h4>
                      {Array.isArray(transcriptData) && transcriptData.length > 0 ? (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                          {transcriptData.map((entry: any, idx: number) => (
                            <div key={idx} className={`flex gap-3 ${entry.role === 'user' ? 'justify-end' : ''}`}>
                              {entry.role !== 'user' && (
                                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1">
                                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                              )}
                              <div className={`max-w-[75%] rounded-2xl px-5 py-3 text-[14px] leading-relaxed ${
                                entry.role === 'user'
                                  ? 'bg-gradient-to-br from-blue-600/25 to-indigo-600/25 text-blue-50 border border-blue-500/25 rounded-tr-sm'
                                  : 'bg-[#0a0a0a] text-gray-200 border border-white/10 rounded-tl-sm'
                              }`}>
                                {entry.text}
                              </div>
                              {entry.role === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                                  <User className="w-3.5 h-3.5 text-blue-400" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[14px] text-gray-500 italic bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 text-center">
                          No verifiable data detected.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Notes View */
          <div className="space-y-6 animate-fade-in">
            {/* Add Note Input */}
            <div className="glass-card rounded-[2rem] p-6 relative overflow-hidden focus-within:border-amber-500/30 transition-all duration-300">
              <div className="flex gap-4 relative z-10">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
                  }}
                  placeholder="Imprint observation data..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-[15px] text-white resize-none focus:outline-none focus:border-amber-500/50 transition-premium custom-scrollbar"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="self-end bg-gradient-to-br from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-white/5 disabled:to-white/5 disabled:text-gray-600 text-white px-5 py-4 rounded-xl transition-all duration-300 font-bold shadow-lg active:scale-95 border border-amber-500/50 shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mt-4">Cmd/Ctrl + Enter to Execute</p>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
              <div className="text-center text-gray-500 py-16 glass-card rounded-3xl border border-white/[0.05]">
                <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-30 text-amber-500" />
                <p className="font-medium">Database pristine. Awaiting input.</p>
              </div>
            ) : notes.map(note => (
              <div key={note.id} className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-amber-500/20 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                    <StickyNote className="w-3.5 h-3.5" /> Data Imprint
                  </div>
                  <span className="text-[12px] font-medium text-gray-500 font-mono">
                     {formatDate(note.created_at)} &bull; {formatTime(note.created_at)}
                  </span>
                </div>
                <p className="text-[15px] text-gray-300 leading-relaxed whitespace-pre-wrap relative z-10">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
