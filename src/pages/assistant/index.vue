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
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { TIME_SLOTS, getMedKey } from '../../utils/date'
import { askAI, buildContext } from '../../utils/ai'

const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()
const medications = computed(() => medsStore.medications)
const records = computed(() => recordsStore.records)

const messages = ref<any[]>([])
const inputText = ref('')
const scrollTarget = ref('')
const isThinking = ref(false)

const quickQuestions = [
  { text: '今天还有哪些药没吃？', icon: '💊' },
  { text: '帮我查一下库存', icon: '📦' },
  { text: '哪些药需要续方？', icon: '📋' },
  { text: '氨氯地平和阿司匹林能一起吃吗？', icon: '💡' },
  { text: '吃药期间能喝酒吗？', icon: '🍷' },
  { text: '忘吃药了怎么办？', icon: '😰' }
]

const addMsg = (text: string, role: string) => {
  const id = Date.now() + Math.random()
  messages.value.push({ text, role, id: String(id).replace('.', '') })
  nextTick(() => { scrollTarget.value = 'msg-' + String(id).replace('.', '') })
}

const processQuestion = async (text: string) => {
  addMsg(text, 'user')
  isThinking.value = true

  // 构建用药上下文
  const context = buildContext(medications.value, records.value)

  // 调用 DeepSeek AI
  const reply = await askAI(text, context)

  isThinking.value = false
  addMsg(reply, 'assistant')
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
