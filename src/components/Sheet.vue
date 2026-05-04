<template>
  <view class="sheet-mask" @click.self="$emit('close')">
    <view class="sheet-body" @click.stop>
      <view class="sheet-handle" />
      <text class="sheet-title">{{ title }}</text>
      <text v-if="subtitle" class="sheet-subtitle">{{ subtitle }}</text>
      <view class="sheet-content">
        <slot />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
defineEmits(['close'])
</script>

<style scoped>
.sheet-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15,31,26,0.4);
  display: flex; align-items: flex-end;
  z-index: 100;
  animation: fadeIn 0.2s ease;
}
.sheet-body {
  background: #fff; width: 100%;
  border-radius: 40rpx 40rpx 0 0;
  padding: 24rpx 40rpx 64rpx;
  max-height: 85vh; overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(.2,.8,.2,1);
}
.sheet-handle {
  width: 72rpx; height: 8rpx;
  background: #e7eae8; border-radius: 4rpx;
  margin: 0 auto 24rpx;
}
.sheet-title { font-size: 34rpx; font-weight: 700; display: block; color: #0f1f1a; }
.sheet-subtitle { font-size: 24rpx; color: #6b7670; display: block; margin-top: 8rpx; }
.sheet-content { margin-top: 28rpx; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
