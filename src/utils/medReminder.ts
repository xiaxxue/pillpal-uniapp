// 用药提醒：到点弹出系统通知
import { normalizeTime } from './date'

// 已经提醒过的记录（防止同一时段重复弹）
const notified = new Set<string>()
let timer: ReturnType<typeof setInterval> | null = null

// 请求通知权限
export async function requestNotifyPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// 检查是否有药该吃了，有的话弹通知
function checkAndNotify(
  medications: any[],
  records: Record<string, string>,
  getMedKey: (name: string, time: string) => string
) {
  if (Notification.permission !== 'granted') return

  const now = new Date()
  const nowH = now.getHours()
  const nowM = now.getMinutes()
  const today = now.toISOString().slice(0, 10)

  medications.forEach(med => {
    if (!med.times) return
    med.times.forEach((t: string) => {
      const time = normalizeTime(t)
      const [h, m] = time.split(':').map(Number)

      // 当前时间在应服时间的 0~5 分钟内 → 弹"该吃药了"
      const diffMinutes = (nowH * 60 + nowM) - (h * 60 + m)
      const notifyKey = `${today}_${med.name}_${time}`
      const recordKey = getMedKey(med.name, time)

      // 已经打卡了或已经提醒过了 → 跳过
      if (records[recordKey]) return
      if (notified.has(notifyKey)) return

      if (diffMinutes >= 0 && diffMinutes <= 5) {
        // 到点提醒
        new Notification('该吃药了 💊', {
          body: `${med.name}（${med.dosage}）${time} 该服用了`,
          tag: notifyKey,
          icon: '/favicon.ico'
        })
        notified.add(notifyKey)
      } else if (diffMinutes > 30 && diffMinutes <= 35) {
        // 超时 30 分钟还没打卡 → 二次提醒
        const lateKey = notifyKey + '_late'
        if (notified.has(lateKey)) return
        new Notification('药还没吃哦 ⏰', {
          body: `${med.name}（${time}）已经过了 30 分钟，还能补服吗？打开小派问一下`,
          tag: lateKey,
          icon: '/favicon.ico'
        })
        notified.add(lateKey)
      }
    })
  })
}

// 启动定时检查（每分钟一次）
export function startMedReminder(
  getMedications: () => any[],
  getRecords: () => Record<string, string>,
  getMedKey: (name: string, time: string) => string
) {
  if (timer) return // 已经在跑了
  // 立即检查一次
  checkAndNotify(getMedications(), getRecords(), getMedKey)
  // 然后每 60 秒检查一次
  timer = setInterval(() => {
    checkAndNotify(getMedications(), getRecords(), getMedKey)
  }, 60_000)
}

// 停止定时检查
export function stopMedReminder() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
