const DEEPSEEK_API_KEY = 'sk-b903314c9e8d40e2b56d37a53252ed17'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

// 定义小派可以调用的工具
const tools = [
  {
    type: 'function',
    function: {
      name: 'take_med',
      description: '帮用户打卡记录服药。当用户说吃了某个药、某个时段的药吃了、帮我打卡等意思时调用。',
      parameters: {
        type: 'object',
        properties: {
          med_name: { type: 'string', description: '药品名称，如"氨氯地平片"。如果用户没指定具体药品，填"all"' },
          time_slots: {
            type: 'array',
            items: { type: 'number' },
            description: '服药时段的小时数。晨起=7，早餐后=8，午餐后=14.5，晚餐后=18.5，晚间=21。如果用户说全部，填所有未打卡的时段。如果没指定时段，填空数组[]'
          }
        },
        required: ['med_name', 'time_slots']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'undo_med',
      description: '撤回/取消用户的服药打卡记录。当用户说撤回、取消、没吃、打错了等意思时调用。',
      parameters: {
        type: 'object',
        properties: {
          med_name: { type: 'string', description: '药品名称。如果要撤回全部，填"all"' },
          time_slots: {
            type: 'array',
            items: { type: 'number' },
            description: '要撤回的时段小时数。如果没指定时段，填空数组[]'
          }
        },
        required: ['med_name', 'time_slots']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'skip_med',
      description: '跳过某次服药。当用户说跳过、不吃了、今天不想吃、副作用不舒服不吃等意思时调用。',
      parameters: {
        type: 'object',
        properties: {
          med_name: { type: 'string', description: '药品名称。如果跳过全部，填"all"' },
          time_slots: {
            type: 'array',
            items: { type: 'number' },
            description: '要跳过的时段小时数。如果没指定，填空数组[]'
          },
          reason: { type: 'string', description: '跳过原因。如：副作用不适、忘记携带、医生建议暂停、其他' }
        },
        required: ['med_name', 'time_slots', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_stock',
      description: '修改药品库存数量。当用户说还有多少片、修改库存、买了药、补货等意思时调用。',
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

// 调用 AI（支持 function calling + 对话历史）
export async function askAI(userMessage: string, context: string, history: { role: string; content: string }[] = []): Promise<{ text: string; functionCall?: { name: string; args: any } }> {
  try {
    // 构建消息列表：system + 历史对话 + 当前问题
    const messages: any[] = [
      {
        role: 'system',
        content: `你是"小派"，PillPal 用药管家的 AI 助手。

你可以帮用户做以下操作：
1. 打卡记录服药（take_med）
2. 跳过服药（skip_med）
3. 撤回打卡（undo_med）
4. 修改库存（update_stock）

当用户想做这些操作时，调用对应的 function。
当用户只是问问题（查库存、问用药知识）时，直接回答，不调用 function。

规则：
- 用温暖亲切的语气，像家人一样
- 回答简短实用
- 涉及调药停药提醒用户咨询医生
- 用 emoji 让回答更友好
- 记住之前的对话内容，保持上下文连贯

用户当前的用药数据：
${context}`
      },
      // 对话历史（DeepSeek 支持 64K tokens，足够带上所有历史）
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
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 500
      })
    })

    const data = await response.json()
    console.log('AI 返回:', JSON.stringify(data).slice(0, 500))

    if (data.choices && data.choices[0]) {
      const choice = data.choices[0]
      const msg = choice.message

      // 检查是否调用了 function
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const call = msg.tool_calls[0]
        const args = JSON.parse(call.function.arguments)
        return {
          text: msg.content || '',
          functionCall: { name: call.function.name, args }
        }
      }

      return { text: msg.content || '抱歉，我没理解你的意思 😅' }
    }
    return { text: '抱歉，我暂时无法回答 😅' }
  } catch (error) {
    console.error('AI 请求失败:', error)
    return { text: '网络不太好，请检查网络后再试 📶' }
  }
}

// 操作完成后让 AI 生成友好回复
export async function askAIWithResult(userMessage: string, context: string, actionResult: string): Promise<string> {
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
            content: `你是"小派"，PillPal 用药管家的 AI 助手。用温暖亲切的语气回复。用 emoji。简短。

用户数据：${context}

刚刚执行的操作结果：${actionResult}

请基于操作结果给用户一个友好的回复。`
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

// 构建用药上下文
export function buildContext(medications: any[], records: Record<string, string>): string {
  if (medications.length === 0) {
    return '用户还没有添加任何药品。'
  }

  let context = '【药品列表】\n'
  medications.forEach(med => {
    const daily = med.daily_usage || 1
    const days = med.stock_count > 0 ? Math.floor(med.stock_count / daily) : 0
    context += `- ${med.name}（${med.dosage}），治疗${med.disease}，${med.condition}服用\n`
    context += `  每天${daily}次，库存${med.stock_count}片，可服${days}天\n`
    if (med.times) context += `  时间：${med.times.join('、')}\n`
  })

  const doneKeys = Object.keys(records).filter(k => records[k]?.startsWith('done_'))
  const skipKeys = Object.keys(records).filter(k => records[k]?.startsWith('skip_'))
  const totalSlots = medications.reduce((sum, m) => sum + (m.times?.length || 1), 0)

  context += `\n【今日服药】共${totalSlots}次，已服${doneKeys.length}次，跳过${skipKeys.length}次\n`
  if (doneKeys.length > 0) {
    context += '已服：' + doneKeys.map(k => k.split('_')[0] + '(' + records[k].replace('done_', '') + ')').join('、') + '\n'
  }

  const urgent = medications.filter(m => {
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
    return days <= 7
  })
  if (urgent.length > 0) {
    context += '\n【库存预警】' + urgent.map(m => m.name + '只剩' + m.stock_count + '片').join('、')
  }

  return context
}
