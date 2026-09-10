-- ============================================
-- SkillSwap: Learning Sessions Setup
-- Run this in Supabase SQL Editor
-- ============================================

DROP TABLE IF EXISTS public.learning_sessions CASCADE;

CREATE TABLE public.learning_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  skill TEXT NOT NULL,
  topic TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'teach',
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL DEFAULT '',
  participant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'upcoming',
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  checklist JSONB DEFAULT '[]',
  messages JSONB DEFAULT '[]',
  rating INTEGER DEFAULT 0,
  feedback TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Participants can view their sessions"
  ON public.learning_sessions FOR SELECT
  USING (auth.uid()::text = host_id::text OR auth.uid()::text = participant_id::text);

CREATE POLICY "Hosts can create sessions"
  ON public.learning_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = host_id::text);

CREATE POLICY "Participants can update sessions"
  ON public.learning_sessions FOR UPDATE
  USING (auth.uid()::text = host_id::text OR auth.uid()::text = participant_id::text);

CREATE POLICY "Hosts can delete sessions"
  ON public.learning_sessions FOR DELETE
  USING (auth.uid()::text = host_id::text);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_sessions;
