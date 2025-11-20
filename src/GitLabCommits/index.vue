<template>
  <div class="gitlab-commits">
    <!-- Project Info Header -->
    <el-card v-if="project" class="project-info-card" shadow="hover">
      <div class="project-header">
        <div class="project-title">
          <h3>{{ project.name }}</h3>
          <!-- <el-tag :type="getVisibilityType(project.visibility)" size="small">
            {{ project.visibility }}
          </el-tag> -->
        </div>
        <!-- <div class="project-stats">
          <el-statistic
            :value="project.star_count || 0"
            title="Stars"
            :precision="0"
          >
            <template #prefix>
              <el-icon><Star /></el-icon>
            </template>
          </el-statistic>
          <el-statistic
            :value="project.forks_count || 0"
            title="Forks"
            :precision="0"
          >
            <template #prefix>
              <el-icon><Share /></el-icon>
            </template>
          </el-statistic>
          <el-statistic
            :value="project.open_issues_count || 0"
            title="Issues"
            :precision="0"
          >
            <template #prefix>
              <el-icon><Warning /></el-icon>
            </template>
          </el-statistic>
        </div> -->
      </div>
      <p class="project-description">{{ project.description || '暂无描述' }}</p>
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
    <el-card v-if="loading && commits.length === 0" class="loading-card" shadow="never">
      <div class="loading-content">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <p>正在获取提交记录...</p>
      </div>
    </el-card>

    <!-- Empty State -->
    <el-card v-if="!project && !loading" class="empty-card" shadow="never">
      <el-empty description="请从左侧选择一个项目查看提交记录">
        <template #image>
          <el-icon size="100"><FolderOpened /></el-icon>
        </template>
      </el-empty>
    </el-card>

    <div class="commits-container">
      <!-- Commits List with Integrated Filters -->
      <el-card class="commits-card" shadow="hover">
        <template #header>
          <div class="commits-header">
            <div class="header-left">
              <span class="commits-title">提交记录</span>
              <el-tag type="info" size="small" class="commits-count">
                {{ filteredCommits.length }}/{{ commits.length }}
              </el-tag>
            </div>
            <div class="header-right">
              <el-button
                @click="refreshCommits"
                :loading="loading"
                :icon="Refresh"
                size="small"
                type="primary"
              >
                刷新
              </el-button>
              <el-button
                @click="toggleOnlySelf"
                :disabled="!isAuthorConfigured()"
                :type="onlySelfEnabled ? 'primary' : 'default'"
                size="small"
                :icon="User"
              >
                只看本人
              </el-button>
            </div>
          </div>
          
          <!-- Compact Filter Controls -->
          <div class="compact-filters">
            <el-select
              v-model="selectedBranch"
              placeholder="选择分支"
              style="width: 100%"
              @change="onBranchChange"
              :loading="loadingBranches"
            >
              <el-option
                v-for="branch in branches"
                :key="branch.name"
                :label="branch.name + (branch.default ? ' (默认)' : '')"
                :value="branch.name"
              />
            </el-select>
            <el-select
              v-model="selectedAuthor"
              placeholder="选择作者"
              style="width: 100%"
              clearable
              filterable
              @change="onAuthorChange"
            >
              <el-option
                v-for="author in authors"
                :key="author.email"
                :label="author.name"
                :value="author.email"
              >
                <div class="author-option">
                  <el-avatar :size="16" :src="author.avatar">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                  <span class="author-name">{{ author.name }}</span>
                </div>
              </el-option>
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DDTHH:mm:ss.sssZ"
              style="width: 100%"
              @change="onDateRangeChange"
              :shortcuts="shortcuts"
              clearable
            />
          </div>

          <div class="filter-tags">
            <el-tag v-if="selectedBranch" type="primary" closable @close="selectedBranch = ''; onBranchChange()">
              <el-icon><Operation /></el-icon>
              {{ selectedBranch }}
            </el-tag>
            <el-tag v-if="selectedAuthor" type="success" closable @close="selectedAuthor = ''; onAuthorChange()">
              <el-icon><User /></el-icon>
              {{ getAuthorName(selectedAuthor) }}
            </el-tag>
            <el-tag v-if="dateRange && dateRange.length === 2" type="warning" closable @close="dateRange = []; onDateRangeChange()">
              <el-icon><DataLine /></el-icon>
              日期筛选
            </el-tag>
            <el-tag v-if="onlySelfEnabled" type="success" closable @close="toggleOnlySelf()">
              <el-icon><User /></el-icon>
              只看本人
            </el-tag>
          </div>
        </template>

        <!-- AI Summary Section 已移除，统一改为 AI 对话弹窗 -->

        <div class="commits-content">
          <!-- 有筛选结果时显示时间线 -->
          <el-timeline v-if="filteredCommits.length > 0">
            <el-timeline-item
              v-for="(commit, index) in filteredCommits"
              :key="commit.id"
              :timestamp="formatTime(commit.committed_date)"
              placement="top"
              :id="'commit-' + index"
            >
              <el-card class="commit-card" shadow="hover" @click="openCommitInGitLab(commit)">
                <div class="commit-header">
                  <div class="commit-message">
                    <h4>{{ commit.title }}</h4>
                    <p v-if="commit.message !== commit.title" class="commit-description">
                      {{ truncateMessage(commit.message.replace(commit.title, '').trim()) }}
                    </p>
                  </div>
                  <div class="commit-tags">
                    <!-- <el-tag v-if="commit.branch" type="success" size="small" class="branch-tag">
                      <el-icon><Operation /></el-icon>
                      {{ commit.branch }}
                    </el-tag> -->
                    <el-tag type="info" size="small" @click.stop="copyText(commit.id)" title="点击复制提交哈希">
                      <el-icon><Document /></el-icon>
                      {{ commit.short_id }}
                    </el-tag>
                  </div>
                </div>

                <div class="commit-meta">
                  <div class="author-info">
                    <el-avatar :size="24" :src="commit.author_avatar_url">
                      <el-icon><User /></el-icon>
                    </el-avatar>
                    <div class="author-details">
                      <span class="author-name">{{ commit.author_name }}</span>
                      <span class="author-email">{{ commit.author_email }}</span>
                    </div>
                  </div>

                  <div v-if="commit.parent_ids && commit.parent_ids.length > 1" class="merge-info">
                    <el-tag type="warning" size="small">
                      <el-icon><Share /></el-icon>
                      合并提交 ({{ commit.parent_ids.length }} 个父提交)
                    </el-tag>
                  </div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          
          <!-- 筛选后无结果时的提示 -->
          <div v-else-if="commits.length > 0 && filteredCommits.length === 0" class="no-filtered-results">
            <el-empty description="当前筛选条件下没有找到提交记录">
              <template #image>
                <el-icon size="80"><Search /></el-icon>
              </template>
              <el-button type="primary" @click="clearAllFilters">清除所有筛选条件</el-button>
            </el-empty>
          </div>
          
          <!-- 项目无提交记录时的提示 -->
          <div v-else-if="!loading && commits.length === 0" class="no-commits">
            <el-empty description="该分支暂无提交记录">
              <template #image>
                <el-icon size="80"><Document /></el-icon>
              </template>
            </el-empty>
          </div>
        </div>

        <!-- Load More -->
        <div class="pagination" v-if="hasMore">
          <el-button
            @click="loadMore"
            :loading="loading"
            type="primary"
            plain
            size="large"
            style="width: 100%"
            v-if="filteredCommits.length > 0" 
          >
            {{ loading ? '加载中...' : '加载更多' }}
          </el-button>
        </div>
      </el-card>

      <!-- Anchor Navigation -->
      <div class="anchor-navigation" v-if="filteredCommits.length > 0">
        <el-anchor 
          :offset="80"
          type="underline"
          direction="vertical"
          :bound="20"
        >
          <el-anchor-link
            v-for="(commit, index) in filteredCommits"
            :key="commit.id"
            :href="'#commit-' + index"
            :title="truncateTitle(commit.title, 20)"
          />
        </el-anchor>
      </div>
    </div>

    <!-- No Commits -->
    <!-- <el-card v-if="project && !loading && commits.length === 0" class="empty-card" shadow="never">
      <el-empty description="该项目暂无提交记录">
        <template #image>
          <el-icon size="100"><Document /></el-icon>
        </template>
      </el-empty>
    </el-card> -->
  </div>

  
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DataLine, Link, Key, Refresh, Search, Loading, Document, User, Star, Share, Warning,
  List, Edit, FolderOpened, Operation, ChatDotRound
} from '@element-plus/icons-vue'
import { setAIContext } from '../ai-context.js'
import { sampleBranchesByProject, sampleCommitsByProject } from '../mock-data.js'

// 快捷选项
const shortcuts = [
  {
    text: '最近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
  {
    text: '最近一年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 365)
      return [start, end]
    },
  },
]

// 响应式数据
const loading = ref(false)
const loadingBranches = ref(false)
const error = ref('')
const commits = ref([])
const branches = ref([])
const authors = ref([])
const selectedBranch = ref('main')
const selectedAuthor = ref('')
const dateRange = ref([])
const currentPage = ref(1)
const hasMore = ref(true)

// 全局 AI 对话上下文由 App.vue 读取，此处仅推送上下文

// 只看本人筛选
const onlySelfEnabled = ref(false)

// 从localStorage获取GitLab配置
const gitlabHost = ref(localStorage.getItem('gitlab-host') || 'https://gitlab.com')
const accessToken = ref(localStorage.getItem('gitlab-token') || '')

// 接收父组件传递的项目参数
const props = defineProps({
  project: {
    type: Object,
    default: null
  },
  initialBranch: {
    type: String,
    default: ''
  }
})

// 计算属性：筛选后的提交记录
const filteredCommits = computed(() => {
  if (!commits.value.length) return []
  
  let filtered = commits.value
  
  // 按作者筛选
  if (selectedAuthor.value) {
    filtered = filtered.filter(commit => commit.author_email === selectedAuthor.value)
  }
  
  // 按日期范围筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value
    filtered = filtered.filter(commit => {
      const commitDate = new Date(commit.committed_date || commit.created_at)
      return commitDate >= new Date(startDate) && commitDate <= new Date(endDate)
    })
  }
  
  return filtered
})

// 获取项目分支列表
const fetchBranches = async () => {
  const demoMode = localStorage.getItem('demo-mode') === '1'
  if (!props.project) return
  if (!demoMode && !accessToken.value.trim()) return

  loadingBranches.value = true

  try {
    let branchesData
    if (demoMode) {
      branchesData = sampleBranchesByProject[props.project.id] || []
    } else {
      branchesData = await window.services.gitlab.getProjectBranchesById(
        gitlabHost.value.trim(),
        props.project.id,
        accessToken.value.trim()
      )
    }

    branches.value = branchesData || []

    if (branches.value.length > 0) {
      if (props.initialBranch && branches.value.some(b => b.name === props.initialBranch)) {
        selectedBranch.value = props.initialBranch
      } else {
        const defaultBranch = branches.value.find(b => b.default)
        if (defaultBranch) {
          selectedBranch.value = defaultBranch.name
        } else {
          selectedBranch.value = branches.value[0].name
        }
      }
    }
  } catch (err) {
    console.error('获取分支列表失败:', err)
    ElMessage.error('获取分支列表失败: ' + (err.message || '未知错误'))
  } finally {
    loadingBranches.value = false
  }
}

// 获取提交记录
const fetchCommits = async (page = 1) => {
  const demoMode = localStorage.getItem('demo-mode') === '1'
  if (!props.project) return
  if (!demoMode && !accessToken.value.trim()) return

  loading.value = true
  if (page === 1) commits.value = []

  try {
    let commitsData = []
    if (demoMode) {
      const all = sampleCommitsByProject[props.project.id] || []
      // 过滤分支
      commitsData = selectedBranch.value
        ? all.filter(c => c.branch === selectedBranch.value)
        : all
      // 只看本人过滤
      if (onlySelfEnabled.value) {
        const email = getConfiguredAuthorEmail()
        commitsData = commitsData.filter(c => (email ? c.author_email === email : true))
      }
      // 日期范围过滤
      if (dateRange.value && dateRange.value.length === 2) {
        const [startDate, endDate] = dateRange.value
        commitsData = commitsData.filter(c => {
          const d = new Date(c.committed_date || c.created_at)
          return d >= new Date(startDate) && d <= new Date(endDate)
        })
      }
    } else {
      commitsData = await window.services.gitlab.getProjectCommitsById(
        gitlabHost.value.trim(),
        props.project.id,
        accessToken.value.trim(),
        {
          refName: selectedBranch.value,
          page: page,
          perPage: 20,
          authorEmail: onlySelfEnabled.value ? getConfiguredAuthorEmail() : undefined,
          since: (dateRange.value && dateRange.value.length === 2) ? dateRange.value[0] : undefined,
          until: (dateRange.value && dateRange.value.length === 2) ? dateRange.value[1] : undefined
        }
      )
      // 前端回退过滤（当服务端未生效时）
      if (onlySelfEnabled.value) {
        const email = getConfiguredAuthorEmail()
        commitsData = (commitsData || []).filter(commit => (email ? commit.author_email === email : true))
      }
    }

    // 为 commits 添加分支信息（如果不存在）
    const commitsWithBranch = (commitsData || []).map(commit => ({
      ...commit,
      branch: commit.branch || selectedBranch.value
    }))

    if (page === 1) {
      commits.value = commitsWithBranch
    } else {
      commits.value = [...commits.value, ...commitsWithBranch]
    }

    updateAuthors()
    hasMore.value = demoMode ? false : Boolean(commitsData && commitsData.length === 20)
    currentPage.value = page
  } catch (err) {
    console.error('获取提交记录失败:', err)
    ElMessage.error('获取提交记录失败: ' + (err.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 更新作者列表
const updateAuthors = () => {
  const authorMap = new Map()
  
  commits.value.forEach(commit => {
    if (!authorMap.has(commit.author_email)) {
      authorMap.set(commit.author_email, {
        name: commit.author_name,
        email: commit.author_email,
        avatar: commit.author_avatar_url
      })
    }
  })
  
  authors.value = Array.from(authorMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

// 分支变化处理
const onBranchChange = () => {
  currentPage.value = 1
  hasMore.value = true
  fetchCommits(1)
}

// 作者变化处理
const onAuthorChange = () => {
  // 筛选是在前端进行的，不需要重新请求数据
}

// 日期范围变化处理
const onDateRangeChange = () => {
  // 时间范围变化后，重新从服务端按范围获取数据
  currentPage.value = 1
  hasMore.value = true
  fetchCommits(1)
}

// 刷新提交记录
const refreshCommits = () => {
  currentPage.value = 1
  hasMore.value = true
  fetchCommits(1)
}

// 加载更多
const loadMore = () => {
  if (hasMore.value && !loading.value) {
    fetchCommits(currentPage.value + 1)
  }
}

// 清除所有筛选条件
const clearAllFilters = () => {
  selectedAuthor.value = ''
  dateRange.value = []
}

// AI 对话弹窗：上下文数据与打开方法
const commitsContextItems = computed(() => {
  return (filteredCommits.value || []).slice(0, 50).map(commit => ({
    message: commit.message,
    author: commit.author_name,
    date: commit.committed_date,
    additions: commit.stats?.additions || 0,
    deletions: commit.stats?.deletions || 0
  }))
})

// 将上下文推送到全局（无数据时推送空数组，正常对话）
watch(commitsContextItems, (items) => {
  setAIContext('commits', items)
}, { immediate: true })

// 只看本人按钮启用/关闭
const isAuthorConfigured = () => {
  return !!localStorage.getItem('gitlab-author-email')
}

const getConfiguredAuthorEmail = () => {
  return localStorage.getItem('gitlab-author-email') || ''
}

const toggleOnlySelf = () => {
  if (!isAuthorConfigured()) return
  onlySelfEnabled.value = !onlySelfEnabled.value
  currentPage.value = 1
  hasMore.value = true
  fetchCommits(1)
}

// 项目变化时不自动启用“只看本人”，保持用户手动选择


// 监听项目变化，自动加载数据
watch(() => props.project, async (newProject) => {
  if (newProject && gitlabHost.value && accessToken.value) {
    // 重置状态
    commits.value = []
    branches.value = []
    authors.value = []
    selectedBranch.value = props.initialBranch || 'main'
    selectedAuthor.value = ''
    currentPage.value = 1
    hasMore.value = true
    error.value = ''
    
    // 默认时间范围：近一个月
    const now = new Date()
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    dateRange.value = [start.toISOString(), now.toISOString()]

    // 不默认启用“只看本人”，保留用户手动选择

    // 获取分支列表
    await fetchBranches()
    
    // 获取提交记录
    await fetchCommits()
  }
}, { immediate: true })

// 获取作者名称
const getAuthorName = (email) => {
  const author = authors.value.find(a => a.email === email)
  return author ? author.name : email
}

// 获取可见性类型
const getVisibilityType = (visibility) => {
  switch (visibility) {
    case 'public': return 'success'
    case 'internal': return 'warning'
    case 'private': return 'danger'
    default: return 'info'
  }
}

// 格式化时间
const formatTime = (dateString) => {
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

// 截断消息
const truncateMessage = (message) => {
  if (!message) return ''
  return message.length > 200 ? message.substring(0, 200) + '...' : message
}

// 截断标题用于锚点显示
const truncateTitle = (title, maxLength) => {
  if (!title) return ''
  return title.length > maxLength ? title.substring(0, maxLength) + '...' : title
}

// 复制到剪贴板
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

// 在 GitLab 中打开 commit 详情页
const openCommitInGitLab = (commit) => {
  if (!props.project || !commit) return

  // 构建 commit URL: https://gitlab.com/namespace/project/-/commit/sha
  const commitUrl = `${props.project.web_url}/-/commit/${commit.id}`

  // 在新标签页打开
  window.open(commitUrl, '_blank')
}

</script>

<style scoped>
.gitlab-commits {
  padding: 0;
}

.project-info-card {
  margin-bottom: 16px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.project-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-title h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.project-stats {
  display: flex;
  gap: 24px;
}

.project-description {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}



.loading-card, .empty-card {
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

.commits-card {
  margin-bottom: 16px;
}

.commits-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.commits-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.commits-count {
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  /* gap: 12px; */
}

.filter-tags {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-right: 12px;
}

.compact-filters {
  /* padding-top: 12px; */
  display: flex;
  gap: 12px;
}

.compact-filters .author-option {
  display: flex;
  align-items: center;
  gap: 6px;
}

.compact-filters .author-name {
  font-size: 12px;
}

.commit-card {
  margin-bottom: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.commit-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.commit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.commit-header .el-tag[title] {
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
}

.copy-btn {
  margin-left: 8px;
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

.merge-info {
  margin-left: auto;
}

.no-filtered-results, .no-commits {
  padding: 40px 20px;
  text-align: center;
}

/* 已移除 AI 总结样式，统一改为弹窗对话 */

.pagination {
  margin-top: 16px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .project-header {
    flex-direction: column;
    gap: 16px;
  }

  .project-stats {
    width: 100%;
    justify-content: space-around;
  }

  .commits-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .commit-header {
    flex-direction: column;
    gap: 8px;
  }

  .commit-meta {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>