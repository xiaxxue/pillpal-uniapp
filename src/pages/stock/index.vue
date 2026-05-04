<template>
  <view class="page" :class="{ 'elder-mode': elderMode }">
    <!-- 顶栏 -->
    <view class="top-bar">
      <text class="page-title">药品库存</text>
      <view class="add-btn" @click="openAdd">
        <text class="add-icon">+</text>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 概览卡片 -->
      <view class="overview">
        <view class="ov-card">
          <text class="ov-num">{{ uniqueMeds.length }}</text>
          <text class="ov-label">正在服用</text>
        </view>
        <view class="ov-card">
          <view v-if="urgentCount > 0" class="ov-dot warn" />
          <text class="ov-num" :class="{ warn: urgentCount > 0 }">{{ urgentCount }}</text>
          <text class="ov-label">需要补货</text>
        </view>
        <view class="ov-card">
          <text class="ov-num">{{ weeklyTotal }}<text class="ov-unit">片</text></text>
          <text class="ov-label">本周用量</text>
        </view>
      </view>

      <!-- 筛选 -->
      <view class="filter-bar">
        <text class="filter-title">药品列表</text>
        <view class="filter-tabs">
          <text class="filter-tab" :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</text>
          <text class="filter-tab" :class="{ active: filter === 'low' }" @click="filter = 'low'">需补货</text>
          <text class="filter-tab" :class="{ active: filter === 'ok' }" @click="filter = 'ok'">充足</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredMeds.length === 0" class="empty">
        <text class="empty-icon">📦</text>
        <text class="empty-title">{{ filter === 'all' ? '还没有药品' : filter === 'low' ? '暂无需补货药品' : '暂无充足药品' }}</text>
        <text class="empty-sub">{{ filter === 'all' ? '点右上角 + 添加你的第一个药品' : '切换筛选查看其他' }}</text>
      </view>

      <!-- 药品列表 -->
      <view class="stock-list">
        <view v-for="med in filteredMeds" :key="med.id" class="stock-card" :class="{ urgent: isUrgent(med) }">
          <view v-if="isUrgent(med)" class="urgent-bar" />
          <view class="sc-top">
            <view class="sc-icon" :class="{ 'sc-icon-warn': isUrgent(med) }">
              <text class="sc-icon-text">💊</text>
            </view>
            <view class="sc-info">
              <view class="sc-name-row">
                <text class="sc-name">{{ med.name }}</text>
                <text class="sc-tag" :class="isUrgent(med) ? 'tag-warn' : 'tag-ok'">{{ isUrgent(med) ? '需补货' : '充足' }}</text>
              </view>
              <text class="sc-spec">{{ med.dosage }} · {{ med.condition || '无要求' }} · 每日 {{ med.daily_usage || 1 }} 次</text>
            </view>
          </view>
          <!-- 库存进度 -->
          <view class="sc-meter">
            <view class="meter-bar">
              <view class="meter-fill" :class="isUrgent(med) ? 'fill-warn' : 'fill-ok'" :style="{ width: getPct(med) + '%' }" />
            </view>
            <view class="meter-info">
              <text class="meter-num" :class="{ warn: isUrgent(med) }">{{ med.stock_count }}</text>
              <text class="meter-unit">片 · 约 {{ getDays(med) }} 天</text>
            </view>
          </view>
          <!-- 操作 -->
          <view class="sc-actions">
            <text class="sc-btn-del" @click="handleDelete(med)">删除</text>
            <text class="sc-btn-edit" @click="openEdit(med)">编辑</text>
            <text class="sc-btn-refill" :class="{ warn: isUrgent(med) }" @click="openRefill(med)">+ 补货</text>
          </view>
        </view>
      </view>

      <view style="height: 40rpx;" />
    </scroll-view>

    <!-- 添加/编辑弹窗 -->
    <sheet v-if="showModal" :title="isEdit ? '编辑药品' : '添加药品'" subtitle="填写药品基本信息和提醒时间" @close="showModal = false">
      <view class="form-col">
        <view class="field">
          <text class="field-label">药品名称 <text class="field-req">*</text></text>
          <input class="field-input" :value="form.name" @input="form.name = $event.detail.value" placeholder="如：氨氯地平片" />
        </view>
        <view class="field">
          <text class="field-label">单次剂量 <text class="field-req">*</text></text>
          <input class="field-input" :value="form.dosage" @input="form.dosage = $event.detail.value" placeholder="如：5mg × 1片" />
        </view>
        <view class="field">
          <text class="field-label">什么时候吃</text>
          <view class="preset-row">
            <view v-for="p in timePresets" :key="p.time" class="preset-btn" :class="{ selected: form.times.includes(p.time) }" @click="togglePreset(p.time)">
              <text class="preset-label">{{ p.label }}</text>
              <text class="preset-time">{{ p.time }}</text>
            </view>
          </view>
          <view class="time-chips">
            <view v-for="(t, i) in form.times" :key="i" class="time-chip">
              <text>{{ getPresetLabel(t) }}</text>
              <text class="chip-del" @click="removeTime(i)">✕</text>
            </view>
            <picker mode="time" @change="onPickTime">
              <view class="time-add-btn">+ 自定义</view>
            </picker>
          </view>
        </view>
        <view class="field">
          <text class="field-label">服用条件</text>
          <view class="cond-row">
            <view v-for="c in condOptions" :key="c" class="cond-btn" :class="{ selected: form.condition === c }" @click="form.condition = c">
              <text>{{ c }}</text>
            </view>
          </view>
        </view>
        <view class="field-row">
          <view class="field" style="flex:1">
            <text class="field-label">治什么</text>
            <input class="field-input" :value="form.disease" @input="form.disease = $event.detail.value" placeholder="如：高血压" />
          </view>
          <view class="field" style="flex:1">
            <text class="field-label">库存（片）</text>
            <input class="field-input" type="number" :value="String(form.stock)" @input="form.stock = Number($event.detail.value)" placeholder="30" />
          </view>
        </view>
      </view>
      <view class="sheet-btns">
        <button class="btn-ghost" @click="showModal = false">取消</button>
        <button class="btn-green" @click="submitForm">{{ isEdit ? '保存修改' : '确认添加' }}</button>
      </view>
    </sheet>

    <!-- 补货弹窗 -->
    <sheet v-if="refillMed" :title="'补货 · ' + refillMed.name" :subtitle="'当前剩余 ' + refillMed.stock_count + ' 片 · 每日 ' + (refillMed.daily_usage || 1) + ' 次'" @close="refillMed = null">
      <view class="refill-center">
        <text class="refill-minus" @click="refillQty = Math.max(1, refillQty - 10)">−</text>
        <view class="refill-num-wrap">
          <text class="refill-num">{{ refillQty }}</text>
          <text class="refill-unit">片</text>
        </view>
        <text class="refill-plus" @click="refillQty += 10">+</text>
      </view>
      <view class="refill-quick">
        <text v-for="n in [14, 30, 60, 90]" :key="n" class="refill-opt" :class="{ active: refillQty === n }" @click="refillQty = n">{{ n }} 片</text>
      </view>
      <view class="refill-preview">
        补货后剩余 <text class="refill-bold">{{ refillMed.stock_count + refillQty }}</text> 片 · 可用 <text class="refill-bold">{{ Math.floor((refillMed.stock_count + refillQty) / (refillMed.daily_usage || 1)) }}</text> 天
      </view>
      <button class="btn-green-full" @click="confirmRefill">确认补货</button>
    </sheet>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useMedicationsStore } from '../../stores/medications'
import { TIME_PRESETS } from '../../utils/date'
import Sheet from '../../components/Sheet.vue'

const userStore = useUserStore()
const elderMode = computed(() => userStore.elderMode)
const medsStore = useMedicationsStore()
const medications = computed(() => medsStore.medications)

// ── 去重（同名药只显示一次）──
const uniqueMeds = computed(() => {
  const seen = new Set()
  return medications.value.filter(m => {
    if (seen.has(m.name)) return false
    seen.add(m.name)
    return true
  })
})

const getDays = (med: any) => med.stock_count > 0 ? Math.floor(med.stock_count / (med.daily_usage || 1)) : 0
const isUrgent = (med: any) => getDays(med) <= 7
const getPct = (med: any) => Math.min(100, Math.round((med.stock_count / 60) * 100))
const urgentCount = computed(() => uniqueMeds.value.filter(m => isUrgent(m)).length)
const weeklyTotal = computed(() => uniqueMeds.value.reduce((s, m) => s + (m.daily_usage || 1) * 7, 0))

// ── 筛选 ──
const filter = ref('all')
const filteredMeds = computed(() => {
  if (filter.value === 'low') return uniqueMeds.value.filter(m => isUrgent(m))
  if (filter.value === 'ok') return uniqueMeds.value.filter(m => !isUrgent(m))
  return uniqueMeds.value
})

// ── 添加/编辑 ──
const showModal = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const condOptions = ['空腹', '餐后30分钟', '睡前', '无要求']
const timePresets = TIME_PRESETS
const form = reactive({ name: '', dosage: '', times: [] as string[], condition: '空腹', disease: '', stock: 30 })

const resetForm = () => { Object.assign(form, { name: '', dosage: '', times: [], condition: '空腹', disease: '', stock: 30 }) }

const openAdd = () => { resetForm(); isEdit.value = false; editingId.value = ''; showModal.value = true }
const openEdit = (med: any) => {
  form.name = med.name || ''; form.dosage = med.dosage || ''
  form.times = [...(med.times || [])]; form.condition = med.condition || '空腹'
  form.disease = med.disease || ''; form.stock = med.stock_count || 0
  isEdit.value = true; editingId.value = med.id; showModal.value = true
}

const togglePreset = (time: string) => {
  const idx = form.times.indexOf(time)
  if (idx >= 0) form.times.splice(idx, 1)
  else { form.times.push(time); form.times.sort() }
}
const getPresetLabel = (time: string) => {
  const p = TIME_PRESETS.find(x => x.time === time)
  return p ? p.label + ' ' + time : time
}
const onPickTime = (e: any) => {
  const t = e.detail.value
  if (t && !form.times.includes(t)) { form.times.push(t); form.times.sort() }
}
const removeTime = (i: number) => { form.times.splice(i, 1) }

const submitForm = async () => {
  if (!form.name) { uni.showToast({ title: '请输入药品名称', icon: 'none' }); return }
  if (!form.dosage) { uni.showToast({ title: '请输入剂量', icon: 'none' }); return }
  if (form.times.length === 0) { uni.showToast({ title: '请添加服药时间', icon: 'none' }); return }
  const userId = userStore.user?.id
  if (!userId) return

  if (isEdit.value && editingId.value) {
    await medsStore.update(userId, editingId.value, {
      name: form.name, dosage: form.dosage, times: form.times, frequency: form.times.length,
      condition: form.condition, disease: form.disease, stock_count: form.stock, daily_usage: form.times.length
    })
    uni.showToast({ title: '修改成功', icon: 'success' })
  } else {
    const dup = medications.value.find(m => m.name === form.name)
    if (dup) { uni.showToast({ title: '该药品已存在，请点击编辑', icon: 'none' }); return }
    await medsStore.add(userId, {
      name: form.name, dosage: form.dosage, frequency: form.times.length, times: form.times,
      condition: form.condition, disease: form.disease, stock_count: form.stock, daily_usage: form.times.length, note: ''
    })
    uni.showToast({ title: '已添加「' + form.name + '」', icon: 'success' })
  }
  showModal.value = false; resetForm()
}

const handleDelete = (med: any) => {
  uni.showModal({
    title: '确认删除', content: '确定要删除「' + med.name + '」吗？删除后无法恢复。',
    success: async (res) => {
      if (res.confirm) {
        await medsStore.remove(userStore.user.id, med.id)
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    }
  })
}

// ── 补货 ──
const refillMed = ref<any>(null)
const refillQty = ref(30)
const openRefill = (med: any) => { refillMed.value = med; refillQty.value = 30 }
const confirmRefill = async () => {
  const med = refillMed.value
  if (!med) return
  const userId = userStore.user?.id
  if (!userId) return
  await medsStore.update(userId, med.id, { stock_count: med.stock_count + refillQty.value })
  uni.showToast({ title: '已补货 ' + refillQty.value + ' 片', icon: 'success' })
  refillMed.value = null
}

onShow(async () => {
  if (!userStore.user) await userStore.init()
  if (userStore.user) await medsStore.fetchAll(userStore.user.id)
})
</script>

<style lang="scss" scoped>
.page { background: #f6f8f7; min-height: 100vh; display: flex; flex-direction: column; }

.top-bar { padding: 24rpx 36rpx 16rpx; display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 44rpx; font-weight: 800; color: #0f1f1a; letter-spacing: -1rpx; }
.add-btn { width: 72rpx; height: 72rpx; border-radius: 24rpx; background: #0b9d6a; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 20rpx rgba(11,157,106,0.3); }
.add-icon { color: #fff; font-size: 40rpx; font-weight: 300; }

.main-scroll { flex: 1; }

/* 概览 */
.overview { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16rpx; padding: 24rpx 28rpx 0; }
.ov-card { background: #fff; border: 2rpx solid #e7eae8; border-radius: 32rpx; padding: 24rpx; }
.ov-dot { width: 12rpx; height: 12rpx; border-radius: 50%; margin-bottom: 12rpx; }
.ov-dot.warn { background: #f59e0b; }
.ov-num { font-size: 52rpx; font-weight: 700; color: #0f1f1a; font-family: 'Inter', sans-serif; display: block; letter-spacing: -2rpx; }
.ov-num.warn { color: #f59e0b; }
.ov-unit { font-size: 22rpx; color: #6b7670; font-weight: 500; margin-left: 4rpx; }
.ov-label { font-size: 22rpx; color: #6b7670; display: block; margin-top: 4rpx; }

/* 筛选 */
.filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 40rpx 36rpx 20rpx; }
.filter-title { font-size: 30rpx; font-weight: 700; color: #0f1f1a; }
.filter-tabs { display: flex; gap: 8rpx; background: #f6f8f7; padding: 6rpx; border-radius: 999rpx; }
.filter-tab { padding: 10rpx 24rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 600; color: #6b7670; }
.filter-tab.active { background: #fff; color: #0f1f1a; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.08); }

/* 空状态 */
.empty { margin: 0 28rpx; padding: 64rpx 32rpx; background: #fff; border: 2rpx dashed #e7eae8; border-radius: 32rpx; text-align: center; }
.empty-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.empty-title { font-size: 26rpx; font-weight: 600; display: block; color: #0f1f1a; }
.empty-sub { font-size: 22rpx; color: #6b7670; display: block; margin-top: 8rpx; }

/* 药品卡片 */
.stock-list { padding: 0 28rpx; display: flex; flex-direction: column; gap: 20rpx; }
.stock-card { background: #fff; border: 2rpx solid #e7eae8; border-radius: 36rpx; padding: 28rpx; position: relative; overflow: hidden; }
.urgent-bar { position: absolute; top: 0; left: 0; bottom: 0; width: 6rpx; background: #f59e0b; }
.sc-top { display: flex; gap: 24rpx; align-items: flex-start; }
.sc-icon { width: 88rpx; height: 88rpx; border-radius: 28rpx; background: #e7f6ef; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sc-icon-warn { background: #fef4e2; }
.sc-icon-text { font-size: 44rpx; }
.sc-info { flex: 1; min-width: 0; }
.sc-name-row { display: flex; justify-content: space-between; align-items: center; gap: 12rpx; }
.sc-name { font-size: 30rpx; font-weight: 700; color: #0f1f1a; }
.sc-tag { font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 999rpx; font-weight: 600; flex-shrink: 0; }
.tag-warn { background: #fef4e2; color: #a06a18; }
.tag-ok { background: #e7f6ef; color: #078558; }
.sc-spec { font-size: 22rpx; color: #6b7670; display: block; margin-top: 6rpx; }

.sc-meter { margin-top: 24rpx; display: flex; align-items: center; gap: 20rpx; }
.meter-bar { flex: 1; height: 12rpx; background: #eef1ef; border-radius: 6rpx; overflow: hidden; }
.meter-fill { height: 100%; border-radius: 6rpx; transition: width 0.6s cubic-bezier(.2,.8,.2,1); }
.fill-ok { background: #0b9d6a; }
.fill-warn { background: #f59e0b; }
.meter-info { display: flex; align-items: baseline; gap: 6rpx; min-width: 152rpx; justify-content: flex-end; }
.meter-num { font-size: 36rpx; font-weight: 700; color: #0f1f1a; font-family: 'Inter', sans-serif; }
.meter-num.warn { color: #f59e0b; }
.meter-unit { font-size: 20rpx; color: #6b7670; }

.sc-actions { margin-top: 20rpx; padding-top: 20rpx; border-top: 2rpx dashed #e7eae8; display: flex; justify-content: flex-end; gap: 12rpx; }
.sc-btn-del { padding: 12rpx 24rpx; color: #6b7670; border: 2rpx solid #e7eae8; border-radius: 16rpx; font-size: 22rpx; font-weight: 500; }
.sc-btn-edit { padding: 12rpx 24rpx; color: #0b9d6a; border: 2rpx solid #0b9d6a; border-radius: 16rpx; font-size: 22rpx; font-weight: 600; }
.sc-btn-refill { padding: 12rpx 28rpx; background: #0b9d6a; color: #fff; border-radius: 16rpx; font-size: 22rpx; font-weight: 700; }
.sc-btn-refill.warn { background: #f59e0b; }

/* 表单（与首页共享样式） */
.form-col { display: flex; flex-direction: column; gap: 24rpx; }
.field-row { display: flex; gap: 20rpx; }
.field-label { font-size: 22rpx; font-weight: 600; color: #6b7670; display: block; margin-bottom: 12rpx; }
.field-req { color: #dc2626; margin-left: 4rpx; }
.field-input { width: 100%; padding: 20rpx 24rpx; background: #f6f8f7; border: 2rpx solid #e7eae8; border-radius: 20rpx; font-size: 26rpx; color: #0f1f1a; height: 80rpx; }
.preset-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.preset-btn { padding: 12rpx 20rpx; background: #f6f8f7; border: 2rpx solid #e7eae8; border-radius: 999rpx; text-align: center; }
.preset-btn.selected { background: #e7f6ef; border-color: #0b9d6a; }
.preset-label { font-size: 24rpx; font-weight: 600; }
.preset-btn.selected .preset-label { color: #078558; }
.preset-time { font-size: 20rpx; color: #9aa39e; display: block; margin-top: 2rpx; }
.preset-btn.selected .preset-time { color: #078558; }
.time-chips { display: flex; flex-wrap: wrap; gap: 12rpx; align-items: center; }
.time-chip { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 20rpx; background: #e7f6ef; border: 2rpx solid #0b9d6a; border-radius: 999rpx; font-size: 24rpx; color: #078558; font-weight: 600; }
.chip-del { font-size: 22rpx; color: #9aa39e; margin-left: 4rpx; }
.time-add-btn { padding: 12rpx 20rpx; background: #f6f8f7; border: 2rpx dashed #d1d5db; border-radius: 999rpx; font-size: 24rpx; color: #6b7670; }
.cond-row { display: flex; gap: 12rpx; flex-wrap: wrap; }
.cond-btn { padding: 16rpx 24rpx; background: #f6f8f7; border: 2rpx solid #e7eae8; border-radius: 999rpx; font-size: 24rpx; }
.cond-btn.selected { background: #e7f6ef; border-color: #0b9d6a; color: #078558; font-weight: 600; }
.sheet-btns { display: flex; gap: 16rpx; margin-top: 28rpx; }
.btn-ghost { flex: 1; padding: 24rpx; background: #f6f8f7; color: #0f1f1a; border: 2rpx solid #e7eae8; border-radius: 24rpx; font-size: 28rpx; font-weight: 600; }
.btn-green { flex: 2; padding: 24rpx; background: #0b9d6a; color: #fff; border: none; border-radius: 24rpx; font-size: 28rpx; font-weight: 700; box-shadow: 0 8rpx 24rpx rgba(11,157,106,0.3); }

/* 补货弹窗 */
.refill-center { display: flex; align-items: center; justify-content: center; gap: 24rpx; }
.refill-minus, .refill-plus { width: 88rpx; height: 88rpx; border-radius: 28rpx; background: #f6f8f7; border: 2rpx solid #e7eae8; font-size: 44rpx; display: flex; align-items: center; justify-content: center; color: #0f1f1a; }
.refill-num-wrap { min-width: 240rpx; text-align: center; }
.refill-num { font-size: 80rpx; font-weight: 700; font-family: 'Inter', sans-serif; color: #0f1f1a; letter-spacing: -2rpx; }
.refill-unit { font-size: 28rpx; color: #6b7670; font-weight: 500; margin-left: 8rpx; }
.refill-quick { margin-top: 24rpx; display: flex; justify-content: center; gap: 12rpx; }
.refill-opt { padding: 14rpx 28rpx; background: #f6f8f7; border: 2rpx solid #e7eae8; border-radius: 999rpx; font-size: 24rpx; font-weight: 600; color: #6b7670; }
.refill-opt.active { background: #e7f6ef; border-color: #0b9d6a; color: #078558; }
.refill-preview { margin-top: 28rpx; padding: 20rpx 28rpx; background: #f0f8f4; border-radius: 24rpx; font-size: 24rpx; color: #078558; text-align: center; }
.refill-bold { font-weight: 700; font-family: 'Inter', sans-serif; }
.btn-green-full { margin-top: 28rpx; width: 100%; padding: 28rpx 0; background: #0b9d6a; color: #fff; border: none; border-radius: 28rpx; font-size: 30rpx; font-weight: 700; box-shadow: 0 8rpx 24rpx rgba(11,157,106,0.3); }
</style>
