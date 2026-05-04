import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../utils/supabase'

export interface MemoryItem {
  id: string
  memory_type: 'preference' | 'medical_note' | 'habit' | 'context'
  key: string
  value: string
  confidence: number
  source: string
  updated_at: string
}

export const useMemoryStore = defineStore('memory', () => {
  const memories = ref<MemoryItem[]>([])

  const load = async (userId: string) => {
    if (!userId) return
    const { data } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .gte('confidence', 0.7)
      .order('updated_at', { ascending: false })
    memories.value = data || []
  }

  const upsert = async (
    userId: string,
    memoryType: MemoryItem['memory_type'],
    key: string,
    value: string,
    confidence = 0.9,
    source = 'ai_inferred'
  ) => {
    if (!userId || !value.trim()) return
    const { data } = await supabase
      .from('user_memory')
      .upsert(
        { user_id: userId, memory_type: memoryType, key, value, confidence, source, updated_at: new Date().toISOString() },
        { onConflict: 'user_id, memory_type, key' }
      )
      .select()
      .single()
    if (data) {
      const idx = memories.value.findIndex(m => m.memory_type === memoryType && m.key === key)
      if (idx !== -1) memories.value[idx] = data
      else memories.value.unshift(data)
    }
  }

  const remove = async (userId: string, id: string) => {
    await supabase.from('user_memory').delete().eq('id', id).eq('user_id', userId)
    memories.value = memories.value.filter(m => m.id !== id)
  }

  // 格式化为注入 system prompt 的文本（最多 150 token）
  const toPromptText = (): string => {
    if (memories.value.length === 0) return ''
    const grouped: Record<string, string[]> = {}
    for (const m of memories.value) {
      if (!grouped[m.memory_type]) grouped[m.memory_type] = []
      grouped[m.memory_type].push(m.value)
    }
    const lines: string[] = []
    if (grouped['medical_note']) lines.push(`【医嘱/重要】${grouped['medical_note'].join(' | ')}`)
    if (grouped['preference']) lines.push(`【偏好】${grouped['preference'].join(' | ')}`)
    if (grouped['habit']) lines.push(`【习惯】${grouped['habit'].join(' | ')}`)
    if (grouped['context']) lines.push(`【上次关注】${grouped['context'].slice(0, 2).join(' | ')}`)
    return lines.join('\n')
  }

  return { memories, load, upsert, remove, toPromptText }
})
