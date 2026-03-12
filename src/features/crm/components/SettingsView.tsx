import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Mic, Volume2, Info, CheckCircle2 } from "lucide-react";

export function SettingsView() {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    // We need to request permission first so device labels aren't empty strings
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        setPermissionGranted(true);
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          setMics(devices.filter((d) => d.kind === "audioinput"));
          setSpeakers(devices.filter((d) => d.kind === "audiooutput"));

          const savedMic = localStorage.getItem("preferredMicId");
          const savedSpeaker = localStorage.getItem("preferredSpeakerId");

          if (savedMic) setSelectedMic(savedMic);
          if (savedSpeaker) setSelectedSpeaker(savedSpeaker);

          // Stop the test stream immediately
          stream.getTracks().forEach((t) => t.stop());
        });
      })
      .catch((e) => {
        console.error("Could not get media permissions", e);
      });
  }, []);

  const showSavedMessage = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const saveMic = (id: string) => {
    setSelectedMic(id);
    localStorage.setItem("preferredMicId", id);
    showSavedMessage("Input routing updated");
  };

  const saveSpeaker = (id: string) => {
    setSelectedSpeaker(id);
    localStorage.setItem("preferredSpeakerId", id);
    showSavedMessage("Output routing updated");
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto py-10 px-4 lg:px-8 custom-scrollbar h-full overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-10 animate-fade-in">
        <div className="flex items-center gap-5">
          <div className="relative">
             <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-md animate-pulse"></div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/30 relative z-10 glow-indigo">
              <SettingsIcon className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              System Configurations
            </h2>
            <p className="text-gray-400 text-sm mt-1.5 font-medium">
              Hardware routing and operational parameters for intelligence cores.
            </p>
          </div>
        </div>

        {savedMessage && (
          <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm font-medium animate-fade-in absolute top-10 right-8 lg:right-12">
            <CheckCircle2 className="w-4 h-4" />
            {savedMessage}
          </div>
        )}
      </div>

      <div className="space-y-8 pb-10">
        {/* Audio Routing Section */}
        <section className="glass-card rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full group-hover:bg-blue-500/10 transition-colors duration-1000 pointer-events-none"></div>
          
          <h3 className="flex items-center gap-2 text-[11px] font-mono text-gray-400 uppercase tracking-[0.15em] mb-6 relative z-10">
            <SettingsIcon className="w-4 h-4 text-gray-500" /> Audio Hardware Architecture
          </h3>

          {/* Educational Note */}
          <div className="mb-8 relative z-10 group/note overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 transition-opacity group-hover/note:opacity-80"></div>
            <div className="relative bg-[#0a0a0a]/50 p-6 backdrop-blur-sm border border-indigo-500/20 rounded-2xl flex gap-4 text-sm text-indigo-100/80 leading-relaxed shadow-lg">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Info className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <strong className="text-indigo-300 text-base mb-1 block">Virtual Audio Routing Required for Native Calls</strong>
                To pass AI audio securely into <strong className="text-white font-medium">Phone Link</strong> or <strong className="text-white font-medium">FaceTime</strong>, a Virtual Audio Cable (VB-Cable or BlackHole) must be actively routed. <br /><br />
                <span className="inline-block bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 mt-1 font-mono text-xs text-indigo-200">
                  <span className="text-indigo-400 font-bold">Protocol:</span> Set "CABLE Input" as Output below. Set "CABLE Output" as Input. Replicate in target calling app.
                </span>
              </div>
            </div>
          </div>

          {!permissionGranted && (
            <div className="text-red-400 text-sm p-4 bg-red-500/10 rounded-xl mb-6 relative z-10 flex items-center gap-3 border border-red-500/20">
               <Info className="w-5 h-5 shrink-0" />
               Hardware access restricted. Please grant microphone permissions to index available audio devices.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Input (Microphone) Selection */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 hover:border-emerald-500/30 transition-colors duration-300 relative overflow-hidden group/input">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent transform origin-left scale-x-0 group-hover/input:scale-x-100 transition-transform duration-500"></div>
              
              <label className="flex items-center gap-3 text-sm font-semibold text-white mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-emerald-400" />
                </div>
                Telemetry Input (Microphone)
              </label>
              
              <div className="relative">
                <select
                  value={selectedMic}
                  onChange={(e) => saveMic(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 transition-premium appearance-none relative z-10"
                >
                  <option value="">System Default Audio Source</option>
                  {mics.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Audio Input (${mic.deviceId.slice(0, 8)}...)`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-20">
                  <SettingsIcon className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-2">
                 <span className="w-1 h-1 rounded-full bg-emerald-500/50"></span>
                 Acoustic capture stream for processing external signals (Prospect voice).
              </p>
            </div>

            {/* Output (Speaker) Selection */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 hover:border-blue-500/30 transition-colors duration-300 relative overflow-hidden group/output">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-transparent transform origin-left scale-x-0 group-hover/output:scale-x-100 transition-transform duration-500"></div>
              
              <label className="flex items-center gap-3 text-sm font-semibold text-white mb-4">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-blue-400" />
                </div>
                Synthetic Output (Speaker)
              </label>
              
              <div className="relative">
                <select
                  value={selectedSpeaker}
                  onChange={(e) => saveSpeaker(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-premium appearance-none relative z-10"
                >
                  <option value="">System Default Output</option>
                  {speakers.map((speaker) => (
                    <option key={speaker.deviceId} value={speaker.deviceId}>
                      {speaker.label || `Audio Output (${speaker.deviceId.slice(0, 8)}...)`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-20">
                  <SettingsIcon className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-2">
                 <span className="w-1 h-1 rounded-full bg-blue-500/50"></span>
                 Neural voice broadcast channel. Route to Virtual Cable for outbound dialing.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
