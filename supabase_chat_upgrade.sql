-- ============================================
-- SkillSwap: Instagram-style Chat + Calls
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- 1. Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT DEFAULT '',
  last_message_sender_id UUID,
  user1_unread_count INTEGER DEFAULT 0,
  user2_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_conversation_pair UNIQUE (user1_id, user2_id),
  CONSTRAINT different_users CHECK (user1_id <> user2_id)
);

-- 2. Add columns to messages table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='conversation_id') THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id UUID REFERENCES public.conversations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='status') THEN
    ALTER TABLE public.messages ADD COLUMN status TEXT DEFAULT 'sent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='read_at') THEN
    ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='reply_to_id') THEN
    ALTER TABLE public.messages ADD COLUMN reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
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

-- 3. Calls table
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'calling',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON public.calls(receiver_id);

-- 5. Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- 6. Conversations RLS
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 7. Messages RLS
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
CREATE POLICY "Authenticated users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Participants can update message status" ON public.messages;
CREATE POLICY "Participants can update message status"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Sender can delete their messages" ON public.messages;
CREATE POLICY "Sender can delete their messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- 8. Calls RLS
DROP POLICY IF EXISTS "Participants can view calls" ON public.calls;
CREATE POLICY "Participants can view calls"
  ON public.calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Caller can create calls" ON public.calls;
CREATE POLICY "Caller can create calls"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Participants can update calls" ON public.calls;
CREATE POLICY "Participants can update calls"
  ON public.calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- 9. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 10. Get or create conversation RPC
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_my_id UUID; v_user1 UUID; v_user2 UUID; v_conversation RECORD;
BEGIN
  v_my_id := auth.uid();
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  IF v_my_id = p_other_user_id THEN RETURN jsonb_build_object('error', 'Cannot chat with yourself'); END IF;

  IF v_my_id < p_other_user_id THEN
    v_user1 := v_my_id; v_user2 := p_other_user_id;
  ELSE
    v_user1 := p_other_user_id; v_user2 := v_my_id;
  END IF;

  SELECT * INTO v_conversation FROM public.conversations
  WHERE user1_id = v_user1 AND user2_id = v_user2;

  IF FOUND THEN
    RETURN jsonb_build_object('id', v_conversation.id, 'created', false);
  END IF;

  INSERT INTO public.conversations (user1_id, user2_id) VALUES (v_user1, v_user2) RETURNING * INTO v_conversation;
  RETURN jsonb_build_object('id', v_conversation.id, 'created', true);
END;
$$;

-- 11. Mark conversation seen RPC
CREATE OR REPLACE FUNCTION public.mark_conversation_seen(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_my_id UUID; v_is_user1 BOOLEAN;
BEGIN
  v_my_id := auth.uid();
  IF v_my_id IS NULL THEN RETURN; END IF;

  SELECT (user1_id = v_my_id) INTO v_is_user1
  FROM public.conversations WHERE id = p_conversation_id;

  IF v_is_user1 IS NULL THEN RETURN; END IF;

  UPDATE public.messages SET status = 'seen', read_at = NOW()
  WHERE conversation_id = p_conversation_id AND receiver_id = v_my_id AND (status IS NULL OR status != 'seen');

  IF v_is_user1 THEN
    UPDATE public.conversations SET user1_unread_count = 0, updated_at = NOW() WHERE id = p_conversation_id;
  ELSE
    UPDATE public.conversations SET user2_unread_count = 0, updated_at = NOW() WHERE id = p_conversation_id;
  END IF;
END;
$$;

-- 12. Mark messages delivered RPC
CREATE OR REPLACE FUNCTION public.mark_messages_delivered(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_my_id UUID;
BEGIN
  v_my_id := auth.uid();
  IF v_my_id IS NULL THEN RETURN; END IF;
  UPDATE public.messages SET status = 'delivered'
  WHERE conversation_id = p_conversation_id AND receiver_id = v_my_id AND status = 'sent';
END;
$$;

-- 13. Backfill existing messages
DO $$
DECLARE msg RECORD; v_user1 UUID; v_user2 UUID; v_conv_id UUID;
BEGIN
  FOR msg IN
    SELECT DISTINCT LEAST(sender_id, receiver_id) as u1, GREATEST(sender_id, receiver_id) as u2
    FROM public.messages WHERE conversation_id IS NULL
  LOOP
    INSERT INTO public.conversations (user1_id, user2_id) VALUES (msg.u1, msg.u2)
    ON CONFLICT (user1_id, user2_id) DO NOTHING RETURNING id INTO v_conv_id;

    IF v_conv_id IS NULL THEN
      SELECT id INTO v_conv_id FROM public.conversations WHERE user1_id = msg.u1 AND user2_id = msg.u2;
    END IF;

    UPDATE public.messages SET conversation_id = v_conv_id
    WHERE ((sender_id = msg.u1 AND receiver_id = msg.u2) OR (sender_id = msg.u2 AND receiver_id = msg.u1))
    AND conversation_id IS NULL;

    UPDATE public.conversations SET
      last_message_at = sub.last_at, last_message_preview = sub.last_content, last_message_sender_id = sub.last_sender
    FROM (
      SELECT created_at as last_at, content as last_content, sender_id as last_sender
      FROM public.messages WHERE conversation_id = v_conv_id ORDER BY created_at DESC LIMIT 1
    ) sub WHERE id = v_conv_id;
  END LOOP;
END $$;

-- 14. Trigger: update conversation on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_is_user1 BOOLEAN;
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.conversations SET
    last_message_at = NEW.created_at, last_message_preview = LEFT(COALESCE(NEW.content, ''), 100),
    last_message_sender_id = NEW.sender_id, updated_at = NOW()
  WHERE id = NEW.conversation_id;

  SELECT (user1_id = NEW.receiver_id) INTO v_is_user1 FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_is_user1 THEN
    UPDATE public.conversations SET user1_unread_count = user1_unread_count + 1 WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.conversations SET user2_unread_count = user2_unread_count + 1 WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON public.messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON public.messages FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- 15. Trigger: update conversation on message delete
CREATE OR REPLACE FUNCTION public.update_conversation_on_message_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_last_msg RECORD;
BEGIN
  IF OLD.conversation_id IS NULL THEN RETURN OLD; END IF;
  SELECT content, sender_id, created_at INTO v_last_msg
  FROM public.messages WHERE conversation_id = OLD.conversation_id ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE public.conversations SET
      last_message_at = v_last_msg.created_at, last_message_preview = LEFT(COALESCE(v_last_msg.content, ''), 100),
      last_message_sender_id = v_last_msg.sender_id, updated_at = NOW()
    WHERE id = OLD.conversation_id;
  ELSE
    UPDATE public.conversations SET
      last_message_at = NULL, last_message_preview = '', last_message_sender_id = NULL, updated_at = NOW()
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message_delete ON public.messages;
CREATE TRIGGER trg_update_conversation_on_message_delete
  AFTER DELETE ON public.messages FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message_delete();
