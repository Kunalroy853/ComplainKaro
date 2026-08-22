import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'embedding-001';
const GEMINI_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '10000', 10);

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Generates a 768-dimensional embedding vector for a given text using Gemini.
 * Returns null if the API call fails — dedup is skipped gracefully in that case.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const startTime = Date.now();

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn(JSON.stringify({
      level: 'warn',
      stage: 'embedding',
      status: 'skipped',
      reason: 'no_api_key',
    }));
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });

    const embeddingCall = model.embedContent({
      content: { parts: [{ text }], role: 'user' },
      taskType: 'SEMANTIC_SIMILARITY' as any,
    });

    const result = await withTimeout(embeddingCall, GEMINI_TIMEOUT_MS, 'gemini_embed');
    const embedding = result.embedding.values;
    const latencyMs = Date.now() - startTime;

    console.log(JSON.stringify({
      level: 'info',
      stage: 'embedding',
      status: 'done',
      latency_ms: latencyMs,
      dimensions: embedding.length,
    }));

    return embedding;
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error(JSON.stringify({
      level: 'error',
      stage: 'embedding',
      status: 'failed',
      latency_ms: latencyMs,
      error: err.message,
    }));
    return null;
  }
}
