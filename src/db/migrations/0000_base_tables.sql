CREATE TABLE "api_spend" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"run_id" text NOT NULL,
	"call_id" text NOT NULL,
	"cost_usd" numeric(12, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_spend_run_call_unique" UNIQUE("run_id","call_id"),
	CONSTRAINT "api_spend_scope_valid" CHECK ("api_spend"."scope" IN ('demo', 'eval', 'dev')),
	CONSTRAINT "api_spend_cost_nonnegative" CHECK ("api_spend"."cost_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "demo_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"epoch" integer DEFAULT 1 NOT NULL,
	"last_reset_at" timestamp with time zone,
	"resets_today" integer DEFAULT 0 NOT NULL,
	"topups_today" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "demo_state_singleton" CHECK ("demo_state"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id_hash" text PRIMARY KEY NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spend_days" (
	"day" date PRIMARY KEY NOT NULL,
	"reserved_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"spent_usd" numeric(12, 6) DEFAULT '0' NOT NULL
);
