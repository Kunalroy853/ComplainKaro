<div align="center">
  <h1>🎙️ complainKARO</h1>
  <p><strong>An Intelligent, Voice-First Hostel Complaint Triage System</strong></p>
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-complainKARO-38bdf8?style=for-the-badge&logo=vercel)](https://complain-karo-sooty.vercel.app/)
  
  <p>Say goodbye to long queues and messy complaint registers. Just speak, and the AI handles the rest!</p>
</div>

<br />

## 🌟 Overview
**complainKARO** is a modern hostel management application built to seamlessly bridge the gap between students and hostel wardens. By utilizing advanced **Google Generative AI**, students can report issues simply by speaking into their devices. The system automatically transcribes, categorizes, and assigns an urgency score to the complaint before delivering it in real-time to the warden's dashboard.

**Try it out live:** [https://complain-karo-sooty.vercel.app/](https://complain-karo-sooty.vercel.app/)

---

## 📸 Screenshots

Here are some glimpses of the application:

<div align="center">
  <img src="SCREENSHOTS/Screenshot%20(2382).png" width="48%" />
  <img src="SCREENSHOTS/Screenshot%20(2383).png" width="48%" />
</div>
<br />
<div align="center">
  <img src="SCREENSHOTS/Screenshot%20(2384).png" width="48%" />
  <img src="SCREENSHOTS/Screenshot%20(2385).png" width="48%" />
</div>
<br />
<div align="center">
  <img src="SCREENSHOTS/Screenshot%202026-08-22%20140235.png" width="48%" />
  <img src="SCREENSHOTS/Screenshot%202026-08-22%20140251.png" width="48%" />
</div>

---

## ✨ Features

- 🎙️ **Voice-First Input:** Students don't need to type out long paragraphs. They simply click "Record" and speak in Hindi, English, or Hinglish.
- 🧠 **AI-Powered Triage:** Built-in Gemini AI transcribes audio, identifies the category (e.g., WiFi, Electricity, Plumbing), and calculates an Urgency Score.
- ⚡ **Smart Deduplication:** If 5 students complain about the same power outage, the system clusters them into one parent ticket so the warden's dashboard remains clutter-free.
- 📶 **Offline-First Capabilities:** Dropped internet? No problem. The app queues complaints locally and automatically submits them when the connection is restored.
- 👨‍💼 **Kanban Warden Dashboard:** A beautiful, real-time dashboard for wardens to track, review, and resolve issues efficiently.
- 🚀 **Real-Time Updates:** WebSockets ensure the warden sees new tickets the very second they are processed.

---

## 🛠️ Tech Stack

### Client-Side (Frontend)
- **React 19 & Vite:** For a blazing fast, highly responsive user interface.
- **TypeScript:** Ensuring robust, bug-free components.
- **WebSpeech & MediaRecorder APIs:** For native, real-time browser audio processing.
- **Vanilla CSS:** Custom, aesthetic Mac-window style UI with dynamic audio-wave visualizers.

### Server-Side (Backend)
- **Node.js & Express:** Lightweight, scalable server foundation.
- **Google Generative AI (Gemini):** The "brain" handling transcription, text embeddings, and intelligent classification.
- **PostgreSQL & Drizzle ORM:** Type-safe, high-performance data persistence layer.
- **Cloudinary:** Cloud storage for hosting secure audio files.
- **WebSockets (`ws`):** Enabling instant communication between the server and the warden dashboard.

---

## 🏗️ Architecture Workflow

1. **Capture:** Student speaks $\rightarrow$ Frontend records audio & live text.
2. **Ingest:** Audio is securely uploaded to Cloudinary.
3. **Analyze:** Gemini AI processes the context, returning a Category and Urgency Score via structured JSON.
4. **Cluster:** The backend generates a text vector and performs a similarity search in PostgreSQL to group duplicate complaints.
5. **Dispatch:** The parsed data is saved to the DB, and a WebSocket event instantly pings the warden's dashboard.

---

## 📦 Local Setup & Installation

Want to run complainKARO locally? Follow these steps:

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database (Local or Cloud)
- Google Gemini API Key
- Cloudinary Account & Credentials

### 1. Backend Initialization
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup Environment Variables (Create a .env file)
# DATABASE_URL=...
# GEMINI_API_KEY=...
# CLOUDINARY_URL=...
# JWT_SECRET=...

# Push database schema
npm run db:push

# Start the development server
npm run dev
```

### 2. Frontend Initialization
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

---

<div align="center">
  <p>Built with ❤️ for modern hostel management.</p>
</div>
