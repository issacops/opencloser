import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon, Mic, Volume2, Info, CheckCircle2,
  ChevronDown, Sliders, Key, Eye, EyeOff, CheckCheck, AlertTriangle, Zap
} from "lucide-react";
import { PROVIDERS, ProviderId } from "../../voice/lib/providers";

export function SettingsView() {
  // Audio devices
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // API Keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        setPermissionGranted(true);
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          setMics(devices.filter(d => d.kind === "audioinput"));
          setSpeakers(devices.filter(d => d.kind === "audiooutput"));
          const savedMic = localStorage.getItem("preferredMicId");
          const savedSpeaker = localStorage.getItem("preferredSpeakerId");
          if (savedMic) setSelectedMic(savedMic);
          if (savedSpeaker) setSelectedSpeaker(savedSpeaker);
          stream.getTracks().forEach(t => t.stop());
        });
      })
      .catch(console.error);

    // Load stored API keys
    const stored: Record<string, string> = {};
    PROVIDERS.forEach(p => {
      stored[p.apiKeySettingKey] = localStorage.getItem(p.apiKeySettingKey) || "";
      p.extraSettings?.forEach(s => {
        stored[s.key] = localStorage.getItem(s.key) || "";
      });
    });
    setApiKeys(stored);
  }, []);

  const showSaved = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const saveMic = (id: string) => { setSelectedMic(id); localStorage.setItem("preferredMicId", id); showSaved("Mic updated"); };
  const saveSpeaker = (id: string) => { setSelectedSpeaker(id); localStorage.setItem("preferredSpeakerId", id); showSaved("Speaker updated"); };

  const saveApiKey = (storageKey: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [storageKey]: value }));
    localStorage.setItem(storageKey, value);
    showSaved("API key saved");
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasKey = (storageKey: string) => !!(apiKeys[storageKey]?.trim());

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto py-10 px-6 lg:px-10 h-full overflow-y-auto custom-scrollbar animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-surface-bg flex items-center justify-center border border-surface-border shadow-sm">
            <SettingsIcon className="w-7 h-7 text-coral" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">System Configuration</h2>
            <p className="text-ink-secondary text-sm mt-1 font-medium">Voice engine API keys, hardware routing, and audio settings.</p>
          </div>
        </div>
        {savedMessage && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-widest animate-fade-in">
            <CheckCircle2 className="w-4 h-4" /> {savedMessage}
          </div>
        )}
      </div>

      <div className="space-y-8 pb-16">

        {/* ── Voice Engine API Keys ── */}
        <section className="card p-8">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-coral" /> Voice Engine API Keys
          </h3>
          <p className="text-ink-muted text-sm mb-6 font-medium">
            Keys are stored locally in your browser. Never sent to any server.
          </p>

          <div className="space-y-6">
            {PROVIDERS.map(provider => (
              <div key={provider.id} className="rounded-2xl border border-surface-border overflow-hidden">
                {/* Provider Header */}
                <div className="flex items-center gap-3 bg-surface-bg px-6 py-4 border-b border-surface-border">
                  <span className="text-xl">{provider.id === "gemini" ? "🧠" : provider.id === "openai" ? "⚡" : "🎤"}</span>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-ink">{provider.label}</span>
                    <span className="text-[11px] text-ink-muted ml-2">{provider.model}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                    hasKey(provider.apiKeySettingKey)
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-surface-bg border-surface-border text-ink-muted"
                  }`}>
                    {hasKey(provider.apiKeySettingKey)
                      ? <><CheckCheck className="w-3 h-3" /> Configured</>
                      : <><AlertTriangle className="w-3 h-3" /> Not Set</>
                    }
                  </div>
                </div>

                {/* Key Inputs */}
                <div className="p-6 space-y-4">
                  {/* Primary API Key */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-2">
                      {provider.apiKeyLabel}
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys[provider.apiKeySettingKey] ? "text" : "password"}
                        value={apiKeys[provider.apiKeySettingKey] || ""}
                        onChange={e => setApiKeys(prev => ({ ...prev, [provider.apiKeySettingKey]: e.target.value }))}
                        onBlur={e => saveApiKey(provider.apiKeySettingKey, e.target.value)}
                        placeholder={`${provider.id === "gemini" ? "AIza..." : provider.id === "openai" ? "sk-..." : "xi_..."}`}
                        className="w-full bg-surface-bg border border-surface-border rounded-xl px-4 py-3 text-sm font-mono text-ink focus:outline-none focus:border-coral/30 pr-10"
                      />
                      <button
                        onClick={() => toggleShowKey(provider.apiKeySettingKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-smooth"
                      >
                        {showKeys[provider.apiKeySettingKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Extra Settings (e.g. ElevenLabs Agent ID) */}
                  {provider.extraSettings?.map(extra => (
                    <div key={extra.key}>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-2">{extra.label}</label>
                      <div className="relative">
                        <input
                          type={showKeys[extra.key] ? "text" : "password"}
                          value={apiKeys[extra.key] || ""}
                          onChange={e => setApiKeys(prev => ({ ...prev, [extra.key]: e.target.value }))}
                          onBlur={e => saveApiKey(extra.key, e.target.value)}
                          placeholder={extra.placeholder}
                          className="w-full bg-surface-bg border border-surface-border rounded-xl px-4 py-3 text-sm font-mono text-ink focus:outline-none focus:border-coral/30 pr-10"
                        />
                        <button
                          onClick={() => toggleShowKey(extra.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                        >
                          {showKeys[extra.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}

                  {!provider.requiresRelay && (
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Direct browser connection — no server relay needed.
                    </p>
                  )}
                  {provider.requiresRelay && (
                    <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1.5">
                      <Info className="w-3 h-3" /> Routes through local Express relay (port 3000). Key stays on your machine.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Audio Hardware ── */}
        <section className="card p-8">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted flex items-center gap-2 mb-5">
            <Sliders className="w-4 h-4 text-coral" /> Hardware Architecture
          </h3>

          {/* Virtual Cable Info */}
          <div className="mb-7 p-5 rounded-xl bg-coral-light border border-coral/10">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-coral/20 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-coral" />
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">Virtual Audio Routing</h4>
                <p className="text-ink-secondary text-sm leading-relaxed font-medium">
                  For AI audio injection into Phone Link or FaceTime, use a virtual audio cable.
                  Set <span className="font-bold text-ink">Output</span>: CABLE Input · <span className="font-bold text-ink">Input</span>: CABLE Output
                </p>
              </div>
            </div>
          </div>

          {!permissionGranted && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl mb-6">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-red-700 text-sm font-bold">Grant microphone permission to configure audio devices.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-ink-muted uppercase tracking-widest">
                <Mic className="w-4 h-4 text-coral" /> Microphone Input
              </label>
              <div className="relative">
                <select value={selectedMic} onChange={e => saveMic(e.target.value)}
                  className="w-full bg-surface-bg border border-surface-border rounded-xl px-4 py-3 text-sm font-bold text-ink appearance-none hover:border-coral/20 focus:outline-none focus:border-coral/30">
                  <option value="">System Default</option>
                  {mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || `Input (${m.deviceId.slice(0, 8)}...)`}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-ink-muted uppercase tracking-widest">
                <Volume2 className="w-4 h-4 text-coral" /> Speaker / Output
              </label>
              <div className="relative">
                <select value={selectedSpeaker} onChange={e => saveSpeaker(e.target.value)}
                  className="w-full bg-surface-bg border border-surface-border rounded-xl px-4 py-3 text-sm font-bold text-ink appearance-none hover:border-coral/20 focus:outline-none focus:border-coral/30">
                  <option value="">System Default</option>
                  {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || `Output (${s.deviceId.slice(0, 8)}...)`}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted w-4 h-4" />
              </div>
            </div>
          </div>
        </section>

        {/* Audio Engine Info */}
        <section className="card p-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-coral" /> Audio Engine
          </h3>
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-bold text-emerald-800">AudioWorklet Engine Active</div>
              <div className="text-xs text-emerald-600">Zero-latency PCM capture via dedicated audio thread (~10ms). No ScriptProcessorNode.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
