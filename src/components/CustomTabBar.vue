<template>
  <view class="tab-bar" :class="{ elder: elderMode }">
    <view class="tab-item" @click="switchTab('/pages/home/index')">
      <text class="tab-icon" :class="{ active: current === 'home' }">🏠</text>
      <text class="tab-label" :class="{ active: current === 'home' }">首页</text>
      <view v-if="pendingCount > 0 && current !== 'home'" class="tab-badge">{{ pendingCount }}</view>
    </view>

    <view class="tab-item" @click="switchTab('/pages/assistant/index')">
      <view class="tab-mascot" :class="{ active: current === 'assistant' }">
        <xiaopai :mood="current === 'assistant' ? 'happy' : 'idle'" :size="36" />
      </view>
      <text class="tab-label" :class="{ active: current === 'assistant' }">小派</text>
    </view>

    <!-- 中间凸起加号 -->
    <view class="tab-center" @click="$emit('add')">
      <view class="center-btn" :class="{ elder: elderMode }">
        <text class="center-icon">+</text>
      </view>
    </view>

    <view class="tab-item" @click="switchTab('/pages/stock/index')">
      <text class="tab-icon" :class="{ active: current === 'stock' }">📦</text>
      <text class="tab-label" :class="{ active: current === 'stock' }">库存</text>
    </view>

    <view class="tab-item" @click="switchTab('/pages/profile/index')">
      <text class="tab-icon" :class="{ active: current === 'profile' }">👤</text>
      <text class="tab-label" :class="{ active: current === 'profile' }">我的</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '../stores/user'
import { useMedicationsStore } from '../stores/medications'
import { useRecordsStore } from '../stores/records'
import Xiaopai from './Xiaopai.vue'

defineProps<{ current: string }>()
defineEmits(['add'])

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()
const elderMode = computed(() => userStore.elderMode)

const pendingCount = computed(() => {
  const total = medsStore.medications.reduce((s, m) => s + (m.times?.length || 1), 0)
  const done = Object.values(recordsStore.records).filter(v => v.startsWith('done_')).length
  return Math.max(0, total - done)
})

const switchTab = (url: string) => {
  uni.switchTab({ url })
}
</script>

<style scoped>
.tab-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(20px);
  border-top: 1rpx solid #e7eae8;
  padding: 16rpx 16rpx 52rpx;
  display: flex; justify-content: space-around; align-items: center;
  z-index: 100;
}
.tab-bar.elder {
  background: #fffdf8;
  border-top-color: #ece6d8;
  padding: 20rpx 16rpx 52rpx;
}

.tab-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 4rpx; min-width: 88rpx; position: relative;
}
.tab-icon { font-size: 44rpx; opacity: 0.5; }
.tab-icon.active { opacity: 1; }
.tab-label { font-size: 20rpx; font-weight: 500; color: #6b7670; }
.tab-label.active { color: #0b9d6a; font-weight: 700; }
.tab-bar.elder .tab-label { font-size: 24rpx; }

.tab-mascot {
  width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center;
  opacity: 0.6;
}
.tab-mascot.active { opacity: 1; }

.tab-badge {
  position: absolute; top: -4rpx; right: 4rpx;
  min-width: 28rpx; height: 28rpx; padding: 0 6rpx;
  border-radius: 14rpx; background: #e53935; color: #fff;
  font-size: 18rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 3rpx solid #fff;
}

/* 中间凸起 */
.tab-center { display: flex; align-items: center; justify-content: center; }
.center-btn {
  width: 108rpx; height: 108rpx; border-radius: 50%;
  background: linear-gradient(135deg, #0b9d6a, #26e69b);
  border: 8rpx solid #fff;
  box-shadow: 0 12rpx 32rpx rgba(11,157,106,0.35);
  display: flex; align-items: center; justify-content: center;
  margin-top: -56rpx;
}
.center-btn.elder {
  width: 120rpx; height: 120rpx;
  margin-top: -60rpx;
}
.center-icon { color: #fff; font-size: 48rpx; font-weight: 300; line-height: 1; }
.center-btn.elder .center-icon { font-size: 56rpx; }
</style>
