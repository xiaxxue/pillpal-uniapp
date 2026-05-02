<template>
  <view class="page">
    <scroll-view scroll-y class="chat-area" :scroll-into-view="scrollTarget" :scroll-with-animation="true">
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

      <!-- 底部占位 -->
      <view style="height: 140rpx"></view>
    </scroll-view>

    <!-- 输入栏 -->
    <view class="input-bar">
      <view class="input-wrap">
        <input class="chat-input" v-model="input" placeholder="输入你的用药问题..." @confirm="send" :adjust-position="true" />
      </view>
      <view class="send-btn" :class="{ active: input.trim() }" @click="send">
        <text class="send-icon">➤</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
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

const quickQuestions = [
  { text: '今天还有哪些药没吃？', icon: '💊' },
  { text: '帮我查一下库存', icon: '📦' },
  { text: '哪些药需要续方？', icon: '📋' },
  { text: '今天吃了几次药？', icon: '✅' }
]

const addMsg = (text: string, role: string) => {
  const id = Date.now() + Math.random()
  messages.value.push({ text, role, id: String(id).replace('.', '') })
  nextTick(() => { scrollTarget.value = 'msg-' + String(id).replace('.', '') })
}

const processQuestion = (text: string) => {
  addMsg(text, 'user')
  // 模拟思考延迟
  setTimeout(() => {
    let reply = ''
    if (/库存|还剩|快没了|够吃/.test(text)) {
      if (medications.value.length === 0) {
        reply = '你还没有添加药品哦～\n\n去首页点「添加药品」开始吧 😊'
      } else {
        reply = '📦 你的药品库存：\n\n'
        medications.value.forEach(m => {
          const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
          const icon = days <= 7 ? '🔴' : days <= 14 ? '🟡' : '🟢'
          reply += `${icon} ${m.name}\n    剩 ${m.stock_count} 片，可服 ${days} 天\n\n`
        })
      }
    } else if (/没吃|今天|今日|漏服|吃了几次/.test(text)) {
      const pending: string[] = []
      const done: string[] = []
      medications.value.forEach(m => {
        if (!m.times) return
        m.times.forEach((t: string) => {
          const slot = TIME_SLOTS[t]
          if (!slot) return
          const key = getMedKey(m.name, slot.hour)
          if (records.value[key]?.startsWith('done_')) {
            done.push(m.name + ' ' + slot.time)
          } else {
            pending.push(m.name + ' ' + slot.time)
          }
        })
      })
      if (pending.length === 0 && done.length > 0) {
        reply = '🎉 太棒了！今天的药全部吃完了！\n\n共完成 ' + done.length + ' 次服药，继续保持！'
      } else if (done.length === 0 && pending.length > 0) {
        reply = '📋 今天还有 ' + pending.length + ' 次没吃：\n\n' + pending.map(p => '  • ' + p).join('\n') + '\n\n记得按时吃药哦 💪'
      } else {
        reply = '📊 今日进度：' + done.length + '/' + (done.length + pending.length) + '\n\n'
        if (done.length > 0) reply += '✅ 已服用：\n' + done.map(d => '  • ' + d).join('\n') + '\n\n'
        if (pending.length > 0) reply += '⏰ 待服用：\n' + pending.map(p => '  • ' + p).join('\n')
      }
    } else if (/续方|帮我续|快没了/.test(text)) {
      const urgent = medications.value.filter(m => {
        const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
        return days <= 7
      })
      if (urgent.length === 0) {
        reply = '✅ 你的药品库存都很充足，暂时不需要续方～'
      } else {
        reply = '⚠️ 以下药品建议尽快续方：\n\n'
        urgent.forEach(m => {
          const days = Math.floor(m.stock_count / (m.daily_usage || 1))
          reply += `🔴 ${m.name}\n    剩 ${m.stock_count} 片，只够 ${days} 天\n\n`
        })
        reply += '建议联系医生开处方 🏥'
      }
    } else {
      reply = '👋 我是小派，你的用药助手！\n\n我可以帮你：\n\n💊 查看今天吃药情况\n📦 查看药品库存\n📋 续方提醒\n\n直接输入或点上方快捷问题试试吧～'
    }
    addMsg(reply, 'assistant')
  }, 600)
}

const ask = (text: string) => processQuestion(text)
const send = () => {
  if (input.value.trim()) {
    processQuestion(input.value.trim())
    input.value = ''
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(180deg, #f0faf5 0%, #f4f6f8 30%);
}

/* 聊天区 */
.chat-area {
  flex: 1;
  padding: 24rpx 24rpx 0;
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
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #e5e7eb;
  align-items: center;
}
.input-wrap {
  flex: 1;
  background: #f4f6f8;
  border-radius: 40rpx;
  padding: 4rpx;
}
.chat-input {
  padding: 16rpx 28rpx;
  font-size: 28rpx;
  width: 100%;
}
.send-btn {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.send-btn.active {
  background: linear-gradient(135deg, #0b9d6a, #0abf7f);
  box-shadow: 0 4rpx 16rpx rgba(11, 157, 106, 0.3);
}
.send-icon {
  font-size: 32rpx;
  color: #fff;
}
</style>
