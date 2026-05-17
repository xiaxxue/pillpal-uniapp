import { normalizeTime, getMedKey } from './date'
import { supabase } from './supabase'

const DEEPSEEK_API_KEY = 'sk-b903314c9e8d40e2b56d37a53252ed17'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

// ====== 工具定义（感知 + 执行） ======
const tools = [
  // 感知工具
  {
    type: 'function',
    function: {
      name: 'get_today_status',
      description: '查看今日服药打卡状态。返回每种药的每个时段是否已服用。',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_stock',
      description: '查看所有药品的库存详情，包括剩余片数、可服天数、是否紧张。',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_medications',
      description: '查看用户的完整药品列表，包括名称、剂量、服用时间、服用条件等详细信息。',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  // 执行工具
  {
    type: 'function',
    function: {
      name: 'take_med',
      description: '帮用户打卡记录服药。当用户说吃了某个药、某个时段的药吃了、帮我打卡等意思时调用。',
      parameters: {
        type: 'object',
        properties: {
          med_name: { type: 'string', description: '药品名称。如果用户没指定具体药品，填"all"' },
          time_slots: { type: 'array', items: { type: 'string' }, description: '服药时间，格式"HH:MM"，如["08:00","14:30"]。没指定填[]' }
        },
        required: ['med_name', 'time_slots']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'skip_med',
      description: '跳过某次服药。当用户说跳过、不吃了、今天不想吃等意思时调用。',
      parameters: {
        type: 'object',
        properties: {
          med_name: { type: 'string', description: '药品名称。跳过全部填"all"' },
          time_slots: { type: 'array', items: { type: 'string' }, description: '服药时间，格式"HH:MM"。没指定填[]' },
          reason: { type: 'string', description: '跳过原因' }
        },
        required: ['med_name', 'time_slots', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'undo_med',
      description: '撤回/取消服药打卡记录。当用户说撤回、取消、打错了等意思时调用。',
      parameters: {
        type: 'object',
        properties: {
          med_name: { type: 'string', description: '药品名称。撤回全部填"all"' },
          time_slots: { type: 'array', items: { type: 'string' }, description: '服药时间，格式"HH:MM"。没指定填[]' }
        },
        required: ['med_name', 'time_slots']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_stock',
      description: '修改药品库存数量。当用户说还有多少片、修改库存、买了药等意思时调用。',
      parameters: {
        type: 'object',
        properties: {
          med_name: { type: 'string', description: '药品名称' },
          quantity: { type: 'number', description: '新的库存数量（片）' }
        },
        required: ['med_name', 'quantity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_medication',
      description: '添加一种新药品到用药计划。当用户说医生开了新药、要加一种药等意思时调用。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '药品名称，如"二甲双胍片"' },
          dosage: { type: 'string', description: '单次剂量，如"0.5g × 1片"' },
          times: {
            type: 'array',
            items: { type: 'string' },
            description: '服用时间，格式"HH:MM"，如["08:00","21:00"]。根据用户描述设定合理时间'
          },
          condition: { type: 'string', description: '服用条件：空腹、餐后30分钟、睡前、无要求' },
          disease: { type: 'string', description: '治什么病，如"糖尿病"' },
          stock_count: { type: 'number', description: '当前库存片数，默认0' }
        },
        required: ['name', 'dosage', 'times', 'condition', 'disease']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_medication',
      description: '从用药计划中删除一种药品。当用户说停药、不吃了、医生让停等意思时调用。注意：这是危险操作，务必先和用户确认。',
      parameters: {
        type: 'object',
        properties: {
          med_name: { type: 'string', description: '要删除的药品名称' }
        },
        required: ['med_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_history',
      description: '查询过去几天的服药历史记录，了解依从率趋势。当用户问"这周吃药情况"、"最近几天"、"坚持了多久"、"依从率是多少"等时调用。',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: '查询过去多少天，默认7天，最多30天' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: '搜索专业药学知识库。当用户问药物副作用、相互作用、禁忌症、服药注意事项等专业问题时调用，获取权威参考信息。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词，如"二甲双胍 副作用"、"氨氯地平 相互作用"' },
          drug_names: { type: 'array', items: { type: 'string' }, description: '相关药品名称列表，用于精确过滤' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_memory',
      description: '记住用户提到的重要信息，供以后的对话使用。当用户提到医嘱、过敏史、偏好、习惯等值得长期记住的信息时调用。',
      parameters: {
        type: 'object',
        properties: {
          memory_type: { type: 'string', enum: ['preference', 'medical_note', 'habit', 'context'], description: '记忆类型' },
          key: { type: 'string', description: '简短的标识键，如"allergy"、"reply_style"、"doctor_advice_bp"' },
          value: { type: 'string', description: '记忆内容，一句话描述' }
        },
        required: ['memory_type', 'key', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: '生成今日服药报告摘要。当用户说"帮我总结一下今天"、"生成报告"、"今天情况怎样"等意思时调用。',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
]

// ====== 第1层：用户画像 ======
export function buildUserProfile(user: any, medications: any[], memoryText = ''): string {
  const name = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '用户'
  const age = user?.user_metadata?.age || ''
  const gender = user?.user_metadata?.gender === 'female' ? '女' : user?.user_metadata?.gender === 'male' ? '男' : ''
  const diseases = user?.user_metadata?.diseases || []

  let profile = `【用户画像】\n${name}`
  if (age) profile += `，${age}岁`
  if (gender) profile += `，${gender}`
  if (diseases.length > 0) profile += `\n疾病：${diseases.join('、')}`

  if (medications.length > 0) {
    profile += '\n药品：'
    medications.forEach(m => {
      profile += `\n- ${m.name}（${m.dosage}），${m.condition}，治${m.disease}`
      if (m.times) profile += `，${m.times.join('/')}`
    })
  }

  if (memoryText) profile += '\n' + memoryText

  return profile
}

// ====== 对话后自动提取记忆 ======
export async function extractMemories(
  conversation: { role: string; content: string }[]
): Promise<Array<{ memory_type: string; key: string; value: string; confidence: number }>> {
  if (conversation.length < 2) return []
  const text = conversation.map(m => (m.role === 'user' ? '用户：' : '小派：') + m.content).join('\n')
  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `从以下对话中提取值得长期记住的信息。

【只提取同时满足以下所有条件的内容】
1. 用户明确说出来的事实（不推断、不猜测）
2. 对未来用药管理有实际帮助：过敏史、医嘱变化、副作用反应、服药偏好、重要病史、就诊结果
3. 不是今日临时操作（今天打卡、今天跳过这类不记）
4. 不是药品列表里已有的基础信息（药名剂量等已存储，不重复记）

【置信度标准】
0.9+ 用户直接陈述的事实（"我对青霉素过敏"）
0.85 用户明确表达的偏好（"我不喜欢早上吃药"）
低于0.85 的内容不要提取

以JSON数组返回：[{"memory_type":"medical_note|preference|habit|context","key":"简短键名","value":"一句话内容","confidence":0.0-1.0}]
没有符合条件的内容返回 []。只输出JSON，不要其他内容。`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 300
      })
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || '[]'
    return JSON.parse(raw.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''))
  } catch {
    return []
  }
}

// ====== 第2层：实时数据 ======
export function buildRealtimeData(medications: any[], records: Record<string, string>): string {
  const doneKeys = Object.keys(records).filter(k => records[k]?.startsWith('done_'))
  const skipKeys = Object.keys(records).filter(k => records[k]?.startsWith('skip_'))
  const totalSlots = medications.reduce((sum, m) => sum + (m.times?.length || 1), 0)

  const now = new Date()
  const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日'
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  let data = `\n【当前时间】${dateStr} ${weekNames[now.getDay()]} ${timeStr}`
  data += `\n【今日状态】${totalSlots}次药中已服${doneKeys.length}次`
  if (skipKeys.length > 0) data += `，跳过${skipKeys.length}次`

  if (doneKeys.length > 0) {
    data += '\n已服：' + doneKeys.map(k => {
      const time = records[k].replace('done_', '')
      return k.split('_')[0] + '(' + time + ')'
    }).join('、')
  }

  const pendingKeys = Object.keys(records).length < totalSlots
  if (pendingKeys) {
    const pending: string[] = []
    medications.forEach(m => {
      if (!m.times) return
      m.times.forEach((t: string) => {
        const time = normalizeTime(t)
        const key = getMedKey(m.name, time)
        if (!records[key]) pending.push(m.name + '(' + time + ')')
      })
    })
    if (pending.length > 0) data += '\n待服：' + pending.join('、')
  }

  // 库存
  data += '\n【库存】'
  medications.forEach(m => {
    const daily = m.daily_usage || 1
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / daily) : 0
    const icon = days <= 7 ? '⚠' : '✅'
    data += `${m.name} ${m.stock_count}片/${days}天${icon} `
  })

  return data
}

// ====== 第3层：对话历史压缩 ======

// 估算 token 数（中文约1字=1.5 token）
export function estimateTokens(messages: { role: string; content: string }[]): number {
  return messages.reduce((sum, m) => sum + Math.ceil(m.content.length * 1.5), 0)
}

// 压缩旧对话为摘要
export async function compressHistory(oldMessages: { role: string; content: string }[]): Promise<string> {
  if (oldMessages.length === 0) return ''

  try {
    const conversation = oldMessages.map(m =>
      (m.role === 'user' ? '用户：' : '小派：') + m.content
    ).join('\n')

    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '请用一段简短的话总结以下对话的要点，包括用户问了什么、做了什么操作、得到了什么建议。只输出摘要，不要其他内容。' },
          { role: 'user', content: conversation }
        ],
        temperature: 0.3,
        max_tokens: 150
      })
    })

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch {
    return '（历史对话摘要生成失败）'
  }
}

// 管理对话历史：超过阈值时压缩
const TOKEN_THRESHOLD = 4000
const KEEP_RECENT_ROUNDS = 6 // 保留最近6轮完整对话

export async function manageHistory(
  allMessages: { role: string; content: string }[],
  existingSummary: string
): Promise<{ history: { role: string; content: string }[]; summary: string }> {

  const totalTokens = estimateTokens(allMessages)
  console.log(`对话历史: ${allMessages.length}条消息, 约${totalTokens} tokens`)

  if (totalTokens <= TOKEN_THRESHOLD) {
    // 没超阈值，全部保留
    const history: { role: string; content: string }[] = []
    if (existingSummary) {
      history.push({ role: 'assistant', content: '[对话摘要] ' + existingSummary })
    }
    history.push(...allMessages)
    return { history, summary: existingSummary }
  }

  // 超过阈值，压缩旧轮次
  console.log('触发对话压缩...')

  // 按轮次分组（一问一答 = 一轮）
  const rounds: { role: string; content: string }[][] = []
  for (let i = 0; i < allMessages.length; i += 2) {
    const round = [allMessages[i]]
    if (i + 1 < allMessages.length) round.push(allMessages[i + 1])
    rounds.push(round)
  }

  // 保留最近 KEEP_RECENT_ROUNDS 轮
  const keepRounds = rounds.slice(-KEEP_RECENT_ROUNDS)
  const oldRounds = rounds.slice(0, -KEEP_RECENT_ROUNDS)

  // 把旧轮次（+ 已有摘要）压缩
  const oldMessages: { role: string; content: string }[] = []
  if (existingSummary) {
    oldMessages.push({ role: 'assistant', content: existingSummary })
  }
  oldRounds.forEach(r => oldMessages.push(...r))

  const newSummary = await compressHistory(oldMessages)
  console.log('压缩完成，摘要:', newSummary)

  // 组装新历史
  const history: { role: string; content: string }[] = []
  if (newSummary) {
    history.push({ role: 'assistant', content: '[对话摘要] ' + newSummary })
  }
  keepRounds.forEach(r => history.push(...r))

  return { history, summary: newSummary }
}

// ====== 内部：流式单步请求 ======
// 每一步都用 SSE 流式请求：
//   - 若 AI 返回 tool_calls → 累积 JSON 后返回，不触发 onTextChunk
//   - 若 AI 返回文本       → 逐块调用 onTextChunk（打字机效果）
async function fetchStream(
  messages: any[],
  onTextChunk?: (chunk: string) => void
): Promise<{ tool_calls?: any[]; content?: string }> {
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY },
    body: JSON.stringify({
      model: 'deepseek-chat', messages, tools, tool_choice: 'auto',
      temperature: 0.7, max_tokens: 800, stream: true
    })
  })

  // API 返回错误（余额不足、鉴权失败等）
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const errMsg = errData?.error?.message || `HTTP ${response.status}`
    console.error('DeepSeek API 错误:', errMsg)
    if (response.status === 402) throw new Error('API_BALANCE')
    if (response.status === 401) throw new Error('API_AUTH')
    if (response.status === 429) throw new Error('API_RATE_LIMIT')
    throw new Error('API_ERROR')
  }

  // 降级：浏览器不支持 ReadableStream
  if (!response.body) {
    const fallback = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY },
      body: JSON.stringify({ model: 'deepseek-chat', messages, tools, tool_choice: 'auto', temperature: 0.7, max_tokens: 800 })
    })
    const data = await fallback.json()
    const msg = data.choices?.[0]?.message
    if (msg?.tool_calls?.length) return { tool_calls: msg.tool_calls }
    const text = msg?.content || ''
    onTextChunk?.(text)
    return { content: text }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  const toolMap: Record<number, { id: string; name: string; args: string }> = {}

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const raw = decoder.decode(value, { stream: true })
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload)
          const delta = parsed.choices?.[0]?.delta
          if (!delta) continue
          // 文本内容
          if (delta.content) {
            fullContent += delta.content
            onTextChunk?.(delta.content)
          }
          // 工具调用（流式，需拼接）
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const i = tc.index ?? 0
              if (!toolMap[i]) toolMap[i] = { id: '', name: '', args: '' }
              if (tc.id) toolMap[i].id = tc.id
              if (tc.function?.name) toolMap[i].name += tc.function.name
              if (tc.function?.arguments) toolMap[i].args += tc.function.arguments
            }
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock()
  }

  const toolCalls = Object.values(toolMap)
  if (toolCalls.length > 0) {
    return {
      tool_calls: toolCalls.map(tc => ({
        id: tc.id, type: 'function',
        function: { name: tc.name, arguments: tc.args }
      }))
    }
  }
  return { content: fullContent }
}

// ====== ReAct Agent 引擎 ======
const MAX_STEPS = 8

export type AgentStep = {
  type: 'thought' | 'action' | 'observation' | 'response'
  content: string
  toolName?: string
  toolArgs?: any
}

export type AgentResult = {
  text: string
  steps: AgentStep[]
}

// 执行工具的回调类型
export type ToolExecutor = (name: string, args: any) => Promise<string>

export async function runAgent(
  userMessage: string,
  userProfile: string,
  realtimeData: string,
  history: { role: string; content: string }[],
  executeTool: ToolExecutor,
  onStep?: (step: AgentStep) => void,
  onStream?: (chunk: string) => void
): Promise<AgentResult> {
  const steps: AgentStep[] = []

  // 构建初始消息
  const messages: any[] = [
    {
      role: 'system',
      content: `你是"小派"，PillPal 用药管家的 AI 助手，同时也是一位有温度的健康顾问，拥有专业的医学和药学知识。

## 你的性格
- 温暖、耐心、可靠，像一个关心你的家人
- 语气亲切自然，不要机械生硬
- 适当使用 emoji 增加亲切感，但不要过度堆砌
- 回答简洁有用，一般 2-4 句话，不要长篇大论

## 用户信息
${userProfile}
${realtimeData}

## 澄清原则（先问清楚再执行）
- 用户说"打卡"/"吃了"，但没说哪种药，且用药计划里有 2 种及以上药 → 先问"是全部都吃了，还是某几种？"，等确认后再调 take_med
- 用户说"停药"/"删除"/"不吃了" → 先复述药名确认："你是说停用【药名】对吗？停用后记录会删除。"等用户回复确认后才调 remove_medication
- 用户说"跳过" → 简单问一下原因（"是不舒服，还是医生说可以停一次？"），然后再调 skip_med
- 用户指令清晰（只有一种药、或明确说了药名/时段）→ 直接执行，不用多问

## 工具使用策略
- 用户问今日用药 → 调 get_today_status，清晰列出已服/未服
- 用户说吃了/打卡（已澄清）→ 调 take_med，操作后给鼓励
- 用户问库存 → 调 get_stock，重点提示 ≤7 天的药
- 用户问历史/这周/依从率趋势 → 调 get_history（默认7天）
- 用户问药物知识（副作用、相互作用、用途、漏服怎么办）→ **先调 get_medications 了解用户在服哪些药，然后直接用你的医药知识回答，无需其他工具**
- 需要多个信息时可以同时调用多个工具（并行执行，效率更高）
- 不确定数据时先查，不要猜测

## 药物知识（直接用你的知识回答，无需工具）
你具备专业药学知识，可直接回答任何药物的用途、副作用、注意事项、相互作用等问题。

漏服补救原则（根据具体药品判断，给出有针对性的建议）：
- 长效降压药（氨氯地平等）：距下次用药 >12 小时可补，否则跳过，绝不两次叠加
- 降糖药（二甲双胍等）：餐时/餐后药随下一餐补服；空腹类直接跳过
- 他汀类（阿托伐他汀等）：当天想起即补；次日才想起则正常服用，无需补
- 抗凝药（小剂量阿司匹林）：当天补服，次日勿双倍
- 通用原则：任何情况下都不要一次服双倍剂量

## 重要规则
- 调药、停药、换药 → 必须说"请先咨询医生"
- 删除药品 → 先和用户确认再执行
- 不确定的专业问题 → 诚实说"建议咨询医生或药师"，不要编造
- 用户情绪低落 → 优先给鼓励和关心，再给信息
- 用户忘吃药 → 不责备，给出针对该药品的具体补救建议
- 每次回复结尾加一句自然的关心话，但避免每次都用同一句`
    },
    ...history,
    { role: 'user', content: userMessage }
  ]

  // ReAct 循环
  for (let step = 0; step < MAX_STEPS; step++) {
    console.log(`Agent Step ${step + 1}/${MAX_STEPS}`)

    try {
      const stepResult = await fetchStream(messages, onStream)

      // AI 要调用工具 → Action（并行执行）
      if (stepResult.tool_calls?.length) {
        // 把 AI 的回复（含 tool_calls）加入消息历史
        messages.push({ role: 'assistant', content: null, tool_calls: stepResult.tool_calls })

        // 先记录所有 Action 步骤（让 UI 立即显示）
        const pending = stepResult.tool_calls.map(call => {
          const toolName = call.function.name
          const toolArgs = (() => { try { return JSON.parse(call.function.arguments) } catch { return {} } })()
          const actionStep: AgentStep = { type: 'action', content: `调用 ${toolName}`, toolName, toolArgs }
          steps.push(actionStep)
          onStep?.(actionStep)
          return { call, toolName, toolArgs }
        })

        // 并行执行所有工具
        const toolResults = await Promise.all(
          pending.map(async ({ call, toolName, toolArgs }) => {
            const result = await executeTool(toolName, toolArgs)
            const obsStep: AgentStep = { type: 'observation', content: result }
            steps.push(obsStep)
            onStep?.(obsStep)
            return { id: call.id, result }
          })
        )

        // 按顺序把工具结果加入消息历史
        toolResults.forEach(({ id, result }) => {
          messages.push({ role: 'tool', tool_call_id: id, content: result })
        })

        continue
      }

      // AI 直接回复文本 → Response（已通过 onStream 流式推送）
      const text = stepResult.content || '抱歉，我没理解 😅'
      const responseStep: AgentStep = { type: 'response', content: text }
      steps.push(responseStep)
      onStep?.(responseStep)
      return { text, steps }

    } catch (error: any) {
      console.error(`Step ${step + 1} 失败:`, error)
      const errMap: Record<string, string> = {
        'API_BALANCE': '小派的 AI 服务额度用完了，请联系管理员充值 💰',
        'API_AUTH': '小派的 AI 服务鉴权失败，请检查配置 🔑',
        'API_RATE_LIMIT': '请求太频繁了，稍等一下再试 ⏳',
        'API_ERROR': 'AI 服务暂时不可用，请稍后再试 🔧'
      }
      const msg = errMap[error?.message] || '网络不太好，请稍后再试 📶'
      return { text: msg, steps }
    }
  }

  // 超过最大步数
  return { text: '这个问题比较复杂，我已经尽力分析了。如果还有问题请再问我 😊', steps }
}

// ====== 轻量流式对话（无工具，省 token）======
// 用于问候等不需要调工具的场景，比 runAgent 省约 60% token
export async function simpleStreamChat(
  systemPrompt: string,
  userMessage: string,
  onChunk?: (chunk: string) => void,
  maxTokens = 200
): Promise<string> {
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: true
    })
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    if (response.status === 402) throw new Error('API_BALANCE')
    throw new Error(errData?.error?.message || `HTTP ${response.status}`)
  }

  let fullContent = ''
  if (!response.body) {
    const data = await response.json()
    fullContent = data.choices?.[0]?.message?.content || ''
    onChunk?.(fullContent)
    return fullContent
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        try {
          const content = JSON.parse(payload).choices?.[0]?.delta?.content
          if (content) { fullContent += content; onChunk?.(content) }
        } catch {}
      }
    }
  } finally { reader.releaseLock() }
  return fullContent
}

// ====== 知识库检索 ======
export async function searchKnowledge(query: string, drugNames?: string[]): Promise<string> {
  try {
    const { data } = await supabase.rpc('search_knowledge_text', {
      query_text: query,
      filter_drugs: drugNames?.length ? drugNames : null,
      match_count: 3
    })
    if (!data?.length) return ''
    return data.map((r: any) => `【${r.title}】\n${r.content}`).join('\n\n---\n\n')
  } catch {
    return ''
  }
}

// 操作完成后生成友好回复
export async function askAIWithResult(userMessage: string, userProfile: string, realtimeData: string, actionResult: string): Promise<string> {
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是"小派"，用温暖亲切的语气回复。用 emoji。简短。\n${userProfile}\n${realtimeData}\n\n刚执行的操作：${actionResult}\n请基于操作结果给用户友好回复。`
          },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    })
    const data = await response.json()
    return data.choices?.[0]?.message?.content || actionResult
  } catch {
    return actionResult
  }
}
