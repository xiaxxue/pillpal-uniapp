<template>
  <view class="page" :class="{ 'elder-mode': elderMode }">
    <!-- 顶栏 -->
    <view class="chat-header">
      <view class="header-tts" @click="toggleTTS">
        <text class="tts-toggle-icon">{{ ttsEnabled ? '🔊' : '🔇' }}</text>
      </view>
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
      <view v-if="messages.length === 0 && !isThinking && !isGreeting" class="welcome">
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
            <view class="bubble-ai-text" v-html="renderMarkdown(msg.text)" />
            <view class="bubble-speak-btn" @click.stop="speakMessage(msg)">
              <text class="speak-btn-icon">{{ speakingMsgId === msg.id ? '⏹' : '🔊' }}</text>
              <text class="speak-btn-label">{{ speakingMsgId === msg.id ? '停止' : '朗读' }}</text>
            </view>
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
            <view class="bubble-ai-text" v-html="renderMarkdown(streamingText)" />
            <view class="stream-cursor" />
          </view>
        </view>
      </view>

      <!-- 思考中 / 问候加载中 -->
      <view v-if="isThinking || isGreeting" class="msg-wrap">
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
        :disabled="isThinking"
        confirm-type="send" @confirm="send" />
      <view v-if="speechSupported && !elderMode"
        class="mic-btn-sm" :class="{ listening: speechState === 'listening' }"
        @click="toggleSpeech">
        <text>{{ speechState === 'listening' ? '⏹' : '🎤' }}</text>
      </view>
      <view class="send-btn" :class="{ active: inputText.trim() && !isThinking }" @click="send">
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
import { createSpeechRecognizer, isSpeechSupported, speak, stopSpeaking } from '../../utils/speech'
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
const isGreeting = ref(false)  // 自动问候专用，不阻塞输入框
const historySummary = ref('')
const userProfile = ref('')

// Markdown → HTML（用于 v-html 渲染气泡内容）
const renderMarkdown = (text: string): string => {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/【(.*?)】/g, '<span class="md-tag">【$1】</span>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<span class="md-h">$1</span>')
    .replace(/^[•·]\s+(.+)$/gm, '<span class="md-li">$1</span>')
    .replace(/^-\s+(.+)$/gm, '<span class="md-li">$1</span>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<span class="md-li"><span class="md-num">$1.</span> $2</span>')
    .replace(/\n/g, '<br>')
}

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

const quickQuestions = computed(() => {
  const meds = medications.value
  const recs = records.value
  // 还没有添加药品时，引导新用户
  if (meds.length === 0) return [
    { text: '小派能帮我做什么？', icon: '💡' },
    { text: '怎么添加我的药品？', icon: '➕' },
    { text: '漏服了药怎么办？', icon: '❓' },
    { text: '什么是依从率？', icon: '📊' },
  ]
  // 计算还有哪些药没打卡
  const pendingNames = new Set<string>()
  meds.forEach(m => {
    m.times?.forEach((t: string) => {
      const key = getMedKey(m.name, normalizeTime(t))
      if (!recs[key]) pendingNames.add(m.name)
    })
  })
  const result: { text: string; icon: string }[] = []
  if (pendingNames.size > 0) {
    result.push(pendingNames.size === 1
      ? { text: `${[...pendingNames][0]}吃了，帮我打卡`, icon: '✅' }
      : { text: '今天的药全吃了，帮我全部打卡', icon: '✅' }
    )
    result.push({ text: '今天还有哪些药没吃？', icon: '💊' })
  } else {
    result.push({ text: '帮我看看这周的服药情况', icon: '📊' })
    result.push({ text: '今天全打卡了！继续保持', icon: '🎉' })
  }
  // 库存快不够了就提示补货，否则提示查库存
  const lowMed = meds.find(m => {
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
    return days <= 7
  })
  result.push(lowMed
    ? { text: `${lowMed.name}买了新的，更新一下库存`, icon: '📦' }
    : { text: '帮我查一下库存还剩多少', icon: '📦' }
  )
  // 用第一种药生成知识问题
  result.push({ text: `${meds[0].name}有什么需要注意的？`, icon: '❓' })
  return result
})

const clearChat = () => {
  if (messages.value.length) {
    messages.value = []; historySummary.value = ''
    stopSpeaking(); speakingMsgId.value = null
  }
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

  const onStep = (step: AgentStep) => {
    if (step.type === 'action') {
      const labels: Record<string, string> = {
        get_today_status: '📋 查询今日状态...', get_stock: '📦 查询库存...', get_medications: '💊 查询药品...',
        take_med: '✅ 正在打卡...', skip_med: '⏭ 记录跳过...', undo_med: '↩ 正在撤回...',
        update_stock: '📝 修改库存...', add_medication: '💊 添加药品...', remove_medication: '🗑 移除药品...',
        get_history: '📅 查询历史记录...', generate_report: '📊 生成服药报告...',
        search_knowledge: '📚 查询知识库...', update_memory: '🧠 记住这件事...'
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
    userProfile.value = buildUserProfile(userStore.user, medications.value, memoryStore.toPromptText())
  }
  isThinking.value = false; thinkingSteps.value = []
  streamingText.value = ''
  addMsg(result.text, 'assistant')

  // 语音播报（当 ttsEnabled 开启时自动朗读）
  if (ttsEnabled.value && result.text) {
    const latestMsg = messages.value[messages.value.length - 1]
    speakingMsgId.value = latestMsg.id
    speak(result.text, {
      onEnd: () => { speakingMsgId.value = null },
      onError: () => { speakingMsgId.value = null }
    })
  }

  // 后台异步提取本轮记忆（不影响体验）
  const userId2 = userStore.user?.id
  if (userId2 && messages.value.length >= 4) {
    const recentMsgs = messages.value.slice(-6).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant', content: m.text
    }))
    extractMemories(recentMsgs).then(items => {
      items.filter(item => item.confidence >= 0.85).forEach(item => {
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
    const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
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

// === 工具执行入口（组件级，processQuestion 和 autoGreet 均可调用）===
const executeTool = async (name: string, args: any): Promise<string> => {
  const userId = userStore.user?.id
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
  if (name === 'take_med') return await executeTakeMed(userId, args.med_name, args.time_slots || [])
  if (name === 'skip_med') return await executeSkipMed(userId, args.med_name, args.time_slots || [], args.reason || '其他')
  if (name === 'undo_med') return await executeUndoMed(userId, args.med_name, args.time_slots || [])
  if (name === 'update_stock') return await executeUpdateStock(userId, args.med_name, args.quantity)
  if (name === 'add_medication') return await executeAddMed(userId, args)
  if (name === 'remove_medication') return await executeRemoveMed(userId, args.med_name)
  if (name === 'search_knowledge') return await searchKnowledge(args.query, args.drug_names) || '知识库暂无相关内容，将根据通用医学知识回答。'
  if (name === 'get_history') return await executeGetHistory(userId, args.days || 7)
  if (name === 'update_memory') {
    await memoryStore.upsert(userId, args.memory_type, args.key, args.value, 0.9, 'user_stated')
    return `已记住：${args.value}`
  }
  if (name === 'generate_report') return executeGenerateReport()
  return '未知工具: ' + name
}

// === 主动问候（不阻塞输入框）===
const autoGreet = async () => {
  if (!userStore.user) return
  const now = new Date()
  const hour = now.getHours()
  const timeWord = hour < 6 ? '深夜了' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  isGreeting.value = true
  const realtimeData = buildRealtimeData(medications.value, records.value)

  // 本地预分析：计算漏服和库存情况，给 AI 更有针对性的任务
  const nowMinutes = hour * 60 + now.getMinutes()
  const overdueMeds: string[] = []
  medications.value.forEach(m => {
    if (!m.times) return
    m.times.forEach((t: string) => {
      const time = normalizeTime(t)
      const [th, tm] = time.split(':').map(Number)
      const medMinutes = th * 60 + tm
      const key = getMedKey(m.name, time)
      // 过了应服时间 30 分钟以上且未打卡
      if (nowMinutes > medMinutes + 30 && !records.value[key]) {
        overdueMeds.push(`${m.name}（应服 ${time}）`)
      }
    })
  })
  const lowStock = medications.value.filter(m => {
    const daily = m.daily_usage || 1
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / daily) : 0
    return days > 0 && days <= 7
  })

  // 根据分析结果组装更有信息量的问候提示
  let greetPrompt = `${timeWord}！`
  if (overdueMeds.length > 0) {
    greetPrompt += `以下药品已过应服时间但尚未打卡：${overdueMeds.join('、')}。请先关注这件事，根据具体药品给出是否还能补服的建议，语气温和不要责备。`
  } else {
    greetPrompt += `请查看今日用药进度，用温暖简短的方式汇报状态，并给出鼓励或下一步提醒。`
  }
  if (lowStock.length > 0) {
    const stockDesc = lowStock.map(m => {
      const days = Math.floor(m.stock_count / (m.daily_usage || 1))
      return `${m.name}约剩${days}天`
    }).join('、')
    greetPrompt += `另外记得提醒用户补货：${stockDesc}。`
  }

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 12000)
  )
  try {
    const result = await Promise.race([
      runAgent(greetPrompt, userProfile.value, realtimeData, [], executeTool, undefined,
        (chunk) => { streamingText.value += chunk }
      ),
      timeout
    ])
    streamingText.value = ''
    addMsg(result.text, 'assistant')
    if (ttsEnabled.value && result.text) {
      const latestMsg = messages.value[messages.value.length - 1]
      speakingMsgId.value = latestMsg.id
      speak(result.text, {
        onEnd: () => { speakingMsgId.value = null },
        onError: () => { speakingMsgId.value = null }
      })
    }
  } catch {
    streamingText.value = ''
  } finally {
    isGreeting.value = false
  }
}

// === 语音输入 ===
const speechSupported = ref(false)
const speechState = ref<SpeechState>('idle')
let recognizer: SpeechRecognizer | null = null

// === 语音输出 ===
const ttsEnabled = ref(false)
const speakingMsgId = ref<string | null>(null)

onShow(async () => {
  speechSupported.value = isSpeechSupported()
  ttsEnabled.value = uni.getStorageSync('pillpal_tts_enabled') === 'true'
})

const toggleTTS = () => {
  ttsEnabled.value = !ttsEnabled.value
  uni.setStorageSync('pillpal_tts_enabled', String(ttsEnabled.value))
  if (!ttsEnabled.value) { stopSpeaking(); speakingMsgId.value = null }
  uni.showToast({ title: ttsEnabled.value ? '语音播报已开启' : '语音播报已关闭', icon: 'none', duration: 1500 })
}

const speakMessage = (msg: { id: string; text: string }) => {
  if (speakingMsgId.value === msg.id) {
    stopSpeaking(); speakingMsgId.value = null; return
  }
  speakingMsgId.value = msg.id
  speak(msg.text, {
    onEnd: () => { speakingMsgId.value = null },
    onError: () => { speakingMsgId.value = null }
  })
}

const toggleSpeech = () => {
  if (isThinking.value || streamingText.value) return
  stopSpeaking(); speakingMsgId.value = null
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

const ask = (text: string) => { stopSpeaking(); speakingMsgId.value = null; processQuestion(text) }
const send = () => { if (inputText.value.trim() && !isThinking.value) { stopSpeaking(); speakingMsgId.value = null; processQuestion(inputText.value.trim()); inputText.value = '' } }
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
.header-tts { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; }
.tts-toggle-icon { font-size: 36rpx; }

.bubble-speak-btn {
  margin-top: 16rpx; display: flex; align-items: center; gap: 8rpx;
  padding-top: 12rpx; border-top: 1rpx solid #f0f2f1;
}
.speak-btn-icon { font-size: 24rpx; opacity: 0.55; }
.speak-btn-label { font-size: 20rpx; color: #9aa39e; }

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
.bubble-ai-text { font-size: 26rpx; color: #0f1f1a; line-height: 1.6; }
:deep(.bubble-ai-text strong) { font-weight: 700; color: #0f1f1a; }
:deep(.bubble-ai-text em) { font-style: italic; color: #4a7c6a; }
:deep(.bubble-ai-text .md-tag) { color: #0b9d6a; font-weight: 600; }
:deep(.bubble-ai-text .md-h) { display: block; font-weight: 700; font-size: 28rpx; margin: 8rpx 0 4rpx; color: #0f1f1a; }
:deep(.bubble-ai-text .md-li) { display: block; padding-left: 24rpx; position: relative; margin: 4rpx 0; }
:deep(.bubble-ai-text .md-li::before) { content: '•'; position: absolute; left: 6rpx; color: #0b9d6a; font-weight: 700; }
:deep(.bubble-ai-text .md-num) { color: #0b9d6a; font-weight: 700; }

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
