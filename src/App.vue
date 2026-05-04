<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { useUserStore } from "./stores/user";
onLaunch(() => {
  console.log("PillPal 启动");
  const userStore = useUserStore();
  userStore.initElderMode();
});
</script>

<style lang="scss">
/* uView 组件样式 */
@import 'uview-plus/index.scss';

/* 全局样式 */
page {
  background: #f4f6f8;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 28rpx;
  color: #1a1a2e;
  line-height: 1.5;
  box-sizing: border-box;
}

view, text, input, button, scroll-view, textarea {
  box-sizing: border-box;
}

/* 确保 input 可以点击和输入 */
uni-input, uni-textarea {
  pointer-events: auto !important;
}
uni-input input, uni-textarea textarea {
  pointer-events: auto !important;
  -webkit-user-select: auto !important;
  user-select: auto !important;
}

/* 适配底部 tabBar */
.page {
  min-height: 100vh;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

/* 滚动区域 */
.content {
  padding: 24rpx;
  padding-bottom: 48rpx;
}

/* 安全区适配 */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 文字不溢出 */
text {
  word-break: break-all;
}

/* 通用按钮样式 */
button {
  margin: 0;
  padding: 0;
  line-height: inherit;
  font-size: inherit;
}

button::after {
  border: none;
}

/* ═══ 长辈模式（全局覆盖） ═══ */
.elder-mode page,
page.elder-mode {
  background: #faf6ef;
  font-size: 34rpx;
}

.elder-mode .page {
  background: #faf6ef !important;
}

/* 长辈模式：文字放大 */
.elder-mode text { font-size: 110%; }
.elder-mode .mc-name, .elder-mode .sc-name, .elder-mode .role-title { font-size: 38rpx !important; }
.elder-mode .mc-dosage, .elder-mode .mc-condition, .elder-mode .sc-spec { font-size: 26rpx !important; }
.elder-mode .btn-take, .elder-mode .btn-skip, .elder-mode .sc-btn-refill, .elder-mode .sc-btn-edit {
  font-size: 28rpx !important; padding: 16rpx 32rpx !important;
}

/* 长辈模式：暖色调 */
.elder-mode .hero-card,
.elder-mode .med-card,
.elder-mode .stock-card,
.elder-mode .section-card,
.elder-mode .stats-card,
.elder-mode .ov-card,
.elder-mode .bubble-ai { background: #fffdf8 !important; }

.elder-mode .top-bar,
.elder-mode .chat-header { background: #faf6ef !important; }

/* 长辈模式：更大触摸区域 */
.elder-mode .med-card { padding: 32rpx 32rpx !important; gap: 28rpx !important; }
.elder-mode .mc-icon { width: 96rpx !important; height: 96rpx !important; border-radius: 28rpx !important; }
.elder-mode .row { padding: 32rpx 28rpx !important; }
.elder-mode .quick-card { padding: 32rpx !important; }
.elder-mode .date-item { width: 100rpx !important; padding: 20rpx 0 !important; }
</style>
