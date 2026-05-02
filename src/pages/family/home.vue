<template>
  <view class="page">
    <text class="title">家属监护</text>
    <text class="desc">绑定家人后，可以查看他们的用药情况</text>
    <text class="placeholder">家属模式（开发中）</text>
    <button class="btn-back" @click="goBack">返回角色选择</button>
  </view>
</template>

<script setup lang="ts">
const goBack = () => {
  uni.removeStorageSync('last_role')
  uni.reLaunch({ url: '/pages/role-select/index' })
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 48rpx; }
.title { font-size: 44rpx; font-weight: 700; display: block; margin-bottom: 16rpx; }
.desc { font-size: 28rpx; color: #6b7280; display: block; margin-bottom: 24rpx; }
.placeholder { font-size: 28rpx; color: #9ca3af; display: block; margin-bottom: 48rpx; }
.btn-back { padding: 24rpx 48rpx; background: #f4f6f8; color: #6b7280; border-radius: 16rpx; font-size: 28rpx; border: none; }
</style>
