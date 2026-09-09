-- ============================================
-- SkillSwap: Fix Delete/Unsend Messages
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- 1. Ensure required columns exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='hidden_for') THEN
    ALTER TABLE public.messages ADD COLUMN hidden_for JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='unsent_at') THEN
    ALTER TABLE public.messages ADD COLUMN unsent_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='message_type') THEN
    ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='media_url') THEN
    ALTER TABLE public.messages ADD COLUMN media_url TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='duration') THEN
    ALTER TABLE public.messages ADD COLUMN duration INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='status') THEN
    ALTER TABLE public.messages ADD COLUMN status TEXT DEFAULT 'sent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='conversation_id') THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='reply_to_id') THEN
    ALTER TABLE public.messages ADD COLUMN reply_to_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='reply_to_content') THEN
    ALTER TABLE public.messages ADD COLUMN reply_to_content TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='reply_to_sender_name') THEN
    ALTER TABLE public.messages ADD COLUMN reply_to_sender_name TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='reactions') THEN
    ALTER TABLE public.messages ADD COLUMN reactions JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 2. Reset ALL RLS policies on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can update message status" ON public.messages;
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
DROP POLICY IF EXISTS "Sender can delete their messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.messages;

-- SELECT: Users can see messages they sent/received, EXCLUDING hidden ones
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND NOT (hidden_for ? auth.uid()::text)
  );

-- INSERT: Users can only insert messages as themselves
CREATE POLICY "Authenticated users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- UPDATE: Participants can update messages (for hidden_for, unsent_at, reactions, status)
CREATE POLICY "Participants can update messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- DELETE: Both sender and receiver can delete messages
DROP POLICY IF EXISTS "Sender can delete their messages" ON public.messages;
CREATE POLICY "Participants can delete messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
