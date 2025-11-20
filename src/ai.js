// 通用 OpenAI Chat Completions 调用助手
// 从 localStorage 读取配置：openai-api-key / openai-base-url / openai-model-name

export async function callOpenAIChat(messages, options = {}) {
  const apiKey = localStorage.getItem('openai-api-key')
  const baseUrl = localStorage.getItem('openai-base-url') || 'https://api.openai.com/v1'
  const modelName = localStorage.getItem('openai-model-name') || 'gpt-3.5-turbo'

  if (!apiKey) {
    throw new Error('请先在设置中配置OpenAI API Key')
  }

  const body = {
    model: modelName,
    messages,
    max_tokens: options.max_tokens || 800,
    temperature: options.temperature ?? 0.7
  }

  const response = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    let errorMessage = `API请求失败: ${response.status}`
    try {
      const errData = await response.json()
      errorMessage = errData.error?.message || errorMessage
    } catch (_) {}
    throw new Error(errorMessage)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || '无法生成结果'
}

export function clipText(text = '', head = 500, tail = 1500) {
  const len = text.length
  if (len <= head + tail) return text
  const prefix = text.slice(0, head)
  const suffix = text.slice(len - tail)
  return prefix + '\n...\n' + suffix
}