import { createApp } from 'vue'
import './main.css'
import App from './App.vue'
import { registry } from './core/registry'
import { builtInPlugins } from './plugins'
import { i18n } from './i18n'

// 注册所有内置插件
builtInPlugins.forEach(plugin => {
  registry.register(plugin)
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
