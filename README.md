# PillPal · 小派用药管家

> 一款面向慢性病患者的 AI 用药管理应用，内置智能助手"小派"。

**在线体验** → https://xiaxxue.github.io/pillpal-uniapp/

---

## 项目简介

慢性病患者（高血压、糖尿病、心脏病等）每天需要按时服用多种药物，但漏服、混淆、库存不足等问题十分普遍。PillPal 通过 AI 助手"小派"，帮助用户：

- 每天按时打卡记录服药情况
- 随时询问药物知识、副作用、漏服处理方法
- 追踪库存，提前预警快用完的药
- 查看历史依从率，了解自己的用药坚持情况

---

## 功能特性

### AI 助手 · 小派

- **ReAct Agent 架构**：多步骤推理 + 工具并行调用，能理解复杂指令
- **流式输出**：回复边生成边显示，打字机效果，响应体验更流畅
- **主动问候**：每次打开自动分析当日用药状态，有漏服或库存警告时直接提醒
- **跨会话记忆**：记住用户说过的医嘱、过敏史、用药偏好，下次对话延续上下文
- **药学知识库**：内置 25 条常见慢病药物（降压药、降糖药、他汀类、抗血小板药等）的专业知识，漏服处理、副作用、相互作用随时查询
- **语音输入**：支持语音提问（Chrome / Safari）
- **澄清机制**：打卡指令模糊时先询问确认，避免误操作

### 用药管理

- 添加 / 删除药品，设置服用时间、剂量、条件
- 每日打卡 / 跳过 / 撤回
- 库存追踪，自动扣减，不足 7 天时标记警告
- 历史服药记录，计算依从率

### 其他

- **长辈模式**：大字体、暖色调、更大点击区域
- **家属绑定**：生成邀请码，让家人远程关注用药情况（开发中）
- **角色切换**：患者 / 家属双视角

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | [UniApp](https://uniapp.dcloud.io/) + Vue 3 + TypeScript |
| UI 组件 | uview-plus |
| 状态管理 | Pinia |
| 后端 & 数据库 | [Supabase](https://supabase.com/)（PostgreSQL + RLS） |
| AI 模型 | [DeepSeek](https://www.deepseek.com/) `deepseek-chat` |
| Agent 架构 | ReAct（Reasoning + Acting）|
| 部署 | GitHub Pages（H5） |

### 数据库结构

```
medications       # 用药计划
med_records       # 每日打卡记录
user_memory       # AI 跨会话记忆
knowledge_chunks  # 药学知识库
push_subscriptions / push_jobs  # 推送通知（待完善）
family_links      # 家属绑定
```

---

## 本地运行

**前置条件**：Node.js 18+、pnpm 或 npm

```bash
# 克隆项目
git clone https://github.com/xiaxxue/pillpal-uniapp.git
cd pillpal-uniapp

# 安装依赖
npm install

# 启动 H5 开发服务器
npm run dev:h5
```

**环境变量**（在 `src/utils/supabase.ts` 和 `src/utils/ai.ts` 中直接配置）：

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |

**数据库初始化**：在 Supabase SQL Editor 中依次执行 `supabase/migrations/` 目录下的 4 个 SQL 文件。

---

## 项目结构

```
src/
├── pages/
│   ├── home/          # 首页（今日用药概览）
│   ├── assistant/     # 小派聊天界面
│   ├── stock/         # 库存管理
│   ├── profile/       # 个人中心
│   ├── records/       # 服药历史记录
│   └── role-select/   # 角色选择（患者/家属）
├── stores/
│   ├── user.ts        # 用户状态
│   ├── medications.ts # 药品数据
│   ├── records.ts     # 打卡记录
│   └── memory.ts      # AI 记忆
├── utils/
│   ├── ai.ts          # Agent 引擎、工具定义、知识库检索
│   ├── speech.ts      # 语音输入
│   └── push.ts        # 推送通知
└── components/
    ├── Xiaopai.vue    # 小派吉祥物动画
    └── CustomTabBar.vue
supabase/
├── migrations/        # 数据库迁移脚本
└── functions/         # Edge Functions（embedding、推送）
```

---

## 小派 Agent 设计

小派基于 **ReAct（Reasoning + Acting）** 模式实现，每一步都是"思考 → 调用工具 → 观察结果 → 再思考"的循环：

```
用户输入
   ↓
系统提示（用户画像 + 实时数据 + 规则）
   ↓
DeepSeek 推理（最多 8 步）
   ↓
工具并行调用（Promise.all）
   ↓
观察结果 → 继续推理 or 直接回复
   ↓
流式输出到界面
   ↓
后台异步提取记忆（存入 Supabase）
```

**可用工具**：`get_today_status` / `get_medications` / `get_stock` / `take_med` / `skip_med` / `undo_med` / `update_stock` / `add_medication` / `remove_medication` / `get_history` / `search_knowledge` / `update_memory` / `generate_report`

---

## 路线图

- [ ] 服药历史记录页（依从率图表）
- [ ] 推送通知（到点提醒吃药）
- [ ] 用户信息完善（年龄、疾病，优化 AI 画像）
- [ ] 家属监护功能
- [ ] 药品扫码/拍照识别
- [ ] 周报 / 月报生成

---

## License

MIT
