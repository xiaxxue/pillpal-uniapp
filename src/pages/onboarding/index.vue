<template>
  <view class="page">
    <text class="title">欢迎使用 PillPal!</text>
    <text class="desc">设置完成后开始管理用药</text>
    <text class="placeholder">引导页（开发中）</text>
    <button class="btn-primary" @click="skip">跳过，直接进入</button>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

const skip = () => {
  if (userStore.user) {
    uni.setStorageSync('onboarded_' + userStore.user.id, 'true')
  }
  uni.switchTab({ url: '/pages/home/index' })
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 48rpx; }
.title { font-size: 44rpx; font-weight: 700; display: block; margin-bottom: 16rpx; }
.desc { font-size: 28rpx; color: #6b7280; display: block; margin-bottom: 48rpx; }
.placeholder { font-size: 28rpx; color: #9ca3af; display: block; margin-bottom: 48rpx; }
.btn-primary { width: 100%; padding: 24rpx; background: #0b9d6a; color: #fff; border-radius: 16rpx; font-size: 32rpx; font-weight: 600; border: none; }
</style>
