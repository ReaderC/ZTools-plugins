/// <reference types="vite/client" />
/// <reference types="@ztools-center/ztools-api-types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

// Preload services 类型声明（对应 public/preload/services.js）
interface Services {
  rename: (oldPath: string, newPath: string) => Promise<void>
  exists: (targetPath: string) => boolean | Promise<boolean>
  getStats: (targetPath: string) => Promise<{
    isFile: boolean
    isDirectory: boolean
    size: number
    mtimeMs: number
    ctimeMs: number
    birthtimeMs: number
  }>
}

declare global {
  interface Window {
    services: Services
  }
}

export {}
