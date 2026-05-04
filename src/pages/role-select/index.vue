<template>
  <view class="page">
    <!-- 绿色渐变背景 -->
    <view class="top-gradient" />
    <!-- 装饰圆 -->
    <view class="deco-circle-1" />
    <view class="deco-circle-2" />

    <!-- Logo 区域 -->
    <view class="logo-area">
      <view class="mascot-wrap">
        <view class="mascot-icon">
          <view class="mascot-pill" />
        </view>
      </view>
      <text class="app-title">小派 PillPal</text>
      <text class="app-sub">AI 智能用药管家</text>
      <text class="app-slogan">让每一次服药都安心</text>
    </view>

    <!-- 角色选择 -->
    <view class="cards-area">
      <text class="cards-label">选择你的身份</text>

      <!-- 患者 -->
      <view class="role-card" @click="selectRole('patient')">
        <view class="card-deco patient-deco" />
        <view class="role-icon-wrap patient-icon">
          <text class="role-icon-text">👤</text>
        </view>
        <view class="role-body">
          <text class="role-title">我是患者</text>
          <text class="role-desc">管理用药计划 · 服药打卡 · 续方购药</text>
        </view>
        <text class="role-arrow">›</text>
      </view>

      <!-- 家属 -->
      <view class="role-card" @click="selectRole('family')">
        <view class="card-deco family-deco" />
        <view class="role-icon-wrap family-icon">
          <text class="role-icon-text">👥</text>
        </view>
        <view class="role-body">
          <text class="role-title">我是家属</text>
          <text class="role-desc">远程查看家人用药 · 异常提醒 · 代下单</text>
        </view>
        <text class="role-arrow">›</text>
      </view>

      <text class="footer-hint">选择后可在设置中随时切换</text>
      <text class="footer-version">v 2.4.1 · PillPal Health</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

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
    const onboarded = uni.getStorageSync('onboarded_' + userStore.user?.id)
    if (!onboarded) {
      uni.redirectTo({ url: '/pages/onboarding/index' })
      return
    }
    uni.switchTab({ url: '/pages/home/index' })
  } else {
    uni.navigateTo({ url: '/pages/family/home' })
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh; background: #f6f8f7;
  display: flex; flex-direction: column; align-items: center;
  position: relative; overflow: hidden;
}

/* 背景 */
.top-gradient {
  position: absolute; top: 0; left: 0; right: 0; height: 560rpx;
  background: linear-gradient(180deg, #0b9d6a 0%, #26e69b 50%, transparent 100%);
  border-radius: 0 0 64rpx 64rpx;
}
.deco-circle-1 { position: absolute; top: 160rpx; right: 60rpx; width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(255,255,255,0.15); }
.deco-circle-2 { position: absolute; top: 260rpx; left: 40rpx; width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(255,255,255,0.18); }

/* Logo */
.logo-area {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center;
  padding-top: 120rpx; margin-bottom: 80rpx;
}
.mascot-wrap {
  filter: drop-shadow(0 24rpx 64rpx rgba(15,31,26,0.22));
  margin-bottom: 36rpx;
}
.mascot-icon {
  width: 160rpx; height: 160rpx; border-radius: 48rpx; background: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 16rpx 48rpx rgba(15,31,26,0.12);
}
.mascot-pill {
  width: 60rpx; height: 28rpx; border-radius: 14rpx;
  background: linear-gradient(90deg, #078558 50%, #0b9d6a 50%);
}
.app-title { font-size: 64rpx; font-weight: 800; color: #fff; letter-spacing: -1rpx; }
.app-sub { font-size: 28rpx; color: rgba(255,255,255,0.92); margin-top: 8rpx; }
.app-slogan { font-size: 24rpx; color: rgba(255,255,255,0.75); margin-top: 20rpx; }

/* 卡片区域 */
.cards-area {
  position: relative; z-index: 1;
  width: 100%; padding: 0 44rpx;
}
.cards-label { font-size: 22rpx; color: #9aa39e; font-weight: 600; letter-spacing: 1rpx; display: block; padding-left: 8rpx; margin-bottom: 20rpx; }

.role-card {
  background: #fff; border-radius: 44rpx;
  padding: 40rpx; margin-bottom: 28rpx;
  box-shadow: 0 16rpx 48rpx rgba(15,31,26,0.08);
  display: flex; align-items: center; gap: 32rpx;
  position: relative; overflow: hidden;
}
.card-deco { position: absolute; top: -40rpx; right: -40rpx; width: 160rpx; height: 160rpx; border-radius: 50%; }
.patient-deco { background: #e7f6ef; }
.family-deco { background: #e3f2fd; }

.role-icon-wrap {
  width: 120rpx; height: 120rpx; border-radius: 36rpx;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  position: relative;
}
.patient-icon { background: linear-gradient(135deg, #e7f6ef, #c8f0df); }
.family-icon { background: linear-gradient(135deg, #e3f2fd, #bbdefb); }
.role-icon-text { font-size: 52rpx; }

.role-body { flex: 1; min-width: 0; position: relative; }
.role-title { font-size: 34rpx; font-weight: 700; display: block; color: #0f1f1a; }
.role-desc { font-size: 24rpx; color: #6b7670; display: block; margin-top: 8rpx; line-height: 1.5; }
.role-arrow { font-size: 36rpx; color: #9aa39e; flex-shrink: 0; }

.footer-hint { text-align: center; display: block; margin-top: 56rpx; font-size: 22rpx; color: #9aa39e; }
.footer-version { text-align: center; display: block; margin-top: 100rpx; font-size: 20rpx; color: #cbd5d1; }
</style>
