import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../utils/supabase'
import { getTodayStr } from '../utils/date'

export interface PatientData {
  patient_id: string
  patient_name: string
  status: string
  medications: any[]
  today_records: any[]
}

export interface NotifyItem {
  type: string
  icon: string
  title: string
  desc: string
  who: string
  patient_id: string
  is_read: boolean
  created_at: string
  urgent?: boolean
  action?: string
}

export const useFamilyStore = defineStore('family', () => {
  const patients = ref<PatientData[]>([])
  const notifications = ref<NotifyItem[]>([])
  const loading = ref(false)

  const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

  const fetchDashboard = async () => {
    loading.value = true
    const dateStr = getTodayStr()
    const { data, error } = await supabase.rpc('get_family_dashboard', { target_date: dateStr })
    console.log('family dashboard:', { data, error, dateStr })
    if (!error && data && Array.isArray(data)) {
      patients.value = data
    } else if (!error && data === null) {
      patients.value = []
    } else {
      console.error('family dashboard error:', error)
      patients.value = []
    }
    loading.value = false
  }

  const fetchNotifications = async () => {
    const dateStr = getTodayStr()
    const { data, error } = await supabase.rpc('generate_family_notifications', { target_date: dateStr })
    console.log('family notifications:', { data, error })
    if (!error && data && Array.isArray(data)) {
      notifications.value = data
    } else {
      notifications.value = []
    }
  }

  const sendReminder = async (payload: {
    patient_id: string
    method: string
    tone: string
    message: string
  }) => {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return false

    const { error } = await supabase.from('reminders').insert({
      caregiver_id: userId,
      patient_id: payload.patient_id,
      method: payload.method,
      tone: payload.tone,
      message: payload.message,
      status: 'sent'
    })

    if (error) {
      console.error('send reminder error:', error)
      return false
    }

    // 给自己生成一条确认通知
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: '提醒已发送',
      desc: '已通过' + (payload.method === 'push' ? 'App推送' : payload.method === 'voice' ? '语音电话' : payload.method === 'sms' ? '短信' : '微信') + '提醒家人吃药',
      who: '系统',
      patient_id: payload.patient_id,
      is_read: false
    })

    return true
  }

  const markAllRead = async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    notifications.value = notifications.value.map(n => ({ ...n, is_read: true }))
  }

  return { patients, notifications, loading, unreadCount, fetchDashboard, fetchNotifications, sendReminder, markAllRead }
})
