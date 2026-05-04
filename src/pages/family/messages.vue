<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <text class="page-title">通知中心</text>
      <view class="top-btn" @click="markAllRead">
        <text class="top-btn-text">全标已读</text>
      </view>
    </view>

    <!-- 筛选条 -->
    <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
      <view class="filter-list">
        <view
          v-for="f in filters"
          :key="f.value"
          class="filter-chip"
          :class="{ active: activeFilter === f.value }"
          @click="activeFilter = f.value"
        >
          <text class="filter-chip-text">{{ f.label }}</text>
          <view v-if="f.count > 0" class="filter-count">
            <text class="filter-count-text">{{ f.count }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 通知列表 -->
    <scroll-view scroll-y class="main-scroll">
      <view v-for="group in filteredGroups" :key="group.label" class="group-section">
        <text class="group-label">{{ group.label }}</text>
        <view class="notify-list">
          <view
            v-for="(item, idx) in group.items"
            :key="idx"
            class="notify-card"
            :class="'type-' + item.type"
          >
            <!-- 紧急脉冲点 -->
            <view v-if="item.urgent" class="urgent-pulse">
              <view class="pulse-dot" />
            </view>

            <view class="notify-top">
              <view class="notify-icon-circle" :class="'icon-' + item.type">
                <text class="notify-icon">{{ item.icon }}</text>
              </view>
              <view class="notify-body">
                <text class="notify-title">{{ item.title }}</text>
                <text class="notify-desc">{{ item.desc }}</text>
                <view class="notify-meta">
                  <text class="notify-time">{{ item.time }}</text>
                  <text class="notify-who">· {{ item.who }}</text>
                </view>
              </view>
            </view>

            <view v-if="item.action" class="notify-action-row">
              <view class="notify-action-btn" :class="'action-' + item.type" @click="handleAction(item)">
                <text class="notify-action-text">{{ item.action }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 无更多 -->
      <view class="footer-end">
        <view class="footer-line" />
        <text class="footer-text">没有更多了</text>
        <view class="footer-line" />
      </view>

      <view style="height: 160rpx;" />
    </scroll-view>

    <family-tab-bar current="messages" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useFamilyStore } from '../../stores/family'
import type { NotifyItem } from '../../stores/family'
import Xiaopai from '../../components/Xiaopai.vue'
import FamilyTabBar from '../../components/FamilyTabBar.vue'

const userStore = useUserStore()
const familyStore = useFamilyStore()

const activeFilter = ref('all')

// 从 store 获取真实通知
const allNotifications = computed(() => familyStore.notifications)

// 动态计算筛选计数
const filters = computed(() => {
  const all = allNotifications.value
  return [
    { value: 'all', label: '全部', count: all.length },
    { value: 'urgent', label: '紧急', count: all.filter(n => n.urgent).length },
    { value: 'missed', label: '漏服', count: all.filter(n => n.type === 'missed').length },
    { value: 'done', label: '已服', count: all.filter(n => n.type === 'done').length },
    { value: 'stock', label: '库存', count: all.filter(n => n.type === 'stock').length },
  ]
})

// 按类型筛选，分组为"今天"
const filteredGroups = computed(() => {
  let items = allNotifications.value
  if (activeFilter.value === 'urgent') items = items.filter(n => n.urgent)
  else if (activeFilter.value !== 'all') items = items.filter(n => n.type === activeFilter.value)

  if (items.length === 0) return []
  return [{ label: '今天', items }]
})

const markAllRead = async () => {
  await familyStore.markAllRead()
  uni.showToast({ title: '已全部标为已读', icon: 'success' })
}

const handleAction = (item: NotifyItem) => {
  if (item.action === '立即提醒' && item.patient_id) {
    uni.navigateTo({ url: '/pages/family/remind?patient_id=' + item.patient_id + '&name=' + encodeURIComponent(item.who) })
  } else {
    uni.showToast({ title: '功能开发中', icon: 'none' })
  }
}

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) await familyStore.fetchNotifications()
})
</script>

<style lang="scss" scoped>
.page { background: #f4f7fb; min-height: 100vh; display: flex; flex-direction: column; }

/* 顶栏 */
.top-bar { padding: 24rpx 36rpx 16rpx; display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 38rpx; font-weight: 800; color: #0f1f1a; }
.top-btn { padding: 10rpx 24rpx; background: #fff; border: 2rpx solid #e3e8f1; border-radius: 20rpx; }
.top-btn-text { font-size: 24rpx; color: #5a6884; font-weight: 600; }

/* 筛选条 */
.filter-scroll { padding: 0 0 0 28rpx; flex-shrink: 0; }
.filter-list { display: flex; gap: 14rpx; padding-right: 28rpx; }
.filter-chip { display: flex; align-items: center; gap: 8rpx; padding: 14rpx 28rpx; background: #fff; border: 2rpx solid #e3e8f1; border-radius: 999rpx; flex-shrink: 0; }
.filter-chip.active { background: #0f1f1a; border-color: #0f1f1a; }
.filter-chip-text { font-size: 24rpx; font-weight: 600; color: #5a6884; }
.filter-chip.active .filter-chip-text { color: #fff; }
.filter-count { min-width: 32rpx; height: 32rpx; background: #e53935; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; padding: 0 8rpx; }
.filter-chip.active .filter-count { background: rgba(255,255,255,0.25); }
.filter-count-text { font-size: 20rpx; font-weight: 700; color: #fff; font-family: 'Inter', sans-serif; }

.main-scroll { flex: 1; padding-top: 12rpx; }

/* 分组 */
.group-section { padding: 20rpx 28rpx 0; }
.group-label { font-size: 22rpx; color: #5a6884; font-weight: 600; letter-spacing: 1rpx; display: block; margin-bottom: 16rpx; text-transform: uppercase; }

/* 通知列表 */
.notify-list { display: flex; flex-direction: column; gap: 16rpx; }
.notify-card { background: #fff; border: 2rpx solid #e3e8f1; border-radius: 28rpx; padding: 24rpx 28rpx; position: relative; overflow: hidden; }
.notify-card.type-missed { background: #fff8f7; border-color: #fecaca; }
.notify-card.type-vital { background: #fffbf0; border-color: #fde68a; }
.notify-card.type-done { background: #fff; border-color: #e3e8f1; }
.notify-card.type-stock { background: #fffbf0; border-color: #fde68a; }
.notify-card.type-report { background: #f0f5ff; border-color: #bfdbfe; }

/* 紧急脉冲点 */
.urgent-pulse { position: absolute; top: 24rpx; right: 24rpx; }
.pulse-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #e53935; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0.5); }
  70% { box-shadow: 0 0 0 16rpx rgba(229, 57, 53, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0); }
}

.notify-top { display: flex; gap: 20rpx; align-items: flex-start; }
.notify-icon-circle { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.notify-icon-circle.icon-missed { background: #fee5e2; }
.notify-icon-circle.icon-vital { background: #fef3c7; }
.notify-icon-circle.icon-done { background: #e7f6ef; }
.notify-icon-circle.icon-stock { background: #fef3c7; }
.notify-icon-circle.icon-report { background: #dbeafe; }
.notify-icon { font-size: 36rpx; }

.notify-body { flex: 1; min-width: 0; }
.notify-title { font-size: 28rpx; font-weight: 700; color: #0f1f1a; display: block; }
.notify-desc { font-size: 24rpx; color: #5a6884; display: block; margin-top: 6rpx; line-height: 1.5; }
.notify-meta { display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx; }
.notify-time { font-size: 22rpx; color: #9aa3b0; font-family: 'Inter', sans-serif; }
.notify-who { font-size: 22rpx; color: #9aa3b0; }

.notify-action-row { margin-top: 20rpx; padding-top: 16rpx; border-top: 2rpx solid rgba(0,0,0,0.04); }
.notify-action-btn { padding: 14rpx 0; border-radius: 20rpx; text-align: center; }
.notify-action-btn.action-missed { background: #e53935; }
.notify-action-btn.action-missed .notify-action-text { color: #fff; }
.notify-action-btn.action-vital { background: #fef3c7; }
.notify-action-btn.action-vital .notify-action-text { color: #92400e; }
.notify-action-btn.action-stock { background: #fef3c7; }
.notify-action-btn.action-stock .notify-action-text { color: #92400e; }
.notify-action-btn.action-report { background: #dbeafe; }
.notify-action-btn.action-report .notify-action-text { color: #1e40af; }
.notify-action-btn.action-done { background: #e7f6ef; }
.notify-action-btn.action-done .notify-action-text { color: #078558; }
.notify-action-text { font-size: 24rpx; font-weight: 700; }

/* 底部 */
.footer-end { display: flex; align-items: center; gap: 20rpx; padding: 40rpx 60rpx; }
.footer-line { flex: 1; height: 2rpx; background: #e3e8f1; }
.footer-text { font-size: 22rpx; color: #9aa3b0; flex-shrink: 0; }
</style>
