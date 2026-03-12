import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ICP } from "../../../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface OnboardingProps {
  onComplete: (icp: ICP) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Welcome to OpenCloser. I'm your AI Sales Architect. To engineer your bespoke Ideal Customer Profile (ICP) and prime your dialing agent with the SPIN/Challenger methodology, I need to understand your ecosystem. What exactly does your company do, and who is your most lucrative customer?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const data: any = await invoke('process_onboarding_chat', {
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (data.isComplete && data.icp) {
        // AI has enough information
        onComplete(data.icp);
      } else {
        // AI needs more information
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: data.reply,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "Connection to intelligence core disrupted. Please re-transmit.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="flex flex-col h-full glass-card rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-white/[0.05] bg-black/40 backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 px-8 py-6 border-b border-white/[0.05] bg-white/[0.01]">
          <div className="relative">
            <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-md animate-pulse"></div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/30 relative z-10">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Strategic Intelligence Core <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 uppercase tracking-widest">Active</span>
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-widest font-mono">
              Engineering ICP & Sales Vector
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 animate-scale-in max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-900/20"
                  : "bg-[#111] text-indigo-400 border border-indigo-500/20 shadow-indigo-900/10"
                  }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              <div
                className={`rounded-3xl px-6 py-4 text-[14px] leading-relaxed relative group ${msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600/10 to-indigo-600/10 text-white border border-blue-500/20 rounded-tr-sm"
                  : "bg-white/[0.02] text-gray-300 border border-white/[0.05] rounded-tl-sm hover:border-white/10 transition-colors"
                  }`}
              >
                {msg.content}
                <div className={`absolute top-4 ${msg.role === "user" ? "-right-2 w-2 h-2 bg-blue-500/20" : "-left-2 w-2 h-2 bg-white/5"} rotate-45`}></div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 animate-fade-in max-w-[85%] mr-auto">
              <div className="w-10 h-10 rounded-2xl bg-[#111] text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/20 animate-pulse"></div>
                <Bot className="w-4 h-4 relative z-10" />
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl rounded-tl-sm px-6 py-5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-400/80 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400/80 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white/[0.01] border-t border-white/[0.05]">
          <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Transmit intelligence..."
              disabled={isLoading}
              className="w-full bg-black/60 border border-white/10 rounded-2xl pl-6 pr-16 py-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all duration-300 disabled:opacity-50 placeholder:text-gray-600 relative z-10"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-3 bg-white border border-white/10 hover:bg-gray-200 text-black disabled:bg-white/5 disabled:border-white/5 disabled:text-gray-600 rounded-xl transition-all duration-300 z-20 flex items-center justify-center active:scale-95 shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Secure Neural Link Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

