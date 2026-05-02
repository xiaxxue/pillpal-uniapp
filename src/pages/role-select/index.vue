<template>
  <view class="container">
    <view class="logo-area">
      <text class="logo-icon">💊</text>
      <text class="app-name">PillPal 用药管家</text>
      <text class="slogan">让每一次服药都安心</text>
    </view>

    <view class="cards">
      <view class="card" @click="selectRole('patient')">
        <text class="card-icon">👤</text>
        <text class="card-title">我是患者</text>
        <text class="card-desc">管理自己的用药计划</text>
      </view>
      <view class="card" @click="selectRole('family')">
        <text class="card-icon">👥</text>
        <text class="card-title">我是家属</text>
        <text class="card-desc">远程查看家人用药情况</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

onLoad(async () => {
  await userStore.init()
  // 已登录且有上次角色记录，直接进入
  const lastRole = uni.getStorageSync('last_role')
  if (userStore.user && lastRole) {
    enterRole(lastRole)
  }
})

const selectRole = (role: string) => {
  uni.setStorageSync('last_role', role)
  if (userStore.user) {
    enterRole(role)
  } else {
    uni.navigateTo({ url: '/pages/login/index?role=' + role })
  }
}

const enterRole = (role: string) => {
  if (role === 'patient') {
    uni.switchTab({ url: '/pages/home/index' })
  } else {
    uni.navigateTo({ url: '/pages/family/home' })
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 48rpx;
  background: #f4f6f8;
}
.logo-area { text-align: center; margin-bottom: 80rpx; }
.logo-icon { font-size: 128rpx; display: block; margin-bottom: 24rpx; }
.app-name { font-size: 48rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }
.slogan { font-size: 28rpx; color: #6b7280; display: block; }

.cards { width: 100%; max-width: 640rpx; }
.card {
  padding: 40rpx;
  background: #fff;
  border-radius: 24rpx;
  border: 2rpx solid #e5e7eb;
  text-align: center;
  margin-bottom: 24rpx;
}
.card:active { background: #e6f7f0; border-color: #0b9d6a; }
.card-icon { font-size: 72rpx; display: block; margin-bottom: 12rpx; }
.card-title { font-size: 36rpx; font-weight: 600; display: block; margin-bottom: 8rpx; }
.card-desc { font-size: 26rpx; color: #6b7280; display: block; }
</style>
