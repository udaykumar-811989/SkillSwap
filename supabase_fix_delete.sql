-- Run this in Supabase SQL Editor

-- Add hidden_by as plain TEXT (simpler than JSONB)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='hidden_by') THEN
    ALTER TABLE public.messages ADD COLUMN hidden_by TEXT DEFAULT '';
  END IF;
END $$;

-- Reset RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Sender can delete their messages" ON public.messages;

-- SELECT: hide messages where current user is in hidden_by
CREATE POLICY "p_select" ON public.messages FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND (hidden_by IS NULL OR hidden_by = '' OR NOT (hidden_by LIKE '%' || auth.uid()::text || '%'))
  );

-- INSERT
CREATE POLICY "p_insert" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- UPDATE
CREATE POLICY "p_update" ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- DELETE
CREATE POLICY "p_delete" ON public.messages FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
