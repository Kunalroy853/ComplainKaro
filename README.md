# 🏠 ComplainKARO — Hostel Complaint Triage System

> **Speak your problem. We turn it into an actionable ticket.**

ComplainKARO is a voice-first hostel complaint management system that allows students to report problems using their voice instead of filling out lengthy forms.

The system converts voice complaints into structured tickets, classifies them using AI, detects similar/duplicate complaints, and sends them to a real-time warden dashboard.

## 🚀 Live Demo

**Frontend:** https://complain-karo-sooty.vercel.app/

## 🎯 Problem

Hostel complaints are often reported through calls, WhatsApp messages, paper registers, or verbal communication.

This creates problems such as:

* Unstructured complaints
* Duplicate complaints
* No clear prioritization
* Delayed response
* Difficulty tracking complaint status
* Complaints being lost when connectivity is poor

## 💡 Solution

ComplainKARO provides a simple voice-based reporting system.

A student can simply say:

> "Room 204 mein WiFi nahi chal raha hai."

The system processes the complaint and creates a structured ticket containing information such as:

* Complaint description
* Category
* Priority
* Location
* Status
* Duplicate information

The ticket is then displayed on the warden dashboard in real time.

## ✨ Key Features

### 🎙️ Voice Complaint

Students can record their complaints directly from the browser using the microphone.

### 🤖 AI Classification

The transcribed complaint is analyzed to identify relevant information such as category, priority, and location.

### 🔎 Duplicate Detection

Similar complaints can be identified using semantic similarity, helping the warden understand when multiple students are reporting the same underlying issue.

### 📡 Offline Queue

If the network is temporarily unavailable, complaints can be queued locally and synchronized when connectivity returns.

### ⚡ Real-Time Warden Dashboard

New complaints are pushed to the warden dashboard using WebSockets without requiring a page refresh.

### 🔐 Role-Based Authentication

The system provides separate student and warden experiences with protected API operations.

### 🔄 Complaint Tracking

Students can track the status of their complaints while wardens can update complaint status.

## 🏗️ Architecture

```text
Student Browser
      │
      ├── Voice Recording
      └── IndexedDB Offline Queue
              │
              ▼
       Express / Node.js
              │
       ┌──────┼───────────────┐
       ▼      ▼               ▼
   Whisper   Gemini       Embeddings
   Speech    AI           Generation
      │       │               │
      └───────┴───────┬───────┘
                      ▼
               Duplicate Check
                 pgvector
                      │
                      ▼
                PostgreSQL
                      │
                      ▼
                 WebSocket
                      │
                      ▼
              Warden Dashboard
```

## 🛠️ Tech Stack

### Frontend

* React
* JavaScript / TypeScript
* MediaRecorder API
* IndexedDB
* WebSocket
* CSS / UI components

### Backend

* Node.js
* Express
* TypeScript
* REST APIs
* WebSocket

### AI

* Whisper.cpp — local speech-to-text
* Google Gemini — complaint classification
* Gemini embeddings — semantic similarity

### Database

* PostgreSQL
* Drizzle ORM
* pgvector

### Storage

* Cloudinary
* Local storage fallback

### Authentication

* JWT

## 🔄 Complaint Processing Flow

```text
1. Student records voice complaint
              ↓
2. Audio is uploaded
              ↓
3. Whisper.cpp transcribes audio
              ↓
4. Gemini classifies complaint
              ↓
5. Embedding is generated
              ↓
6. Existing complaints are checked
              ↓
7. Duplicate is detected if similarity is high
              ↓
8. Ticket is stored in PostgreSQL
              ↓
9. WebSocket sends ticket to warden
              ↓
10. Warden reviews and resolves complaint
```

## 🖥️ Screenshots

### Student Dashboard

Add your student dashboard screenshot here.

### Voice Complaint

Add your microphone/recording screen here.

### Complaint Ticket

Add a screenshot showing the generated ticket.

### Duplicate Detection

Add a screenshot showing a duplicate/similar complaint.

### Warden Dashboard

Add your live warden dashboard screenshot here.

## 🧪 Example Complaint

### Student Input

> "Room 204 mein WiFi kal se bilkul nahi chal raha hai."

### Generated Ticket

```text
Category: Internet / WiFi
Location: Room 204
Priority: High
Status: Open
```

If a similar complaint already exists, the system can associate the new complaint with the existing issue.

## 📦 Installation

### Prerequisites

* Node.js 18+
* PostgreSQL 14+
* pgvector
* Whisper.cpp
* Gemini API key

### Clone Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd ComplainKARO
```

### Backend

```bash
cd backend
npm install
```

Create a `.env` file using `.env.example`.

Example:

```env
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
WHISPER_BINARY_PATH=path_to_whisper_binary
WHISPER_MODEL_PATH=path_to_whisper_model
DEDUP_SIMILARITY_THRESHOLD=0.85
MANUAL_REVIEW_THRESHOLD=0.60
```

Run migrations:

```bash
npm run db:migrate
```

Seed sample data:

```bash
npm run seed
```

Start backend:

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔐 Environment Variables

Never commit your real `.env` file.

Use `.env.example` to document required environment variables.

Important variables include:

```text
DATABASE_URL
JWT_SECRET
GEMINI_API_KEY
WHISPER_BINARY_PATH
WHISPER_MODEL_PATH
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
DEDUP_SIMILARITY_THRESHOLD
MANUAL_REVIEW_THRESHOLD
```

## 🧠 Design Decisions

### Why Voice?

Voice allows students to report problems naturally without navigating complicated forms.

### Why Whisper.cpp?

Speech transcription can run locally without depending on a cloud speech-to-text service.

### Why Embeddings?

Two complaints can describe the same problem using completely different words. Semantic embeddings help identify these similar complaints.

### Why WebSockets?

The warden dashboard needs real-time updates, so WebSockets eliminate the need for constant page refreshes or polling.

### Why IndexedDB?

It allows complaints to be temporarily stored in the browser when connectivity is unavailable.

## ⚠️ Limitations

The current version depends on Gemini for AI classification and embedding generation, so the entire system is not completely offline.

Semantic similarity can also produce false positives when complaints are worded similarly but refer to different locations.

## 🔮 Future Improvements

* Multi-language speech support
* Local LLM for completely offline AI processing
* WhatsApp/Telegram complaint integration
* Automatic assignment to maintenance staff
* Complaint analytics and trend detection
* SLA tracking
* Push notifications
* Heatmap of recurring hostel problems
* Admin analytics dashboard
* Better duplicate detection using location + category + time
* Voice-based complaint status queries

## 👥 Team

**Team Name:** [Your Team Name]

### Contributors

* Kunal Roy — Frontend
* [Member 2] — Backend
* [Member 3] — AI / ML
* [Member 4] — Database / Integration

## 📄 License

This project is created for educational and hackathon purposes.
