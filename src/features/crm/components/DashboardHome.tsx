import React from "react";
import { Lead } from "../../../types";
import {
  TrendingUp,
  Phone,
  Clock,
  Target,
  Zap,
  ChevronRight,
  BarChart3,
  Activity,
  ArrowUpRight,
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

interface DashboardHomeProps {
  leads: Lead[];
  callLogs: CallLog[];
  onViewLead: (lead: Lead) => void;
  onDial: (lead: Lead) => void;
  onNavigate: (page: string) => void;
}

export function DashboardHome({ leads, callLogs, onViewLead, onDial, onNavigate }: DashboardHomeProps) {
  // Pipeline stats
  const discovery = leads.filter(l => l.status === "Discovery").length;
  const outbound = leads.filter(l => l.status === "Outbound Call").length;
  const audit = leads.filter(l => l.status === "Audit Requested").length;
  const closed = leads.filter(l => l.status === "Closed").length;
  const total = leads.length;

  // Call stats
  const totalCalls = callLogs.length;
  const successCalls = callLogs.filter(c => c.status === "Success").length;
  const successRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0;
  const totalTalkSecs = callLogs.reduce((s, c) => s + c.duration_seconds, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalTalkSecs / totalCalls) : 0;

  // Hot leads (top 5 by score, not closed)
  const hotLeads = [...leads]
    .filter(l => l.status !== "Closed")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Recent calls (last 5)
  const recentCalls = callLogs.slice(0, 5);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const funnelMax = Math.max(discovery, outbound, audit, closed, 1);

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto py-8 overflow-y-auto px-4 lg:px-8 xl:px-12 custom-scrollbar">
      
      {/* Welcome Header */}
      <div className="mb-10 animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="gradient-text">Team</span> <span className="text-white">HQ</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm font-medium tracking-wide">Your AI sales team at a glance — pipeline, performance, and team status.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
           <span className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> All Systems Online
           </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10 stagger-children">
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-[30px] rounded-full group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-4 font-mono uppercase tracking-[0.15em] relative z-10">
            <Target className="w-4 h-4 text-indigo-400" /> Pipeline Volume
          </div>
          <div className="text-4xl font-black text-white tabular-nums tracking-tight relative z-10">{total}</div>
          <div className="text-xs text-gray-500 mt-2 font-medium relative z-10"><span className="text-indigo-400">{leads.filter(l => l.status !== "Closed").length}</span> active prospects</div>
        </div>

        <div className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[30px] rounded-full group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-4 font-mono uppercase tracking-[0.15em] relative z-10">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Success Rate
          </div>
          <div className="text-4xl font-black text-emerald-400 tabular-nums tracking-tight relative z-10">{successRate}%</div>
          <div className="text-xs text-gray-500 mt-2 font-medium relative z-10"><span className="text-emerald-400/80">{successCalls}</span> positive outcomes</div>
        </div>

        <div className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-[30px] rounded-full group-hover:bg-blue-500/20 transition-colors duration-500"></div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-4 font-mono uppercase tracking-[0.15em] relative z-10">
            <Phone className="w-4 h-4 text-blue-400" /> Outbound Volume
          </div>
          <div className="text-4xl font-black text-white tabular-nums tracking-tight relative z-10">{totalCalls}</div>
          <div className="text-xs text-gray-500 mt-2 font-medium relative z-10"><span className="text-blue-400/80">{formatDuration(totalTalkSecs)}</span> total connection time</div>
        </div>

        <div className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full group-hover:bg-purple-500/20 transition-colors duration-500"></div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-4 font-mono uppercase tracking-[0.15em] relative z-10">
            <Clock className="w-4 h-4 text-purple-400" /> Avg Connection
          </div>
          <div className="text-4xl font-black text-white tabular-nums tracking-tight relative z-10">{formatDuration(avgDuration)}</div>
          <div className="text-xs text-gray-500 mt-2 font-medium relative z-10">duration per dial</div>
        </div>
      </div>

      {/* AI Team Quick Access */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 stagger-children">
        {[
          { role: "Strategist", desc: "ICP & Frameworks", icon: "🧠", color: "purple", status: "Ready", page: "persona" },
          { role: "Researcher", desc: "Lead Hunting", icon: "🔍", color: "blue", status: `${leads.length} leads`, page: "hunter" },
          { role: "Caller", desc: "Voice Agent", icon: "📞", color: "emerald", status: `${callLogs.length} calls`, page: "dashboard" },
          { role: "Coach", desc: "Objection Training", icon: "🎯", color: "amber", status: "Awaiting", page: "trainer" },
        ].map(member => (
          <button
            key={member.role}
            onClick={() => onNavigate(member.page)}
            className="glass-card rounded-2xl p-5 text-left transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:border-white/[0.12]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{member.icon}</span>
              <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/10 uppercase tracking-wider">{member.status}</span>
            </div>
            <div className="text-sm font-bold text-white group-hover:text-white/90">{member.role}</div>
            <div className="text-[12px] text-gray-500 mt-1 font-medium">{member.desc}</div>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Pipeline Funnel — 2 cols */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 blur-xl pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity duration-1000"></div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="flex items-center gap-3 text-xs font-mono text-gray-400 uppercase tracking-[0.15em]">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20"><BarChart3 className="w-4 h-4 text-blue-400" /></div>
              Conversion Vector
            </h2>
            <button
              onClick={() => onNavigate("dashboard")}
              className="text-xs text-gray-400 hover:text-white transition-premium flex items-center gap-1 font-mono uppercase tracking-widest bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl"
            >
              Enter Funnel <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
            {[
              { label: "Discovery", count: discovery, glow: "from-blue-600 to-indigo-600", color: "blue" },
              { label: "Outbound Call", count: outbound, glow: "from-amber-500 to-orange-500", color: "amber" },
              { label: "Audit Requested", count: audit, glow: "from-purple-600 to-fuchsia-600", color: "purple" },
              { label: "Closed", count: closed, glow: "from-emerald-500 to-teal-500", color: "emerald" },
            ].map((stage, idx) => (
              <div key={stage.label} className="flex items-center gap-6 group/row">
                <div className={`text-sm font-semibold w-36 text-right text-gray-300 group-hover/row:text-${stage.color}-400 transition-colors duration-300`}>{stage.label}</div>
                <div className="flex-1 bg-black/40 border border-white/5 rounded-full h-10 overflow-hidden relative shadow-inner">
                  <div
                    className={`absolute top-0 left-0 h-full bg-gradient-to-r ${stage.glow} rounded-full flex items-center transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.max((stage.count / funnelMax) * 100, 4)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 -translate-x-full group-hover/row:animate-[shimmer_1.5s_infinite]"></div>
                    <span className="text-sm font-black text-white pl-4 drop-shadow-md tabular-nums">{stage.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {total > 0 && (
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-8 relative z-10">
              <div className="text-sm text-gray-500 font-medium">
                Velocity: <span className="text-white font-bold text-lg tabular-nums">{total > 0 ? Math.round((closed / total) * 100) : 0}%</span> <span className="text-xs">Discovery → Closed</span>
              </div>
              {outbound > 0 && (
                <div className="text-sm text-gray-500 font-medium border-l border-white/10 pl-8">
                  Awaiting Execution: <span className="text-amber-400 font-bold text-lg tabular-nums">{outbound}</span> <span className="text-xs">Targets</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hot Leads — 1 col */}
        <div className="glass-card rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
          <h2 className="flex items-center gap-3 text-xs font-mono text-gray-400 uppercase tracking-[0.15em] mb-6">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20"><Zap className="w-4 h-4 text-amber-400" /></div>
             Priority Targets
          </h2>

          {hotLeads.length === 0 ? (
            <div className="bg-black/20 rounded-2xl border border-white/5 p-8 text-center flex flex-col items-center justify-center h-[300px]">
              <Target className="w-8 h-8 mb-4 opacity-20 text-white" />
              <p className="text-sm text-gray-500 font-medium">No active leads in pipeline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hotLeads.map((lead, i) => (
                <div
                  key={lead.id}
                  onClick={() => onViewLead(lead)}
                  className="flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-amber-500/20 rounded-2xl p-4 cursor-pointer transition-all duration-300 group/lead"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-500 shadow-inner group-hover/lead:bg-amber-500/20 transition-colors">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-gray-200 truncate group-hover/lead:text-white transition-colors">{lead.name}</div>
                    <div className="text-xs text-gray-500 truncate font-medium mt-0.5">{lead.company}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 group-hover/lead:bg-emerald-500/20 transition-colors shadow-sm">
                      {lead.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card rounded-3xl p-8 relative overflow-hidden group mb-8">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity duration-1000"></div>
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h2 className="flex items-center gap-3 text-xs font-mono text-gray-400 uppercase tracking-[0.15em]">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20"><Activity className="w-4 h-4 text-indigo-400" /></div>
            Execution Log
          </h2>
          <button
            onClick={() => onNavigate("call_logs")}
            className="text-xs text-gray-400 hover:text-white transition-premium flex items-center gap-1 font-mono uppercase tracking-widest bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl"
          >
            Access Archives <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCalls.length === 0 ? (
          <div className="bg-black/20 rounded-2xl border border-white/5 p-8 text-center flex flex-col items-center justify-center h-[200px]">
            <Phone className="w-8 h-8 mb-4 opacity-20 text-white" />
            <p className="text-sm text-gray-500 font-medium">No telemetry recorded. Initialize dialing sequence.</p>
          </div>
        ) : (
          <div className="grid gap-3 relative z-10">
            {recentCalls.map((call, i) => (
              <div key={call.id} className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-white/10 rounded-2xl px-6 py-4 transition-all duration-300">
                <div className="flex items-center gap-5">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
                      call.status === "Success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      call.status === "Voicemail" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                     <Phone className="w-4 h-4" />
                   </div>
                  <div>
                    <div className="text-[15px] font-semibold text-gray-200">{call.lead_name || "Unknown Identity"}</div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">{call.lead_company || "External Vector"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-sm font-mono text-gray-400 font-medium">{formatDuration(call.duration_seconds)}</span>
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                    call.status === "Success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                    call.status === "Voicemail" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                    "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}>
                    {call.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
