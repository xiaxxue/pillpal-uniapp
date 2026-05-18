// Supabase Edge Function: 代理火山引擎 ASR，隐藏凭证
// 前端发送 base64 编码的 WAV 音频，服务端处理 WebSocket 二进制协议
// 部署命令: supabase functions deploy asr --no-verify-jwt
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VOLCENGINE_APP_ID = Deno.env.get('VOLCENGINE_APP_ID') ?? ''
const VOLCENGINE_TOKEN = Deno.env.get('VOLCENGINE_TOKEN') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// gzip 压缩 / 解压
async function gzipCompress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(data)
  writer.close()
  return new Uint8Array(await new Response(cs.readable).arrayBuffer())
}

async function gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(data)
  writer.close()
  return new Uint8Array(await new Response(ds.readable).arrayBuffer())
}

// 构造 ASR WebSocket 二进制帧
function buildASRFrame(msgType: number, flags: number, serial: number, compress: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(4 + 4 + payload.length)
  frame[0] = 0x11
  frame[1] = (msgType << 4) | flags
  frame[2] = (serial << 4) | compress
  frame[3] = 0x00
  new DataView(frame.buffer).setUint32(4, payload.length)
  frame.set(payload, 8)
  return frame
}

// 火山引擎 ASR WebSocket 识别
function recognizeWithVolcengine(wavBuffer: Uint8Array): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const ws = new WebSocket(
      `wss://openspeech.bytedance.com/api/v2/asr?appid=${VOLCENGINE_APP_ID}&token=${VOLCENGINE_TOKEN}&cluster=volcengine_input_common`
    )
    ws.binaryType = 'arraybuffer'
    const timer = setTimeout(() => { try { ws.close() } catch {} reject(new Error('ASR 超时')) }, 15000)

    ws.onopen = async () => {
      try {
        const config = {
          app: { appid: VOLCENGINE_APP_ID, token: VOLCENGINE_TOKEN, cluster: 'volcengine_input_common' },
          user: { uid: 'pillpal_user' },
          audio: { format: 'wav', rate: 16000, bits: 16, channel: 1, language: 'zh-CN' },
          request: {
            reqid: crypto.randomUUID(),
            workflow: 'audio_in,resample,partition,vad,fe,decode,itn,punc',
            sequence: 1, nbest: 1, show_utterances: true
          }
        }
        const configGz = await gzipCompress(new TextEncoder().encode(JSON.stringify(config)))
        ws.send(buildASRFrame(0x01, 0x00, 0x01, 0x01, configGz))

        const audioGz = await gzipCompress(wavBuffer)
        ws.send(buildASRFrame(0x02, 0x02, 0x00, 0x01, audioGz))
      } catch (e) {
        clearTimeout(timer); reject(e)
      }
    }

    ws.onmessage = async (event) => {
      try {
        const buf = new Uint8Array(event.data as ArrayBuffer)
        const msgType = (buf[1] >> 4) & 0x0F
        const compress = buf[2] & 0x0F
        const payloadLen = new DataView(buf.buffer).getUint32(4)
        const payload = buf.slice(8, 8 + payloadLen)
        const jsonBytes = compress === 1 ? await gzipDecompress(payload) : payload
        const resp = JSON.parse(new TextDecoder().decode(jsonBytes))

        if (msgType === 0x0F || (resp.code && resp.code !== 1000)) {
          clearTimeout(timer); try { ws.close() } catch {}
          reject(new Error(resp.message || 'ASR 识别失败'))
          return
        }
        if (msgType === 0x09) {
          clearTimeout(timer); try { ws.close() } catch {}
          resolve(resp.result?.[0]?.text || '')
        }
      } catch (e) {
        clearTimeout(timer); try { ws.close() } catch {}; reject(e)
      }
    }

    ws.onerror = () => { clearTimeout(timer); reject(new Error('ASR WebSocket 连接失败')) }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { audio } = await req.json()
    if (!audio) {
      return new Response(JSON.stringify({ error: 'audio required' }), {
        status: 400, headers: corsHeaders
      })
    }

    // base64 → 二进制
    const binary = atob(audio)
    const wavBuffer = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) wavBuffer[i] = binary.charCodeAt(i)

    const text = await recognizeWithVolcengine(wavBuffer)
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: corsHeaders
    })
  }
})
