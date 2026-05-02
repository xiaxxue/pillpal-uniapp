<template>
  <view class="page">
    <scroll-view scroll-y class="chat-area" :scroll-into-view="scrollTarget">
      <view class="welcome">
        <text class="welcome-icon">💬</text>
        <text class="welcome-text">你好！有什么用药问题可以问我。</text>
      </view>

      <view v-if="messages.length === 0" class="quick-q">
        <text class="qq-title">常见问题</text>
        <view v-for="q in quickQuestions" :key="q" class="qq-btn" @click="ask(q)">
          <text>{{ q }}</text>
        </view>
      </view>

      <view v-for="msg in messages" :key="msg.id" :id="'msg-' + msg.id" class="msg" :class="msg.role">
        <text class="msg-avatar">{{ msg.role === 'user' ? '我' : '💬' }}</text>
        <text class="msg-bubble">{{ msg.text }}</text>
      </view>
    </scroll-view>

    <view class="input-bar">
      <input class="chat-input" v-model="input" placeholder="输入用药问题..." @confirm="send" />
      <button class="send-btn" @click="send">➤</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { TIME_SLOTS, getMedKey } from '../../utils/date'

const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()
const medications = computed(() => medsStore.medications)
const records = computed(() => recordsStore.records)

const messages = ref<any[]>([])
const input = ref('')
const scrollTarget = ref('')

const quickQuestions = ['今天还有哪些药没吃？', '帮我查一下库存', '哪些药需要续方？']

const addMsg = (text: string, role: string) => {
  const id = Date.now()
  messages.value.push({ text, role, id })
  scrollTarget.value = 'msg-' + id
}

const processQuestion = (text: string) => {
  addMsg(text, 'user')
  setTimeout(() => {
    let reply = ''
    if (/库存|还剩|快没了/.test(text)) {
      if (medications.value.length === 0) { reply = '你还没有添加药品。'; }
      else {
        reply = '药品库存：\n'
        medications.value.forEach(m => {
          const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
          reply += `• ${m.name}：${m.stock_count}片，${days}天 ${days <= 7 ? '⚠' : '✅'}\n`
        })
      }
    } else if (/没吃|今天|漏服/.test(text)) {
      const pending: string[] = []
      medications.value.forEach(m => {
        if (!m.times) return
        m.times.forEach((t: string) => {
          const slot = TIME_SLOTS[t]
          if (!slot) return
          if (!records.value[getMedKey(m.name, slot.hour)]?.startsWith('done_')) {
            pending.push(m.name + ' ' + slot.time)
          }
        })
      })
      reply = pending.length === 0 ? '🎉 今天的药都吃完了！' : `还有 ${pending.length} 次没吃：\n${pending.map(p => '• ' + p).join('\n')}`
    } else if (/续方|帮我续/.test(text)) {
      const urgent = medications.value.filter(m => {
        const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
        return days <= 7
      })
      reply = urgent.length === 0 ? '库存都很充足，不需要续方。' : '需要续方：\n' + urgent.map(m => `• ${m.name}：${m.stock_count}片`).join('\n')
    } else {
      reply = '我可以帮你：\n• 查库存\n• 查今天吃药情况\n• 续方提醒\n\n试试问我吧！'
    }
    addMsg(reply, 'assistant')
  }, 500)
}

const ask = (text: string) => processQuestion(text)
const send = () => { if (input.value.trim()) { processQuestion(input.value.trim()); input.value = '' } }
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #f4f6f8; }
.chat-area { flex: 1; padding: 24rpx; }
.welcome { text-align: center; padding: 40rpx 0; }
.welcome-icon { font-size: 96rpx; display: block; margin-bottom: 16rpx; }
.welcome-text { font-size: 28rpx; color: #6b7280; display: block; }
.quick-q { margin: 24rpx 0; }
.qq-title { font-size: 26rpx; color: #6b7280; display: block; margin-bottom: 16rpx; }
.qq-btn { padding: 20rpx 24rpx; background: #fff; border-radius: 16rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.qq-btn:active { background: #e6f7f0; }

.msg { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.msg.user { flex-direction: row-reverse; }
.msg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; flex-shrink: 0; background: #0b9d6a; color: #fff; text-align: center; line-height: 56rpx; }
.msg.user .msg-avatar { background: #e5e7eb; color: #6b7280; }
.msg-bubble { max-width: 75%; padding: 20rpx 24rpx; border-radius: 24rpx; font-size: 28rpx; line-height: 1.6; white-space: pre-line; }
.msg.assistant .msg-bubble { background: #fff; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.msg.user .msg-bubble { background: #0b9d6a; color: #fff; }

.input-bar { display: flex; gap: 12rpx; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #e5e7eb; }
.chat-input { flex: 1; padding: 16rpx 24rpx; border: 2rpx solid #e5e7eb; border-radius: 40rpx; font-size: 28rpx; }
.send-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: #0b9d6a; color: #fff; font-size: 32rpx; display: flex; align-items: center; justify-content: center; border: none; }
</style>
