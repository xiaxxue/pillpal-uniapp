// Supabase Edge Function: 代理 embedding 请求，保护 API Key
// 部署命令: supabase functions deploy embed
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const EMBEDDING_URL = 'https://api.openai.com/v1/embeddings'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { input } = await req.json()
    if (!input || typeof input !== 'string') {
      return new Response(JSON.stringify({ error: 'input required' }), { status: 400, headers: corsHeaders })
    }

    const res = await fetch(EMBEDDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input, dimensions: 1536 })
    })

    const data = await res.json()
    const embedding = data.data?.[0]?.embedding
    if (!embedding) throw new Error('No embedding returned')

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: corsHeaders
    })
  }
})
