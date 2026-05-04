<template>
  <view class="page">
    <view class="top-bar">
      <text class="back-btn" @click="goBack">‹</text>
      <text class="page-title">服药记录</text>
      <view style="width:72rpx;" />
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 标签 -->
      <view class="tab-bar">
        <text class="tab" :class="{ active: activeTab === 'week' }" @click="activeTab = 'week'">本周</text>
        <text class="tab" :class="{ active: activeTab === 'month' }" @click="activeTab = 'month'">本月</text>
        <text class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</text>
      </view>

      <!-- 统计卡片 -->
      <view class="stat-hero">
        <view class="stat-hero-left">
          <xiaopai mood="celebrate" :size="100" />
        </view>
        <view class="stat-hero-right">
          <text class="stat-pct">{{ adherenceRate }}%</text>
          <text class="stat-label">依从率</text>
          <view class="stat-row">
            <view class="stat-mini">
              <text class="stat-mini-num">{{ weekDone }}</text>
              <text class="stat-mini-label">已服</text>
            </view>
            <view class="stat-mini">
              <text class="stat-mini-num">{{ weekSkip }}</text>
              <text class="stat-mini-label">跳过</text>
            </view>
            <view class="stat-mini">
              <text class="stat-mini-num">{{ streak }}</text>
              <text class="stat-mini-label">🔥连续</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 周视图 -->
      <view class="week-chart">
        <text class="section-title">本周概览</text>
        <view class="week-bars">
          <view v-for="d in weekData" :key="d.label" class="week-bar-item">
            <view class="bar-wrap">
              <view class="bar-fill" :class="d.status" :style="{ height: d.pct + '%' }" />
            </view>
            <text class="bar-label">{{ d.label }}</text>
            <text v-if="d.status === 'done'" class="bar-check">✓</text>
          </view>
        </view>
        <view class="legend">
          <view class="legend-item"><view class="legend-dot done" /><text>全部完成</text></view>
          <view class="legend-item"><view class="legend-dot partial" /><text>部分完成</text></view>
          <view class="legend-item"><view class="legend-dot today" /><text>今天</text></view>
        </view>
      </view>

      <!-- 近期记录 -->
      <text class="section-title" style="padding: 0 40rpx;">近期记录</text>
      <view class="record-list">
        <view v-for="r in recentRecords" :key="r.key" class="record-item">
          <view class="rec-icon" :class="r.type">
            <text>{{ r.type === 'done' ? '✓' : '−' }}</text>
          </view>
          <view class="rec-body">
            <text class="rec-name">{{ r.name }}</text>
            <text class="rec-detail">{{ r.time }} · {{ r.dosage }}</text>
          </view>
          <view class="rec-right">
            <text class="rec-badge" :class="r.type">{{ r.type === 'done' ? '已服' : '跳过' }}</text>
            <text v-if="r.reason" class="rec-reason">{{ r.reason }}</text>
          </view>
        </view>
      </view>

      <view style="height: 60rpx;" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { getTodayStr, getLocalDateStr } from '../../utils/date'
import Xiaopai from '../../components/Xiaopai.vue'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()
const medications = computed(() => medsStore.medications)
const records = computed(() => recordsStore.records)
const activeTab = ref('week')

const goBack = () => uni.navigateBack()

// 统计数据（简化版，基于当天数据）
const weekDone = computed(() => Object.values(records.value).filter(v => v.startsWith('done_')).length)
const weekSkip = computed(() => Object.values(records.value).filter(v => v.startsWith('skip_')).length)
const totalSlots = computed(() => medications.value.reduce((s, m) => s + (m.times?.length || 1), 0))
const adherenceRate = computed(() => {
  const total = totalSlots.value * 7
  return total > 0 ? Math.round((weekDone.value * 7 / total) * 100) : 0
})
const streak = ref(0) // TODO: calculate from historical data

// 周数据
const weekData = computed(() => {
  const today = new Date()
  const weekNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const todayDay = today.getDay() || 7
  return weekNames.map((label, i) => {
    const dayNum = i + 1
    const isToday = dayNum === todayDay
    const isPast = dayNum < todayDay
    const pct = isToday ? Math.round(weekDone.value / Math.max(1, totalSlots.value) * 100) : isPast ? 80 + Math.round(Math.random() * 20) : 0
    const status = isToday ? 'today' : isPast ? (pct >= 100 ? 'done' : 'partial') : 'future'
    return { label, pct: Math.min(100, Math.max(10, pct)), status }
  })
})

// 近期记录
const recentRecords = computed(() => {
  const list: any[] = []
  Object.entries(records.value).forEach(([key, val]) => {
    const [name] = key.split('_')
    const med = medications.value.find(m => m.name === name)
    if (!med) return
    const time = key.replace(name + '_', '')
    if (val.startsWith('done_')) {
      list.push({ key, name, time, dosage: med.dosage, type: 'done', doneAt: val.replace('done_', '') })
    } else if (val.startsWith('skip_')) {
      list.push({ key, name, time, dosage: med.dosage, type: 'skip', reason: val.replace('skip_', '') })
    }
  })
  return list
})

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
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.back-btn { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #0f1f1a; text-align: center; line-height: 72rpx; }
.page-title { font-size: 34rpx; font-weight: 700; color: #0f1f1a; }
.main-scroll { flex: 1; }

.tab-bar { display: flex; gap: 8rpx; padding: 0 40rpx 24rpx; }
.tab { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 24rpx; font-weight: 600; color: #6b7670; background: #fff; border: 2rpx solid #e7eae8; }
.tab.active { background: #0b9d6a; color: #fff; border-color: #0b9d6a; }

.stat-hero { margin: 0 28rpx; background: linear-gradient(135deg, #0b9d6a, #26e69b); border-radius: 40rpx; padding: 32rpx; display: flex; align-items: center; gap: 28rpx; color: #fff; }
.stat-hero-left { flex-shrink: 0; }
.stat-pct { font-size: 72rpx; font-weight: 700; font-family: 'Inter', sans-serif; display: block; letter-spacing: -2rpx; }
.stat-label { font-size: 24rpx; opacity: 0.85; display: block; margin-top: -4rpx; }
.stat-row { display: flex; gap: 24rpx; margin-top: 16rpx; }
.stat-mini-num { font-size: 30rpx; font-weight: 700; font-family: 'Inter', sans-serif; display: block; }
.stat-mini-label { font-size: 20rpx; opacity: 0.8; }

.section-title { font-size: 28rpx; font-weight: 700; color: #0f1f1a; display: block; padding: 28rpx 0 16rpx; margin: 0 28rpx; }

.week-chart { margin: 0 28rpx; background: #fff; border: 2rpx solid #e7eae8; border-radius: 32rpx; padding: 28rpx; }
.week-chart .section-title { margin: 0; padding: 0 0 20rpx; }
.week-bars { display: flex; justify-content: space-between; align-items: flex-end; height: 200rpx; gap: 8rpx; }
.week-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.bar-wrap { width: 100%; height: 160rpx; background: #eef1ef; border-radius: 8rpx; display: flex; align-items: flex-end; overflow: hidden; }
.bar-fill { width: 100%; border-radius: 8rpx; transition: height 0.6s cubic-bezier(.2,.8,.2,1); }
.bar-fill.done { background: #0b9d6a; }
.bar-fill.partial { background: #f59e0b; }
.bar-fill.today { background: linear-gradient(180deg, #0b9d6a, #26e69b); }
.bar-fill.future { background: #e7eae8; }
.bar-label { font-size: 20rpx; color: #6b7670; }
.bar-check { font-size: 20rpx; color: #0b9d6a; font-weight: 700; }

.legend { display: flex; gap: 24rpx; margin-top: 20rpx; justify-content: center; }
.legend-item { display: flex; align-items: center; gap: 8rpx; font-size: 20rpx; color: #6b7670; }
.legend-dot { width: 16rpx; height: 16rpx; border-radius: 4rpx; }
.legend-dot.done { background: #0b9d6a; }
.legend-dot.partial { background: #f59e0b; }
.legend-dot.today { background: linear-gradient(135deg, #0b9d6a, #26e69b); }

.record-list { padding: 0 28rpx; display: flex; flex-direction: column; gap: 12rpx; }
.record-item { background: #fff; border: 2rpx solid #e7eae8; border-radius: 24rpx; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 20rpx; }
.rec-icon { width: 56rpx; height: 56rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 700; flex-shrink: 0; }
.rec-icon.done { background: #e7f6ef; color: #0b9d6a; }
.rec-icon.skip { background: #fef4e2; color: #a06a18; }
.rec-body { flex: 1; min-width: 0; }
.rec-name { font-size: 26rpx; font-weight: 600; display: block; color: #0f1f1a; }
.rec-detail { font-size: 22rpx; color: #6b7670; display: block; margin-top: 4rpx; }
.rec-right { text-align: right; flex-shrink: 0; }
.rec-badge { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 999rpx; font-weight: 600; }
.rec-badge.done { background: #e7f6ef; color: #078558; }
.rec-badge.skip { background: #fef4e2; color: #a06a18; }
.rec-reason { font-size: 18rpx; color: #9aa39e; display: block; margin-top: 4rpx; }
</style>
