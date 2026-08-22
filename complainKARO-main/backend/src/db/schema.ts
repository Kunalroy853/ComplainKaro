import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  pgEnum,
  customType,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── pgvector custom type ─────────────────────────────────────────────────────
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map(Number);
  },
});

// ─── Enums ────────────────────────────────────────────────────────────────────
export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'duplicate',
  'flagged',
  'resolved',
]);

export const ticketCategoryEnum = pgEnum('ticket_category', [
  'wifi',
  'electricity',
  'water',
  'food',
  'hygiene',
  'security',
  'maintenance',
  'other',
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  roomNumber: text('room_number').notNull(),
  phone: text('phone').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wardens = pgTable('wardens', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  hostelBlock: text('hostel_block').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  audioUrl: text('audio_url').notNull(),
  transcript: text('transcript').notNull(),
  category: ticketCategoryEnum('category').notNull().default('other'),
  urgencyScore: integer('urgency_score').notNull().default(3), // 1–5
  confidenceScore: real('confidence_score').notNull().default(0.5), // 0–1
  status: ticketStatusEnum('status').notNull().default('open'),
  clusterId: uuid('cluster_id'), // parent ticket ID if duplicate
  reportCount: integer('report_count').notNull().default(1),
  needsManualReview: integer('needs_manual_review').notNull().default(0), // bool as int
  classificationSource: text('classification_source').notNull().default('gemini'), // 'gemini' | 'keyword'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

export const ticketEmbeddings = pgTable('ticket_embeddings', {
  ticketId: uuid('ticket_id')
    .primaryKey()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  embedding: vector('embedding'),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const studentsRelations = relations(students, ({ many }) => ({
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  student: one(students, {
    fields: [tickets.studentId],
    references: [students.id],
  }),
  embedding: one(ticketEmbeddings, {
    fields: [tickets.id],
    references: [ticketEmbeddings.ticketId],
  }),
}));

// ─── Type exports ─────────────────────────────────────────────────────────────
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Warden = typeof wardens.$inferSelect;
export type NewWarden = typeof wardens.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketEmbedding = typeof ticketEmbeddings.$inferSelect;
