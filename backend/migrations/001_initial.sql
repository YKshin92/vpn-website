CREATE SCHEMA ieum_dev;
CREATE TABLE ieum_dev.servers (
  id text PRIMARY KEY,
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
  region text NOT NULL CHECK(region='ap-northeast-2'),
  hostname text NOT NULL CHECK(hostname LIKE '%.test'),
  mode text NOT NULL DEFAULT 'simulation' CHECK(mode='simulation'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ieum_dev.customers (
  id text PRIMARY KEY,
  display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
  email text NOT NULL CHECK(email=lower(email) AND email LIKE '%@%.test'),
  status text NOT NULL CHECK(status IN ('active','expired','payment_pending','review_required')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email)
);
CREATE TABLE ieum_dev.access_keys (
  id text PRIMARY KEY,
  customer_id text NOT NULL UNIQUE REFERENCES ieum_dev.customers(id) ON DELETE RESTRICT,
  server_id text NOT NULL REFERENCES ieum_dev.servers(id) ON DELETE RESTRICT,
  outline_key_id text NOT NULL,
  source text NOT NULL DEFAULT 'synthetic-fixture' CHECK(source='synthetic-fixture'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(server_id,outline_key_id)
);
GRANT USAGE ON SCHEMA ieum_dev TO ieum_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ieum_dev TO ieum_app;
