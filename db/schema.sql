-- SQL Migration Schema for OTP Authentication System
-- Target: PostgreSQL / MySQL / SQLite compatible

CREATE TABLE IF NOT EXISTS otp_verifications (
    id VARCHAR(64) PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'phone')),
    otp_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    attempts INT DEFAULT 0 NOT NULL,
    verified BOOLEAN DEFAULT FALSE NOT NULL,
    last_sent_at BIGINT NOT NULL
);

-- Indexes for performance and rate-limiting lookups
CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_verifications(identifier);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_identifier_verified ON otp_verifications(identifier, verified);
