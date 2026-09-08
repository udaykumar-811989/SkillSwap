-- ============================================
-- SkillSwap: Teaching Sessions & Points Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create teaching_sessions table
CREATE TABLE IF NOT EXISTS public.teaching_sessions (
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

-- 2. Create point_transactions table
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 10,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.teaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Teaching Sessions policies
CREATE POLICY "Users can view their own teaching sessions"
  ON public.teaching_sessions FOR SELECT
  USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

CREATE POLICY "Teachers can create teaching sessions"
  ON public.teaching_sessions FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Participants can update teaching sessions"
  ON public.teaching_sessions FOR UPDATE
  USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

-- 5. Point Transactions policies
CREATE POLICY "Users can view their own point transactions"
  ON public.point_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert point transactions"
  ON public.point_transactions FOR INSERT
  WITH CHECK (true);

-- 6. Create the complete_teaching_session RPC function
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
  -- Find the session
  SELECT * INTO v_session
  FROM public.teaching_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('reward_given', false, 'message', 'Session not found.');
  END IF;

  -- Verify the user is a participant
  v_is_teacher := (v_session.teacher_id = p_user_id);
  v_is_learner := (v_session.learner_id = p_user_id);

  IF NOT v_is_teacher AND NOT v_is_learner THEN
    RETURN jsonb_build_object('reward_given', false, 'message', 'You are not a participant in this session.');
  END IF;

  -- Already fully rewarded
  IF v_session.reward_given THEN
    RETURN jsonb_build_object('reward_given', false, 'message', 'Session already completed and reward given.');
  END IF;

  -- Mark the appropriate side as done
  IF v_is_teacher THEN
    UPDATE public.teaching_sessions
    SET teacher_done = TRUE
    WHERE id = p_session_id;
    v_session.teacher_done := TRUE;
  ELSE
    UPDATE public.teaching_sessions
    SET learner_done = TRUE
    WHERE id = p_session_id;
    v_session.learner_done := TRUE;
  END IF;

  -- Check if BOTH sides are now confirmed
  IF v_session.teacher_done AND v_session.learner_done THEN
    -- Prevent duplicate reward (idempotent check)
    IF NOT v_session.reward_given THEN
      -- Award +10 points to the teacher
      UPDATE public.teaching_sessions
      SET reward_given = TRUE, completed_at = NOW()
      WHERE id = p_session_id;

      INSERT INTO public.point_transactions (user_id, points, reason)
      VALUES (v_session.teacher_id, 10, 'Teaching session completed: ' || v_session.skill);

      -- Update teacher's profile skill_points
      UPDATE public.profiles
      SET skill_points = COALESCE(skill_points, 0) + 10
      WHERE id = v_session.teacher_id;

      RETURN jsonb_build_object('reward_given', true, 'message', 'Teaching completed! +10 Skill Points awarded.');
    END IF;
  END IF;

  -- Not both confirmed yet
  RETURN jsonb_build_object('reward_given', false, 'message', 'Confirmation saved. Waiting for both sides to confirm.');
END;
$$;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_teacher ON public.teaching_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_learner ON public.teaching_sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON public.point_transactions(user_id);

-- Done!
