<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("PillPal 启动");
});
</script>

<style>
/* 全局样式 */
page {
  background: #f4f6f8;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 28rpx;
  color: #1a1a2e;
  line-height: 1.5;
  box-sizing: border-box;
}

view, text, input, button, scroll-view {
  box-sizing: border-box;
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
</style>
