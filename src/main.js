import { createApp } from "vue"
import "./main.css"
import App from "./App.vue"

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 启动应用（确保在 services 注入完成后执行）
const startApp = () => {
  const app = createApp(App)

  // 使用 Element Plus
  app.use(ElementPlus)

  // 注册所有图标
  try {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(key, component)
    }
  } catch (error) {
    console.warn('Element Plus icons registration failed:', error)
  }

  app.mount("#app")
}

// 在非 uTools 环境或未注入时兜底注入模拟 services（生产也兜底），避免顶层 await
const ensureServices = () => {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.services) return Promise.resolve()
  const isUtools = typeof window.utools !== 'undefined'
  return import('./dev-services.js')
    .then(() => {
      if (!isUtools) {
        console.log('非 uTools 环境：已注入模拟 services')
      } else {
        console.warn('uTools 环境：未检测到 preload 注入，已使用模拟 services 兜底')
      }
    })
    .catch((e) => {
      console.warn('模拟 services 注入失败：', e)
    })
}

ensureServices().then(startApp)