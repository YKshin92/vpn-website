CREATE TABLE ieum_dev.admins (id text PRIMARY KEY,username text NOT NULL UNIQUE,password_hash text NOT NULL,salt text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE ieum_dev.sessions (token_hash text PRIMARY KEY,admin_id text NOT NULL REFERENCES ieum_dev.admins(id) ON DELETE CASCADE,csrf text NOT NULL,expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON ieum_dev.sessions(expires_at);
CREATE TABLE ieum_dev.simulation_states (server_id text PRIMARY KEY REFERENCES ieum_dev.servers(id),state jsonb NOT NULL,revision integer NOT NULL DEFAULT 0);
CREATE TABLE ieum_dev.simulation_jobs (id text PRIMARY KEY,server_id text NOT NULL REFERENCES ieum_dev.servers(id),actor text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON ieum_dev.admins,ieum_dev.sessions,ieum_dev.simulation_states,ieum_dev.simulation_jobs TO ieum_app;
