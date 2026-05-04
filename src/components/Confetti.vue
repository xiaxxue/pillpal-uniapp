<template>
  <view v-if="show" class="confetti-wrap">
    <view v-for="i in 12" :key="i" class="confetti-dot"
      :style="{
        background: colors[(i - 1) % colors.length],
        animationName: 'burst-' + i,
        animationDuration: '0.9s',
        animationTimingFunction: 'cubic-bezier(.2,.7,.3,1)',
        animationFillMode: 'forwards'
      }" />
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ trigger: number }>()
const show = ref(false)
const colors = ['#0b9d6a', '#26e69b', '#a7e6c8', '#f59e0b', '#7dd3a3']

watch(() => props.trigger, () => {
  if (props.trigger > 0) {
    show.value = true
    setTimeout(() => { show.value = false }, 1100)
  }
})
</script>

<style scoped>
.confetti-wrap {
  position: absolute; top: 50%; left: 50%;
  width: 0; height: 0; pointer-events: none; z-index: 999;
}
.confetti-dot {
  position: absolute; left: 0; top: 0;
  width: 12rpx; height: 12rpx; border-radius: 50%;
  opacity: 0;
}

/* 12 directions */
@keyframes burst-1  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(54rpx,-32rpx) scale(1);opacity:0} }
@keyframes burst-2  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(32rpx,-54rpx) scale(1);opacity:0} }
@keyframes burst-3  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(-10rpx,-60rpx) scale(1);opacity:0} }
@keyframes burst-4  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(-44rpx,-44rpx) scale(1);opacity:0} }
@keyframes burst-5  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(-60rpx,-10rpx) scale(1);opacity:0} }
@keyframes burst-6  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(-54rpx,32rpx) scale(1);opacity:0} }
@keyframes burst-7  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(-32rpx,54rpx) scale(1);opacity:0} }
@keyframes burst-8  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(10rpx,60rpx) scale(1);opacity:0} }
@keyframes burst-9  { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(44rpx,44rpx) scale(1);opacity:0} }
@keyframes burst-10 { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(60rpx,10rpx) scale(1);opacity:0} }
@keyframes burst-11 { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(48rpx,-20rpx) scale(1);opacity:0} }
@keyframes burst-12 { 0%{transform:translate(0,0) scale(0);opacity:1} 60%{opacity:1} 100%{transform:translate(-20rpx,48rpx) scale(1);opacity:0} }
</style>
