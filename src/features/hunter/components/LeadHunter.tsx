import React, { useState } from "react";
import { Search, MapPin, Filter, Play, Loader2, Database } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ICP, Lead } from "../../../types";
import { ToastType } from "../../../ui/components/Toast";

interface LeadHunterProps {
  icp: ICP | null;
  onLeadsAdded: () => void;
  addToast: (type: ToastType, message: string) => void;
}

export function LeadHunter({ icp, onLeadsAdded, addToast }: LeadHunterProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !location || isScraping) return;

    setIsScraping(true);
    setResults([]);

    try {
      const leads: any = await invoke('simulate_lead_scraping', { query, location, icp });
      
      const formattedLeads = leads.map((lead: any) => ({
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        score: lead.score
      }));

      const addedCount: number = await invoke('add_leads', { leads: formattedLeads });

      setResults(leads);
      if (addedCount > 0) {
        addToast(
          "success",
          `Successfully extracted and saved ${addedCount} new high-intent leads.`,
        );
      }
      
      const skippedCount = leads.length - addedCount;
      if (skippedCount > 0) {
        addToast(
          "warning",
          `Skipped ${skippedCount} duplicate lead${skippedCount !== 1 ? 's' : ''} that already existed in your CRM.`,
        );
      }
      onLeadsAdded(); // Trigger a refresh of the Kanban board
    } catch (error) {
      console.error("Failed to scrape leads:", error);
      addToast(
        "error",
        "Failed to extract leads. Please check your connection and try again.",
      );
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-[#111] border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar shadow-2xl">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Search className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              Lead Hunter
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Autonomous Directory Extraction Engine
            </p>
          </div>
        </div>

        {icp && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              ICP Filters Active
            </span>
          </div>
        )}
      </div>

      {/* Search Controls */}
      <div className="p-8 border-b border-white/10 bg-[#0a0a0a]">
        <form onSubmit={handleScrape} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Plumbers, SaaS Founders, Dentists..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>
          <div className="w-72 relative">
            <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Austin, TX)"
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isScraping || !query || !location}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-8 py-4 rounded-xl font-medium transition-colors"
          >
            {isScraping ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Campaign
              </>
            )}
          </button>
        </form>

        {/* ICP Context Display */}
        {icp && (
          <div className="mt-6 p-4 bg-[#1a1a1a] border border-white/5 rounded-xl flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-300 mb-1">
                Targeting Context
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                The extraction engine will prioritize leads matching:{" "}
                <span className="text-gray-300">{icp.targetAudience}</span>.
                Results will be automatically scored based on relevance to your
                value proposition.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#111]">
        {isScraping ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="font-mono text-sm animate-pulse">
              Bypassing anti-bot defenses...
            </div>
            <div className="text-xs text-gray-600">
              Simulating Puppeteer stealth extraction
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white">
                Extraction Complete
              </h3>
              <span className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {results.length} Leads Added to CRM
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {results.map((lead, i) => (
                <div
                  key={i}
                  className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-200">
                        {lead.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lead.company}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      Score: {lead.score}
                    </div>
                  </div>
                  <div className="text-sm font-mono text-gray-400 bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                    {lead.phone}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>Enter a query and location to begin extraction.</p>
          </div>
        )}
      </div>
    </div>
  );
}
