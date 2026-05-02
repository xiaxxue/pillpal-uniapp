<template>
  <view class="container">
    <text class="title">{{ mode === 'login' ? '登录' : '注册' }}</text>

    <view v-if="!isLoading">
      <view v-if="mode === 'signup'" class="form-group">
        <text class="label">昵称</text>
        <input class="input" v-model="name" placeholder="如：张叔叔" />
      </view>
      <view class="form-group">
        <text class="label">邮箱</text>
        <input class="input" v-model="email" type="text" placeholder="请输入邮箱" />
      </view>
      <view class="form-group">
        <text class="label">密码</text>
        <input class="input" v-model="password" type="password" :password="true" placeholder="请输入密码" />
      </view>

      <button class="btn-primary" @click="handleSubmit">{{ mode === 'login' ? '登录' : '注册' }}</button>

      <view class="switch-row">
        <text v-if="mode === 'login'" @click="mode = 'signup'; error = ''">还没有账号？立即注册</text>
        <text v-else @click="mode = 'login'; error = ''">已有账号？去登录</text>
      </view>
    </view>

    <view v-else class="loading">
      <text>处理中...</text>
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
      // 加载数据
      if (userStore.user) {
        await medsStore.fetchAll(userStore.user.id)
        await recordsStore.loadRecords(userStore.user.id)
      }
      // 进入对应角色
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
.form-group { margin-bottom: 24rpx; }
.label { font-size: 26rpx; font-weight: 600; color: #6b7280; display: block; margin-bottom: 8rpx; }
.input { width: 100%; padding: 20rpx 24rpx; border: 2rpx solid #e5e7eb; border-radius: 16rpx; font-size: 30rpx; background: #f4f6f8; }
.btn-primary { width: 100%; padding: 24rpx; background: #0b9d6a; color: #fff; border-radius: 16rpx; font-size: 32rpx; font-weight: 600; margin-top: 24rpx; border: none; }
.switch-row { text-align: center; margin-top: 24rpx; font-size: 26rpx; color: #6b7280; }
.switch-row text { color: #0b9d6a; font-weight: 600; }
.loading { text-align: center; padding: 80rpx 0; color: #6b7280; }
.error { display: block; text-align: center; color: #e53935; font-size: 26rpx; margin-top: 24rpx; }
</style>
