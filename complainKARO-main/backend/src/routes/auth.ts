import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { students, wardens } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// ─── Student Register ─────────────────────────────────────────────────────────
router.post('/register/student', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, roomNumber, phone, password } = req.body;
    if (!name || !roomNumber || !phone || !password) {
      res.status(400).json({ error: 'All fields required: name, roomNumber, phone, password' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [student] = await db.insert(students).values({ name, roomNumber, phone, passwordHash }).returning();
    const token = jwt.sign({ userId: student.id, role: 'student', name: student.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any);
    res.status(201).json({ token, user: { id: student.id, name: student.name, role: 'student', roomNumber: student.roomNumber } });
  } catch (err: any) {
    if (err.code === '23505') { res.status(409).json({ error: 'Phone number already registered' }); return; }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Student Login ────────────────────────────────────────────────────────────
router.post('/login/student', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) { res.status(400).json({ error: 'phone and password required' }); return; }
    const [student] = await db.select().from(students).where(eq(students.phone, phone)).limit(1);
    if (!student || !(await bcrypt.compare(password, student.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    const token = jwt.sign({ userId: student.id, role: 'student', name: student.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any);
    res.json({ token, user: { id: student.id, name: student.name, role: 'student', roomNumber: student.roomNumber } });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Warden Register ──────────────────────────────────────────────────────────
router.post('/register/warden', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, hostelBlock, password } = req.body;
    if (!name || !hostelBlock || !password) {
      res.status(400).json({ error: 'All fields required: name, hostelBlock, password' }); return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [warden] = await db.insert(wardens).values({ name, hostelBlock, passwordHash }).returning();
    const token = jwt.sign({ userId: warden.id, role: 'warden', name: warden.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any);
    res.status(201).json({ token, user: { id: warden.id, name: warden.name, role: 'warden', hostelBlock: warden.hostelBlock } });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Warden Login ─────────────────────────────────────────────────────────────
router.post('/login/warden', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, password } = req.body;
    if (!name || !password) { res.status(400).json({ error: 'name and password required' }); return; }
    const [warden] = await db.select().from(wardens).where(eq(wardens.name, name)).limit(1);
    if (!warden || !(await bcrypt.compare(password, warden.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    const token = jwt.sign({ userId: warden.id, role: 'warden', name: warden.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any);
    res.json({ token, user: { id: warden.id, name: warden.name, role: 'warden', hostelBlock: warden.hostelBlock } });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Get current user ─────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    res.json({ user: { id: decoded.userId, name: decoded.name, role: decoded.role } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
