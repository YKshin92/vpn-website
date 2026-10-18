CREATE TABLE ieum_dev.live_rotation_jobs (
 id text PRIMARY KEY,
 target text NOT NULL,
 domain text NOT NULL,
 request_key text NOT NULL UNIQUE,
 actor text NOT NULL,
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','running','succeeded','needs_review','closed')),
 revision integer NOT NULL DEFAULT 0,
 plan jsonb NOT NULL,
 plan_hash text NOT NULL,
 state jsonb NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX live_one_open_target ON ieum_dev.live_rotation_jobs(target) WHERE status IN ('planned','running','needs_review');
CREATE UNIQUE INDEX live_one_open_domain ON ieum_dev.live_rotation_jobs(domain) WHERE status IN ('planned','running','needs_review');
CREATE TABLE ieum_dev.live_rotation_events (
 id text PRIMARY KEY,
 job_id text NOT NULL REFERENCES ieum_dev.live_rotation_jobs(id) ON DELETE CASCADE,
 revision integer NOT NULL,
 phase text NOT NULL,
 step text NOT NULL,
 actor text NOT NULL,
 detail text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,revision)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON ieum_dev.live_rotation_jobs,ieum_dev.live_rotation_events TO ieum_app;
