# OpenCloser — AI-Powered Sales Development Representative

<div align="center">

![OpenCloser](https://img.shields.io/badge/OpenCloser-AI%20SDR-6366f1?style=for-the-badge&logo=robot&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=for-the-badge&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Rust](https://img.shields.io/badge/Rust-Backend-000000?style=for-the-badge&logo=rust&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)

**The open-source AI sales agent that lives on your desktop.**  
Autonomous lead generation, intelligent cold calling, and real-time objection handling — all running locally on your machine.

</div>

---

## ✨ Features

### 🎯 Intelligent Lead Generation
- AI-powered ICP (Ideal Customer Profile) generation using SPIN & Challenger sales frameworks
- Autonomous lead hunting with scoring and qualification
- Full local-first CRM with Kanban pipeline management

### 📞 AI-Powered Calling
- Real-time AI voice agent powered by Google Gemini
- Virtual audio bridge for phone integration (Windows Phone Link / Mac Continuity)
- Live transcription and conversation intelligence
- Power dialing mode for high-volume outreach

### 🧠 Smart Sales Intelligence  
- Post-call AI debrief with sentiment analysis
- Objection sparring trainer — practice handling tough objections before real calls
- Call analytics dashboard with conversion metrics
- AI-generated follow-up emails

### 🎨 Premium Desktop Experience
- Native desktop app via Tauri 2.0 — fast, secure, lightweight
- Awwwards-level glassmorphic UI with micro-animations
- Fully customizable AI persona (voice, tone, personality, pacing)
- Dark-mode-first design with premium aesthetics

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/start/prerequisites/)

### Installation

```bash
# Clone the repository
git clone https://github.com/issacops/opencloser.git
cd opencloser

# Install dependencies
npm install

# Run the desktop app
npm run tauri dev
```

### Environment Setup

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note:** You need a [Google Gemini API key](https://aistudio.google.com/apikey) for the AI features to work.

---

## 🏗️ Architecture

```
opencloser/
├── src/                    # React frontend
│   ├── features/
│   │   ├── crm/           # CRM components (Pipeline, Dashboard, Settings)
│   │   ├── voice/         # Voice AI (War Room, Post-Call Debrief, Objection Trainer)
│   │   ├── hunter/        # Lead hunting engine
│   │   └── onboarding/    # AI onboarding flow (ICP generation)
│   ├── types/             # TypeScript type definitions
│   └── ui/                # Shared UI components
├── src-tauri/             # Rust backend
│   └── src/
│       ├── ai/            # Gemini AI integration
│       ├── db/            # SQLite database layer
│       └── main.rs        # Tauri entry point
└── server/                # Optional Express server
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS |
| **Desktop Runtime** | Tauri 2.0 |
| **Backend** | Rust (native performance) |
| **Database** | SQLite (local-first, no cloud dependency) |
| **AI Engine** | Google Gemini (multimodal) |
| **Voice** | Web Audio API + Virtual Audio Bridge |

---

## 🎙️ Audio Bridge Setup

To enable AI-to-phone calling, OpenCloser uses a virtual audio cable:

- **Windows:** [VB-Cable](https://vb-audio.com/Cable/) (free)
- **macOS:** [BlackHole](https://existential.audio/blackhole/) (free)

The built-in Audio Setup Wizard will guide you through the configuration.

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or documentation improvements.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) — For making native desktop apps accessible
- [Google Gemini](https://deepmind.google/technologies/gemini/) — For the AI backbone
- [Lucide Icons](https://lucide.dev/) — For the beautiful icon set

---

<div align="center">

**Built with ❤️ for sales teams who want an unfair advantage.**

[Report Bug](https://github.com/issacops/opencloser/issues) · [Request Feature](https://github.com/issacops/opencloser/issues)

</div>
