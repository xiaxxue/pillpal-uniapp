-- 启用 pg_cron 和 pg_net 扩展（Supabase 内置，免费）
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 每分钟检查并发送到期的推送任务
SELECT cron.schedule(
  'pillpal-push-sender',
  '* * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://tjipfsyiqlbmaehabmvp.supabase.co/functions/v1/send-push',
    body   := '{}',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.service_role_key', true) || '"}'
  );
  $$
);
