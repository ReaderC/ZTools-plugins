import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// 构建完成后把 README.md 复制到 dist/
function copyReadme() {
  return {
    name: 'copy-readme',
    closeBundle() {
      copyFileSync(
        resolve(__dirname, 'README.md'),
        resolve(__dirname, 'dist/README.md')
      )
    }
  }
}

// 构建完成后从 dist/plugin.json 中移除 development 字段
// development 字段仅用于本地开发（dev server），发布版本不应包含
function stripDevConfig() {
  return {
    name: 'strip-dev-config',
    closeBundle() {
      const pluginJsonPath = resolve(__dirname, 'dist/plugin.json')
      const config = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'))
      delete config.development
      writeFileSync(pluginJsonPath, JSON.stringify(config, null, 2), 'utf-8')

      // 删除 dist/preload/node_modules —— ZTools 市场不提供 node_modules，
      // 依赖已内联到 vendor/，node_modules 留在 dist 只会增大体积且无法使用
      const distNodeModules = resolve(__dirname, 'dist/preload/node_modules')
      rmSync(distNodeModules, { recursive: true, force: true })
      // 同时删除 preload 的 package.json / package-lock.json（发布不需要）
      rmSync(resolve(__dirname, 'dist/preload/package.json'), { force: true })
      rmSync(resolve(__dirname, 'dist/preload/package-lock.json'), { force: true })
      // vendor/ 由 Vite 自动从 public/ 复制到 dist/，无需手动处理
    }
  }
}

export default defineConfig({
  plugins: [react(), copyReadme(), stripDevConfig()],
  base: './'
})
