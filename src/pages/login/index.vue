<template>
  <view class="page">
    <!-- 返回按钮 -->
    <view class="back-btn" @click="goBack">
      <text class="back-icon">‹</text>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 欢迎 -->
      <view class="hello">
        <view class="hello-row">
          <text class="hello-emoji">👋</text>
          <text class="hello-title">{{ mode === 'login' ? '欢迎回来' : mode === 'forgot' ? '重置密码' : '创建账号' }}</text>
        </view>
        <text class="hello-desc">{{ mode === 'login' ? '登录后继续管理用药' : mode === 'forgot' ? '输入邮箱，我们会发送重置链接' : '注册后开始使用 PillPal' }}</text>
      </view>

      <!-- 表单 -->
      <view v-if="mode !== 'forgot'" class="form">
        <view v-if="mode === 'signup'" class="field">
          <text class="field-label">昵称</text>
          <view class="field-box">
            <text class="field-icon">👤</text>
            <input class="field-input" :value="name" @input="name = $event.detail.value" placeholder="如：张叔叔" />
          </view>
        </view>

        <view class="field">
          <text class="field-label">邮箱</text>
          <view class="field-box">
            <text class="field-icon">✉</text>
            <input class="field-input" :value="email" @input="email = $event.detail.value" placeholder="请输入邮箱" />
          </view>
        </view>

        <view class="field">
          <view class="field-label-row">
            <text class="field-label">密码</text>
            <text v-if="mode === 'login'" class="forgot-link" @click="mode = 'forgot'">忘记密码？</text>
          </view>
          <view class="field-box">
            <text class="field-icon">🔒</text>
            <input class="field-input" :value="password" @input="password = $event.detail.value" password placeholder="至少6位" />
          </view>
        </view>

        <button class="btn-submit" @click="handleSubmit" :disabled="isLoading">
          {{ isLoading ? '请稍候...' : mode === 'login' ? '登录' : '注册' }}
        </button>

        <!-- 分割线 -->
        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">或使用</text>
          <view class="divider-line" />
        </view>

        <!-- 社交登录 -->
        <view class="social-row">
          <view class="social-btn">
            <text class="social-icon">💬</text>
            <text class="social-text">微信</text>
          </view>
          <view class="social-btn">
            <text class="social-icon">📱</text>
            <text class="social-text">手机号</text>
          </view>
        </view>

        <view class="switch-area">
          <text class="switch-text" @click="toggleMode">
            {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
            <text class="switch-link">{{ mode === 'login' ? '立即注册' : '去登录' }}</text>
          </text>
        </view>
      </view>

      <!-- 忘记密码 -->
      <view v-else class="form">
        <view class="field">
          <text class="field-label">注册邮箱</text>
          <view class="field-box">
            <text class="field-icon">✉</text>
            <input class="field-input" :value="resetEmail" @input="resetEmail = $event.detail.value" placeholder="请输入注册邮箱" />
          </view>
        </view>
        <button class="btn-submit" @click="handleResetPassword" :disabled="isLoading">发送重置邮件</button>
        <view class="switch-area">
          <text class="switch-link" @click="mode = 'login'">← 返回登录</text>
        </view>
      </view>

      <!-- 错误提示 -->
      <view v-if="error" class="error-box">
        <text class="error-icon">⚠</text>
        <text class="error-text">{{ error }}</text>
      </view>

      <!-- 协议 -->
      <text class="agreement">登录即表示同意《服务协议》和《隐私政策》</text>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { useRecordsStore } from '../../stores/records'
import { supabase } from '../../utils/supabase'

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
const resetEmail = ref('')

onLoad((options) => { if (options?.role) role.value = options.role })

const goBack = () => uni.navigateBack()
const toggleMode = () => { mode.value = mode.value === 'login' ? 'signup' : 'login'; error.value = '' }

const handleResetPassword = async () => {
  if (!resetEmail.value) { error.value = '请输入邮箱'; return }
  error.value = ''; isLoading.value = true
  const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail.value, { redirectTo: 'http://localhost:5173' })
  isLoading.value = false
  if (err) { error.value = err.message }
  else { uni.showToast({ title: '重置邮件已发送，请查收', icon: 'none', duration: 3000 }); mode.value = 'login' }
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
    if (err) { error.value = err.message.includes('already') ? '该邮箱已注册，请直接登录' : err.message }
    else { mode.value = 'login'; uni.showToast({ title: '注册成功！请查收验证邮件后登录', icon: 'none', duration: 3000 }) }
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
        const onboarded = uni.getStorageSync('onboarded_' + userStore.user.id)
        if (!onboarded && role.value === 'patient') { uni.redirectTo({ url: '/pages/onboarding/index' }); return }
      }
      if (role.value === 'patient') uni.switchTab({ url: '/pages/home/index' })
      else uni.navigateTo({ url: '/pages/family/home' })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }

.back-btn { padding: 24rpx 32rpx; }
.back-icon { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: #f6f8f7; display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #0f1f1a; font-weight: 300; }

.main-scroll { flex: 1; padding: 0 56rpx; }

/* 欢迎 */
.hello { margin-bottom: 64rpx; }
.hello-row { display: flex; align-items: center; gap: 20rpx; margin-bottom: 12rpx; }
.hello-emoji { font-size: 60rpx; }
.hello-title { font-size: 56rpx; font-weight: 800; color: #0f1f1a; letter-spacing: -1rpx; }
.hello-desc { font-size: 28rpx; color: #6b7670; }

/* 表单 */
.form { display: flex; flex-direction: column; gap: 32rpx; }
.field-label { font-size: 24rpx; color: #6b7670; font-weight: 600; display: block; margin-bottom: 16rpx; }
.field-label-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16rpx; }
.forgot-link { font-size: 22rpx; color: #0b9d6a; font-weight: 600; }

.field-box {
  height: 100rpx; background: #f6f8f7; border: 3rpx solid #e7eae8;
  border-radius: 28rpx; display: flex; align-items: center; padding: 0 32rpx; gap: 20rpx;
}
.field-icon { font-size: 32rpx; flex-shrink: 0; }
.field-input { flex: 1; font-size: 30rpx; color: #0f1f1a; background: transparent; border: none; }

.btn-submit {
  height: 104rpx; background: linear-gradient(135deg, #0b9d6a, #079a66);
  color: #fff; border: none; border-radius: 28rpx;
  font-size: 32rpx; font-weight: 700;
  box-shadow: 0 16rpx 40rpx rgba(11,157,106,0.3);
  margin-top: 16rpx;
}

/* 分割线 */
.divider { display: flex; align-items: center; gap: 24rpx; margin: 8rpx 0; }
.divider-line { flex: 1; height: 2rpx; background: #eef1ef; }
.divider-text { font-size: 22rpx; color: #9aa39e; }

/* 社交登录 */
.social-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.social-btn {
  height: 96rpx; background: #f6f8f7; border: 2rpx solid #e7eae8;
  border-radius: 28rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx;
}
.social-icon { font-size: 36rpx; }
.social-text { font-size: 26rpx; font-weight: 600; color: #0f1f1a; }

.switch-area { text-align: center; }
.switch-text { font-size: 26rpx; color: #6b7670; }
.switch-link { color: #0b9d6a; font-weight: 700; }

/* 错误 */
.error-box {
  display: flex; align-items: center; gap: 12rpx; justify-content: center;
  margin-top: 28rpx; padding: 20rpx 28rpx;
  background: #fee9e9; border-radius: 24rpx;
}
.error-icon { font-size: 28rpx; }
.error-text { font-size: 26rpx; color: #dc2626; }

.agreement { text-align: center; margin-top: 96rpx; font-size: 20rpx; color: #9aa39e; display: block; padding-bottom: 40rpx; line-height: 1.6; }
</style>
