import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tjipfsyiqlbmaehabmvp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqaXBmc3lpcWxibWFlaGFibXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODQwMjAsImV4cCI6MjA5Mjg2MDAyMH0.4LLS4SrNhxgwWIQllP6QiEuOq7J-FXL_aRJOaAN9Dlc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
