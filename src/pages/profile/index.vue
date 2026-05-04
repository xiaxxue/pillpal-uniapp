<template>
  <view class="page" :class="{ 'elder-mode': elderMode }">
    <!-- 顶部绿色区域 -->
    <view class="profile-bg">
      <view class="bg-deco" />
      <text class="profile-page-title">我的</text>
      <view class="profile-card">
        <view class="profile-avatar">
          <text class="avatar-text">{{ displayName?.charAt(0) || '你' }}</text>
        </view>
        <view class="profile-info">
          <text class="profile-name">{{ displayName }}</text>
          <text class="profile-email">{{ user?.email }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 统计卡片 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-icon">💊</text>
          <text class="stat-num">{{ medications.length }}</text>
          <text class="stat-label">种药品</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-icon">🔥</text>
          <text class="stat-num">{{ doneCount }}</text>
          <text class="stat-label">累计服药</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-icon">📊</text>
          <text class="stat-num">--</text>
          <text class="stat-label">依从率%</text>
        </view>
      </view>

      <!-- 家属绑定 -->
      <view class="section-group">
        <text class="section-group-title">家属管理</text>
        <view class="section-card">
          <view class="row" @click="generateCode">
            <text class="row-icon">👨‍👩‍👧</text>
            <view class="row-body">
              <text class="row-title">生成邀请码给家属</text>
              <text class="row-sub">让家人远程关注你的用药</text>
            </view>
            <text class="row-arrow">›</text>
          </view>
        </view>
      </view>

      <view v-if="inviteCode" class="code-card">
        <text class="code-label">你的邀请码</text>
        <text class="code-value">{{ inviteCode }}</text>
        <text class="code-tip">请将此邀请码发送给家属</text>
        <button class="btn-code-copy" @click="copyCode">复制邀请码</button>
      </view>

      <!-- 用药管理 -->
      <view class="section-group">
        <text class="section-group-title">用药管理</text>
        <view class="section-card">
          <view class="row" @click="goRecords">
            <text class="row-icon">📊</text>
            <view class="row-body">
              <text class="row-title">服药记录</text>
              <text class="row-sub">查看依从率和历史记录</text>
            </view>
            <text class="row-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 显示设置 -->
      <view class="section-group">
        <text class="section-group-title">显示设置</text>
        <view class="section-card">
          <view class="row">
            <text class="row-icon">🔤</text>
            <view class="row-body">
              <text class="row-title">长辈模式</text>
              <text class="row-sub">大字体 · 暖色调 · 更大按钮</text>
            </view>
            <view class="switch" :class="{ on: elderMode }" @click="toggleElder">
              <view class="switch-thumb" />
            </view>
          </view>
        </view>
      </view>

      <!-- 其他设置 -->
      <view class="section-group">
        <text class="section-group-title">其他</text>
        <view class="section-card">
          <view class="row" @click="switchRole">
            <text class="row-icon">🔄</text>
            <view class="row-body">
              <text class="row-title">切换角色</text>
            </view>
            <text class="row-arrow">›</text>
          </view>
          <view class="row-line" />
          <view class="row" @click="showAbout">
            <text class="row-icon">ℹ️</text>
            <view class="row-body">
              <text class="row-title">关于小派</text>
              <text class="row-sub">v1.2.0</text>
            </view>
            <text class="row-arrow">›</text>
          </view>
          <view class="row-line" />
          <view class="row" @click="logout">
            <text class="row-icon">🚪</text>
            <view class="row-body">
              <text class="row-title danger">退出登录</text>
            </view>
            <text class="row-arrow">›</text>
          </view>
        </view>
      </view>

      <view style="height: 60rpx;" />
    </scroll-view>

    <custom-tab-bar current="profile" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { supabase } from '../../utils/supabase'
import CustomTabBar from '../../components/CustomTabBar.vue'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()
const user = computed(() => userStore.user)
const displayName = computed(() => userStore.displayName)
const elderMode = computed(() => userStore.elderMode)
const medications = computed(() => medsStore.medications)
const doneCount = computed(() => recordsStore.doneCount)
const inviteCode = ref('')

const toggleElder = () => { userStore.toggleElderMode() }
const goRecords = () => { uni.navigateTo({ url: '/pages/records/index' }) }

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

const showAbout = () => {
  uni.showToast({ title: 'PillPal v1.2.0', icon: 'none' })
}

const logout = async () => {
  await userStore.signOut()
  uni.removeStorageSync('last_role')
  uni.reLaunch({ url: '/pages/role-select/index' })
}

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) {
    await medsStore.fetchAll(userStore.user.id)
    await recordsStore.loadRecords(userStore.user.id)
  }
})
</script>

<style lang="scss" scoped>
.page { background: #f6f8f7; min-height: 100vh; display: flex; flex-direction: column; }

/* 顶部区域 */
.profile-bg {
  background: linear-gradient(135deg, #0b9d6a 0%, #26e69b 100%);
  padding: 24rpx 40rpx 120rpx; color: #fff; position: relative; overflow: hidden;
}
.bg-deco { position: absolute; top: -40rpx; right: -60rpx; width: 320rpx; height: 320rpx; border-radius: 50%; background: rgba(255,255,255,0.1); }
.profile-page-title { font-size: 32rpx; font-weight: 700; display: block; margin-bottom: 44rpx; position: relative; }
.profile-card { display: flex; gap: 28rpx; align-items: center; position: relative; }
.profile-avatar {
  width: 128rpx; height: 128rpx; border-radius: 44rpx;
  background: rgba(255,255,255,0.25); border: 4rpx solid rgba(255,255,255,0.4);
  display: flex; align-items: center; justify-content: center;
}
.avatar-text { font-size: 52rpx; font-weight: 700; }
.profile-info { flex: 1; }
.profile-name { font-size: 40rpx; font-weight: 700; display: block; }
.profile-email { font-size: 22rpx; opacity: 0.85; display: block; margin-top: 4rpx; }

.main-scroll { flex: 1; margin-top: -80rpx; }

/* 统计卡片 */
.stats-card {
  margin: 0 28rpx; background: #fff; border: 2rpx solid #e7eae8;
  border-radius: 40rpx; padding: 32rpx; box-shadow: 0 16rpx 48rpx rgba(15,31,26,0.08);
  display: flex; align-items: center; position: relative;
}
.stat-item { flex: 1; text-align: center; }
.stat-icon { font-size: 28rpx; display: block; margin-bottom: 4rpx; }
.stat-num { font-size: 44rpx; font-weight: 700; color: #0b9d6a; font-family: 'Inter', sans-serif; display: block; letter-spacing: -1rpx; }
.stat-label { font-size: 20rpx; color: #6b7670; display: block; margin-top: 4rpx; }
.stat-divider { width: 2rpx; height: 60rpx; background: #e7eae8; }

/* 分组 */
.section-group { margin: 28rpx 28rpx 0; }
.section-group-title { font-size: 22rpx; color: #9aa39e; font-weight: 600; display: block; padding: 0 8rpx 16rpx; letter-spacing: 1rpx; }
.section-card { background: #fff; border: 2rpx solid #e7eae8; border-radius: 32rpx; overflow: hidden; }

.row { display: flex; align-items: center; gap: 24rpx; padding: 26rpx 28rpx; }
.row-icon { font-size: 34rpx; flex-shrink: 0; }
.row-body { flex: 1; }
.row-title { font-size: 26rpx; font-weight: 600; color: #0f1f1a; display: block; }
.row-title.danger { color: #c75a2a; }
.row-sub { font-size: 20rpx; color: #9aa39e; display: block; margin-top: 2rpx; }
.row-arrow { font-size: 28rpx; color: #9aa39e; flex-shrink: 0; }
.row-line { height: 2rpx; background: #e7eae8; margin: 0 28rpx; }

/* 开关 */
.switch {
  width: 84rpx; height: 48rpx; border-radius: 24rpx;
  background: #e7eae8; position: relative; flex-shrink: 0;
  transition: background 0.25s;
}
.switch.on { background: #0b9d6a; }
.switch-thumb {
  position: absolute; top: 4rpx; left: 4rpx;
  width: 40rpx; height: 40rpx; border-radius: 50%;
  background: #fff; box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.18);
  transition: left 0.25s cubic-bezier(.2,.8,.2,1);
}
.switch.on .switch-thumb { left: 40rpx; }

/* 邀请码 */
.code-card {
  margin: 20rpx 28rpx 0; text-align: center; padding: 40rpx;
  background: #f0f8f4; border: 2rpx dashed #0b9d6a; border-radius: 32rpx;
}
.code-label { font-size: 24rpx; color: #6b7670; display: block; margin-bottom: 16rpx; }
.code-value { font-size: 64rpx; font-weight: 700; color: #0b9d6a; letter-spacing: 16rpx; font-family: 'Inter', monospace; display: block; }
.code-tip { font-size: 22rpx; color: #6b7670; display: block; margin-top: 16rpx; }
.btn-code-copy {
  margin-top: 20rpx; padding: 16rpx 40rpx;
  background: #fff; color: #0b9d6a; border: 2rpx solid #0b9d6a;
  border-radius: 999rpx; font-size: 26rpx; font-weight: 600;
}
</style>
