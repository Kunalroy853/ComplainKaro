import 'dotenv/config';
import { db, pool } from './db';
import { students, wardens, tickets, ticketEmbeddings } from './db/schema';
import bcrypt from 'bcryptjs';
import { generateEmbedding } from './services/embedding';
import { storeEmbedding } from './services/dedup';

/**
 * Sample Hinglish complaint transcripts.
 * Includes near-duplicate pairs to verify dedup clustering.
 */
const sampleTranscripts = [
  {
    // 1 — WiFi complaint (will be duplicated by #2)
    category: 'wifi' as const,
    urgencyScore: 3,
    confidenceScore: 0.88,
    transcript: 'Bhai yaar internet bilkul nahi chal raha room 204 mein, subah se net nahi hai, assignment submit karna tha aaj. WiFi router ka signal hi nahi aa raha. Please fix karo jaldi.',
    student: 0,
  },
  {
    // 2 — Near-duplicate of #1 (same WiFi issue, slightly different wording)
    category: 'wifi' as const,
    urgencyScore: 3,
    confidenceScore: 0.85,
    transcript: 'Net nahi chal raha room 204 mein, wifi signal nahi aa raha pichle 6 ghante se. Bahut urgent hai, online exam hai kal. Please internet fix karo.',
    student: 1,
  },
  {
    // 3 — Electricity issue
    category: 'electricity' as const,
    urgencyScore: 4,
    confidenceScore: 0.92,
    transcript: 'Room 301 mein light nahi aa rahi raat se. Fan bhi band hai. Ghar mein bahut garmi ho gayi hai, so nahi sakta. Bijli wale ko bolo please, urgent hai.',
    student: 0,
  },
  {
    // 4 — Water complaint
    category: 'water' as const,
    urgencyScore: 5,
    confidenceScore: 0.91,
    transcript: 'Bhai bathroom mein paani hi nahi aa raha 2 din se, toilet flush karna bhi mushkil ho gaya hai. Ye emergency hai, please paani ka issue resolve karo aaj hi.',
    student: 1,
  },
  {
    // 5 — Food quality
    category: 'food' as const,
    urgencyScore: 2,
    confidenceScore: 0.79,
    transcript: 'Mess ka khana bahut kharab tha aaj, dal mein kuch tha shayad, smell aa rahi thi. Quality bilkul theek nahi thi, thoda dhyan do please khane ki quality par.',
    student: 0,
  },
  {
    // 6 — Hygiene
    category: 'hygiene' as const,
    urgencyScore: 3,
    confidenceScore: 0.83,
    transcript: 'Common washroom mein safai nahi ho rahi regular, bahut ganda ho gaya hai. Cockroach bhi dikhe kuch din pehle. Please sweeping aur cleaning karwao proper tarike se.',
    student: 1,
  },
  {
    // 7 — Security issue (high urgency)
    category: 'security' as const,
    urgencyScore: 5,
    confidenceScore: 0.95,
    transcript: 'Bhai main gate ka lock tuta hua hai 3 din se. Koi bhi andar aa sakta hai raat ko. Bahut unsafe feel ho raha hai. Please security guard ko bolo aur lock repair karwao immediately.',
    student: 0,
  },
  {
    // 8 — Maintenance (low confidence — will be flagged for manual review)
    category: 'maintenance' as const,
    urgencyScore: 2,
    confidenceScore: 0.42,
    transcript: 'Room mein kuch tuta hai, window ya door shayad, thoda ajeeb lag raha hai, fix karo.',
    student: 1,
  },
];

async function seed() {
  console.log(JSON.stringify({ level: 'info', stage: 'seed', status: 'start' }));

  // Create sample students
  const studentData = [
    { name: 'Rahul Sharma', roomNumber: '204', phone: '9876543210', password: 'student123' },
    { name: 'Priya Singh', roomNumber: '301', phone: '9876543211', password: 'student123' },
  ];
  const wardenData = [
    { name: 'Mr. Verma', hostelBlock: 'Block A', password: 'warden123' },
  ];

  // Upsert students
  const createdStudents = [];
  for (const s of studentData) {
    const passwordHash = await bcrypt.hash(s.password, 10);
    const existing = await db.select().from(students).limit(1);
    // Clear and re-insert for clean seed
    if (existing.length === 0) {
      const [st] = await db.insert(students).values({ name: s.name, roomNumber: s.roomNumber, phone: s.phone, passwordHash }).returning();
      createdStudents.push(st);
    } else {
      try {
        const [st] = await db.insert(students).values({ name: s.name, roomNumber: s.roomNumber, phone: s.phone, passwordHash }).returning();
        createdStudents.push(st);
      } catch {
        const [st] = await db.select().from(students).limit(2);
        createdStudents.push(st);
      }
    }
  }

  // Ensure we have 2 students
  if (createdStudents.length < 2) {
    const allStudents = await db.select().from(students).limit(2);
    while (createdStudents.length < 2) createdStudents.push(allStudents[createdStudents.length] || allStudents[0]);
  }

  // Upsert warden
  for (const w of wardenData) {
    const passwordHash = await bcrypt.hash(w.password, 10);
    try {
      await db.insert(wardens).values({ name: w.name, hostelBlock: w.hostelBlock, passwordHash });
    } catch { /* already exists */ }
  }

  console.log(JSON.stringify({ level: 'info', stage: 'seed', status: 'users_created', count: createdStudents.length }));

  // Insert tickets
  for (let i = 0; i < sampleTranscripts.length; i++) {
    const t = sampleTranscripts[i];
    const student = createdStudents[t.student] || createdStudents[0];
    const needsManualReview = t.confidenceScore < 0.6;
    const status = needsManualReview ? 'flagged' : 'open';

    const [ticket] = await db.insert(tickets).values({
      studentId: student.id,
      audioUrl: `local://seed/complaint_${i + 1}.webm`,
      transcript: t.transcript,
      category: t.category,
      urgencyScore: t.urgencyScore,
      confidenceScore: t.confidenceScore,
      status: status as any,
      reportCount: 1,
      needsManualReview: needsManualReview ? 1 : 0,
      classificationSource: 'seed',
    }).returning();

    console.log(JSON.stringify({
      level: 'info',
      stage: 'seed',
      ticket_index: i + 1,
      ticket_id: ticket.id,
      category: t.category,
      urgency: t.urgencyScore,
      confidence: t.confidenceScore,
      status,
    }));

    // Try to generate embeddings for dedup demo (requires Gemini key)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      const embedding = await generateEmbedding(t.transcript);
      if (embedding) {
        await storeEmbedding(ticket.id, embedding);
        console.log(JSON.stringify({ level: 'info', stage: 'seed', ticket_id: ticket.id, status: 'embedding_stored' }));
      }
    }
  }

  // Show dedup candidates
  console.log(JSON.stringify({
    level: 'info',
    stage: 'seed',
    status: 'done',
    note: 'Tickets #1 and #2 are near-duplicates (same WiFi complaint, room 204). Submit one via API to trigger dedup clustering.',
    accounts: {
      student_1: { phone: '9876543210', password: 'student123' },
      student_2: { phone: '9876543211', password: 'student123' },
      warden: { name: 'Mr. Verma', password: 'warden123' },
    },
  }));

  await pool.end();
}

seed().catch((err) => {
  console.error(JSON.stringify({ level: 'error', stage: 'seed', error: err.message }));
  process.exit(1);
});
