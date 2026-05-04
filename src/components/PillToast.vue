<template>
  <view v-if="visible" class="toast-wrap" :class="kind">
    <view class="toast-icon">
      <text v-if="kind === 'ok'">✓</text>
      <text v-else>⚠</text>
    </view>
    <text class="toast-text">{{ text }}</text>
    <text v-if="undoable" class="toast-undo" @click="$emit('undo')">撤销</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  text: string
  kind?: string
  undoable?: boolean
}>()
defineEmits(['undo'])
</script>

<style scoped>
.toast-wrap {
  position: fixed; left: 32rpx; right: 32rpx; top: 112rpx;
  background: rgba(15,31,26,0.94); color: #fff;
  padding: 20rpx 28rpx; border-radius: 28rpx;
  font-size: 26rpx; font-weight: 500;
  box-shadow: 0 24rpx 56rpx rgba(0,0,0,0.22);
  z-index: 1000;
  display: flex; align-items: center; gap: 20rpx;
  animation: toastIn 0.3s cubic-bezier(.2,.9,.3,1.2);
}
.toast-wrap.err { background: #7c1a1a; }
.toast-icon { flex-shrink: 0; font-size: 28rpx; }
.toast-wrap.ok .toast-icon { color: #26e69b; }
.toast-wrap.err .toast-icon { color: #fff; }
.toast-text { flex: 1; min-width: 0; }
.toast-undo {
  color: #26e69b; font-size: 26rpx; font-weight: 700;
  flex-shrink: 0; padding: 4rpx 8rpx;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(-16rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
