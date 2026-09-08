DROP TABLE IF EXISTS public.learning_sessions;

CREATE TABLE public.learning_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  skill TEXT NOT NULL,
  topic TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'teach',
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL DEFAULT '',
  participant_id TEXT,
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

ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_sessions;
