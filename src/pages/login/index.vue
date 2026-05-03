<template>
  <view class="container">
    <text class="title">{{ mode === 'login' ? '登录' : '注册' }}</text>

    <view v-if="!isLoading">
      <view v-if="mode === 'signup'" class="form-group">
        <text class="label">昵称</text>
        <u-input v-model="name" placeholder="如：张叔叔" border="surround" shape="circle" />
      </view>
      <view class="form-group">
        <text class="label">邮箱</text>
        <u-input v-model="email" placeholder="请输入邮箱" border="surround" shape="circle" />
      </view>
      <view class="form-group">
        <text class="label">密码</text>
        <u-input v-model="password" type="password" placeholder="请输入密码" border="surround" shape="circle" />
      </view>

      <u-button type="primary" shape="circle" :customStyle="{ marginTop: '24rpx', background: '#0b9d6a' }" @click="handleSubmit">
        {{ mode === 'login' ? '登录' : '注册' }}
      </u-button>

      <view class="switch-row">
        <text v-if="mode === 'login'" class="switch-text" @click="mode = 'signup'; error = ''">还没有账号？<text class="link">立即注册</text></text>
        <text v-else class="switch-text" @click="mode = 'login'; error = ''">已有账号？<text class="link">去登录</text></text>
      </view>
    </view>

    <view v-else class="loading">
      <u-loading-icon mode="circle" color="#0b9d6a" />
      <text class="loading-text">处理中...</text>
    </view>

    <text v-if="error" class="error">{{ error }}</text>
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
      uni.showToast({ title: '注册成功！请查收验证邮件后登录', icon: 'none' })
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
.container { padding: 48rpx; background: #fff; min-height: 100vh; }
.title { font-size: 44rpx; font-weight: 700; display: block; text-align: center; margin-bottom: 48rpx; }
.form-group { margin-bottom: 28rpx; }
.label { font-size: 26rpx; font-weight: 600; color: #6b7280; display: block; margin-bottom: 12rpx; }
.switch-row { text-align: center; margin-top: 32rpx; }
.switch-text { font-size: 26rpx; color: #6b7280; }
.link { color: #0b9d6a; font-weight: 600; }
.loading { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; gap: 16rpx; }
.loading-text { font-size: 28rpx; color: #6b7280; }
.error { display: block; text-align: center; color: #e53935; font-size: 26rpx; margin-top: 24rpx; }
</style>
