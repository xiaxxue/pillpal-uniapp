<template>
  <view class="page">
    <view class="chat-area">
      <!-- 欢迎区 -->
      <view class="welcome-card">
        <view class="welcome-avatar-wrap">
          <view class="welcome-avatar">💬</view>
        </view>
        <text class="welcome-title">小派用药助手</text>
        <text class="welcome-desc">关于吃药的问题都可以问我</text>
      </view>

      <!-- 快捷问题 -->
      <view v-if="messages.length === 0" class="quick-section">
        <text class="quick-label">💡 试试问我</text>
        <view class="quick-grid">
          <view v-for="q in quickQuestions" :key="q.text" class="quick-card" @click="ask(q.text)">
            <text class="quick-icon">{{ q.icon }}</text>
            <text class="quick-text">{{ q.text }}</text>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view v-for="msg in messages" :key="msg.id" :id="'msg-' + msg.id" class="msg-row" :class="msg.role">
        <!-- 助手消息 -->
        <view v-if="msg.role === 'assistant'" class="msg-left">
          <view class="avatar-ai">💬</view>
          <view class="bubble-ai">
            <text class="bubble-text">{{ msg.text }}</text>
          </view>
        </view>
        <!-- 用户消息 -->
        <view v-else class="msg-right">
          <view class="bubble-user">
            <text class="bubble-text-user">{{ msg.text }}</text>
          </view>
          <view class="avatar-user">我</view>
        </view>
      </view>

      <!-- 思考中 -->
      <view v-if="isThinking" class="msg-row assistant">
        <view class="msg-left">
          <view class="avatar-ai">💬</view>
          <view class="bubble-ai">
            <text class="thinking-text">小派正在思考中...</text>
          </view>
        </view>
      </view>

    </view>

    <!-- 输入栏 -->
    <view class="input-bar">
      <textarea class="chat-input" v-model="inputText" placeholder="输入你的用药问题..." :auto-height="true" :maxlength="200" confirm-type="send" @confirm="send" />
      <view class="send-btn" @click="send"><text>发送</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { TIME_SLOTS, getMedKey } from '../../utils/date'
import { askAI, buildContext } from '../../utils/ai'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) {
    await medsStore.fetchAll(userStore.user.id)
    await recordsStore.loadRecords(userStore.user.id)
  }
})
const medications = computed(() => medsStore.medications)
const records = computed(() => recordsStore.records)

const messages = ref<any[]>([])
const inputText = ref('')
const scrollTarget = ref('')
const isThinking = ref(false)

const quickQuestions = [
  { text: '今天还有哪些药没吃？', icon: '💊' },
  { text: '帮我全部打卡，都吃了', icon: '✅' },
  { text: '帮我查一下库存', icon: '📦' },
  { text: '哪些药需要续方？', icon: '📋' },
  { text: '忘吃药了怎么办？', icon: '😰' },
  { text: '吃药期间能喝酒吗？', icon: '🍷' }
]

const addMsg = (text: string, role: string) => {
  const id = Date.now() + Math.random()
  messages.value.push({ text, role, id: String(id).replace('.', '') })
  nextTick(() => { scrollTarget.value = 'msg-' + String(id).replace('.', '') })
}

const processQuestion = async (text: string) => {
  addMsg(text, 'user')
  isThinking.value = true

  let userId = userStore.user?.id
  if (!userId) {
    // 尝试重新初始化
    await userStore.init()
    userId = userStore.user?.id
  }
  console.log('小派操作: userId=', userId, 'text=', text)
  let actionResult = ''

  // === 检测操作意图并执行 ===

  // 打卡：如"帮我打卡"、"氨氯地平已经吃了"、"记录一下吃药了"
  const matchTake = /打卡|吃了|已经服|帮我记录|标记.*服用/.test(text)
  console.log('匹配打卡意图:', matchTake, 'userId:', !!userId)
  if (matchTake && userId) {
    // 识别时间段
    const mentionedSlots = matchTimeSlots(text)
    const medName = matchMedName(text)

    if (/全部|所有/.test(text) && /都吃了|打卡/.test(text)) {
      // 明确说"全部都吃了"才全打
      const pending = getPendingMeds()
      if (pending.length > 0) {
        for (const p of pending) {
          await doTakeMed(userId, p.name, p.hour)
        }
        actionResult = `已帮你打卡全部 ${pending.length} 次服药记录`
      } else {
        actionResult = '今天的药已经全部打过卡了'
      }
    } else if (mentionedSlots.length > 0) {
      // 指定了时间段，只打这些时段的卡
      let count = 0
      const pending = getPendingMeds()
      for (const p of pending) {
        if (mentionedSlots.includes(p.hour)) {
          await doTakeMed(userId, p.name, p.hour)
          count++
        }
      }
      actionResult = count > 0 ? `已打卡 ${count} 次（${mentionedSlots.map(h => getSlotLabel(h)).join('、')}）` : '这些时段已经打过卡了'
    } else if (medName) {
      // 指定了药名
      const result = await doTakeMed(userId, medName)
      actionResult = result
    } else {
      // 没有明确指定，提示用户
      const pending = getPendingMeds()
      if (pending.length > 0) {
        actionResult = `你有 ${pending.length} 次药还没吃，请告诉我：\n• 具体哪个药吃了（如"氨氯地平吃了"）\n• 或哪个时段吃了（如"晨起的吃了"）\n• 或说"全部都吃了"`
      } else {
        actionResult = '今天的药已经全部打过卡了'
      }
    }
  }

  // 修改库存：如"氨氯地平还有50片"、"修改库存"
  if (/库存.*改|修改.*库存|还有\d+片|剩\d+片|补货|买了.*片/.test(text) && userId) {
    const medName = matchMedName(text)
    const numMatch = text.match(/(\d+)\s*片/)
    if (medName && numMatch) {
      const qty = parseInt(numMatch[1])
      const med = medications.value.find(m => m.name.includes(medName) || medName.includes(m.name))
      if (med) {
        await medsStore.update(userId, med.id, { stock_count: qty })
        actionResult = `已将 ${med.name} 的库存修改为 ${qty} 片`
      }
    }
  }

  // 撤回打卡
  if (/撤回|取消|撤销|打错|没吃|还没吃|没有吃|取消打卡|恢复/.test(text) && !/没吃完|没吃过/.test(text) && userId) {
    const medName = matchMedName(text)
    const mentionedSlots = matchTimeSlots(text)

    if (/全部|所有/.test(text)) {
      // 撤回全部
      let count = 0
      for (const med of medications.value) {
        if (!med.times) continue
        for (const t of med.times) {
          const slot = TIME_SLOTS[t]
          if (!slot) continue
          const key = getMedKey(med.name, slot.hour)
          if (records.value[key]?.startsWith('done_')) {
            await recordsStore.undoMed(userId, med.id, med.name, slot.hour)
            await medsStore.restoreStock(userId, med.id)
            count++
          }
        }
      }
      actionResult = count > 0 ? `已撤回全部 ${count} 次打卡记录` : '没有需要撤回的打卡记录'
    } else if (mentionedSlots.length > 0) {
      // 撤回指定时段
      let count = 0
      for (const med of medications.value) {
        if (!med.times) continue
        for (const t of med.times) {
          const slot = TIME_SLOTS[t]
          if (!slot || !mentionedSlots.includes(slot.hour)) continue
          const key = getMedKey(med.name, slot.hour)
          if (records.value[key]?.startsWith('done_')) {
            await recordsStore.undoMed(userId, med.id, med.name, slot.hour)
            await medsStore.restoreStock(userId, med.id)
            count++
          }
        }
      }
      actionResult = count > 0 ? `已撤回 ${count} 次打卡（${mentionedSlots.map(h => getSlotLabel(h)).join('、')}）` : '这些时段没有打卡记录'
    } else if (medName) {
      const result = await doUndoMed(userId, medName)
      actionResult = result
    } else {
      actionResult = '请告诉我要撤回哪个药或哪个时段，如"撤回晨起的"或"撤回氨氯地平"'
    }
  }

  // === 构建上下文调用 AI ===
  await medsStore.fetchAll(userId!) // 刷新最新数据
  await recordsStore.loadRecords(userId!)
  const context = buildContext(medications.value, records.value)
  const aiContext = actionResult
    ? context + '\n\n【刚刚执行的操作】\n' + actionResult + '\n请基于操作结果给用户友好的回复。'
    : context

  const reply = await askAI(text, aiContext)

  isThinking.value = false
  addMsg(reply, 'assistant')
}

// === 辅助函数 ===

// 从用户消息里匹配时间段
const matchTimeSlots = (text: string): number[] => {
  const slots: number[] = []
  if (/晨起|早上|早晨|7点|7:00/.test(text)) slots.push(7)
  if (/早餐后|早饭后|8点|8:00/.test(text)) slots.push(8)
  if (/午餐后|午饭后|中午|14/.test(text)) slots.push(14.5)
  if (/晚餐后|晚饭后|18/.test(text)) slots.push(18.5)
  if (/晚间|睡前|晚上|21/.test(text)) slots.push(21)
  return slots
}

// 时间段小时数转标签
const getSlotLabel = (hour: number): string => {
  const map: Record<number, string> = { 7: '晨起', 8: '早餐后', 14.5: '午餐后', 18.5: '晚餐后', 21: '晚间' }
  return map[hour] || String(hour)
}

// 从用户消息里匹配药品名
const matchMedName = (text: string): string | null => {
  for (const med of medications.value) {
    if (text.includes(med.name) || text.includes(med.name.replace('片', ''))) {
      return med.name
    }
  }
  return null
}

// 获取今天未打卡的药
const getPendingMeds = () => {
  const pending: { name: string; id: string; hour: number }[] = []
  medications.value.forEach(med => {
    if (!med.times) return
    med.times.forEach((t: string) => {
      const slot = TIME_SLOTS[t]
      if (!slot) return
      const key = getMedKey(med.name, slot.hour)
      if (!records.value[key]) {
        pending.push({ name: med.name, id: med.id, hour: slot.hour })
      }
    })
  })
  return pending
}

// 执行打卡
const doTakeMed = async (userId: string, medName: string, specificHour?: number): Promise<string> => {
  const med = medications.value.find(m => m.name.includes(medName) || medName.includes(m.name))
  if (!med) return `没找到药品"${medName}"，请检查名称`
  if (!med.times || med.times.length === 0) return `${med.name} 没有设置服用时间`

  // 找到该药未打卡的时段
  let targetHour = specificHour
  if (!targetHour) {
    for (const t of med.times) {
      const slot = TIME_SLOTS[t]
      if (!slot) continue
      const key = getMedKey(med.name, slot.hour)
      if (!records.value[key]) {
        targetHour = slot.hour
        break
      }
    }
  }

  if (!targetHour) return `${med.name} 今天已经全部打卡了`

  await recordsStore.takeMed(userId, med.id, med.name, targetHour)
  await medsStore.deductStock(userId, med.id)
  return `已记录 ${med.name} 服药，库存 -1`
}

// 执行撤回
const doUndoMed = async (userId: string, medName: string): Promise<string> => {
  const med = medications.value.find(m => m.name.includes(medName) || medName.includes(m.name))
  if (!med) return `没找到药品"${medName}"`
  if (!med.times) return `${med.name} 没有时间记录`

  // 找到该药已打卡的时段
  for (const t of med.times) {
    const slot = TIME_SLOTS[t]
    if (!slot) continue
    const key = getMedKey(med.name, slot.hour)
    if (records.value[key]?.startsWith('done_')) {
      await recordsStore.undoMed(userId, med.id, med.name, slot.hour)
      await medsStore.restoreStock(userId, med.id)
      return `已撤回 ${med.name} 的打卡记录，库存 +1`
    }
  }
  return `${med.name} 今天还没有打卡记录，无需撤回`
}

const ask = (text: string) => processQuestion(text)
const send = () => {
  if (inputText.value.trim() && !isThinking.value) {
    processQuestion(inputText.value.trim())
    inputText.value = ''
  }
}
</script>

<style scoped>
.page {
  background: linear-gradient(180deg, #f0faf5 0%, #f4f6f8 30%);
  min-height: 100vh;
  padding-bottom: 0;
}

/* 聊天区 */
.chat-area {
  padding: 24rpx;
}

/* 欢迎卡片 */
.welcome-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 24rpx 32rpx;
}
.welcome-avatar-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #0b9d6a, #0abf7f);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 32rpx rgba(11, 157, 106, 0.3);
}
.welcome-avatar {
  font-size: 56rpx;
  line-height: 120rpx;
  text-align: center;
}
.welcome-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a2e;
  display: block;
  margin-bottom: 8rpx;
}
.welcome-desc {
  font-size: 26rpx;
  color: #6b7280;
  display: block;
}

/* 快捷问题 */
.quick-section {
  margin: 16rpx 0 24rpx;
}
.quick-label {
  font-size: 26rpx;
  color: #6b7280;
  display: block;
  margin-bottom: 16rpx;
  font-weight: 500;
}
.quick-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.quick-card {
  flex: 1;
  min-width: 280rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16rpx;
  transition: all 0.2s;
}
.quick-card:active {
  background: #e6f7f0;
  transform: scale(0.97);
}
.quick-icon {
  font-size: 36rpx;
  flex-shrink: 0;
}
.quick-text {
  font-size: 26rpx;
  color: #1a1a2e;
  font-weight: 500;
}

/* 消息行 */
.msg-row {
  margin-bottom: 28rpx;
}

/* 助手消息 */
.msg-left {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
}
.avatar-ai {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #0b9d6a, #0abf7f);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(11, 157, 106, 0.2);
  text-align: center;
  line-height: 64rpx;
}
.bubble-ai {
  max-width: 78%;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 4rpx 24rpx 24rpx 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
}
.bubble-text {
  font-size: 28rpx;
  line-height: 1.7;
  color: #1a1a2e;
  white-space: pre-line;
  display: block;
}

/* 用户消息 */
.msg-right {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  justify-content: flex-end;
}
.avatar-user {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
  text-align: center;
  line-height: 64rpx;
}
.bubble-user {
  max-width: 78%;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #0b9d6a, #0abf7f);
  border-radius: 24rpx 4rpx 24rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(11, 157, 106, 0.15);
}
.bubble-text-user {
  font-size: 28rpx;
  line-height: 1.7;
  color: #fff;
  white-space: pre-line;
  display: block;
}

/* 输入栏 */
.input-bar {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 24rpx 40rpx;
  background: #fff;
  border-top: 1rpx solid #e5e7eb;
  align-items: center;
}
.chat-input {
  flex: 1;
  padding: 18rpx 28rpx;
  font-size: 28rpx;
  background: #f4f6f8;
  border-radius: 20rpx;
  border: 2rpx solid #e5e7eb;
  min-height: 60rpx;
  max-height: 200rpx;
  line-height: 1.5;
}
.thinking-text {
  font-size: 26rpx;
  color: #6b7280;
  animation: blink 1.5s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.send-btn {
  padding: 16rpx 28rpx;
  background: #0b9d6a;
  color: #fff;
  border-radius: 40rpx;
  font-size: 26rpx;
  font-weight: 600;
  flex-shrink: 0;
  border: none;
  line-height: 1;
}
</style>
