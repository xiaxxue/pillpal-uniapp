import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../utils/supabase'

export const useMedicationsStore = defineStore('medications', () => {
  const medications = ref<any[]>([])
  const loading = ref(true)

  const fetchAll = async (userId: string) => {
    if (!userId) { medications.value = []; loading.value = false; return }
    const { data } = await supabase
      .from('medications').select('*').eq('user_id', userId).order('created_at')
    medications.value = data || []
    loading.value = false
  }

  const add = async (userId: string, med: any) => {
    med.user_id = userId
    const { data, error } = await supabase.from('medications').insert(med).select().single()
    if (error) return null
    medications.value.push(data)
    return data
  }

  const update = async (userId: string, medId: string, updates: any) => {
    if (!medId || medId.length < 10) return
    await supabase.from('medications').update(updates).eq('id', medId).eq('user_id', userId)
    const idx = medications.value.findIndex(m => m.id === medId)
    if (idx !== -1) medications.value[idx] = { ...medications.value[idx], ...updates }
  }

  const remove = async (userId: string, medId: string) => {
    if (!medId || medId.length < 10) return
    await supabase.from('medications').delete().eq('id', medId).eq('user_id', userId)
    medications.value = medications.value.filter(m => m.id !== medId)
  }

  const deductStock = async (userId: string, medId: string) => {
    const med = medications.value.find(m => m.id === medId)
    if (!med || med.stock_count <= 0) return
    await update(userId, medId, { stock_count: med.stock_count - 1 })
  }

  const restoreStock = async (userId: string, medId: string) => {
    const med = medications.value.find(m => m.id === medId)
    if (!med) return
    await update(userId, medId, { stock_count: med.stock_count + 1 })
  }

  return { medications, loading, fetchAll, add, update, remove, deductStock, restoreStock }
})
