const DEEPSEEK_API_KEY = 'sk-b903314c9e8d40e2b56d37a53252ed17'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

export async function askAI(userMessage: string, context: string): Promise<string> {
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
            content: `你是"小派"，PillPal 用药管家的 AI 助手。你的职责是帮助慢病患者管理用药。

规则：
1. 用温暖、亲切的语气，像家人一样关心用户
2. 回答要简短实用，不要太长
3. 涉及调药、停药等医疗决策时，提醒用户咨询医生
4. 用 emoji 让回答更友好
5. 如果用户问的问题和用药无关，友好地引导回用药话题

以下是用户当前的用药数据：
${context}

基于以上数据回答用户的问题。`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    const data = await response.json()
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content
    }
    return '抱歉，我暂时无法回答，请稍后再试 😅'
  } catch (error) {
    console.error('AI 请求失败:', error)
    return '网络不太好，请检查网络后再试 📶'
  }
}

// 构建用药上下文
export function buildContext(medications: any[], records: Record<string, string>): string {
  if (medications.length === 0) {
    return '用户还没有添加任何药品。'
  }

  let context = '【用户的药品列表】\n'
  medications.forEach(med => {
    const daily = med.daily_usage || 1
    const days = med.stock_count > 0 ? Math.floor(med.stock_count / daily) : 0
    context += `- ${med.name}（${med.dosage}），治疗${med.disease}，${med.condition}服用\n`
    context += `  每天${daily}次，库存${med.stock_count}片，可服${days}天\n`
    if (med.times) context += `  服用时间：${med.times.join('、')}\n`
    if (med.note) context += `  注意：${med.note}\n`
  })

  // 今日打卡情况
  const doneKeys = Object.keys(records).filter(k => records[k]?.startsWith('done_'))
  const skipKeys = Object.keys(records).filter(k => records[k]?.startsWith('skip_'))
  const totalSlots = medications.reduce((sum, m) => sum + (m.times?.length || 1), 0)

  context += `\n【今日服药情况】\n`
  context += `总共${totalSlots}次，已服用${doneKeys.length}次，跳过${skipKeys.length}次\n`

  if (doneKeys.length > 0) {
    context += '已服用：' + doneKeys.map(k => {
      const time = records[k].replace('done_', '')
      return k.split('_')[0] + '(' + time + ')'
    }).join('、') + '\n'
  }

  if (skipKeys.length > 0) {
    context += '已跳过：' + skipKeys.map(k => k.split('_')[0]).join('、') + '\n'
  }

  // 库存预警
  const urgent = medications.filter(m => {
    const days = m.stock_count > 0 ? Math.floor(m.stock_count / (m.daily_usage || 1)) : 0
    return days <= 7
  })
  if (urgent.length > 0) {
    context += '\n【库存预警】\n'
    urgent.forEach(m => {
      context += `⚠ ${m.name}只剩${m.stock_count}片，${Math.floor(m.stock_count / (m.daily_usage || 1))}天后用完\n`
    })
  }

  return context
}
