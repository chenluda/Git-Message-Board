<template>
  <div class="gitlab-pipelines">
    <!-- Project Info Header -->
    <el-card v-if="project" class="project-info-card" shadow="hover">
      <div class="project-header">
        <div class="project-title">
          <h3>{{ project.name }}</h3>
        </div>
        <p class="project-description">{{ project.description || '暂无描述' }}</p>
      </div>
    </el-card>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      class="mb-16"
    />

    <!-- Pipelines -->
    <el-card class="pipelines-card" shadow="never">
      <div class="pipelines-header">
        <div class="header-left">
          <span class="pipelines-title">流水线</span>
          <el-tag v-if="pipelines.length" size="small" type="info" class="pipelines-count">
            {{ pipelines.length }} 条
          </el-tag>
        </div>
        <div class="header-right">
          <el-select v-model="selectedStatus" placeholder="状态" size="small" style="width: 140px" clearable @change="onFilterChange">
            <el-option v-for="s in statusOptions" :key="s" :label="statusLabel(s)" :value="s" />
          </el-select>
          <el-input v-model="selectedRef" placeholder="分支/标签 (ref)" size="small" clearable style="width: 180px; margin-left: 12px" @keyup.enter="onFilterChange" />
          <el-button type="primary" size="small" :disabled="loading" style="margin-left: 12px" @click="refreshPipelines">刷新</el-button>
        </div>
      </div>

      <div class="pipelines-content">
        <template v-if="pipelines.length">
          <el-card v-for="p in pipelines" :key="p.id" class="pipeline-card" shadow="hover">
            <div class="pipeline-header">
              <div class="left">
                <div style="display: flex; justify-content: space-between;">
                  <h4 class="pipeline-title">#{{ p.id }} · {{ p.ref || '未知引用' }}</h4>
                  <div class="commit-author">提交人：{{ commitMap[p.sha]?.author_name || p.user?.name || '未知' }}</div>
                </div>
                <div class="meta">
                  <el-tag :type="statusTagType(p.status)" size="small">{{ statusLabel(p.status) }}</el-tag>
                  <el-tag v-if="p.source" size="small" class="ml-8" type="info">{{ p.source }}</el-tag>
                  <span class="ml-8">提交：{{ shortSha(p.sha) }}</span>
                  <span class="ml-8">创建：{{ formatDate(p.created_at) }}</span>
                  <span class="ml-8">更新：{{ formatDate(p.updated_at) }}</span>
                </div>
                <div class="commit-info">
                  <div class="commit-message" :title="commitMap[p.sha]?.message || ''">{{ commitMap[p.sha]?.message || '暂无提交信息' }}</div>
                </div>
              </div>
            </div>
          </el-card>

          <div class="load-actions">
            <el-button v-if="hasMore" :loading="loading" type="primary" plain @click="loadMore">加载更多</el-button>
            <el-tag v-else type="info">没有更多了</el-tag>
          </div>
        </template>
        <el-empty v-else description="暂无流水线数据">
          <template #description>
            <p>暂无流水线数据，可尝试调整筛选条件或刷新。</p>
          </template>
        </el-empty>
      </div>
    </el-card>
  </div>
  
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { samplePipelinesByProject, sampleCommitsByProject } from '../mock-data.js'

const props = defineProps({
  project: {
    type: Object,
    default: null
  }
})

const loading = ref(false)
const error = ref('')
const pipelines = ref([])
const currentPage = ref(1)
const hasMore = ref(true)
const commitMap = ref({})

const gitlabHost = ref(localStorage.getItem('gitlab-host') || 'https://gitlab.com')
const accessToken = ref(localStorage.getItem('gitlab-token') || '')

// 筛选
const selectedStatus = ref('')
const selectedRef = ref('')

const statusOptions = [
  'running', 'pending', 'success', 'failed', 'canceled', 'skipped', 'manual', 'scheduled', 'waiting_for_resource', 'created'
]

const statusLabel = (s) => {
  const map = {
    running: '运行中',
    pending: '等待中',
    success: '成功',
    failed: '失败',
    canceled: '已取消',
    skipped: '已跳过',
    manual: '手动',
    scheduled: '计划',
    waiting_for_resource: '等待资源',
    created: '已创建'
  }
  return map[s] || s || '全部'
}

const statusTagType = (s) => {
  switch (s) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'running': return 'warning'
    case 'pending': return 'warning'
    case 'canceled': return 'info'
    case 'skipped': return 'info'
    case 'manual': return 'primary'
    case 'scheduled': return 'warning'
    case 'waiting_for_resource': return 'warning'
    case 'created': return ''
    default: return ''
  }
}

const shortSha = (sha) => (sha ? sha.slice(0, 8) : '')
const formatDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleString('zh-CN')
}

const fetchPipelines = async (page = 1) => {
  const demoMode = localStorage.getItem('demo-mode') === '1'
  if (!props.project) return
  if (!demoMode && (!accessToken.value.trim() || !gitlabHost.value.trim())) {
    ElMessage.warning('请先在系统配置中设置 GitLab 主机地址和访问令牌')
    return
  }
  loading.value = true
  if (page === 1) pipelines.value = []
  try {
    let data
    const options = {
      page,
      perPage: 20,
      status: selectedStatus.value || undefined,
      ref: selectedRef.value || undefined,
      orderBy: 'id',
      sort: 'desc'
    }
    if (demoMode) {
      // 从示例数据加载，并应用筛选
      const all = samplePipelinesByProject[props.project.id] || []
      data = all.filter(p => {
        const statusOk = options.status ? p.status === options.status : true
        const refOk = options.ref ? (p.ref || '').includes(options.ref) : true
        return statusOk && refOk
      })
    } else if (window.services?.gitlab?.getProjectPipelinesById) {
      data = await window.services.gitlab.getProjectPipelinesById(
        gitlabHost.value.trim(),
        props.project.id,
        accessToken.value.trim(),
        options
      )
    } else {
      const params = new URLSearchParams({
        per_page: String(options.perPage),
        page: String(page)
      })
      if (options.status) params.append('status', options.status)
      if (options.ref) params.append('ref', options.ref)
      if (options.orderBy) params.append('order_by', options.orderBy)
      if (options.sort) params.append('sort', options.sort)
      const response = await fetch(`${gitlabHost.value.trim()}/api/v4/projects/${props.project.id}/pipelines?${params}`, {
        headers: { 'PRIVATE-TOKEN': accessToken.value.trim() }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      data = await response.json()
    }
    if (page === 1) {
      pipelines.value = data || []
    } else {
      pipelines.value = [...pipelines.value, ...(data || [])]
    }
    if (demoMode) {
      // 直接从示例提交填充 commitMap
      const commits = sampleCommitsByProject[props.project.id] || []
      commits.forEach(c => { commitMap.value[c.id] = c })
    } else {
      await fetchCommitDetailsForPipelines(pipelines.value)
    }
    currentPage.value = page
    hasMore.value = demoMode ? false : (data || []).length >= 20
  } catch (e) {
    console.error('加载流水线失败:', e)
    ElMessage.error(`加载流水线失败: ${e.message}`)
  } finally {
    loading.value = false
  }
}

const refreshPipelines = () => {
  currentPage.value = 1
  hasMore.value = true
  commitMap.value = {}
  fetchPipelines(1)
}

const loadMore = () => {
  if (hasMore.value && !loading.value) fetchPipelines(currentPage.value + 1)
}

const onFilterChange = () => {
  currentPage.value = 1
  hasMore.value = true
  fetchPipelines(1)
}


onMounted(() => {
  fetchPipelines(1)
})

// 当项目变化时，重置筛选并重新加载
watch(() => props.project, () => {
  selectedStatus.value = ''
  selectedRef.value = ''
  refreshPipelines()
})

// 批量获取提交详情
const fetchCommitDetailsForPipelines = async (list) => {
  try {
    const shas = Array.from(new Set((list || []).map(p => p.sha).filter(Boolean)))
    const toFetch = shas.filter(sha => !commitMap.value[sha])
    if (!toFetch.length) return
    const tasks = toFetch.map(sha => {
      if (window.services?.gitlab?.getCommitBySha) {
        return window.services.gitlab.getCommitBySha(
          gitlabHost.value.trim(),
          props.project.id,
          sha,
          accessToken.value.trim()
        ).then(c => ({ sha, c }))
      }
      return fetch(`${gitlabHost.value.trim()}/api/v4/projects/${props.project.id}/repository/commits/${sha}` , {
        headers: { 'PRIVATE-TOKEN': accessToken.value.trim() }
      }).then(r => r.json()).then(c => ({ sha, c }))
    })
    const results = await Promise.allSettled(tasks)
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        const { sha, c } = r.value
        commitMap.value[sha] = c
      }
    })
  } catch (err) {
    console.warn('加载提交详情失败：', err)
  }
}
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }

.project-info-card { margin-bottom: 16px; }
.project-header { display: flex; flex-direction: column; gap: 12px; }

.project-title h3 {   
  margin: 0;
  font-size: 20px;
  font-weight: 600; 
}
.project-description {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.pipelines-card { margin-bottom: 14px; }
.pipelines-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.pipelines-title { font-size: 16px; font-weight: 600; color: var(--el-text-color-primary); }
.pipelines-count { font-weight: 500; }
.header-right { display: flex; align-items: center; }

.pipelines-content {}

.pipeline-card { margin-bottom: 8px; }
.pipeline-header { display: flex; justify-content: space-between; align-items: flex-start; }
.left { width: 100%; }
.pipeline-title { margin: 0 0 4px 0; font-size: 16px; font-weight: 500; line-height: 1.4; }
.meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; color: var(--el-text-color-secondary); }
.ml-8 { margin-left: 8px; }

.commit-info { margin-top: 6px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.commit-message { max-width: 640px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.commit-author { color: var(--el-text-color-secondary); }

.load-actions { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 12px; }
</style>