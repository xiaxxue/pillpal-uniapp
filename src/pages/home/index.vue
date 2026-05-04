<template>
  <view class="page" :class="{ 'elder-mode': elderMode }">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view>
        <text class="greeting-sub">{{ greeting }}，</text>
        <text class="greeting-name">{{ displayName }}</text>
      </view>
      <view class="top-right">
        <view class="avatar-btn" @click="goProfile">
          <text class="avatar-text">{{ displayName?.charAt(0) || '你' }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <view class="skel-hero" />
        <view class="skel-row"><view class="skel-block" /><view class="skel-block" /><view class="skel-block" /></view>
        <view class="skel-card" /><view class="skel-card" />
      </view>

      <!-- 空状态 -->
      <view v-else-if="medications.length === 0" class="empty-state">
        <text class="empty-icon">💊</text>
        <text class="empty-title">还没有添加药品</text>
        <text class="empty-desc">添加你正在服用的药品，PillPal 帮你管理每日用药</text>
        <button class="btn-green" @click="openAddMed">+ 添加第一种药品</button>
      </view>

      <!-- 长辈版首页 (Design B) -->
      <view v-else-if="elderMode && medications.length > 0" class="elder-home">
        <!-- 问候 + mascot -->
        <view class="eb-greeting">
          <xiaopai-elder mood="wave" :size="96" />
          <view class="eb-greeting-text">
            <text class="eb-hello">{{ displayName }}，{{ greeting }}</text>
            <text class="eb-subtitle">今天还需要服 <text class="eb-highlight">{{ totalMeds - doneCount }}</text> 次药</text>
          </view>
        </view>

        <!-- Hero: 下次服药 大卡片 -->
        <view v-if="nextMed" class="eb-hero">
          <view class="eb-hero-deco1" />
          <view class="eb-hero-deco2" />
          <view class="eb-hero-inner">
            <text class="eb-hero-label">下一次服药</text>
            <view class="eb-hero-time-row">
              <text class="eb-hero-time">{{ nextMed.nextTime }}</text>
              <text class="eb-hero-slot">· {{ getSlotName(nextMed.nextTime) }}</text>
            </view>
            <!-- 药品信息卡 -->
            <view class="eb-hero-med">
              <view class="eb-hero-pill">💊</view>
              <view class="eb-hero-med-info">
                <text class="eb-hero-med-name">{{ nextMed.name }}</text>
                <text class="eb-hero-med-detail">{{ nextMed.dosage }} · {{ nextMed.condition }}</text>
              </view>
            </view>
            <view class="eb-hero-btns">
              <button class="eb-btn-take" @click="takeNextMed">✓ 我已经服了</button>
              <button class="eb-btn-delay">推迟</button>
            </view>
          </view>
        </view>
        <view v-else class="eb-hero eb-hero-done">
          <xiaopai-elder mood="celebrate" :size="120" />
          <text class="eb-done-text">今天的药都吃完啦！</text>
          <text class="eb-done-sub">太棒了，继续保持</text>
        </view>

        <!-- 进度 + 连续打卡 双卡 -->
        <view class="eb-stats-row">
          <view class="eb-stat-card">
            <text class="eb-stat-label">今日进度</text>
            <view class="eb-stat-num-row">
              <text class="eb-stat-num green">{{ doneCount }}</text>
              <text class="eb-stat-total"> / {{ totalMeds }}</text>
              <text class="eb-stat-unit">次</text>
            </view>
            <view class="eb-prog-bar"><view class="eb-prog-fill" :style="{ width: (totalMeds > 0 ? doneCount/totalMeds*100 : 0) + '%' }" /></view>
          </view>
          <view class="eb-stat-card">
            <text class="eb-stat-label">🔥 连续坚持</text>
            <view class="eb-stat-num-row">
              <text class="eb-stat-num warm">--</text>
              <text class="eb-stat-unit">天</text>
            </view>
            <text class="eb-stat-cheer">太棒啦，继续保持！</text>
          </view>
        </view>

        <!-- 库存预警 -->
        <view v-if="lowStockMed" class="eb-stock-alert" @click="goStock">
          <text class="eb-alert-icon">⚠</text>
          <view class="eb-alert-body">
            <text class="eb-alert-title">药快吃完啦</text>
            <text class="eb-alert-sub">{{ lowStockMed.name }} 剩 {{ lowStockMed.stock_count }} 片</text>
          </view>
          <text class="eb-alert-btn">去补药</text>
        </view>

        <!-- 今日服药表 -->
        <view class="eb-section-header">
          <text class="eb-section-title">今日服药表</text>
          <text class="eb-section-add" @click="openAddMed">+ 添加</text>
        </view>

        <view class="eb-med-groups">
          <view v-for="time in timeSlots" :key="time">
            <view v-if="getSlotMeds(time).length > 0" class="eb-med-group">
              <view class="eb-group-header">
                <text class="eb-group-time">{{ time }}</text>
                <text class="eb-group-label">{{ getSlotName(time) }}</text>
              </view>
              <view v-for="med in getSlotMeds(time)" :key="med.id + '_' + time" class="eb-med-row" :class="{ done: isDone(med, time) }">
                <view class="eb-med-pill" :class="{ done: isDone(med, time) }">💊</view>
                <view class="eb-med-body">
                  <text class="eb-med-name">{{ med.name }}</text>
                  <text class="eb-med-detail">{{ med.dosage }} · {{ med.condition }}</text>
                </view>
                <view v-if="isDone(med, time)" class="eb-med-done-mark">
                  <text class="eb-checkmark">✓</text>
                  <text class="eb-done-label">已服</text>
                </view>
                <button v-else-if="isToday" class="eb-med-take-btn" @click="handleTake(med, time)">已服</button>
              </view>
            </view>
          </view>
        </view>

        <view style="height: 180rpx;" />
      </view>

      <view v-else-if="medications.length > 0">
        <!-- 日期条 -->
        <view class="date-strip">
          <view v-for="d in dateRange" :key="d.dateStr"
            class="date-item" :class="{ active: selectedDate === d.dateStr, today: d.diff === 0 && selectedDate !== d.dateStr }"
            :style="d.isFuture ? 'opacity:0.5' : ''"
            @click="switchDate(d.dateStr)">
            <text class="date-week">{{ d.label }}</text>
            <text class="date-day">{{ d.day }}</text>
          </view>
        </view>

        <!-- Hero 卡片 -->
        <view class="hero-card">
          <view class="hero-deco" />
          <view class="hero-inner">
            <!-- 进度圆环 -->
            <view class="hero-ring">
              <progress-ring :value="doneCount" :total="totalMeds" :size="264" />
              <view class="ring-label">
                <text class="ring-num">{{ doneCount }}<text class="ring-total">/{{ totalMeds }}</text></text>
                <text class="ring-sub">{{ isToday ? '今日已服' : '当日完成' }}</text>
              </view>
            </view>
            <!-- 下次服药 -->
            <view class="hero-info">
              <template v-if="nextMed && isToday">
                <text class="hero-next-label">NEXT · 下次服药</text>
                <text class="hero-next-time">{{ nextMed.nextTime }}</text>
                <text class="hero-next-name">{{ nextMed.name }}</text>
                <text class="hero-next-detail">{{ nextMed.dosage }} · {{ nextMed.condition }}</text>
                <view class="hero-countdown" :class="{ warn: nextMed.minutesLeft < 30 }">
                  <view class="countdown-dot" />
                  <text>{{ nextMed.minutesLeft > 0 ? '还有 ' + formatCountdown(nextMed.minutesLeft) : '现在该吃了' }}</text>
                </view>
              </template>
              <template v-else-if="doneCount >= totalMeds && totalMeds > 0">
                <text class="hero-done-text">全部完成 🎉</text>
                <text class="hero-done-sub">{{ isToday ? '今日没有待服药品' : '当日已全部完成' }}</text>
              </template>
              <template v-else>
                <text class="hero-next-label">{{ isToday ? '待服药品' : '当日记录' }}</text>
                <text class="hero-next-name">{{ totalMeds - doneCount }} 项待服</text>
              </template>
            </view>
          </view>
        </view>

        <!-- 库存预警 -->
        <view v-if="lowStockMed && isToday" class="stock-alert" @click="goStock">
          <view class="alert-icon-wrap">
            <text class="alert-icon-text">⚠</text>
          </view>
          <view class="alert-body">
            <text class="alert-title">{{ lowStockMed.name }} 仅剩 {{ lowStockMed.stock_count }} 片</text>
            <text class="alert-sub">预计 {{ Math.floor(lowStockMed.stock_count / (lowStockMed.daily_usage || 1)) }} 天后用完</text>
          </view>
          <text class="alert-action">去补货 →</text>
        </view>

        <!-- 时间轴标题 -->
        <view class="section-header">
          <text class="section-title">{{ isToday ? '今日用药' : selectedDate + ' 用药记录' }}</text>
          <text v-if="isToday && totalMeds > doneCount" class="section-meta">剩 {{ totalMeds - doneCount }} 项待服</text>
        </view>

        <!-- 非今天提示 -->
        <view v-if="!isToday" class="past-hint">
          <text class="past-icon">{{ selectedDate < today ? '📋' : '📅' }}</text>
          <text class="past-title">{{ selectedDate < today ? '查看历史记录' : '未来的计划已生成' }}</text>
          <button class="btn-back-today" @click="switchDate(today)">回到今日</button>
        </view>

        <!-- 时间轴药品卡片 -->
        <view v-for="(time, tIdx) in timeSlots" :key="time">
          <view v-if="getSlotMeds(time).length > 0" class="slot-section">
            <!-- 时间轴线 + 节点 -->
            <view class="slot-header">
              <view class="timeline-dot" />
              <text class="slot-label">{{ getSlotName(time) }}</text>
              <text class="slot-time">{{ time }}</text>
              <text class="slot-count">{{ getSlotDoneCount(time) }}/{{ getSlotMeds(time).length }}</text>
            </view>
            <view class="slot-cards" :class="{ 'has-line': tIdx < timeSlots.length - 1 }">
              <view v-for="med in getSlotMeds(time)" :key="med.id + '_' + time"
                class="med-card" :class="{ done: isDone(med, time), skip: isSkipped(med, time) }"
                @click="openDetail(med)">
                <!-- 图标 -->
                <view class="mc-icon" :class="{ 'mc-done': isDone(med, time), 'mc-skip': isSkipped(med, time) }">
                  <text v-if="isDone(med, time)" class="mc-icon-text">✓</text>
                  <text v-else-if="isSkipped(med, time)" class="mc-icon-text">✕</text>
                  <text v-else class="mc-icon-pill">💊</text>
                </view>
                <!-- 信息 -->
                <view class="mc-body">
                  <view class="mc-name-row">
                    <text class="mc-name">{{ med.name }}</text>
                    <text class="mc-dosage">· {{ med.dosage }}</text>
                  </view>
                  <view class="mc-tags">
                    <text class="mc-disease-tag">{{ med.disease }}</text>
                    <text class="mc-condition">{{ med.condition }}</text>
                  </view>
                </view>
                <!-- 操作 -->
                <view class="mc-action">
                  <text class="mc-time">{{ time }}</text>
                  <view v-if="isDone(med, time)" class="mc-done-info">
                    <text class="mc-done-text" @click.stop="handleUndo(med, time)">已服 {{ getDoneTime(med, time) }} · 撤回</text>
                  </view>
                  <view v-else-if="isSkipped(med, time)" class="mc-skip-info">
                    <text class="mc-skip-text" @click.stop="handleUndo(med, time)">已跳过 · 撤回</text>
                  </view>
                  <view v-else-if="isToday" class="mc-btns">
                    <text class="btn-skip" @click.stop="openSkip(med, time)">跳过</text>
                    <view style="position:relative;display:inline-flex;">
                      <text class="btn-take" @click.stop="handleTake(med, time)">记录</text>
                      <confetti :trigger="confettiKey" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view style="height: 160rpx;" />
      </view>
    </scroll-view>

    <!-- 自定义 TabBar -->
    <custom-tab-bar current="home" @add="showQuickAdd = true" />
    <sheet v-if="showQuickAdd" title="快捷操作" subtitle="选择你想做的事" @close="showQuickAdd = false">
      <view class="quick-actions">
        <view class="qa-item" @click="showQuickAdd = false; openAddMed()">
          <view class="qa-icon" style="background:#e7f6ef;"><text>💊</text></view>
          <text class="qa-label">添加药品</text>
        </view>
        <view class="qa-item" @click="showQuickAdd = false; goStock()">
          <view class="qa-icon" style="background:#fef4e2;"><text>📦</text></view>
          <text class="qa-label">补货库存</text>
        </view>
        <view class="qa-item" @click="showQuickAdd = false; goAssistant()">
          <view class="qa-icon" style="background:#e3f2fd;"><text>🤖</text></view>
          <text class="qa-label">问小派</text>
        </view>
        <view class="qa-item" @click="showQuickAdd = false;">
          <view class="qa-icon" style="background:#f0f8f4;"><text>📋</text></view>
          <text class="qa-label">补打卡</text>
        </view>
        <view class="qa-item" @click="showQuickAdd = false;">
          <view class="qa-icon" style="background:#fff3e0;"><text>📝</text></view>
          <text class="qa-label">备注</text>
        </view>
        <view class="qa-item" @click="showQuickAdd = false;">
          <view class="qa-icon" style="background:#fce4ec;"><text>📷</text></view>
          <text class="qa-label">扫药盒</text>
        </view>
      </view>
    </sheet>

    <!-- 添加/编辑药品弹窗 -->
    <sheet v-if="showAddMed" :title="editingMedId ? '编辑药品' : '添加药品'" subtitle="填写药品基本信息和提醒时间" @close="showAddMed = false">
      <view class="form-col">
        <view class="field">
          <text class="field-label">药品名称 <text class="field-req">*</text></text>
          <input class="field-input" :value="newMed.name" @input="newMed.name = $event.detail.value" placeholder="如：氨氯地平片" />
        </view>
        <view class="field">
          <text class="field-label">单次剂量 <text class="field-req">*</text></text>
          <input class="field-input" :value="newMed.dosage" @input="newMed.dosage = $event.detail.value" placeholder="如：5mg × 1片" />
        </view>
        <view class="field">
          <text class="field-label">什么时候吃</text>
          <view class="preset-row">
            <view v-for="p in timePresets" :key="p.time" class="preset-btn" :class="{ selected: newMed.times.includes(p.time) }" @click="togglePreset(p.time)">
              <text class="preset-label">{{ p.label }}</text>
              <text class="preset-time">{{ p.time }}</text>
            </view>
          </view>
          <view class="time-chips">
            <view v-for="(t, i) in newMed.times" :key="i" class="time-chip">
              <text>{{ getPresetLabel(t) }}</text>
              <text class="chip-del" @click="newMed.times.splice(i, 1)">✕</text>
            </view>
            <picker mode="time" @change="addNewMedTime">
              <view class="time-add-btn">+ 自定义</view>
            </picker>
          </view>
        </view>
        <view class="field">
          <text class="field-label">服用条件</text>
          <view class="cond-row">
            <view v-for="c in condOptions" :key="c" class="cond-btn" :class="{ selected: newMed.condition === c }" @click="newMed.condition = c">
              <text>{{ c }}</text>
            </view>
          </view>
        </view>
        <view class="field-row">
          <view class="field" style="flex:1">
            <text class="field-label">治什么</text>
            <input class="field-input" :value="newMed.disease" @input="newMed.disease = $event.detail.value" placeholder="如：高血压" />
          </view>
          <view class="field" style="flex:1">
            <text class="field-label">库存（片）</text>
            <input class="field-input" type="number" :value="String(newMed.stock)" @input="newMed.stock = Number($event.detail.value)" placeholder="30" />
          </view>
        </view>
      </view>
      <view class="sheet-btns">
        <button class="btn-ghost" @click="showAddMed = false">取消</button>
        <button class="btn-green" @click="submitNewMed">{{ editingMedId ? '保存修改' : '确认添加' }}</button>
      </view>
    </sheet>

    <!-- 药品详情弹窗 -->
    <sheet v-if="detailMed" :title="detailMed.name" :subtitle="detailMed.dosage + ' · ' + detailMed.disease" @close="detailMed = null">
      <view class="detail-grid">
        <view class="detail-item">
          <text class="detail-label">服药时间</text>
          <text class="detail-value">{{ detailMed.times?.join('、') }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">服用条件</text>
          <text class="detail-value">{{ detailMed.condition }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">库存</text>
          <text class="detail-value">{{ detailMed.stock_count }} 片</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">日用量</text>
          <text class="detail-value">{{ detailMed.daily_usage || 1 }} 次/天</text>
        </view>
      </view>
      <view class="detail-tip">
        <text class="detail-tip-title">💊 用药小提示</text>
        <text class="detail-tip-text">{{ getMedTip(detailMed) }}</text>
      </view>
      <view class="sheet-btns">
        <button class="btn-ghost" @click="openEditFromDetail">编辑</button>
        <button class="btn-danger" @click="confirmDelete">删除</button>
      </view>
    </sheet>

    <!-- 跳过原因弹窗 -->
    <sheet v-if="skipTarget" :title="'跳过 ' + skipTarget.med.name" subtitle="选个原因，帮助小派学习你的习惯" @close="skipTarget = null">
      <view class="skip-reasons">
        <view v-for="r in skipReasons" :key="r.text" class="skip-reason" @click="confirmSkip(r.text)">
          <text class="skip-emoji">{{ r.icon }}</text>
          <text class="skip-text">{{ r.text }}</text>
        </view>
      </view>
    </sheet>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { getGreeting, getTodayStr, getDateRange, getMedKey, normalizeTime, getHourFromTime, getTimeIcon, getTimeLabel, collectTimeSlots, TIME_PRESETS } from '../../utils/date'
import ProgressRing from '../../components/ProgressRing.vue'
import Sheet from '../../components/Sheet.vue'
import Confetti from '../../components/Confetti.vue'
import XiaopaiElder from '../../components/Xiaopai.vue'
import CustomTabBar from '../../components/CustomTabBar.vue'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()
const elderMode = computed(() => userStore.elderMode)

// ── 基础数据 ──
const todayDisplay = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日 ${'周日周一周二周三周四周五周六'.slice(d.getDay() * 2, d.getDay() * 2 + 2)}`
})
const greeting = getGreeting()
const today = getTodayStr()
const selectedDate = ref(today)
const isToday = computed(() => selectedDate.value === today)
const dateCenter = ref(new Date())
const dateRange = computed(() => getDateRange(dateCenter.value))
const dateRecords = ref<Record<string, string>>({})

const displayName = computed(() => userStore.displayName)
const medications = computed(() => medsStore.medications)
const records = computed(() => recordsStore.records)
const activeRecords = computed(() => isToday.value ? records.value : dateRecords.value)

const timeSlots = computed(() => collectTimeSlots(medications.value))
const totalMeds = computed(() => medications.value.reduce((sum, m) => sum + (m.times?.length || 1), 0))
const doneCount = computed(() => {
  const r = isToday.value ? records.value : dateRecords.value
  return Object.values(r).filter(v => v.startsWith('done_')).length
})

// ── 下次服药倒计时 ──
const nextMed = computed(() => {
  if (!isToday.value) return null
  const now = new Date()
  const currentMin = now.getHours() * 60 + now.getMinutes()
  let best: any = null
  for (const med of medications.value) {
    if (!med.times) continue
    for (const t of med.times) {
      const time = normalizeTime(t)
      const key = getMedKey(med.name, time)
      if (activeRecords.value[key]) continue
      const [h, m] = time.split(':').map(Number)
      const medMin = h * 60 + m
      const diff = medMin - currentMin
      if (diff > 0 && (!best || diff < best.minutesLeft)) {
        best = { name: med.name, dosage: med.dosage, condition: med.condition, nextTime: time, minutesLeft: diff }
      }
    }
  }
  return best
})

const formatCountdown = (mins: number) => {
  if (mins < 60) return `${mins} 分钟`
  return `${Math.floor(mins / 60)} 小时 ${mins % 60} 分`
}

// ── 库存预警 ──
const lowStockMed = computed(() => {
  return medications.value
    .filter(m => { const d = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0; return d <= 7 })
    .sort((a, b) => a.stock_count - b.stock_count)[0] || null
})

// ── 时间轴辅助 ──
const getSlotMeds = (time: string) => medications.value.filter(m => {
  const times = m.times?.map((x: string) => normalizeTime(x)) || []
  return times.includes(time)
})
const getSlotName = (time: string) => {
  const p = TIME_PRESETS.find(x => x.time === time)
  if (p) return p.label
  const hour = getHourFromTime(time)
  if (hour < 6) return '凌晨'
  if (hour < 9) return '早晨'
  if (hour < 11) return '上午'
  if (hour < 14) return '中午'
  if (hour < 17) return '下午'
  if (hour < 20) return '傍晚'
  return '夜间'
}
const getSlotDoneCount = (time: string) => {
  return getSlotMeds(time).filter(m => isDone(m, time)).length
}
const getRecordKey = (med: any, time: string) => getMedKey(med.name, time)
const isDone = (med: any, time: string) => activeRecords.value[getRecordKey(med, time)]?.startsWith('done_')
const isSkipped = (med: any, time: string) => activeRecords.value[getRecordKey(med, time)]?.startsWith('skip_')
const getDoneTime = (med: any, time: string) => activeRecords.value[getRecordKey(med, time)]?.replace('done_', '') || ''

// ── 打卡操作 ──
const confettiKey = ref(0)
const handleTake = async (med: any, time: string) => {
  const userId = userStore.user?.id
  if (!userId) return
  confettiKey.value++
  await recordsStore.takeMed(userId, med.id, med.name, time)
  await medsStore.deductStock(userId, med.id)
  uni.showToast({ title: '已记录 · ' + med.name, icon: 'none' })
}
// ── 跳过原因 ──
const skipTarget = ref<any>(null)
const skipReasons = [
  { icon: '🚶', text: '外出忘带' },
  { icon: '🤢', text: '胃不舒服' },
  { icon: '😴', text: '睡过头' },
  { icon: '🙅', text: '暂时不需要' },
  { icon: '💭', text: '其他原因' },
]
const openSkip = (med: any, time: string) => { skipTarget.value = { med, time } }
const confirmSkip = async (reason: string) => {
  const { med, time } = skipTarget.value
  const userId = userStore.user?.id
  if (!userId) return
  await recordsStore.skipMed(userId, med.id, med.name, time, reason)
  uni.showToast({ title: '已跳过 · ' + reason, icon: 'none' })
  skipTarget.value = null
}
const handleUndo = async (med: any, time: string) => {
  const userId = userStore.user?.id
  if (!userId) return
  await recordsStore.undoMed(userId, med.id, med.name, time)
  await medsStore.restoreStock(userId, med.id)
  uni.showToast({ title: '已撤回', icon: 'none' })
}

// ── 日期切换 ──
const switchDate = async (dateStr: string) => {
  selectedDate.value = dateStr
  dateCenter.value = new Date(dateStr + 'T12:00:00')
  if (dateStr === today) {
    dateRecords.value = {}
  } else {
    const userId = userStore.user?.id
    if (userId) {
      const r = await recordsStore.loadRecords(userId, dateStr)
      dateRecords.value = r
    }
  }
}

// ── 添加/编辑药品 ──
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
  if (idx >= 0) newMed.times.splice(idx, 1)
  else { newMed.times.push(time); newMed.times.sort() }
}
const getPresetLabel = (time: string) => {
  const p = TIME_PRESETS.find(x => x.time === time)
  return p ? p.label + ' ' + time : time
}
const addNewMedTime = (e: any) => {
  const t = e.detail.value
  if (t && !newMed.times.includes(t)) { newMed.times.push(t); newMed.times.sort() }
}
const submitNewMed = async () => {
  if (!newMed.name) { uni.showToast({ title: '请输入药品名称', icon: 'none' }); return }
  if (!newMed.dosage) { uni.showToast({ title: '请输入剂量', icon: 'none' }); return }
  if (newMed.times.length === 0) { uni.showToast({ title: '请添加服药时间', icon: 'none' }); return }
  const userId = userStore.user?.id
  if (!userId) return

  if (editingMedId.value) {
    await medsStore.update(userId, editingMedId.value, {
      name: newMed.name, dosage: newMed.dosage, times: [...newMed.times],
      frequency: newMed.times.length, condition: newMed.condition,
      disease: newMed.disease, stock_count: newMed.stock, daily_usage: newMed.times.length
    })
    uni.showToast({ title: '修改成功', icon: 'success' })
  } else {
    const dup = medications.value.find(m => m.name === newMed.name)
    if (dup) { uni.showToast({ title: '该药品已存在，请点击编辑', icon: 'none' }); return }
    await medsStore.add(userId, {
      name: newMed.name, dosage: newMed.dosage, frequency: newMed.times.length,
      times: [...newMed.times], condition: newMed.condition, disease: newMed.disease,
      stock_count: newMed.stock, daily_usage: newMed.times.length, note: ''
    })
    uni.showToast({ title: '已添加「' + newMed.name + '」', icon: 'success' })
  }
  showAddMed.value = false
  editingMedId.value = ''
  Object.assign(newMed, { name: '', dosage: '', times: [], condition: '空腹', disease: '', stock: 30 })
}

// ── 药品详情 ──
const detailMed = ref<any>(null)
const openDetail = (med: any) => { detailMed.value = med }
const openEditFromDetail = () => {
  const med = detailMed.value
  detailMed.value = null
  openEditMed(med)
}
const confirmDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除「' + detailMed.value.name + '」？该药品的所有提醒和记录将被移除。',
    success: async (res) => {
      if (res.confirm) {
        await medsStore.remove(userStore.user.id, detailMed.value.id)
        detailMed.value = null
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    }
  })
}
const getMedTip = (med: any) => {
  if (med.disease === '高血压') return '建议每天同一时间服用，避免漏服。监测血压并记录。'
  if (med.disease === '2型糖尿病' || med.disease === '糖尿病') return '餐后服用可减少胃肠道反应。注意监测血糖。'
  if (med.disease === '高血脂') return '睡前服用效果最佳。避免与西柚汁同服。'
  return '请遵医嘱按时服用。'
}

// ── 长辈模式：打卡下一个药 ──
const takeNextMed = async () => {
  if (!nextMed.value) return
  const med = medications.value.find(m => m.name === nextMed.value.name)
  if (!med) return
  await handleTake(med, nextMed.value.nextTime)
}

// ── 快捷操作 ──
const showQuickAdd = ref(false)

// ── 导航 ──
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
const goStock = () => uni.switchTab({ url: '/pages/stock/index' })
const goAssistant = () => uni.switchTab({ url: '/pages/assistant/index' })

// ── 初始化 ──
const loading = ref(true)
onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) {
    await medsStore.fetchAll(userStore.user.id)
    await recordsStore.loadRecords(userStore.user.id)
  }
  loading.value = false
})
</script>

<style lang="scss" scoped>
.page { background: #f6f8f7; min-height: 100vh; display: flex; flex-direction: column; }

/* ── 顶栏 ── */
.top-bar { padding: 24rpx 40rpx 16rpx; display: flex; align-items: center; justify-content: space-between; }
.greeting-sub { font-size: 26rpx; color: #6b7670; font-weight: 500; display: block; }
.greeting-name { font-size: 52rpx; font-weight: 700; color: #0f1f1a; display: block; margin-top: 4rpx; letter-spacing: -1rpx; }
.top-right { display: flex; gap: 20rpx; align-items: center; }
.avatar-btn { width: 80rpx; height: 80rpx; border-radius: 50%; background: #e7f6ef; display: flex; align-items: center; justify-content: center; }
.avatar-text { font-size: 30rpx; font-weight: 700; color: #078558; }

.main-scroll { flex: 1; }

/* ── 长辈版首页 (Design B) ── */
.elder-home { padding: 0 40rpx; background: #faf6ef; }

.eb-greeting { display: flex; align-items: center; gap: 28rpx; padding: 20rpx 0; }
.eb-greeting-text { flex: 1; }
.eb-hello { font-size: 36rpx; color: #5a6058; font-weight: 500; display: block; }
.eb-subtitle { font-size: 48rpx; font-weight: 700; color: #22241f; display: block; margin-top: 8rpx; line-height: 1.25; }
.eb-highlight { color: #0b9d6a; }

/* Hero 大卡片 */
.eb-hero {
  background: #0b9d6a; border-radius: 56rpx; padding: 44rpx; color: #fff;
  margin-bottom: 32rpx; position: relative; overflow: hidden;
}
.eb-hero-deco1 { position: absolute; top: -80rpx; right: -80rpx; width: 320rpx; height: 320rpx; border-radius: 50%; background: rgba(255,255,255,0.08); }
.eb-hero-deco2 { position: absolute; bottom: -120rpx; left: -40rpx; width: 260rpx; height: 260rpx; border-radius: 50%; background: rgba(255,255,255,0.05); }
.eb-hero-inner { position: relative; }
.eb-hero-label { font-size: 28rpx; font-weight: 500; opacity: 0.85; display: block; }
.eb-hero-time-row { display: flex; align-items: baseline; gap: 16rpx; margin-top: 12rpx; }
.eb-hero-time { font-size: 112rpx; font-weight: 700; font-family: 'Inter', sans-serif; line-height: 1; letter-spacing: -4rpx; }
.eb-hero-slot { font-size: 32rpx; opacity: 0.85; }

.eb-hero-med {
  margin-top: 36rpx; padding: 28rpx 32rpx;
  background: rgba(255,255,255,0.18); border-radius: 36rpx;
  display: flex; align-items: center; gap: 28rpx;
}
.eb-hero-pill { width: 96rpx; height: 96rpx; border-radius: 28rpx; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 44rpx; flex-shrink: 0; }
.eb-hero-med-name { font-size: 38rpx; font-weight: 700; display: block; }
.eb-hero-med-detail { font-size: 28rpx; opacity: 0.9; display: block; margin-top: 4rpx; }

.eb-hero-btns { margin-top: 28rpx; display: flex; gap: 20rpx; }
.eb-btn-take {
  flex: 1; padding: 32rpx 0; background: #fff; color: #075f40;
  font-size: 34rpx; font-weight: 700; border: none; border-radius: 32rpx;
}
.eb-btn-delay {
  padding: 32rpx 36rpx; background: rgba(255,255,255,0.22); color: #fff;
  font-size: 28rpx; font-weight: 600; border: none; border-radius: 32rpx;
}

.eb-hero-done { display: flex; flex-direction: column; align-items: center; padding: 60rpx; }
.eb-done-text { font-size: 44rpx; font-weight: 700; margin-top: 20rpx; }
.eb-done-sub { font-size: 28rpx; opacity: 0.8; margin-top: 8rpx; }

/* 双统计卡 */
.eb-stats-row { display: flex; gap: 24rpx; margin-bottom: 28rpx; }
.eb-stat-card {
  flex: 1; background: #fffdf8; border: 2rpx solid #ece6d8;
  border-radius: 40rpx; padding: 32rpx;
}
.eb-stat-label { font-size: 26rpx; color: #5a6058; font-weight: 500; display: block; }
.eb-stat-num-row { display: flex; align-items: baseline; margin-top: 12rpx; }
.eb-stat-num { font-family: 'Inter', sans-serif; font-weight: 700; }
.eb-stat-num.green { font-size: 56rpx; color: #0b9d6a; }
.eb-stat-num.warm { font-size: 64rpx; color: #c75a2a; }
.eb-stat-total { font-size: 36rpx; color: #8a9088; font-weight: 500; }
.eb-stat-unit { font-size: 28rpx; color: #5a6058; font-weight: 500; margin-left: 8rpx; }
.eb-stat-cheer { font-size: 24rpx; color: #5a6058; display: block; margin-top: 12rpx; }
.eb-prog-bar { margin-top: 20rpx; height: 16rpx; background: #eee5d3; border-radius: 8rpx; overflow: hidden; }
.eb-prog-fill { height: 100%; background: #0b9d6a; border-radius: 8rpx; transition: width 0.6s; }

/* 库存预警 */
.eb-stock-alert {
  padding: 28rpx 32rpx; background: #fbe9d9; border-radius: 36rpx;
  display: flex; align-items: center; gap: 24rpx; margin-bottom: 28rpx;
}
.eb-alert-icon { font-size: 40rpx; }
.eb-alert-body { flex: 1; }
.eb-alert-title { font-size: 30rpx; font-weight: 700; color: #7a3a14; display: block; }
.eb-alert-sub { font-size: 26rpx; color: #945227; display: block; margin-top: 4rpx; }
.eb-alert-btn { padding: 20rpx 32rpx; border-radius: 999rpx; background: #c75a2a; color: #fff; font-size: 26rpx; font-weight: 600; }

/* 服药表 */
.eb-section-header { display: flex; justify-content: space-between; align-items: baseline; padding: 8rpx 0 16rpx; }
.eb-section-title { font-size: 42rpx; font-weight: 700; color: #22241f; }
.eb-section-add { font-size: 28rpx; color: #0b9d6a; font-weight: 600; }

.eb-med-group {
  background: #fffdf8; border: 2rpx solid #ece6d8;
  border-radius: 44rpx; overflow: hidden; margin-bottom: 20rpx;
}
.eb-group-header {
  padding: 24rpx 36rpx; display: flex; align-items: center; gap: 20rpx;
  border-bottom: 2rpx solid #ece6d8;
}
.eb-group-time { font-size: 36rpx; font-weight: 700; color: #0b9d6a; font-family: 'Inter', sans-serif; }
.eb-group-label { font-size: 30rpx; font-weight: 600; color: #22241f; }

.eb-med-row {
  padding: 32rpx 36rpx; display: flex; align-items: center; gap: 28rpx;
  border-bottom: 2rpx solid #ece6d8;
}
.eb-med-row:last-child { border-bottom: none; }
.eb-med-row.done { opacity: 0.55; }
.eb-med-pill {
  width: 96rpx; height: 96rpx; border-radius: 28rpx;
  background: #dff0e6; display: flex; align-items: center;
  justify-content: center; font-size: 40rpx; flex-shrink: 0;
}
.eb-med-pill.done { background: #eeece6; }
.eb-med-body { flex: 1; min-width: 0; }
.eb-med-name { font-size: 34rpx; font-weight: 700; color: #22241f; display: block; }
.eb-med-detail { font-size: 26rpx; color: #5a6058; display: block; margin-top: 6rpx; }
.eb-med-done-mark { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.eb-checkmark {
  width: 64rpx; height: 64rpx; border-radius: 50%; background: #0b9d6a;
  color: #fff; font-size: 36rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.eb-done-label { font-size: 22rpx; color: #5a6058; }
.eb-med-take-btn {
  padding: 20rpx 36rpx; background: #0b9d6a; color: #fff;
  border: none; border-radius: 28rpx; font-size: 28rpx; font-weight: 700;
}

/* ── 骨架屏 ── */
.loading-state { padding: 32rpx; }
.skel-hero { height: 280rpx; background: #e7eae8; border-radius: 48rpx; margin-bottom: 24rpx; animation: shimmer 1.5s infinite; }
.skel-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.skel-block { flex: 1; height: 120rpx; background: #e7eae8; border-radius: 24rpx; animation: shimmer 1.5s infinite; }
.skel-card { height: 140rpx; background: #e7eae8; border-radius: 32rpx; margin-bottom: 16rpx; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

/* ── 空状态 ── */
.empty-state { text-align: center; padding: 160rpx 48rpx; }
.empty-icon { font-size: 128rpx; display: block; margin-bottom: 24rpx; }
.empty-title { font-size: 34rpx; font-weight: 700; display: block; margin-bottom: 12rpx; color: #0f1f1a; }
.empty-desc { font-size: 26rpx; color: #6b7670; display: block; margin-bottom: 40rpx; }

/* ── 日期条 ── */
.date-strip { display: flex; gap: 16rpx; padding: 28rpx 40rpx 8rpx; overflow-x: auto; }
.date-item {
  flex-shrink: 0; width: 88rpx; padding: 16rpx 0; border-radius: 28rpx;
  display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  background: transparent; border: 2rpx solid #e7eae8;
}
.date-item.active { background: #0b9d6a; border-color: #0b9d6a; color: #fff; }
.date-item.today { border-color: #0b9d6a; }
.date-item.today .date-week, .date-item.today .date-day { color: #0b9d6a; }
.date-item.active .date-week, .date-item.active .date-day { color: #fff; }
.date-week { font-size: 18rpx; font-weight: 600; color: #6b7670; }
.date-day { font-size: 32rpx; font-weight: 700; color: #0f1f1a; font-family: 'Inter', sans-serif; }

/* ── Hero 卡片 ── */
.hero-card {
  margin: 24rpx 32rpx 0; background: #fff; border: 2rpx solid #e7eae8;
  border-radius: 48rpx; padding: 40rpx; position: relative; overflow: hidden;
}
.hero-deco { position: absolute; top: -80rpx; right: -80rpx; width: 280rpx; height: 280rpx; border-radius: 50%; background: #e7f6ef; opacity: 0.55; }
.hero-inner { display: flex; align-items: center; gap: 36rpx; position: relative; }
.hero-ring { position: relative; width: 264rpx; height: 264rpx; flex-shrink: 0; }
.ring-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-num { font-size: 68rpx; font-weight: 700; color: #0f1f1a; font-family: 'Inter', sans-serif; line-height: 1; }
.ring-total { font-size: 36rpx; color: #6b7670; font-weight: 500; }
.ring-sub { font-size: 22rpx; color: #6b7670; margin-top: 8rpx; font-weight: 500; }

.hero-info { flex: 1; min-width: 0; }
.hero-next-label { font-size: 22rpx; color: #6b7670; font-weight: 500; letter-spacing: 1rpx; display: block; }
.hero-next-time { font-size: 60rpx; font-weight: 700; color: #0b9d6a; font-family: 'Inter', sans-serif; display: block; margin-top: 8rpx; letter-spacing: -2rpx; }
.hero-next-name { font-size: 26rpx; font-weight: 600; display: block; margin-top: 4rpx; color: #0f1f1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero-next-detail { font-size: 22rpx; color: #6b7670; display: block; margin-top: 2rpx; }
.hero-countdown {
  display: inline-flex; align-items: center; gap: 10rpx;
  padding: 8rpx 20rpx; border-radius: 999rpx;
  background: #e7f6ef; color: #078558;
  font-size: 22rpx; font-weight: 600; margin-top: 20rpx;
}
.hero-countdown.warn { background: #fef4e2; color: #a06a18; }
.countdown-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #0b9d6a; }
.hero-countdown.warn .countdown-dot { background: #f59e0b; }
.hero-done-text { font-size: 52rpx; font-weight: 700; color: #0b9d6a; display: block; margin-top: 8rpx; }
.hero-done-sub { font-size: 24rpx; color: #6b7670; display: block; margin-top: 8rpx; line-height: 1.6; }

/* ── 库存预警 ── */
.stock-alert {
  margin: 24rpx 32rpx 0; padding: 24rpx 28rpx;
  background: #fef4e2; border-radius: 28rpx;
  display: flex; align-items: center; gap: 20rpx;
}
.alert-icon-wrap { width: 64rpx; height: 64rpx; border-radius: 20rpx; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.alert-icon-text { font-size: 32rpx; }
.alert-body { flex: 1; min-width: 0; }
.alert-title { font-size: 26rpx; font-weight: 600; color: #7c4a00; display: block; }
.alert-sub { font-size: 22rpx; color: #a06a18; display: block; margin-top: 2rpx; }
.alert-action { padding: 12rpx 24rpx; border-radius: 999rpx; background: #fff; color: #a06a18; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }

/* ── 时间轴 ── */
.section-header { display: flex; align-items: center; justify-content: space-between; padding: 40rpx 40rpx 24rpx; }
.section-title { font-size: 34rpx; font-weight: 700; color: #0f1f1a; }
.section-meta { font-size: 22rpx; color: #6b7670; }

.past-hint { margin: 0 40rpx; padding: 48rpx 32rpx; background: #fff; border: 2rpx dashed #e7eae8; border-radius: 32rpx; text-align: center; }
.past-icon { font-size: 56rpx; display: block; margin-bottom: 12rpx; }
.past-title { font-size: 26rpx; font-weight: 600; display: block; color: #0f1f1a; }
.btn-back-today { margin-top: 24rpx; padding: 14rpx 28rpx; background: #e7f6ef; color: #078558; border: none; border-radius: 999rpx; font-size: 22rpx; font-weight: 600; }

.slot-section { position: relative; padding: 0 40rpx; margin-bottom: 8rpx; }
.slot-header { display: flex; align-items: center; gap: 20rpx; margin-bottom: 20rpx; }
.timeline-dot { width: 32rpx; height: 32rpx; border-radius: 50%; background: #f6f8f7; border: 4rpx solid #0b9d6a; position: relative; z-index: 1; flex-shrink: 0; }
.slot-label { font-size: 26rpx; font-weight: 700; color: #0f1f1a; }
.slot-time { font-size: 22rpx; color: #6b7670; font-family: 'Inter', sans-serif; }
.slot-count { font-size: 22rpx; color: #9aa39e; margin-left: auto; }
.slot-cards { padding-left: 52rpx; display: flex; flex-direction: column; gap: 16rpx; padding-bottom: 16rpx; }
.slot-cards.has-line { border-left: 2rpx solid #e7eae8; margin-left: 14rpx; }

/* ── 药品卡片 ── */
.med-card {
  background: #fff; border: 2rpx solid #e7eae8; border-radius: 32rpx;
  padding: 24rpx 28rpx; display: flex; align-items: center; gap: 24rpx;
  transition: opacity 0.24s;
}
.med-card.done { opacity: 0.62; }
.med-card.skip { opacity: 0.62; }
.mc-icon {
  width: 76rpx; height: 76rpx; border-radius: 24rpx;
  background: #e7f6ef; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.mc-icon.mc-done { background: #eef1ef; }
.mc-icon.mc-skip { background: #fef4e2; }
.mc-icon-text { font-size: 36rpx; color: #9aa39e; }
.mc-icon.mc-skip .mc-icon-text { color: #a06a18; }
.mc-icon-pill { font-size: 36rpx; }

.mc-body { flex: 1; min-width: 0; }
.mc-name-row { display: flex; align-items: baseline; gap: 8rpx; }
.mc-name { font-size: 28rpx; font-weight: 600; color: #0f1f1a; }
.mc-dosage { font-size: 20rpx; color: #6b7670; white-space: nowrap; }
.mc-tags { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.mc-disease-tag { font-size: 20rpx; color: #078558; background: #e7f6ef; padding: 4rpx 16rpx; border-radius: 999rpx; font-weight: 500; }
.mc-condition { font-size: 20rpx; color: #6b7670; }

.mc-action { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; }
.mc-time { font-size: 26rpx; font-weight: 600; color: #0f1f1a; font-family: 'Inter', sans-serif; }
.mc-done-text, .mc-skip-text { font-size: 20rpx; font-weight: 500; }
.mc-done-text { color: #0b9d6a; }
.mc-skip-text { color: #a06a18; }
.mc-btns { display: flex; gap: 8rpx; }
.btn-skip {
  padding: 10rpx 16rpx; background: #eef1ef; color: #6b7670;
  border-radius: 999rpx; font-size: 22rpx; font-weight: 500;
}
.btn-take {
  padding: 10rpx 28rpx; background: #0b9d6a; color: #fff;
  border-radius: 999rpx; font-size: 22rpx; font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(11,157,106,0.25);
}

/* ── 弹窗表单 ── */
.form-col { display: flex; flex-direction: column; gap: 24rpx; }
.field-row { display: flex; gap: 20rpx; }
.field-label { font-size: 22rpx; font-weight: 600; color: #6b7670; display: block; margin-bottom: 12rpx; }
.field-req { color: #dc2626; margin-left: 4rpx; }
.field-input {
  width: 100%; padding: 20rpx 24rpx; background: #f6f8f7;
  border: 2rpx solid #e7eae8; border-radius: 20rpx;
  font-size: 26rpx; color: #0f1f1a; height: 80rpx;
}
.preset-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.preset-btn { padding: 12rpx 20rpx; background: #f6f8f7; border: 2rpx solid #e7eae8; border-radius: 999rpx; text-align: center; }
.preset-btn.selected { background: #e7f6ef; border-color: #0b9d6a; }
.preset-label { font-size: 24rpx; font-weight: 600; }
.preset-btn.selected .preset-label { color: #078558; }
.preset-time { font-size: 20rpx; color: #9aa39e; display: block; margin-top: 2rpx; }
.preset-btn.selected .preset-time { color: #078558; }
.time-chips { display: flex; flex-wrap: wrap; gap: 12rpx; align-items: center; }
.time-chip { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 20rpx; background: #e7f6ef; border: 2rpx solid #0b9d6a; border-radius: 999rpx; font-size: 24rpx; color: #078558; font-weight: 600; }
.chip-del { font-size: 22rpx; color: #9aa39e; margin-left: 4rpx; }
.time-add-btn { padding: 12rpx 20rpx; background: #f6f8f7; border: 2rpx dashed #d1d5db; border-radius: 999rpx; font-size: 24rpx; color: #6b7670; }
.cond-row { display: flex; gap: 12rpx; flex-wrap: wrap; }
.cond-btn { padding: 16rpx 24rpx; background: #f6f8f7; border: 2rpx solid #e7eae8; border-radius: 999rpx; font-size: 24rpx; }
.cond-btn.selected { background: #e7f6ef; border-color: #0b9d6a; color: #078558; font-weight: 600; }

.sheet-btns { display: flex; gap: 16rpx; margin-top: 28rpx; }
.btn-ghost { flex: 1; padding: 24rpx; background: #f6f8f7; color: #0f1f1a; border: 2rpx solid #e7eae8; border-radius: 24rpx; font-size: 28rpx; font-weight: 600; }
.btn-green { flex: 2; padding: 24rpx; background: #0b9d6a; color: #fff; border: none; border-radius: 24rpx; font-size: 28rpx; font-weight: 700; box-shadow: 0 8rpx 24rpx rgba(11,157,106,0.3); }
.btn-danger { flex: 1; padding: 24rpx; background: #fee9e9; color: #dc2626; border: none; border-radius: 24rpx; font-size: 28rpx; font-weight: 600; }

/* ── 药品详情 ── */
/* ── FAB ── */
.fab {
  position: fixed; right: 32rpx; bottom: 200rpx;
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: #0b9d6a; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(11,157,106,0.4); z-index: 50;
}
.fab-icon { color: #fff; font-size: 52rpx; font-weight: 300; line-height: 1; }
.quick-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20rpx; }
.qa-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 24rpx 0; }
.qa-icon { width: 96rpx; height: 96rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.qa-label { font-size: 24rpx; font-weight: 600; color: #0f1f1a; }

/* ── 跳过原因 ── */
.skip-reasons { display: flex; flex-direction: column; gap: 16rpx; }
.skip-reason {
  padding: 26rpx 28rpx; background: #f6f8f7; border: 2rpx solid #e7eae8;
  border-radius: 24rpx; display: flex; align-items: center; gap: 20rpx;
  font-size: 28rpx; font-weight: 500; color: #0f1f1a;
}
.skip-reason:active { background: #e7f6ef; border-color: #0b9d6a; }
.skip-emoji { font-size: 34rpx; }
.skip-text { flex: 1; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.detail-item { background: #f6f8f7; border-radius: 24rpx; padding: 20rpx 24rpx; }
.detail-label { font-size: 20rpx; color: #6b7670; font-weight: 500; display: block; }
.detail-value { font-size: 28rpx; font-weight: 600; display: block; margin-top: 6rpx; color: #0f1f1a; }
.detail-tip { margin-top: 28rpx; padding: 28rpx; background: #f0f8f4; border-radius: 28rpx; }
.detail-tip-title { font-size: 24rpx; font-weight: 700; color: #078558; display: block; }
.detail-tip-text { font-size: 22rpx; color: #0f1f1a; display: block; margin-top: 8rpx; line-height: 1.6; }
</style>
