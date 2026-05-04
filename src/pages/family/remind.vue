<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="close-btn" @click="goBack">
        <text class="close-icon">✕</text>
      </view>
      <text class="top-title">提醒家人</text>
      <view class="top-placeholder" />
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 超时提示卡片 -->
      <view class="context-card">
        <view class="context-avatar">
          <text class="context-initial">{{ patientName?.charAt(0) || '家' }}</text>
        </view>
        <view class="context-info">
          <text class="context-name">{{ patientName || '家人' }}</text>
          <text class="context-alert">降糖药已超时 35 分钟</text>
        </view>
        <text class="context-emoji">⏰</text>
      </view>

      <!-- 提醒方式 -->
      <view class="section-wrap">
        <text class="section-label">提醒方式</text>
        <view class="method-list">
          <view
            v-for="m in methods"
            :key="m.value"
            class="method-card"
            :class="{ active: selectedMethod === m.value }"
            @click="selectedMethod = m.value"
          >
            <view class="method-radio" :class="{ checked: selectedMethod === m.value }">
              <view v-if="selectedMethod === m.value" class="method-radio-dot" />
            </view>
            <text class="method-icon">{{ m.icon }}</text>
            <view class="method-info">
              <text class="method-name">{{ m.label }}</text>
              <text v-if="m.desc" class="method-desc">{{ m.desc }}</text>
            </view>
            <view v-if="m.badge" class="method-badge" :class="m.badgeType">
              <text class="method-badge-text">{{ m.badge }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 语气选择 -->
      <view v-if="selectedMethod !== 'push'" class="section-wrap">
        <text class="section-label">语气选择</text>
        <view class="tone-list">
          <view
            v-for="t in tones"
            :key="t.value"
            class="tone-btn"
            :class="{ active: selectedTone === t.value }"
            @click="selectedTone = t.value"
          >
            <text class="tone-emoji">{{ t.emoji }}</text>
            <text class="tone-label">{{ t.label }}</text>
          </view>
        </view>
      </view>

      <!-- 文案编辑 -->
      <view class="section-wrap">
        <view class="section-header-row">
          <text class="section-label">文案编辑</text>
          <view class="ai-rewrite-btn" @click="aiRewrite">
            <text class="ai-rewrite-text">✨ AI重写</text>
          </view>
        </view>
        <view class="textarea-wrap">
          <textarea
            class="msg-textarea"
            :value="messageText"
            @input="messageText = $event.detail.value"
            placeholder="输入提醒内容..."
            :maxlength="200"
          />
          <text class="char-count">{{ messageText.length }}/200</text>
        </view>
        <view class="template-chips">
          <view
            v-for="tpl in templates"
            :key="tpl"
            class="template-chip"
            @click="messageText = tpl"
          >
            <text class="template-chip-text">{{ tpl }}</text>
          </view>
        </view>
      </view>

      <!-- 高级选项 -->
      <view class="section-wrap">
        <text class="section-label">高级选项</text>
        <view class="options-card">
          <view class="option-row">
            <view class="option-info">
              <text class="option-label">未服药自动重复提醒</text>
              <text class="option-desc">每隔15分钟重复一次，最多3次</text>
            </view>
            <switch :checked="autoRepeat" @change="autoRepeat = $event.detail.value" color="#0b9d6a" />
          </view>
          <view class="option-divider" />
          <view class="option-row">
            <view class="option-info">
              <text class="option-label">服药后通知我</text>
              <text class="option-desc">家人确认服药后推送通知</text>
            </view>
            <switch :checked="notifyWhenDone" @change="notifyWhenDone = $event.detail.value" color="#0b9d6a" />
          </view>
          <view class="option-divider" />
          <view class="option-row">
            <view class="option-info">
              <text class="option-label">静默模式</text>
              <text class="option-desc">仅发App通知，不响铃</text>
            </view>
            <switch :checked="silentMode" @change="silentMode = $event.detail.value" color="#0b9d6a" />
          </view>
        </view>
      </view>

      <view style="height: 180rpx;" />
    </scroll-view>

    <!-- 底部发送按钮 -->
    <view class="bottom-bar">
      <view class="send-btn" @click="sendReminder">
        <text class="send-btn-text">立即发送</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useFamilyStore } from '../../stores/family'
import Xiaopai from '../../components/Xiaopai.vue'

const userStore = useUserStore()
const familyStore = useFamilyStore()

const patientId = ref('')
const patientName = ref('')
const selectedMethod = ref('push')
const selectedTone = ref('gentle')
const messageText = ref('该吃药了，记得按时服用哦~注意身体！')
const autoRepeat = ref(true)
const notifyWhenDone = ref(true)
const silentMode = ref(false)

const methods = [
  { value: 'push', icon: '📱', label: 'App推送', desc: '即时送达', badge: '推荐', badgeType: 'recommend' },
  { value: 'voice', icon: '📞', label: '语音电话', desc: '自动拨打语音提醒', badge: '0.1元/次', badgeType: 'cost' },
  { value: 'sms', icon: '💬', label: '短信', desc: '发送短信提醒', badge: '0.05元/条', badgeType: 'cost' },
  { value: 'wechat', icon: '🟢', label: '微信消息', desc: '通过微信服务号推送', badge: '需授权', badgeType: 'info' },
]

const tones = [
  { value: 'gentle', emoji: '🤗', label: '温柔' },
  { value: 'serious', emoji: '💪', label: '严肃' },
  { value: 'humor', emoji: '😄', label: '幽默' },
]

const templates = [
  '该吃药啦，身体最重要~',
  '药不能停！快去吃药！',
  '吃完药跟我说一声哦',
  '按时吃药，早日康复！',
]

const aiRewrite = () => {
  uni.showLoading({ title: 'AI生成中...' })
  setTimeout(() => {
    const rewrites: Record<string, string> = {
      gentle: '亲爱的，到时间吃药了~照顾好自己的身体，我在远方也会一直牵挂你的健康哦 ❤️',
      serious: '注意！降糖药已经超时35分钟了。血糖控制不好后果很严重，请立即服药！',
      humor: '嘿！你的小药丸在药盒里已经等了你35分钟了，它都快哭了，快去解救它吧~ 😂',
    }
    messageText.value = rewrites[selectedTone.value] || rewrites.gentle
    uni.hideLoading()
  }, 1200)
}

const sendReminder = () => {
  if (!messageText.value.trim()) {
    uni.showToast({ title: '请输入提醒内容', icon: 'none' })
    return
  }
  uni.showLoading({ title: '发送中...' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({ title: '提醒已发送！', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1200)
  }, 800)
}

const goBack = () => {
  uni.navigateBack()
}

onLoad((query) => {
  if (query?.patient_id) patientId.value = query.patient_id
  if (query?.patient_name) patientName.value = decodeURIComponent(query.patient_name)
})
</script>

<style lang="scss" scoped>
.page { background: #f4f7fb; min-height: 100vh; display: flex; flex-direction: column; }

/* 顶栏 */
.top-bar { padding: 24rpx 36rpx 16rpx; display: flex; align-items: center; justify-content: space-between; }
.close-btn { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: #fff; border: 2rpx solid #e3e8f1; display: flex; align-items: center; justify-content: center; }
.close-icon { font-size: 30rpx; color: #0f1f1a; font-weight: 600; }
.top-title { font-size: 32rpx; font-weight: 700; color: #0f1f1a; }
.top-placeholder { width: 72rpx; }

.main-scroll { flex: 1; }

/* 超时提示卡片 */
.context-card { margin: 16rpx 28rpx 0; background: linear-gradient(135deg, #fef2f2, #fee5e2); border: 2rpx solid #fecaca; border-radius: 32rpx; padding: 28rpx; display: flex; align-items: center; gap: 20rpx; }
.context-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: linear-gradient(135deg, #e53935, #c62828); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.context-initial { font-size: 40rpx; font-weight: 800; color: #fff; }
.context-info { flex: 1; }
.context-name { font-size: 28rpx; font-weight: 700; color: #0f1f1a; display: block; }
.context-alert { font-size: 26rpx; font-weight: 700; color: #dc2626; display: block; margin-top: 6rpx; }
.context-emoji { font-size: 48rpx; flex-shrink: 0; }

/* Section */
.section-wrap { padding: 32rpx 28rpx 0; }
.section-label { font-size: 22rpx; color: #5a6884; font-weight: 600; letter-spacing: 1rpx; display: block; margin-bottom: 16rpx; text-transform: uppercase; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-header-row .section-label { margin-bottom: 0; }

/* 提醒方式 */
.method-list { display: flex; flex-direction: column; gap: 16rpx; }
.method-card { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 24rpx 28rpx; display: flex; align-items: center; gap: 20rpx; transition: all 0.2s; }
.method-card.active { border-color: #0b9d6a; background: #f7fdf9; }
.method-radio { width: 36rpx; height: 36rpx; border-radius: 50%; border: 3rpx solid #c5cee0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.method-radio.checked { border-color: #0b9d6a; }
.method-radio-dot { width: 20rpx; height: 20rpx; border-radius: 50%; background: #0b9d6a; }
.method-icon { font-size: 36rpx; flex-shrink: 0; }
.method-info { flex: 1; min-width: 0; }
.method-name { font-size: 28rpx; font-weight: 700; color: #0f1f1a; display: block; }
.method-desc { font-size: 22rpx; color: #5a6884; display: block; margin-top: 2rpx; }
.method-badge { padding: 4rpx 16rpx; border-radius: 999rpx; flex-shrink: 0; }
.method-badge.recommend { background: #e7f6ef; }
.method-badge.recommend .method-badge-text { color: #078558; font-size: 20rpx; font-weight: 600; }
.method-badge.cost { background: #fff7e8; }
.method-badge.cost .method-badge-text { color: #a06a18; font-size: 20rpx; font-weight: 600; }
.method-badge.info { background: #eef1f7; }
.method-badge.info .method-badge-text { color: #5a6884; font-size: 20rpx; font-weight: 600; }

/* 语气选择 */
.tone-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.tone-btn { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 24rpx 16rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; transition: all 0.2s; }
.tone-btn.active { border-color: #0b9d6a; background: #f7fdf9; }
.tone-emoji { font-size: 44rpx; }
.tone-label { font-size: 26rpx; font-weight: 600; color: #0f1f1a; }

/* 文案编辑 */
.ai-rewrite-btn { padding: 8rpx 20rpx; background: linear-gradient(135deg, #e7f6ef, #d1f0e0); border-radius: 999rpx; }
.ai-rewrite-text { font-size: 22rpx; font-weight: 700; color: #078558; }
.textarea-wrap { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 24rpx; position: relative; }
.msg-textarea { width: 100%; height: 180rpx; font-size: 28rpx; color: #0f1f1a; line-height: 1.6; }
.char-count { position: absolute; right: 24rpx; bottom: 16rpx; font-size: 20rpx; color: #9aa3b0; font-family: 'Inter', sans-serif; }
.template-chips { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.template-chip { padding: 10rpx 24rpx; background: #fff; border: 2rpx solid #e3e8f1; border-radius: 999rpx; }
.template-chip-text { font-size: 22rpx; color: #5a6884; }

/* 高级选项 */
.options-card { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 0 28rpx; }
.option-row { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 0; }
.option-info { flex: 1; margin-right: 20rpx; }
.option-label { font-size: 28rpx; font-weight: 600; color: #0f1f1a; display: block; }
.option-desc { font-size: 22rpx; color: #5a6884; display: block; margin-top: 4rpx; }
.option-divider { height: 2rpx; background: #eef1f7; }

/* 底部按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 28rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 2rpx solid #e3e8f1; }
.send-btn { height: 100rpx; background: linear-gradient(135deg, #0b9d6a, #078558); border-radius: 28rpx; display: flex; align-items: center; justify-content: center; }
.send-btn-text { font-size: 32rpx; font-weight: 700; color: #fff; }
</style>
