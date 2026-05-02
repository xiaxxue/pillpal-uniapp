<template>
  <view class="page">
    <view class="profile-header">
      <text class="profile-avatar">{{ displayName?.charAt(0) || '你' }}</text>
      <text class="profile-name">{{ displayName }}</text>
      <text class="profile-email">{{ user?.email }}</text>
    </view>

    <scroll-view scroll-y class="content">
      <view class="section">
        <text class="section-title">👥 家属绑定</text>
        <view class="row" @click="generateCode">
          <text class="row-title">生成邀请码给家属</text>
          <text class="row-arrow">›</text>
        </view>
      </view>

      <view v-if="inviteCode" class="code-box">
        <text class="code-label">你的邀请码</text>
        <text class="code-value">{{ inviteCode }}</text>
        <text class="code-tip">请将此邀请码发送给家属</text>
        <button class="btn-copy" @click="copyCode">复制邀请码</button>
      </view>

      <view class="section">
        <text class="section-title">⚙ 其他</text>
        <view class="row" @click="switchRole">
          <text class="row-title">切换角色</text>
          <text class="row-arrow">›</text>
        </view>
        <view class="row" @click="logout">
          <text class="row-title danger">退出登录</text>
          <text class="row-arrow">›</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { supabase } from '../../utils/supabase'

const userStore = useUserStore()
const user = computed(() => userStore.user)
const displayName = computed(() => userStore.displayName)
const inviteCode = ref('')

const generateCode = async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  await supabase.from('family_links').insert({ patient_id: user.value.id, invite_code: code, status: 'pending' })
  inviteCode.value = code
}

const copyCode = () => {
  uni.setClipboardData({ data: inviteCode.value })
  uni.showToast({ title: '邀请码已复制', icon: 'success' })
}

const switchRole = () => {
  uni.removeStorageSync('last_role')
  uni.reLaunch({ url: '/pages/role-select/index' })
}

const logout = async () => {
  await userStore.signOut()
  uni.removeStorageSync('last_role')
  uni.reLaunch({ url: '/pages/role-select/index' })
}
</script>

<style scoped>
.page { background: #f4f6f8; min-height: 100vh; }
.profile-header { background: linear-gradient(135deg, #0b9d6a, #0abf7f); color: #fff; padding: 48rpx; text-align: center; }
.profile-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; background: rgba(255,255,255,0.25); display: inline-flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 600; }
.profile-name { font-size: 36rpx; font-weight: 600; display: block; margin-top: 16rpx; }
.profile-email { font-size: 24rpx; opacity: 0.8; display: block; margin-top: 8rpx; }
.content { padding: 24rpx; }
.section { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.section-title { font-size: 30rpx; font-weight: 600; display: block; margin-bottom: 16rpx; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #e5e7eb; }
.row:last-child { border-bottom: none; }
.row-title { font-size: 28rpx; }
.row-title.danger { color: #e53935; }
.row-arrow { font-size: 32rpx; color: #9ca3af; }

.code-box { text-align: center; padding: 32rpx; background: #e6f7f0; border-radius: 20rpx; border: 2rpx dashed #0b9d6a; margin-bottom: 24rpx; }
.code-label { font-size: 26rpx; color: #6b7280; display: block; margin-bottom: 12rpx; }
.code-value { font-size: 56rpx; font-weight: 700; color: #0b9d6a; letter-spacing: 12rpx; font-family: monospace; display: block; }
.code-tip { font-size: 22rpx; color: #6b7280; display: block; margin-top: 12rpx; }
.btn-copy { width: 100%; margin-top: 16rpx; padding: 16rpx; background: #fff; color: #0b9d6a; border: 2rpx solid #0b9d6a; border-radius: 12rpx; font-size: 28rpx; }
</style>
