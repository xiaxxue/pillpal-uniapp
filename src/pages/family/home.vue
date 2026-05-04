<template>
  <view class="page">
    <view class="top-bar">
      <view>
        <text class="mode-label">家属模式</text>
        <text class="page-title">家人 · 用药</text>
      </view>
      <view class="top-actions">
        <view class="top-btn" @click="goBack">
          <text>↩</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 提醒横幅 -->
      <view class="alert-banner">
        <view class="alert-mascot">
          <xiaopai mood="worried" :size="60" />
        </view>
        <view class="alert-info">
          <text class="alert-title">家人可能漏服了药</text>
          <text class="alert-sub">请绑定家人后查看详情</text>
        </view>
      </view>

      <!-- 绑定入口 -->
      <view class="section-title-wrap">
        <text class="section-title">已绑定的家人</text>
      </view>

      <view class="empty-family">
        <xiaopai mood="thinking" :size="100" />
        <text class="empty-title">还没有绑定家人</text>
        <text class="empty-sub">请输入家人分享给你的邀请码</text>
        <view class="bind-form">
          <input class="bind-input" :value="inviteCode" @input="inviteCode = $event.detail.value" placeholder="输入6位邀请码" />
          <button class="bind-btn" @click="bindFamily">绑定</button>
        </view>
      </view>

      <!-- 快捷操作 -->
      <text class="section-title" style="padding: 32rpx 40rpx 16rpx;">快捷操作</text>
      <view class="quick-grid">
        <view class="quick-item">
          <view class="qi-icon" style="background:#e7f6ef;"><text>📞</text></view>
          <text class="qi-label">打电话</text>
        </view>
        <view class="quick-item">
          <view class="qi-icon" style="background:#e3f2fd;"><text>💊</text></view>
          <text class="qi-label">代购药</text>
        </view>
        <view class="quick-item">
          <view class="qi-icon" style="background:#fff3e0;"><text>📍</text></view>
          <text class="qi-label">定位</text>
        </view>
        <view class="quick-item">
          <view class="qi-icon" style="background:#fce4ec;"><text>❤</text></view>
          <text class="qi-label">体征</text>
        </view>
      </view>

      <view style="height: 60rpx;" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../../utils/supabase'
import { useUserStore } from '../../stores/user'
import Xiaopai from '../../components/Xiaopai.vue'

const userStore = useUserStore()
const inviteCode = ref('')

const goBack = () => {
  uni.removeStorageSync('last_role')
  uni.reLaunch({ url: '/pages/role-select/index' })
}

const bindFamily = async () => {
  if (!inviteCode.value || inviteCode.value.length < 6) {
    uni.showToast({ title: '请输入6位邀请码', icon: 'none' })
    return
  }
  if (!userStore.user) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  const { data, error } = await supabase
    .from('family_links')
    .update({ caregiver_id: userStore.user.id, status: 'active' })
    .eq('invite_code', inviteCode.value)
    .eq('status', 'pending')
  if (error) {
    uni.showToast({ title: '绑定失败', icon: 'none' })
  } else {
    uni.showToast({ title: '绑定成功！', icon: 'success' })
    inviteCode.value = ''
  }
}
</script>

<style lang="scss" scoped>
.page { background: #f4f7fb; min-height: 100vh; display: flex; flex-direction: column; }

.top-bar { padding: 24rpx 40rpx 16rpx; display: flex; align-items: center; justify-content: space-between; }
.mode-label { font-size: 22rpx; color: #5a6884; font-weight: 600; display: block; letter-spacing: 1rpx; }
.page-title { font-size: 44rpx; font-weight: 800; color: #1a2033; display: block; margin-top: 4rpx; }
.top-actions { display: flex; gap: 16rpx; }
.top-btn { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: #fff; border: 2rpx solid #dde1e8; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }

.main-scroll { flex: 1; }

.alert-banner {
  margin: 16rpx 28rpx; padding: 24rpx; background: #fee9e9;
  border-radius: 28rpx; display: flex; align-items: center; gap: 20rpx;
}
.alert-mascot { flex-shrink: 0; }
.alert-info { flex: 1; }
.alert-title { font-size: 28rpx; font-weight: 600; color: #7c1a1a; display: block; }
.alert-sub { font-size: 22rpx; color: #a04040; display: block; margin-top: 4rpx; }

.section-title-wrap { padding: 32rpx 40rpx 16rpx; }
.section-title { font-size: 28rpx; font-weight: 700; color: #1a2033; display: block; }

.empty-family {
  margin: 0 28rpx; padding: 48rpx 32rpx; background: #fff;
  border: 2rpx dashed #dde1e8; border-radius: 32rpx; text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.empty-title { font-size: 28rpx; font-weight: 600; color: #1a2033; margin-top: 20rpx; display: block; }
.empty-sub { font-size: 22rpx; color: #5a6884; margin-top: 8rpx; display: block; }
.bind-form { display: flex; gap: 16rpx; margin-top: 28rpx; width: 100%; }
.bind-input { flex: 1; height: 80rpx; background: #f4f7fb; border: 2rpx solid #dde1e8; border-radius: 20rpx; padding: 0 24rpx; font-size: 30rpx; letter-spacing: 8rpx; text-align: center; }
.bind-btn { padding: 0 32rpx; height: 80rpx; background: #5a6884; color: #fff; border: none; border-radius: 20rpx; font-size: 28rpx; font-weight: 600; line-height: 80rpx; }

.quick-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16rpx; padding: 0 28rpx; }
.quick-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.qi-icon { width: 96rpx; height: 96rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.qi-label { font-size: 22rpx; font-weight: 600; color: #1a2033; }
</style>
