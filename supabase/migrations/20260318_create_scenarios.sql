CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Baseline',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  results JSONB
);

CREATE INDEX idx_scenarios_model_id ON scenarios(model_id);

-- RLS: Ownership derived from parent model's user_id
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scenarios for their models"
  ON scenarios FOR SELECT
  USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert scenarios for their models"
  ON scenarios FOR INSERT
  WITH CHECK (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

CREATE POLICY "Users can update scenarios for their models"
  ON scenarios FOR UPDATE
  USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()))
  WITH CHECK (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete scenarios for their models"
  ON scenarios FOR DELETE
  USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));
