<template>
  <div class="project-sidebar">
    <!-- Projects Section -->
    <div class="projects-section">
      <!-- <div class="section-header">
        <span>项目选择</span>
        <el-button
          :icon="Refresh"
          circle
          size="small"
          :loading="loading"
          @click="refreshProjects"
        />
      </div> -->

      <!-- Search and Filter -->
      <div class="search-filter-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索项目..."
          :prefix-icon="Search"
          clearable
          @input="onSearchInput"
        />
        <div class="filter-tabs">
          <el-radio-group v-model="activeTab" @change="onTabChange" size="small">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="favorites">收藏</el-radio-button>
          </el-radio-group>

          <el-button
            :icon="Refresh"
            circle
            size="small"
            :loading="loading"
            @click="refreshProjects"
          />
        </div>
        <el-button
          type="primary"
          style="margin-top: 8px; width: 100%"
          @click="viewAllEvents"
        >查看全部事件</el-button>
      </div>

      <!-- Error Message -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        style="margin: 12px 0;"
      />

      <!-- Projects List -->
      <div class="projects-list">
        <div v-if="loading" class="loading-state">
          <el-skeleton :rows="3" animated />
        </div>
        
        <div v-else-if="filteredProjects.length === 0 && !error" class="empty-state">
          <el-empty :description="getEmptyDescription()" :image-size="60">
            <template #image>
              <el-icon size="60">
                <FolderOpened v-if="activeTab === 'all'" />
                <Star v-else />
              </el-icon>
            </template>
            <template #description>
              <p>{{ getEmptyDescription() }}</p>
            </template>
          </el-empty>
        </div>

        <div v-else class="projects-container">
          <el-card
            v-for="project in filteredProjects"
            :key="project.id"
            class="project-item"
            :class="{ 'selected': selectedProject?.id === project.id }"
            shadow="hover"
            @click="selectProject(project)"
          >
            <div class="project-content">
              <div class="project-info">
                <h4 class="project-name">{{ project.name }}</h4>
                <p class="project-path">{{ project.path_with_namespace }}</p>
                <div class="project-meta">
                  <!-- <el-tag size="small" :type="getVisibilityType(project.visibility)">
                    {{ project.visibility }}
                  </el-tag> -->
                  <span class="project-date">{{ formatDate(project.last_activity_at) }}</span>
                </div>
              </div>
            <div class="project-actions">
              <el-button
                :icon="isFavorite(project) ? StarFilled : Star"
                circle
                size="small"
                :type="isFavorite(project) ? 'warning' : 'default'"
                @click.stop="toggleFavorite(project)"
                :title="isFavorite(project) ? '取消收藏' : '添加收藏'"
              />
              <el-button
                :icon="Link"
                circle
                size="small"
                @click.stop="openProject(project)"
                title="打开项目"
              />
            </div>
          </div>
        </el-card>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Refresh, 
  Link, 
  FolderOpened,
  Search,
  Star,
  StarFilled
} from '@element-plus/icons-vue'
import { sampleProjectsList } from '../mock-data.js'

// Emits
const emit = defineEmits(['project-select', 'view-events'])

// Reactive data
const projects = ref([])
const selectedProject = ref(null)
const loading = ref(false)
const error = ref('')
const searchKeyword = ref('')
const activeTab = ref('all')
const favorites = ref(JSON.parse(localStorage.getItem('favorite-projects') || '[]'))

// Computed properties
const filteredProjects = computed(() => {
  let filtered = projects.value

  // 根据标签筛选
  if (activeTab.value === 'favorites') {
    filtered = filtered.filter(project => favorites.value.includes(project.id))
  }

  // 根据搜索关键词筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(project => 
      project.name.toLowerCase().includes(keyword) ||
      project.path_with_namespace.toLowerCase().includes(keyword) ||
      project.description?.toLowerCase().includes(keyword)
    )
  }

  return filtered
})

// Methods
const fetchProjects = async () => {
  const demoMode = localStorage.getItem('demo-mode') === '1'
  const gitlabHost = localStorage.getItem('gitlab-host')
  const accessToken = localStorage.getItem('gitlab-token')

  loading.value = true

  try {
    if (demoMode) {
      // 直接加载示例项目
      projects.value = sampleProjectsList
    } else {
      if (!gitlabHost || !accessToken) {
        ElMessage.warning('请先在系统配置中设置 GitLab 主机地址和访问令牌')
        return
      }
      const response = await fetch(`${gitlabHost}/api/v4/projects?membership=true&per_page=50`, {
        headers: { 'PRIVATE-TOKEN': accessToken }
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      projects.value = data
    }
  } catch (err) {
    ElMessage.error(`获取项目失败: ${err.message}`)
    console.error('Error fetching projects:', err)
  } finally {
    loading.value = false
  }
}

const refreshProjects = () => {
  const demoMode = localStorage.getItem('demo-mode') === '1'
  const gitlabHost = localStorage.getItem('gitlab-host')
  const accessToken = localStorage.getItem('gitlab-token')
  if (demoMode) {
    fetchProjects()
  } else if (gitlabHost && accessToken) {
    fetchProjects()
  } else {
    ElMessage.warning('请先在系统配置中设置 GitLab 主机地址和访问令牌')
  }
}

const selectProject = (project) => {
  selectedProject.value = project
  emit('project-select', project)
}

const openProject = (project) => {
  window.open(project.web_url, '_blank')
}

// 查看全部事件按钮
const viewAllEvents = () => {
  selectedProject.value = null
  emit('view-events')
}

// 收藏功能方法
const toggleFavorite = (project) => {
  console.log('toggleFavorite called with project:', project.name, 'ID:', project.id)
  const projectId = project.id
  const index = favorites.value.indexOf(projectId)
  
  if (index > -1) {
    // 取消收藏
    favorites.value.splice(index, 1)
    console.log('Removed from favorites:', project.name)
  } else {
    // 添加收藏
    favorites.value.push(projectId)
    console.log('Added to favorites:', project.name)
  }
  
  // 保存到本地存储
  localStorage.setItem('favorite-projects', JSON.stringify(favorites.value))
  console.log('Current favorites:', favorites.value)
}

const isFavorite = (project) => {
  return favorites.value.includes(project.id)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getVisibilityType = (visibility) => {
  switch (visibility) {
    case 'public':
      return 'success'
    case 'internal':
      return 'warning'
    case 'private':
      return 'info'
    default:
      return ''
  }
}

const getEmptyDescription = () => {
  if (activeTab.value === 'favorites') {
    return searchKeyword.value.trim() 
      ? '没有找到匹配的收藏项目' 
      : '暂无收藏的项目'
  } else {
    return searchKeyword.value.trim() 
      ? '没有找到匹配的项目' 
      : '暂无项目数据'
  }
}

// 搜索输入处理
const onSearchInput = () => {
  // 搜索是通过计算属性 filteredProjects 自动处理的，这里不需要额外逻辑
}

// 标签切换处理
const onTabChange = () => {
  // 标签切换是通过计算属性 filteredProjects 自动处理的，这里不需要额外逻辑
}

// Lifecycle
onMounted(() => {
  const demoMode = localStorage.getItem('demo-mode') === '1'
  const gitlabHost = localStorage.getItem('gitlab-host')
  const accessToken = localStorage.getItem('gitlab-token')
  if (demoMode || (gitlabHost && accessToken)) {
    fetchProjects()
  }
})
</script>

<style scoped>
.project-sidebar {
  height: 100%;
  display: flex; 
  flex-direction: column;
  background: var(--el-bg-color);
}

.projects-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.search-filter-section {
  margin: 12px;
}

.filter-tabs {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.projects-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.projects-container {
  padding-bottom: 12px;
}

.loading-state {
  padding: 16px;
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
}

.empty-state .el-empty {
  padding: 0;
}

.empty-state .el-empty__description {
  margin-top: 16px;
}

.project-item {
  margin-bottom: 8px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
  cursor: pointer;
}

.project-item:hover {
  border-color: var(--el-color-primary-light-7);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.project-item.selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.project-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-path {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.project-date {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.project-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .section-header {
    padding: 12px;
  }
  
  .projects-list {
    padding: 0 8px;
  }
  
  .project-content {
    flex-direction: column;
    gap: 8px;
  }
  
  .project-actions {
    align-self: flex-end;
  }
}

@media (max-width: 640px) {
  .project-name {
    font-size: 13px;
  }
  
  .project-path {
    font-size: 11px;
  }
}
</style>