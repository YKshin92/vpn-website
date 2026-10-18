CREATE TABLE ieum_dev.rotation_jobs (
 id text PRIMARY KEY,
 target text NOT NULL CHECK (target='mock-vpnServer001'),
 mode text NOT NULL DEFAULT 'mock' CHECK (mode='mock'),
 actor text NOT NULL,
 request_key text NOT NULL UNIQUE,
 status text NOT NULL CHECK (status IN ('planned','running','succeeded','needs_review','closed')),
 revision integer NOT NULL DEFAULT 0,
 plan jsonb NOT NULL,
 state jsonb NOT NULL,
 failure_step text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rotation_one_open_target ON ieum_dev.rotation_jobs(target) WHERE status IN ('planned','running','needs_review');
CREATE TABLE ieum_dev.rotation_events (
 id text PRIMARY KEY,
 job_id text NOT NULL REFERENCES ieum_dev.rotation_jobs(id) ON DELETE CASCADE,
 revision integer NOT NULL,
 step text NOT NULL,
 phase text NOT NULL CHECK (phase IN ('planned','intent','done','failed','interrupted','reviewed')),
 actor text NOT NULL,
 detail text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,revision)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON ieum_dev.rotation_jobs,ieum_dev.rotation_events TO ieum_app;
