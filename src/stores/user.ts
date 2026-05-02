import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../utils/supabase'

export const useUserStore = defineStore('user', () => {
  const user = ref<any>(null)
  const loading = ref(true)

  const displayName = computed(() => {
    return user.value?.user_metadata?.display_name || user.value?.email?.split('@')[0] || ''
  })

  const init = async () => {
    const { data } = await supabase.auth.getUser()
    user.value = data?.user || null
    loading.value = false

    supabase.auth.onAuthStateChange((event, session) => {
      user.value = session?.user || null
    })
  }

  const signUp = async (email: string, password: string, name: string) => {
    return await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } }
    })
  }

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    user.value = null
  }

  return { user, loading, displayName, init, signUp, signIn, signOut }
})
