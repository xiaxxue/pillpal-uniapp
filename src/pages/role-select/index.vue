<template>
  <view class="page">
    <!-- 顶部装饰 -->
    <view class="top-bg"></view>

    <!-- Logo区 -->
    <view class="logo-area">
      <view class="logo-circle">
        <text class="logo-emoji">💊</text>
      </view>
      <text class="app-name">PillPal</text>
      <text class="app-sub">用药管家</text>
      <text class="slogan">让每一次服药都安心</text>
    </view>

    <!-- 角色选择卡片 -->
    <view class="cards">
      <view class="role-card patient" @click="selectRole('patient')" :class="{ pressed: pressing === 'patient' }" @touchstart="pressing = 'patient'" @touchend="pressing = ''">
        <view class="role-icon-wrap patient-bg">
          <text class="role-icon">🧑‍⚕️</text>
        </view>
        <view class="role-info">
          <text class="role-title">我是患者</text>
          <text class="role-desc">管理用药计划、服药打卡、续方购药</text>
        </view>
        <text class="role-arrow">›</text>
      </view>

      <view class="role-card family" @click="selectRole('family')" :class="{ pressed: pressing === 'family' }" @touchstart="pressing = 'family'" @touchend="pressing = ''">
        <view class="role-icon-wrap family-bg">
          <text class="role-icon">👨‍👩‍👦</text>
        </view>
        <view class="role-info">
          <text class="role-title">我是家属</text>
          <text class="role-desc">远程查看家人用药、提醒服药</text>
        </view>
        <text class="role-arrow">›</text>
      </view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <text class="footer-text">选择后可随时在设置中切换</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const pressing = ref('')

onLoad(async () => {
  await userStore.init()
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
.page {
  min-height: 100vh;
  background: #f4f6f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 60rpx;
}

/* 顶部绿色装饰 */
.top-bg {
  width: 100%;
  height: 360rpx;
  background: linear-gradient(180deg, #0b9d6a 0%, #0abf7f 60%, transparent 100%);
  position: absolute;
  top: 0;
  border-radius: 0 0 60rpx 60rpx;
}

/* Logo */
.logo-area {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100rpx;
  margin-bottom: 60rpx;
}
.logo-circle {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1);
  margin-bottom: 24rpx;
}
.logo-emoji { font-size: 64rpx; line-height: 140rpx; text-align: center; }
.app-name { font-size: 52rpx; font-weight: 800; color: #fff; display: block; }
.app-sub { font-size: 28rpx; color: rgba(255,255,255,0.85); display: block; margin-top: 4rpx; }
.slogan { font-size: 24rpx; color: rgba(255,255,255,0.7); display: block; margin-top: 12rpx; }

/* 角色卡片 */
.cards {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 0 40rpx;
}
.role-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 36rpx 32rpx;
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  transition: all 0.15s;
}
.role-card.pressed {
  transform: scale(0.97);
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}
.role-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.patient-bg { background: linear-gradient(135deg, #e6f7f0, #c8f0df); }
.family-bg { background: linear-gradient(135deg, #e3f2fd, #bbdefb); }
.role-icon { font-size: 48rpx; line-height: 96rpx; text-align: center; }
.role-info { flex: 1; }
.role-title { font-size: 34rpx; font-weight: 700; display: block; color: #1a1a2e; }
.role-desc { font-size: 24rpx; color: #6b7280; display: block; margin-top: 8rpx; line-height: 1.4; }
.role-arrow { font-size: 40rpx; color: #9ca3af; flex-shrink: 0; }

/* 底部 */
.footer {
  position: relative;
  z-index: 1;
  margin-top: 40rpx;
}
.footer-text { font-size: 24rpx; color: #9ca3af; }
</style>
