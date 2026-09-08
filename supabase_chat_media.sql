-- ============================================
-- SkillSwap: Chat Media Storage Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the chat-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload to chat-media
CREATE POLICY "Authenticated users can upload chat media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

-- 3. Allow anyone to view chat media (public bucket)
CREATE POLICY "Anyone can view chat media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-media');

-- 4. Allow users to delete their own uploads
CREATE POLICY "Users can delete their own chat media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
