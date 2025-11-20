<template>
  <el-drawer
    v-model="visibleInner"
    title="🤖 AI 对话"
    direction="rtl"
    size="480px"
    :modal="false"
    class="ai-drawer"
    :with-header="true"
    @close="handleClose"
  >
    <div class="dialog-body">
      <div class="messages">
        <div v-for="(m,idx) in messages" :key="idx" :class="['msg', m.role]">
          <div class="bubble" :class="{ loading: !!m.loading }">
            <template v-if="m.loading">
              <el-icon class="loading-inline"><Loading /></el-icon>
              <span style="margin: 10px 0;">AI 正在回复...</span>
            </template>
            <div v-else class="md" v-html="renderMarkdown(m.content)"></div>
          </div>
          <div v-if="m.role === 'assistant' && !m.loading" class="message-actions">
            <el-button text size="small" @click="copyMessage(idx)">复制</el-button>
          </div>
        </div>
      </div>

      <div class="input-toolbar">
        <div class="left">
          <el-button v-if="contextType === 'commits'" size="small" type="primary" text @click="quickRunCommitsSummary">总结</el-button>
          <el-button v-if="contextType === 'events'" size="small" type="primary" text @click="quickRunEventsSummary">事件摘要</el-button>
        </div>
        <div class="right">
          <el-popover placement="top" width="420" trigger="click">
            <template #default>
              <div class="context-preview">
                <div class="context-meta">
                  <span>类型：{{ contextType || '无' }}</span>
                  <span v-if="scopeText" style="margin-left: 8px;">范围：{{ scopeText }}</span>
                </div>
                <pre>{{ datasetText || '暂无上下文数据' }}</pre>
              </div>
            </template>
            <template #reference>
              <el-tag size="small" type="info" class="context-tag">上下文：{{ contextCount }} 条数据</el-tag>
            </template>
          </el-popover>
          <el-button size="small" type="danger" text @click="clearChat" :disabled="messages.length === 0">清空对话</el-button>
        </div>
      </div>

      <div class="actions">
          <el-input
              v-model="userInput"
              type="textarea"
              placeholder="请输入问题..."
              :rows="1"
          />
          <el-button @click="sendNormal" type="primary" :loading="loading" style="margin-left: 8px;">发送</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { callOpenAIChat, clipText } from '../ai.js'
import { templates } from '../ai-templates.js'
import { marked } from 'marked'

// 配置 marked 以支持 GFM 与换行
marked.setOptions({ gfm: true, breaks: true })

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  contextType: { type: String, default: 'events' }, // 'events' | 'commits'
  contextData: { type: Array, default: () => [] },
  scopeText: { type: String, default: '' } // 可选：事件页“只看本人/查看所有”
})
const emit = defineEmits(['update:modelValue'])

const visibleInner = ref(props.modelValue)
watch(() => props.modelValue, v => visibleInner.value = v)
watch(visibleInner, v => emit('update:modelValue', v))

const messages = ref([])
const userInput = ref('')
const loading = ref(false)

const contextCount = computed(() => Array.isArray(props.contextData) ? props.contextData.length : 0)

const datasetText = computed(() => {
  try {
    const data = props.contextData || []
    // 若为空数组，则视为无上下文数据
    if (Array.isArray(data) && data.length === 0) return ''
    return clipText(JSON.stringify(data, null, 2), 600, 2400)
  } catch (e) {
    return ''
  }
})

const handleClose = () => {
  // 保留对话历史，关闭不清空
}

const pushMessage = (role, content) => {
  messages.value.push({ role, content })
}

const sendNormal = async () => {
  const text = userInput.value.trim()
  if (!text) return
  // 立即加入用户消息
  pushMessage('user', text)
  userInput.value = ''
  // 加入助手占位（加载中）
  const placeholderIndex = messages.value.push({ role: 'assistant', content: '', loading: true }) - 1
  loading.value = true
  // 构造上下文（不包含占位消息）
  const sys = { role: 'system', content: datasetText.value || '数据为空' }
  const convo = [sys, ...messages.value.filter((_, i) => i !== placeholderIndex), { role: 'user', content: text }]
  try {
    const reply = await callOpenAIChat(convo, { max_tokens: 600, temperature: 0.6 })
    messages.value[placeholderIndex] = { role: 'assistant', content: reply }
  } catch (e) {
    messages.value[placeholderIndex] = { role: 'assistant', content: '对话失败：' + (e.message || '未知错误') }
  } finally {
    loading.value = false
  }
}


// 快捷动作：在正常对话模式下直接生成并追加消息
const quickRunEventsSummary = async () => {
  // 在正常对话中：先插入用户请求与占位助手消息
  const userText = '请生成事件摘要'
  pushMessage('user', userText)
  const placeholderIndex = messages.value.push({ role: 'assistant', content: '', loading: true }) - 1
  loading.value = true
  try {
    const prompt = templates.eventsSummary.user(props.contextData, props.scopeText || '')
    const reply = await callOpenAIChat([
      { role: 'system', content: templates.eventsSummary.system },
      { role: 'user', content: prompt }
    ], { max_tokens: 600, temperature: 0.6 })
    messages.value[placeholderIndex] = { role: 'assistant', content: reply }
  } catch (e) {
    messages.value[placeholderIndex] = { role: 'assistant', content: '生成事件摘要失败：' + (e.message || '未知错误') }
  } finally {
    loading.value = false
  }
}

const quickRunCommitsSummary = async () => {
  const userText = '请生成提交总结'
  pushMessage('user', userText)
  const placeholderIndex = messages.value.push({ role: 'assistant', content: '', loading: true }) - 1
  loading.value = true
  try {
    const prompt = templates.commitsSummary.user(props.contextData)
    const reply = await callOpenAIChat([
      { role: 'system', content: templates.commitsSummary.system },
      { role: 'user', content: prompt }
    ], { max_tokens: 600, temperature: 0.6 })
    messages.value[placeholderIndex] = { role: 'assistant', content: reply }
  } catch (e) {
    messages.value[placeholderIndex] = { role: 'assistant', content: '生成提交总结失败：' + (e.message || '未知错误') }
  } finally {
    loading.value = false
  }
}

const copyMessage = async (idx) => {
  try {
    const content = messages.value[idx]?.content || ''
    if (!content) return
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制回复')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

const clearChat = () => {
  messages.value = []
}

// 将消息以 Markdown 渲染
const renderMarkdown = (text) => {
  try {
    const s = typeof text === 'string' ? text : JSON.stringify(text, null, 2)
    return marked.parse(s || '')
  } catch (e) {
    return String(text || '')
  }
}
</script>

<style scoped>
.mode-switch {
  margin-bottom: 12px;
}
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 让内容根据视口高度自适应，预留头部与控制区域空间 */
  height: calc(100vh - 100px);
}
.messages {
  flex: 1;
  min-height: 160px;
  overflow: auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 8px;
}
.msg {
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
}
.msg.assistant {
  align-items: flex-start;
}
.msg.user {
  align-items: flex-end;
}
.bubble {
  display: inline-block;
  max-width: 100%;
  padding: 0 10px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
}
.bubble .md {
  white-space: normal;
  word-wrap: break-word;
  margin: 0;
  font-size: 13px;
}
.bubble .md pre,
.bubble .md code {
  background: var(--el-fill-color);
  border-radius: 6px;
  padding: 2px 4px;
}
.bubble .md pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
  overflow-x: auto;
}
.bubble .md code {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.msg.user .bubble {
  background: var(--el-color-primary-light-9);
}
.msg.assistant .bubble {
  background: var(--el-fill-color);
}
.actions {
  display: flex;
  justify-content: flex-end;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.context-tag {
  cursor: pointer;
}

.context-preview {
  max-height: 300px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.4;
}

.context-preview pre {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 8px;
  margin: 8px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
  overflow-x: auto;
}

.context-meta {
  color: var(--el-text-color-secondary);
}

.template-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.context-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.message-actions {
  margin-top: 4px;
}
.loading {
  display: flex;
  align-items: center;
  gap: 8px;
}
.loading-icon {
  font-size: 18px;
  color: var(--el-color-primary);
  animation: rotate 2s linear infinite;
}
.loading-inline {
  font-size: 18px;
  color: var(--el-color-primary);
  animation: rotate 2s linear infinite;
  display: inline-block;
  transform-origin: center;
}
.result pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-size: 14px;
}
.hint {
  color: var(--el-text-color-regular);
  font-size: 13px;
}
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
<style>
/* 全局样式：针对 Drawer 使用的 teleport，不受 scoped 影响 */
.ai-drawer .el-drawer__header {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
</style>