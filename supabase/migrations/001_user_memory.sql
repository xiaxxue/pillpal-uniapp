-- 跨会话记忆表
CREATE TABLE IF NOT EXISTS user_memory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type  text NOT NULL CHECK (memory_type IN ('preference','medical_note','habit','context')),
  key          text NOT NULL,
  value        text NOT NULL,
  confidence   float DEFAULT 1.0,
  source       text DEFAULT 'ai_inferred',
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, memory_type, key)
);

CREATE INDEX IF NOT EXISTS idx_user_memory_user ON user_memory(user_id, memory_type);

ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can manage own memory"
  ON user_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
