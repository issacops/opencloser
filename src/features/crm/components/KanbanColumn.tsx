import React from "react";
import { Lead, LeadStatus } from "../../../types";
import { LeadCard } from "./LeadCard";

interface KanbanColumnProps {
  key?: React.Key;
  status: LeadStatus;
  leads: Lead[];
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDrop: (e: React.DragEvent, status: LeadStatus) => void | Promise<void>;
  onDragOver: (e: React.DragEvent) => void;
  onDial?: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
}

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  "Discovery": { dot: "bg-blue-400", text: "text-blue-400/80" },
  "Outbound Call": { dot: "bg-amber-400", text: "text-amber-400/80" },
  "Audit Requested": { dot: "bg-purple-400", text: "text-purple-400/80" },
  "Closed": { dot: "bg-emerald-400", text: "text-emerald-400/80" },
};

export function KanbanColumn({
  status,
  leads,
  onDragStart,
  onDrop,
  onDragOver,
  onDial,
  onViewDetails,
}: KanbanColumnProps) {
  const style = STATUS_STYLE[status] || { dot: "bg-gray-400", text: "text-gray-400" };

  return (
    <div
      className="flex flex-col w-72 shrink-0 h-full"
      onDrop={(e) => onDrop(e, status)}
      onDragOver={onDragOver}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${style.text} flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
          {status}
        </h2>
        <span className="text-[11px] font-mono text-gray-600 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.04]">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 flex flex-col gap-2.5 min-h-[200px] rounded-xl border border-dashed border-transparent hover:border-white/[0.06] transition-all p-1 stagger-children">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onDial={onDial}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
