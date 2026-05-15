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

// ===== 语音输出（Text-to-Speech）=====

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function cleanForSpeech(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')        // 去除 HTML 标签
    .replace(/\*\*/g, '')           // 去除加粗 **
    .replace(/\*/g, '')             // 去除斜体 *
    .replace(/^#{1,6}\s*/gm, '')    // 去除标题 #
    .replace(/【|】/g, '')          // 去除方括号
    .replace(/\n{2,}/g, '。')       // 多空行 → 句号停顿
    .replace(/\n/g, '，')           // 单换行 → 逗号停顿
    .trim()
}

export function speak(text: string, options?: {
  onEnd?: () => void
  onError?: (msg: string) => void
}): void {
  if (!isTTSSupported()) return
  window.speechSynthesis.cancel()
  const clean = cleanForSpeech(text)
  if (!clean) return
  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.9
  utterance.pitch = 1.0
  utterance.volume = 1.0
  utterance.onend = () => options?.onEnd?.()
  utterance.onerror = () => options?.onError?.('语音播报出现错误')
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel()
}
