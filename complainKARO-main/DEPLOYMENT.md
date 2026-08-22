# 🚀 ComplainKARO — Simple No-Docker Deployment Guide

Deploy the entire **ComplainKARO** website online for free **without Docker** using **Vercel** (Frontend), **Render** (Backend API & WebSockets), and **Neon** (PostgreSQL Database).

---

## 🔑 All Required Environment Variables

| Variable | Where to set | Recommended Value |
|----------|--------------|-------------------|
| `DATABASE_URL` | Render Environment | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET` | Render Environment | Min 32 random chars (e.g. `9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c`) |
| `GEMINI_API_KEY` | Render Environment | Get free key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | Render Environment | `gemini-2.0-flash-exp` |
| `GEMINI_EMBEDDING_MODEL` | Render Environment | `text-embedding-004` |
| `FRONTEND_URL` | Render Environment | Your live Vercel URL (e.g. `https://complainkaro.vercel.app`) |
| `NODE_ENV` | Render Environment | `production` |
| `VITE_API_URL` | Vercel Environment | Your live Render backend URL (e.g. `https://complainkaro-api.onrender.com`) |

---

## 🛠️ Step-by-Step Deployment (No Docker Needed)

### 1️⃣ Database (Free Neon PostgreSQL)
1. Sign up for free at [Neon.tech](https://neon.tech) (or [Supabase.com](https://supabase.com)).
2. Create a new database named `complainkaro`.
3. Copy your connection string (`postgresql://...`).
4. Open the SQL Editor and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

---

### 2️⃣ Backend (Render.com)
1. Push your code to GitHub.
2. Go to [Render.com](https://render.com) > **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run db:migrate && npm run seed && npm start`
5. Add Environment Variables:
   - `DATABASE_URL` = *(Your Neon PostgreSQL connection string)*
   - `JWT_SECRET` = `change_me_to_a_long_random_string_at_least_32_chars`
   - `GEMINI_API_KEY` = *(Your Google AI Studio API key)*
   - `FRONTEND_URL` = `https://your-app-name.vercel.app`
   - `NODE_ENV` = `production`
6. Click **Create Web Service**. Render gives you a live URL (e.g. `https://complainkaro-api.onrender.com`).

---

### 3️⃣ Frontend (Vercel)
1. Go to [Vercel.com](https://vercel.com) > **Add New** > **Project**.
2. Select your GitHub repository.
3. Set settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
4. Add Environment Variable:
   - `VITE_API_URL` = `https://complainkaro-api.onrender.com`
5. Click **Deploy**. Your website is live at `https://your-app-name.vercel.app`!
