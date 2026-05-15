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
- **药学知识库**：内置 25 条常见慢病药物（降压药、降糖药、他汀类、抗血小板药等）的专业知识
- **语音输入**：支持语音提问（Web Speech API，Chrome / Safari）
- **语音输出**：AI 回复自动朗读，Edge TTS 微软神经语音，流式逐句播放
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
| AI 模型 | [DeepSeek](https://www.deepseek.com/) V3（`deepseek-chat`） |
| Agent 架构 | ReAct（Reasoning + Acting）|
| 语音输入 | Web Speech API |
| 语音输出 | Edge TTS（微软 XiaoxiaoNeural 神经语音）|
| 构建工具 | Vite 5 |
| 部署 | GitHub Pages（H5） |

---

## AI 助手架构详解

### 整体流程

```
用户说话："阿莫西林吃了"
         │
         ▼
┌─────────────────────────────────┐
│  构建上下文（Context）             │
│  ├── 系统提示词（小派人设 + 规则） │
│  ├── 用户画像（年龄/疾病/药品）    │
│  ├── 实时数据（今日打卡/库存）     │
│  ├── 对话历史（或压缩摘要）        │
│  └── 14 个工具定义                │
└─────────────────────────────────┘
         │
         ▼  发送给 DeepSeek V3（流式 SSE）
┌─────────────────────────────────┐
│  ReAct 循环（最多 8 步）           │
│                                  │
│  Step 1: AI 判断需要打卡           │
│    → 返回 tool_call:              │
│      take_med("阿莫西林", [])      │
│                                  │
│  Step 2: 前端执行工具              │
│    → 写入数据库 → 扣减库存         │
│    → 返回 "已打卡：阿莫西林"       │
│                                  │
│  Step 3: AI 看到结果，生成回复      │
│    → 流式输出："打卡成功！💪…"     │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  后处理                           │
│  ├── 刷新药品 / 记录数据           │
│  ├── 异步提取记忆（置信度 > 0.85） │
│  └── 语音播报（TTS 流式朗读）      │
└─────────────────────────────────┘
```

### 四层上下文架构

**第 1 层：用户画像（buildUserProfile）**

动态构建用户信息（基本信息 + 药品列表 + AI 提取的长期记忆），注入系统提示词，让 AI 每次回复都了解"你是谁、吃什么药"。

**第 2 层：实时数据（buildRealtimeData）**

每次对话前从数据库拉取当天打卡状态和库存情况。相比让 AI 调工具查询，直接注入数据减少一轮 Agent 循环，响应更快。

**第 3 层：对话历史管理（manageHistory）**

采用阈值压缩策略控制 token 用量：
- 对话 < 4000 tokens → 全部保留
- 对话 > 4000 tokens → 旧对话压缩为摘要 + 保留最近 6 轮完整对话

**第 4 层：ReAct Agent 循环**

核心推理引擎，不是简单的一问一答，而是循环推理过程：

```
while (步数 < 8) {
    把完整上下文发给 DeepSeek V3

    if (AI 返回 tool_calls) {
        → 并行执行所有工具（Promise.all）
        → 工具结果放回对话历史
        → continue（让 AI 看到结果后继续推理）
    }

    if (AI 返回文本) {
        → 流式输出给用户（SSE 逐字推送）
        → break
    }
}
```

### 14 个工具（Function Calling）

| 类型 | 工具 | 功能 |
|------|------|------|
| **感知**（只读） | `get_today_status` | 今日各药各时段的打卡状态 |
| | `get_stock` | 所有药品库存及可用天数 |
| | `get_medications` | 完整药品列表及详细信息 |
| | `get_history` | 过去 N 天服药历史和依从率 |
| **执行**（写入） | `take_med` | 打卡记录服药 |
| | `skip_med` | 跳过某次服药（记录原因） |
| | `undo_med` | 撤回误操作的打卡 |
| | `update_stock` | 修改药品库存数量 |
| | `add_medication` | 添加新药到用药计划 |
| | `remove_medication` | 从计划中移除药品 |
| **知识 + 记忆** | `search_knowledge` | 搜索药学知识库 |
| | `update_memory` | 存储用户长期记忆 |
| | `generate_report` | 生成今日服药报告 |

每个工具以 JSON Schema 格式定义，随 API 请求发送给 DeepSeek。AI 根据用户自然语言自动决定调用哪个工具、传什么参数。执行类工具内置**澄清机制**（通过系统提示词约束），防止误操作。

### 记忆系统

每次对话结束后，后台异步分析最近 6 条消息，提取值得长期记住的信息（过敏史、医嘱、偏好等），只保存置信度 > 0.85 的明确陈述，下次对话时自动注入用户画像。

### 语音交互

| 方向 | 技术 | 实现方式 |
|------|------|---------|
| 语音输入 | Web Speech API | 浏览器录音 → 实时识别中文 → 自动发送 |
| 语音输出 | Edge TTS（XiaoxiaoNeural） | SentenceDetector 按句号断句 → WebSocket 合成 MP3 → AudioQueue 顺序播放 |

语音输出采用**流式朗读**：不等全部文字生成完，检测到一句话就立即合成并播放，边打字边说话。

---

## 数据库结构

```
medications       # 用药计划（药名、剂量、时间、库存）
med_records       # 每日打卡记录（done / skip / undo）
user_memory       # AI 跨会话记忆（过敏史、偏好、医嘱）
knowledge_chunks  # 药学知识库（25+ 种常见药物）
push_subscriptions / push_jobs  # 推送通知
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

**环境变量**（在 `src/utils/supabase.ts` 和 `src/utils/ai.ts` 中配置）：

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |

**数据库初始化**：在 Supabase SQL Editor 中依次执行 `supabase/migrations/` 目录下的 SQL 文件。

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
│   ├── ai.ts          # Agent 引擎、工具定义、记忆提取
│   ├── speech.ts      # 语音输入（STT）+ 语音输出（TTS）
│   ├── supabase.ts    # Supabase 客户端
│   └── push.ts        # 推送通知
└── components/
    ├── Xiaopai.vue    # 小派吉祥物（9 种心情动画）
    └── CustomTabBar.vue
supabase/
├── migrations/        # 数据库迁移脚本
└── functions/         # Edge Functions（embedding、推送）
```

---

## 设计决策

| 决策 | 原因 |
|------|------|
| 用 DeepSeek V3 而非 R1 | V3 支持 function calling，R1 是推理模型不支持工具调用 |
| 对话历史压缩而非截断 | 压缩保留上下文要点，截断会丢失信息 |
| 工具在前端执行 | 数据层（Pinia store）在前端，执行后可立即更新 UI |
| TTS 按句子切分合成 | 实现"边打字边说话"，不用等全部输出 |
| 记忆设置置信度阈值 | 只记录用户明确陈述的事实，防止 AI 推测变记忆 |

---

## 路线图

- [ ] 服药历史记录页（依从率图表）
- [ ] 推送通知（到点提醒吃药）
- [ ] 用户信息完善（年龄、疾病，优化 AI 画像）
- [ ] 家属监护功能
- [ ] 药品扫码 / 拍照识别
- [ ] 周报 / 月报生成
- [ ] 接入火山引擎 TTS（更高质量语音合成）

---

## License

MIT
