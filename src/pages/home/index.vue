<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="greeting-row">
        <view class="avatar">{{ displayName?.charAt(0) || '你' }}</view>
        <view>
          <text class="greeting-name">{{ greeting }}，{{ displayName }}</text>
          <text class="greeting-sub">正在服用 {{ medications.length }} 种药</text>
        </view>
      </view>
    </view>

    <view class="content">
      <!-- 空状态 -->
      <view v-if="medications.length === 0" class="empty-state">
        <text class="empty-icon">💊</text>
        <text class="empty-title">还没有添加药品</text>
        <text class="empty-desc">添加你正在服用的药品，PillPal 帮你管理每日用药</text>
        <button class="btn-primary" @click="showAddMed = true">+ 添加第一种药品</button>
      </view>

      <!-- 有药品时 -->
      <view v-else>
        <!-- 小派主动提醒 -->
        <agent-reminder :medications="medications" :records="activeRecords" />

        <!-- 概览 -->
        <view class="summary-cards">
          <view class="s-card">
            <text class="s-card-num">{{ doneCount }}/{{ totalMeds }}</text>
            <text class="s-card-label">今日已服</text>
          </view>
          <view class="s-card accent">
            <text class="s-card-num">{{ nextTimeLabel }}</text>
            <text class="s-card-label">下次提醒</text>
          </view>
          <view class="s-card">
            <text class="s-card-num">{{ medications.length }}</text>
            <text class="s-card-label">种药品</text>
          </view>
        </view>

        <!-- 风险提醒 -->
        <view v-for="med in urgentMeds" :key="med.id" class="alert-card">
          <text class="alert-icon">⚠</text>
          <view class="alert-body">
            <text class="alert-title">{{ med.name }}快吃完了</text>
            <text class="alert-desc">剩余 {{ med.stock_count }} 片</text>
          </view>
        </view>

        <!-- 时间轴 -->
        <view class="section-header">
          <text class="section-title">{{ isToday ? '今日用药' : selectedDate + ' 用药记录' }}</text>
          <text class="section-link" @click="showAddMed = true">+ 添加药品</text>
        </view>

        <!-- 日期选择器 -->
        <view class="date-nav">
          <view class="date-arrow" @click="shiftDates(-7)"><text>‹</text></view>
          <view class="date-row">
            <view v-for="d in dateRange" :key="d.dateStr"
              class="date-item" :class="{ active: selectedDate === d.dateStr }"
              :style="d.isFuture ? 'opacity:0.5' : ''"
              @click="switchDate(d.dateStr)">
              <text class="date-week">{{ d.label }}</text>
              <text class="date-day">{{ d.day }}</text>
            </view>
          </view>
          <view class="date-arrow" @click="shiftDates(7)"><text>›</text></view>
        </view>
        <!-- 日期跳转 -->
        <view class="date-jump">
          <picker mode="date" :value="selectedDate" @change="onDatePick">
            <text class="date-jump-btn">📅 选择日期</text>
          </picker>
        </view>

        <!-- 进度条 -->
        <view class="prog-bar-wrap">
          <view class="prog-bar"><view class="prog-fill" :style="{ width: progressPct + '%' }" /></view>
          <text class="prog-text">已完成 {{ doneCount }}/{{ totalMeds }} 次服药</text>
        </view>

        <!-- 药品卡片 -->
        <view v-for="[key, slot] in slotEntries" :key="key">
          <view v-if="getSlotMeds(key).length > 0" class="time-section">
            <text class="time-period">{{ slot.icon }} {{ slot.label }}</text>
            <view v-for="med in getSlotMeds(key)" :key="med.id + '_' + slot.hour" class="med-card" :class="getCardClass(med, slot)">
              <view class="mc-left">
                <text class="mc-name">{{ med.name }}</text>
                <text class="mc-detail">{{ med.dosage }} · {{ med.condition }}</text>
                <text class="mc-disease">{{ med.disease }}</text>
              </view>
              <!-- 已服用 -->
              <view v-if="isDone(med, slot)" class="mc-right">
                <text class="mc-status-done">✓ {{ getDoneTime(med, slot) }}</text>
                <text v-if="isToday" class="btn-undo" @click="handleUndo(med, slot)">撤回</text>
              </view>
              <!-- 已跳过 -->
              <view v-else-if="isSkipped(med, slot)" class="mc-right">
                <text class="mc-status-skip">已跳过</text>
                <text v-if="isToday" class="btn-undo" @click="handleUndo(med, slot)">撤回</text>
              </view>
              <!-- 待服用（仅今天） -->
              <view v-else-if="isToday" class="mc-actions">
                <button class="btn-take" @click="handleTake(med, slot)">✓ 已服用</button>
                <button class="btn-skip" @click="handleSkip(med, slot)">跳过</button>
              </view>
              <!-- 非今天未服用 -->
              <view v-else class="mc-right">
                <text class="mc-status-skip">未服用</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { getGreeting, getTodayStr, getDateRange, TIME_SLOTS, getMedKey } from '../../utils/date'
import AgentReminder from '../../components/agent-reminder.vue'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()

const showAddMed = ref(false)
const greeting = getGreeting()
const today = getTodayStr()
const selectedDate = ref(today)
const isToday = computed(() => selectedDate.value === today)
const dateCenter = ref(new Date())
const dateRange = computed(() => getDateRange(dateCenter.value))
const dateRecords = ref<Record<string, string>>({})
const loading = ref(false)

const displayName = computed(() => userStore.displayName)
const medications = computed(() => medsStore.medications)
const records = computed(() => recordsStore.records)
const doneCount = computed(() => {
  const r = isToday.value ? records.value : dateRecords.value
  return Object.values(r).filter(v => v.startsWith('done_')).length
})

const activeRecords = computed(() => isToday.value ? records.value : dateRecords.value)

const slotEntries = Object.entries(TIME_SLOTS)
const totalMeds = computed(() => medications.value.reduce((sum, m) => sum + (m.times?.length || 1), 0))
const progressPct = computed(() => totalMeds.value > 0 ? Math.round(doneCount.value / totalMeds.value * 100) : 0)

// 库存最紧张的药
const minDays = computed(() => {
  let min = 999
  medications.value.forEach(m => {
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
    if (days < min) min = days
  })
  return min
})
const minDrugName = computed(() => {
  let min = 999, name = ''
  medications.value.forEach(m => {
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
    if (days < min) { min = days; name = m.name }
  })
  return name
})
const urgentMeds = computed(() => medications.value.filter(m => {
  const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
  return days <= 7
}))
const nextTimeLabel = computed(() => {
  if (doneCount.value >= totalMeds.value && totalMeds.value > 0) return '全部完成'
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60
  for (const [key, slot] of slotEntries) {
    const hasMeds = medications.value.some(m => m.times?.includes(key))
    if (hasMeds && slot.hour > currentHour) return slot.time
  }
  return '待打卡'
})

const getSlotMeds = (key: string) => medications.value.filter(m => m.times?.includes(key))
const getRecordKey = (med: any, slot: any) => getMedKey(med.name, slot.hour)
const isDone = (med: any, slot: any) => activeRecords.value[getRecordKey(med, slot)]?.startsWith('done_')
const isSkipped = (med: any, slot: any) => activeRecords.value[getRecordKey(med, slot)]?.startsWith('skip_')
const getDoneTime = (med: any, slot: any) => activeRecords.value[getRecordKey(med, slot)]?.replace('done_', '') || ''
const getCardClass = (med: any, slot: any) => isDone(med, slot) ? 'done' : isSkipped(med, slot) ? 'skipped' : ''

const onDatePick = (e: any) => {
  const dateStr = e.detail.value
  selectedDate.value = dateStr
  dateCenter.value = new Date(dateStr + 'T12:00:00')
  switchDate(dateStr)
}

const shiftDates = (days: number) => {
  const d = new Date(dateCenter.value)
  d.setDate(d.getDate() + days)
  dateCenter.value = d
}

const switchDate = async (dateStr: string) => {
  selectedDate.value = dateStr
  if (dateStr === today) {
    dateRecords.value = {}
  } else {
    loading.value = true
    const userId = userStore.user?.id
    if (userId) {
      const r = await recordsStore.loadRecords(userId, dateStr)
      dateRecords.value = r
    }
    loading.value = false
  }
}

const handleTake = async (med: any, slot: any) => {
  const userId = userStore.user?.id
  if (!userId) return
  await recordsStore.takeMed(userId, med.id, med.name, slot.hour)
  await medsStore.deductStock(userId, med.id)
  uni.showToast({ title: '服药已记录', icon: 'success' })
}

const handleSkip = async (med: any, slot: any) => {
  const userId = userStore.user?.id
  if (!userId) return
  await recordsStore.skipMed(userId, med.id, med.name, slot.hour, '手动跳过')
  uni.showToast({ title: '已跳过', icon: 'none' })
}

const handleUndo = async (med: any, slot: any) => {
  const userId = userStore.user?.id
  if (!userId) return
  await recordsStore.undoMed(userId, med.id, med.name, slot.hour)
  await medsStore.restoreStock(userId, med.id)
  uni.showToast({ title: '已撤回', icon: 'none' })
}

onShow(async () => {
  // 确保 user 已初始化
  if (!userStore.user) {
    await userStore.init()
  }
  if (userStore.user) {
    await medsStore.fetchAll(userStore.user.id)
    await recordsStore.loadRecords(userStore.user.id)
  }
})
</script>

<style scoped>
.page { background: #f4f6f8; min-height: 100vh; }
.top-bar { background: linear-gradient(135deg, #0b9d6a, #0abf7f); color: #fff; padding: 32rpx; border-radius: 0 0 32rpx 32rpx; }
.greeting-row { display: flex; align-items: center; gap: 20rpx; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 36rpx; font-weight: 600; }
.greeting-name { font-size: 34rpx; font-weight: 600; display: block; }
.greeting-sub { font-size: 24rpx; opacity: 0.85; display: block; margin-top: 4rpx; }
.content { padding: 24rpx; }

.empty-state { text-align: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 128rpx; display: block; margin-bottom: 24rpx; }
.empty-title { font-size: 40rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }
.empty-desc { font-size: 28rpx; color: #6b7280; display: block; margin-bottom: 32rpx; }

.summary-cards { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.s-card { flex: 1; background: #fff; border-radius: 16rpx; padding: 24rpx; text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.s-card-num { font-size: 40rpx; font-weight: 700; color: #0b9d6a; display: block; }
.s-card.accent .s-card-num { color: #ff8f00; }
.s-card.warn .s-card-num { color: #e53935; }
.s-card-label { font-size: 22rpx; color: #6b7280; display: block; margin-top: 8rpx; }

.alert-card { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; background: #fff; border-radius: 16rpx; border-left: 6rpx solid #f57c00; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.alert-icon { font-size: 36rpx; }
.alert-title { font-size: 28rpx; font-weight: 600; display: block; }
.alert-desc { font-size: 24rpx; color: #6b7280; display: block; margin-top: 4rpx; }

.section-header { display: flex; justify-content: space-between; align-items: center; margin: 24rpx 0 16rpx; }
.section-title { font-size: 32rpx; font-weight: 600; }
.section-link { font-size: 26rpx; color: #0b9d6a; }

.prog-bar-wrap { margin-bottom: 24rpx; }
.prog-bar { height: 12rpx; background: #e5e7eb; border-radius: 6rpx; overflow: hidden; }
.prog-fill { height: 100%; background: linear-gradient(90deg, #0b9d6a, #0abf7f); border-radius: 6rpx; transition: width 0.3s; }
.prog-text { font-size: 24rpx; color: #6b7280; text-align: right; margin-top: 8rpx; display: block; }

/* 日期选择器 */
.date-nav { display: flex; align-items: center; gap: 0; margin-bottom: 16rpx; }
.date-arrow { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 700; color: #6b7280; flex-shrink: 0; background: #f4f6f8; border-radius: 50%; }
.date-arrow:active { background: #e6f7f0; color: #0b9d6a; }
.date-row { display: flex; flex: 1; justify-content: space-between; }
.date-item { display: flex; flex-direction: column; align-items: center; padding: 12rpx 0; border-radius: 16rpx; flex: 1; }
.date-item.active { background: #0b9d6a; color: #fff; }
.date-week { font-size: 22rpx; opacity: 0.7; }
.date-day { font-size: 32rpx; font-weight: 700; margin-top: 4rpx; }
.date-jump { text-align: center; margin-bottom: 20rpx; }
.date-jump-btn { font-size: 24rpx; color: #0b9d6a; }

.time-section { margin-bottom: 32rpx; }
.time-period { font-size: 28rpx; font-weight: 600; color: #6b7280; display: block; margin-bottom: 16rpx; }

.med-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); display: flex; align-items: center; gap: 16rpx; }
.med-card.done { opacity: 0.65; }
.med-card.skipped { opacity: 0.5; }
.mc-left { flex: 1; }
.mc-name { font-size: 30rpx; font-weight: 600; display: block; }
.mc-detail { font-size: 24rpx; color: #6b7280; display: block; margin-top: 6rpx; }
.mc-disease { font-size: 22rpx; color: #0b9d6a; background: #e6f7f0; padding: 4rpx 12rpx; border-radius: 6rpx; display: inline-block; margin-top: 8rpx; }

.mc-right { text-align: right; }
.mc-status-done { font-size: 26rpx; color: #0b9d6a; font-weight: 500; display: block; }
.mc-status-skip { font-size: 26rpx; color: #9ca3af; display: block; }
.btn-undo { font-size: 22rpx; color: #9ca3af; text-decoration: underline; display: block; margin-top: 8rpx; }

.mc-actions { display: flex; gap: 12rpx; }
.btn-take { padding: 16rpx 24rpx; background: #0b9d6a; color: #fff; border-radius: 12rpx; font-size: 26rpx; font-weight: 600; border: none; }
.btn-skip { padding: 16rpx 24rpx; background: #f4f6f8; color: #6b7280; border-radius: 12rpx; font-size: 26rpx; border: none; }
.btn-primary { width: 100%; padding: 24rpx; background: #0b9d6a; color: #fff; border-radius: 16rpx; font-size: 32rpx; font-weight: 600; border: none; }
</style>
