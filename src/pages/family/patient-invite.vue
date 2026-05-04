<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="top-title">邀请家人</text>
      <view class="top-placeholder" />
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 小派形象 -->
      <view class="mascot-wrap">
        <view class="mascot-circle">
          <text class="mascot-emoji">🤖</text>
        </view>
      </view>

      <!-- 标题 -->
      <text class="main-title">让家人照顾你的吃药</text>
      <text class="main-desc">选一位家人，让 TA 帮你看着按时吃药</text>

      <!-- 关系选择 -->
      <view class="relation-grid">
        <view
          v-for="item in relations"
          :key="item.label"
          class="relation-card"
          :class="{ selected: selectedRelation === item.label }"
          @click="selectedRelation = item.label"
        >
          <text class="relation-emoji">{{ item.emoji }}</text>
          <text class="relation-label">{{ item.label }}</text>
        </view>
      </view>

      <!-- 主按钮: 发给微信家人 -->
      <view class="primary-btn" @click="shareWeChat">
        <text class="primary-btn-icon">💬</text>
        <text class="primary-btn-text">发给微信家人</text>
      </view>

      <!-- 次级按钮 -->
      <view class="secondary-row">
        <view class="secondary-btn" @click="callFamily">
          <text class="secondary-btn-icon">📞</text>
          <text class="secondary-btn-text">打电话告诉</text>
        </view>
        <view class="secondary-btn" @click="showCode">
          <text class="secondary-btn-icon">🔢</text>
          <text class="secondary-btn-text">发邀请码</text>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="hint-wrap">
        <text class="hint-text">家人收到后，下载小派药盒即可关注你的用药</text>
      </view>

      <view style="height: 60rpx;" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selectedRelation = ref('女儿')

const relations = [
  { emoji: '👩', label: '女儿' },
  { emoji: '👦', label: '儿子' },
  { emoji: '👴', label: '老伴' },
  { emoji: '🙋', label: '其他' },
]

function goBack() {
  uni.navigateBack()
}

function shareWeChat() {
  uni.showToast({ title: '正在打开微信分享...', icon: 'none' })
}

function callFamily() {
  uni.showToast({ title: '正在拨号...', icon: 'none' })
}

function showCode() {
  uni.showToast({ title: '邀请码: A3K9F2', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fdfaf2;
  display: flex;
  flex-direction: column;
}

/* ── Top bar ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 100rpx 32rpx 24rpx;
  background: #fdfaf2;
}
.back-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
}
.back-icon {
  font-size: 44rpx;
  color: #333;
  margin-top: -4rpx;
}
.top-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.top-placeholder {
  width: 72rpx;
}

/* ── Main scroll ── */
.main-scroll {
  flex: 1;
  padding: 20rpx 40rpx;
}

/* ── Mascot ── */
.mascot-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 32rpx;
  margin-top: 20rpx;
}
.mascot-circle {
  width: 160rpx;
  height: 160rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.06);
}
.mascot-emoji {
  font-size: 80rpx;
}

/* ── Title ── */
.main-title {
  display: block;
  text-align: center;
  font-size: 44rpx;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}
.main-desc {
  display: block;
  text-align: center;
  font-size: 34rpx;
  color: #888;
  margin-bottom: 48rpx;
  line-height: 1.5;
}

/* ── Relation grid ── */
.relation-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.relation-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 3rpx solid transparent;
  border-radius: 28rpx;
  padding: 36rpx 20rpx;
  gap: 16rpx;
  transition: all 0.2s;
}
.relation-card.selected {
  border-color: #f5a623;
  background: #fff8ed;
  box-shadow: 0 4rpx 20rpx rgba(245, 166, 35, 0.15);
}
.relation-emoji {
  font-size: 64rpx;
}
.relation-label {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}

/* ── Primary button (WeChat) ── */
.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  height: 112rpx;
  background: #07C160;
  border-radius: 56rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.3);
}
.primary-btn-icon {
  font-size: 40rpx;
}
.primary-btn-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

/* ── Secondary buttons ── */
.secondary-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 40rpx;
}
.secondary-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 96rpx;
  background: #fff;
  border: 2rpx solid #e5e5e5;
  border-radius: 48rpx;
}
.secondary-btn-icon {
  font-size: 36rpx;
}
.secondary-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

/* ── Hint ── */
.hint-wrap {
  display: flex;
  justify-content: center;
}
.hint-text {
  font-size: 28rpx;
  color: #bbb;
  text-align: center;
}
</style>
