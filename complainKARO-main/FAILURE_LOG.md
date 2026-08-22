# FAILURE_LOG.md — VocalLabs Triage System

This document is an honest record of what doesn't fully work yet and what would be required to fix it.

---

## 1. whisper.cpp — Requires Manual Binary Setup

**What's broken**: The transcription service shells out to a `whisper` binary. This binary is NOT bundled and must be compiled or downloaded separately by the developer. If `WHISPER_BINARY_PATH` points to a missing binary, the service falls back to `[transcription unavailable]` and the ticket is still created — but with no useful text.

**Impact**: Medium. Ticket creation pipeline still works; text search and classification degrade.

**Fix**: Bundle a pre-compiled whisper binary for Windows/Linux/macOS via GitHub Releases in a `bin/` directory and auto-detect OS at runtime. Or integrate `nodejs-whisper` as an optional peer dependency with a build-check on startup.

---

## 2. pgvector Dedup — Disabled Without Extension

**What's broken**: If PostgreSQL does not have the `pgvector` extension installed, all dedup searches are silently skipped. Duplicate complaints create new tickets instead of incrementing `report_count`.

**Impact**: Medium. All other features work. A warning is logged but the user sees no indication.

**Fix**: Add a health check endpoint that reports whether pgvector is available. Show a banner in the warden dashboard when dedup is disabled. Provide a Docker Compose file with `pgvector/pgvector:pg16` image to make setup zero-friction.

---

## 3. Gemini Embeddings — Dedup Requires API Key

**What's broken**: Even with pgvector installed, dedup only works if `GEMINI_API_KEY` is valid and the embedding call succeeds. Without embeddings, no vectors are stored and similarity search always returns null.

**Impact**: Medium (dedup is a core requirement). Keyword fallback prevents ticket creation failure, but clustering is non-functional.

**Fix**: Add a lightweight local embedding fallback (e.g., `@xenova/transformers` with `all-MiniLM-L6-v2` running in-process) as an offline-capable embedding option, analogous to whisper.cpp for STT.

---

## 4. Audio Compatibility — WebM on Safari/iOS

**What's broken**: Safari does not support `audio/webm` in MediaRecorder. The code falls back to `audio/ogg` but whisper.cpp may not accept Ogg natively on all platforms without ffmpeg conversion.

**Impact**: Low (hostels typically use Android/Chrome). iOS users would fail to record.

**Fix**: Add a server-side ffmpeg conversion step before passing audio to whisper. Gate it behind a check for ffmpeg binary presence (similar to whisper binary check).

---

## 5. Seed Script — Idempotency

**What's broken**: Running `npm run seed` more than once will fail with a unique-constraint error on `phone` or silently create duplicate warden accounts. There is partial handling but it's fragile.

**Impact**: Low. Affects development workflow only.

**Fix**: Use `INSERT … ON CONFLICT DO NOTHING` or a proper upsert with `eq(students.phone, phone)` pre-check before inserting.

---

## 6. No Pagination in Student View

**What's broken**: The student dashboard loads all of the student's tickets in one request. With many complaints over time, this could be slow.

**Impact**: Very low for a hostel context (most students will have < 20 tickets).

**Fix**: Add a cursor-based or offset-based pagination hook in `useMyTickets`.

---

## 7. WebSocket Authentication — Token in Query String

**What's broken**: The WebSocket token is passed in the query string (`?token=JWT`). This can appear in server access logs.

**Impact**: Low in a local/intranet deployment; higher in a public cloud deployment.

**Fix**: Use a one-time short-lived WS handshake token exchanged via a REST call (`POST /api/ws-token`) and pass it in the query string. The real JWT never leaves the Authorization header for REST.

---

## 8. No End-to-End Tests

**What's not implemented**: There are no automated integration or E2E tests (e.g., Vitest + Supertest for the pipeline, Playwright for the UI).

**Fix**: Add:
- Supertest tests for `POST /api/complaints` with a mock whisper binary
- A test fixture that injects a known-good embedding to verify dedup triggers
- Playwright tests verifying the WebSocket ticket appears in the warden dashboard without a page refresh

---

## Summary Table

| # | Issue | Severity | Effort to Fix |
|---|-------|----------|---------------|
| 1 | whisper.cpp binary not bundled | Medium | 2–4h |
| 2 | pgvector dedup disabled without extension | Medium | 1–2h |
| 3 | Dedup needs Gemini key (no local embedding fallback) | Medium | 4–8h |
| 4 | Safari/iOS audio format incompatibility | Low | 2–4h |
| 5 | Seed script not idempotent | Low | 30min |
| 6 | No student ticket pagination | Low | 1h |
| 7 | WS token in query string | Low | 1–2h |
| 8 | No automated tests | High (for production) | 8–16h |
