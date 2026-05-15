// 语音输入工具（Web Speech API）
// 仅在支持的浏览器下可用（Chrome / Safari iOS 16.4+）

export type SpeechState = 'idle' | 'listening' | 'processing' | 'unsupported'

export interface SpeechRecognizer {
  start: () => void
  stop: () => void
  destroy: () => void
}

export function createSpeechRecognizer(options: {
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
    const text = result[0].transcript
    const isFinal = result.isFinal
    options.onResult(text, isFinal)
    if (isFinal) options.onStateChange('processing')
  }

  return {
    start() {
      try { recognition.start() } catch {}
    },
    stop() {
      try { recognition.stop() } catch {}
    },
    destroy() {
      try { recognition.abort() } catch {}
    }
  }
}

export function isSpeechSupported(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  )
}

// ===== 语音输出（Edge TTS — 微软神经语音）=====
// 使用 Edge 浏览器内置的 TTS 服务，免费、高质量中文语音
// 通过 WebSocket 直连微软 TTS 服务，返回 MP3 音频

const EDGE_TTS_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const EDGE_TTS_VOICE = 'zh-CN-XiaoxiaoNeural'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function cleanForTTS(text: string): string {
  return text
    .replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/^#{1,6}\s*/gm, '').replace(/【|】/g, '')
    .trim()
}

function synthesizeEdgeTTS(text: string): Promise<Blob> {
  const clean = cleanForTTS(text)
  if (!clean) return Promise.resolve(new Blob())

  const id = crypto.randomUUID().replace(/-/g, '')
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TTS_TOKEN}&ConnectionId=${id}`

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const chunks: Uint8Array[] = []
    const timer = setTimeout(() => { try { ws.close() } catch {} reject(new Error('TTS timeout')) }, 15000)

    ws.onopen = () => {
      ws.send(
        `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`
      )
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'><voice name='${EDGE_TTS_VOICE}'>${escapeXml(clean)}</voice></speak>`
      ws.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`)
    }

    ws.onmessage = async (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('Path:turn.end')) {
          clearTimeout(timer)
          try { ws.close() } catch {}
          resolve(new Blob(chunks, { type: 'audio/mpeg' }))
        }
      } else {
        let buf: ArrayBuffer
        if (event.data instanceof Blob) buf = await event.data.arrayBuffer()
        else if (event.data instanceof ArrayBuffer) buf = event.data
        else return
        if (buf.byteLength < 2) return
        const headerLen = new DataView(buf).getUint16(0)
        if (buf.byteLength > 2 + headerLen) {
          chunks.push(new Uint8Array(buf, 2 + headerLen))
        }
      }
    }

    ws.onerror = () => { clearTimeout(timer); reject(new Error('TTS WebSocket error')) }
  })
}

// 音频队列播放器：按顺序播放多段音频
export class TTSPlayer {
  private queue: Promise<Blob>[] = []
  private processing = false
  private currentAudio: HTMLAudioElement | null = null
  private _stopped = false
  onStateChange?: (speaking: boolean) => void

  enqueue(text: string) {
    if (this._stopped) return
    this.queue.push(synthesizeEdgeTTS(text))
    if (!this.processing) this.processQueue()
  }

  private async processQueue() {
    this.processing = true
    this.onStateChange?.(true)
    while (this.queue.length > 0 && !this._stopped) {
      try {
        const blob = await this.queue.shift()!
        if (blob.size > 0 && !this._stopped) await this.playBlob(blob)
      } catch (e) { console.warn('TTS error:', e) }
    }
    this.processing = false
    this.onStateChange?.(false)
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      this.currentAudio = audio
      const done = () => { URL.revokeObjectURL(url); this.currentAudio = null; resolve() }
      audio.onended = done
      audio.onerror = done
      audio.play().catch(done)
    })
  }

  async speak(text: string) {
    this.stop()
    this._stopped = false
    this.enqueue(text)
  }

  stop() {
    this._stopped = true
    this.queue = []
    if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null }
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
