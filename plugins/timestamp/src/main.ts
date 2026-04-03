import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'

createApp(App).mount('#app')

// ZTools 插件入口事件：接收搜索框传入的内容
try {
  if (window.ztools?.onPluginEnter) {
    window.ztools.onPluginEnter((action) => {
      if (action.payload) {
        const event = new CustomEvent('ztools-enter', { detail: action.payload })
        window.dispatchEvent(event)
      }
    })
  }
} catch {
  // 独立开发模式下 ztools 不可用
}
