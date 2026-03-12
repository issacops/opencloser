import React from "react";
import { Lead } from "../../../types";
import { Building2, Phone, Activity, ArrowUpRight } from "lucide-react";

interface LeadCardProps {
  key?: React.Key;
  lead: Lead;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDial?: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
}

export function LeadCard({ lead, onDragStart, onDial, onViewDetails }: LeadCardProps) {
  const scoreColor = lead.score >= 90
    ? "from-emerald-500/20 to-cyan-500/20 text-emerald-400 border-emerald-500/25"
    : lead.score >= 75
    ? "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/25"
    : "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/25";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="glass-card glass-card-hover rounded-xl p-4 cursor-grab active:cursor-grabbing group animate-fade-in"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[13px] text-gray-100 truncate tracking-tight">
            {lead.name}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.company}</span>
          </div>
        </div>
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${scoreColor} font-mono text-xs font-bold border shrink-0`}>
          {lead.score}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-white/[0.02] px-2.5 py-1.5 rounded-lg border border-white/[0.04]">
        <Phone className="w-3 h-3 text-gray-600" />
        <span className="font-mono">{lead.phone}</span>
      </div>

      {lead.status === "Outbound Call" && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-indigo-400 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/15">
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="font-medium">AI Call Active</span>
          <div className="ml-auto flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: "0.2s" }}></span>
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: "0.4s" }}></span>
          </div>
        </div>
      )}

      {/* Action bar — reveals on hover */}
      <div className="mt-3 pt-3 border-t border-white/[0.04] flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button
          onClick={() => onViewDetails && onViewDetails(lead)}
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-400 transition-colors font-medium"
        >
          View Details
          <ArrowUpRight className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDial && onDial(lead)}
          className="text-[11px] bg-white/[0.05] hover:bg-indigo-500/20 hover:text-indigo-400 text-gray-400 px-3 py-1 rounded-lg transition-all font-medium border border-white/[0.04] hover:border-indigo-500/20"
        >
          Dial
        </button>
      </div>
    </div>
  );
}
