-- Add user_id column to models table and enable RLS
-- Run this migration in the Supabase dashboard or via `supabase db push`

ALTER TABLE models ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
DELETE FROM models WHERE user_id IS NULL;
ALTER TABLE models ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_models_user_id ON models(user_id);
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own models"
  ON models FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own models"
  ON models FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own models"
  ON models FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own models"
  ON models FOR DELETE USING (auth.uid() = user_id);
