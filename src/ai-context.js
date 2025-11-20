import { ref } from 'vue'

// 全局 AI 对话上下文（由各页面写入，App.vue 读取）
export const aiContextType = ref('') // 'events' | 'commits' | ''
export const aiContextItems = ref([]) // 统一为数组
export const aiScopeText = ref('') // 例如："只看本人" / "查看所有"

export const setAIContext = (type, items, scope = '') => {
  aiContextType.value = type || ''
  aiContextItems.value = Array.isArray(items) ? items : []
  aiScopeText.value = scope || ''
}

export const clearAIContext = () => {
  aiContextType.value = ''
  aiContextItems.value = []
  aiScopeText.value = ''
}