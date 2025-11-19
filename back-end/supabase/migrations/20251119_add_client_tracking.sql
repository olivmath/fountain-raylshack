-- Add client tracking to operations and stablecoins tables
-- This improves auditability and query performance

-- 1. Add client_id to operations table
ALTER TABLE operations ADD COLUMN IF NOT EXISTS client_id VARCHAR(255);

-- 2. Add created_by_api_key_hash to operations table
ALTER TABLE operations ADD COLUMN IF NOT EXISTS created_by_api_key_hash VARCHAR(255);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_operations_client_id ON operations(client_id);
CREATE INDEX IF NOT EXISTS idx_operations_api_key_hash ON operations(created_by_api_key_hash);

-- 4. Add client_id to stablecoins table (if not already present, it should be)
-- This is just a safety check
ALTER TABLE stablecoins ADD COLUMN IF NOT EXISTS client_id_ref VARCHAR(255);

-- 5. Add foreign key constraints
-- For operations.client_id -> api_keys.client_id
ALTER TABLE operations
  ADD CONSTRAINT fk_operations_client_id
  FOREIGN KEY (client_id) REFERENCES api_keys(client_id) ON DELETE CASCADE
  NOT VALID;

-- For operations.created_by_api_key_hash -> api_keys.api_key_hash
ALTER TABLE operations
  ADD CONSTRAINT fk_operations_api_key_hash
  FOREIGN KEY (created_by_api_key_hash) REFERENCES api_keys(api_key_hash) ON DELETE SET NULL
  NOT VALID;

-- Validate constraints (PostgreSQL allows adding non-validated constraints first for large tables)
ALTER TABLE operations VALIDATE CONSTRAINT fk_operations_client_id;
ALTER TABLE operations VALIDATE CONSTRAINT fk_operations_api_key_hash;

-- 6. Create a helper function to get client_id from stablecoin_id
CREATE OR REPLACE FUNCTION get_client_id_from_stablecoin(p_stablecoin_id VARCHAR(255))
RETURNS VARCHAR(255) AS $$
  SELECT client_id FROM stablecoins WHERE stablecoin_id = p_stablecoin_id LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- 7. Add comment for documentation
COMMENT ON COLUMN operations.client_id IS 'Client ID for easy filtering and auditing. Duplicated from stablecoins.client_id for performance.';
COMMENT ON COLUMN operations.created_by_api_key_hash IS 'Hash of the API key that created this operation. Enables full audit trail.';
