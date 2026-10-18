-- Prepared only: requires explicit approval and a database backup before application.
CREATE TABLE ieum_dev.outline_key_operations (
 id uuid PRIMARY KEY,
 instance text NOT NULL CHECK(length(instance) BETWEEN 1 AND 100),
 server_id text NOT NULL CHECK(length(server_id) BETWEEN 1 AND 200),
 key_id text NOT NULL CHECK(length(key_id) BETWEEN 1 AND 100),
 action text NOT NULL CHECK(action IN ('create','rename','limit','delete','reveal')),
 actor text NOT NULL,
 digest text NOT NULL CHECK(length(digest)=64),
 state text NOT NULL CHECK(state IN ('intent','succeeded','needs_review')),
 reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz
);
CREATE UNIQUE INDEX outline_one_open_operation ON ieum_dev.outline_key_operations(instance) WHERE state IN ('intent','needs_review');
CREATE INDEX outline_key_history ON ieum_dev.outline_key_operations(instance,server_id,key_id,created_at DESC);
GRANT SELECT,INSERT,UPDATE ON ieum_dev.outline_key_operations TO ieum_app;
