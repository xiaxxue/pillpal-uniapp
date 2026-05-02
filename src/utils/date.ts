export function getLocalDateStr(date?: Date): string {
  const d = date || new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

export function getTodayStr(): string {
  return getLocalDateStr(new Date())
}

export function getTimeStr(): string {
  const now = new Date()
  return String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0')
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function getMedKey(medName: string, hour: number): string {
  return medName + '_' + hour
}

export const TIME_SLOTS: Record<string, { hour: number; icon: string; label: string; time: string }> = {
  '晨起 7:00': { hour: 7, icon: '☀', label: '晨起 · 07:00', time: '07:00' },
  '早餐后 8:00': { hour: 8, icon: '🍴', label: '早餐后 · 08:00', time: '08:00' },
  '午餐后 14:30': { hour: 14.5, icon: '☀', label: '午餐后 · 14:30', time: '14:30' },
  '晚餐后 18:30': { hour: 18.5, icon: '🍽', label: '晚餐后 · 18:30', time: '18:30' },
  '晚间 21:00': { hour: 21, icon: '🌙', label: '晚间 · 21:00', time: '21:00' }
}

export function getDateRange(centerDate: Date, range = 3) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const center = new Date(centerDate)
  center.setHours(12, 0, 0, 0)
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const dates = []

  for (let i = -range; i <= range; i++) {
    const d = new Date(center)
    d.setDate(center.getDate() + i)
    d.setHours(12, 0, 0, 0)
    const dateStr = getLocalDateStr(d)
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
    let label = ''
    if (diff === -1) label = '昨天'
    else if (diff === 0) label = '今天'
    else if (diff === 1) label = '明天'
    else label = weekNames[d.getDay()]

    dates.push({ dateStr, day: d.getDate(), label, diff, isFuture: diff > 0 })
  }
  return dates
}
