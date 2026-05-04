<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view>
        <text class="mode-label">家属模式</text>
        <text class="page-title">家人 · 用药</text>
      </view>
      <view class="top-actions">
        <view class="top-btn" @click="refresh"><text>🔄</text></view>
        <view class="top-btn" @click="goBack"><text>↩</text></view>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <view class="skel-card" /><view class="skel-card" /><view class="skel-card short" />
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
        <!-- 漏服 Alert -->
        <view v-if="urgentPatient" class="alert-card">
          <view class="alert-icon-circle"><text>⚠️</text></view>
          <view class="alert-body">
            <text class="alert-title">{{ urgentPatient.patient_name }} 有药漏服了</text>
            <text class="alert-sub">建议立即提醒</text>
          </view>
          <button class="alert-btn">提醒</button>
        </view>

        <!-- 周报入口 -->
        <view class="report-card">
          <view class="report-icon"><text>📊</text></view>
          <view class="report-body">
            <text class="report-title">本周健康简报</text>
            <text class="report-sub">查看家人用药情况汇总</text>
          </view>
          <text class="report-arrow">›</text>
        </view>

        <!-- 关注的家人 -->
        <view class="section-wrap">
          <text class="section-label">关注的家人</text>
          <view class="member-list">
            <view v-for="(p, idx) in patients" :key="p.patient_id" class="member-card" :class="{ warn: getMissedCount(p) > 0 }" @click="selectedIdx = idx">
              <!-- 头像区 -->
              <view class="mc-top">
                <view class="mc-avatar-wrap">
                  <view class="mc-avatar" :class="getMissedCount(p) > 0 ? 'avatar-warn' : 'avatar-ok'">
                    <text class="mc-initial">{{ p.patient_name?.charAt(0) || '家' }}</text>
                  </view>
                  <view class="mc-dot" :class="getMissedCount(p) > 0 ? 'dot-warn' : 'dot-ok'" />
                </view>
                <view class="mc-info">
                  <view class="mc-name-row">
                    <text class="mc-name">{{ p.patient_name || '家人' }}</text>
                  </view>
                  <text class="mc-last">最近服药 {{ getLastTaken(p) }}</text>
                </view>
                <text class="mc-arrow">›</text>
              </view>
              <!-- 统计区 -->
              <view class="mc-stats" :class="{ 'stats-warn': getMissedCount(p) > 0 }">
                <view class="mc-stat">
                  <text class="mc-stat-label">今日进度</text>
                  <view class="mc-stat-num-row">
                    <text class="mc-stat-num" :class="getMissedCount(p) > 0 ? 'num-warn' : 'num-ok'">{{ getDoneCount(p) }}</text>
                    <text class="mc-stat-total">/{{ getTotalSlots(p) }}</text>
                    <view v-if="getMissedCount(p) > 0" class="mc-urgent-badge">
                      <text>{{ getMissedCount(p) }} 漏服</text>
                    </view>
                  </view>
                </view>
                <view class="mc-stat-divider" />
                <view class="mc-stat">
                  <text class="mc-stat-label">连续打卡</text>
                  <view class="mc-stat-num-row">
                    <text class="mc-stat-num">--</text>
                    <text class="mc-stat-unit">天</text>
                  </view>
                </view>
                <view v-if="getMissedCount(p) > 0" class="mc-stat-btn warn" @click.stop="">
                  <text>提醒</text>
                </view>
                <view v-else class="mc-stat-btn ok" @click.stop="">
                  <text>详情 ›</text>
                </view>
              </view>
            </view>

            <!-- 邀请新家人 -->
            <view class="invite-card" @click="showBindMore = !showBindMore">
              <text class="invite-icon">+</text>
              <text class="invite-text">邀请新家人</text>
            </view>
          </view>
        </view>

        <!-- 绑定更多 -->
        <view v-if="showBindMore" class="bind-more">
          <view class="bind-form">
            <input class="bind-input" :value="inviteCode" @input="inviteCode = $event.detail.value" placeholder="输入邀请码" maxlength="6" />
            <button class="bind-btn" @click="bindFamily">绑定</button>
          </view>
        </view>

        <!-- 今日动态 -->
        <view class="section-wrap">
          <view class="section-header">
            <text class="section-label">今日动态</text>
          </view>
          <view class="timeline-card">
            <view v-if="allTimeline.length === 0" class="timeline-empty">
              <text>暂无今日用药记录</text>
            </view>
            <view v-for="(item, i) in allTimeline" :key="item.key" class="tl-row" :class="{ 'tl-last': i === allTimeline.length - 1 }">
              <text class="tl-time">{{ item.time }}</text>
              <view class="tl-dot" :class="item.status" />
              <view class="tl-body">
                <text class="tl-med">{{ item.name }} <text class="tl-who">· {{ item.who }}</text></text>
              </view>
              <text class="tl-badge" :class="item.status">{{ item.statusText }}</text>
            </view>
          </view>
        </view>

        <!-- 快捷操作 -->
        <view class="section-wrap">
          <text class="section-label">快捷操作</text>
          <view class="quick-grid">
            <view class="quick-btn" v-for="a in quickActions" :key="a.label">
              <text class="quick-emoji">{{ a.icon }}</text>
              <view class="quick-info">
                <text class="quick-label">{{ a.label }}</text>
                <text class="quick-sub">{{ a.sub }}</text>
              </view>
            </view>
          </view>
        </view>

        <view style="height: 60rpx;" />
      </view>
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
const showBindMore = ref(false)

const quickActions = [
  { icon: '📞', label: '一键呼叫', sub: '打给家人' },
  { icon: '💊', label: '代下单', sub: '续方购药' },
  { icon: '📍', label: '查看位置', sub: '实时定位' },
  { icon: '🩺', label: '体征数据', sub: '血压·血糖' },
]

// ── 统计辅助 ──
const getTotalSlots = (p: PatientData) => p.medications.reduce((s, m) => s + (m.times?.length || 1), 0)
const getDoneCount = (p: PatientData) => p.today_records.filter(r => r.status === 'done').length
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
      if (hour + 1 < currentHour && !doneKeys.has(m.id + '_' + time)) missed++
    })
  })
  return missed
}
const getLastTaken = (p: PatientData) => {
  const doneRecords = p.today_records.filter(r => r.status === 'done' && r.taken_at)
  if (doneRecords.length === 0) return '暂无'
  const last = doneRecords.sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())[0]
  const mins = Math.round((Date.now() - new Date(last.taken_at).getTime()) / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return mins + ' 分钟前'
  return Math.floor(mins / 60) + ' 小时前'
}

const urgentPatient = computed(() => patients.value.find(p => getMissedCount(p) > 0) || null)

// ── 全部家人的今日时间线 ──
const allTimeline = computed(() => {
  const items: any[] = []
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60

  patients.value.forEach(p => {
    const recordMap: Record<string, any> = {}
    p.today_records.forEach(r => { recordMap[r.medication_id + '_' + (r.time_slot || '')] = r })

    p.medications.forEach(m => {
      if (!m.times) return
      m.times.forEach((t: string) => {
        const time = normalizeTime(t)
        const hour = getHourFromTime(time)
        const rec = recordMap[m.id + '_' + time]
        let status = 'pending', statusText = '待服用', doneAt = ''
        if (rec?.status === 'done') {
          status = 'done'; statusText = '已服用'
          if (rec.taken_at) { const d = new Date(rec.taken_at); doneAt = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') }
        } else if (rec?.status === 'skip') {
          status = 'skip'; statusText = '已跳过'
        } else if (hour + 1 < currentHour) {
          status = 'missed'; statusText = '已漏服'
        }
        items.push({ key: p.patient_id + '_' + m.id + '_' + time, name: m.name, who: p.patient_name, time: doneAt || time, hour, status, statusText })
      })
    })
  })
  return items.sort((a, b) => a.hour - b.hour)
})

// ── 绑定 ──
const bindFamily = async () => {
  if (!inviteCode.value || inviteCode.value.length < 6) { uni.showToast({ title: '请输入6位邀请码', icon: 'none' }); return }
  if (!userStore.user) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
  const { data: link } = await supabase.from('family_links').select('*').eq('invite_code', inviteCode.value.toUpperCase()).eq('status', 'pending').single()
  if (!link) { uni.showToast({ title: '邀请码无效或已被使用', icon: 'none' }); return }
  const { error } = await supabase.from('family_links').update({ caregiver_id: userStore.user.id, status: 'active' }).eq('id', link.id)
  if (error) { uni.showToast({ title: '绑定失败', icon: 'none' }); return }
  uni.showToast({ title: '绑定成功！', icon: 'success' })
  inviteCode.value = ''
  showBindMore.value = false
  setTimeout(() => familyStore.fetchDashboard(), 500)
}

const refresh = () => familyStore.fetchDashboard()
const goBack = () => { uni.removeStorageSync('last_role'); uni.reLaunch({ url: '/pages/role-select/index' }) }

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) await familyStore.fetchDashboard()
})
</script>

<style lang="scss" scoped>
.page { background: #f4f7fb; min-height: 100vh; display: flex; flex-direction: column; }

.top-bar { padding: 24rpx 36rpx 16rpx; display: flex; align-items: center; justify-content: space-between; }
.mode-label { font-size: 22rpx; color: #5a6884; font-weight: 600; display: block; }
.page-title { font-size: 38rpx; font-weight: 800; color: #0f1f1a; display: block; margin-top: 2rpx; }
.top-actions { display: flex; gap: 16rpx; }
.top-btn { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: #fff; border: 2rpx solid #e3e8f1; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }

.main-scroll { flex: 1; }

/* 骨架屏 */
.loading-state { padding: 24rpx 28rpx; }
.skel-card { height: 180rpx; background: #e3e8f1; border-radius: 32rpx; margin-bottom: 20rpx; animation: shimmer 1.5s infinite; }
.skel-card.short { height: 120rpx; }
@keyframes shimmer { 0%{opacity:1} 50%{opacity:0.5} 100%{opacity:1} }

/* 空状态 */
.empty-section { display: flex; flex-direction: column; align-items: center; padding: 60rpx 40rpx; margin: 24rpx 28rpx; background: #fff; border: 2rpx dashed #c5cee0; border-radius: 32rpx; }
.empty-title { font-size: 32rpx; font-weight: 700; color: #0f1f1a; margin-top: 28rpx; }
.empty-sub { font-size: 24rpx; color: #5a6884; margin-top: 8rpx; }
.bind-hint { font-size: 22rpx; color: #9aa39e; margin-top: 20rpx; }
.bind-form { display: flex; gap: 16rpx; margin-top: 28rpx; width: 100%; }
.bind-input { flex: 1; height: 88rpx; background: #f4f7fb; border: 2rpx solid #e3e8f1; border-radius: 24rpx; padding: 0 28rpx; font-size: 32rpx; letter-spacing: 12rpx; text-align: center; font-weight: 600; }
.bind-btn { padding: 0 40rpx; height: 88rpx; background: #0b9d6a; color: #fff; border: none; border-radius: 24rpx; font-size: 28rpx; font-weight: 600; line-height: 88rpx; }

/* 漏服 Alert */
.alert-card { margin: 20rpx 28rpx 0; background: #fff5f4; border: 2rpx solid #ffd5d2; border-radius: 32rpx; padding: 24rpx 28rpx; display: flex; align-items: center; gap: 24rpx; }
.alert-icon-circle { width: 72rpx; height: 72rpx; border-radius: 50%; background: #fee5e2; display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.alert-body { flex: 1; }
.alert-title { font-size: 26rpx; font-weight: 700; color: #9a2820; display: block; }
.alert-sub { font-size: 22rpx; color: #b95048; display: block; margin-top: 2rpx; }
.alert-btn { padding: 16rpx 24rpx; background: #e53935; color: #fff; border: none; border-radius: 20rpx; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }

/* 周报入口 */
.report-card { margin: 20rpx 28rpx 0; padding: 24rpx 28rpx; background: linear-gradient(135deg, #0f1f1a, #0b9d6a); border-radius: 32rpx; display: flex; align-items: center; gap: 24rpx; color: #fff; }
.report-icon { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.report-body { flex: 1; }
.report-title { font-size: 24rpx; font-weight: 700; display: block; }
.report-sub { font-size: 20rpx; opacity: 0.8; display: block; margin-top: 2rpx; }
.report-arrow { font-size: 28rpx; opacity: 0.6; }

/* Section */
.section-wrap { padding: 32rpx 28rpx 0; }
.section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16rpx; }
.section-label { font-size: 22rpx; color: #5a6884; font-weight: 600; letter-spacing: 1rpx; display: block; margin-bottom: 16rpx; }

/* MemberCard */
.member-list { display: flex; flex-direction: column; gap: 20rpx; }
.member-card { background: #fff; border: 3rpx solid #e3e8f1; border-radius: 36rpx; padding: 28rpx; }
.member-card.warn { border-color: #ffd5d2; }

.mc-top { display: flex; align-items: center; gap: 24rpx; }
.mc-avatar-wrap { position: relative; flex-shrink: 0; }
.mc-avatar { width: 104rpx; height: 104rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.mc-avatar.avatar-ok { background: linear-gradient(135deg, #c8f0df, #a3e0c1); }
.mc-avatar.avatar-warn { background: linear-gradient(135deg, #fcb69f, #ffecd2); }
.mc-initial { font-size: 44rpx; font-weight: 700; }
.avatar-ok .mc-initial { color: #075f40; }
.avatar-warn .mc-initial { color: #9a2820; }
.mc-dot { position: absolute; bottom: -4rpx; right: -4rpx; width: 32rpx; height: 32rpx; border-radius: 50%; border: 5rpx solid #fff; }
.mc-dot.dot-ok { background: #0b9d6a; }
.mc-dot.dot-warn { background: #e53935; }

.mc-info { flex: 1; min-width: 0; }
.mc-name-row { display: flex; align-items: baseline; gap: 8rpx; }
.mc-name { font-size: 32rpx; font-weight: 700; color: #0f1f1a; }
.mc-last { font-size: 22rpx; color: #5a6884; display: block; margin-top: 4rpx; }
.member-card.warn .mc-last { color: #9a2820; }
.mc-arrow { font-size: 32rpx; color: #c5cee0; }

/* 统计子区 */
.mc-stats { margin-top: 24rpx; padding: 20rpx 24rpx; background: #f7faf9; border-radius: 24rpx; display: flex; align-items: center; gap: 20rpx; }
.mc-stats.stats-warn { background: #fff5f4; }
.mc-stat { flex: 1; }
.mc-stat-label { font-size: 20rpx; color: #5a6884; display: block; }
.mc-stat-num-row { display: flex; align-items: baseline; gap: 6rpx; margin-top: 4rpx; }
.mc-stat-num { font-size: 36rpx; font-weight: 700; font-family: 'Inter', sans-serif; }
.mc-stat-num.num-ok { color: #078558; }
.mc-stat-num.num-warn { color: #9a2820; }
.mc-stat-total { font-size: 24rpx; color: #5a6884; font-weight: 500; }
.mc-stat-unit { font-size: 20rpx; color: #5a6884; }
.mc-stat-divider { width: 2rpx; height: 56rpx; background: rgba(0,0,0,0.06); }
.mc-urgent-badge { padding: 2rpx 12rpx; background: #fee5e2; border-radius: 999rpx; font-size: 20rpx; color: #9a2820; font-weight: 600; }
.mc-stat-btn { padding: 12rpx 24rpx; border: none; border-radius: 20rpx; font-size: 22rpx; font-weight: 600; flex-shrink: 0; }
.mc-stat-btn.ok { background: #0b9d6a; color: #fff; }
.mc-stat-btn.warn { background: #e53935; color: #fff; }

/* 邀请 */
.invite-card { background: #fff; border: 3rpx dashed #c5cee0; border-radius: 32rpx; padding: 32rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.invite-icon { font-size: 32rpx; color: #5a6884; }
.invite-text { font-size: 26rpx; font-weight: 600; color: #5a6884; }

/* 绑定更多 */
.bind-more { padding: 20rpx 28rpx 0; }

/* 时间线 */
.timeline-card { background: #fff; border-radius: 32rpx; border: 2rpx solid #e3e8f1; overflow: hidden; }
.timeline-empty { padding: 40rpx; text-align: center; font-size: 24rpx; color: #5a6884; }
.tl-row { padding: 20rpx 28rpx; display: flex; align-items: center; gap: 24rpx; border-bottom: 2rpx solid #eef1f7; }
.tl-row.tl-last { border-bottom: none; }
.tl-time { font-family: 'Inter', sans-serif; font-size: 22rpx; font-weight: 700; color: #5a6884; width: 72rpx; text-align: right; flex-shrink: 0; }
.tl-dot { width: 16rpx; height: 16rpx; border-radius: 50%; flex-shrink: 0; }
.tl-dot.done { background: #0b9d6a; }
.tl-dot.pending { background: #5a6884; }
.tl-dot.missed { background: #e53935; }
.tl-dot.skip { background: #f59e0b; }
.tl-body { flex: 1; min-width: 0; }
.tl-med { font-size: 26rpx; font-weight: 600; color: #0f1f1a; }
.tl-who { font-size: 22rpx; color: #5a6884; font-weight: 500; }
.tl-badge { font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 999rpx; font-weight: 600; flex-shrink: 0; }
.tl-badge.done { background: #e7f6ef; color: #078558; }
.tl-badge.pending { background: #eef1f7; color: #5a6884; }
.tl-badge.missed { background: #fee5e2; color: #9a2820; }
.tl-badge.skip { background: #fff7e8; color: #a06a18; }

/* 快捷操作 */
.quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.quick-btn { background: #fff; border-radius: 28rpx; padding: 28rpx; border: 2rpx solid #e3e8f1; display: flex; align-items: center; gap: 20rpx; }
.quick-emoji { font-size: 44rpx; }
.quick-info { flex: 1; }
.quick-label { font-size: 24rpx; font-weight: 700; color: #0f1f1a; display: block; }
.quick-sub { font-size: 20rpx; color: #5a6884; display: block; margin-top: 2rpx; }
</style>
