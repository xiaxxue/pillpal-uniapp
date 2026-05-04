<template>
  <view class="capsule" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <view class="capsule-left" :style="{ background: fill, opacity: 0.55 }" />
    <view class="capsule-right" :style="{ background: fill }" />
  </view>
</template>

<script setup lang="ts">
defineProps<{ size?: number; fill?: string }>()
</script>

<style scoped>
.capsule { position: relative; display: flex; align-items: center; }
.capsule-left {
  width: 50%; height: 60%; border-radius: 999rpx 0 0 999rpx;
}
.capsule-right {
  width: 50%; height: 60%; border-radius: 0 999rpx 999rpx 0;
}
</style>
