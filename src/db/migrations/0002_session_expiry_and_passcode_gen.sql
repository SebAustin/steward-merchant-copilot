-- Sessions issued before this migration have no expiry or passcode generation. They are only
-- sign-in tokens, so drop them; everyone signs in again once.
DELETE FROM "sessions";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "passcode_gen" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp with time zone NOT NULL;
