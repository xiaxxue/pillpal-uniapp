// Supabase Edge Function: 查询到期推送任务并发送 Web Push
// 由 pg_cron 每分钟调用一次
// 部署命令: supabase functions deploy send-push
// 环境变量: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// web-push via npm CDN (Deno-compatible)
// @ts-ignore
import webpush from 'https://esm.sh/web-push@3.6.7'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async () => {
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@pillpal.app'

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  // 查询所有到期未发送的任务
  const now = new Date().toISOString()
  const { data: jobs } = await supabase
    .from('push_jobs')
    .select('*, push_subscriptions!inner(endpoint, p256dh, auth_key)')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(50)

  if (!jobs?.length) return new Response('no jobs', { status: 200 })

  let sent = 0
  for (const job of jobs) {
    const sub = job.push_subscriptions
    if (!sub) continue
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({
          title: '💊 该服药了',
          body: `${job.med_name} ${job.time_slot} 的服药时间到了`,
          icon: '/icons/pill-192.png',
          badge: '/icons/badge-72.png',
          data: { url: '/#/pages/assistant/index', job_id: job.id }
        })
      )
      await supabase.from('push_jobs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id)
      sent++
    } catch {
      await supabase.from('push_jobs').update({ status: 'failed' }).eq('id', job.id)
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200 })
})
