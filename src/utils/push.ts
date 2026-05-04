// Web Push 订阅管理
import { supabase } from './supabase'

// ⚠️ 替换为你自己的 VAPID 公钥（用 npx web-push generate-vapid-keys 生成）
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function registerPush(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    // 注册 Service Worker
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // 请求通知权限
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    // 订阅 Web Push
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    const key = sub.getKey('p256dh')
    const auth = sub.getKey('auth')
    if (!key || !auth) return false

    // 存到 Supabase
    const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)))
    const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)))

    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh, auth_key: authKey, user_agent: navigator.userAgent },
      { onConflict: 'endpoint' }
    )
    return true
  } catch {
    return false
  }
}

// 为某个药品的所有服药时间生成未来 N 天的推送任务
export async function schedulePushJobs(
  userId: string,
  medName: string,
  timeSlots: string[],
  days = 30
) {
  const jobs = []
  const now = new Date()
  for (let d = 0; d < days; d++) {
    for (const slot of timeSlots) {
      const [h, m] = slot.split(':').map(Number)
      const scheduled = new Date(now)
      scheduled.setDate(now.getDate() + d)
      scheduled.setHours(h, m, 0, 0)
      if (scheduled <= now) continue
      jobs.push({ user_id: userId, med_name: medName, time_slot: slot, scheduled_at: scheduled.toISOString() })
    }
  }
  if (jobs.length > 0) {
    await supabase.from('push_jobs').insert(jobs)
  }
}

// 取消某个药品的所有未发送推送
export async function cancelPushJobs(userId: string, medName: string) {
  await supabase.from('push_jobs')
    .delete()
    .eq('user_id', userId)
    .eq('med_name', medName)
    .eq('status', 'pending')
}
