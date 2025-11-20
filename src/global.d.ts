// 全局 Window 类型声明，避免 TS 在 App.vue 中报错
export {}

declare global {
  interface Window {
    services?: any
    utools?: any
  }
}