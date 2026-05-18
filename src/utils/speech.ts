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

// ===== 语音识别（通过 Supabase Edge Function 代理火山引擎 ASR）=====
// 流程：MediaRecorder 录音 → 转 16kHz WAV → 发给 Supabase → 服务端调火山引擎 → 返回文字
const SUPABASE_ASR_URL = 'https://tjipfsyiqlbmaehabmvp.supabase.co/functions/v1/asr'

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

// 发送 WAV 音频到 Supabase ASR 代理，返回识别文字
async function recognizeASR(wavBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(wavBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)

  const res = await fetch(SUPABASE_ASR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64 })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text || ''
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
          const text = await recognizeASR(wav)
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
  if (typeof MediaRecorder !== 'undefined') {
    return createVolcengineRecognizer(options)
  }
  return createWebSpeechRecognizer(options)
}

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof MediaRecorder !== 'undefined') return true
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
