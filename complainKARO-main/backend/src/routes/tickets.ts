import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { pushTicketResolved, pushTicketDeleted } from '../services/websocket';
import { db } from '../db';
import { tickets, students } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

const router = Router();

// ─── GET /api/tickets  (wardens only) ─────────────────────────────────────────
router.get('/', requireAuth, requireRole('warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, page = '1', limit = '50' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    if (status) conditions.push(eq(tickets.status, status as any));
    if (category) conditions.push(eq(tickets.category, category as any));

    const rows = await db
      .select({
        id: tickets.id,
        studentId: tickets.studentId,
        audioUrl: tickets.audioUrl,
        transcript: tickets.transcript,
        category: tickets.category,
        urgencyScore: tickets.urgencyScore,
        confidenceScore: tickets.confidenceScore,
        status: tickets.status,
        clusterId: tickets.clusterId,
        reportCount: tickets.reportCount,
        needsManualReview: tickets.needsManualReview,
        classificationSource: tickets.classificationSource,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        studentName: students.name,
        roomNumber: students.roomNumber,
        phone: students.phone,
      })
      .from(tickets)
      .leftJoin(students, eq(tickets.studentId, students.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(tickets.urgencyScore), desc(tickets.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    res.json({ tickets: rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ─── GET /api/tickets/my  (students — their own tickets) ──────────────────────
router.get('/my', requireAuth, requireRole('student'), async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.userId;
    const rows = await db
      .select()
      .from(tickets)
      .where(eq(tickets.studentId, studentId))
      .orderBy(desc(tickets.createdAt));
    res.json({ tickets: rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch your tickets' });
  }
});

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [ticket] = await db
      .select({
        id: tickets.id,
        studentId: tickets.studentId,
        audioUrl: tickets.audioUrl,
        transcript: tickets.transcript,
        category: tickets.category,
        urgencyScore: tickets.urgencyScore,
        confidenceScore: tickets.confidenceScore,
        status: tickets.status,
        clusterId: tickets.clusterId,
        reportCount: tickets.reportCount,
        needsManualReview: tickets.needsManualReview,
        classificationSource: tickets.classificationSource,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        studentName: students.name,
        roomNumber: students.roomNumber,
      })
      .from(tickets)
      .leftJoin(students, eq(tickets.studentId, students.id))
      .where(sql`${tickets.id} = ${req.params.id}`)
      .limit(1);

    if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

    // Students can only view their own tickets
    if (req.user!.role === 'student' && ticket.studentId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' }); return;
    }

    res.json({ ticket });
  } catch {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// ─── PATCH /api/tickets/:id/status  (wardens only) ───────────────────────────
router.patch('/:id/status', requireAuth, requireRole('warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const validStatuses = ['open', 'duplicate', 'flagged', 'resolved'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` }); return;
    }

    const updateData: any = { status };
    if (status === 'resolved') updateData.resolvedAt = new Date();

    const [updated] = await db
      .update(tickets)
      .set(updateData)
      .where(sql`${tickets.id} = ${req.params.id}`)
      .returning();

    if (!updated) { res.status(404).json({ error: 'Ticket not found' }); return; }

    if (status === 'resolved') {
      pushTicketResolved(updated.id);
    }

    res.json({ ticket: updated });
  } catch {
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// ─── DELETE /api/tickets/:id ───────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [existing] = await db
      .select()
      .from(tickets)
      .where(sql`${tickets.id} = ${req.params.id}`)
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Students can only delete their own tickets; wardens can delete any ticket
    if (req.user!.role === 'student' && existing.studentId !== req.user!.userId) {
      res.status(403).json({ error: 'You can only delete your own complaints' });
      return;
    }

    await db.delete(tickets).where(sql`${tickets.id} = ${req.params.id}`);

    pushTicketDeleted(req.params.id as string);

    console.log(JSON.stringify({
      level: 'info',
      stage: 'tickets',
      event: 'ticket_deleted',
      ticket_id: req.params.id,
      deleted_by: req.user!.userId,
      role: req.user!.role,
    }));

    res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

export default router;
