DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='message_type') THEN
    ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='media_url') THEN
    ALTER TABLE public.messages ADD COLUMN media_url TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='duration') THEN
    ALTER TABLE public.messages ADD COLUMN duration INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='unsent_at') THEN
    ALTER TABLE public.messages ADD COLUMN unsent_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='hidden_for') THEN
    ALTER TABLE public.messages ADD COLUMN hidden_for JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.unsend_message(p_message_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_my_id UUID; v_msg RECORD;
BEGIN
  v_my_id := auth.uid();
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Message not found'); END IF;
  IF v_msg.sender_id != v_my_id THEN RETURN jsonb_build_object('error', 'Only the sender can unsend'); END IF;
  IF v_msg.unsent_at IS NOT NULL THEN RETURN jsonb_build_object('error', 'Already unsent'); END IF;
  UPDATE public.messages SET
    unsent_at = NOW(), content = 'You unsent this message', message_type = 'text',
    media_url = '', duration = 0, reactions = '{}'::jsonb,
    reply_to_id = NULL, reply_to_content = '', reply_to_sender_name = ''
  WHERE id = p_message_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.hide_message_for_me(p_message_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_my_id UUID; v_msg RECORD;
BEGIN
  v_my_id := auth.uid();
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('error', 'Not authenticated'); END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Message not found'); END IF;
  IF v_msg.sender_id != v_my_id AND v_msg.receiver_id != v_my_id THEN
    RETURN jsonb_build_object('error', 'Not a participant');
  END IF;
  IF v_msg.hidden_for ? v_my_id::text THEN
    RETURN jsonb_build_object('ok', true, 'already_hidden', true);
  END IF;
  UPDATE public.messages SET hidden_for = hidden_for || to_jsonb(v_my_id::text) WHERE id = p_message_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING ((auth.uid() = sender_id OR auth.uid() = receiver_id) AND NOT (hidden_for ? auth.uid()::text));

INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can upload voice messages" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'voice-messages');
DROP POLICY IF EXISTS "Anyone can view voice messages" ON storage.objects;
CREATE POLICY "Anyone can view voice messages" ON storage.objects FOR SELECT TO public USING (bucket_id = 'voice-messages');
DROP POLICY IF EXISTS "Users can delete their own voice messages" ON storage.objects;
CREATE POLICY "Users can delete their own voice messages" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text);
