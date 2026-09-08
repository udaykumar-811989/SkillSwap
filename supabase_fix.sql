-- ============================================
-- SkillSwap: Quick Fix Script
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add skill_points column to profiles if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'skill_points'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN skill_points INTEGER DEFAULT 0;
    RAISE NOTICE 'Added skill_points column to profiles';
  ELSE
    RAISE NOTICE 'skill_points column already exists';
  END IF;
END $$;

-- 2. Create teaching_sessions table (drop and recreate to be safe)
DROP TABLE IF EXISTS public.teaching_sessions CASCADE;
CREATE TABLE public.teaching_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  teacher_done BOOLEAN DEFAULT FALSE,
  learner_done BOOLEAN DEFAULT FALSE,
  reward_given BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create point_transactions table (drop and recreate to be safe)
DROP TABLE IF EXISTS public.point_transactions CASCADE;
CREATE TABLE public.point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 10,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.teaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies and create new ones
DROP POLICY IF EXISTS "Users can view their own teaching sessions" ON public.teaching_sessions;
DROP POLICY IF EXISTS "Teachers can create teaching sessions" ON public.teaching_sessions;
DROP POLICY IF EXISTS "Participants can update teaching sessions" ON public.teaching_sessions;

CREATE POLICY "Users can view their own teaching sessions"
  ON public.teaching_sessions FOR SELECT
  USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

CREATE POLICY "Teachers can create teaching sessions"
  ON public.teaching_sessions FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Participants can update teaching sessions"
  ON public.teaching_sessions FOR UPDATE
  USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

DROP POLICY IF EXISTS "Users can view their own point transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "System can insert point transactions" ON public.point_transactions;

CREATE POLICY "Users can view their own point transactions"
  ON public.point_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert point transactions"
  ON public.point_transactions FOR INSERT
  WITH CHECK (true);

-- 6. Create the RPC function
CREATE OR REPLACE FUNCTION public.complete_teaching_session(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_is_teacher BOOLEAN;
  v_is_learner BOOLEAN;
BEGIN
  SELECT * INTO v_session
  FROM public.teaching_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('reward_given', false, 'message', 'Session not found.');
  END IF;

  v_is_teacher := (v_session.teacher_id = p_user_id);
  v_is_learner := (v_session.learner_id = p_user_id);

  IF NOT v_is_teacher AND NOT v_is_learner THEN
    RETURN jsonb_build_object('reward_given', false, 'message', 'Not a participant.');
  END IF;

  IF v_session.reward_given THEN
    RETURN jsonb_build_object('reward_given', false, 'message', 'Already completed.');
  END IF;

  IF v_is_teacher THEN
    UPDATE public.teaching_sessions SET teacher_done = TRUE WHERE id = p_session_id;
    v_session.teacher_done := TRUE;
  ELSE
    UPDATE public.teaching_sessions SET learner_done = TRUE WHERE id = p_session_id;
    v_session.learner_done := TRUE;
  END IF;

  IF v_session.teacher_done AND v_session.learner_done THEN
    IF NOT v_session.reward_given THEN
      UPDATE public.teaching_sessions
      SET reward_given = TRUE, completed_at = NOW()
      WHERE id = p_session_id;

      INSERT INTO public.point_transactions (user_id, points, reason)
      VALUES (v_session.teacher_id, 10, 'Teaching session completed: ' || v_session.skill);

      UPDATE public.profiles
      SET skill_points = COALESCE(skill_points, 0) + 10
      WHERE id = v_session.teacher_id;

      RETURN jsonb_build_object('reward_given', true, 'message', 'Completed! +10 points.');
    END IF;
  END IF;

  RETURN jsonb_build_object('reward_given', false, 'message', 'Saved. Waiting for both to confirm.');
END;
$$;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_ts_teacher ON public.teaching_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ts_learner ON public.teaching_sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_pt_user ON public.point_transactions(user_id);

-- Done! Now refresh your app.
