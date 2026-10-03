-- Append-only guard shared by api_spend (and, in later slices, audit_entries).
CREATE FUNCTION forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER api_spend_no_update_delete
  BEFORE UPDATE OR DELETE ON api_spend
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER api_spend_no_truncate
  BEFORE TRUNCATE ON api_spend
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
-- The shared demo has exactly one state row; epoch 1 is the first round.
INSERT INTO demo_state (id, epoch) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;
