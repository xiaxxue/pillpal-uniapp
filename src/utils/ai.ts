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
          time_slots: { type: 'array', items: { type: 'number' }, description: '时段小时数。晨起=7，早餐后=8，午餐后=14.5，晚餐后=18.5，晚间=21。没指定填[]' }
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
          time_slots: { type: 'array', items: { type: 'number' }, description: '时段小时数。没指定填[]' },
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
          time_slots: { type: 'array', items: { type: 'number' }, description: '时段小时数。没指定填[]' }
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
  }
]

// ====== 第1层：用户画像 ======
export function buildUserProfile(user: any, medications: any[]): string {
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

  return profile
}

// ====== 第2层：实时数据 ======
export function buildRealtimeData(medications: any[], records: Record<string, string>): string {
  const doneKeys = Object.keys(records).filter(k => records[k]?.startsWith('done_'))
  const skipKeys = Object.keys(records).filter(k => records[k]?.startsWith('skip_'))
  const totalSlots = medications.reduce((sum, m) => sum + (m.times?.length || 1), 0)

  let data = `\n【今日状态】${totalSlots}次药中已服${doneKeys.length}次`
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
        const key = m.name + '_' + (t.match(/(\d+[.:]\d+)/) ? parseFloat(t.match(/(\d+)/)?.[0] || '0') : 0)
        if (!records[key]) pending.push(m.name + '(' + t + ')')
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

// ====== ReAct Agent 引擎 ======
const MAX_STEPS = 5

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
  onStep?: (step: AgentStep) => void
): Promise<AgentResult> {
  const steps: AgentStep[] = []

  // 构建初始消息
  const messages: any[] = [
    {
      role: 'system',
      content: `你是"小派"，PillPal 用药管家的 AI 智能体。

${userProfile}
${realtimeData}

你可以使用以下工具来帮助用户。你可以连续调用多个工具来完成复杂任务。

例如用户说"帮我看看今天的情况"，你可以：
1. 先调 get_today_status 查看打卡状态
2. 再调 get_stock 查看库存
3. 综合分析后给用户建议

规则：
- 需要信息时主动调工具查询，不要猜测
- 可以连续调用多个工具
- 危险操作（删药、停药）先和用户确认再执行
- 用温暖亲切的语气，用 emoji
- 回答简短实用
- 涉及调药停药提醒咨询医生`
    },
    ...history,
    { role: 'user', content: userMessage }
  ]

  // ReAct 循环
  for (let step = 0; step < MAX_STEPS; step++) {
    console.log(`Agent Step ${step + 1}/${MAX_STEPS}`)

    try {
      const response = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 500
        })
      })

      const data = await response.json()
      console.log(`Step ${step + 1} AI 返回:`, JSON.stringify(data).slice(0, 300))

      if (!data.choices?.[0]) {
        return { text: '抱歉，暂时无法回答 😅', steps }
      }

      const msg = data.choices[0].message

      // AI 要调用工具 → Action
      if (msg.tool_calls?.length > 0) {
        // 把 AI 的回复（含 tool_calls）加入消息
        messages.push(msg)

        // 执行每个工具调用
        for (const call of msg.tool_calls) {
          const toolName = call.function.name
          const toolArgs = JSON.parse(call.function.arguments)

          // 记录 Action 步骤
          const actionStep: AgentStep = {
            type: 'action',
            content: `调用 ${toolName}`,
            toolName,
            toolArgs
          }
          steps.push(actionStep)
          onStep?.(actionStep)

          // 执行工具
          const result = await executeTool(toolName, toolArgs)

          // 记录 Observation 步骤
          const obsStep: AgentStep = {
            type: 'observation',
            content: result
          }
          steps.push(obsStep)
          onStep?.(obsStep)

          // 把工具结果以 tool role 加入消息
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result
          })
        }

        // 继续循环，让 AI 根据工具结果决定下一步
        continue
      }

      // AI 直接回复文本 → Response，循环结束
      const responseStep: AgentStep = {
        type: 'response',
        content: msg.content || ''
      }
      steps.push(responseStep)
      onStep?.(responseStep)

      return { text: msg.content || '抱歉，我没理解 😅', steps }

    } catch (error) {
      console.error(`Step ${step + 1} 失败:`, error)
      return { text: '网络不太好，请稍后再试 📶', steps }
    }
  }

  // 超过最大步数
  return { text: '这个问题比较复杂，我已经尽力分析了。如果还有问题请再问我 😊', steps }
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
