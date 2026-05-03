<template>
  <view class="page">
    <view class="header">
      <text class="header-emoji">{{ mode === 'login' ? '👋' : '🎉' }}</text>
      <text class="header-title">{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</text>
      <text class="header-desc">{{ mode === 'login' ? '登录后继续管理用药' : '注册后开始使用 PillPal' }}</text>
    </view>

    <view class="form" v-if="!isLoading">
      <view v-if="mode === 'signup'" class="form-item">
        <text class="label">昵称</text>
        <u-input v-model="name" placeholder="如：张叔叔" border="surround" shape="circle" clearable />
      </view>

      <view class="form-item">
        <text class="label">邮箱</text>
        <u-input v-model="email" placeholder="请输入邮箱" border="surround" shape="circle" clearable />
      </view>

      <view class="form-item">
        <text class="label">密码</text>
        <u-input v-model="password" type="password" placeholder="至少6位" border="surround" shape="circle" />
      </view>

      <u-button
        type="primary"
        shape="circle"
        size="large"
        :customStyle="{ marginTop: '40rpx', background: 'linear-gradient(135deg, #0b9d6a, #0abf7f)', border: 'none' }"
        @click="handleSubmit"
      >
        {{ mode === 'login' ? '登录' : '注册' }}
      </u-button>

      <view class="switch-area">
        <text class="switch-text" @click="toggleMode">
          {{ mode === 'login' ? '没有账号？' : '已有账号？' }}
          <text class="switch-link">{{ mode === 'login' ? '立即注册' : '去登录' }}</text>
        </text>
      </view>

      <view v-if="error" class="error-box">
        <u-icon name="error-circle" color="#e53935" size="28" />
        <text class="error-text">{{ error }}</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-else class="loading-area">
      <u-loading-icon mode="semicircle" color="#0b9d6a" size="80" />
      <text class="loading-text">{{ mode === 'login' ? '正在登录...' : '正在注册...' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const recordsStore = useRecordsStore()

const mode = ref('login')
const email = ref('')
const password = ref('')
const name = ref('')
const error = ref('')
const isLoading = ref(false)
const role = ref('patient')

onLoad((options) => {
  if (options?.role) role.value = options.role
})

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  error.value = ''
}

const handleSubmit = async () => {
  error.value = ''
  if (mode.value === 'signup' && !name.value) { error.value = '请输入昵称'; return }
  if (!email.value) { error.value = '请输入邮箱'; return }
  if (!password.value || password.value.length < 6) { error.value = '密码至少6位'; return }

  isLoading.value = true

  if (mode.value === 'signup') {
    const { error: err } = await userStore.signUp(email.value, password.value, name.value)
    isLoading.value = false
    if (err) {
      error.value = err.message.includes('already') ? '该邮箱已注册，请直接登录' : err.message
    } else {
      mode.value = 'login'
      uni.showToast({ title: '注册成功！请查收验证邮件后登录', icon: 'none', duration: 3000 })
    }
  } else {
    const { error: err } = await userStore.signIn(email.value, password.value)
    isLoading.value = false
    if (err) {
      let msg = err.message
      if (msg.includes('Invalid login')) msg = '邮箱或密码错误'
      if (msg.includes('Email not confirmed')) msg = '请先去邮箱点击验证链接'
      error.value = msg
    } else {
      uni.showToast({ title: '登录成功', icon: 'success' })
      if (userStore.user) {
        await medsStore.fetchAll(userStore.user.id)
        await recordsStore.loadRecords(userStore.user.id)
      }
      if (role.value === 'patient') {
        uni.switchTab({ url: '/pages/home/index' })
      } else {
        uni.navigateTo({ url: '/pages/family/home' })
      }
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #fff; padding: 0 48rpx; }

.header { padding-top: 120rpx; margin-bottom: 60rpx; }
.header-emoji { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
.header-title { font-size: 48rpx; font-weight: 800; display: block; color: #1a1a2e; }
.header-desc { font-size: 28rpx; color: #6b7280; display: block; margin-top: 8rpx; }

.form-item { margin-bottom: 28rpx; }
.label { font-size: 26rpx; font-weight: 600; color: #374151; display: block; margin-bottom: 12rpx; }

.switch-area { text-align: center; margin-top: 36rpx; }
.switch-text { font-size: 26rpx; color: #6b7280; }
.switch-link { color: #0b9d6a; font-weight: 600; }

.error-box {
  display: flex; align-items: center; gap: 12rpx;
  justify-content: center; margin-top: 28rpx;
  padding: 16rpx 24rpx; background: #ffebee;
  border-radius: 16rpx;
}
.error-text { font-size: 26rpx; color: #e53935; }

.loading-area {
  display: flex; flex-direction: column; align-items: center;
  padding-top: 200rpx; gap: 24rpx;
}
.loading-text { font-size: 28rpx; color: #6b7280; }
</style>
