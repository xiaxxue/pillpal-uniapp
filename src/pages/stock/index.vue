<template>
  <view class="page">
    <view class="content">
      <view class="overview">
        <view class="ov-item"><text class="ov-num">{{ medications.length }}</text><text class="ov-label">正在吃的药</text></view>
        <view class="ov-item"><text class="ov-num warn">{{ urgentCount }}</text><text class="ov-label">快吃完了</text></view>
        <view class="ov-item"><text class="ov-num">{{ weeklyTotal }}</text><text class="ov-label">一周用量/片</text></view>
      </view>

      <view v-if="medications.length === 0" class="empty">
        <text class="empty-icon">📦</text>
        <text class="empty-text">还没有药品</text>
        <button class="btn-primary" @click="openAdd">+ 添加第一种药品</button>
      </view>

      <view v-else>
        <view class="section-header">
          <text class="section-title">药品列表</text>
          <text class="section-link" @click="openAdd">+ 添加药品</text>
        </view>

        <view v-for="med in medications" :key="med.id" class="stock-card" :class="{ urgent: isUrgent(med) }">
          <view class="stock-header">
            <text class="stock-name">{{ med.name }}</text>
            <text class="stock-tag" :class="isUrgent(med) ? 'tag-urgent' : 'tag-ok'">{{ isUrgent(med) ? '快吃完了' : '充足' }}</text>
          </view>
          <text class="stock-spec">{{ med.dosage }} · {{ med.condition || '无要求' }}</text>
          <text class="stock-times">⏰ {{ med.times?.join('、') || '未设置时间' }}</text>
          <view class="meter"><view class="meter-fill" :class="isUrgent(med) ? 'fill-urgent' : 'fill-ok'" :style="{ width: getPct(med) + '%' }" /></view>
          <text class="meter-text">剩余 {{ med.stock_count }} 片</text>
          <view class="stock-info">
            <view><text class="info-label">日均</text><text>{{ med.daily_usage || 1 }}片/天</text></view>
            <view><text class="info-label">可服</text><text>{{ getDays(med) }}天</text></view>
            <view><text class="info-label">治疗</text><text>{{ med.disease || '-' }}</text></view>
          </view>
          <view class="stock-actions">
            <button class="btn-edit" @click="openEdit(med)">编辑</button>
            <button class="btn-del" @click="handleDelete(med)">删除</button>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加/编辑药品弹窗 -->
    <view v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <view class="modal-box">
        <text class="modal-title">{{ isEdit ? '编辑药品' : '💊 添加药品' }}</text>

        <view class="form-item">
          <text class="label">药品名称</text>
          <input class="ipt" :value="form.name" @input="form.name = $event.detail.value" placeholder="如：氨氯地平片" />
        </view>

        <view class="form-item">
          <text class="label">单次剂量</text>
          <input class="ipt" :value="form.dosage" @input="form.dosage = $event.detail.value" placeholder="如：5mg × 1片" />
        </view>

        <view class="form-item">
          <text class="label">什么时候吃</text>
          <view class="preset-row">
            <view v-for="p in timePresets" :key="p.time" class="preset-btn" :class="{ selected: form.times.includes(p.time) }" @click="togglePreset(p.time)">
              <text>{{ p.label }}</text>
              <text class="preset-time">{{ p.time }}</text>
            </view>
          </view>
          <view class="time-list">
            <view v-for="(t, i) in form.times" :key="i" class="time-tag">
              <text>{{ getPresetLabel(t) }}</text>
              <text class="time-del" @click="removeTime(i)">✕</text>
            </view>
            <picker mode="time" @change="onPickTime">
              <view class="time-add">+ 自定义时间</view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="label">服用条件</text>
          <view class="picker-row">
            <view v-for="c in condOptions" :key="c" class="cond-btn" :class="{ selected: form.condition === c }" @click="form.condition = c">
              <text>{{ c }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="label">治什么病</text>
          <input class="ipt" :value="form.disease" @input="form.disease = $event.detail.value" placeholder="如：高血压" />
        </view>

        <view class="form-item">
          <text class="label">库存（片）</text>
          <input class="ipt" type="number" :value="String(form.stock)" @input="form.stock = Number($event.detail.value)" placeholder="30" />
        </view>

        <view class="modal-btns">
          <button class="btn-cancel" @click="showModal = false">取消</button>
          <button class="btn-confirm" @click="submitForm">{{ isEdit ? '保存修改' : '确认添加' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { TIME_PRESETS } from '../../utils/date'

const userStore = useUserStore()
const medsStore = useMedicationsStore()
const medications = computed(() => medsStore.medications)

const getDays = (med: any) => med.stock_count > 0 ? Math.floor(med.stock_count / (med.daily_usage || 1)) : 0
const isUrgent = (med: any) => getDays(med) <= 7
const getPct = (med: any) => Math.min(100, Math.round((getDays(med) / 60) * 100))
const urgentCount = computed(() => medications.value.filter(m => isUrgent(m)).length)
const weeklyTotal = computed(() => medications.value.reduce((s, m) => s + (m.daily_usage || 1) * 7, 0))

const condOptions = ['空腹', '餐后30分钟', '睡前', '无要求']
const timePresets = TIME_PRESETS

const togglePreset = (time: string) => {
  const idx = form.times.indexOf(time)
  if (idx >= 0) {
    form.times.splice(idx, 1)
  } else {
    form.times.push(time)
    form.times.sort()
  }
}

const getPresetLabel = (time: string) => {
  const p = TIME_PRESETS.find(x => x.time === time)
  return p ? p.label + ' ' + time : time
}
const showModal = ref(false)
const isEdit = ref(false)
const editingId = ref('')

const form = reactive({
  name: '',
  dosage: '',
  times: [] as string[],
  condition: '空腹',
  disease: '',
  stock: 30
})

const resetForm = () => {
  form.name = ''
  form.dosage = ''
  form.times = []
  form.condition = '空腹'
  form.disease = ''
  form.stock = 30
}

const openAdd = () => {
  resetForm()
  isEdit.value = false
  editingId.value = ''
  showModal.value = true
}

const openEdit = (med: any) => {
  form.name = med.name || ''
  form.dosage = med.dosage || ''
  form.times = [...(med.times || [])]
  form.condition = med.condition || '空腹'
  form.disease = med.disease || ''
  form.stock = med.stock_count || 0
  isEdit.value = true
  editingId.value = med.id
  showModal.value = true
}

const onPickTime = (e: any) => {
  const t = e.detail.value
  if (t && !form.times.includes(t)) {
    form.times.push(t)
    form.times.sort()
  }
}

const removeTime = (i: number) => {
  form.times.splice(i, 1)
}

const submitForm = async () => {
  if (!form.name) { uni.showToast({ title: '请输入药品名称', icon: 'none' }); return }
  if (!form.dosage) { uni.showToast({ title: '请输入剂量', icon: 'none' }); return }
  if (form.times.length === 0) { uni.showToast({ title: '请添加服药时间', icon: 'none' }); return }

  const userId = userStore.user?.id
  if (!userId) return

  if (isEdit.value && editingId.value) {
    // 编辑模式
    await medsStore.update(userId, editingId.value, {
      name: form.name,
      dosage: form.dosage,
      times: form.times,
      frequency: form.times.length,
      condition: form.condition,
      disease: form.disease,
      stock_count: form.stock,
      daily_usage: form.times.length
    })
    uni.showToast({ title: '修改成功', icon: 'success' })
  } else {
    // 添加模式
    await medsStore.add(userId, {
      name: form.name,
      dosage: form.dosage,
      frequency: form.times.length,
      times: form.times,
      condition: form.condition,
      disease: form.disease,
      stock_count: form.stock,
      daily_usage: form.times.length,
      note: ''
    })
    uni.showToast({ title: '添加成功', icon: 'success' })
  }

  showModal.value = false
  resetForm()
}

const handleDelete = (med: any) => {
  uni.showModal({
    title: '删除药品',
    content: '确定要删除「' + med.name + '」吗？删除后无法恢复。',
    success: async (res) => {
      if (res.confirm) {
        await medsStore.remove(userStore.user.id, med.id)
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    }
  })
}

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) await medsStore.fetchAll(userStore.user.id)
})
</script>

<style scoped>
.page { background: #f4f6f8; min-height: 100vh; }
.content { padding: 24rpx; }
.overview { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.ov-item { flex: 1; background: #fff; border-radius: 16rpx; padding: 24rpx; text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.ov-num { font-size: 44rpx; font-weight: 700; color: #0b9d6a; display: block; }
.ov-num.warn { color: #e53935; }
.ov-label { font-size: 22rpx; color: #6b7280; display: block; margin-top: 8rpx; }
.empty { text-align: center; padding: 80rpx 0; }
.empty-icon { font-size: 128rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #9ca3af; display: block; margin-bottom: 32rpx; }

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 32rpx; font-weight: 600; }
.section-link { font-size: 26rpx; color: #0b9d6a; font-weight: 500; }

.stock-card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.stock-card.urgent { border-left: 6rpx solid #e53935; }
.stock-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.stock-name { font-size: 32rpx; font-weight: 600; }
.stock-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 30rpx; font-weight: 500; }
.tag-urgent { background: #ffebee; color: #e53935; }
.tag-ok { background: #e6f7f0; color: #0b9d6a; }
.stock-spec { font-size: 24rpx; color: #6b7280; display: block; margin-bottom: 6rpx; }
.stock-times { font-size: 24rpx; color: #0b9d6a; display: block; margin-bottom: 16rpx; }
.meter { height: 12rpx; background: #e5e7eb; border-radius: 6rpx; overflow: hidden; }
.meter-fill { height: 100%; border-radius: 6rpx; }
.fill-urgent { background: linear-gradient(90deg, #e53935, #f57c00); }
.fill-ok { background: linear-gradient(90deg, #0b9d6a, #0abf7f); }
.meter-text { font-size: 22rpx; color: #6b7280; text-align: right; display: block; margin-top: 6rpx; }
.stock-info { display: flex; justify-content: space-around; margin: 16rpx 0; font-size: 28rpx; font-weight: 600; }
.info-label { font-size: 22rpx; color: #6b7280; font-weight: 400; display: block; margin-bottom: 4rpx; }
.stock-actions { display: flex; gap: 16rpx; }
.btn-edit { flex: 1; padding: 16rpx; background: #e6f7f0; color: #0b9d6a; border-radius: 12rpx; font-size: 26rpx; border: none; font-weight: 500; }
.btn-del { padding: 16rpx 24rpx; background: #f4f6f8; color: #e53935; border-radius: 12rpx; font-size: 26rpx; border: none; }
.btn-primary { width: 100%; padding: 24rpx; background: #0b9d6a; color: #fff; border-radius: 16rpx; font-size: 32rpx; font-weight: 600; border: none; }

/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.modal-box { width: 90%; max-height: 85vh; background: #fff; border-radius: 24rpx; padding: 40rpx 32rpx; overflow-y: auto; }
.modal-title { font-size: 36rpx; font-weight: 700; display: block; text-align: center; margin-bottom: 32rpx; }
.form-item { margin-bottom: 24rpx; }
.label { font-size: 26rpx; font-weight: 600; color: #374151; display: block; margin-bottom: 10rpx; }
.ipt { width: 100%; padding: 20rpx 24rpx; font-size: 28rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb; border-radius: 16rpx; height: 80rpx; }
.picker-row { display: flex; gap: 12rpx; flex-wrap: wrap; }
.cond-btn { padding: 14rpx 24rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb; border-radius: 24rpx; font-size: 24rpx; }
.cond-btn.selected { background: #e6f7f0; border-color: #0b9d6a; color: #0b9d6a; font-weight: 600; }
.preset-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.preset-btn { padding: 12rpx 20rpx; background: #f4f6f8; border: 2rpx solid #e5e7eb; border-radius: 20rpx; text-align: center; font-size: 24rpx; }
.preset-btn.selected { background: #e6f7f0; border-color: #0b9d6a; color: #0b9d6a; font-weight: 600; }
.preset-time { font-size: 20rpx; color: #9ca3af; display: block; margin-top: 2rpx; }
.preset-btn.selected .preset-time { color: #0b9d6a; }
.time-list { display: flex; flex-wrap: wrap; gap: 12rpx; align-items: center; }
.time-tag { display: flex; align-items: center; gap: 8rpx; padding: 14rpx 24rpx; background: #e6f7f0; border: 2rpx solid #0b9d6a; border-radius: 24rpx; font-size: 26rpx; color: #0b9d6a; font-weight: 600; }
.time-del { font-size: 24rpx; color: #9ca3af; margin-left: 4rpx; }
.time-add { padding: 14rpx 24rpx; background: #f4f6f8; border: 2rpx dashed #d1d5db; border-radius: 24rpx; font-size: 26rpx; color: #6b7280; }
.modal-btns { display: flex; gap: 16rpx; margin-top: 32rpx; }
.btn-cancel { flex: 1; padding: 22rpx; background: #f4f6f8; color: #6b7280; border: none; border-radius: 16rpx; font-size: 28rpx; }
.btn-confirm { flex: 2; padding: 22rpx; background: #0b9d6a; color: #fff; border: none; border-radius: 16rpx; font-size: 28rpx; font-weight: 600; }
</style>
