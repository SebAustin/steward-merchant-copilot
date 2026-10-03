-- Least-privilege role for off-server spend writers (evals, dev runs). PLAN R34, probe P0-6.
--
-- Owner runs once on the Render Postgres (as the database owner), choosing a strong password:
--     CREATE ROLE steward_eval LOGIN PASSWORD '<generate one>';
-- then runs this file. It is idempotent; re-run it after any migration that adds tables.
-- Finally set the Actions secret EVAL_DATABASE_URL to a connection string using this role.
--
-- The role may only INSERT and SELECT on api_spend (plus use its id sequence). Anything else,
-- including UPDATE, DELETE and TRUNCATE, is denied; the append-only trigger backs this up.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM steward_eval;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM steward_eval;

GRANT USAGE ON SCHEMA public TO steward_eval;
GRANT INSERT, SELECT ON api_spend TO steward_eval;
GRANT USAGE ON SEQUENCE api_spend_id_seq TO steward_eval;
