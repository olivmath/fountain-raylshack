-- ============================================
-- STABLECOIN GATEWAY SCHEMA
-- ============================================

-- API Keys (authentication)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE INDEX idx_api_key_hash ON api_keys(api_key_hash);
CREATE INDEX idx_client_id_keys ON api_keys(client_id);

-- Stablecoins (one per client)
CREATE TABLE stablecoins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stablecoin_id VARCHAR(255) UNIQUE NOT NULL,

  -- Client data
  client_id VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_wallet VARCHAR(255) NOT NULL,
  webhook_url TEXT NOT NULL,

  -- Stablecoin data
  symbol VARCHAR(10) UNIQUE NOT NULL,
  erc20_address VARCHAR(255), -- NULL until first deposit

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'registered',
  -- registered: created but not deployed
  -- deployed: contract deployed on-chain

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  deployed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stablecoin_id ON stablecoins(stablecoin_id);
CREATE INDEX idx_symbol ON stablecoins(symbol);
CREATE INDEX idx_client_id_stable ON stablecoins(client_id);
CREATE INDEX idx_erc20_address_stable ON stablecoins(erc20_address);

-- Operations (deposits and withdrawals)
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id VARCHAR(255) UNIQUE NOT NULL,

  -- Foreign key to stablecoin
  stablecoin_id VARCHAR(255) NOT NULL REFERENCES stablecoins(stablecoin_id) ON DELETE CASCADE,

  -- Operation type
  operation_type VARCHAR(20) NOT NULL,
  -- deposit or withdraw
  CONSTRAINT operation_type_check CHECK (operation_type IN ('deposit', 'withdraw')),

  -- Operation data
  amount DECIMAL(18, 2) NOT NULL,

  -- Asaas data (for deposits)
  asaas_payment_id VARCHAR(255),
  qrcode_payload TEXT,
  qrcode_url TEXT,

  -- Asaas data (for withdrawals)
  asaas_transfer_id VARCHAR(255),
  pix_address VARCHAR(255),

  -- Blockchain data
  tx_hash VARCHAR(255),        -- Mint/deploy transaction
  burn_tx_hash VARCHAR(255),   -- Burn transaction
  block_number BIGINT,

  -- Operation status
  status VARCHAR(50) NOT NULL,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  payment_confirmed_at TIMESTAMP,
  minted_at TIMESTAMP,
  burned_at TIMESTAMP,
  pix_transferred_at TIMESTAMP,
  notified_at TIMESTAMP
);

CREATE INDEX idx_operation_id ON operations(operation_id);
CREATE INDEX idx_stablecoin_fk ON operations(stablecoin_id);
CREATE INDEX idx_operation_type ON operations(operation_type);
CREATE INDEX idx_status_ops ON operations(status);

-- Event store (immutable audit trail)
CREATE TABLE event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id VARCHAR(255) NOT NULL,
  -- operation_id or stablecoin_id

  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_event_aggregate ON event_store(aggregate_id);
CREATE INDEX idx_event_type ON event_store(event_type);
CREATE INDEX idx_event_timestamp ON event_store(timestamp DESC);

-- Structured logs
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  level VARCHAR(20) NOT NULL,
  CONSTRAINT level_check CHECK (level IN ('debug', 'info', 'warn', 'error')),

  context VARCHAR(100),
  message TEXT NOT NULL,
  metadata JSONB,
  operation_id VARCHAR(255),
  error_stack TEXT
);

CREATE INDEX idx_logs_operation ON logs(operation_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_level ON logs(level);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stablecoins_updated_at BEFORE UPDATE ON stablecoins
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TEST DATA (REMOVE IN PRODUCTION)
-- ============================================

INSERT INTO api_keys (client_id, client_name, api_key_hash, is_active)
VALUES (
  'test-client-01',
  'Test Corretora',
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  true
);
-- API Key: test-api-key-123 (SHA256 hash above)
