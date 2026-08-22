import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const execFileAsync = promisify(execFile);

const WHISPER_MODEL = process.env.WHISPER_MODEL_PATH || './models/ggml-base.bin';
const WHISPER_LANGUAGE = process.env.WHISPER_LANGUAGE || 'auto';

/** Auto-detect available whisper binary path on Windows / Linux / macOS */
async function detectWhisperBinary(): Promise<string | null> {
  const candidates = [
    process.env.WHISPER_BINARY_PATH,
    'whisper',
    'whisper-cli',
    'main',
    './bin/whisper.exe',
    './bin/whisper-cli.exe',
    './bin/main.exe',
    './whisper.exe',
    './main.exe',
    'C:\\whisper\\main.exe',
    'C:\\whisper\\whisper-cli.exe',
  ].filter(Boolean) as string[];

  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ['--help'], { timeout: 3000 });
      return bin;
    } catch {
      // continue
    }
  }
  return null;
}

/**
 * Transcribes audio to text.
 *
 * Priority:
 *  1. browserTranscript — captured live by Web Speech API in Chrome
 *  2. whisper.cpp       — fully offline local transcription
 *  3. empty string      — let the warden see the audio file
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType = 'audio/webm',
  browserTranscript?: string
): Promise<{ transcript: string; source: 'whisper' | 'gemini' | 'browser' | 'unavailable'; latencyMs: number }> {
  const startTime = Date.now();

  // 1. Browser Web Speech API transcript (live-captured while speaking)
  if (browserTranscript && browserTranscript.trim().length > 0) {
    const latencyMs = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      stage: 'transcription',
      status: 'browser_transcript_used',
      latency_ms: latencyMs,
      transcript: browserTranscript.trim(),
    }));
    return { transcript: browserTranscript.trim(), source: 'browser', latencyMs };
  }

  // 2. whisper.cpp local offline transcription
  const whisperBinary = await detectWhisperBinary();
  if (whisperBinary) {
    const ext = mimeType.includes('wav') ? 'wav' : 'webm';
    const tmpDir = os.tmpdir();
    const tmpInput = path.join(tmpDir, `whisper_in_${uuidv4()}.${ext}`);
    const tmpOutput = path.join(tmpDir, `whisper_out_${uuidv4()}`);
    try {
      await fs.writeFile(tmpInput, audioBuffer);
      const args = ['-m', WHISPER_MODEL, '-f', tmpInput, '-o', tmpOutput, '--output-txt', '--no-prints'];
      if (WHISPER_LANGUAGE !== 'auto') args.push('-l', WHISPER_LANGUAGE);
      console.log(JSON.stringify({ level: 'info', stage: 'transcription', status: 'whisper_start', binary: whisperBinary }));
      await execFileAsync(whisperBinary, args, { timeout: 60000, maxBuffer: 10 * 1024 * 1024 });
      const raw = await fs.readFile(`${tmpOutput}.txt`, 'utf-8');
      const clean = raw.trim().replace(/\[\d+:\d+\.\d+ --> \d+:\d+\.\d+\]\s+/g, '');
      const latencyMs = Date.now() - startTime;
      console.log(JSON.stringify({ level: 'info', stage: 'transcription', status: 'whisper_done', latency_ms: latencyMs }));
      return { transcript: clean || '', source: 'whisper', latencyMs };
    } catch (err: any) {
      console.error(JSON.stringify({ level: 'error', stage: 'transcription', status: 'whisper_failed', error: err.message }));
    } finally {
      await fs.unlink(tmpInput).catch(() => {});
      await fs.unlink(`${tmpOutput}.txt`).catch(() => {});
    }
  }

  // 3. No browser transcript, no whisper — return empty so warden sees audio
  const latencyMs = Date.now() - startTime;
  console.warn(JSON.stringify({ level: 'warn', stage: 'transcription', status: 'unavailable', reason: 'no_browser_transcript_no_whisper' }));
  return { transcript: '', source: 'unavailable', latencyMs };
}

