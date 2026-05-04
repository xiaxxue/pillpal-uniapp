<template>
  <view class="ftab-bar">
    <view class="ftab-item" :class="{ active: current === 'home' }" @click="go('/pages/family/home')">
      <text class="ftab-icon">👥</text>
      <text class="ftab-label">家人</text>
    </view>
    <view class="ftab-item" :class="{ active: current === 'messages' }" @click="go('/pages/family/messages')">
      <text class="ftab-icon">🔔</text>
      <text class="ftab-label">消息</text>
    </view>
    <view class="ftab-item" :class="{ active: current === 'services' }" @click="go('/pages/family/services')">
      <text class="ftab-icon">🛒</text>
      <text class="ftab-label">服务</text>
    </view>
    <view class="ftab-item" :class="{ active: current === 'me' }" @click="go('/pages/family/me')">
      <text class="ftab-icon">👤</text>
      <text class="ftab-label">我的</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ current: string }>()

const go = (url: string) => {
  uni.redirectTo({ url })
}
</script>

<style scoped>
.ftab-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(20px);
  border-top: 2rpx solid #e3e8f1;
  padding: 16rpx 0 52rpx;
  display: flex; justify-content: space-around; align-items: center;
  z-index: 100;
}
.ftab-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 4rpx; min-width: 100rpx;
}
.ftab-icon { font-size: 44rpx; opacity: 0.5; }
.ftab-item.active .ftab-icon { opacity: 1; }
.ftab-label { font-size: 20rpx; font-weight: 500; color: #5a6884; }
.ftab-item.active .ftab-label { color: #0b9d6a; font-weight: 700; }
</style>
