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
  Zap,
  Bell,
  ChevronDown,
} from "lucide-react";

const COLUMNS: LeadStatus[] = [
  "Discovery",
  "Outbound Call",
  "Audit Requested",
  "Closed",
];

const NAV_ITEMS = [
  { label: "Overview", state: "home" },
  { label: "Pipeline", state: "dashboard" },
  { label: "Call Intelligence", state: "call_logs" },
  { label: "AI Team", state: "persona" },
];

const SIDEBAR_TOP = [
  { icon: Home, state: "home", label: "Overview" },
  { icon: LayoutDashboard, state: "dashboard", label: "Pipeline" },
  { icon: Phone, state: "call_logs", label: "Call Intelligence" },
  { icon: Target, state: "hunter", label: "Lead Researcher" },
  { icon: Bot, state: "persona", label: "AI Caller" },
  { icon: Swords, state: "trainer", label: "Sales Coach" },
];

const SIDEBAR_BOTTOM = [
  { icon: Settings, state: "settings", label: "Settings" },
];

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

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
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    // If we're forcing demo mode or there are no API keys, clear data to force restart
    const hasAnyKey = localStorage.getItem("gemini_api_key") || localStorage.getItem("openai_api_key") || localStorage.getItem("elevenlabs_api_key");
    if (!hasAnyKey) {
        localStorage.removeItem("hasCompletedOnboarding");
        localStorage.removeItem("hasCompletedAudioSetup");
        localStorage.removeItem("icp_data");
        // Keep ai_persona so the form is somewhat pre-filled or uses defaults safely
    }

    const completed = localStorage.getItem("hasCompletedOnboarding");
    if (completed) {
      setAppState("home");
      const savedIcp = localStorage.getItem("icp_data");
      if (savedIcp) setIcpData(JSON.parse(savedIcp));
    }

    fetchLeads();
    fetchCallLogs();
    const savedPersona = localStorage.getItem("ai_persona");
    if (savedPersona) setPersona(JSON.parse(savedPersona));
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

    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));

    if (status === "Outbound Call") {
      setActiveCallLead({ ...leadToMove, status });
    }

    try {
      await invoke('update_lead_status', { id: leadId, status });
      if (status === "Closed") {
        addToast("success", `Deal closed with ${leadToMove.company}!`);
      }
    } catch (error) {
      console.error("Failed to update lead status:", error);
      addToast("error", "Failed to move lead. Reverting changes.");
      fetchLeads();
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleOnboardingComplete = (icp: ICP) => {
    setIcpData(icp);
    localStorage.setItem("hasCompletedOnboarding", "true");
    localStorage.setItem("icp_data", JSON.stringify(icp));
    if (!localStorage.getItem("hasCompletedAudioSetup")) {
      setAppState("audio_setup");
    } else {
      setAppState("icp_review");
    }
    addToast("success", "AI Sales Strategy generated successfully.");
  };

  const handleDial = (lead: Lead) => { setActiveCallLead(lead); };

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
    if (closedLead && callTranscript && callTranscript.length > 0) {
      setDebriefData({ lead: closedLead, transcript: callTranscript, duration: callDuration || 0 });
    }
  };

  const isAppShellVisible = !["onboarding", "icp_review", "audio_setup", "persona_setup"].includes(appState);

  // Determine active nav
  const activeNavState = appState === "lead_detail" ? "dashboard" : appState;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>

      {/* ── Top Header ── */}
      {isAppShellVisible && (
        <header
          className="flex items-center justify-between px-8 py-5 shrink-0"
          style={{ zIndex: 50, background: "transparent" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: "var(--accent-coral)", boxShadow: "var(--shadow-coral)" }}
            >
              <Phone className="w-5 h-5 fill-current" />
            </div>
            <span className="text-[22px] font-extrabold" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
              OpenCloser
            </span>
          </div>

          {/* Center Nav Pill Container */}
          <nav className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.state}
                onClick={() => setAppState(item.state as any)}
                className={`px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all duration-200 ${
                  activeNavState === item.state 
                    ? "bg-[#1A1D20] text-white shadow-md" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 bg-transparent"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Controls Pill */}
          <div className="flex items-center gap-4 shrink-0">
            {appState === "dashboard" && (
              <button
                onClick={isPowerDialing ? () => setIsPowerDialing(false) : startPowerDialing}
                className={isPowerDialing ? "btn-coral rounded-full" : "btn-ghost rounded-full bg-white"}
                style={{ fontSize: 13, padding: "9px 18px", border: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
              >
                <Zap className="w-4 h-4" />
                {isPowerDialing ? "Stop Dialer" : "Power Dial"}
              </button>
            )}

            <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
              
              <div className="flex items-center gap-3 pl-2 pr-4 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200">
                  <img src="https://ui-avatars.com/api/?name=Sales+Lead&background=FF5C39&color=fff&bold=true" alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-gray-900 leading-tight">Sales Lead</span>
                  <span className="text-[11px] text-gray-500 font-medium leading-tight">sales@opencloser.ai</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ── Body: Sidebar + Main ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Icon Sidebar ── */}
        {isAppShellVisible && (
          <aside
            className="flex flex-col items-center gap-4 py-8 shrink-0 relative z-40 bg-transparent"
            style={{ width: 80 }}
          >
            {/* Top icons */}
            <div className="flex flex-col items-center gap-3 flex-1 px-4">
              {SIDEBAR_TOP.map((item) => (
                <button
                  key={item.state}
                  title={item.label}
                  onClick={() => setAppState(item.state as any)}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                    (appState === item.state || (item.state === "dashboard" && appState === "lead_detail"))
                      ? "bg-gray-200 text-gray-900 shadow-sm"
                      : "text-gray-400 hover:bg-gray-200 hover:text-gray-700 bg-transparent"
                  }`}
                >
                  <item.icon className="w-5 h-5 stroke-[2.5px]" />
                </button>
              ))}
            </div>

            {/* Bottom icons */}
            <div className="flex flex-col items-center gap-3 px-4">
              {/* New Campaign quick-add */}
              <button
                onClick={() => setAppState("hunter")}
                className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer shadow-[0_4px_16px_rgba(255,92,57,0.3)] bg-[var(--accent-coral)] text-white hover:scale-105"
                title="New Campaign"
              >
                <Plus className="w-6 h-6 stroke-[3px]" />
              </button>
              {SIDEBAR_BOTTOM.map((item) => (
                <button
                  key={item.state}
                  title={item.label}
                  onClick={() => setAppState(item.state as any)}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                    appState === item.state
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-400 hover:bg-gray-200 hover:text-gray-700 bg-transparent"
                  }`}
                >
                  <item.icon className="w-5 h-5 stroke-[2.5px]" />
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* ── Main View ── */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            background: ["dashboard"].includes(appState) ? "var(--bg-primary)" : "var(--bg-primary)",
            padding: appState === "dashboard" ? "24px" : "0",
          }}
        >
          {appState === "onboarding" && (
            <Onboarding onComplete={handleOnboardingComplete} />
          )}

          {appState === "icp_review" && icpData && (
            <ICPDisplay icp={icpData} onContinue={() => setAppState("home")} />
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
                if (appState === "persona_setup") setAppState("home");
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

          {appState === "call_logs" && <CallLogsView />}

          {appState === "settings" && <SettingsView />}

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
              <div
                className="flex items-center justify-center h-full"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}
              >
                Loading pipeline…
              </div>
            ) : (
              <div className="flex gap-5 h-full items-start flex-col">
                {/* Search & Filter Bar */}
                <div className="flex items-center gap-3 w-full shrink-0">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search leads…"
                      className="input-field"
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 70, 80, 90].map((score) => (
                      <button
                        key={score}
                        onClick={() => setScoreFilter(scoreFilter === score ? 0 : score)}
                        className="btn-ghost"
                        style={{
                          fontSize: 12,
                          padding: "6px 12px",
                          fontFamily: "var(--font-mono)",
                          background: scoreFilter === score && score > 0 ? "var(--accent-coral-light)" : undefined,
                          borderColor: scoreFilter === score && score > 0 ? "var(--accent-coral-medium)" : undefined,
                          color: scoreFilter === score && score > 0 ? "var(--accent-coral)" : undefined,
                        }}
                      >
                        {score === 0 ? "All" : `${score}+`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-5 flex-1 items-start w-full overflow-x-auto pb-2">
                  {COLUMNS.map((status) => (
                    <KanbanColumn
                      key={status}
                      status={status}
                      leads={leads.filter((l) => {
                        const matchesSearch =
                          !searchQuery ||
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

          {appState === "trainer" && <ObjectionTrainer icp={icpData} />}

          {appState === "lead_detail" && selectedLead && (
            <LeadDetailView
              lead={selectedLead}
              icp={icpData}
              onBack={() => {
                setSelectedLead(null);
                setAppState("dashboard");
              }}
              onDial={(lead) => setActiveCallLead(lead)}
              onDelete={(leadId) => {
                setLeads(leads.filter((l) => l.id !== leadId));
                setSelectedLead(null);
                setAppState("dashboard");
                addToast("success", "Lead deleted successfully.");
              }}
              onStatusChange={async (leadId, newStatus) => {
                try {
                  await invoke("update_lead_status", { id: leadId, status: newStatus });
                  setLeads(leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
                  setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
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
        <WarRoom lead={activeCallLead} icp={icpData} onClose={handleWarRoomClose} />
      )}

      {/* Post-Call Debrief */}
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
