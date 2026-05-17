// 语音输入（火山引擎 ASR）+ 语音输出（火山引擎 TTS）
// ASR：WebSocket 二进制协议，录音后一次性识别
// TTS：REST API，返回 base64 编码的 MP3 音频
// 两者均不可用时自动退回浏览器原生 API

export type SpeechState = 'idle' | 'listening' | 'processing' | 'unsupported'

export interface SpeechRecognizer {
  start: () => void
  stop: () => void
  destroy: () => void
}

// ===== 火山引擎公共配置 =====
const VOLCENGINE_APP_ID = '9798961393'
const VOLCENGINE_TOKEN = '_8PCxanbYgnsxogWnjS3v72kzEmXRYzU'

// ===== gzip 压缩 / 解压（浏览器原生 CompressionStream）=====
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

// ===== 语音识别（火山引擎 ASR）=====
// 流程：MediaRecorder 录音 → 转 16kHz WAV → WebSocket 发给火山引擎 → 返回文字

// 构造 ASR WebSocket 二进制帧
function buildASRFrame(msgType: number, flags: number, serial: number, compress: number, payload: Uint8Array): ArrayBuffer {
  const frame = new Uint8Array(4 + 4 + payload.length)
  frame[0] = 0x11  // protocol_version=1, header_size=1（4字节）
  frame[1] = (msgType << 4) | flags
  frame[2] = (serial << 4) | compress
  frame[3] = 0x00
  new DataView(frame.buffer).setUint32(4, payload.length)
  frame.set(payload, 8)
  return frame.buffer
}

// 录音 Blob → 16kHz 单声道 WAV（用 OfflineAudioContext 重采样）
async function toWav16k(audioBlob: Blob): Promise<ArrayBuffer> {
  const audioCtx = new AudioContext()
  const decoded = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer())
  audioCtx.close()

  const targetRate = 16000
  const offlineCtx = new OfflineAudioContext(1, decoded.duration * targetRate, targetRate)
  const src = offlineCtx.createBufferSource()
  src.buffer = decoded
  src.connect(offlineCtx.destination)
  src.start()
  const rendered = await offlineCtx.startRendering()
  const pcm = rendered.getChannelData(0)

  // 编码 WAV 文件
  const buf = new ArrayBuffer(44 + pcm.length * 2)
  const v = new DataView(buf)
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true)
  w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, targetRate, true); v.setUint32(28, targetRate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w(36, 'data'); v.setUint32(40, pcm.length * 2, true)
  let off = 44
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    off += 2
  }
  return buf
}

// 发送 WAV 音频到火山引擎 ASR，返回识别文字
function recognizeWithVolcengine(wavBuffer: ArrayBuffer): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const ws = new WebSocket(
      `wss://openspeech.bytedance.com/api/v2/asr?appid=${VOLCENGINE_APP_ID}&token=${VOLCENGINE_TOKEN}&cluster=volcengine_input_common`
    )
    ws.binaryType = 'arraybuffer'
    const timer = setTimeout(() => { try { ws.close() } catch {} reject(new Error('ASR 超时')) }, 15000)

    ws.onopen = async () => {
      try {
        // 1) 发送配置帧（JSON gzip）
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

        // 2) 发送音频帧（最后一帧，flags=0x02）
        const audioGz = await gzipCompress(new Uint8Array(wavBuffer))
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
        // 完整服务端响应（msgType=0x09）
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

// 火山引擎 ASR 语音识别器（MediaRecorder 录音 → 转码 → 识别）
function createVolcengineRecognizer(options: {
  onResult: (text: string, isFinal: boolean) => void
  onStateChange: (state: SpeechState) => void
  onError?: (msg: string) => void
}): SpeechRecognizer {
  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []

  const doStart = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunks = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        options.onStateChange('processing')
        try {
          const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
          const wav = await toWav16k(blob)
          const text = await recognizeWithVolcengine(wav)
          if (text) {
            options.onResult(text, true)
          } else {
            options.onError?.('没有听到声音，请重试')
          }
        } catch (e: any) {
          console.warn('火山引擎 ASR failed:', e)
          options.onError?.('语音识别失败，请重试')
        }
        options.onStateChange('idle')
        stream?.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      options.onStateChange('listening')
    } catch (e: any) {
      options.onError?.(e.name === 'NotAllowedError' ? '请在浏览器设置中允许麦克风权限' : '无法启动语音录制')
      options.onStateChange('idle')
    }
  }

  return {
    start() { doStart().catch(() => {}) },
    stop() { if (recorder?.state === 'recording') recorder.stop() },
    destroy() {
      try { if (recorder?.state === 'recording') recorder.stop() } catch {}
      stream?.getTracks().forEach(t => t.stop())
    }
  }
}

// Web Speech API 语音识别器（兜底方案）
function createWebSpeechRecognizer(options: {
  onResult: (text: string, isFinal: boolean) => void
  onStateChange: (state: SpeechState) => void
  onError?: (msg: string) => void
}): SpeechRecognizer | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) {
    options.onStateChange('unsupported')
    return null
  }
  const recognition = new SR()
  recognition.lang = 'zh-CN'
  recognition.continuous = false
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  recognition.onstart = () => options.onStateChange('listening')
  recognition.onend = () => options.onStateChange('idle')
  recognition.onerror = (e: any) => {
    const msg = e.error === 'not-allowed' ? '请在浏览器设置中允许麦克风权限'
      : e.error === 'no-speech' ? '没有听到声音，请重试'
      : '语音识别出现问题，请重试'
    options.onError?.(msg)
    options.onStateChange('idle')
  }
  recognition.onresult = (e: any) => {
    const result = e.results[e.results.length - 1]
    options.onResult(result[0].transcript, result.isFinal)
    if (result.isFinal) options.onStateChange('processing')
  }
  return {
    start() { try { recognition.start() } catch {} },
    stop() { try { recognition.stop() } catch {} },
    destroy() { try { recognition.abort() } catch {} }
  }
}

// 创建语音识别器：优先火山引擎 ASR，不支持时退回 Web Speech API
export function createSpeechRecognizer(options: {
  onResult: (text: string, isFinal: boolean) => void
  onStateChange: (state: SpeechState) => void
  onError?: (msg: string) => void
}): SpeechRecognizer | null {
  if (typeof MediaRecorder !== 'undefined' && typeof CompressionStream !== 'undefined') {
    return createVolcengineRecognizer(options)
  }
  return createWebSpeechRecognizer(options)
}

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof MediaRecorder !== 'undefined' && typeof CompressionStream !== 'undefined') return true
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

// ===== 语音输出（火山引擎 TTS — 通过 Supabase Edge Function 代理）=====
// 前端不能直接调火山引擎（CORS 限制），通过 Supabase 服务器端中转

const SUPABASE_TTS_URL = 'https://tjipfsyiqlbmaehabmvp.supabase.co/functions/v1/tts'

function cleanForTTS(text: string): string {
  return text
    .replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/^#{1,6}\s*/gm, '').replace(/【|】/g, '')
    .trim()
}

function synthesizeTTS(text: string): Promise<Blob> {
  const clean = cleanForTTS(text)
  if (!clean) return Promise.resolve(new Blob())

  return fetch(SUPABASE_TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: clean })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error)
    const binary = atob(data.audio)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: 'audio/mpeg' })
  })
}

// 音频队列播放器：按顺序播放，火山引擎 TTS 失败时自动退回浏览器语音
export class TTSPlayer {
  private queue: string[] = []
  private processing = false
  private currentAudio: HTMLAudioElement | null = null
  private _stopped = false
  private _runId = 0
  onStateChange?: (speaking: boolean) => void
  onError?: (msg: string) => void

  enqueue(text: string) {
    if (this._stopped) return
    this.queue.push(text)
    if (!this.processing) this.processQueue()
  }

  private async processQueue() {
    const runId = ++this._runId
    this.processing = true
    this.onStateChange?.(true)
    while (this.queue.length > 0 && !this._stopped && this._runId === runId) {
      const text = this.queue.shift()!
      try {
        const blob = await synthesizeTTS(text)
        if (blob.size > 0 && !this._stopped && this._runId === runId) await this.playBlob(blob)
      } catch (e) {
        console.warn('火山引擎 TTS failed:', e)
        this.onError?.('语音合成暂不可用，使用备用语音')
        if (!this._stopped && this._runId === runId) await this.fallbackSpeak(text)
      }
    }
    if (this._runId === runId) {
      this.processing = false
      this.onStateChange?.(false)
    }
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      this.currentAudio = audio
      let resolved = false
      const done = () => {
        if (resolved) return
        resolved = true
        URL.revokeObjectURL(url); this.currentAudio = null; resolve()
      }
      audio.onended = done
      audio.onerror = done
      audio.play().catch(done)
    })
  }

  private fallbackSpeak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) { resolve(); return }
      const clean = cleanForTTS(text)
      if (!clean) { resolve(); return }
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(clean)
      u.lang = 'zh-CN'; u.rate = 0.9
      u.onend = () => resolve()
      u.onerror = () => resolve()
      window.speechSynthesis.speak(u)
    })
  }

  async speak(text: string) {
    this.stop()
    this._stopped = false
    this.enqueue(text)
  }

  stop() {
    this._stopped = true
    this._runId++
    this.queue = []
    if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    this.processing = false
    this.onStateChange?.(false)
  }

  reset() { this.stop(); this._stopped = false }
  get isSpeaking() { return this.processing }
}

// 流式句子检测器：文字一句一句到达时，检测句末并回调
export class SentenceDetector {
  private buf = ''
  private cb: (sentence: string) => void
  constructor(onSentence: (sentence: string) => void) { this.cb = onSentence }

  feed(chunk: string) {
    this.buf += chunk
    const re = /[。！？；\n!?;]/
    let m = this.buf.match(re)
    while (m && m.index !== undefined) {
      const sentence = this.buf.slice(0, m.index + 1).trim()
      this.buf = this.buf.slice(m.index + 1)
      if (sentence) this.cb(sentence)
      m = this.buf.match(re)
    }
  }

  flush() {
    const rest = this.buf.trim()
    this.buf = ''
    if (rest) this.cb(rest)
  }
}
