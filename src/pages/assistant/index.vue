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
import { askAI, askAIWithResult, buildContext } from '../../utils/ai'

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
    await userStore.init()
    userId = userStore.user?.id
  }

  // 构建上下文，让 AI 判断意图
  const context = buildContext(medications.value, records.value)
  const aiResult = await askAI(text, context)

  // AI 决定要调用 function
  if (aiResult.functionCall && userId) {
    const { name, args } = aiResult.functionCall
    console.log('AI 调用 function:', name, args)
    let actionResult = ''

    if (name === 'take_med') {
      actionResult = await executeTakeMed(userId, args.med_name, args.time_slots || [])
    } else if (name === 'undo_med') {
      actionResult = await executeUndoMed(userId, args.med_name, args.time_slots || [])
    } else if (name === 'update_stock') {
      actionResult = await executeUpdateStock(userId, args.med_name, args.quantity)
    }

    // 刷新数据
    await medsStore.fetchAll(userId)
    await recordsStore.loadRecords(userId)

    // 让 AI 基于操作结果生成友好回复
    const updatedContext = buildContext(medications.value, records.value)
    const reply = await askAIWithResult(text, updatedContext, actionResult)
    isThinking.value = false
    addMsg(reply, 'assistant')
  } else {
    // AI 只是回答问题，不调用 function
    isThinking.value = false
    addMsg(aiResult.text, 'assistant')
  }
}

// === Function Calling 执行函数 ===

const getSlotLabel = (hour: number): string => {
  const map: Record<number, string> = { 7: '晨起', 8: '早餐后', 14.5: '午餐后', 18.5: '晚餐后', 21: '晚间' }
  return map[hour] || String(hour)
}

// 执行打卡
const executeTakeMed = async (userId: string, medName: string, timeSlots: number[]): Promise<string> => {
  const results: string[] = []

  // 找药品
  const matchedMeds = medName === 'all'
    ? medications.value
    : medications.value.filter(m => m.name.includes(medName) || medName.includes(m.name))

  if (matchedMeds.length === 0) return `没找到药品"${medName}"`

  for (const med of matchedMeds) {
    if (!med.times) continue
    for (const t of med.times) {
      const slot = TIME_SLOTS[t]
      if (!slot) continue

      // 如果指定了时段，只打指定时段
      if (timeSlots.length > 0 && !timeSlots.includes(slot.hour)) continue

      const key = getMedKey(med.name, slot.hour)
      if (!records.value[key]) {
        await recordsStore.takeMed(userId, med.id, med.name, slot.hour)
        await medsStore.deductStock(userId, med.id)
        results.push(`${med.name}（${getSlotLabel(slot.hour)}）`)
      }
    }
  }

  return results.length > 0
    ? `已打卡：${results.join('、')}`
    : '这些药/时段已经打过卡了'
}

// 执行撤回
const executeUndoMed = async (userId: string, medName: string, timeSlots: number[]): Promise<string> => {
  const results: string[] = []

  const matchedMeds = medName === 'all'
    ? medications.value
    : medications.value.filter(m => m.name.includes(medName) || medName.includes(m.name))

  for (const med of matchedMeds) {
    if (!med.times) continue
    for (const t of med.times) {
      const slot = TIME_SLOTS[t]
      if (!slot) continue
      if (timeSlots.length > 0 && !timeSlots.includes(slot.hour)) continue

      const key = getMedKey(med.name, slot.hour)
      if (records.value[key]?.startsWith('done_')) {
        await recordsStore.undoMed(userId, med.id, med.name, slot.hour)
        await medsStore.restoreStock(userId, med.id)
        results.push(`${med.name}（${getSlotLabel(slot.hour)}）`)
      }
    }
  }

  return results.length > 0
    ? `已撤回：${results.join('、')}`
    : '没有需要撤回的记录'
}

// 执行修改库存
const executeUpdateStock = async (userId: string, medName: string, quantity: number): Promise<string> => {
  const med = medications.value.find(m => m.name.includes(medName) || medName.includes(m.name))
  if (!med) return `没找到药品"${medName}"`
  await medsStore.update(userId, med.id, { stock_count: quantity })
  return `已将 ${med.name} 的库存修改为 ${quantity} 片`
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
