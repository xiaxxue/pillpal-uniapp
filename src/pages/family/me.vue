<template>
  <view class="page">
    <scroll-view scroll-y class="main-scroll">
      <!-- Hero 个人卡片 -->
      <view class="hero-card">
        <view class="hero-deco" />
        <view class="hero-top">
          <view class="hero-avatar">
            <text class="hero-initial">晓</text>
          </view>
          <view class="hero-info">
            <view class="hero-name-row">
              <text class="hero-name">陈晓</text>
              <view class="hero-role-badge">
                <text>子女</text>
              </view>
            </view>
            <text class="hero-days">已加入 124 天</text>
          </view>
        </view>
        <view class="hero-badges">
          <view class="h-badge h-badge-plus">
            <text>👑 Plus</text>
          </view>
          <view class="h-badge h-badge-verified">
            <text>🛡️ 已实名</text>
          </view>
        </view>
      </view>

      <!-- Plus 会员 Banner -->
      <view class="plus-banner" @click="onRenewPlus">
        <view class="plus-info">
          <text class="plus-title">👑 Plus 会员</text>
          <text class="plus-expire">2026-12-31 到期</text>
        </view>
        <view class="plus-btn">
          <text class="plus-btn-text">续费</text>
        </view>
      </view>

      <!-- 设置组 -->
      <view
        v-for="group in settingGroups"
        :key="group.title"
        class="setting-group"
      >
        <text class="group-title">{{ group.title }}</text>
        <view class="group-card">
          <view
            v-for="(row, idx) in group.rows"
            :key="row.title"
            class="setting-row"
            :class="{ 'row-last': idx === group.rows.length - 1 }"
            @click="onSettingRow(row.title)"
          >
            <text class="row-icon">{{ row.icon }}</text>
            <view class="row-body">
              <text class="row-title">{{ row.title }}</text>
              <text v-if="row.sub" class="row-sub">{{ row.sub }}</text>
            </view>
            <text class="row-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-wrap">
        <view class="logout-btn" @click="onLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>

      <view style="height: 60rpx;" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface SettingRow {
  icon: string
  title: string
  sub?: string
}

interface SettingGroup {
  title: string
  rows: SettingRow[]
}

const settingGroups = ref<SettingGroup[]>([
  {
    title: '家人管理',
    rows: [
      { icon: '👨‍👩‍👧', title: '已添加家人', sub: '2 位家人' },
      { icon: '🔑', title: '我的权限', sub: '查看 · 提醒 · 代购' },
      { icon: '✉️', title: '邀请新家人' },
      { icon: '📄', title: '监护授权书' },
    ],
  },
  {
    title: '通知与提醒',
    rows: [
      { icon: '🔔', title: '通知偏好', sub: '用药提醒 · 健康周报' },
      { icon: '🌙', title: '免打扰时段', sub: '22:00 – 07:00' },
      { icon: '🆘', title: '紧急联系人', sub: '已设置 1 位' },
    ],
  },
  {
    title: '账号与隐私',
    rows: [
      { icon: '💳', title: '支付方式', sub: '微信支付' },
      { icon: '📦', title: '数据导出' },
      { icon: '🔒', title: '隐私设置' },
      { icon: '📱', title: '已登录设备', sub: '2 台设备' },
    ],
  },
  {
    title: '帮助与支持',
    rows: [
      { icon: '💬', title: '联系客服' },
      { icon: '📖', title: '使用帮助' },
      { icon: '✏️', title: '意见反馈' },
      { icon: 'ℹ️', title: '关于', sub: 'v1.2.0' },
    ],
  },
])

const onRenewPlus = () => {
  uni.showToast({ title: '续费会员', icon: 'none' })
}

const onSettingRow = (title: string) => {
  uni.showToast({ title, icon: 'none' })
}

const onLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.reLaunch({ url: '/pages/role-select/index' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.page {
  background: #f4f7fb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.main-scroll {
  flex: 1;
}

/* Hero 卡片 */
.hero-card {
  margin: 24rpx 28rpx 0;
  padding: 36rpx 32rpx 28rpx;
  background: linear-gradient(160deg, #0f1f1a 0%, #1a3833 100%);
  border-radius: 36rpx;
  position: relative;
  overflow: hidden;
}
.hero-deco {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
}
.hero-top {
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: relative;
  z-index: 1;
}
.hero-avatar {
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #34d399, #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hero-initial {
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
}
.hero-info {
  flex: 1;
  min-width: 0;
}
.hero-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.hero-name {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
}
.hero-role-badge {
  padding: 4rpx 16rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}
.hero-days {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.55);
  display: block;
  margin-top: 6rpx;
}
.hero-badges {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
  position: relative;
  z-index: 1;
}
.h-badge {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
}
.h-badge-plus {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}
.h-badge-verified {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
}

/* Plus Banner */
.plus-banner {
  margin: 20rpx 28rpx 0;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.plus-info {
  flex: 1;
}
.plus-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #451a03;
  display: block;
}
.plus-expire {
  font-size: 22rpx;
  color: #78350f;
  display: block;
  margin-top: 4rpx;
}
.plus-btn {
  padding: 12rpx 32rpx;
  background: #451a03;
  border-radius: 20rpx;
  flex-shrink: 0;
}
.plus-btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fef3c7;
}

/* 设置组 */
.setting-group {
  padding: 28rpx 28rpx 0;
}
.group-title {
  font-size: 22rpx;
  color: #5a6884;
  font-weight: 600;
  letter-spacing: 1rpx;
  display: block;
  margin-bottom: 12rpx;
}
.group-card {
  background: #fff;
  border: 2rpx solid #e3e8f1;
  border-radius: 28rpx;
  overflow: hidden;
}
.setting-row {
  display: flex;
  align-items: center;
  padding: 28rpx;
  gap: 20rpx;
  border-bottom: 2rpx solid #eef1f7;
}
.setting-row.row-last {
  border-bottom: none;
}
.row-icon {
  font-size: 36rpx;
  flex-shrink: 0;
  width: 52rpx;
  text-align: center;
}
.row-body {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f1f1a;
  display: block;
}
.row-sub {
  font-size: 22rpx;
  color: #5a6884;
  display: block;
  margin-top: 4rpx;
}
.row-arrow {
  font-size: 32rpx;
  color: #c5cee0;
  flex-shrink: 0;
}

/* 退出登录 */
.logout-wrap {
  padding: 40rpx 28rpx 0;
}
.logout-btn {
  background: #fff;
  border: 2rpx solid #fecaca;
  border-radius: 28rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logout-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #dc2626;
}
</style>
