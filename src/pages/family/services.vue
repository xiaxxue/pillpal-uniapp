<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <text class="page-title">服务</text>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 黄色提醒 Banner -->
      <view class="refill-banner">
        <view class="refill-body">
          <text class="refill-icon">💊</text>
          <view class="refill-info">
            <text class="refill-title">爸爸降糖药剩 3 天</text>
            <text class="refill-sub">建议提前续方，避免断药</text>
          </view>
        </view>
        <view class="refill-btn" @click="onRefill">
          <text class="refill-btn-text">立即续方</text>
        </view>
      </view>

      <!-- 常用服务 -->
      <view class="section-wrap">
        <text class="section-label">常用服务</text>
        <view class="service-grid">
          <view
            v-for="item in services"
            :key="item.label"
            class="service-card"
            @click="onService(item.label)"
          >
            <view class="service-icon-row">
              <text class="service-icon">{{ item.icon }}</text>
              <view v-if="item.badge" class="service-badge" :class="item.badgeColor">
                <text>{{ item.badge }}</text>
              </view>
            </view>
            <text class="service-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 我的订单 -->
      <view class="section-wrap">
        <view class="section-header">
          <text class="section-label">我的订单</text>
          <text class="section-more" @click="onAllOrders">全部 ›</text>
        </view>
        <view class="order-list">
          <view
            v-for="order in orders"
            :key="order.id"
            class="order-card"
            @click="onOrderDetail(order.id)"
          >
            <view class="order-top">
              <text class="order-name">{{ order.name }}</text>
              <view class="order-status-badge" :class="order.statusClass">
                <text>{{ order.statusText }}</text>
              </view>
            </view>
            <view class="order-bottom">
              <text class="order-detail">{{ order.detail }}</text>
              <text class="order-time">{{ order.time }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 为家人准备 -->
      <view class="section-wrap">
        <text class="section-label">为家人准备</text>
        <scroll-view scroll-x class="recommend-scroll">
          <view class="recommend-list">
            <view
              v-for="item in recommends"
              :key="item.title"
              class="recommend-card"
              @click="onRecommend(item.title)"
            >
              <view class="recommend-img">
                <text class="recommend-img-icon">{{ item.icon }}</text>
              </view>
              <text class="recommend-title">{{ item.title }}</text>
              <text class="recommend-price">{{ item.price }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view style="height: 160rpx;" />
    </scroll-view>

    <family-tab-bar current="services" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FamilyTabBar from '../../components/FamilyTabBar.vue'

interface ServiceItem {
  icon: string
  label: string
  badge?: string
  badgeColor?: string
}

interface OrderItem {
  id: string
  name: string
  detail: string
  time: string
  statusText: string
  statusClass: string
}

interface RecommendItem {
  icon: string
  title: string
  price: string
}

const services = ref<ServiceItem[]>([
  { icon: '💊', label: '代下单购药', badge: '热门', badgeColor: 'badge-green' },
  { icon: '📋', label: '处方续方', badge: '医保', badgeColor: 'badge-blue' },
  { icon: '👨‍⚕️', label: '在线问医生' },
  { icon: '🏠', label: '家庭药箱' },
  { icon: '🏥', label: '上门护理' },
  { icon: '⌚', label: '体征监测设备' },
])

const orders = ref<OrderItem[]>([
  {
    id: '1',
    name: '二甲双胍缓释片 × 2 盒',
    detail: '顺丰快递 · SF1234567890',
    time: '05-01 下单',
    statusText: '待发货',
    statusClass: 'status-pending',
  },
  {
    id: '2',
    name: '阿卡波糖片 × 1 盒',
    detail: '已签收 · 爸爸已确认',
    time: '04-26 完成',
    statusText: '已完成',
    statusClass: 'status-done',
  },
])

const recommends = ref<RecommendItem[]>([
  { icon: '🥗', title: '三高营养餐', price: '¥128/周' },
  { icon: '🩺', title: '体检套餐', price: '¥399' },
  { icon: '⌚', title: '防跌倒手环', price: '¥259' },
])

const onRefill = () => {
  uni.showToast({ title: '正在跳转续方页面', icon: 'none' })
}

const onService = (label: string) => {
  uni.showToast({ title: label, icon: 'none' })
}

const onAllOrders = () => {
  uni.showToast({ title: '查看全部订单', icon: 'none' })
}

const onOrderDetail = (id: string) => {
  uni.showToast({ title: `订单详情 ${id}`, icon: 'none' })
}

const onRecommend = (title: string) => {
  uni.showToast({ title, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  background: #f4f7fb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-bar {
  padding: 24rpx 36rpx 16rpx;
}
.page-title {
  font-size: 38rpx;
  font-weight: 800;
  color: #0f1f1a;
  display: block;
}

.main-scroll {
  flex: 1;
}

/* 续方 Banner */
.refill-banner {
  margin: 20rpx 28rpx 0;
  padding: 28rpx 32rpx;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.refill-body {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}
.refill-icon {
  font-size: 44rpx;
  flex-shrink: 0;
}
.refill-info {
  flex: 1;
  min-width: 0;
}
.refill-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #451a03;
  display: block;
}
.refill-sub {
  font-size: 22rpx;
  color: #78350f;
  display: block;
  margin-top: 4rpx;
}
.refill-btn {
  padding: 14rpx 32rpx;
  background: #451a03;
  border-radius: 20rpx;
  flex-shrink: 0;
}
.refill-btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fef3c7;
}

/* Section */
.section-wrap {
  padding: 32rpx 28rpx 0;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
}
.section-label {
  font-size: 22rpx;
  color: #5a6884;
  font-weight: 600;
  letter-spacing: 1rpx;
  display: block;
  margin-bottom: 16rpx;
}
.section-more {
  font-size: 22rpx;
  color: #5a6884;
  margin-bottom: 16rpx;
}

/* 常用服务网格 */
.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.service-card {
  background: #fff;
  border: 2rpx solid #e3e8f1;
  border-radius: 28rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.service-icon-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.service-icon {
  font-size: 44rpx;
}
.service-badge {
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 600;
}
.service-badge.badge-green {
  background: #e7f6ef;
  color: #078558;
}
.service-badge.badge-blue {
  background: #e0f2fe;
  color: #0369a1;
}
.service-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #0f1f1a;
}

/* 订单列表 */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.order-card {
  background: #fff;
  border: 2rpx solid #e3e8f1;
  border-radius: 28rpx;
  padding: 24rpx 28rpx;
}
.order-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.order-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #0f1f1a;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-status-badge {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
  flex-shrink: 0;
}
.order-status-badge.status-pending {
  background: #fff7e8;
  color: #a06a18;
}
.order-status-badge.status-done {
  background: #e7f6ef;
  color: #078558;
}
.order-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}
.order-detail {
  font-size: 22rpx;
  color: #5a6884;
}
.order-time {
  font-size: 20rpx;
  color: #9aa3ae;
  flex-shrink: 0;
}

/* 推荐横滑 */
.recommend-scroll {
  white-space: nowrap;
}
.recommend-list {
  display: inline-flex;
  gap: 20rpx;
  padding-bottom: 8rpx;
}
.recommend-card {
  width: 280rpx;
  background: #fff;
  border: 2rpx solid #e3e8f1;
  border-radius: 28rpx;
  overflow: hidden;
  display: inline-flex;
  flex-direction: column;
  flex-shrink: 0;
}
.recommend-img {
  width: 100%;
  height: 200rpx;
  background: linear-gradient(135deg, #e0f2fe, #f0fdf4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.recommend-img-icon {
  font-size: 72rpx;
}
.recommend-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #0f1f1a;
  padding: 16rpx 20rpx 4rpx;
  white-space: normal;
}
.recommend-price {
  font-size: 24rpx;
  font-weight: 700;
  color: #e53935;
  padding: 0 20rpx 20rpx;
}
</style>
