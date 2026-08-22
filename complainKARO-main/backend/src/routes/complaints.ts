import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth';
import { storeAudio } from '../services/storage';
import { transcribeAudio } from '../services/transcription';
import { classifyTranscript } from '../services/classification';
import { generateEmbedding } from '../services/embedding';
import { findSimilarTicket, storeEmbedding } from '../services/dedup';
import { pushNewTicket, pushDuplicateTicket } from '../services/websocket';
import { db } from '../db';
import { tickets } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// Multer — hold audio in memory (max 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are accepted'));
    }
  },
});

/**
 * POST /api/complaints
 * Full pipeline: store → transcribe → classify → embed → dedup → persist → push
 */
router.post(
  '/',
  requireAuth,
  requireRole('student'),
  upload.single('audio'),
  async (req: Request, res: Response): Promise<void> => {
    const pipelineStart = Date.now();

    if (!req.file) {
      res.status(400).json({ error: 'Audio file is required (field name: audio)' });
      return;
    }

    const studentId = req.user!.userId;
    const mimeType = req.file.mimetype;
    const browserTranscript = req.body.browserTranscript as string | undefined;

    try {
      // ── 1. Store audio ────────────────────────────────────────────────────
      const { url: audioUrl, provider } = await storeAudio(req.file.buffer, mimeType);

      // ── 2. Transcribe ─────────────────────────────────────────────────────
      const { transcript, source: transcriptSource, latencyMs: transcriptLatency } =
        await transcribeAudio(req.file.buffer, mimeType, browserTranscript);

      // ── 3. Classify ───────────────────────────────────────────────────────
      const classification = await classifyTranscript(transcript);

      // ── 4. Generate embedding ─────────────────────────────────────────────
      const embedding = await generateEmbedding(transcript);

      // ── 5. Dedup check ────────────────────────────────────────────────────
      let dedupMatch = null;
      if (embedding) {
        dedupMatch = await findSimilarTicket(embedding);
      }

      // ── 6. Persist ticket ─────────────────────────────────────────────────
      let ticket;
      let isDuplicate = false;

      if (dedupMatch) {
        // Mark as duplicate, increment parent's report_count
        isDuplicate = true;

        await db
          .update(tickets)
          .set({ reportCount: sql`${tickets.reportCount} + 1` })
          .where(eq(tickets.id, dedupMatch.ticketId));

        const [dupTicket] = await db
          .insert(tickets)
          .values({
            studentId,
            audioUrl,
            transcript,
            category: classification.category,
            urgencyScore: classification.urgencyScore,
            confidenceScore: classification.confidenceScore,
            status: 'duplicate',
            clusterId: dedupMatch.ticketId,
            reportCount: 1,
            needsManualReview: classification.needsManualReview ? 1 : 0,
            classificationSource: classification.source,
          })
          .returning();

        ticket = dupTicket;

        // Fetch updated parent ticket to push
        const [parentTicket] = await db
          .select()
          .from(tickets)
          .where(eq(tickets.id, dedupMatch.ticketId))
          .limit(1);

        pushDuplicateTicket(parentTicket, dupTicket.id);

        console.log(JSON.stringify({
          level: 'info',
          stage: 'pipeline',
          status: 'duplicate_created',
          new_ticket_id: dupTicket.id,
          parent_ticket_id: dedupMatch.ticketId,
          similarity: dedupMatch.similarity,
          total_latency_ms: Date.now() - pipelineStart,
        }));
      } else {
        // New unique ticket
        const status = classification.needsManualReview ? 'flagged' : 'open';

        const [newTicket] = await db
          .insert(tickets)
          .values({
            studentId,
            audioUrl,
            transcript,
            category: classification.category,
            urgencyScore: classification.urgencyScore,
            confidenceScore: classification.confidenceScore,
            status,
            reportCount: 1,
            needsManualReview: classification.needsManualReview ? 1 : 0,
            classificationSource: classification.source,
          })
          .returning();

        ticket = newTicket;

        // Store embedding for future dedup
        if (embedding) {
          await storeEmbedding(newTicket.id, embedding);
        }

        pushNewTicket(newTicket);

        console.log(JSON.stringify({
          level: 'info',
          stage: 'pipeline',
          status: 'ticket_created',
          ticket_id: newTicket.id,
          category: classification.category,
          urgency: classification.urgencyScore,
          confidence: classification.confidenceScore,
          needs_review: classification.needsManualReview,
          transcript_source: transcriptSource,
          storage_provider: provider,
          total_latency_ms: Date.now() - pipelineStart,
        }));
      }

      res.status(201).json({
        ticket,
        isDuplicate,
        pipeline: {
          transcriptSource,
          classificationSource: classification.source,
          embeddingGenerated: !!embedding,
          dedupChecked: !!embedding,
        },
      });
    } catch (err: any) {
      console.error(JSON.stringify({
        level: 'error',
        stage: 'pipeline',
        status: 'unhandled_error',
        error: err.message,
        total_latency_ms: Date.now() - pipelineStart,
      }));
      res.status(500).json({ error: 'Failed to process complaint. Please try again.' });
    }
  }
);

export default router;
