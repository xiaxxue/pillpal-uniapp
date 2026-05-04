<template>
  <view class="ring-wrap" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <!-- 背景圆 -->
    <view class="ring-bg" :style="ringStyle" />
    <!-- 进度圆 -->
    <view class="ring-fg" :style="fgStyle" />
    <!-- 中心内容 -->
    <view class="ring-center">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: number
  strokeWidth?: number
  value?: number
  total?: number
  color?: string
}>(), {
  size: 264,
  strokeWidth: 22,
  value: 0,
  total: 1,
  color: '#0b9d6a'
})

const pct = computed(() => props.total > 0 ? Math.min(1, props.value / props.total) : 0)

// 用 conic-gradient 模拟圆环
const ringStyle = computed(() => ({
  width: props.size + 'rpx',
  height: props.size + 'rpx',
  borderRadius: '50%',
  background: '#eef1ef'
}))

const fgStyle = computed(() => ({
  width: props.size + 'rpx',
  height: props.size + 'rpx',
  borderRadius: '50%',
  background: `conic-gradient(${props.color} ${pct.value * 360}deg, transparent ${pct.value * 360}deg)`,
  position: 'absolute',
  top: 0,
  left: 0
}))
</script>

<style scoped>
.ring-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ring-bg {
  position: absolute;
  top: 0; left: 0;
}
.ring-fg {
  transition: background 0.7s cubic-bezier(.2,.8,.2,1);
}
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
</style>
