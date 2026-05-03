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

// ====== 自定义时间工具 ======

// medKey：用药名+时间字符串作为唯一标识
export function getMedKey(medName: string, time: string | number): string {
  return medName + '_' + normalizeTime(String(time))
}

// 把各种时间格式统一成 "HH:MM"
export function normalizeTime(time: string): string {
  // 已经是 HH:MM 格式
  if (/^\d{2}:\d{2}$/.test(time)) return time
  // 旧格式 "晨起 7:00" → "07:00"
  const match = time.match(/(\d{1,2}):(\d{2})/)
  if (match) return String(match[1]).padStart(2, '0') + ':' + match[2]
  // 数字格式（如 7, 14.5）
  const num = parseFloat(time)
  if (!isNaN(num)) {
    const h = Math.floor(num)
    const m = Math.round((num - h) * 60)
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
  }
  return time
}

// "08:00" → 8, "14:30" → 14.5
export function getHourFromTime(time: string): number {
  const t = normalizeTime(time)
  const parts = t.split(':')
  return parseInt(parts[0]) + parseInt(parts[1]) / 60
}

// 根据小时返回图标
export function getTimeIcon(time: string): string {
  const hour = getHourFromTime(time)
  if (hour < 6) return '🌙'
  if (hour < 11) return '☀'
  if (hour < 14) return '🍴'
  if (hour < 17) return '☀'
  if (hour < 20) return '🍽'
  return '🌙'
}

// 根据小时返回时段标签
export function getTimeLabel(time: string): string {
  const hour = getHourFromTime(time)
  const t = normalizeTime(time)
  if (hour < 6) return '凌晨 · ' + t
  if (hour < 9) return '早晨 · ' + t
  if (hour < 12) return '上午 · ' + t
  if (hour < 14) return '中午 · ' + t
  if (hour < 17) return '下午 · ' + t
  if (hour < 20) return '傍晚 · ' + t
  return '晚间 · ' + t
}

// 向后兼容：把旧格式的 times 数组转成新格式
export function migrateTimes(times: string[]): string[] {
  if (!times) return []
  return times.map(t => normalizeTime(t))
}

// 从药品列表里收集所有时间点，排序去重
export function collectTimeSlots(medications: any[]): string[] {
  const set = new Set<string>()
  medications.forEach(m => {
    if (m.times) {
      m.times.forEach((t: string) => set.add(normalizeTime(t)))
    }
  })
  return Array.from(set).sort()
}

// ====== 保留旧的 TIME_SLOTS 用于兼容 ======
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
