// Supabase Edge Function: 代理火山引擎 TTS 请求，解决 CORS 问题
// 部署命令: supabase functions deploy tts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VOLCENGINE_APP_ID = Deno.env.get('VOLCENGINE_APP_ID') ?? ''
const VOLCENGINE_TOKEN = Deno.env.get('VOLCENGINE_TOKEN') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { text, voice, speed_ratio } = await req.json()
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text required' }), { status: 400, headers: corsHeaders })
    }

    const reqid = crypto.randomUUID()
    const res = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${VOLCENGINE_TOKEN}`
      },
      body: JSON.stringify({
        app: { appid: VOLCENGINE_APP_ID, token: VOLCENGINE_TOKEN, cluster: 'volcano_tts' },
        user: { uid: 'pillpal_user' },
        audio: {
          voice_type: voice || 'BV700_V2_streaming',
          encoding: 'mp3',
          speed_ratio: speed_ratio || 1.0,
          volume_ratio: 1.0,
          pitch_ratio: 1.0
        },
        request: { reqid, text, text_type: 'plain', operation: 'query' }
      })
    })

    const data = await res.json()
    if (data.code !== 3000) {
      throw new Error(data.message || 'TTS failed')
    }

    // 返回 base64 音频数据
    return new Response(JSON.stringify({ audio: data.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: corsHeaders
    })
  }
})
