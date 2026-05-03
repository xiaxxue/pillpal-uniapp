<template>
  <view class="page">
    <!-- 步骤指示器 -->
    <view class="steps">
      <view v-for="s in 3" :key="s" class="step-dot" :class="{ active: step >= s, current: step === s }">
        <text class="step-num">{{ s }}</text>
      </view>
    </view>

    <!-- 第1步：基本信息 -->
    <view v-if="step === 1" class="step-content">
      <text class="step-emoji">👋</text>
      <text class="step-title">欢迎使用 PillPal!</text>
      <text class="step-desc">先告诉我一些基本信息</text>

      <view class="form-item">
        <text class="label">你的称呼</text>
        <input class="ipt" :value="userName" @input="userName = $event.detail.value" placeholder="如：张叔叔、小王" />
      </view>

      <view class="form-item">
        <text class="label">年龄</text>
        <input class="ipt" type="number" :value="age" @input="age = $event.detail.value" placeholder="如：58" />
      </view>

      <view class="form-item">
        <text class="label">性别</text>
        <view class="picker-row">
          <view class="pick-btn" :class="{ selected: gender === 'male' }" @click="gender = 'male'">
            <text>👨 男</text>
          </view>
          <view class="pick-btn" :class="{ selected: gender === 'female' }" @click="gender = 'female'">
            <text>👩 女</text>
          </view>
        </view>
      </view>

      <button class="btn-next" @click="nextStep">下一步 →</button>
    </view>

    <!-- 第2步：疾病选择 -->
    <view v-if="step === 2" class="step-content">
      <text class="step-emoji">🏥</text>
      <text class="step-title">你有哪些慢性病？</text>
      <text class="step-desc">可多选，帮小派更好地为你服务</text>

      <view class="disease-grid">
        <view v-for="d in diseaseOptions" :key="d" class="disease-btn" :class="{ selected: diseases.includes(d) }" @click="toggleDisease(d)">
          <text>{{ d }}</text>
        </view>
      </view>

      <view class="btn-row">
        <button class="btn-back" @click="step = 1">← 上一步</button>
        <button class="btn-next" @click="nextStep">下一步 →</button>
      </view>
    </view>

    <!-- 第3步：添加第一种药 -->
    <view v-if="step === 3" class="step-content">
      <text class="step-emoji">💊</text>
      <text class="step-title">添加你的第一种药</text>
      <text class="step-desc">以后还可以随时添加更多</text>

      <view class="form-item">
        <text class="label">药品名称</text>
        <input class="ipt" :value="medName" @input="medName = $event.detail.value" placeholder="如：氨氯地平片" />
      </view>

      <view class="form-item">
        <text class="label">单次剂量</text>
        <input class="ipt" :value="medDosage" @input="medDosage = $event.detail.value" placeholder="如：5mg × 1片" />
      </view>

      <view class="form-item">
        <text class="label">什么时候吃（可多选）</text>
        <view class="time-grid">
          <view v-for="t in timeOptions" :key="t" class="time-btn" :class="{ selected: medTimes.includes(t) }" @click="toggleTime(t)">
            <text>{{ t }}</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">服用条件</text>
        <view class="picker-row">
          <view v-for="c in condOptions" :key="c" class="cond-btn" :class="{ selected: medCondition === c }" @click="medCondition = c">
            <text>{{ c }}</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">治什么病</text>
        <input class="ipt" :value="medDisease" @input="medDisease = $event.detail.value" :placeholder="diseases.length > 0 ? diseases[0] : '如：高血压'" />
      </view>

      <view class="form-item">
        <text class="label">家里还剩多少片</text>
        <input class="ipt" type="number" :value="String(medStock)" @input="medStock = Number($event.detail.value)" placeholder="30" />
      </view>

      <view class="btn-row">
        <button class="btn-back" @click="step = 2">← 上一步</button>
        <button class="btn-next" @click="finish">完成设置 ✓</button>
      </view>

      <view class="skip-row" @click="skipMed">
        <text class="skip-text">先跳过，稍后添加</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { supabase } from '../../utils/supabase'

const userStore = useUserStore()
const medsStore = useMedicationsStore()

const step = ref(1)
const userName = ref('')
const age = ref('')
const gender = ref('male')
const diseases = ref<string[]>([])

const medName = ref('')
const medDosage = ref('')
const medTimes = ref<string[]>([])
const medCondition = ref('空腹')
const medDisease = ref('')
const medStock = ref(30)

const diseaseOptions = ['高血压', '2型糖尿病', '高血脂', '冠心病', '心律不齐', '甲状腺疾病', '痛风', '哮喘', '其他']
const timeOptions = ['晨起 7:00', '早餐后 8:00', '午餐后 14:30', '晚餐后 18:30', '晚间 21:00']
const condOptions = ['空腹', '餐后30分钟', '睡前', '无要求']

onLoad(() => {
  if (userStore.user?.user_metadata?.display_name) {
    userName.value = userStore.user.user_metadata.display_name
  }
})

const toggleDisease = (d: string) => {
  if (diseases.value.includes(d)) {
    diseases.value = diseases.value.filter(x => x !== d)
  } else {
    diseases.value.push(d)
  }
}

const toggleTime = (t: string) => {
  if (medTimes.value.includes(t)) {
    medTimes.value = medTimes.value.filter(x => x !== t)
  } else {
    medTimes.value.push(t)
  }
}

const nextStep = () => {
  if (step.value === 1) {
    if (!userName.value) { uni.showToast({ title: '请输入称呼', icon: 'none' }); return }
  }
  if (step.value === 2) {
    if (diseases.value.length === 0) { uni.showToast({ title: '请至少选择一种', icon: 'none' }); return }
    medDisease.value = diseases.value[0]
  }
  step.value++
}

const finish = async () => {
  // 保存个人信息
  if (userStore.user) {
    await supabase.auth.updateUser({
      data: { display_name: userName.value, age: age.value, gender: gender.value, diseases: diseases.value }
    })
    await supabase.from('profiles').upsert({
      id: userStore.user.id, display_name: userName.value, email: userStore.user.email, role: 'patient'
    })
  }

  // 添加药品
  if (medName.value && medDosage.value && medTimes.value.length > 0 && userStore.user) {
    await medsStore.add(userStore.user.id, {
      name: medName.value,
      dosage: medDosage.value,
      frequency: medTimes.value.length,
      times: medTimes.value,
      condition: medCondition.value,
      disease: medDisease.value || diseases.value[0] || '',
      stock_count: medStock.value,
      daily_usage: medTimes.value.length,
      note: ''
    })
  }

  completeOnboarding()
}

const skipMed = async () => {
  // 只保存个人信息
  if (userStore.user) {
    await supabase.auth.updateUser({
      data: { display_name: userName.value, age: age.value, gender: gender.value, diseases: diseases.value }
    })
  }
  completeOnboarding()
}

const completeOnboarding = () => {
  if (userStore.user) {
    uni.setStorageSync('onboarded_' + userStore.user.id, 'true')
  }
  uni.showToast({ title: '设置完成！', icon: 'success' })
  setTimeout(() => {
    uni.switchTab({ url: '/pages/home/index' })
  }, 1000)
}
</script>

<style scoped>
.page { min-height: 100vh; background: #fff; padding: 0 48rpx 60rpx; }

/* 步骤指示器 */
.steps { display: flex; align-items: center; justify-content: center; gap: 40rpx; padding: 60rpx 0 40rpx; }
.step-dot {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: #e5e7eb; display: flex; align-items: center; justify-content: center;
  transition: all 0.3s;
}
.step-dot.active { background: #0b9d6a; }
.step-dot.current { box-shadow: 0 0 0 6rpx rgba(11,157,106,0.2); }
.step-num { font-size: 26rpx; font-weight: 700; color: #fff; }

/* 步骤内容 */
.step-content { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20rpx); } to { opacity: 1; transform: translateY(0); } }
.step-emoji { font-size: 80rpx; display: block; text-align: center; margin-bottom: 16rpx; }
.step-title { font-size: 40rpx; font-weight: 800; display: block; text-align: center; margin-bottom: 8rpx; }
.step-desc { font-size: 28rpx; color: #6b7280; display: block; text-align: center; margin-bottom: 40rpx; }

/* 表单 */
.form-item { margin-bottom: 28rpx; }
.label { font-size: 26rpx; font-weight: 600; color: #374151; display: block; margin-bottom: 12rpx; }
.ipt {
  width: 100%; padding: 22rpx 28rpx; font-size: 30rpx;
  background: #f4f6f8; border: 2rpx solid #e5e7eb;
  border-radius: 20rpx; height: 88rpx;
}

/* 选择器 */
.picker-row { display: flex; gap: 16rpx; flex-wrap: wrap; }
.pick-btn {
  padding: 18rpx 32rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb;
  border-radius: 32rpx; font-size: 28rpx;
}
.pick-btn.selected { background: #e6f7f0; border-color: #0b9d6a; color: #0b9d6a; font-weight: 600; }

/* 疾病网格 */
.disease-grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 40rpx; }
.disease-btn {
  padding: 18rpx 28rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb;
  border-radius: 32rpx; font-size: 28rpx;
}
.disease-btn.selected { background: #e6f7f0; border-color: #0b9d6a; color: #0b9d6a; font-weight: 600; }

/* 时间网格 */
.time-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.time-btn {
  padding: 16rpx 24rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb;
  border-radius: 24rpx; font-size: 24rpx;
}
.time-btn.selected { background: #e6f7f0; border-color: #0b9d6a; color: #0b9d6a; font-weight: 600; }

/* 条件选择 */
.cond-btn {
  padding: 16rpx 24rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb;
  border-radius: 24rpx; font-size: 24rpx;
}
.cond-btn.selected { background: #e6f7f0; border-color: #0b9d6a; color: #0b9d6a; font-weight: 600; }

/* 按钮 */
.btn-next {
  width: 100%; padding: 24rpx; margin-top: 20rpx;
  background: linear-gradient(135deg, #0b9d6a, #0abf7f);
  color: #fff; border: none; border-radius: 40rpx;
  font-size: 32rpx; font-weight: 600;
}
.btn-row { display: flex; gap: 16rpx; margin-top: 20rpx; }
.btn-row .btn-next { flex: 2; }
.btn-back {
  flex: 1; padding: 24rpx; background: #f4f6f8; color: #6b7280;
  border: none; border-radius: 40rpx; font-size: 28rpx;
}
.skip-row { text-align: center; margin-top: 24rpx; }
.skip-text { font-size: 26rpx; color: #9ca3af; text-decoration: underline; }
</style>
