-- ============================================
-- SkillSwap: Profile Privacy Settings
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add privacy_settings JSONB column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "show_location": true,
  "show_bio": true,
  "show_skills": true,
  "show_reviews": true,
  "show_stats": true,
  "show_availability": true
}'::jsonb;

-- 2. Add experience and availability columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT '';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT '';

-- 3. Backfill existing profiles with default privacy settings
UPDATE profiles
SET privacy_settings = '{
  "show_location": true,
  "show_bio": true,
  "show_skills": true,
  "show_reviews": true,
  "show_stats": true,
  "show_availability": true
}'::jsonb
WHERE privacy_settings IS NULL;

-- 4. RPC function: Get a public profile with privacy enforcement
-- Returns only the fields the target user has made public
CREATE OR REPLACE FUNCTION get_public_profile(target_user_id UUID, requesting_user_id UUID)
RETURNS JSON AS $$
DECLARE
  target_profile RECORD;
  privacy JSONB;
  result JSON;
BEGIN
  SELECT * INTO target_profile
  FROM profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  privacy := COALESCE(target_profile.privacy_settings, '{
    "show_location": true,
    "show_bio": true,
    "show_skills": true,
    "show_reviews": true,
    "show_stats": true,
    "show_availability": true
  }'::jsonb);

  -- If viewing own profile, return everything
  IF target_user_id = requesting_user_id THEN
    RETURN row_to_json(target_profile);
  END IF;

  -- Build result based on privacy settings
  result := json_build_object(
    'id', target_profile.id,
    'full_name', target_profile.full_name,
    'name', target_profile.name,
    'username', target_profile.username,
    'avatar_url', target_profile.avatar_url,
    'created_at', target_profile.created_at
  );

  IF (privacy->>'show_location')::boolean THEN
    result := result || json_build_object('location', target_profile.location);
  END IF;

  IF (privacy->>'show_bio')::boolean THEN
    result := result || json_build_object('bio', target_profile.bio);
  END IF;

  IF (privacy->>'show_skills')::boolean THEN
    result := result || json_build_object(
      'skills_teach', target_profile.skills_teach,
      'teach_skills', target_profile.teach_skills,
      'skills_learn', target_profile.skills_learn,
      'learn_skills', target_profile.learn_skills,
      'languages', target_profile.languages
    );
  END IF;

  IF (privacy->>'show_availability')::boolean THEN
    result := result || json_build_object(
      'experience', target_profile.experience,
      'availability', target_profile.availability
    );
  END IF;

  result := result || json_build_object(
    'privacy_settings', target_profile.privacy_settings
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_public_profile(UUID, UUID) TO authenticated;

-- 6. RPC function: Get public reviews/stats for a user
-- Returns completed sessions with ratings if the user allows it
CREATE OR REPLACE FUNCTION get_public_reviews(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  target_profile RECORD;
  privacy JSONB;
  reviews JSON;
  stats JSON;
BEGIN
  SELECT * INTO target_profile
  FROM profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  privacy := COALESCE(target_profile.privacy_settings, '{
    "show_reviews": true,
    "show_stats": true
  }'::jsonb);

  -- Get stats if allowed
  IF (privacy->>'show_stats')::boolean THEN
    SELECT json_build_object(
      'total_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
      'avg_rating', COALESCE(AVG(rating) FILTER (WHERE rating > 0), 0),
      'rated_sessions', COUNT(*) FILTER (WHERE rating > 0)
    ) INTO stats
    FROM learning_sessions
    WHERE (host_id = target_user_id OR participant_id = target_user_id)
      AND status = 'completed';
  ELSE
    stats := json_build_object('total_sessions', 0, 'avg_rating', 0, 'rated_sessions', 0);
  END IF;

  -- Get reviews if allowed
  IF (privacy->>'show_reviews')::boolean THEN
    SELECT COALESCE(json_agg(row_to_json(ls) ORDER BY created_at DESC), '[]'::json)
    INTO reviews
    FROM (
      SELECT id, topic, rating, feedback, created_at
      FROM learning_sessions
      WHERE (host_id = target_user_id OR participant_id = target_user_id)
        AND status = 'completed'
        AND rating > 0
      ORDER BY created_at DESC
      LIMIT 5
    ) ls;
  ELSE
    reviews := '[]'::json;
  END IF;

  RETURN json_build_object('stats', stats, 'reviews', reviews);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_public_reviews(UUID) TO authenticated;
