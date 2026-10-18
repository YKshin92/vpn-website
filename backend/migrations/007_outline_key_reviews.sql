-- Prepared only; apply after separate approval and backup. Do not edit applied 006.
ALTER TABLE ieum_dev.outline_key_operations
 ADD COLUMN requested jsonb,
 ADD COLUMN review jsonb,
 ADD COLUMN revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE ieum_dev.outline_key_operations DROP CONSTRAINT outline_key_operations_state_check;
ALTER TABLE ieum_dev.outline_key_operations ADD CONSTRAINT outline_key_operations_state_check CHECK(state IN ('intent','succeeded','needs_review','closed'));
ALTER TABLE ieum_dev.outline_key_operations ADD CONSTRAINT outline_review_shape CHECK((state='closed' AND review IS NOT NULL AND jsonb_typeof(review)='object') OR (state<>'closed' AND review IS NULL));
ALTER TABLE ieum_dev.outline_key_operations ADD CONSTRAINT outline_requested_shape CHECK(requested IS NULL OR jsonb_typeof(requested)='object');
-- The existing partial unique index excludes closed, but includes intent/needs_review.
