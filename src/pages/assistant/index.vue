<template>
  <view class="page">
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
      <view v-if="messages.length === 0" class="welcome">
        <view class="welcome-logo">
          <text class="welcome-pill">💊</text>
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
            <text class="avatar-ai-icon">💊</text>
          </view>
          <view class="bubble-ai">
            <text class="bubble-ai-text">{{ msg.text }}</text>
          </view>
        </view>
      </view>

      <!-- 思考中 -->
      <view v-if="isThinking" class="msg-wrap">
        <view class="msg-ai">
          <view class="avatar-ai">
            <text class="avatar-ai-icon">💊</text>
          </view>
          <view class="bubble-ai thinking">
            <view v-for="(step, i) in thinkingSteps" :key="i" class="think-step">
              <text class="think-text">{{ step }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 20rpx;" />
    </scroll-view>

    <!-- 输入栏 -->
    <view class="input-bar">
      <input class="chat-input" :value="inputText" @input="inputText = $event.detail.value"
        placeholder="问问关于吃药的问题…" :disabled="isThinking"
        confirm-type="send" @confirm="send" />
      <view class="send-btn" :class="{ active: inputText.trim() && !isThinking }" @click="send">
        <text class="send-arrow">➤</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { normalizeTime, getTimeLabel, getMedKey } from '../../utils/date'
import { runAgent, buildUserProfile, buildRealtimeData, manageHistory } from '../../utils/ai'
import type { AgentStep } from '../../utils/ai'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()

const displayName = computed(() => userStore.displayName)

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) {
    await medsStore.fetchAll(userStore.user.id)
    await recordsStore.loadRecords(userStore.user.id)
    userProfile.value = buildUserProfile(userStore.user, medications.value)
  }
})
const medications = computed(() => medsStore.medications)
const records = computed(() => recordsStore.records)

const messages = ref<any[]>([])
const inputText = ref('')
const scrollTarget = ref('')
const isThinking = ref(false)
const thinkingSteps = ref<string[]>([])
const historySummary = ref('')
const userProfile = ref('')

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
  messages.value.push({ text, role, id: String(id).replace('.', '') })
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
    return '未知工���: ' + name
  }

  const onStep = (step: AgentStep) => {
    if (step.type === 'action') {
      const labels: Record<string, string> = {
        get_today_status: '📋 查询今日状态...', get_stock: '📦 查询库存...', get_medications: '💊 查询药品...',
        take_med: '✅ 正在打卡...', skip_med: '⏭ 记录跳过...', undo_med: '↩ 正在撤回...',
        update_stock: '📝 修改库存...', add_medication: '💊 添加药品...', remove_medication: '🗑 移除药品...'
      }
      thinkingSteps.value.push(labels[step.toolName || ''] || '🔧 执行操作...')
    }
  }

  const result = await runAgent(text, userProfile.value, realtimeData, history, executeTool, onStep)
  if (userId) {
    await medsStore.fetchAll(userId); await recordsStore.loadRecords(userId)
    userProfile.value = buildUserProfile(userStore.user, medications.value)
  }
  isThinking.value = false; thinkingSteps.value = []
  addMsg(result.text, 'assistant')
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
