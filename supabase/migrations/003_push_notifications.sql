-- 推送订阅表（存储浏览器 Web Push 订阅信息）
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth_key   text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 推送任务队列
CREATE TABLE IF NOT EXISTS push_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  med_name     text NOT NULL,
  time_slot    text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at      timestamptz,
  status       text DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_jobs_pending
  ON push_jobs(scheduled_at) WHERE status = 'pending';

ALTER TABLE push_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own push jobs"
  ON push_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
