const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')
const http = require('node:http')
const { URL } = require('node:url')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  
  // GitLab API 相关功能
  gitlab: {
    // 解析 GitLab 项目 URL，提取主机名和项目 ID
    parseProjectUrl (url) {
      try {
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split('/').filter(part => part)
        
        // 支持多种 GitLab URL 格式
        // https://gitlab.com/username/project
        // https://gitlab.example.com/group/subgroup/project
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

    // 发送 HTTP 请求
    makeRequest (url, options = {}) {
      return new Promise((resolve, reject) => {
        const urlObj = new URL(url)
        const isHttps = urlObj.protocol === 'https:'
        const client = isHttps ? https : http
        
        const requestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: options.method || 'GET',
          headers: {
            'User-Agent': 'uTools-GitLab-Commit-Viewer/1.0',
            // 默认请求 JSON；当需要纯文本（如 job trace）时跳过
            ...(options.responseType === 'text' ? {} : { 'Accept': 'application/json' }),
            ...options.headers
          }
        }

        const req = client.request(requestOptions, (res) => {
          let data = ''
          
          res.on('data', (chunk) => {
            data += chunk
          })
          
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                if (options.responseType === 'text') {
                  resolve(data)
                } else {
                  const jsonData = JSON.parse(data)
                  resolve(jsonData)
                }
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${data}`))
              }
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error.message}`))
            }
          })
        })

        req.on('error', (error) => {
          reject(new Error(`Request failed: ${error.message}`))
        })

        if (options.body) {
          req.write(JSON.stringify(options.body))
        }
        
        req.end()
      })
    },

    // 获取项目提交记录
    async getCommits (projectUrl, options = {}) {
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
    async getProjectInfo (projectUrl, accessToken) {
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
    async getProjectInfoById (gitlabHost, projectId, accessToken) {
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
    async getUserProjects (gitlabHost, accessToken, options = {}) {
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
    async getProjectBranches (projectUrl, accessToken, options = {}) {
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
    async getProjectBranchesById (gitlabHost, projectId, accessToken, options = {}) {
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
    async getProjectCommitsById (gitlabHost, projectId, accessToken, options = {}) {
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
    }

    // 获取所有事件列表
    async getEvents (gitlabHost, accessToken, options = {}) {
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
    }
    ,

    // 获取项目流水线列表（通过项目ID）
    async getProjectPipelinesById (gitlabHost, projectId, accessToken, options = {}) {
      try {
        const apiUrl = `${gitlabHost}/api/v4`
        const params = new URLSearchParams({
          per_page: options.perPage || '20',
          page: options.page || '1'
        })

        if (options.status) params.append('status', options.status)
        if (options.ref) params.append('ref', options.ref)
        if (options.sha) params.append('sha', options.sha)
        if (options.source) params.append('source', options.source)
        if (options.orderBy) params.append('order_by', options.orderBy)
        if (options.sort) params.append('sort', options.sort)

        const url = `${apiUrl}/projects/${projectId}/pipelines?${params}`
        const headers = {}
        if (accessToken) headers['PRIVATE-TOKEN'] = accessToken
        return await this.makeRequest(url, { headers })
      } catch (error) {
        throw new Error(`Failed to fetch project pipelines: ${error.message}`)
      }
    },

    // 通过流水线获取 Jobs 列表
    
  }
}
