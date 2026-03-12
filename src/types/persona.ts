export type AIVoiceId = "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede" | "Zephyr";

export type SalesFramework = 
  | "SPIN Selling" 
  | "Challenger Sale" 
  | "Sandler System" 
  | "Straight Line Persuasion";

export interface AIPersona {
  voiceId: AIVoiceId;
  language: string;
  framework: SalesFramework;
  emotionalModulation: {
    empathy: number; // 0 (Assertive) to 100 (Understanding)
    energy: number;   // 0 (Calm) to 100 (High-Octane)
    formality: number; // 0 (Casual) to 100 (Strictly Professional)
    pacing: number; // 0 (Deliberate/Slow) to 100 (Rapid-fire)
    interruptionHandling: number; // 0 (Never interrupt) to 100 (Highly interruptible/Conversational)
    dynamicToneShift: boolean; // Whether the AI can dynamically shift tone mid-call based on prospect sentiment
  };
}

export const DEFAULT_PERSONA: AIPersona = {
  voiceId: "Zephyr",
  language: "English (US)",
  framework: "SPIN Selling",
  emotionalModulation: {
    empathy: 75,
    energy: 60,
    formality: 50,
    pacing: 65,
    interruptionHandling: 80,
    dynamicToneShift: true
  }
};
