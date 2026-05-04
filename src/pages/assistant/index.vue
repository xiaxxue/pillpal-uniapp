<template>
  <view class="page" :class="{ 'elder-mode': elderMode }">
    <!-- 顶栏 -->
    <view class="chat-header">
      <view style="width: 72rpx;" />
      <view class="header-center">
        <text class="header-title">小派</text>
        <view class="header-status">
          <view class="status-dot" />
          <text class="status-text">在线 · AI 用药管家</text>
        </view>
      </view>
      <view class="header-clear" :style="{ opacity: messages.length ? 1 : 0.3 }" @click="clearChat">
        <text class="clear-icon">🗑</text>
      </view>
    </view>

    <!-- 聊天区 -->
    <scroll-view scroll-y class="chat-scroll" :scroll-into-view="scrollTarget">
      <!-- 欢迎 -->
      <view v-if="messages.length === 0 && !isThinking" class="welcome">
        <view class="welcome-logo">
          <xiaopai-avatar mood="wave" :size="100" />
        </view>
        <text class="welcome-title">你好，我是小派</text>
        <text class="welcome-desc">关于吃药的问题都可以问我</text>
        <text class="welcome-sub">我会基于你的用药情况回答</text>

        <text class="quick-label">试试问我</text>
        <view class="quick-grid">
          <view v-for="q in quickQuestions" :key="q.text" class="quick-card" @click="ask(q.text)">
            <text class="quick-icon">{{ q.icon }}</text>
            <text class="quick-text">{{ q.text }}</text>
          </view>
        </view>
      </view>

      <!-- 消息 -->
      <view v-for="msg in messages" :key="msg.id" :id="'msg-' + msg.id" class="msg-wrap">
        <!-- 用户消息 -->
        <view v-if="msg.role === 'user'" class="msg-user">
          <view class="bubble-user">
            <text class="bubble-user-text">{{ msg.text }}</text>
          </view>
          <view class="avatar-user">
            <text>{{ displayName?.charAt(0) || '我' }}</text>
          </view>
        </view>
        <!-- 助手消息 -->
        <view v-else class="msg-ai">
          <view class="avatar-ai">
            <xiaopai-avatar :mood="lastMood" :size="44" />
          </view>
          <view class="bubble-ai">
            <text class="bubble-ai-text">{{ msg.text }}</text>
          </view>
        </view>
      </view>

      <!-- 流式输出气泡 -->
      <view v-if="streamingText" class="msg-wrap">
        <view class="msg-ai">
          <view class="avatar-ai">
            <xiaopai-avatar :mood="lastMood" :size="44" />
          </view>
          <view class="bubble-ai">
            <text class="bubble-ai-text">{{ streamingText }}</text>
            <view class="stream-cursor" />
          </view>
        </view>
      </view>

      <!-- 思考中 -->
      <view v-if="isThinking" class="msg-wrap">
        <view class="msg-ai">
          <view class="avatar-ai">
            <xiaopai-avatar :mood="lastMood" :size="44" />
          </view>
          <view class="bubble-ai thinking">
            <view v-for="(step, i) in thinkingSteps" :key="i" class="think-step">
              <text class="think-text">{{ step }}</text>
            </view>
          </view>
        </view>
      </view>

      <view id="stream-anchor" style="height: 20rpx;" />
    </scroll-view>

    <!-- 输入栏 -->
    <view class="input-bar">
      <view v-if="speechSupported && elderMode"
        class="mic-btn" :class="{ listening: speechState === 'listening' }"
        @click="toggleSpeech">
        <text class="mic-icon">{{ speechState === 'listening' ? '⏹' : '🎤' }}</text>
      </view>
      <input class="chat-input" :value="inputText" @input="inputText = $event.detail.value"
        :placeholder="speechState === 'listening' ? '正在聆听…' : '问问关于吃药的问题…'"
        :disabled="isThinking || speechState === 'listening'"
        confirm-type="send" @confirm="send" />
      <view v-if="speechSupported && !elderMode"
        class="mic-btn-sm" :class="{ listening: speechState === 'listening' }"
        @click="toggleSpeech">
        <text>{{ speechState === 'listening' ? '⏹' : '🎤' }}</text>
      </view>
      <view class="send-btn" :class="{ active: inputText.trim() && !isThinking && speechState !== 'listening' }" @click="send">
        <text class="send-arrow">➤</text>
      </view>
    </view>

    <custom-tab-bar current="assistant" />
  </view>
</template>

<script setup lang="ts">
// 模块级变量：跨组件重建保持状态，防止每次切标签重复问候
let _sessionGreeted = false

import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { normalizeTime, getTimeLabel, getMedKey } from '../../utils/date'
import XiaopaiAvatar from '../../components/Xiaopai.vue'
import CustomTabBar from '../../components/CustomTabBar.vue'
import { runAgent, buildUserProfile, buildRealtimeData, manageHistory, extractMemories, searchKnowledge } from '../../utils/ai'
import type { AgentStep } from '../../utils/ai'
import { useMemoryStore } from '../../stores/memory'
import { createSpeechRecognizer, isSpeechSupported } from '../../utils/speech'
import type { SpeechState, SpeechRecognizer } from '../../utils/speech'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()
const memoryStore = useMemoryStore()

const elderMode = computed(() => userStore.elderMode)
const displayName = computed(() => userStore.displayName)

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) {
    await Promise.all([
      medsStore.fetchAll(userStore.user.id),
      recordsStore.loadRecords(userStore.user.id),
      memoryStore.load(userStore.user.id)
    ])
    userProfile.value = buildUserProfile(userStore.user, medications.value, memoryStore.toPromptText())
  }
  if (!_sessionGreeted && !isThinking.value && userStore.user) {
    _sessionGreeted = true
    autoGreet()
  }
})
const medications = computed(() => medsStore.medications)
const records = computed(() => recordsStore.records)

const messages = ref<any[]>([])
const inputText = ref('')
const scrollTarget = ref('')
const isThinking = ref(false)
const thinkingSteps = ref<string[]>([])
const streamingText = ref('')
const historySummary = ref('')
const userProfile = ref('')

// 根据回复内容判断小派心情
const pickMood = (text: string): string => {
  if (/全部完成|太棒了|做得好|坚持|加油|🎉|💪/.test(text)) return 'celebrate'
  if (/已打卡|已记录|已服|✅/.test(text)) return 'happy'
  if (/漏服|忘记|没吃|⚠/.test(text)) return 'worried'
  if (/库存|快吃完|补货|紧张/.test(text)) return 'thinking'
  if (/晚安|睡前|休息/.test(text)) return 'sleeping'
  if (/不能|禁忌|注意|避免/.test(text)) return 'reading'
  if (/❤|关心|陪伴/.test(text)) return 'love'
  return 'idle'
}
const lastMood = ref('wave')

const quickQuestions = [
  { text: '今天还有哪些药没吃？', icon: '💊' },
  { text: '帮我全部打卡，都吃了', icon: '✅' },
  { text: '帮我查一下库存', icon: '📦' },
  { text: '忘吃药了怎么办？', icon: '❓' },
]

const clearChat = () => {
  if (messages.value.length) { messages.value = []; historySummary.value = '' }
}

const addMsg = (text: string, role: string) => {
  const id = Date.now() + Math.random()
  const mood = role === 'assistant' ? pickMood(text) : undefined
  if (mood) lastMood.value = mood
  messages.value.push({ text, role, id: String(id).replace('.', ''), mood })
  nextTick(() => { scrollTarget.value = 'msg-' + String(id).replace('.', '') })
}

const processQuestion = async (text: string) => {
  addMsg(text, 'user')
  isThinking.value = true
  thinkingSteps.value = ['小派正在思考...']

  let userId = userStore.user?.id
  if (!userId) { await userStore.init(); userId = userStore.user?.id }

  const realtimeData = buildRealtimeData(medications.value, records.value)
  const allHistory = messages.value.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text
  }))
  const { history, summary } = await manageHistory(allHistory, historySummary.value)
  historySummary.value = summary

  const executeTool = async (name: string, args: any): Promise<string> => {
    if (!userId) return '用户未登录'
    if (name === 'get_today_status') {
      const total = medications.value.reduce((s, m) => s + (m.times?.length || 1), 0)
      const done = Object.values(records.value).filter(v => v.startsWith('done_')).length
      let result = `今日${total}次药中已服${done}次\n`
      medications.value.forEach(m => {
        if (!m.times) return
        m.times.forEach((t: string) => {
          const time = normalizeTime(t); const label = getTimeLabel(time); const key = getMedKey(m.name, time)
          const r = records.value[key]
          const status = r?.startsWith('done_') ? '✅已服(' + r.replace('done_', '') + ')' : r?.startsWith('skip_') ? '⏭已跳过' : '⏳待服用'
          result += `${m.name} ${label} ${status}\n`
        })
      })
      return result
    }
    if (name === 'get_stock') {
      let result = ''
      medications.value.forEach(m => {
        const daily = m.daily_usage || 1; const days = m.stock_count > 0 ? Math.floor(m.stock_count / daily) : 0
        result += `${m.name}：${m.stock_count}片，${daily}片/天，可服${days}天${days <= 7 ? ' ⚠紧张' : ' ✅充足'}\n`
      })
      return result || '没有药品'
    }
    if (name === 'get_medications') {
      let result = ''
      medications.value.forEach(m => { result += `${m.name}（${m.dosage}），${m.condition}，治${m.disease}，时间：${m.times?.join('、') || '未设置'}\n` })
      return result || '没有药品'
    }
    if (name === 'take_med') return await executeTakeMed(userId!, args.med_name, args.time_slots || [])
    if (name === 'skip_med') return await executeSkipMed(userId!, args.med_name, args.time_slots || [], args.reason || '其他')
    if (name === 'undo_med') return await executeUndoMed(userId!, args.med_name, args.time_slots || [])
    if (name === 'update_stock') return await executeUpdateStock(userId!, args.med_name, args.quantity)
    if (name === 'add_medication') return await executeAddMed(userId!, args)
    if (name === 'remove_medication') return await executeRemoveMed(userId!, args.med_name)
    if (name === 'search_knowledge') return await searchKnowledge(args.query, args.drug_names) || '知识库暂无相关内容，将根据通用医学知识回答。'
    if (name === 'get_history') return await executeGetHistory(userId!, args.days || 7)
    if (name === 'update_memory') {
      await memoryStore.upsert(userId!, args.memory_type, args.key, args.value, 0.9, 'user_stated')
      return `已记住：${args.value}`
    }
    if (name === 'generate_report') return executeGenerateReport()
    return '未知工具: ' + name
  }

  const onStep = (step: AgentStep) => {
    if (step.type === 'action') {
      const labels: Record<string, string> = {
        get_today_status: '📋 查询今日状态...', get_stock: '📦 查询库存...', get_medications: '💊 查询药品...',
        take_med: '✅ 正在打卡...', skip_med: '⏭ 记录跳过...', undo_med: '↩ 正在撤回...',
        update_stock: '📝 修改库存...', add_medication: '💊 添加药品...', remove_medication: '🗑 移除药品...',
        get_history: '📅 查询历史记录...', generate_report: '📊 生成服药报告...'
      }
      thinkingSteps.value.push(labels[step.toolName || ''] || '🔧 执行操作...')
    }
  }

  let streamStarted = false
  const result = await runAgent(
    text, userProfile.value, realtimeData, history, executeTool, onStep,
    (chunk) => {
      if (!streamStarted) {
        streamStarted = true
        isThinking.value = false
        thinkingSteps.value = []
      }
      streamingText.value += chunk
      nextTick(() => { scrollTarget.value = 'stream-anchor' })
    }
  )
  if (userId) {
    await medsStore.fetchAll(userId); await recordsStore.loadRecords(userId)
    userProfile.value = buildUserProfile(userStore.user, medications.value)
  }
  isThinking.value = false; thinkingSteps.value = []
  streamingText.value = ''
  addMsg(result.text, 'assistant')

  // 后台异步提取本轮记忆（不影响体验）
  const userId2 = userStore.user?.id
  if (userId2 && messages.value.length >= 4) {
    const recentMsgs = messages.value.slice(-6).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant', content: m.text
    }))
    extractMemories(recentMsgs).then(items => {
      items.forEach(item => {
        memoryStore.upsert(userId2, item.memory_type as any, item.key, item.value, item.confidence, 'ai_inferred')
      })
      if (items.length > 0) {
        userProfile.value = buildUserProfile(userStore.user, medications.value, memoryStore.toPromptText())
      }
    })
  }
}

// === 工具执行函数 ===
const executeTakeMed = async (userId: string, medName: string, timeSlots: string[]): Promise<string> => {
  const results: string[] = []
  const matchedMeds = medName === 'all' ? medications.value : medications.value.filter(m => m.name.includes(medName) || medName.includes(m.name))
  if (matchedMeds.length === 0) return `没找到药品"${medName}"`
  for (const med of matchedMeds) {
    if (!med.times) continue
    for (const t of med.times) {
      const time = normalizeTime(t)
      if (timeSlots.length > 0 && !timeSlots.some(s => normalizeTime(String(s)) === time)) continue
      const key = getMedKey(med.name, time)
      if (!records.value[key]) {
        await recordsStore.takeMed(userId, med.id, med.name, time); await medsStore.deductStock(userId, med.id)
        results.push(`${med.name}（${getTimeLabel(time)}）`)
      }
    }
  }
  return results.length > 0 ? `已打卡：${results.join('、')}` : '这些药/时段已经打过卡了'
}
const executeSkipMed = async (userId: string, medName: string, timeSlots: string[], reason: string): Promise<string> => {
  const results: string[] = []
  const matchedMeds = medName === 'all' ? medications.value : medications.value.filter(m => m.name.includes(medName) || medName.includes(m.name))
  for (const med of matchedMeds) {
    if (!med.times) continue
    for (const t of med.times) {
      const time = normalizeTime(t)
      if (timeSlots.length > 0 && !timeSlots.some(s => normalizeTime(String(s)) === time)) continue
      const key = getMedKey(med.name, time)
      if (!records.value[key]) { await recordsStore.skipMed(userId, med.id, med.name, time, reason); results.push(`${med.name}（${getTimeLabel(time)}）`) }
    }
  }
  return results.length > 0 ? `已跳过：${results.join('、')}，原因：${reason}` : '没有需要跳过的记录'
}
const executeUndoMed = async (userId: string, medName: string, timeSlots: string[]): Promise<string> => {
  const results: string[] = []
  const matchedMeds = medName === 'all' ? medications.value : medications.value.filter(m => m.name.includes(medName) || medName.includes(m.name))
  for (const med of matchedMeds) {
    if (!med.times) continue
    for (const t of med.times) {
      const time = normalizeTime(t)
      if (timeSlots.length > 0 && !timeSlots.some(s => normalizeTime(String(s)) === time)) continue
      const key = getMedKey(med.name, time)
      if (records.value[key]?.startsWith('done_')) {
        await recordsStore.undoMed(userId, med.id, med.name, time); await medsStore.restoreStock(userId, med.id)
        results.push(`${med.name}（${getTimeLabel(time)}）`)
      }
    }
  }
  return results.length > 0 ? `已撤回：${results.join('、')}` : '没有需要撤回的记录'
}
const executeUpdateStock = async (userId: string, medName: string, quantity: number): Promise<string> => {
  const med = medications.value.find(m => m.name.includes(medName) || medName.includes(m.name))
  if (!med) return `没找到药品"${medName}"`
  await medsStore.update(userId, med.id, { stock_count: quantity })
  return `已将 ${med.name} 的库存修改为 ${quantity} 片`
}
const executeAddMed = async (userId: string, args: any): Promise<string> => {
  const dup = medications.value.find(m => m.name === args.name && m.times?.some((t: string) => args.times?.includes(t)))
  if (dup) return `${args.name} 在该时间段已存在，无需重复添加`
  const result = await medsStore.add(userId, { name: args.name, dosage: args.dosage, frequency: args.times?.length || 1, times: args.times || [], condition: args.condition || '无要求', disease: args.disease || '', stock_count: args.stock_count || 0, daily_usage: args.times?.length || 1, note: '' })
  if (result) return `已添加 ${args.name}（${args.dosage}），时间：${args.times?.join('、')}，治${args.disease}，库存${args.stock_count || 0}片`
  return '添加失败，请重试'
}
const executeRemoveMed = async (userId: string, medName: string): Promise<string> => {
  const med = medications.value.find(m => m.name.includes(medName) || medName.includes(m.name))
  if (!med) return `没找到药品"${medName}"`
  await medsStore.remove(userId, med.id)
  return `已从用药计划中移除 ${med.name}`
}

// === 历史查询 ===
const executeGetHistory = async (userId: string, days: number): Promise<string> => {
  const n = Math.min(Math.max(days, 1), 30)
  const total = medications.value.reduce((s, m) => s + (m.times?.length || 1), 0)
  if (total === 0) return '还没有添加药品，无法查询历史记录。'
  let result = `过去 ${n} 天服药记录（每天应服 ${total} 次）：\n`
  let totalDone = 0, totalSlots = 0
  for (let i = 1; i <= n; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)
    const dayRecords = await recordsStore.loadRecords(userId, dateStr)
    const done = Object.values(dayRecords).filter((v: string) => v.startsWith('done_')).length
    const skip = Object.values(dayRecords).filter((v: string) => v.startsWith('skip_')).length
    const rate = Math.round(done / total * 100)
    const icon = rate >= 80 ? '✅' : rate >= 50 ? '⚠️' : '❌'
    result += `${dateStr}：${done}/${total}（${rate}%）${skip > 0 ? ` 跳过${skip}次` : ''} ${icon}\n`
    totalDone += done; totalSlots += total
  }
  const avgRate = totalSlots > 0 ? Math.round(totalDone / totalSlots * 100) : 0
  result += `\n${n} 天平均依从率：${avgRate}%`
  return result
}

const executeGenerateReport = (): string => {
  const total = medications.value.reduce((s, m) => s + (m.times?.length || 1), 0)
  const done = Object.values(records.value).filter(v => v.startsWith('done_')).length
  const skip = Object.values(records.value).filter(v => v.startsWith('skip_')).length
  const rate = total > 0 ? Math.round(done / total * 100) : 0
  let report = `📊 今日服药报告\n`
  report += `总计 ${total} 次，已服 ${done} 次，跳过 ${skip} 次\n`
  report += `今日依从率：${rate}%\n\n`
  medications.value.forEach(m => {
    const daily = m.daily_usage || 1
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / daily) : 0
    report += `💊 ${m.name}（${m.dosage}）\n`
    report += `   库存 ${m.stock_count} 片，约 ${days} 天${days <= 7 ? ' ⚠️需补货' : ''}\n`
  })
  return report
}

// === 主动问候 ===
const autoGreet = async () => {
  if (!userStore.user) return
  const hour = new Date().getHours()
  const timeWord = hour < 6 ? '深夜了' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  isThinking.value = true
  thinkingSteps.value = ['小派正在准备...']
  const realtimeData = buildRealtimeData(medications.value, records.value)
  let streamStarted = false
  const result = await runAgent(
    `${timeWord}！请主动查看今日用药情况，用温暖简短的方式汇报状态，并给出提醒或鼓励。`,
    userProfile.value, realtimeData, [], executeTool, onStep,
    (chunk) => {
      if (!streamStarted) { streamStarted = true; isThinking.value = false; thinkingSteps.value = [] }
      streamingText.value += chunk
    }
  )
  isThinking.value = false
  thinkingSteps.value = []
  streamingText.value = ''
  addMsg(result.text, 'assistant')
}

// === 语音输入 ===
const speechSupported = ref(false)
const speechState = ref<SpeechState>('idle')
let recognizer: SpeechRecognizer | null = null

onShow(async () => {
  speechSupported.value = isSpeechSupported()
})

const toggleSpeech = () => {
  if (isThinking.value || streamingText.value) return
  if (speechState.value === 'listening') {
    recognizer?.stop()
    return
  }
  recognizer = createSpeechRecognizer({
    onResult: (text, isFinal) => {
      inputText.value = text
      if (isFinal) {
        recognizer?.destroy()
        recognizer = null
        if (text.trim()) { processQuestion(text.trim()); inputText.value = '' }
      }
    },
    onStateChange: (state) => { speechState.value = state },
    onError: (msg) => uni.showToast({ title: msg, icon: 'none' })
  })
  recognizer?.start()
}

const ask = (text: string) => processQuestion(text)
const send = () => { if (inputText.value.trim() && !isThinking.value) { processQuestion(inputText.value.trim()); inputText.value = '' } }
</script>

<style lang="scss" scoped>
.page { background: #f6f8f7; min-height: 100vh; display: flex; flex-direction: column; }

/* 顶栏 */
.chat-header {
  padding: 16rpx 32rpx; border-bottom: 2rpx solid #e7eae8;
  background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: space-between;
}
.header-center { text-align: center; }
.header-title { font-size: 28rpx; font-weight: 700; color: #0f1f1a; display: block; }
.header-status { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin-top: 4rpx; }
.status-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #0b9d6a; }
.status-text { font-size: 20rpx; color: #0b9d6a; font-weight: 500; }
.header-clear { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; }
.clear-icon { font-size: 32rpx; }

/* 聊天区 */
.chat-scroll { flex: 1; padding: 24rpx 32rpx 16rpx; background: linear-gradient(180deg, #e7f6ef 0%, #f6f8f7 24%); }

/* 欢迎 */
.welcome { display: flex; flex-direction: column; align-items: center; padding: 20rpx 0 24rpx; }
.welcome-logo {
  width: 128rpx; height: 128rpx; border-radius: 40rpx;
  background: linear-gradient(135deg, #0b9d6a, #26e69b);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 24rpx 56rpx rgba(11,157,106,0.3);
}
.welcome-pill { font-size: 64rpx; }
.welcome-title { font-size: 36rpx; font-weight: 700; color: #0f1f1a; margin-top: 24rpx; }
.welcome-desc { font-size: 24rpx; color: #6b7670; margin-top: 8rpx; text-align: center; line-height: 1.5; }
.welcome-sub { font-size: 22rpx; color: #9aa39e; margin-top: 4rpx; }
.quick-label { font-size: 20rpx; color: #9aa39e; font-weight: 600; letter-spacing: 1rpx; margin-top: 32rpx; margin-bottom: 16rpx; align-self: flex-start; }
.quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; width: 100%; }
.quick-card {
  background: #fff; border: 2rpx solid #e7eae8; border-radius: 28rpx;
  padding: 24rpx; display: flex; flex-direction: column; gap: 12rpx;
}
.quick-icon { font-size: 36rpx; }
.quick-text { font-size: 22rpx; font-weight: 500; color: #0f1f1a; line-height: 1.4; }

/* 消息 */
.msg-wrap { margin-bottom: 28rpx; }
.msg-user { display: flex; justify-content: flex-end; gap: 16rpx; }
.msg-ai { display: flex; gap: 16rpx; align-items: flex-start; }

.avatar-user {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: #e7f6ef; color: #0b9d6a;
  display: flex; align-items: center; justify-content: center;
  font-size: 22rpx; font-weight: 700; flex-shrink: 0;
}
.avatar-ai {
  width: 56rpx; height: 56rpx; border-radius: 18rpx;
  background: linear-gradient(135deg, #0b9d6a, #26e69b);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.avatar-ai-icon { font-size: 28rpx; }

.bubble-user {
  max-width: 78%; padding: 20rpx 28rpx;
  background: #0b9d6a; border-radius: 36rpx 36rpx 8rpx 36rpx;
  box-shadow: 0 4rpx 12rpx rgba(11,157,106,0.2);
}
.bubble-user-text { font-size: 26rpx; color: #fff; line-height: 1.5; white-space: pre-line; }

.bubble-ai {
  max-width: 82%; padding: 24rpx 28rpx;
  background: #fff; border: 2rpx solid #e7eae8;
  border-radius: 8rpx 36rpx 36rpx 36rpx;
}
.bubble-ai-text { font-size: 26rpx; color: #0f1f1a; line-height: 1.6; white-space: pre-line; }

/* 流式光标 */
.stream-cursor {
  display: inline-block; width: 3rpx; height: 28rpx;
  background: #0b9d6a; margin-left: 4rpx; vertical-align: middle;
  animation: blink 1s infinite;
}

/* 思考 */
.thinking { min-width: 200rpx; }
.think-step { margin-bottom: 8rpx; }
.think-step:last-child .think-text { animation: blink 1.5s infinite; }
.think-text { font-size: 22rpx; color: #6b7670; display: block; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* 输入栏 */
.input-bar {
  padding: 16rpx 24rpx 16rpx; background: #fff;
  border-top: 2rpx solid #e7eae8; display: flex; gap: 12rpx; align-items: center;
}
.mic-btn {
  width: 96rpx; height: 96rpx; border-radius: 50%;
  background: #e7f6ef; border: 2rpx solid #0b9d6a;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: background 0.2s;
}
.mic-btn.listening { background: #ff4d4f; border-color: #ff4d4f; animation: pulse 1s infinite; }
.mic-btn-sm {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: #e7f6ef; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 28rpx;
}
.mic-btn-sm.listening { background: #ffe7e7; animation: pulse 1s infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.chat-input {
  flex: 1; height: 76rpx; padding: 0 28rpx;
  background: #f6f8f7; border: 2rpx solid #e7eae8;
  border-radius: 38rpx; font-size: 26rpx; color: #0f1f1a;
}
.send-btn {
  width: 76rpx; height: 76rpx; border-radius: 50%;
  background: #e7eae8; display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.send-btn.active { background: #0b9d6a; }
.send-arrow { font-size: 32rpx; color: #fff; }
</style>
