import 'dotenv/config';
import { pool } from './index';

/**
 * Runs the SQL migration manually to create all tables and extensions.
 * This is used instead of drizzle-kit migrate when running in development
 * without a pre-built migration file.
 */
async function migrate() {
  const client = await pool.connect();
  try {
    console.log(JSON.stringify({ level: 'info', stage: 'migration', status: 'start' }));

    // Enable pgvector extension (may fail silently if not installed — we handle dedup gracefully)
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log(JSON.stringify({ level: 'info', stage: 'migration', status: 'pgvector_enabled' }));
    } catch (err: any) {
      console.warn(JSON.stringify({
        level: 'warn',
        stage: 'migration',
        status: 'pgvector_unavailable',
        message: 'Dedup via pgvector will be disabled. Install pgvector extension for similarity search.',
        error: err.message,
      }));
    }

    // Enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_status AS ENUM ('open', 'duplicate', 'flagged', 'resolved');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        CREATE TYPE ticket_category AS ENUM ('wifi', 'electricity', 'water', 'food', 'hygiene', 'security', 'maintenance', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Students
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        room_number TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // Wardens
    await client.query(`
      CREATE TABLE IF NOT EXISTS wardens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        hostel_block TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // Tickets
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES students(id),
        audio_url TEXT NOT NULL,
        transcript TEXT NOT NULL,
        category ticket_category NOT NULL DEFAULT 'other',
        urgency_score INTEGER NOT NULL DEFAULT 3,
        confidence_score REAL NOT NULL DEFAULT 0.5,
        status ticket_status NOT NULL DEFAULT 'open',
        cluster_id UUID,
        report_count INTEGER NOT NULL DEFAULT 1,
        needs_manual_review INTEGER NOT NULL DEFAULT 0,
        classification_source TEXT NOT NULL DEFAULT 'gemini',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Ticket Embeddings (pgvector)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_embeddings (
        ticket_id UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
        embedding vector(768)
      );
    `).catch(() => {
      // Create without vector type if pgvector not available
      return client.query(`
        CREATE TABLE IF NOT EXISTS ticket_embeddings (
          ticket_id UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
          embedding TEXT
        );
      `);
    });

    // Index for vector similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS ticket_embeddings_embedding_idx
      ON ticket_embeddings USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `).catch(() => {
      // Index creation may fail without pgvector — that's fine
    });

    console.log(JSON.stringify({ level: 'info', stage: 'migration', status: 'done' }));
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(JSON.stringify({ level: 'error', stage: 'migration', error: err.message }));
  process.exit(1);
});
