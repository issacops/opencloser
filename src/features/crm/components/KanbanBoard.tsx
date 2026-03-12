import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lead, LeadStatus, ICP } from "../../../types";
import { KanbanColumn } from "./KanbanColumn";
import { Onboarding } from "../../onboarding/components/Onboarding";
import { ICPDisplay } from "../../onboarding/components/ICPDisplay";
import { AudioSetupWizard } from "../../onboarding/components/AudioSetupWizard";
import { LeadHunter } from "../../hunter/components/LeadHunter";
import { WarRoom } from "../../voice/components/WarRoom";
import { PostCallDebrief } from "../../voice/components/PostCallDebrief";
import { CallLogsView } from "./CallLogsView";
import { SettingsView } from "./SettingsView";
import { AIPersonaBuilder } from "./AIPersonaBuilder";
import { LeadDetailView } from "./LeadDetailView";
import { DashboardHome } from "./DashboardHome";
import { ObjectionTrainer } from "../../voice/components/ObjectionTrainer";
import { AIPersona } from "../../../types/persona";
import { Toast, ToastMessage, ToastType } from "../../../ui/components/Toast";
import {
  Phone,
  Search,
  Settings,
  Plus,
  LayoutDashboard,
  Target,
  Bot,
  Home,
  Swords,
} from "lucide-react";

const COLUMNS: LeadStatus[] = [
  "Discovery",
  "Outbound Call",
  "Audit Requested",
  "Closed",
];

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // App State: 'onboarding' -> 'icp_review' -> 'audio_setup' -> 'persona_setup' -> 'dashboard' -> 'hunter' -> 'call_logs' -> 'settings' -> 'persona'
  const [appState, setAppState] = useState<
    "onboarding" | "icp_review" | "audio_setup" | "persona_setup" | "home" | "dashboard" | "hunter" | "call_logs" | "settings" | "persona" | "lead_detail" | "trainer"
  >("onboarding");
  const [allCallLogs, setAllCallLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState(0);
  const [icpData, setIcpData] = useState<ICP | null>(null);
  const [persona, setPersona] = useState<AIPersona | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Call State
  const [activeCallLead, setActiveCallLead] = useState<Lead | null>(null);
  const [isPowerDialing, setIsPowerDialing] = useState(false);

  // Post-Call Debrief State
  const [debriefData, setDebriefData] = useState<{ lead: Lead; transcript: any[]; duration: number } | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, message: string) => {
    setToasts((prev) => [
      ...prev,
      { id: Date.now().toString(), type, message },
    ]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    fetchLeads();
    fetchCallLogs();
    const savedPersona = localStorage.getItem("ai_persona");
    if (savedPersona) {
      setPersona(JSON.parse(savedPersona));
    }
  }, []);

  const fetchCallLogs = async () => {
    try {
      const data: any = await invoke('get_call_logs');
      setAllCallLogs(data);
    } catch (err) {
      console.error("Failed to fetch call logs:", err);
    }
  };

  const fetchLeads = async () => {
    try {
      const data: any = await invoke('get_leads');
      setLeads(data);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      addToast("error", "Failed to load pipeline data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const handleDrop = async (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");

    const leadToMove = leads.find((l) => l.id === leadId);
    if (!leadToMove || leadToMove.status === status) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)),
    );

    // If dropped into Outbound Call, start a call
    if (status === "Outbound Call") {
      setActiveCallLead({ ...leadToMove, status });
    }

    // API Call
    try {
      await invoke('update_lead_status', { id: leadId, status });

      // Optional: Show success toast for certain moves
      if (status === "Closed") {
        addToast("success", `Deal closed with ${leadToMove.company}!`);
      }
    } catch (error) {
      console.error("Failed to update lead status:", error);
      addToast("error", "Failed to move lead. Reverting changes.");
      // Revert on failure
      fetchLeads();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleOnboardingComplete = (icp: ICP) => {
    setIcpData(icp);
    
    // Check if they need to do audio setup
    if (!localStorage.getItem("hasCompletedAudioSetup")) {
      setAppState("audio_setup");
    } else {
      setAppState("icp_review");
    }
    
    addToast("success", "AI Sales Strategy generated successfully.");
  };

  const handleDial = (lead: Lead) => {
    setActiveCallLead(lead);
  };

  const startPowerDialing = () => {
    const outboundLeads = leads.filter((l) => l.status === "Outbound Call");
    if (outboundLeads.length === 0) {
      addToast("info", "No leads in the Outbound Call column to dial.");
      return;
    }
    setIsPowerDialing(true);
    setActiveCallLead(outboundLeads[0]);
    addToast("info", `Starting Power Dial session with ${outboundLeads.length} leads.`);
  };

  const handleWarRoomClose = (callTranscript?: any[], callDuration?: number) => {
    const closedLead = activeCallLead;

    if (isPowerDialing && activeCallLead) {
      const outboundLeads = leads.filter((l) => l.status === "Outbound Call");
      const currentIndex = outboundLeads.findIndex((l) => l.id === activeCallLead.id);
      
      if (currentIndex !== -1 && currentIndex + 1 < outboundLeads.length) {
        setActiveCallLead(outboundLeads[currentIndex + 1]);
      } else {
        setIsPowerDialing(false);
        setActiveCallLead(null);
        addToast("success", "Power Dialing session complete.");
      }
    } else {
      setActiveCallLead(null);
    }

    // Show debrief if we have transcript data
    if (closedLead && callTranscript && callTranscript.length > 0) {
      setDebriefData({
        lead: closedLead,
        transcript: callTranscript,
        duration: callDuration || 0,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 gradient-border bg-[#0a0a0a]/80 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center border border-indigo-500/20 glow-indigo">
            <Phone className="w-4 h-4 text-indigo-400" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="gradient-text">Open</span><span className="text-white">Closer</span>
          </h1>
        </div>

        {(appState === "home" || appState === "dashboard" || appState === "hunter" || appState === "call_logs" || appState === "settings" || appState === "persona" || appState === "lead_detail") && (
          <div className="flex items-center gap-4">
            {appState === "dashboard" && (
              <button
                onClick={isPowerDialing ? () => setIsPowerDialing(false) : startPowerDialing}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border ${
                  isPowerDialing 
                    ? "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" 
                    : "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50"
                }`}
              >
                <Phone className={`w-4 h-4 ${isPowerDialing ? "" : ""}`} />
                {isPowerDialing ? "Stop Power Dialer" : "Start Power Dial"}
              </button>
            )}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                placeholder="⌘K  Search..."
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-premium w-56 placeholder:text-gray-600"
              />
            </div>
            <button 
              onClick={() => setAppState("settings")}
              className={`p-2 rounded-full transition-colors ${appState === "settings" ? "bg-white/10 text-emerald-400" : "hover:bg-white/5 text-gray-400"}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {(appState === "home" || appState === "dashboard" || appState === "hunter" || appState === "call_logs" || appState === "settings" || appState === "persona" || appState === "lead_detail") && (
          <aside className="w-60 border-r border-white/[0.06] bg-[#0a0a0a] p-3 flex flex-col gap-0.5">
            <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-2 mt-1 px-3">
              Navigation
            </div>
            <button
              onClick={() => setAppState("home")}
              className={`sidebar-item ${appState === "home" ? "active" : ""}`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => setAppState("dashboard")}
              className={`sidebar-item ${appState === "dashboard" || appState === "lead_detail" ? "active" : ""}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Pipeline
            </button>
            <button
              onClick={() => setAppState("hunter")}
              className={`sidebar-item ${appState === "hunter" ? "active" : ""}`}
            >
              <Target className="w-4 h-4" />
              Lead Hunter
            </button>
            <button
              onClick={() => setAppState("call_logs")}
              className={`sidebar-item ${appState === "call_logs" ? "active" : ""}`}
            >
              <Phone className="w-4 h-4" />
              Call Logs
            </button>

            <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-1 mt-4 px-3">
              AI Tools
            </div>
            <button
              onClick={() => setAppState("persona")}
              className={`sidebar-item ${appState === "persona" ? "active" : ""}`}
            >
              <Bot className="w-4 h-4" />
              AI Architect
            </button>
            <button
              onClick={() => setAppState("trainer")}
              className={`sidebar-item ${appState === "trainer" ? "active" : ""}`}
            >
              <Swords className="w-4 h-4" />
              Objection Sparring
            </button>

            <div className="mt-auto pt-4">
              <button
                onClick={() => setAppState("hunter")}
                className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 py-3 rounded-xl transition-all duration-300 text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:scale-[1.02] active:scale-95"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </div>
          </aside>
        )}

        {/* Main View Area */}
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden ${appState === "dashboard" ? "p-6" : appState === "home" ? "p-6 bg-[#0a0a0a]" : "p-0 bg-[#0a0a0a]"}`}
        >
          {appState === "onboarding" && (
            <Onboarding onComplete={handleOnboardingComplete} />
          )}

          {appState === "icp_review" && icpData && (
            <ICPDisplay
              icp={icpData}
              onContinue={() => setAppState("home")}
            />
          )}

          {appState === "audio_setup" && (
            <AudioSetupWizard 
              onComplete={() => {
                if (!localStorage.getItem("ai_persona")) {
                  setAppState("persona_setup");
                } else {
                  setAppState("home");
                }
              }} 
            />
          )}

          {(appState === "persona" || appState === "persona_setup") && (
            <AIPersonaBuilder 
              initialPersona={persona || undefined}
              onSave={(p) => {
                setPersona(p);
                localStorage.setItem("ai_persona", JSON.stringify(p));
                addToast("success", "AI Persona successfully re-programmed.");
                if (appState === "persona_setup") {
                  setAppState("home");
                }
              }}
            />
          )}

          {appState === "hunter" && (
            <LeadHunter
              icp={icpData}
              onLeadsAdded={() => {
                fetchLeads();
                setTimeout(() => setAppState("dashboard"), 2000);
              }}
              addToast={addToast}
            />
          )}

          {appState === "call_logs" && (
            <CallLogsView />
          )}

          {appState === "settings" && (
            <SettingsView />
          )}

          {appState === "home" && (
            <DashboardHome
              leads={leads}
              callLogs={allCallLogs}
              onViewLead={(lead) => {
                setSelectedLead(lead);
                setAppState("lead_detail");
              }}
              onDial={(lead) => setActiveCallLead(lead)}
              onNavigate={(page) => setAppState(page as any)}
            />
          )}

          {appState === "dashboard" &&
            (loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                  <div className="shimmer text-indigo-400 font-mono text-sm tracking-widest uppercase relative z-10">Initializing Pipeline...</div>
                </div>
              </div>
            ) : (
              <div className="flex gap-6 h-full items-start flex-col">
                {/* Search & Filter Bar */}
                <div className="flex items-center gap-3 w-full shrink-0">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search leads..."
                      className="w-full bg-[#111] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 70, 80, 90].map(score => (
                      <button
                        key={score}
                        onClick={() => setScoreFilter(scoreFilter === score ? 0 : score)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-colors ${
                          scoreFilter === score && score > 0
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-white/5 text-gray-500 border-white/5 hover:text-white"
                        }`}
                      >
                        {score === 0 ? "All" : `${score}+`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-6 flex-1 items-start w-full overflow-x-auto">
                {COLUMNS.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    leads={leads.filter((l) => {
                      const matchesSearch = !searchQuery || 
                        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        l.company.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesScore = l.score >= scoreFilter;
                      return l.status === status && matchesSearch && matchesScore;
                    })}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDial={handleDial}
                    onViewDetails={(lead) => {
                      setSelectedLead(lead);
                      setAppState("lead_detail");
                    }}
                  />
                ))}
                </div>
              </div>
            ))}

          {appState === "trainer" && (
            <ObjectionTrainer icp={icpData} />
          )}

          {appState === "lead_detail" && selectedLead && (
            <LeadDetailView
              lead={selectedLead}
              icp={icpData}
              onBack={() => {
                setSelectedLead(null);
                setAppState("dashboard");
              }}
              onDial={(lead) => {
                setActiveCallLead(lead);
              }}
              onDelete={(leadId) => {
                setLeads(leads.filter(l => l.id !== leadId));
                setSelectedLead(null);
                setAppState("dashboard");
                addToast("success", "Lead deleted successfully.");
              }}
              onStatusChange={async (leadId, newStatus) => {
                try {
                  await invoke("update_lead_status", { id: leadId, status: newStatus });
                  setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
                  setSelectedLead(prev => prev ? { ...prev, status: newStatus } : prev);
                  addToast("success", `Lead moved to ${newStatus}.`);
                } catch (err) {
                  console.error("Failed to update status:", err);
                }
              }}
            />
          )}
        </main>
      </div>

      {/* War Room Modal */}
      {activeCallLead && (
        <WarRoom
          lead={activeCallLead}
          icp={icpData}
          onClose={handleWarRoomClose}
        />
      )}

      {/* Post-Call Debrief Modal */}
      {debriefData && (
        <PostCallDebrief
          lead={debriefData.lead}
          icp={icpData}
          transcript={debriefData.transcript}
          durationSeconds={debriefData.duration}
          onClose={() => setDebriefData(null)}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </div>
  );
}
