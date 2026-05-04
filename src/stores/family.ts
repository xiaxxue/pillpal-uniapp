import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../utils/supabase'
import { getTodayStr } from '../utils/date'

export interface PatientData {
  patient_id: string
  patient_name: string
  status: string
  medications: any[]
  today_records: any[]
}

export const useFamilyStore = defineStore('family', () => {
  const patients = ref<PatientData[]>([])
  const loading = ref(false)

  const fetchDashboard = async () => {
    loading.value = true
    const dateStr = getTodayStr()
    const { data, error } = await supabase.rpc('get_family_dashboard', { target_date: dateStr })
    console.log('family dashboard:', { data, error, dateStr })
    if (!error && data && Array.isArray(data)) {
      patients.value = data
    } else if (!error && data === null) {
      // RPC 返回 null 表示没有数据
      patients.value = []
    } else {
      console.error('family dashboard error:', error)
      patients.value = []
    }
    loading.value = false
  }

  return { patients, loading, fetchDashboard }
})
