import { pool } from '../db';

const SIMILARITY_THRESHOLD = parseFloat(process.env.DEDUP_SIMILARITY_THRESHOLD || '0.85');
const WINDOW_HOURS = parseInt(process.env.DEDUP_WINDOW_HOURS || '72', 10);

let pgvectorAvailable: boolean | null = null;

async function checkPgvectorAvailability(): Promise<boolean> {
  if (pgvectorAvailable !== null) return pgvectorAvailable;
  const client = await pool.connect();
  try {
    await client.query("SELECT 'test'::vector(1);");
    pgvectorAvailable = true;
  } catch {
    pgvectorAvailable = false;
    console.warn(JSON.stringify({
      level: 'warn',
      stage: 'dedup',
      status: 'pgvector_unavailable',
      message: 'pgvector not installed — dedup similarity search disabled. Tickets will not be clustered.',
    }));
  } finally {
    client.release();
  }
  return pgvectorAvailable;
}

export interface DedupMatch {
  ticketId: string;
  similarity: number;
}

/**
 * Searches for an existing open ticket similar to the given embedding.
 * Uses pgvector cosine distance within a rolling time window.
 *
 * @param embedding  768-dim float array from Gemini
 * @returns  Matching ticket ID + similarity score, or null if no match found
 */
export async function findSimilarTicket(embedding: number[]): Promise<DedupMatch | null> {
  const available = await checkPgvectorAvailability();
  if (!available) {
    console.log(JSON.stringify({
      level: 'info',
      stage: 'dedup',
      status: 'skipped',
      reason: 'pgvector_unavailable',
    }));
    return null;
  }

  const client = await pool.connect();
  try {
    const vectorStr = `[${embedding.join(',')}]`;
    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    // Find open tickets within the time window with similarity above threshold
    const result = await client.query<{ ticket_id: string; similarity: number }>(`
      SELECT
        te.ticket_id,
        1 - (te.embedding <=> $1::vector) AS similarity
      FROM ticket_embeddings te
      JOIN tickets t ON te.ticket_id = t.id
      WHERE
        t.status IN ('open', 'flagged')
        AND t.created_at >= $2
        AND (1 - (te.embedding <=> $1::vector)) >= $3
      ORDER BY similarity DESC
      LIMIT 1;
    `, [vectorStr, windowStart, SIMILARITY_THRESHOLD]);

    if (result.rows.length === 0) {
      console.log(JSON.stringify({
        level: 'info',
        stage: 'dedup',
        status: 'no_match',
        threshold: SIMILARITY_THRESHOLD,
        window_hours: WINDOW_HOURS,
      }));
      return null;
    }

    const match = result.rows[0];
    console.log(JSON.stringify({
      level: 'info',
      stage: 'dedup',
      status: 'match_found',
      matched_ticket_id: match.ticket_id,
      similarity: match.similarity,
      threshold: SIMILARITY_THRESHOLD,
    }));

    return { ticketId: match.ticket_id, similarity: match.similarity };
  } catch (err: any) {
    console.error(JSON.stringify({
      level: 'error',
      stage: 'dedup',
      status: 'query_failed',
      error: err.message,
    }));
    return null;
  } finally {
    client.release();
  }
}

/**
 * Stores a ticket's embedding in the ticket_embeddings table.
 */
export async function storeEmbedding(ticketId: string, embedding: number[]): Promise<void> {
  const available = await checkPgvectorAvailability();
  if (!available) return;

  const client = await pool.connect();
  try {
    const vectorStr = `[${embedding.join(',')}]`;
    await client.query(
      `INSERT INTO ticket_embeddings (ticket_id, embedding) VALUES ($1, $2::vector)
       ON CONFLICT (ticket_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
      [ticketId, vectorStr]
    );
  } catch (err: any) {
    console.error(JSON.stringify({
      level: 'error',
      stage: 'dedup',
      status: 'store_failed',
      error: err.message,
    }));
  } finally {
    client.release();
  }
}
