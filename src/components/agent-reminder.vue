<template>
  <view v-if="reminders.length > 0" class="reminder-wrap">
    <view v-for="(r, i) in reminders" :key="i" class="reminder-card" :class="r.type" @click="goToAssistant">
      <view class="reminder-avatar">💬</view>
      <view class="reminder-body">
        <text class="reminder-title">{{ r.title }}</text>
        <text class="reminder-desc">{{ r.desc }}</text>
      </view>
      <view class="reminder-close" @click.stop="dismiss(i)">✕</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { normalizeTime, getHourFromTime, getMedKey, getTodayStr } from '../utils/date'

const props = defineProps<{
  medications: any[]
  records: Record<string, string>
}>()

const dismissed = ref<number[]>([])

const reminders = computed(() => {
  const list: { type: string; title: string; desc: string }[] = []
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60

  // 检查漏服：已过时段但没打卡
  let missedCount = 0
  const missedNames: string[] = []
  props.medications.forEach(med => {
    if (!med.times) return
    med.times.forEach((t: string) => {
      const time = normalizeTime(t)
      const hour = getHourFromTime(time)
      // 只检查已过去的时段（当前时间超过该时段1小时以上）
      if (currentHour <= hour + 1) return
      const key = getMedKey(med.name, time)
      if (!props.records[key]) {
        missedCount++
        if (!missedNames.includes(med.name)) missedNames.push(med.name)
      }
    })
  })

  if (missedCount > 0) {
    list.push({
      type: 'warn',
      title: `💊 你有 ${missedCount} 次药还没吃`,
      desc: missedNames.join('、') + ' — 点击让小派帮你处理'
    })
  }

  // 检查库存紧张
  const urgentMeds: string[] = []
  props.medications.forEach(med => {
    const daily = med.daily_usage || 1
    const days = med.stock_count > 0 ? Math.floor(med.stock_count / daily) : 0
    if (days <= 7) urgentMeds.push(`${med.name}(${days}天)`)
  })

  if (urgentMeds.length > 0) {
    list.push({
      type: 'stock',
      title: '📦 有药品快吃完了',
      desc: urgentMeds.join('、') + ' — 记得续方哦'
    })
  }

  // 全部吃完的鼓励
  if (props.medications.length > 0 && missedCount === 0 && currentHour > 12) {
    const totalSlots = props.medications.reduce((s: number, m: any) => s + (m.times?.length || 1), 0)
    const doneCount = Object.values(props.records).filter(v => v.startsWith('done_')).length
    // 已过时段全部打卡了
    if (doneCount > 0) {
      list.push({
        type: 'good',
        title: '🎉 今天吃药很棒！',
        desc: `已完成 ${doneCount} 次服药，继续保持💪`
      })
    }
  }

  // 过滤已关闭的
  return list.filter((_, i) => !dismissed.value.includes(i))
})

const dismiss = (index: number) => {
  dismissed.value.push(index)
}

const goToAssistant = () => {
  uni.switchTab({ url: '/pages/assistant/index' })
}
</script>

<style scoped>
.reminder-wrap { margin-bottom: 16rpx; }
.reminder-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.reminder-card.warn {
  background: linear-gradient(135deg, #fff3e0, #fff8e1);
  border-left: 6rpx solid #f57c00;
}
.reminder-card.stock {
  background: linear-gradient(135deg, #ffebee, #fce4ec);
  border-left: 6rpx solid #e53935;
}
.reminder-card.good {
  background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
  border-left: 6rpx solid #0b9d6a;
}
.reminder-avatar {
  font-size: 40rpx;
  flex-shrink: 0;
}
.reminder-body { flex: 1; }
.reminder-title { font-size: 28rpx; font-weight: 600; display: block; }
.reminder-desc { font-size: 22rpx; color: #6b7280; display: block; margin-top: 4rpx; }
.reminder-close { font-size: 28rpx; color: #9ca3af; flex-shrink: 0; padding: 8rpx; }
</style>
