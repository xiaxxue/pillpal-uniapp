import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../utils/supabase'
import { getTodayStr, getTimeStr, getMedKey } from '../utils/date'

export const useRecordsStore = defineStore('records', () => {
  const records = ref<Record<string, string>>({})

  const loadRecords = async (userId: string, dateStr?: string) => {
    if (!userId) return {}
    const targetDate = dateStr || getTodayStr()

    const { data: meds } = await supabase.from('medications').select('id, name').eq('user_id', userId)
    const idToName: Record<string, string> = {}
    if (meds) meds.forEach(m => { idToName[m.id] = m.name })

    const { data: dayRecords } = await supabase
      .from('daily_records').select('*').eq('user_id', userId).eq('record_date', targetDate)

    const result: Record<string, string> = {}
    if (dayRecords) {
      dayRecords.forEach(r => {
        const medName = idToName[r.medication_id] || r.medication_id
        const key = getMedKey(medName, r.time_slot || '0')
        if (r.status === 'done') {
          let timeStr = ''
          if (r.taken_at) {
            const d = new Date(r.taken_at)
            timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
          }
          result[key] = 'done_' + timeStr
        } else if (r.status === 'skip') {
          result[key] = 'skip_' + (r.skip_reason || '')
        }
      })
    }

    if (!dateStr || dateStr === getTodayStr()) {
      records.value = result
    }
    return result
  }

  const takeMed = async (userId: string, medId: string, medName: string, timeSlot: number) => {
    if (!userId || !medId) return
    const dateStr = getTodayStr()
    const timeStr = getTimeStr()
    const key = getMedKey(medName, timeSlot)
    records.value = { ...records.value, [key]: 'done_' + timeStr }

    await supabase.from('daily_records').upsert({
      user_id: userId, medication_id: medId,
      record_date: dateStr, time_slot: String(timeSlot),
      status: 'done', taken_at: new Date().toISOString()
    }, { onConflict: 'user_id, medication_id, record_date, time_slot' })
  }

  const skipMed = async (userId: string, medId: string, medName: string, timeSlot: number, reason: string) => {
    if (!userId || !medId) return
    const dateStr = getTodayStr()
    const key = getMedKey(medName, timeSlot)
    records.value = { ...records.value, [key]: 'skip_' + reason }

    await supabase.from('daily_records').upsert({
      user_id: userId, medication_id: medId,
      record_date: dateStr, time_slot: String(timeSlot),
      status: 'skip', skip_reason: reason
    }, { onConflict: 'user_id, medication_id, record_date, time_slot' })
  }

  const undoMed = async (userId: string, medId: string, medName: string, timeSlot: number) => {
    if (!userId || !medId) return
    const dateStr = getTodayStr()
    const key = getMedKey(medName, timeSlot)
    const newRecords = { ...records.value }
    delete newRecords[key]
    records.value = newRecords

    await supabase.from('daily_records').delete()
      .eq('user_id', userId).eq('medication_id', medId)
      .eq('record_date', dateStr).eq('time_slot', String(timeSlot))
  }

  const doneCount = computed(() => Object.values(records.value).filter(v => v.startsWith('done_')).length)

  return { records, loadRecords, takeMed, skipMed, undoMed, doneCount }
})
