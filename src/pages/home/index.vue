<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="greeting-row">
        <view class="avatar-wrap">
          <text class="avatar">{{ displayName?.charAt(0) || '你' }}</text>
        </view>
        <view class="greeting-info">
          <text class="greeting-name">{{ greeting }}，{{ displayName }}</text>
          <text class="greeting-sub">正在服用 {{ medications.length }} 种药 · PillPal</text>
        </view>
      </view>
    </view>

    <view class="content">
      <!-- 空状态 -->
      <view v-if="medications.length === 0" class="empty-state">
        <text class="empty-icon">💊</text>
        <text class="empty-title">还没有添加药品</text>
        <text class="empty-desc">添加你正在服用的药品，PillPal 帮你管理每日用药</text>
        <button class="btn-primary" @click="openAddMed">+ 添加第一种药品</button>
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
          <text class="section-link" @click="openAddMed">+ 添加药品</text>
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

        <!-- 药品卡片（按时间动态分组） -->
        <view v-for="time in timeSlots" :key="time">
          <view v-if="getSlotMeds(time).length > 0" class="time-section">
            <text class="time-period">{{ getTimeIcon(time) }} {{ getTimeLabel(time) }}</text>
            <view v-for="med in getSlotMeds(time)" :key="med.id + '_' + time" class="med-card" :class="getCardClass(med, time)">
              <view class="mc-left" @click="openEditMed(med)">
                <text class="mc-name">{{ med.name }} <text class="mc-edit-icon">✎</text></text>
                <text class="mc-detail">{{ med.dosage }} · {{ med.condition }}</text>
                <text class="mc-disease">{{ med.disease }}</text>
              </view>
              <!-- 已服用 -->
              <view v-if="isDone(med, time)" class="mc-right">
                <text class="mc-status-done">✓ {{ getDoneTime(med, time) }}</text>
                <text v-if="isToday" class="btn-undo" @click="handleUndo(med, time)">撤回</text>
              </view>
              <!-- 已跳过 -->
              <view v-else-if="isSkipped(med, time)" class="mc-right">
                <text class="mc-status-skip">已跳过</text>
                <text v-if="isToday" class="btn-undo" @click="handleUndo(med, time)">撤回</text>
              </view>
              <!-- 待服用（仅今天） -->
              <view v-else-if="isToday" class="mc-actions">
                <button class="btn-take" @click="handleTake(med, time)">✓ 已服用</button>
                <button class="btn-skip" @click="handleSkip(med, time)">跳过</button>
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
    <!-- 添加/编辑药品弹窗 -->
    <view v-if="showAddMed" class="modal-mask" @click.self="showAddMed = false">
      <view class="modal-box">
        <text class="modal-title">{{ editingMedId ? '编辑药品' : '💊 添加药品' }}</text>

        <view class="form-item">
          <text class="label">药品名称</text>
          <input class="ipt" :value="newMed.name" @input="newMed.name = $event.detail.value" placeholder="如：氨氯地平片" />
        </view>

        <view class="form-item">
          <text class="label">单次剂量</text>
          <input class="ipt" :value="newMed.dosage" @input="newMed.dosage = $event.detail.value" placeholder="如：5mg × 1片" />
        </view>

        <view class="form-item">
          <text class="label">什么时候吃</text>
          <view class="preset-row">
            <view v-for="p in timePresets" :key="p.time" class="preset-btn" :class="{ selected: newMed.times.includes(p.time) }" @click="togglePreset(p.time)">
              <text>{{ p.label }}</text>
              <text class="preset-time">{{ p.time }}</text>
            </view>
          </view>
          <view class="time-list">
            <view v-for="(t, i) in newMed.times" :key="i" class="time-tag">
              <text>{{ getPresetLabel(t) }}</text>
              <text class="time-del" @click="newMed.times.splice(i, 1)">✕</text>
            </view>
            <picker mode="time" @change="addNewMedTime">
              <view class="time-add">+ 自定义时间</view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="label">服用条件</text>
          <view class="picker-row">
            <view v-for="c in condOptions" :key="c" class="cond-btn" :class="{ selected: newMed.condition === c }" @click="newMed.condition = c">
              <text>{{ c }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="label">治什么病</text>
          <input class="ipt" :value="newMed.disease" @input="newMed.disease = $event.detail.value" placeholder="如：高血压" />
        </view>

        <view class="form-item">
          <text class="label">库存（片）</text>
          <input class="ipt" type="number" :value="String(newMed.stock)" @input="newMed.stock = Number($event.detail.value)" placeholder="30" />
        </view>

        <view class="modal-btns">
          <button class="btn-cancel" @click="showAddMed = false">取消</button>
          <button class="btn-confirm" @click="submitNewMed">{{ editingMedId ? '保存修改' : '确认添加' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { getGreeting, getTodayStr, getDateRange, getMedKey, normalizeTime, getHourFromTime, getTimeIcon, getTimeLabel, collectTimeSlots, TIME_PRESETS } from '../../utils/date'
import AgentReminder from '../../components/agent-reminder.vue'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()

const showAddMed = ref(false)
const editingMedId = ref('')
const condOptions = ['空腹', '餐后30分钟', '睡前', '无要求']
const timePresets = TIME_PRESETS
const newMed = reactive({ name: '', dosage: '', times: [] as string[], condition: '空腹', disease: '', stock: 30 })

const openAddMed = () => {
  Object.assign(newMed, { name: '', dosage: '', times: [], condition: '空腹', disease: '', stock: 30 })
  editingMedId.value = ''
  showAddMed.value = true
}

const openEditMed = (med: any) => {
  newMed.name = med.name || ''
  newMed.dosage = med.dosage || ''
  newMed.times = [...(med.times || [])]
  newMed.condition = med.condition || '空腹'
  newMed.disease = med.disease || ''
  newMed.stock = med.stock_count || 0
  editingMedId.value = med.id
  showAddMed.value = true
}

const togglePreset = (time: string) => {
  const idx = newMed.times.indexOf(time)
  if (idx >= 0) {
    newMed.times.splice(idx, 1)
  } else {
    newMed.times.push(time)
    newMed.times.sort()
  }
}

const getPresetLabel = (time: string) => {
  const p = TIME_PRESETS.find(x => x.time === time)
  return p ? p.label + ' ' + time : time
}

const addNewMedTime = (e: any) => {
  const t = e.detail.value
  if (t && !newMed.times.includes(t)) {
    newMed.times.push(t)
    newMed.times.sort()
  }
}

const submitNewMed = async () => {
  if (!newMed.name) { uni.showToast({ title: '请输入药品名称', icon: 'none' }); return }
  if (!newMed.dosage) { uni.showToast({ title: '请输入剂量', icon: 'none' }); return }
  if (newMed.times.length === 0) { uni.showToast({ title: '请添加服药时间', icon: 'none' }); return }

  const userId = userStore.user?.id
  if (!userId) return

  if (editingMedId.value) {
    // 编辑模式
    await medsStore.update(userId, editingMedId.value, {
      name: newMed.name,
      dosage: newMed.dosage,
      times: [...newMed.times],
      frequency: newMed.times.length,
      condition: newMed.condition,
      disease: newMed.disease,
      stock_count: newMed.stock,
      daily_usage: newMed.times.length
    })
    uni.showToast({ title: '修改成功', icon: 'success' })
  } else {
    // 添加模式 - 检查重复
    const dup = medications.value.find(m => m.name === newMed.name)
    if (dup) {
      uni.showToast({ title: '该药品已存在，请在首页点击药品名编辑', icon: 'none' })
      return
    }
    await medsStore.add(userId, {
      name: newMed.name,
      dosage: newMed.dosage,
      frequency: newMed.times.length,
      times: [...newMed.times],
      condition: newMed.condition,
      disease: newMed.disease,
      stock_count: newMed.stock,
      daily_usage: newMed.times.length,
      note: ''
    })
    uni.showToast({ title: '添加成功', icon: 'success' })
  }

  showAddMed.value = false
  editingMedId.value = ''
  Object.assign(newMed, { name: '', dosage: '', times: [], condition: '空腹', disease: '', stock: 30 })
}

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

// 动态时间段：从药品里收集所有时间点
const timeSlots = computed(() => collectTimeSlots(medications.value))
const totalMeds = computed(() => medications.value.reduce((sum, m) => sum + (m.times?.length || 1), 0))
const progressPct = computed(() => totalMeds.value > 0 ? Math.round(doneCount.value / totalMeds.value * 100) : 0)

const urgentMeds = computed(() => medications.value.filter(m => {
  const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
  return days <= 7
}))
const nextTimeLabel = computed(() => {
  if (doneCount.value >= totalMeds.value && totalMeds.value > 0) return '全部完成'
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60
  for (const t of timeSlots.value) {
    if (getHourFromTime(t) > currentHour) {
      // 检查这个时间有没有未打卡的药
      const hasPending = medications.value.some(m => {
        const times = m.times?.map((x: string) => normalizeTime(x)) || []
        if (!times.includes(t)) return false
        const key = getMedKey(m.name, t)
        return !activeRecords.value[key]
      })
      if (hasPending) return t
    }
  }
  return '待打卡'
})

// 获取某个时间段的药品
const getSlotMeds = (time: string) => medications.value.filter(m => {
  const times = m.times?.map((x: string) => normalizeTime(x)) || []
  return times.includes(time)
})
const getRecordKey = (med: any, time: string) => getMedKey(med.name, time)
const isDone = (med: any, time: string) => activeRecords.value[getRecordKey(med, time)]?.startsWith('done_')
const isSkipped = (med: any, time: string) => activeRecords.value[getRecordKey(med, time)]?.startsWith('skip_')
const getDoneTime = (med: any, time: string) => activeRecords.value[getRecordKey(med, time)]?.replace('done_', '') || ''
const getCardClass = (med: any, time: string) => isDone(med, time) ? 'done' : isSkipped(med, time) ? 'skipped' : ''

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

const handleTake = async (med: any, time: string) => {
  const userId = userStore.user?.id
  if (!userId) return
  await recordsStore.takeMed(userId, med.id, med.name, time)
  await medsStore.deductStock(userId, med.id)
  uni.showToast({ title: '服药已记录', icon: 'success' })
}

const handleSkip = async (med: any, time: string) => {
  const userId = userStore.user?.id
  if (!userId) return
  await recordsStore.skipMed(userId, med.id, med.name, time, '手动跳过')
  uni.showToast({ title: '已跳过', icon: 'none' })
}

const handleUndo = async (med: any, time: string) => {
  const userId = userStore.user?.id
  if (!userId) return
  await recordsStore.undoMed(userId, med.id, med.name, time)
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
.top-bar { background: linear-gradient(135deg, #0b9d6a 0%, #0abf7f 50%, #06d6a0 100%); color: #fff; padding: 36rpx 32rpx; border-radius: 0 0 36rpx 36rpx; box-shadow: 0 4rpx 20rpx rgba(11,157,106,0.3); }
.greeting-row { display: flex; align-items: center; gap: 20rpx; }
.avatar-wrap { width: 88rpx; height: 88rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; border: 3rpx solid rgba(255,255,255,0.3); }
.avatar { font-size: 38rpx; font-weight: 700; line-height: 88rpx; text-align: center; }
.greeting-info { flex: 1; }
.greeting-name { font-size: 34rpx; font-weight: 700; display: block; }
.greeting-sub { font-size: 22rpx; opacity: 0.8; display: block; margin-top: 6rpx; }
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
.mc-edit-icon { font-size: 24rpx; color: #9ca3af; margin-left: 8rpx; }
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

/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.modal-box { width: 90%; max-height: 85vh; background: #fff; border-radius: 24rpx; padding: 40rpx 32rpx; overflow-y: auto; }
.modal-title { font-size: 36rpx; font-weight: 700; display: block; text-align: center; margin-bottom: 32rpx; }
.form-item { margin-bottom: 24rpx; }
.label { font-size: 26rpx; font-weight: 600; color: #374151; display: block; margin-bottom: 10rpx; }
.ipt { width: 100%; padding: 20rpx 24rpx; font-size: 28rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb; border-radius: 16rpx; height: 80rpx; }
.picker-row { display: flex; gap: 12rpx; flex-wrap: wrap; }
.cond-btn { padding: 14rpx 24rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb; border-radius: 24rpx; font-size: 24rpx; }
.cond-btn.selected { background: #e6f7f0; border-color: #0b9d6a; color: #0b9d6a; font-weight: 600; }
.preset-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.preset-btn { padding: 12rpx 20rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb; border-radius: 20rpx; text-align: center; font-size: 24rpx; }
.preset-btn.selected { background: #e6f7f0; border-color: #0b9d6a; color: #0b9d6a; font-weight: 600; }
.preset-time { font-size: 20rpx; color: #9ca3af; display: block; margin-top: 2rpx; }
.preset-btn.selected .preset-time { color: #0b9d6a; }
.time-list { display: flex; flex-wrap: wrap; gap: 12rpx; align-items: center; }
.time-tag { display: flex; align-items: center; gap: 8rpx; padding: 14rpx 24rpx; background: #e6f7f0; border: 2rpx solid #0b9d6a; border-radius: 24rpx; font-size: 26rpx; color: #0b9d6a; font-weight: 600; }
.time-del { font-size: 24rpx; color: #9ca3af; margin-left: 4rpx; }
.time-add { padding: 14rpx 24rpx; background: #f4f6f8; border: 2rpx dashed #d1d5db; border-radius: 24rpx; font-size: 26rpx; color: #6b7280; }
.modal-btns { display: flex; gap: 16rpx; margin-top: 32rpx; }
.btn-cancel { flex: 1; padding: 22rpx; background: #f4f6f8; color: #6b7280; border: none; border-radius: 16rpx; font-size: 28rpx; }
.btn-confirm { flex: 2; padding: 22rpx; background: #0b9d6a; color: #fff; border: none; border-radius: 16rpx; font-size: 28rpx; font-weight: 600; }
</style>
