<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="top-title">邀请家人</text>
      <view class="top-placeholder" />
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 患者信息卡 -->
      <view class="patient-card">
        <view class="patient-avatar">
          <text class="patient-initial">{{ patientInfo.name.charAt(0) }}</text>
        </view>
        <view class="patient-info">
          <text class="patient-name">{{ patientInfo.name }}</text>
          <text class="patient-sub">{{ patientInfo.relation }} · {{ patientInfo.medCount }}种用药</text>
        </view>
      </view>

      <!-- 权限设置 -->
      <view class="section-card">
        <text class="section-title">家人可操作的权限</text>
        <text class="section-desc">勾选后，被邀请人将拥有以下权限</text>

        <view class="perm-list">
          <view v-for="perm in permissions" :key="perm.id" class="perm-row">
            <view class="perm-left">
              <view class="perm-icon-wrap">
                <text class="perm-icon">{{ perm.icon }}</text>
              </view>
              <view class="perm-text">
                <view class="perm-title-row">
                  <text class="perm-name">{{ perm.name }}</text>
                  <view v-if="perm.tag" class="perm-tag" :class="perm.tagType">
                    <text class="perm-tag-text">{{ perm.tag }}</text>
                  </view>
                </view>
                <text class="perm-desc">{{ perm.desc }}</text>
              </view>
            </view>
            <view class="perm-toggle" :class="{ active: perm.enabled, locked: perm.locked }" @click="togglePerm(perm)">
              <view class="perm-toggle-knob" />
            </view>
          </view>
        </view>
      </view>

      <!-- 底部留白给按钮 -->
      <view style="height: 160rpx;" />
    </scroll-view>

    <!-- CTA 按钮 -->
    <view class="cta-wrap">
      <view class="cta-btn" @click="generateLink">
        <text class="cta-text">生成邀请链接</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

interface Permission {
  id: string
  icon: string
  name: string
  desc: string
  enabled: boolean
  locked: boolean
  tag?: string
  tagType?: string
}

/* ── Mock Data ── */
const patientInfo = reactive({
  name: '王淑芬',
  relation: '我的母亲',
  medCount: 4,
})

const permissions = reactive<Permission[]>([
  {
    id: 'view_records',
    icon: '📋',
    name: '查看用药记录',
    desc: '查看每日服药情况与历史',
    enabled: true,
    locked: true,
    tag: '必选',
    tagType: 'default',
  },
  {
    id: 'push_alert',
    icon: '🔔',
    name: '接收异常推送',
    desc: '漏服、超时未服药时收到通知',
    enabled: true,
    locked: false,
  },
  {
    id: 'send_remind',
    icon: '⏰',
    name: '代发提醒',
    desc: '代替患者设置服药提醒时间',
    enabled: true,
    locked: false,
  },
  {
    id: 'order_med',
    icon: '🛒',
    name: '代下单购药',
    desc: '药品不足时帮助下单购买',
    enabled: false,
    locked: false,
  },
  {
    id: 'edit_plan',
    icon: '✏️',
    name: '代改用药计划',
    desc: '修改剂量、时间等需患者审核',
    enabled: false,
    locked: false,
    tag: '需审核',
    tagType: 'danger',
  },
  {
    id: 'view_vitals',
    icon: '❤️',
    name: '查看体征数据',
    desc: '查看血压、血糖等健康数据',
    enabled: false,
    locked: false,
  },
])

function togglePerm(perm: Permission) {
  if (perm.locked) return
  perm.enabled = !perm.enabled
}

function goBack() {
  uni.navigateBack()
}

function generateLink() {
  const enabledPerms = permissions.filter((p) => p.enabled).map((p) => p.name)
  uni.showToast({ title: '邀请链接已生成', icon: 'none' })
  console.log('已选权限:', enabledPerms)
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f4f7fb;
  display: flex;
  flex-direction: column;
  position: relative;
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

/* ── Patient card ── */
.patient-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  gap: 24rpx;
}
.patient-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #0b9d6a, #34d399);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.patient-initial {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}
.patient-info {
  display: flex;
  flex-direction: column;
}
.patient-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.patient-sub {
  font-size: 26rpx;
  color: #888;
  margin-top: 6rpx;
}

/* ── Section card ── */
.section-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  display: block;
}
.section-desc {
  font-size: 24rpx;
  color: #aaa;
  display: block;
  margin-top: 8rpx;
  margin-bottom: 28rpx;
}

/* ── Permission list ── */
.perm-list {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.perm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.perm-row:last-child {
  border-bottom: none;
}
.perm-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}
.perm-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  background: #f4f7fb;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.perm-icon {
  font-size: 36rpx;
}
.perm-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.perm-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.perm-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.perm-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.perm-tag.default {
  background: #e7f6ef;
}
.perm-tag.danger {
  background: #fef2f2;
}
.perm-tag-text {
  font-size: 20rpx;
  font-weight: 600;
}
.perm-tag.default .perm-tag-text {
  color: #0b9d6a;
}
.perm-tag.danger .perm-tag-text {
  color: #ef4444;
}
.perm-desc {
  font-size: 24rpx;
  color: #aaa;
  margin-top: 4rpx;
}

/* ── Toggle ── */
.perm-toggle {
  width: 88rpx;
  height: 48rpx;
  border-radius: 24rpx;
  background: #ddd;
  display: flex;
  align-items: center;
  padding: 4rpx;
  flex-shrink: 0;
  transition: background 0.2s;
}
.perm-toggle.active {
  background: #0b9d6a;
}
.perm-toggle.locked {
  opacity: 0.6;
}
.perm-toggle-knob {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
}
.perm-toggle.active .perm-toggle-knob {
  transform: translateX(40rpx);
}

/* ── CTA ── */
.cta-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
}
.cta-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #0b9d6a, #10b981);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}
</style>
