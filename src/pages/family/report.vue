<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="top-title">健康简报</text>
      <view class="top-placeholder" />
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- Hero 卡片 -->
      <view class="hero-card">
        <view class="hero-header">
          <text class="hero-week">{{ reportData.weekLabel }}</text>
          <text class="hero-name">{{ reportData.patientName }} 的用药报告</text>
        </view>
        <view class="hero-score-row">
          <view class="hero-score-wrap">
            <text class="hero-score">{{ reportData.score }}%</text>
            <view class="hero-trend" :class="reportData.trendUp ? 'up' : 'down'">
              <text class="hero-trend-text">{{ reportData.trendUp ? '+' : '' }}{{ reportData.trendDelta }}% vs 上周</text>
            </view>
          </view>
        </view>
        <view class="hero-stats-row">
          <view class="hero-stat">
            <text class="hero-stat-num">{{ reportData.taken }}</text>
            <text class="hero-stat-label">已服</text>
          </view>
          <view class="hero-stat-divider" />
          <view class="hero-stat">
            <text class="hero-stat-num">{{ reportData.skipped }}</text>
            <text class="hero-stat-label">跳过</text>
          </view>
          <view class="hero-stat-divider" />
          <view class="hero-stat">
            <text class="hero-stat-num">{{ reportData.streak }}天🔥</text>
            <text class="hero-stat-label">连续</text>
          </view>
        </view>
      </view>

      <!-- AI 小结 -->
      <view class="ai-card">
        <view class="ai-icon-wrap">
          <text class="ai-icon">📖</text>
        </view>
        <view class="ai-body">
          <text class="ai-label">小派AI小结</text>
          <text class="ai-text">{{ reportData.aiSummary }}</text>
        </view>
      </view>

      <!-- 时段表现 -->
      <view class="section-card">
        <text class="section-title">时段表现</text>
        <view class="bar-list">
          <view v-for="item in reportData.periods" :key="item.label" class="bar-row">
            <text class="bar-label">{{ item.label }}</text>
            <view class="bar-track">
              <view class="bar-fill" :style="{ width: item.percent + '%' }" :class="getBarClass(item.percent)" />
            </view>
            <text class="bar-percent">{{ item.percent }}%</text>
          </view>
        </view>
      </view>

      <!-- 用药明细 -->
      <view class="section-card">
        <text class="section-title">用药明细</text>
        <view class="med-list">
          <view v-for="med in reportData.meds" :key="med.name" class="med-row">
            <view class="med-dot" :class="med.status" />
            <text class="med-name">{{ med.name }}</text>
            <text class="med-rate">{{ med.rate }}%</text>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="bottom-actions">
        <view class="action-btn secondary" @click="shareFamily">
          <text class="action-btn-text">转发给家人</text>
        </view>
        <view class="action-btn primary" @click="shareDoctor">
          <text class="action-btn-text">发给医生</text>
        </view>
      </view>

      <view style="height: 60rpx;" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

/* ── Mock Data ── */
const reportData = reactive({
  weekLabel: '4月21日 – 4月27日',
  patientName: '王奶奶',
  score: 92,
  trendUp: true,
  trendDelta: 4,
  taken: 23,
  skipped: 3,
  streak: 28,
  aiSummary:
    '本周用药整体良好，依从率较上周提升4%。傍晚时段偶有漏服，建议设置额外提醒。降压药和降糖药均按时服用，继续保持！',
  periods: [
    { label: '早晨', percent: 100 },
    { label: '中午', percent: 88 },
    { label: '傍晚', percent: 75 },
    { label: '夜间', percent: 96 },
  ],
  meds: [
    { name: '氨氯地平 5mg', rate: 100, status: 'good' },
    { name: '二甲双胍 0.5g', rate: 95, status: 'good' },
    { name: '阿司匹林 100mg', rate: 85, status: 'warn' },
    { name: '钙片 600mg', rate: 78, status: 'warn' },
  ],
})

function getBarClass(percent: number) {
  if (percent >= 90) return 'bar-good'
  if (percent >= 75) return 'bar-ok'
  return 'bar-warn'
}

function goBack() {
  uni.navigateBack()
}

function shareFamily() {
  uni.showToast({ title: '已生成分享链接', icon: 'none' })
}

function shareDoctor() {
  uni.showToast({ title: '已生成医生报告', icon: 'none' })
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
  padding: 24rpx 32rpx;
}

/* ── Hero card ── */
.hero-card {
  background: linear-gradient(135deg, #0f1f1a 0%, #0b9d6a 100%);
  border-radius: 28rpx;
  padding: 40rpx 36rpx 36rpx;
  margin-bottom: 24rpx;
}
.hero-header {
  margin-bottom: 24rpx;
}
.hero-week {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}
.hero-name {
  display: block;
  font-size: 30rpx;
  color: #fff;
  font-weight: 600;
  margin-top: 8rpx;
}
.hero-score-row {
  display: flex;
  align-items: flex-end;
  margin-bottom: 32rpx;
}
.hero-score-wrap {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}
.hero-score {
  font-size: 96rpx;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}
.hero-trend {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
  padding: 6rpx 16rpx;
  margin-bottom: 12rpx;
}
.hero-trend.up {
  background: rgba(34, 197, 94, 0.25);
}
.hero-trend.down {
  background: rgba(239, 68, 68, 0.25);
}
.hero-trend-text {
  font-size: 24rpx;
  color: #fff;
}
.hero-stats-row {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 20rpx 0;
}
.hero-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-stat-num {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}
.hero-stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4rpx;
}
.hero-stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.2);
}

/* ── AI card ── */
.ai-card {
  display: flex;
  background: #e7f6ef;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  gap: 20rpx;
}
.ai-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-icon {
  font-size: 40rpx;
}
.ai-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ai-label {
  font-size: 24rpx;
  color: #0b9d6a;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.ai-text {
  font-size: 26rpx;
  color: #2d6a4f;
  line-height: 1.6;
}

/* ── Section card ── */
.section-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 24rpx;
}

/* ── Bar chart ── */
.bar-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bar-label {
  font-size: 26rpx;
  color: #666;
  width: 80rpx;
  flex-shrink: 0;
}
.bar-track {
  flex: 1;
  height: 24rpx;
  background: #f0f2f5;
  border-radius: 12rpx;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 12rpx;
  transition: width 0.5s ease;
}
.bar-good {
  background: linear-gradient(90deg, #0b9d6a, #34d399);
}
.bar-ok {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}
.bar-warn {
  background: linear-gradient(90deg, #ef4444, #f87171);
}
.bar-percent {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  width: 80rpx;
  text-align: right;
}

/* ── Med list ── */
.med-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.med-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.med-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.med-dot.good {
  background: #0b9d6a;
}
.med-dot.warn {
  background: #f59e0b;
}
.med-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}
.med-rate {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

/* ── Bottom actions ── */
.bottom-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}
.action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn.secondary {
  background: #fff;
  border: 2rpx solid #ddd;
}
.action-btn.primary {
  background: linear-gradient(135deg, #0b9d6a, #10b981);
}
.action-btn.secondary .action-btn-text {
  color: #333;
  font-size: 28rpx;
  font-weight: 600;
}
.action-btn.primary .action-btn-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}
</style>
