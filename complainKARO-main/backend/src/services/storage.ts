import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ─── Check if Cloudinary is configured ───────────────────────────────────────
function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// ─── Local disk storage ───────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function saveToLocalDisk(
  buffer: Buffer,
  filename: string
): Promise<string> {
  await ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filePath, buffer);
  const baseUrl = process.env.FRONTEND_URL?.replace('5173', '4000') || 'http://localhost:4000';
  return `${baseUrl}/uploads/${filename}`;
}

// ─── Cloudinary storage ───────────────────────────────────────────────────────
async function saveToCloudinary(buffer: Buffer, publicId: string): Promise<string> {
  // Dynamic import so missing credentials don't crash at startup
  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Cloudinary treats audio as "video"
        public_id: publicId,
        folder: 'hostel-complaints',
        timeout: 15000,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface StorageResult {
  url: string;
  provider: 'cloudinary' | 'local';
}

/**
 * Stores an audio buffer either on Cloudinary (if configured) or local disk.
 * Env-flag gated: requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 */
export async function storeAudio(buffer: Buffer, mimeType: string): Promise<StorageResult> {
  const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  const filename = `complaint_${uuidv4()}.${ext}`;

  if (isCloudinaryConfigured()) {
    try {
      const url = await saveToCloudinary(buffer, filename.replace(`.${ext}`, ''));
      console.log(JSON.stringify({
        level: 'info',
        stage: 'storage',
        provider: 'cloudinary',
        status: 'uploaded',
        filename,
      }));
      return { url, provider: 'cloudinary' };
    } catch (err: any) {
      console.error(JSON.stringify({
        level: 'error',
        stage: 'storage',
        provider: 'cloudinary',
        status: 'failed',
        error: err.message,
        fallback: 'local_disk',
      }));
      // Fall through to local disk
    }
  }

  const url = await saveToLocalDisk(buffer, filename);
  console.log(JSON.stringify({
    level: 'info',
    stage: 'storage',
    provider: 'local',
    status: 'saved',
    filename,
  }));
  return { url, provider: 'local' };
}
