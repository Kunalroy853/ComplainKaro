CREATE TYPE "public"."ticket_category" AS ENUM('wifi', 'electricity', 'water', 'food', 'hygiene', 'security', 'maintenance', 'other');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'duplicate', 'flagged', 'resolved');--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"room_number" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "students_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "ticket_embeddings" (
	"ticket_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(768)
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"audio_url" text NOT NULL,
	"transcript" text NOT NULL,
	"category" "ticket_category" DEFAULT 'other' NOT NULL,
	"urgency_score" integer DEFAULT 3 NOT NULL,
	"confidence_score" real DEFAULT 0.5 NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"cluster_id" uuid,
	"report_count" integer DEFAULT 1 NOT NULL,
	"needs_manual_review" integer DEFAULT 0 NOT NULL,
	"classification_source" text DEFAULT 'gemini' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wardens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hostel_block" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_embeddings" ADD CONSTRAINT "ticket_embeddings_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;