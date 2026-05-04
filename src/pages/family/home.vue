<template>
  <view class="page">
    <view class="top-bar">
      <view>
        <text class="mode-label">家属模式</text>
        <text class="page-title">家人 · 用药</text>
      </view>
      <view class="top-actions">
        <view class="top-btn" @click="refresh">
          <text>🔄</text>
        </view>
        <view class="top-btn" @click="goBack">
          <text>↩</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <view class="skel-card" />
        <view class="skel-card" />
        <view class="skel-card short" />
      </view>

      <!-- 无绑定患者 -->
      <view v-else-if="patients.length === 0" class="empty-section">
        <xiaopai mood="thinking" :size="140" />
        <text class="empty-title">还没有绑定家人</text>
        <text class="empty-sub">请输入家人分享给你的邀请码</text>
        <view class="bind-form">
          <input class="bind-input" :value="inviteCode" @input="inviteCode = $event.detail.value" placeholder="输入6位邀请码" maxlength="6" />
          <button class="bind-btn" @click="bindFamily">绑定</button>
        </view>
        <text class="bind-hint">让家人在「我的」页面生成邀请码</text>
      </view>

      <!-- 有患者数据 -->
      <view v-else>
        <!-- 漏服提醒 -->
        <view v-if="totalMissed > 0" class="alert-banner">
          <xiaopai mood="worried" :size="72" />
          <view class="alert-info">
            <text class="alert-title">家人有 {{ totalMissed }} 次药还没吃</text>
            <text class="alert-sub">请及时提醒</text>
          </view>
        </view>

        <!-- 全部完成鼓励 -->
        <view v-else-if="totalDone > 0" class="good-banner">
          <xiaopai mood="happy" :size="72" />
          <view class="alert-info">
            <text class="good-title">家人今天吃药很棒！</text>
            <text class="good-sub">已完成 {{ totalDone }} 次服药</text>
          </view>
        </view>

        <!-- 患者卡片 -->
        <text class="section-title">已绑定的家人</text>
        <view v-for="(p, idx) in patients" :key="p.patient_id"
          class="patient-card" :class="{ active: selectedIdx === idx }"
          @click="selectedIdx = idx">
          <view class="pc-avatar">
            <text class="pc-initial">{{ p.patient_name?.charAt(0) || '家' }}</text>
            <view class="pc-status-dot" :class="getMissedCount(p) > 0 ? 'warn' : 'ok'" />
          </view>
          <view class="pc-body">
            <text class="pc-name">{{ p.patient_name || '家人' }}</text>
            <text class="pc-progress">今日已服 {{ getDoneCount(p) }}/{{ getTotalSlots(p) }}</text>
          </view>
          <view class="pc-right">
            <view v-if="getLowStockCount(p) > 0" class="pc-stock-badge">
              <text>{{ getLowStockCount(p) }}种药快吃完</text>
            </view>
            <text class="pc-arrow">›</text>
          </view>
        </view>

        <!-- 选中患者的今日时间线 -->
        <view v-if="selectedPatient" class="timeline-section">
          <text class="section-title">今日用药 · {{ selectedPatient.patient_name }}</text>

          <view v-if="selectedTimeline.length === 0" class="empty-timeline">
            <text class="empty-timeline-text">该家人还没有添加药品</text>
          </view>

          <view v-for="item in selectedTimeline" :key="item.key" class="tl-item">
            <view class="tl-dot" :class="item.status" />
            <view class="tl-body">
              <view class="tl-name-row">
                <text class="tl-name">{{ item.name }}</text>
                <text class="tl-dosage">{{ item.dosage }}</text>
              </view>
              <text class="tl-time">{{ item.time }} · {{ item.condition }}</text>
            </view>
            <view class="tl-status">
              <text class="tl-badge" :class="item.status">{{ item.statusText }}</text>
              <text v-if="item.doneAt" class="tl-done-time">{{ item.doneAt }}</text>
            </view>
          </view>
        </view>

        <!-- 绑定更多家人 -->
        <view class="bind-more">
          <text class="bind-more-title">绑定新家人</text>
          <view class="bind-form">
            <input class="bind-input" :value="inviteCode" @input="inviteCode = $event.detail.value" placeholder="输入邀请码" maxlength="6" />
            <button class="bind-btn" @click="bindFamily">绑定</button>
          </view>
        </view>

        <!-- 快捷操作 -->
        <text class="section-title">快捷操作</text>
        <view class="quick-grid">
          <view class="quick-item">
            <view class="qi-icon" style="background:#e7f6ef;"><text>📞</text></view>
            <text class="qi-label">打电话</text>
          </view>
          <view class="quick-item">
            <view class="qi-icon" style="background:#e3f2fd;"><text>💊</text></view>
            <text class="qi-label">代购药</text>
          </view>
          <view class="quick-item">
            <view class="qi-icon" style="background:#fff3e0;"><text>📍</text></view>
            <text class="qi-label">定位</text>
          </view>
          <view class="quick-item">
            <view class="qi-icon" style="background:#fce4ec;"><text>❤</text></view>
            <text class="qi-label">体征</text>
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
import { useFamilyStore } from '../../stores/family'
import type { PatientData } from '../../stores/family'
import { supabase } from '../../utils/supabase'
import { normalizeTime, getHourFromTime } from '../../utils/date'
import Xiaopai from '../../components/Xiaopai.vue'

const userStore = useUserStore()
const familyStore = useFamilyStore()
const patients = computed(() => familyStore.patients)
const loading = computed(() => familyStore.loading)
const inviteCode = ref('')
const selectedIdx = ref(0)

const selectedPatient = computed(() => patients.value[selectedIdx.value] || null)

// ── 统计辅助 ──
const getTotalSlots = (p: PatientData) => {
  return p.medications.reduce((s, m) => s + (m.times?.length || 1), 0)
}
const getDoneCount = (p: PatientData) => {
  return p.today_records.filter(r => r.status === 'done').length
}
const getMissedCount = (p: PatientData) => {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  let missed = 0
  const doneKeys = new Set(p.today_records.filter(r => r.status === 'done' || r.status === 'skip').map(r => r.medication_id + '_' + r.time_slot))
  p.medications.forEach(m => {
    if (!m.times) return
    m.times.forEach((t: string) => {
      const time = normalizeTime(t)
      const hour = getHourFromTime(time)
      if (hour + 1 < currentHour) {
        const key = m.id + '_' + time
        if (!doneKeys.has(key)) missed++
      }
    })
  })
  return missed
}
const getLowStockCount = (p: PatientData) => {
  return p.medications.filter(m => {
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
    return days <= 7
  }).length
}

const totalMissed = computed(() => patients.value.reduce((s, p) => s + getMissedCount(p), 0))
const totalDone = computed(() => patients.value.reduce((s, p) => s + getDoneCount(p), 0))

// ── 时间线 ──
const selectedTimeline = computed(() => {
  const p = selectedPatient.value
  if (!p) return []
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60

  const recordMap: Record<string, any> = {}
  p.today_records.forEach(r => {
    recordMap[r.medication_id + '_' + (r.time_slot || '')] = r
  })

  const items: any[] = []
  p.medications.forEach(m => {
    if (!m.times) return
    m.times.forEach((t: string) => {
      const time = normalizeTime(t)
      const hour = getHourFromTime(time)
      const rec = recordMap[m.id + '_' + time]

      let status = 'pending'
      let statusText = '待服'
      let doneAt = ''
      if (rec?.status === 'done') {
        status = 'done'
        statusText = '已服'
        if (rec.taken_at) {
          const d = new Date(rec.taken_at)
          doneAt = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
        }
      } else if (rec?.status === 'skip') {
        status = 'skip'
        statusText = '已跳过'
      } else if (hour + 1 < currentHour) {
        status = 'missed'
        statusText = '漏服'
      }

      items.push({
        key: m.id + '_' + time,
        name: m.name,
        dosage: m.dosage,
        condition: m.condition || '',
        time,
        hour,
        status,
        statusText,
        doneAt
      })
    })
  })

  return items.sort((a, b) => a.hour - b.hour)
})

// ── 绑定 ──
const bindFamily = async () => {
  if (!inviteCode.value || inviteCode.value.length < 6) {
    uni.showToast({ title: '请输入6位邀请码', icon: 'none' })
    return
  }
  if (!userStore.user) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  // 先查邀请码是否存在
  const { data: link } = await supabase
    .from('family_links')
    .select('*')
    .eq('invite_code', inviteCode.value.toUpperCase())
    .eq('status', 'pending')
    .single()

  if (!link) {
    uni.showToast({ title: '邀请码无效或已被使用', icon: 'none' })
    return
  }

  const { error } = await supabase
    .from('family_links')
    .update({ caregiver_id: userStore.user.id, status: 'active' })
    .eq('id', link.id)

  if (error) {
    uni.showToast({ title: '绑定失败：' + error.message, icon: 'none' })
  } else {
    uni.showToast({ title: '绑定成功！', icon: 'success' })
    inviteCode.value = ''
    // 等一下再刷新，让数据库同步
    setTimeout(async () => {
      await familyStore.fetchDashboard()
    }, 500)
  }
}

const refresh = () => familyStore.fetchDashboard()

const goBack = () => {
  uni.removeStorageSync('last_role')
  uni.reLaunch({ url: '/pages/role-select/index' })
}

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) await familyStore.fetchDashboard()
})
</script>

<style lang="scss" scoped>
.page { background: #f4f7fb; min-height: 100vh; display: flex; flex-direction: column; }

.top-bar { padding: 24rpx 40rpx 16rpx; display: flex; align-items: center; justify-content: space-between; }
.mode-label { font-size: 22rpx; color: #5a6884; font-weight: 600; display: block; letter-spacing: 1rpx; }
.page-title { font-size: 44rpx; font-weight: 800; color: #1a2033; display: block; margin-top: 4rpx; }
.top-actions { display: flex; gap: 16rpx; }
.top-btn { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: #fff; border: 2rpx solid #dde1e8; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }

.main-scroll { flex: 1; padding: 0 28rpx; }

/* 骨架屏 */
.loading-state { padding-top: 24rpx; }
.skel-card { height: 180rpx; background: #dde1e8; border-radius: 32rpx; margin-bottom: 20rpx; animation: shimmer 1.5s infinite; }
.skel-card.short { height: 120rpx; }
@keyframes shimmer { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

/* 空状态 */
.empty-section {
  display: flex; flex-direction: column; align-items: center;
  padding: 60rpx 32rpx; margin-top: 24rpx;
  background: #fff; border: 2rpx dashed #dde1e8; border-radius: 40rpx;
}
.empty-title { font-size: 32rpx; font-weight: 700; color: #1a2033; margin-top: 28rpx; }
.empty-sub { font-size: 24rpx; color: #5a6884; margin-top: 8rpx; }
.bind-hint { font-size: 22rpx; color: #8a9098; margin-top: 20rpx; }

.bind-form { display: flex; gap: 16rpx; margin-top: 28rpx; width: 100%; }
.bind-input {
  flex: 1; height: 88rpx; background: #f4f7fb; border: 2rpx solid #dde1e8;
  border-radius: 24rpx; padding: 0 28rpx; font-size: 32rpx;
  letter-spacing: 12rpx; text-align: center; font-weight: 600;
}
.bind-btn {
  padding: 0 40rpx; height: 88rpx; background: #5a6884; color: #fff;
  border: none; border-radius: 24rpx; font-size: 28rpx; font-weight: 600; line-height: 88rpx;
}

/* 提醒横幅 */
.alert-banner {
  margin-top: 16rpx; padding: 28rpx; background: #fee9e9;
  border-radius: 32rpx; display: flex; align-items: center; gap: 24rpx;
}
.alert-title { font-size: 28rpx; font-weight: 700; color: #7c1a1a; display: block; }
.alert-sub { font-size: 22rpx; color: #a04040; display: block; margin-top: 4rpx; }
.alert-info { flex: 1; }

.good-banner {
  margin-top: 16rpx; padding: 28rpx; background: #e7f6ef;
  border-radius: 32rpx; display: flex; align-items: center; gap: 24rpx;
}
.good-title { font-size: 28rpx; font-weight: 700; color: #075f40; display: block; }
.good-sub { font-size: 22rpx; color: #0b9d6a; display: block; margin-top: 4rpx; }

/* 患者卡片 */
.section-title { font-size: 28rpx; font-weight: 700; color: #1a2033; display: block; padding: 28rpx 0 16rpx; }

.patient-card {
  background: #fff; border: 2rpx solid #dde1e8; border-radius: 32rpx;
  padding: 28rpx; margin-bottom: 16rpx;
  display: flex; align-items: center; gap: 24rpx;
}
.patient-card.active { border-color: #5a6884; box-shadow: 0 4rpx 16rpx rgba(90,104,132,0.12); }

.pc-avatar {
  width: 88rpx; height: 88rpx; border-radius: 28rpx;
  background: #e8ecf2; display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
}
.pc-initial { font-size: 36rpx; font-weight: 700; color: #5a6884; }
.pc-status-dot {
  position: absolute; bottom: -4rpx; right: -4rpx;
  width: 24rpx; height: 24rpx; border-radius: 50%; border: 4rpx solid #fff;
}
.pc-status-dot.ok { background: #0b9d6a; }
.pc-status-dot.warn { background: #dc2626; }

.pc-body { flex: 1; min-width: 0; }
.pc-name { font-size: 30rpx; font-weight: 700; color: #1a2033; display: block; }
.pc-progress { font-size: 24rpx; color: #5a6884; display: block; margin-top: 6rpx; }

.pc-right { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.pc-stock-badge {
  padding: 6rpx 16rpx; background: #fef4e2; border-radius: 999rpx;
  font-size: 20rpx; color: #a06a18; font-weight: 600;
}
.pc-arrow { font-size: 32rpx; color: #8a9098; }

/* 时间线 */
.timeline-section { margin-top: 8rpx; }
.empty-timeline { padding: 40rpx; background: #fff; border: 2rpx dashed #dde1e8; border-radius: 24rpx; text-align: center; }
.empty-timeline-text { font-size: 24rpx; color: #8a9098; }

.tl-item {
  background: #fff; border: 2rpx solid #dde1e8; border-radius: 28rpx;
  padding: 24rpx 28rpx; margin-bottom: 12rpx;
  display: flex; align-items: center; gap: 20rpx;
}
.tl-dot {
  width: 24rpx; height: 24rpx; border-radius: 50%; flex-shrink: 0;
}
.tl-dot.done { background: #0b9d6a; }
.tl-dot.pending { background: #dde1e8; }
.tl-dot.missed { background: #dc2626; }
.tl-dot.skip { background: #f59e0b; }

.tl-body { flex: 1; min-width: 0; }
.tl-name-row { display: flex; align-items: baseline; gap: 8rpx; }
.tl-name { font-size: 28rpx; font-weight: 600; color: #1a2033; }
.tl-dosage { font-size: 22rpx; color: #5a6884; }
.tl-time { font-size: 22rpx; color: #8a9098; display: block; margin-top: 4rpx; }

.tl-status { text-align: right; flex-shrink: 0; }
.tl-badge { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 999rpx; font-weight: 600; }
.tl-badge.done { background: #e7f6ef; color: #078558; }
.tl-badge.pending { background: #f4f7fb; color: #5a6884; }
.tl-badge.missed { background: #fee9e9; color: #dc2626; }
.tl-badge.skip { background: #fef4e2; color: #a06a18; }
.tl-done-time { font-size: 20rpx; color: #8a9098; display: block; margin-top: 4rpx; }

/* 绑定更多 */
.bind-more {
  margin-top: 16rpx; padding: 28rpx;
  background: #fff; border: 2rpx solid #dde1e8; border-radius: 32rpx;
}
.bind-more-title { font-size: 26rpx; font-weight: 600; color: #1a2033; display: block; margin-bottom: 16rpx; }

/* 快捷操作 */
.quick-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16rpx; }
.quick-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.qi-icon { width: 96rpx; height: 96rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.qi-label { font-size: 22rpx; font-weight: 600; color: #1a2033; }
</style>
