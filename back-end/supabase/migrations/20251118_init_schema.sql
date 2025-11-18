CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_client_id_keys ON api_keys(client_id);

-- Create stablecoins table
CREATE TABLE IF NOT EXISTS stablecoins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stablecoin_id VARCHAR(255) UNIQUE NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_wallet VARCHAR(255) NOT NULL,
  webhook_url TEXT NOT NULL,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  erc20_address VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'registered',
  created_at TIMESTAMP DEFAULT NOW(),
  deployed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stablecoin_id ON stablecoins(stablecoin_id);
CREATE INDEX IF NOT EXISTS idx_symbol ON stablecoins(symbol);
CREATE INDEX IF NOT EXISTS idx_client_id_stable ON stablecoins(client_id);
CREATE INDEX IF NOT EXISTS idx_erc20_address_stable ON stablecoins(erc20_address);

-- Create operations table
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id VARCHAR(255) UNIQUE NOT NULL,
  stablecoin_id VARCHAR(255) NOT NULL REFERENCES stablecoins(stablecoin_id) ON DELETE CASCADE,
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('deposit', 'withdraw')),
  amount DECIMAL(18, 2) NOT NULL,
  asaas_payment_id VARCHAR(255),
  qrcode_payload TEXT,
  qrcode_url TEXT,
  asaas_transfer_id VARCHAR(255),
  pix_address VARCHAR(255),
  tx_hash VARCHAR(255),
  burn_tx_hash VARCHAR(255),
  block_number BIGINT,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  payment_confirmed_at TIMESTAMP,
  minted_at TIMESTAMP,
  burned_at TIMESTAMP,
  pix_transferred_at TIMESTAMP,
  notified_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operation_id ON operations(operation_id);
CREATE INDEX IF NOT EXISTS idx_stablecoin_fk ON operations(stablecoin_id);
CREATE INDEX IF NOT EXISTS idx_operation_type ON operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_status_ops ON operations(status);

-- Create event_store table
CREATE TABLE IF NOT EXISTS event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_event_aggregate ON event_store(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON event_store(event_type);
CREATE INDEX IF NOT EXISTS idx_event_timestamp ON event_store(timestamp DESC);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  context VARCHAR(100),
  message TEXT NOT NULL,
  metadata JSONB,
  operation_id VARCHAR(255),
  error_stack TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_operation ON logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_operations_updated_at ON operations;
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stablecoins_updated_at ON stablecoins;
CREATE TRIGGER update_stablecoins_updated_at BEFORE UPDATE ON stablecoins
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert test API key
INSERT INTO api_keys (client_id, client_name, api_key_hash, is_active)
VALUES ('test-client-01', 'Test Corretora', 'a2e4ab0472c808a1ff2ce147ae4f6cd9ecd8bcc8a49c48350f97e6811ace7464', true)
ON CONFLICT (client_id) DO NOTHING;
