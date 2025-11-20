// 开发环境模拟服务
// 在实际的 utools 环境中，这些功能由 preload/services.js 提供

window.services = {
  gitlab: {
    // 解析 GitLab 项目 URL
    parseProjectUrl(url) {
      try {
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split('/').filter(part => part)
        
        if (pathParts.length >= 2) {
          const host = `${urlObj.protocol}//${urlObj.host}`
          const projectPath = pathParts.join('/')
          
          return {
            host,
            projectPath,
            apiUrl: `${host}/api/v4`
          }
        }
        throw new Error('Invalid GitLab URL format')
      } catch (error) {
        throw new Error(`Failed to parse URL: ${error.message}`)
      }
    },

    // 发送 HTTP 请求（开发环境使用 fetch）
    async makeRequest(url, options = {}) {
      try {
        const fetchOptions = {
          method: options.method || 'GET',
          headers: {
            // 默认请求 JSON；当需要纯文本（如 job trace）时跳过
            ...(options.responseType === 'text' ? {} : { 'Accept': 'application/json' }),
            ...options.headers
          }
        }

        if (options.body) {
          fetchOptions.body = JSON.stringify(options.body)
          fetchOptions.headers['Content-Type'] = 'application/json'
        }

        const response = await fetch(url, fetchOptions)
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        if (options.responseType === 'text') {
          return await response.text()
        }
        return await response.json()
      } catch (error) {
        throw new Error(`Request failed: ${error.message}`)
      }
    },

    // 获取项目提交记录
    async getCommits(projectUrl, options = {}) {
      try {
        const { apiUrl, projectPath } = this.parseProjectUrl(projectUrl)
        const encodedPath = encodeURIComponent(projectPath)
        
        const params = new URLSearchParams({
          per_page: options.perPage || '20',
          page: options.page || '1'
        })
        
        if (options.branch) {
          params.append('ref_name', options.branch)
        }
        
        if (options.since) {
          params.append('since', options.since)
        }
        
        if (options.until) {
          params.append('until', options.until)
        }

        const url = `${apiUrl}/projects/${encodedPath}/repository/commits?${params}`
        
        const headers = {}
        if (options.accessToken) {
          headers['PRIVATE-TOKEN'] = options.accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch commits: ${error.message}`)
      }
    },

    // 获取项目信息
    async getProjectInfo(projectUrl, accessToken) {
      try {
        const { apiUrl, projectPath } = this.parseProjectUrl(projectUrl)
        const encodedPath = encodeURIComponent(projectPath)
        const url = `${apiUrl}/projects/${encodedPath}`
        
        const headers = {}
        if (accessToken) {
          headers['PRIVATE-TOKEN'] = accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch project info: ${error.message}`)
      }
    },

    // 通过项目ID获取项目信息（用于事件列表展示项目路径）
    async getProjectInfoById(gitlabHost, projectId, accessToken) {
      try {
        const apiUrl = `${gitlabHost}/api/v4`
        const url = `${apiUrl}/projects/${projectId}`

        const headers = {}
        if (accessToken) {
          headers['PRIVATE-TOKEN'] = accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch project info by id: ${error.message}`)
      }
    },

    // 获取用户项目列表
    async getUserProjects(gitlabHost, accessToken, options = {}) {
      try {
        if (!accessToken) {
          throw new Error('Access token is required to fetch user projects')
        }

        const apiUrl = `${gitlabHost}/api/v4`
        const params = new URLSearchParams({
          per_page: options.perPage || '50',
          page: options.page || '1',
          order_by: options.orderBy || 'updated_at',
          sort: options.sort || 'desc',
          simple: 'true'
        })

        // 支持按可见性过滤
        if (options.visibility) {
          params.append('visibility', options.visibility)
        }

        // 支持按成员身份过滤
        if (options.membership !== false) {
          params.append('membership', 'true')
        }

        // 支持搜索
        if (options.search) {
          params.append('search', options.search)
        }

        const url = `${apiUrl}/projects?${params}`
        const headers = {
          'PRIVATE-TOKEN': accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch user projects: ${error.message}`)
      }
    },

    // 获取项目分支列表
    async getProjectBranches(projectUrl, accessToken, options = {}) {
      try {
        const { apiUrl, projectPath } = this.parseProjectUrl(projectUrl)
        const encodedPath = encodeURIComponent(projectPath)
        
        const params = new URLSearchParams({
          per_page: options.perPage || '50',
          page: options.page || '1'
        })

        // 支持搜索分支
        if (options.search) {
          params.append('search', options.search)
        }

        const url = `${apiUrl}/projects/${encodedPath}/repository/branches?${params}`
        
        const headers = {}
        if (accessToken) {
          headers['PRIVATE-TOKEN'] = accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch project branches: ${error.message}`)
      }
    },

    // 通过项目ID获取分支列表（当直接有项目ID时使用）
    async getProjectBranchesById(gitlabHost, projectId, accessToken, options = {}) {
      try {
        const apiUrl = `${gitlabHost}/api/v4`
        const params = new URLSearchParams({
          per_page: options.perPage || '50',
          page: options.page || '1'
        })

        if (options.search) {
          params.append('search', options.search)
        }

        const url = `${apiUrl}/projects/${projectId}/repository/branches?${params}`
        
        const headers = {}
        if (accessToken) {
          headers['PRIVATE-TOKEN'] = accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch project branches: ${error.message}`)
      }
    },

    // 通过项目ID获取提交记录（当直接有项目ID时使用）
    async getProjectCommitsById(gitlabHost, projectId, accessToken, options = {}) {
      try {
        const apiUrl = `${gitlabHost}/api/v4`
        const params = new URLSearchParams({
          per_page: options.perPage || '20',
          page: options.page || '1'
        })
        
        if (options.refName) {
          params.append('ref_name', options.refName)
        }
        
        if (options.since) {
          params.append('since', options.since)
        }
        
        if (options.until) {
          params.append('until', options.until)
        }

        if (options.author) {
          params.append('author', options.author)
        }
        if (options.authorEmail) {
          params.append('author_email', options.authorEmail)
        }

        const url = `${apiUrl}/projects/${projectId}/repository/commits?${params}`
        
        const headers = {}
        if (accessToken) {
          headers['PRIVATE-TOKEN'] = accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch project commits: ${error.message}`)
      }
    },

    // 通过 SHA 获取单个提交详情
    async getCommitBySha(gitlabHost, projectId, sha, accessToken) {
      try {
        const apiUrl = `${gitlabHost}/api/v4`
        const url = `${apiUrl}/projects/${projectId}/repository/commits/${sha}`
        const headers = {}
        if (accessToken) {
          headers['PRIVATE-TOKEN'] = accessToken
        }
        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch commit by sha: ${error.message}`)
      }
    },

    // 获取所有事件列表
    async getEvents(gitlabHost, accessToken, options = {}) {
      try {
        const apiUrl = `${gitlabHost}/api/v4`
        const params = new URLSearchParams({
          per_page: options.perPage || '20',
          page: options.page || '1'
        })

        // 可选过滤参数
        if (options.action) params.append('action', options.action)
        if (options.targetType) params.append('target_type', options.targetType)
        if (options.before) params.append('before', options.before)
        if (options.after) params.append('after', options.after)
        // 范围（默认拉取所有可见事件，而非仅个人）
        params.append('scope', options.scope || 'all')

        const url = `${apiUrl}/events?${params}`
        const headers = {}
        if (accessToken) {
          headers['PRIVATE-TOKEN'] = accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch events: ${error.message}`)
      }
    },

    // 获取项目流水线列表（通过项目ID）
    async getProjectPipelinesById(gitlabHost, projectId, accessToken, options = {}) {
      try {
        const apiUrl = `${gitlabHost}/api/v4`
        const params = new URLSearchParams({
          per_page: options.perPage || '20',
          page: options.page || '1'
        })

        // 过滤条件
        if (options.status) params.append('status', options.status)
        if (options.ref) params.append('ref', options.ref)
        if (options.sha) params.append('sha', options.sha)
        if (options.source) params.append('source', options.source)

        // 排序
        if (options.orderBy) params.append('order_by', options.orderBy)
        if (options.sort) params.append('sort', options.sort)

        const url = `${apiUrl}/projects/${projectId}/pipelines?${params}`
        const headers = {}
        if (accessToken) {
          headers['PRIVATE-TOKEN'] = accessToken
        }

        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch project pipelines: ${error.message}`)
      }
    }
    
  }
}

console.log('开发环境：已加载模拟 services')
console.log('可用的 GitLab API 函数：', Object.keys(window.services.gitlab))