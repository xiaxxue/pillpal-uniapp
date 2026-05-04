<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="top-title">家人详情</text>
      <view class="top-placeholder" />
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- Hero 卡片 -->
      <view class="hero-card">
        <view class="hero-row">
          <view class="hero-avatar">
            <text class="hero-initial">{{ patient.patient_name?.charAt(0) || '家' }}</text>
          </view>
          <view class="hero-info">
            <view class="hero-name-row">
              <text class="hero-name">{{ patient.patient_name || '家人' }}</text>
              <text class="hero-real-name">{{ mockProfile.realName }}</text>
              <text class="hero-age">{{ mockProfile.age }}岁</text>
            </view>
            <view class="hero-tags">
              <view v-for="tag in mockProfile.diseases" :key="tag" class="disease-tag">
                <text class="disease-tag-icon">💊</text>
                <text class="disease-tag-text">{{ tag }}</text>
              </view>
            </view>
            <view class="hero-device-row">
              <view class="device-dot" :class="mockProfile.deviceOnline ? 'online' : 'offline'" />
              <text class="device-text">{{ mockProfile.deviceOnline ? '设备在线' : '设备离线' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 统计卡片 -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-label">本周依从</text>
          <view class="stat-val-row">
            <text class="stat-num green">92</text>
            <text class="stat-unit">%</text>
          </view>
        </view>
        <view class="stat-card">
          <text class="stat-label">本月依从</text>
          <view class="stat-val-row">
            <text class="stat-num blue">89</text>
            <text class="stat-unit">%</text>
          </view>
        </view>
        <view class="stat-card">
          <text class="stat-label">连续打卡</text>
          <view class="stat-val-row">
            <text class="stat-num dark">--</text>
            <text class="stat-unit">天</text>
          </view>
        </view>
      </view>

      <!-- 7天热力图 -->
      <view class="section-wrap">
        <text class="section-label">7 天用药热力图</text>
        <view class="heatmap-card">
          <view class="heatmap-header">
            <text v-for="d in weekDays" :key="d" class="heatmap-day">{{ d }}</text>
          </view>
          <view class="heatmap-body">
            <view v-for="(row, ri) in heatmapData" :key="ri" class="heatmap-row">
              <view
                v-for="(cell, ci) in row"
                :key="ci"
                class="heatmap-cell"
                :class="cell"
              />
            </view>
          </view>
          <view class="heatmap-legend">
            <view class="legend-item"><view class="legend-dot done" /><text class="legend-text">已服</text></view>
            <view class="legend-item"><view class="legend-dot missed" /><text class="legend-text">漏服</text></view>
            <view class="legend-item"><view class="legend-dot pending" /><text class="legend-text">待服</text></view>
            <view class="legend-item"><view class="legend-dot future" /><text class="legend-text">未到</text></view>
          </view>
        </view>
      </view>

      <!-- 各药品依从率 -->
      <view class="section-wrap">
        <text class="section-label">各药品依从率</text>
        <view class="med-adhere-list">
          <view v-for="med in mockMedAdherence" :key="med.name" class="med-adhere-card">
            <view class="med-adhere-top">
              <view class="med-adhere-info">
                <text class="med-adhere-name">{{ med.name }}</text>
                <text class="med-adhere-disease">{{ med.disease }}</text>
              </view>
              <text class="med-adhere-rate" :class="rateColor(med.rate)">{{ med.rate }}%</text>
            </view>
            <view class="med-adhere-bar-bg">
              <view class="med-adhere-bar" :class="rateColor(med.rate)" :style="{ width: med.rate + '%' }" />
            </view>
          </view>
        </view>
      </view>

      <!-- 近期活动 -->
      <view class="section-wrap">
        <text class="section-label">近期活动</text>
        <view class="timeline-card">
          <view v-for="(item, i) in mockTimeline" :key="i" class="tl-row" :class="{ 'tl-last': i === mockTimeline.length - 1 }">
            <view class="tl-line-wrap">
              <view class="tl-dot" :class="item.type" />
              <view v-if="i < mockTimeline.length - 1" class="tl-line" />
            </view>
            <view class="tl-content">
              <text class="tl-title">{{ item.title }}</text>
              <text class="tl-desc">{{ item.desc }}</text>
              <text class="tl-time">{{ item.time }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 180rpx;" />
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="bottom-btn call-btn" @click="voiceCall">
        <text class="bottom-btn-icon">📞</text>
        <text class="bottom-btn-text">语音通话</text>
      </view>
      <view class="bottom-btn remind-btn" @click="goRemind">
        <text class="bottom-btn-icon">🔔</text>
        <text class="bottom-btn-text">发送提醒</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useFamilyStore } from '../../stores/family'
import Xiaopai from '../../components/Xiaopai.vue'

const userStore = useUserStore()
const familyStore = useFamilyStore()
const patientId = ref('')

const patient = computed(() => {
  return familyStore.patients.find(p => p.patient_id === patientId.value) || {
    patient_id: '',
    patient_name: '家人',
    medications: [],
    today_records: [],
  }
})

// ── Mock 数据 ──
const mockProfile = {
  realName: '张大爷',
  age: 72,
  diseases: ['2型糖尿病', '高血压'],
  deviceOnline: true,
}

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const heatmapData = [
  ['done', 'done', 'done', 'missed', 'done', 'pending', 'future'],
  ['done', 'done', 'missed', 'done', 'done', 'pending', 'future'],
  ['done', 'done', 'done', 'done', 'missed', 'pending', 'future'],
  ['done', 'missed', 'done', 'done', 'done', 'pending', 'future'],
]

const mockMedAdherence = [
  { name: '二甲双胍', disease: '2型糖尿病', rate: 95 },
  { name: '格列齐特', disease: '2型糖尿病', rate: 82 },
  { name: '氨氯地平', disease: '高血压', rate: 75 },
  { name: '阿司匹林', disease: '心血管', rate: 91 },
]

const rateColor = (rate: number) => {
  if (rate >= 90) return 'rate-green'
  if (rate >= 80) return 'rate-yellow'
  return 'rate-red'
}

const mockTimeline = [
  { type: 'done', title: '已服用 二甲双胍', desc: '早餐后 · 500mg', time: '今天 08:15' },
  { type: 'done', title: '已服用 氨氯地平', desc: '早餐后 · 5mg', time: '今天 08:16' },
  { type: 'missed', title: '漏服 格列齐特', desc: '午餐前 · 80mg · 已超时35分钟', time: '今天 12:00' },
  { type: 'done', title: '已服用 阿司匹林', desc: '晚餐后 · 100mg', time: '昨天 18:30' },
  { type: 'remind', title: '家属发送提醒', desc: '提醒服用格列齐特', time: '昨天 12:40' },
]

const goBack = () => {
  uni.navigateBack()
}

const voiceCall = () => {
  uni.showToast({ title: '语音通话功能开发中', icon: 'none' })
}

const goRemind = () => {
  uni.navigateTo({
    url: `/pages/family/remind?patient_id=${patientId.value}&patient_name=${encodeURIComponent(patient.value.patient_name)}`
  })
}

onLoad((query) => {
  if (query?.patient_id) {
    patientId.value = query.patient_id
  }
})
</script>

<style lang="scss" scoped>
.page { background: #f4f7fb; min-height: 100vh; display: flex; flex-direction: column; }

/* 顶栏 */
.top-bar { padding: 24rpx 36rpx 16rpx; display: flex; align-items: center; justify-content: space-between; }
.back-btn { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: #fff; border: 2rpx solid #e3e8f1; display: flex; align-items: center; justify-content: center; }
.back-icon { font-size: 40rpx; color: #0f1f1a; font-weight: 700; margin-top: -4rpx; }
.top-title { font-size: 32rpx; font-weight: 700; color: #0f1f1a; }
.top-placeholder { width: 72rpx; }

.main-scroll { flex: 1; }

/* Hero 卡片 */
.hero-card { margin: 16rpx 28rpx 0; background: linear-gradient(135deg, #e7f6ef, #d1f0e0); border-radius: 32rpx; padding: 36rpx 32rpx; border: 2rpx solid #c8e8d8; }
.hero-row { display: flex; align-items: flex-start; gap: 28rpx; }
.hero-avatar { width: 128rpx; height: 128rpx; border-radius: 50%; background: linear-gradient(135deg, #0b9d6a, #078558); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 4rpx solid rgba(255,255,255,0.5); }
.hero-initial { font-size: 52rpx; font-weight: 800; color: #fff; }
.hero-info { flex: 1; min-width: 0; }
.hero-name-row { display: flex; align-items: baseline; gap: 12rpx; flex-wrap: wrap; }
.hero-name { font-size: 36rpx; font-weight: 800; color: #0f1f1a; }
.hero-real-name { font-size: 24rpx; color: #3d6b55; font-weight: 600; }
.hero-age { font-size: 22rpx; color: #5a8a72; }
.hero-tags { display: flex; gap: 12rpx; margin-top: 12rpx; flex-wrap: wrap; }
.disease-tag { display: flex; align-items: center; gap: 6rpx; padding: 6rpx 16rpx; background: rgba(255,255,255,0.7); border-radius: 999rpx; }
.disease-tag-icon { font-size: 20rpx; }
.disease-tag-text { font-size: 22rpx; color: #1a5c3a; font-weight: 600; }
.hero-device-row { display: flex; align-items: center; gap: 8rpx; margin-top: 12rpx; }
.device-dot { width: 14rpx; height: 14rpx; border-radius: 50%; }
.device-dot.online { background: #0b9d6a; box-shadow: 0 0 0 4rpx rgba(11,157,106,0.2); }
.device-dot.offline { background: #c5cee0; }
.device-text { font-size: 22rpx; color: #3d6b55; }

/* 统计卡片 */
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; padding: 20rpx 28rpx 0; }
.stat-card { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 24rpx 20rpx; text-align: center; }
.stat-label { font-size: 22rpx; color: #5a6884; font-weight: 600; display: block; text-transform: uppercase; letter-spacing: 1rpx; }
.stat-val-row { display: flex; align-items: baseline; justify-content: center; gap: 4rpx; margin-top: 8rpx; }
.stat-num { font-family: 'Inter', sans-serif; font-size: 44rpx; font-weight: 800; }
.stat-num.green { color: #078558; }
.stat-num.blue { color: #2563eb; }
.stat-num.dark { color: #0f1f1a; }
.stat-unit { font-size: 22rpx; color: #5a6884; font-weight: 600; }

/* Section */
.section-wrap { padding: 32rpx 28rpx 0; }
.section-label { font-size: 22rpx; color: #5a6884; font-weight: 600; letter-spacing: 1rpx; display: block; margin-bottom: 16rpx; text-transform: uppercase; }

/* 热力图 */
.heatmap-card { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 28rpx; }
.heatmap-header { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8rpx; margin-bottom: 12rpx; }
.heatmap-day { font-size: 22rpx; color: #5a6884; font-weight: 600; text-align: center; }
.heatmap-body { display: flex; flex-direction: column; gap: 8rpx; }
.heatmap-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8rpx; }
.heatmap-cell { aspect-ratio: 1; border-radius: 10rpx; }
.heatmap-cell.done { background: #34d399; }
.heatmap-cell.missed { background: #f87171; }
.heatmap-cell.pending { background: #fbbf24; }
.heatmap-cell.future { background: #e3e8f1; }
.heatmap-legend { display: flex; gap: 24rpx; margin-top: 20rpx; justify-content: center; }
.legend-item { display: flex; align-items: center; gap: 8rpx; }
.legend-dot { width: 18rpx; height: 18rpx; border-radius: 6rpx; }
.legend-dot.done { background: #34d399; }
.legend-dot.missed { background: #f87171; }
.legend-dot.pending { background: #fbbf24; }
.legend-dot.future { background: #e3e8f1; }
.legend-text { font-size: 22rpx; color: #5a6884; }

/* 各药品依从率 */
.med-adhere-list { display: flex; flex-direction: column; gap: 16rpx; }
.med-adhere-card { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 24rpx 28rpx; }
.med-adhere-top { display: flex; align-items: center; justify-content: space-between; }
.med-adhere-info { flex: 1; }
.med-adhere-name { font-size: 28rpx; font-weight: 700; color: #0f1f1a; display: block; }
.med-adhere-disease { font-size: 22rpx; color: #5a6884; display: block; margin-top: 4rpx; }
.med-adhere-rate { font-family: 'Inter', sans-serif; font-size: 36rpx; font-weight: 800; }
.med-adhere-rate.rate-green { color: #078558; }
.med-adhere-rate.rate-yellow { color: #d97706; }
.med-adhere-rate.rate-red { color: #dc2626; }
.med-adhere-bar-bg { height: 12rpx; background: #eef1f7; border-radius: 999rpx; margin-top: 16rpx; overflow: hidden; }
.med-adhere-bar { height: 100%; border-radius: 999rpx; transition: width 0.6s ease; }
.med-adhere-bar.rate-green { background: linear-gradient(90deg, #34d399, #0b9d6a); }
.med-adhere-bar.rate-yellow { background: linear-gradient(90deg, #fbbf24, #d97706); }
.med-adhere-bar.rate-red { background: linear-gradient(90deg, #f87171, #dc2626); }

/* 时间线 */
.timeline-card { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 28rpx; }
.tl-row { display: flex; gap: 20rpx; }
.tl-line-wrap { display: flex; flex-direction: column; align-items: center; width: 28rpx; flex-shrink: 0; }
.tl-dot { width: 20rpx; height: 20rpx; border-radius: 50%; flex-shrink: 0; }
.tl-dot.done { background: #0b9d6a; }
.tl-dot.missed { background: #e53935; }
.tl-dot.remind { background: #2563eb; }
.tl-line { width: 4rpx; flex: 1; background: #e3e8f1; margin: 6rpx 0; min-height: 40rpx; }
.tl-content { flex: 1; padding-bottom: 28rpx; }
.tl-row.tl-last .tl-content { padding-bottom: 0; }
.tl-title { font-size: 26rpx; font-weight: 700; color: #0f1f1a; display: block; }
.tl-desc { font-size: 22rpx; color: #5a6884; display: block; margin-top: 4rpx; }
.tl-time { font-size: 20rpx; color: #9aa3b0; display: block; margin-top: 6rpx; font-family: 'Inter', sans-serif; }

/* 底部按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 28rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 2rpx solid #e3e8f1; display: flex; gap: 20rpx; }
.bottom-btn { flex: 1; height: 96rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.call-btn { background: #fff; border: 2rpx solid #e3e8f1; }
.remind-btn { background: #0f1f1a; }
.bottom-btn-icon { font-size: 32rpx; }
.call-btn .bottom-btn-text { font-size: 28rpx; font-weight: 700; color: #0f1f1a; }
.remind-btn .bottom-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }
</style>
