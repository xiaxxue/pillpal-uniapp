const DEEPSEEK_API_KEY = 'sk-b903314c9e8d40e2b56d37a53252ed17'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

// ====== 工具定义 ======
const tools = [
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

// ====== 主 API 调用 ======
export async function askAI(
  userMessage: string,
  userProfile: string,
  realtimeData: string,
  history: { role: string; content: string }[]
): Promise<{ text: string; functionCall?: { name: string; args: any } }> {
  try {
    const messages: any[] = [
      {
        role: 'system',
        content: `你是"小派"，PillPal 用药管家的 AI 助手。

${userProfile}
${realtimeData}

你可以帮用户做以下操作：
1. 打卡记录服药（take_med）
2. 跳过服药（skip_med）
3. 撤回打卡（undo_med）
4. 修改库存（update_stock）

当用户想做这些操作时，调用对应的 function。
当用户只是问问题时，直接回答，不调用 function。

规则：
- 用温暖亲切的语气
- 回答简短实用
- 涉及调药停药提醒咨询医生
- 用 emoji 让回答友好
- 记住之前的对话内容`
      },
      ...history,
      { role: 'user', content: userMessage }
    ]

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
    console.log('AI 返回:', JSON.stringify(data).slice(0, 300))

    if (data.choices?.[0]) {
      const msg = data.choices[0].message
      if (msg.tool_calls?.length > 0) {
        const call = msg.tool_calls[0]
        return {
          text: msg.content || '',
          functionCall: { name: call.function.name, args: JSON.parse(call.function.arguments) }
        }
      }
      return { text: msg.content || '抱歉，我没理解 😅' }
    }
    return { text: '抱歉，暂时无法回答 😅' }
  } catch (error) {
    console.error('AI 请求失败:', error)
    return { text: '网络不太好，请稍后再试 📶' }
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
