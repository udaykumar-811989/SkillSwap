-- ============================================
-- SkillSwap: Chat Upgrade - Voice, Unsend, Delete-for-me
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add new columns to messages table
DO $$
BEGIN
  -- message_type: 'text', 'voice', 'image', 'video'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='message_type') THEN
    ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text';
  END IF;

  -- media_url: for voice messages stored in Supabase Storage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='media_url') THEN
    ALTER TABLE public.messages ADD COLUMN media_url TEXT DEFAULT '';
  END IF;

  -- duration: voice message duration in seconds
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='duration') THEN
    ALTER TABLE public.messages ADD COLUMN duration INTEGER DEFAULT 0;
  END IF;

  -- unsent_at: soft delete timestamp (null = not unsent)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='unsent_at') THEN
    ALTER TABLE public.messages ADD COLUMN unsent_at TIMESTAMPTZ;
  END IF;

  -- hidden_for: jsonb array of user IDs who deleted the message for themselves
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='hidden_for') THEN
    ALTER TABLE public.messages ADD COLUMN hidden_for JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 2. Index for hidden_for queries
CREATE INDEX IF NOT EXISTS idx_messages_hidden_for ON public.messages USING GIN (hidden_for);

-- 3. Create voice-messages storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for voice messages
DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can upload voice messages"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-messages');

DROP POLICY IF EXISTS "Anyone can view voice messages" ON storage.objects;
CREATE POLICY "Anyone can view voice messages"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'voice-messages');

DROP POLICY IF EXISTS "Users can delete their own voice messages" ON storage.objects;
CREATE POLICY "Users can delete their own voice messages"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Update RLS: allow sender to unsend (update unsent_at)
-- The existing UPDATE policy already allows sender OR receiver to update.
-- We need to ensure only the sender can set unsent_at.
-- We'll enforce this at the app level and via a trigger.

-- 6. Function: unsend a message (set unsent_at for everyone)
CREATE OR REPLACE FUNCTION public.unsend_message(p_message_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_my_id UUID; v_msg RECORD;
BEGIN
  v_my_id := auth.uid();
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;

  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Message not found'); END IF;
  IF v_msg.sender_id != v_my_id THEN RETURN jsonb_build_object('error', 'Only the sender can unsend'); END IF;
  IF v_msg.unsent_at IS NOT NULL THEN RETURN jsonb_build_object('error', 'Already unsent'); END IF;

  UPDATE public.messages SET
    unsent_at = NOW(),
    content = 'You unsent this message',
    message_type = 'text',
    media_url = '',
    duration = 0,
    reactions = '{}'::jsonb,
    reply_to_id = NULL,
    reply_to_content = '',
    reply_to_sender_name = ''
  WHERE id = p_message_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 7. Function: hide message for current user (delete for me)
CREATE OR REPLACE FUNCTION public.hide_message_for_me(p_message_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_my_id UUID; v_msg RECORD; v_hidden JSONB;
BEGIN
  v_my_id := auth.uid();
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;

  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Message not found'); END IF;
  IF v_msg.sender_id != v_my_id AND v_msg.receiver_id != v_my_id THEN
    RETURN jsonb_build_object('error', 'Not a participant');
  END IF;

  v_hidden := v_msg.hidden_for;
  IF v_hidden ? v_my_id::text THEN
    RETURN jsonb_build_object('ok', true, 'already_hidden', true);
  END IF;

  UPDATE public.messages SET hidden_for = hidden_for || to_jsonb(v_my_id::text)
  WHERE id = p_message_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 8. Update SELECT policy to exclude hidden messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND NOT (hidden_for ? auth.uid()::text)
  );

-- 9. Update trigger for conversation preview to handle unsent messages
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_is_user1 BOOLEAN;
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.unsent_at IS NOT NULL THEN 'Message unsent'
      ELSE LEFT(COALESCE(NEW.content, ''), 100)
    END,
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
