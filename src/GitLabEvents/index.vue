<template>
  <div class="gitlab-events">
    <!-- Header -->
    <el-card class="events-header" shadow="hover">
      <div class="header">
        <span class="title">所有事件</span>
        <div class="actions">
          <el-button
            @click="toggleScope"
            :loading="loading"
            size="small"
            :type="onlyMine ? 'primary' : ''"
            plain
          >{{ onlyMine ? '查看所有' : '只看本人' }}</el-button>
          <el-button
            @click="refreshEvents"
            :loading="loading"
            :icon="Refresh"
            size="small"
            type="primary"
          >刷新</el-button>
        </div>
      </div>

      <!-- Global SHA Search -->
      <div class="sha-search-container">
        <el-input
          v-model="searchSha"
          placeholder="输入 Commit SHA 全局查询"
          clearable
          @keyup.enter="queryBySha"
          @clear="clearShaSearch"
        >
          <template #append>
            <el-button :icon="Search" @click="queryBySha" :loading="shaSearchLoading" />
          </template>
        </el-input>
      </div>
    </el-card>

    <!-- Error Alert -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
      style="margin: 16px 0;"
    />

    <!-- Loading -->
    <el-card v-if="loading && events.length === 0" class="loading-card" shadow="never">
      <div class="loading-content">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <p>正在获取事件...</p>
      </div>
    </el-card>

    <!-- SHA Search Result -->
    <el-card v-if="shaSearchLoading || shaSearchError || shaSearchResult" class="sha-result-card" shadow="hover">
      <div v-if="shaSearchLoading" class="sha-search-loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <p>正在查询提交...</p>
      </div>

      <div v-else-if="shaSearchError" class="sha-search-error">
        <el-alert :title="shaSearchError" type="error" :closable="false" show-icon />
      </div>

      <div v-else-if="shaSearchResult" class="sha-search-result">
        <!-- 显示项目信息 -->
        <div v-if="shaSearchProject" class="found-project-info">
          <div>
            <el-tag type="primary" size="small">
              <el-icon><FolderOpened /></el-icon>
              {{ shaSearchProject.name || shaSearchProject.path_with_namespace }}
            </el-tag>
            <el-tag v-if="shaSearchResultBranches.length > 0" type="success" size="small" class="branch-tag">
              <el-icon><Operation /></el-icon>
              {{ shaSearchResultBranches[0] }}
              <span v-if="shaSearchResultBranches.length > 1"> +{{ shaSearchResultBranches.length - 1 }}</span>
            </el-tag>
          </div>
          <el-button size="small" text type="danger" @click="clearShaSearch">清除结果</el-button>
        </div>

        <div class="commit-header">
          <div class="commit-message">
            <h4>{{ shaSearchResult.title }}</h4>
            <p v-if="shaSearchResult.message !== shaSearchResult.title" class="commit-description">
              {{ shaSearchResult.message.replace(shaSearchResult.title, '').trim() }}
            </p>
          </div>
          <div class="commit-tags">
            <el-tag type="info" size="small" @click.stop="copyText(shaSearchResult.id)" title="点击复制提交哈希" class="copy-tag">
              <el-icon><Document /></el-icon>
              {{ shaSearchResult.short_id }}
            </el-tag>
          </div>
        </div>

        <div class="commit-meta">
          <div class="author-info">
            <el-avatar :size="24" :src="shaSearchResult.author_avatar_url">
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="author-details">
              <span class="author-name">{{ shaSearchResult.author_name }}</span>
              <span class="author-email">{{ shaSearchResult.author_email }}</span>
            </div>
          </div>

          <div class="commit-time-info">
            <span>{{ formatTime(shaSearchResult.committed_date) }}</span>
          </div>
        </div>

        <div v-if="shaSearchResult.stats" class="commit-stats">
          <el-tag type="success" size="small">+{{ shaSearchResult.stats.additions }}</el-tag>
          <el-tag type="danger" size="small">-{{ shaSearchResult.stats.deletions }}</el-tag>
        </div>

        <div v-if="shaSearchResult.parent_ids && shaSearchResult.parent_ids.length > 1" class="merge-info-tag">
          <el-tag type="warning" size="small">
            <el-icon><Share /></el-icon>
            合并提交 ({{ shaSearchResult.parent_ids.length }} 个父提交)
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- Events List -->
    <el-card class="events-card" shadow="hover">
      <div class="events-content">

        <div v-if="events.length > 0">
          <div
            class="event-row"
            v-for="event in events"
            :key="event.id || (event.created_at + '-' + (event.project_id || '') + '-' + (event.action_name || ''))"
          >
            <div class="event-left">
              <el-avatar :size="40" :src="getAvatar(event)">
                <el-icon><User /></el-icon>
              </el-avatar>
            </div>
            <div class="event-center">
              <div class="line1">
                <span class="author">{{ authorName(event) }}</span>
                <span class="author-username" v-if="event.author_username">@{{ event.author_username }}</span>
              </div>
              <div class="line2">
                <!-- <span class="arrow">→</span> -->
                <template v-if="event.push_data">
                  <span>{{ pushActionLabel(event) }} {{ refTypeLabel(event) }}</span>
                  <a
                    v-if="refLink(event)"
                    :href="refLink(event)"
                    class="link"
                    @click.prevent="navigateToBranch(event)"
                  >{{ event.push_data.ref }}</a>
                  <span v-else class="mono">{{ event.push_data.ref }}</span>
                  <span> 于 </span>
                  <a v-if="projectLink(event)" @click.prevent="navigateToBranch(event)" class="link">
                    {{ projectPath(event) }}
                  </a>
                  <span v-else>{{ projectPath(event) }}</span>
                  <span v-if="event.push_data.commit_title" class="commit-title">
                   · {{ event.push_data.commit_title }}
                  </span>
                  <span v-if="shortCommitId(event)" class="commit-id">
                    ·
                    <span
                      class="link mono copy-commit-id"
                      @click="copyCommitId(event)"
                      title="点击复制提交ID"
                    >{{ shortCommitId(event) }}</span>
                  </span>
                </template>
                <template v-else>
                  <span>{{ formatActionText(event) }}</span>
                  <span v-if="projectPath(event)"> 于 </span>
                  <a v-if="projectLink(event)" :href="projectLink(event)" class="link" target="_blank">
                    {{ projectPath(event) }}
                  </a>
                  <span v-else-if="projectPath(event)">{{ projectPath(event) }}</span>
                </template>
              </div>
            </div>
            <div class="event-right">
              <span class="time">{{ formatTime(event.created_at) }}</span>
            </div>
          </div>
        </div>

        <div v-else-if="!loading" class="empty">
          <el-empty description="暂无事件">
            <template #image>
              <el-icon size="80"><Document /></el-icon>
            </template>
          </el-empty>
        </div>
      </div>

      <!-- Load More -->
      <div class="pagination" v-if="hasMore && events.length > 0">
        <el-button
          @click="loadMore"
          :loading="loading"
          type="primary"
          plain
          size="large"
          style="width: 100%"
        >
          {{ loading ? '加载中...' : '加载更多' }}
        </el-button>
      </div>
    </el-card>
  </div>
  
  
  
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Refresh, Loading, Document, User, ChatDotRound, Search, FolderOpened, Share, Operation, Link } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { callOpenAIChat } from '../ai.js'
import { setAIContext } from '../ai-context.js'
import { sampleEvents, sampleProjects } from '../mock-data.js'

const loading = ref(false)
const error = ref('')
const events = ref([])
const currentPage = ref(1)
const hasMore = ref(true)
const projectCache = ref({})
const onlyMine = ref(false)

// SHA 搜索相关
const searchSha = ref('')
const shaSearchResult = ref(null)
const shaSearchLoading = ref(false)
const shaSearchError = ref('')
const shaSearchProject = ref(null)
const shaSearchResultBranches = ref([])

const gitlabHost = ref(localStorage.getItem('gitlab-host') || 'https://gitlab.com')
const accessToken = ref(localStorage.getItem('gitlab-token') || '')

// 向父组件发出导航事件
const emit = defineEmits(['navigate-to-project-branch'])

const navigateToBranch = (event) => {
  const branch = event.push_data?.ref || ''
  const project = getProject(event)
  emit('navigate-to-project-branch', { project, projectId: event.project_id, branch })
}

const fetchEvents = async (page = 1) => {
  // 演示模式：直接加载内置示例数据
  const demoMode = (localStorage.getItem('demo-mode') || '') === '1'
  if (demoMode) {
    loading.value = true
    try {
      if (page === 1) {
        events.value = sampleEvents
      } else {
        events.value = [...events.value, ...sampleEvents]
      }
      hasMore.value = false
      currentPage.value = page
      // 注入示例项目映射，便于链接与项目路径展示
      Object.assign(projectCache.value, sampleProjects)
      ElMessage.info('演示模式：已加载示例事件数据')
    } finally {
      loading.value = false
    }
    return
  }

  // 每次刷新前重新读取最新配置，避免组件初始化后配置变更未生效
  const host = (localStorage.getItem('gitlab-host') || gitlabHost.value || 'https://gitlab.com').trim()
  const token = (localStorage.getItem('gitlab-token') || accessToken.value || '').trim()
  gitlabHost.value = host
  accessToken.value = token

  if (!host || !token) {
    ElMessage.warning('请先在系统配置中设置 GitLab 主机地址和访问令牌')
    return
  }
  loading.value = true
  if (page === 1) {
    events.value = []
  }
  try {
    let data
    if (window.services?.gitlab?.getEvents) {
      data = await window.services.gitlab.getEvents(
        host,
        token,
        { page, perPage: 20, scope: onlyMine.value ? 'personal' : 'all' }
      )
    } else {
      const params = new URLSearchParams({
        per_page: '20',
        page: String(page),
        scope: onlyMine.value ? 'personal' : 'all'
      })
      const response = await fetch(`${host}/api/v4/events?${params}`, {
        headers: { 'PRIVATE-TOKEN': token }
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      data = await response.json()
    }
    if (page === 1) {
      events.value = data || []
    } else {
      events.value = [...events.value, ...(data || [])]
    }
    hasMore.value = data && data.length === 20
    currentPage.value = page
    // 异步补充项目信息缓存
    ensureProjectInfoForEvents(data || [])
  } catch (err) {
    console.error('获取事件失败:', err)
    ElMessage.error('获取事件失败: ' + (err.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const refreshEvents = () => {
  currentPage.value = 1
  hasMore.value = true
  fetchEvents(1)
}

const loadMore = () => {
  if (hasMore.value && !loading.value) {
    fetchEvents(currentPage.value + 1)
  }
}

// 全局 AI 对话上下文由 App.vue 读取，此处仅推送上下文
const eventsContextItems = computed(() => {
  return (events.value || []).slice(0, 30).map(e => ({
    action: e.action_name,
    target_type: e.target_type,
    target_title: e.target_title,
    project: projectPath(e),
    ref: e.push_data?.ref,
    ref_type: e.push_data?.ref_type,
    commit_title: e.push_data?.commit_title,
    author: authorName(e),
    created_at: e.created_at
  }))
})
// 推送上下文（无数据时为空，正常对话）
watch(eventsContextItems, (items) => {
  setAIContext('events', items, onlyMine.value ? '只看本人' : '查看所有')
}, { immediate: true })
// 范围文本变化也同步到全局
watch(onlyMine, () => {
  setAIContext('events', eventsContextItems.value, onlyMine.value ? '只看本人' : '查看所有')
})

const toggleScope = () => {
  onlyMine.value = !onlyMine.value
  refreshEvents()
}

// 全局 SHA 查询
const queryBySha = async () => {
  const sha = searchSha.value.trim()
  if (!sha) {
    ElMessage.warning('请输入提交哈希')
    return
  }

  const demoMode = localStorage.getItem('demo-mode') === '1'
  if (!demoMode && !accessToken.value.trim()) {
    ElMessage.warning('请先配置 GitLab Access Token')
    return
  }

  shaSearchLoading.value = true
  shaSearchError.value = ''
  shaSearchResult.value = null
  shaSearchProject.value = null
  shaSearchResultBranches.value = []

  try {
    let result
    let foundProject = null

    if (demoMode) {
      // Demo 模式：从示例数据中查找
      ElMessage.info('演示模式暂不支持全局 SHA 查询')
      shaSearchLoading.value = false
      return
    }

    // 获取用户项目列表
    const projects = await window.services.gitlab.getUserProjects(
      gitlabHost.value.trim(),
      accessToken.value.trim(),
      { perPage: 100, orderBy: 'last_activity_at' }
    )

    if (!projects || projects.length === 0) {
      throw new Error('未找到任何项目')
    }

    // 获取收藏项目，优先查询
    const favorites = JSON.parse(localStorage.getItem('gitlab-favorites') || '[]')
    const favoriteProjects = projects.filter(p => favorites.includes(p.id))
    const otherProjects = projects.filter(p => !favorites.includes(p.id))
    const sortedProjects = [...favoriteProjects, ...otherProjects]

    // 并行查询，分批进行（每批 10 个）
    const batchSize = 10
    for (let i = 0; i < sortedProjects.length; i += batchSize) {
      const batch = sortedProjects.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(project =>
          window.services.gitlab.getCommitBySha(
            gitlabHost.value.trim(),
            project.id,
            sha,
            accessToken.value.trim()
          ).then(commit => ({ project, commit }))
        )
      )

      // 找到第一个成功的结果
      const found = results.find(r => r.status === 'fulfilled')
      if (found) {
        result = found.value.commit
        foundProject = found.value.project
        break
      }
    }

    if (!result) {
      throw new Error('在所有项目中均未找到该提交')
    }

    shaSearchResult.value = result
    shaSearchProject.value = foundProject

    // 获取包含该 commit 的分支列表
    try {
      if (window.services?.gitlab?.getCommitRefs) {
        const refs = await window.services.gitlab.getCommitRefs(
          gitlabHost.value.trim(),
          foundProject.id,
          sha,
          accessToken.value.trim(),
          'branch'
        )
        shaSearchResultBranches.value = (refs || []).map(r => r.name)
      } else {
        // 直接调用 API
        const refsResponse = await fetch(
          `${gitlabHost.value.trim()}/api/v4/projects/${foundProject.id}/repository/commits/${sha}/refs?type=branch`,
          { headers: { 'PRIVATE-TOKEN': accessToken.value.trim() } }
        )
        if (refsResponse.ok) {
          const refs = await refsResponse.json()
          shaSearchResultBranches.value = (refs || []).map(r => r.name)
        }
      }
    } catch (e) {
      console.warn('获取分支信息失败:', e)
    }
  } catch (err) {
    console.error('查询提交失败:', err)
    if (err.message && err.message.includes('404')) {
      shaSearchError.value = '未找到该提交，请检查 SHA 是否正确'
    } else {
      shaSearchError.value = err.message || '查询失败'
    }
    shaSearchResult.value = null
    shaSearchProject.value = null
  } finally {
    shaSearchLoading.value = false
  }
}

// 清除 SHA 搜索
const clearShaSearch = () => {
  searchSha.value = ''
  shaSearchResult.value = null
  shaSearchError.value = ''
  shaSearchProject.value = null
  shaSearchResultBranches.value = []
}

// 在 GitLab 中打开 SHA 查询结果
const openShaResultInGitLab = () => {
  if (!shaSearchProject.value || !shaSearchResult.value) return
  const commitUrl = `${shaSearchProject.value.web_url}/-/commit/${shaSearchResult.value.id}`
  window.open(commitUrl, '_blank')
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? '刚刚' : `${minutes} 分钟前`
    }
    return `${hours} 小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days} 天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

const translateAction = (a) => {
  const map = {
    'created': '创建',
    'updated': '更新',
    'closed': '关闭',
    'commented on': '评论',
    'pushed': '推送',
    'pushed to': '推送到',
    'pushed new': '新建',
    'deleted': '删除',
    'joined': '加入',
    'left': '离开',
    'merged': '合并'
  }
  return map[a] || a
}
const translateTargetType = (t) => {
  const map = { 'Issue': '问题', 'MergeRequest': '合并请求', 'Note': '备注', 'WikiPage': 'Wiki', 'PushEvent': '推送', 'Project': '项目', 'Commit': '提交' }
  return map[t] || t
}

const formatActionText = (event) => {
  const action = event.action_name || '事件'
  if (event.push_data) {
    return `${translateAction(action)}`
  }
  if (event.target_type && event.target_title) {
    return `${translateAction(action)} ${translateTargetType(event.target_type)}「${event.target_title}」`
  }
  if (event.target_type) {
    return `${translateAction(action)} ${translateTargetType(event.target_type)}`
  }
  return translateAction(action)
}

const authorName = (event) => {
  return event.author_name || event.author?.name || event.author_username || '未知用户'
}

const getAvatar = (event) => {
  return event.author?.avatar_url || ''
}

const ensureProjectInfoForEvents = async (list) => {
  const ids = Array.from(new Set(list.map(e => e.project_id).filter(Boolean)))
  const missing = ids.filter(id => !projectCache.value[id])
  if (missing.length === 0) return
  try {
    const tasks = missing.map(id => {
      if (window.services?.gitlab?.getProjectInfoById) {
        return window.services.gitlab.getProjectInfoById(gitlabHost.value.trim(), id, accessToken.value.trim())
          .then(info => ({ id, info }))
      }
      return fetch(`${gitlabHost.value.trim()}/api/v4/projects/${id}`, {
        headers: { 'PRIVATE-TOKEN': accessToken.value.trim() }
      }).then(r => r.json()).then(info => ({ id, info }))
    })
    const results = await Promise.allSettled(tasks)
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        const { id, info } = r.value
        projectCache.value[id] = info
      }
    })
  } catch (e) {
    console.warn('加载项目详情失败：', e)
  }
}

const getProject = (event) => {
  if (!event.project_id) return null
  return projectCache.value[event.project_id] || null
}

const projectPath = (event) => {
  const p = getProject(event)
  return p?.path_with_namespace || (event.project_id ? `项目 ${event.project_id}` : '')
}

const projectLink = (event) => {
  const p = getProject(event)
  return p?.web_url || ''
}

const branchLink = (event) => {
  const p = getProject(event)
  const branch = event.push_data?.ref
  if (!p || !branch) return ''
  return `${p.web_url}/-/commits/${encodeURIComponent(branch)}`
}

const tagLink = (event) => {
  const p = getProject(event)
  const tag = event.push_data?.ref
  if (!p || !tag) return ''
  return `${p.web_url}/-/tags/${encodeURIComponent(tag)}`
}

const refTypeLabel = (event) => {
  return event.push_data?.ref_type === 'tag' ? '标签' : '分支'
}

const pushActionLabel = (event) => {
  const name = (event.action_name || '').toLowerCase()
  if (name.includes('deleted')) return '删除'
  if (name.includes('pushed new')) return '新建'
  if (name.includes('pushed')) return '推送到'
  return '推送到'
}

const refLink = (event) => {
  const isTag = event.push_data?.ref_type === 'tag'
  return isTag ? tagLink(event) : branchLink(event)
}

onMounted(() => {
  fetchEvents(1)
})

// 提交ID提取与链接
const getCommitId = (event) => {
  return event.push_data?.commit_to || event.push_data?.commit_id || event.push_data?.commit_sha || ''
}

const shortCommitId = (event) => {
  const id = getCommitId(event)
  return id ? id.slice(0, 8) : ''
}

const commitLink = (event) => {
  const p = getProject(event)
  const id = getCommitId(event)
  if (!p || !id) return ''
  return `${p.web_url}/-/commit/${id}`
}

// 复制到剪贴板（含降级方案）
const copyText = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.top = '-1000px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    console.error('复制失败:', e)
    ElMessage.error('复制失败')
  }
}

const copyCommitId = (event) => {
  const id = getCommitId(event)
  if (!id) {
    ElMessage.warning('没有可复制的提交ID')
    return
    }
  copyText(id)
}
</script>

<style scoped>
.gitlab-events {
  padding: 0;
}

.events-header {
  margin-bottom: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.events-card {
  margin-bottom: 16px;
}

.events-content {}

.event-row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 12px;
  padding: 12px 4px;
}

.event-row + .event-row {
  border-top: 1px solid var(--el-border-color-light);
}

.event-left {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.event-center {
  min-width: 0;
}

.line1 {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.author-username {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
}

.line2 {
  margin-top: 6px;
  color: var(--el-text-color-regular);
}

.arrow {
  margin-right: 6px;
  color: var(--el-text-color-secondary);
}

.link {
  color: var(--el-color-primary);
  text-decoration: none;
  margin: 0 4px;
  cursor: pointer;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.commit-title {
  margin-left: 6px;
}

.commit-id {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
}

.copy-commit-id {
  cursor: pointer;
}

.event-right {
  display: flex;
  align-items: flex-start;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.event-item {
  margin-bottom: 8px;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.event-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-detail {
  margin: 0;
  color: var(--el-text-color-regular);
}

.loading-card {
  margin-bottom: 16px;
}

.loading-content {
  text-align: center;
  padding: 40px 20px;
}

.loading-icon {
  font-size: 48px;
  color: var(--el-color-primary);
  margin-bottom: 16px;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pagination {
  margin-top: 16px;
  text-align: center;
}

/* AI Summary Styles */
.ai-summary-section { margin-bottom: 16px; }
.ai-summary-card { border: 1px solid var(--el-border-color-light); border-radius: 8px; }
.ai-summary-header { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--el-text-color-primary); }
.ai-summary-header .el-icon { color: var(--el-color-primary); }
.ai-summary-loading { display: flex; flex-direction: column; align-items: center; padding: 24px; color: var(--el-text-color-regular); }
.ai-summary-loading .loading-icon { font-size: 24px; color: var(--el-color-primary); animation: rotate 2s linear infinite; margin-bottom: 12px; }
.ai-summary-content { padding: 0; }
.summary-text { font-size: 14px; line-height: 1.6; color: var(--el-text-color-primary); margin-bottom: 16px; white-space: pre-wrap; word-wrap: break-word; }
.summary-meta { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--el-border-color-lighter); font-size: 12px; }
.summary-time { color: var(--el-text-color-regular); }
.ai-summary-error { padding: 0; }

/* SHA Search Styles */
.sha-search-container {
  margin-top: 16px;
}

.sha-result-card {
  margin-bottom: 16px;
  border-left: 4px solid var(--el-color-primary);
}

.sha-search-loading {
  text-align: center;
  padding: 24px;
}

.sha-search-error {
  padding: 0;
}

.sha-search-result {
  padding: 0;
}

.found-project-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.commit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.commit-message {
  flex: 1;
  margin-right: 16px;
}

.commit-message h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
}

.commit-description {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.copy-tag {
  cursor: pointer;
}

.commit-tags {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.branch-tag {
  font-weight: 500;
  margin-left: 5px;
}

.commit-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: 14px;
  font-weight: 500;
}

.author-email {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.commit-time-info {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.commit-stats {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.merge-info-tag {
  margin-top: 12px;
}
</style>