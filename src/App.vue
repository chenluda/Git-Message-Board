<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Setting, ChatDotRound, FolderOpened } from '@element-plus/icons-vue';
import GitLabCommits from './GitLabCommits/index.vue'
import GitLabEvents from './GitLabEvents/index.vue'
import GitLabPipelines from './GitLabPipelines/index.vue'
import ProjectSidebar from './ProjectSidebar/index.vue'
import AIDialog from './components/AIDialog.vue'
import { aiContextType, aiContextItems, aiScopeText } from './ai-context.js'

// 简化的状态管理，只保留必要的功能
const selectedProject = ref(null)
const showEvents = ref(true)
const activeProjectTab = ref<'commits' | 'pipelines'>('commits')
const initialBranch = ref('')
const scrollToCommitId = ref('')

// 配置弹窗相关
const configDialogVisible = ref(false)
const activeConfigTab = ref('gitlab')

onMounted(() => {
  try {
    // 检查是否在 utools 环境中
    if (window.utools) {
      console.log('检测到 utools 环境')
      
      window.utools.onPluginEnter((action) => {
        console.log('utools 插件启动', action)
        // 确保应用正确初始化
        setTimeout(() => {
          console.log('utools 环境初始化完成')
        }, 100)
      })
      
      window.utools.onPluginOut((isKill) => {
        console.log('utools 插件退出', isKill)
      })
      
      // 添加超时检查，确保应用在utools中正常显示
      setTimeout(() => {
        console.log('utools 环境检查完成，应用应该已正常显示')
      }, 500)
    } else {
      // 开发环境
      console.log('开发环境：Git Message Board')
    }
  } catch (error) {
    console.error('应用初始化错误:', error)
  }
})

// 处理项目选择
const handleProjectSelect = (project) => {
  selectedProject.value = project
  showEvents.value = false
  activeProjectTab.value = 'commits'
}

// 查看所有事件
const handleViewEvents = () => {
  showEvents.value = true
  selectedProject.value = null
}

// 配置相关方法
const openConfigDialog = () => {
  configDialogVisible.value = true
}

const closeConfigDialog = () => {
  configDialogVisible.value = false
}

// GitLab 配置
const gitlabConfig = ref({
  host: localStorage.getItem('gitlab-host') || '',
  token: localStorage.getItem('gitlab-token') || '',
  authorEmail: localStorage.getItem('gitlab-author-email') || '',
  demoMode: (localStorage.getItem('demo-mode') || '') === '1'
})

// OpenAI 配置
const openaiConfig = ref({
  apiKey: localStorage.getItem('openai-api-key') || '',
  baseUrl: localStorage.getItem('openai-base-url') || 'https://api.openai.com/v1',
  modelName: localStorage.getItem('openai-model-name') || 'gpt-3.5-turbo'
})
// 全局 AI 对话框开关（悬浮按钮控制）
const aiDialogVisible = ref(false)

// 保存配置
const saveConfig = () => {
  // 保存 GitLab 配置
  localStorage.setItem('gitlab-host', gitlabConfig.value.host)
  localStorage.setItem('gitlab-token', gitlabConfig.value.token)
  localStorage.setItem('gitlab-author-email', gitlabConfig.value.authorEmail)
  localStorage.setItem('demo-mode', gitlabConfig.value.demoMode ? '1' : '0')
  
  // 保存 OpenAI 配置
  localStorage.setItem('openai-api-key', openaiConfig.value.apiKey)
  localStorage.setItem('openai-base-url', openaiConfig.value.baseUrl)
  localStorage.setItem('openai-model-name', openaiConfig.value.modelName)
  
  // 关闭弹窗
  closeConfigDialog()
  
  // 显示成功消息
  ElMessage.success('配置保存成功')
}

// 已移除侧边栏“只看本人”相关逻辑，保留主区按钮

// 从事件页跳转到指定项目/分支
const handleNavigateToProjectBranch = async ({ project, projectId, branch, commitId }) => {
  try {
    let proj = project || null
    if (!proj) {
      const gitlabHost = localStorage.getItem('gitlab-host') || ''
      const token = localStorage.getItem('gitlab-token') || ''
      if (window.services?.gitlab?.getProjectInfoById) {
        proj = await window.services.gitlab.getProjectInfoById(gitlabHost, projectId, token)
      } else if (gitlabHost && token && projectId) {
        const res = await fetch(`${gitlabHost}/api/v4/projects/${projectId}`, {
          headers: { 'PRIVATE-TOKEN': token }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        proj = await res.json()
      }
    }
    if (!proj) {
      ElMessage.error('无法加载项目信息')
      return
    }
    selectedProject.value = proj
    initialBranch.value = branch || ''
    scrollToCommitId.value = commitId || ''
    showEvents.value = false
    activeProjectTab.value = 'commits'
  } catch (e) {
    console.error('导航到分支失败:', e)
    ElMessage.error('导航到分支失败')
  }
}
</script>

<template>
  <el-container class="app-layout">
    <!-- Header -->
    <el-header class="app-header">
      <div class="header-content">
        <div class="brand">
          <img src="/logo.png" alt="Git Message Board Logo" class="app-logo" />
          <h1 class="app-title">Git Message Board</h1>
        </div>
        <div class="header-actions">
          <el-button 
            type="primary" 
            :icon="Setting" 
            circle 
            @click="openConfigDialog"
            title="配置"
            class="config-button"
          />
          <el-tag v-if="selectedProject" type="success" class="current-project">
            {{ selectedProject.name }}
          </el-tag>
        </div>
      </div>
    </el-header>

    <!-- Main Content Area -->
    <el-container class="app-main">
      <!-- Left Sidebar - Project Selection -->
      <el-aside class="app-aside" width="320px">
        <!-- <div class="sidebar-header">
          <h3>项目选择</h3>
        </div> -->
        <ProjectSidebar @project-select="handleProjectSelect" @view-events="handleViewEvents" />
      </el-aside>

      <!-- Right Main Area - Git Messages -->
      <el-main class="app-container">
        <div v-if="showEvents" class="git-messages-container">
          <GitLabEvents @navigate-to-project-branch="handleNavigateToProjectBranch" />
        </div>
        <div v-else-if="selectedProject" class="git-messages-container">
          <el-tabs v-model="activeProjectTab" class="project-tabs">
            <el-tab-pane label="提交记录" name="commits">
              <GitLabCommits :project="selectedProject" :initialBranch="initialBranch" :scrollToCommitId="scrollToCommitId" />
            </el-tab-pane>
            <el-tab-pane label="流水线" name="pipelines">
              <GitLabPipelines :project="selectedProject" />
            </el-tab-pane>
          </el-tabs>
        </div>
        <div v-else class="welcome-screen">
          <el-empty description="请从左侧选择一个项目查看 Git 提交记录">
            <template #image>
              <el-icon size="100"><FolderOpened /></el-icon>
            </template>
            <template #description>
              <h2>Git Message Board</h2>
              <p>请从左侧选择一个项目查看 Git 提交记录</p>
            </template>
          </el-empty>
        </div>
      </el-main>
    </el-container>

    <!-- 配置弹窗 -->
    <el-dialog
      v-model="configDialogVisible"
      title="系统配置"
      width="600px"
      :before-close="closeConfigDialog"
      class="config-dialog"
    >
      <el-tabs v-model="activeConfigTab" class="config-tabs">
        <!-- GitLab 配置 -->
        <el-tab-pane label="GitLab 配置" name="gitlab">
          <el-form :model="gitlabConfig" label-width="auto" class="config-form">
            <el-form-item label="GitLab 主机">
              <el-input
                v-model="gitlabConfig.host"
                placeholder="请输入 GitLab 主机地址，如：https://gitlab.com"
                clearable
              />
              <div class="form-tip">
                请输入完整的 GitLab 主机地址，包含协议（http:// 或 https://）
              </div>
            </el-form-item>
            <el-form-item label="访问令牌">
              <el-input
                v-model="gitlabConfig.token"
                type="password"
                placeholder="请输入 GitLab 访问令牌"
                show-password
                clearable
              />
              <div class="form-tip">
                在 GitLab 中生成个人访问令牌，需要 read_api 权限
              </div>
            </el-form-item>
            <el-form-item label="作者邮箱（可选）">
              <el-input
                v-model="gitlabConfig.authorEmail"
                placeholder="填写你的作者邮箱，用于更精准过滤"
                clearable
              />
              <div class="form-tip">
                最准确的过滤方式是填写邮箱（提交记录中的 author_email）。
              </div>
            </el-form-item>
            <!-- <el-form-item label="演示模式">
              <el-switch
                v-model="gitlabConfig.demoMode"
                active-text="使用假数据"
                inactive-text="关闭演示"
              />
              <div class="form-tip">
                开启后，事件列表将加载内置示例数据，便于展示效果。
              </div>
            </el-form-item> -->
          </el-form>
        </el-tab-pane>

        <!-- OpenAI 配置 -->
        <el-tab-pane label="OpenAI API" name="openai">
          <el-form :model="openaiConfig" label-width="120px" class="config-form">
            <el-form-item label="API Key">
              <el-input
                v-model="openaiConfig.apiKey"
                type="password"
                placeholder="请输入 OpenAI API Key"
                show-password
                clearable
              />
              <div class="form-tip">
                请输入您的 OpenAI API Key，用于 AI 功能
              </div>
            </el-form-item>
            <el-form-item label="API 基础地址">
              <el-input
                v-model="openaiConfig.baseUrl"
                placeholder="API 基础地址"
                clearable
              />
              <div class="form-tip">
                默认为 https://api.openai.com/v1，如使用代理请修改
              </div>
            </el-form-item>
            <el-form-item label="模型名称">
              <el-select
                v-model="openaiConfig.modelName"
                placeholder="请选择模型"
                clearable
                filterable
                allow-create
                style="width: 100%"
              >
                <el-option label="gpt-3.5-turbo" value="gpt-3.5-turbo" />
                <el-option label="gpt-4" value="gpt-4" />
                <el-option label="gpt-4-turbo" value="gpt-4-turbo" />
                <el-option label="gpt-4o" value="gpt-4o" />
                <el-option label="gpt-4o-mini" value="gpt-4o-mini" />
              </el-select>
              <div class="form-tip">
                选择要使用的 OpenAI 模型，也可以输入自定义模型名称
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeConfigDialog">取消</el-button>
          <el-button type="primary" @click="saveConfig">保存配置</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 全局悬浮 AI 对话按钮 -->
    <div class="floating-ai-button">
      <el-button 
        type="success" 
        :icon="ChatDotRound" 
        class="floating-button"
        circle 
        title="AI 对话"
        @click="aiDialogVisible = true"
      />
    </div>

    <!-- 全局 AI 对话弹窗 -->
    <AIDialog
      v-model="aiDialogVisible"
      :contextType="aiContextType"
      :contextData="aiContextItems"
      :scopeText="aiScopeText"
    />
  </el-container>
</template>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
  color: white;
  padding: 0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 100%;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.config-button {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: white !important;
}

.config-button:hover {
  background: rgba(255, 255, 255, 0.3) !important;
}

.current-project {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: white !important;
}

.app-main {
  height: calc(100vh - 60px);
  overflow: hidden;
}

.app-aside {
  background: white;
  border-right: 1px solid var(--el-border-color);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-page);
  flex-shrink: 0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.app-container {
  background: var(--el-bg-color-page);
  padding: 0 !important;
  height: 100%;
  overflow-y: auto;
}

.git-messages-container {
  height: 100%;
  padding: 24px;
}

.welcome-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.welcome-screen h2 {
  margin-bottom: 1rem;
  color: var(--el-text-color-primary);
}

.welcome-screen p {
  font-size: 1.1rem;
  color: var(--el-text-color-regular);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
  }
  
  .app-title {
    font-size: 1.3rem;
  }
  
  .app-aside {
    width: 280px !important;
  }
  
  .git-messages-container {
    padding: 16px;
  }
}

@media (max-width: 640px) {
  .app-main {
    flex-direction: column !important;
  }
  
  .app-aside {
    width: 100% !important;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color);
  }
  
  .header-actions {
    display: none;
  }
  
  .sidebar-header {
    padding: 12px 16px 8px;
  }
  
  .git-messages-container {
    padding: 12px;
  }
}

/* 配置弹窗样式 */
.config-tabs {
  /* margin-top: 20px; */
}

.config-form {
  padding: 20px 0;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 5px;
  line-height: 1.4;
}

.dialog-footer {
  text-align: right;
}
/* 全局悬浮按钮样式 */
.floating-ai-button {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2000;
}

.floating-button {
  position: relative;
  width: 40px !important;
  height: 40px !important;
  font-size: 20px;
  color: #fff !important;
  background: linear-gradient(135deg, #67C23A 0%, #42B983 100%) !important;
  border: none !important;
  overflow: visible !important;
  box-shadow: 0 12px 24px rgba(103, 194, 58, 0.35), 0 8px 10px rgba(103, 194, 58, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.floating-button:hover {
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 16px 28px rgba(103, 194, 58, 0.45), 0 10px 12px rgba(103, 194, 58, 0.3);
  filter: brightness(1.06);
}

.floating-button:active {
  transform: scale(0.98);
  box-shadow: 0 8px 16px rgba(103, 194, 58, 0.35), 0 6px 8px rgba(103, 194, 58, 0.25);
}

.floating-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.35), 0 14px 24px rgba(103, 194, 58, 0.45) !important;
}

.floating-button::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(103, 194, 58, 0.4), rgba(103, 194, 58, 0));
  filter: blur(8px);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.floating-button:hover::after {
  opacity: 1;
}
</style>