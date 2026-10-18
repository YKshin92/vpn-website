CREATE TABLE ieum_dev.customer_profiles (
 customer_id text PRIMARY KEY REFERENCES ieum_dev.customers(id) ON DELETE CASCADE,
 plan_code text CHECK(plan_code IN ('trial','30','90','180')),
 starts_at timestamptz,expires_at timestamptz,
 note text NOT NULL DEFAULT '' CHECK(length(note)<=1000),
 revision integer NOT NULL DEFAULT 0,
 CHECK((starts_at IS NULL AND expires_at IS NULL) OR (starts_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at>starts_at))
);
CREATE TABLE ieum_dev.billing_payments (
 id text PRIMARY KEY,customer_id text NOT NULL REFERENCES ieum_dev.customers(id) ON DELETE RESTRICT,
 billing_email text NOT NULL CHECK(billing_email=lower(billing_email) AND billing_email LIKE '%@%.test'),
 plan_code text NOT NULL CHECK(plan_code IN ('30','90','180')),
 amount integer NOT NULL CHECK(amount BETWEEN 1 AND 10000000),currency text NOT NULL DEFAULT 'KRW' CHECK(currency='KRW'),
 status text NOT NULL CHECK(status IN ('paid','pending','failed','cancelled')),
 paid_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 request_key text NOT NULL UNIQUE,input_hash text NOT NULL,
 actor text NOT NULL,note text NOT NULL DEFAULT '',source text NOT NULL DEFAULT 'synthetic-manual' CHECK(source IN ('synthetic-manual','synthetic-fixture')),
 CHECK((status='paid' AND paid_at IS NOT NULL) OR(status<>'paid' AND paid_at IS NULL))
);
CREATE INDEX billing_email_history ON ieum_dev.billing_payments(billing_email,created_at DESC);
CREATE INDEX billing_paid_at ON ieum_dev.billing_payments(paid_at) WHERE status='paid';
CREATE TABLE ieum_dev.billing_refunds (
 id text PRIMARY KEY,payment_id text NOT NULL REFERENCES ieum_dev.billing_payments(id) ON DELETE RESTRICT,
 amount integer NOT NULL CHECK(amount BETWEEN 1 AND 10000000),refunded_at timestamptz NOT NULL,
 reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 500),actor text NOT NULL,
 request_key text NOT NULL UNIQUE,input_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_refund_at ON ieum_dev.billing_refunds(refunded_at);
CREATE TABLE ieum_dev.customer_events (
 id text PRIMARY KEY,customer_id text NOT NULL REFERENCES ieum_dev.customers(id) ON DELETE RESTRICT,
 actor text NOT NULL,action text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON ieum_dev.customer_profiles,ieum_dev.billing_payments,ieum_dev.billing_refunds,ieum_dev.customer_events TO ieum_app;

INSERT INTO ieum_dev.customer_profiles(customer_id,plan_code,starts_at,expires_at)
SELECT id,CASE id WHEN 'demo-customer-002' THEN '90' ELSE '30' END,
 CASE id WHEN 'demo-customer-001' THEN '2026-10-01T00:00:00Z'::timestamptz WHEN 'demo-customer-002' THEN '2026-10-10T00:00:00Z'::timestamptz WHEN 'demo-customer-003' THEN '2026-09-01T00:00:00Z'::timestamptz END,
 CASE id WHEN 'demo-customer-001' THEN '2026-10-31T00:00:00Z'::timestamptz WHEN 'demo-customer-002' THEN '2027-01-08T00:00:00Z'::timestamptz WHEN 'demo-customer-003' THEN '2026-10-01T00:00:00Z'::timestamptz END
FROM ieum_dev.customers WHERE id IN ('demo-customer-001','demo-customer-002','demo-customer-003','demo-customer-004') ON CONFLICT DO NOTHING;
INSERT INTO ieum_dev.billing_payments(id,customer_id,billing_email,plan_code,amount,status,paid_at,request_key,input_hash,actor,note,source)
SELECT v.id,v.cid,c.email,v.plan,v.amount,v.status,v.at::timestamptz,v.id,'fixture-v1','system:fixture','가상 과거 결제 · 실제 수납 아님','synthetic-fixture'
FROM (VALUES
 ('fixture-pay-001a','demo-customer-001','30',12000,'paid','2026-08-01T00:00:00Z'),
 ('fixture-pay-001b','demo-customer-001','30',12000,'paid','2026-09-01T00:00:00Z'),
 ('fixture-pay-001c','demo-customer-001','30',12000,'paid','2026-10-01T00:00:00Z'),
 ('fixture-pay-002a','demo-customer-002','30',12000,'paid','2026-09-10T00:00:00Z'),
 ('fixture-pay-002b','demo-customer-002','90',30000,'paid','2026-10-10T00:00:00Z'),
 ('fixture-pay-003','demo-customer-003','30',12000,'paid','2026-09-01T00:00:00Z'),
 ('fixture-pay-004','demo-customer-004','30',12000,'pending',NULL),
 ('fixture-pay-005','demo-customer-005','30',12000,'failed',NULL)
)v(id,cid,plan,amount,status,at) JOIN ieum_dev.customers c ON c.id=v.cid ON CONFLICT DO NOTHING;
INSERT INTO ieum_dev.billing_refunds(id,payment_id,amount,refunded_at,reason,actor,request_key,input_hash)
SELECT 'fixture-refund-003',id,12000,'2026-09-15T00:00:00Z','가상 환불 예시','system:fixture','fixture-refund-003','fixture-v1' FROM ieum_dev.billing_payments WHERE id='fixture-pay-003' ON CONFLICT DO NOTHING;
