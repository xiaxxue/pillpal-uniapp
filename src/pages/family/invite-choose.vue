<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="top-title">添加家人</text>
      <view class="top-placeholder" />
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 选项卡1: 我来添加家人 -->
      <view class="choice-card recommended" @click="goInvite">
        <view class="choice-badge">
          <text class="choice-badge-text">推荐</text>
        </view>
        <view class="choice-row">
          <view class="choice-icon-wrap green">
            <text class="choice-icon">👨‍👩‍👧</text>
          </view>
          <view class="choice-body">
            <text class="choice-title">我来添加家人</text>
            <text class="choice-desc">主动邀请家人加入，设置查看和管理权限</text>
          </view>
          <text class="choice-arrow">›</text>
        </view>
      </view>

      <!-- 选项卡2: 家人邀请我 -->
      <view class="choice-card normal" @click="goPatientInvite">
        <view class="choice-row">
          <view class="choice-icon-wrap gray">
            <text class="choice-icon">📩</text>
          </view>
          <view class="choice-body">
            <text class="choice-title">家人邀请我</text>
            <text class="choice-desc">家人已分享邀请给我，我来接受邀请</text>
          </view>
          <text class="choice-arrow">›</text>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="hint-wrap">
        <text class="hint-text">添加家人后可远程查看用药情况、发送提醒</text>
        <text class="hint-text">家人需下载小派药盒APP并注册账号</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
function goBack() {
  uni.navigateBack()
}

function goInvite() {
  uni.navigateTo({ url: '/pages/family/invite' })
}

function goPatientInvite() {
  uni.navigateTo({ url: '/pages/family/patient-invite' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f4f7fb;
  display: flex;
  flex-direction: column;
}

/* ── Top bar ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 100rpx 32rpx 24rpx;
  background: #fff;
}
.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  border-radius: 50%;
}
.back-icon {
  font-size: 40rpx;
  color: #333;
  margin-top: -4rpx;
}
.top-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.top-placeholder {
  width: 64rpx;
}

/* ── Main scroll ── */
.main-scroll {
  flex: 1;
  padding: 32rpx;
}

/* ── Choice cards ── */
.choice-card {
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  margin-bottom: 24rpx;
  position: relative;
  overflow: hidden;
}
.choice-card.recommended {
  background: #e7f6ef;
  border: 2rpx solid #0b9d6a;
}
.choice-card.normal {
  background: #fff;
  border: 2rpx solid #eee;
}
.choice-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #0b9d6a;
  padding: 6rpx 20rpx 6rpx 24rpx;
  border-radius: 0 22rpx 0 16rpx;
}
.choice-badge-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}
.choice-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.choice-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.choice-icon-wrap.green {
  background: rgba(11, 157, 106, 0.12);
}
.choice-icon-wrap.gray {
  background: #f0f2f5;
}
.choice-icon {
  font-size: 44rpx;
}
.choice-body {
  flex: 1;
}
.choice-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8rpx;
}
.choice-desc {
  display: block;
  font-size: 26rpx;
  color: #888;
  line-height: 1.5;
}
.choice-arrow {
  font-size: 36rpx;
  color: #ccc;
  flex-shrink: 0;
}

/* ── Hint ── */
.hint-wrap {
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.hint-text {
  font-size: 24rpx;
  color: #aaa;
}
</style>
