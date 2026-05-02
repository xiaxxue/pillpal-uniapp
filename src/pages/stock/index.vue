<template>
  <view class="page">
    <scroll-view scroll-y class="content">
      <view class="overview">
        <view class="ov-item"><text class="ov-num">{{ medications.length }}</text><text class="ov-label">正在吃的药</text></view>
        <view class="ov-item"><text class="ov-num warn">{{ urgentCount }}</text><text class="ov-label">快吃完了</text></view>
        <view class="ov-item"><text class="ov-num">{{ weeklyTotal }}</text><text class="ov-label">一周用量/片</text></view>
      </view>

      <view v-if="medications.length === 0" class="empty">
        <text>📦</text>
        <text>还没有药品</text>
      </view>

      <view v-for="med in medications" :key="med.id" class="stock-card" :class="{ urgent: isUrgent(med) }">
        <view class="stock-header">
          <text class="stock-name">{{ med.name }}</text>
          <text class="stock-tag" :class="isUrgent(med) ? 'tag-urgent' : 'tag-ok'">{{ isUrgent(med) ? '快吃完了' : '充足' }}</text>
        </view>
        <text class="stock-spec">{{ med.dosage }}</text>
        <view class="meter"><view class="meter-fill" :class="isUrgent(med) ? 'fill-urgent' : 'fill-ok'" :style="{ width: getPct(med) + '%' }" /></view>
        <text class="meter-text">剩余 {{ med.stock_count }} 片</text>
        <view class="stock-info">
          <view><text class="info-label">日均</text><text>{{ med.daily_usage || 1 }}片/天</text></view>
          <view><text class="info-label">可服</text><text>{{ getDays(med) }}天</text></view>
        </view>
        <view class="stock-actions">
          <button class="btn-edit" @click="handleEdit(med)">修正</button>
          <button class="btn-del" @click="handleDelete(med)">删除</button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const medications = computed(() => medsStore.medications)

const getDays = (med: any) => med.stock_count > 0 ? Math.floor(med.stock_count / (med.daily_usage || 1)) : 0
const isUrgent = (med: any) => getDays(med) <= 7
const getPct = (med: any) => Math.min(100, Math.round((getDays(med) / 60) * 100))
const urgentCount = computed(() => medications.value.filter(m => isUrgent(m)).length)
const weeklyTotal = computed(() => medications.value.reduce((s, m) => s + (m.daily_usage || 1) * 7, 0))

const handleEdit = (med: any) => {
  uni.showModal({
    title: '修正 ' + med.name,
    editable: true,
    placeholderText: '输入新的库存数量',
    content: String(med.stock_count),
    success: async (res) => {
      if (res.confirm && res.content) {
        const qty = parseInt(res.content) || 0
        await medsStore.update(userStore.user.id, med.id, { stock_count: qty })
        uni.showToast({ title: '已修正', icon: 'success' })
      }
    }
  })
}

const handleDelete = (med: any) => {
  uni.showModal({
    title: '删除药品',
    content: '确定要删除「' + med.name + '」吗？删除后无法恢复。',
    success: async (res) => {
      if (res.confirm) {
        await medsStore.remove(userStore.user.id, med.id)
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    }
  })
}

onShow(async () => {
  if (userStore.user) await medsStore.fetchAll(userStore.user.id)
})
</script>

<style scoped>
.page { background: #f4f6f8; min-height: 100vh; }
.content { padding: 24rpx; }
.overview { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.ov-item { flex: 1; background: #fff; border-radius: 16rpx; padding: 24rpx; text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.ov-num { font-size: 44rpx; font-weight: 700; color: #0b9d6a; display: block; }
.ov-num.warn { color: #e53935; }
.ov-label { font-size: 22rpx; color: #6b7280; display: block; margin-top: 8rpx; }
.empty { text-align: center; padding: 80rpx 0; font-size: 28rpx; color: #9ca3af; }

.stock-card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.stock-card.urgent { border-left: 6rpx solid #e53935; }
.stock-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.stock-name { font-size: 32rpx; font-weight: 600; }
.stock-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 30rpx; font-weight: 500; }
.tag-urgent { background: #ffebee; color: #e53935; }
.tag-ok { background: #e6f7f0; color: #0b9d6a; }
.stock-spec { font-size: 24rpx; color: #6b7280; display: block; margin-bottom: 16rpx; }
.meter { height: 12rpx; background: #e5e7eb; border-radius: 6rpx; overflow: hidden; }
.meter-fill { height: 100%; border-radius: 6rpx; }
.fill-urgent { background: linear-gradient(90deg, #e53935, #f57c00); }
.fill-ok { background: linear-gradient(90deg, #0b9d6a, #0abf7f); }
.meter-text { font-size: 22rpx; color: #6b7280; text-align: right; display: block; margin-top: 6rpx; }
.stock-info { display: flex; justify-content: space-around; margin: 16rpx 0; font-size: 28rpx; font-weight: 600; }
.info-label { font-size: 22rpx; color: #6b7280; font-weight: 400; display: block; margin-bottom: 4rpx; }
.stock-actions { display: flex; gap: 16rpx; }
.btn-edit { flex: 1; padding: 16rpx; background: #f4f6f8; color: #6b7280; border-radius: 12rpx; font-size: 26rpx; border: none; }
.btn-del { padding: 16rpx 24rpx; background: #f4f6f8; color: #e53935; border-radius: 12rpx; font-size: 26rpx; border: none; }
</style>
