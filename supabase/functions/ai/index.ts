// Supabase Edge Function: 代理 DeepSeek API，隐藏 API Key
// 部署命令: supabase functions deploy ai --no-verify-jwt
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()

    const upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    // 转发错误状态码（402 余额不足、429 限流等）
    if (!upstream.ok) {
      const errText = await upstream.text()
      return new Response(errText, {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 流式（SSE）：直接透传 ReadableStream
    if (body.stream && upstream.body) {
      return new Response(upstream.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no'
        }
      })
    }

    // 非流式：透传 JSON
    const data = await upstream.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: corsHeaders
    })
  }
})
