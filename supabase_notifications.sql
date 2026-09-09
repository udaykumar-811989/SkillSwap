-- SkillSwap Push Notification Device Tokens
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup of active tokens per user
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active
  ON device_tokens(user_id, active)
  WHERE active = true;

-- Unique index to prevent duplicate tokens
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_token
  ON device_tokens(token);

-- RLS policies
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own device tokens
CREATE POLICY "Users can insert their own device tokens"
  ON device_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
  ON device_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
  ON device_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own device tokens"
  ON device_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to read all tokens (for Edge Function)
CREATE POLICY "Service role can read all device tokens"
  ON device_tokens
  FOR SELECT
  USING (true);

-- Function to clean up old inactive tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM device_tokens
  WHERE active = false
    AND updated_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_tokens_updated_at();
