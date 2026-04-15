<script setup lang="ts">
/**
 * 主应用程序入口组件。
 * 管理文件导入、工作流配置、预览和重命名操作。
 * @description 作为应用的核心容器，协调文件导入、工作流构建、实时预览和重命名执行的全流程
 */
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { registry } from '@/core/registry'
import { applyWorkflow } from '@/core/engine'
import type { FileItem, ActionInstance } from '@/core/types'
import { fsBridge } from '@/core/bridge'
import { driver } from 'driver.js'
import type { DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

// 重构组件与 i18n
import ControlHeader from '@/components/layout/ControlHeader.vue'
import WorkflowSidebar from '@/components/workflow/WorkflowSidebar.vue'
import RenamingTable from '@/components/preview/RenamingTable.vue'
import SettingsDialog from '@/components/layout/SettingsDialog.vue'

// --- 状态管理 ---
/** List of files selected for renaming */
const files = ref<FileItem[]>([])
/** Ordered list of actions to apply to files */
const workflow = ref<ActionInstance[]>([])
/** Whether the settings dialog is currently open */
const isSettingsOpen = ref(false)
/** Whether the sidebar is collapsed */
const isSidebarCollapsed = ref(false)
/** Visual style for connector lines between actions */
const lineStyle = ref<'solid' | 'dashed' | 'none'>('solid')
/** Number of currently selected files */
const selectedCount = ref(0)
/** Set of selected file IDs */
const selectedIds = ref<string[]>([])
/** Whether the drag preview overlay is active */
const isDragOverPreview = ref(false)
/** Current depth during drag operations (for nested folder handling) */
const dragDepth = ref(0)
/** Internationalization helper */
const { t } = useI18n()
/** Local storage key for tracking onboarding completion */
const ONBOARDING_STORAGE_KEY = 'fr-onboarding-completed-v1'

/**
 * Checks if the user has completed the onboarding tutorial.
 * @returns True if onboarding was previously completed
 */
const hasCompletedOnboarding = () => {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const markOnboardingCompleted = () => {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1')
  } catch {
    // Ignore localStorage failures in restricted environments.
  }
}

const startOnboarding = async (force = false) => {
  if (!force && hasCompletedOnboarding()) {
    return
  }

  await nextTick()

  const steps: DriveStep[] = [
    {
      element: '#onboarding-guide-btn',
      popover: {
        title: t('onboarding.entry_title'),
        description: t('onboarding.entry_description'),
        side: 'bottom' as const,
        align: 'start' as const
      }
    },
    {
      element: '#onboarding-import-btn',
      popover: {
        title: t('onboarding.import_title'),
        description: t('onboarding.import_description'),
        side: 'bottom' as const,
        align: 'start' as const
      }
    },
    {
      element: '#onboarding-workflow',
      popover: {
        title: t('onboarding.workflow_title'),
        description: t('onboarding.workflow_description'),
        side: 'right' as const,
        align: 'start' as const
      }
    },
    {
      element: '#onboarding-add-rule-btn',
      popover: {
        title: t('onboarding.rule_title'),
        description: t('onboarding.rule_description'),
        side: 'right' as const,
        align: 'start' as const
      }
    },
    {
      element: '#onboarding-workflow-list',
      popover: {
        title: t('onboarding.reorder_title'),
        description: t('onboarding.reorder_description'),
        side: 'right' as const,
        align: 'center' as const
      }
    },
    {
      element: '#onboarding-preview',
      popover: {
        title: t('onboarding.preview_title'),
        description: t('onboarding.preview_description'),
        side: 'left' as const,
        align: 'start' as const
      }
    },
    {
      element: '#onboarding-run-btn',
      popover: {
        title: t('onboarding.run_title'),
        description: t('onboarding.run_description'),
        side: 'bottom' as const,
        align: 'center' as const
      }
    }
  ].filter((step) => Boolean(document.querySelector(step.element)))

  if (steps.length === 0) {
    return
  }

  markOnboardingCompleted()

  const tour = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: t('onboarding.next'),
    prevBtnText: t('onboarding.prev'),
    doneBtnText: t('onboarding.done'),
    steps
  })

  tour.drive()
}

// 三态主题：system | light | dark
/** Current theme setting (system, light, or dark) */
const theme = ref<string>(localStorage.getItem('fr-theme') || 'system')
/** Available brand preset options */
const BRAND_PRESETS = ['professional', 'soft', 'high-contrast'] as const
/** Type representing a valid brand preset */
type BrandPreset = (typeof BRAND_PRESETS)[number]

/**
 * Parses a string value to determine the brand preset.
 * @param value - String value from localStorage
 * @returns Valid BrandPreset or default 'professional'
 */
const parseBrandPreset = (value: string | null): BrandPreset => {
  if (value && BRAND_PRESETS.includes(value as BrandPreset)) {
    return value as BrandPreset
  }
  return 'professional'
}

const brandPreset = ref<BrandPreset>(parseBrandPreset(localStorage.getItem('fr-brand-preset')))

// --- 主题逻辑 ---
/** Media query for detecting system color scheme preference */
const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
/**
 * Handler for system theme changes when in system mode.
 * @param e - Media query list event
 */
const handleSystemThemeChange = (e: MediaQueryListEvent) => {
  if (theme.value === 'system') {
    document.documentElement.classList.toggle('dark', e.matches)
  }
}

const applyTheme = (newTheme: string) => {
  const root = document.documentElement
  let effectiveTheme = newTheme
  
  if (newTheme === 'system') {
    effectiveTheme = systemThemeMedia.matches ? 'dark' : 'light'
  }

  root.classList.toggle('dark', effectiveTheme === 'dark')
  localStorage.setItem('fr-theme', newTheme)
}

const applyBrandPreset = (preset: BrandPreset) => {
  const root = document.documentElement
  root.setAttribute('data-brand-preset', preset)
  localStorage.setItem('fr-brand-preset', preset)
}

watch(theme, (nextTheme, prevTheme) => {
  if (prevTheme === 'system') {
    systemThemeMedia.removeEventListener('change', handleSystemThemeChange)
  }
  if (nextTheme === 'system') {
    systemThemeMedia.addEventListener('change', handleSystemThemeChange)
  }
  applyTheme(nextTheme)
})

watch(brandPreset, (nextPreset) => {
  applyBrandPreset(nextPreset)
})

const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i
const WINDOWS_ABSOLUTE_PATH = /^[a-zA-Z]:[\\/]/
const UNC_ABSOLUTE_PATH = /^\\\\/
const POSIX_ABSOLUTE_PATH = /^\//

const isAbsoluteFilePath = (targetPath: string) => {
  return WINDOWS_ABSOLUTE_PATH.test(targetPath)
    || UNC_ABSOLUTE_PATH.test(targetPath)
    || POSIX_ABSOLUTE_PATH.test(targetPath)
}

const getNameFromPath = (targetPath: string) => {
  const normalizedPath = targetPath.replace(/\\/g, '/')
  const lastSlash = normalizedPath.lastIndexOf('/')
  return lastSlash === -1 ? normalizedPath : normalizedPath.slice(lastSlash + 1)
}

const buildTargetPath = (sourcePath: string, newName: string) => {
  const lastSeparator = Math.max(sourcePath.lastIndexOf('/'), sourcePath.lastIndexOf('\\'))
  if (lastSeparator === -1) return newName
  return `${sourcePath.slice(0, lastSeparator + 1)}${newName}`
}

const getExtension = (name: string) => name.split('.').pop() || ''

type ImportedFile = File & {
  path?: string
  webkitRelativePath?: string
}

type FileSystemFileEntryLike = {
  isFile: true
  file: (successCallback: (file: ImportedFile) => void, errorCallback?: (error: unknown) => void) => void
}

type FileSystemDirectoryReaderLike = {
  readEntries: (
    successCallback: (entries: FileSystemEntryLike[]) => void,
    errorCallback?: (error: unknown) => void
  ) => void
}

type FileSystemDirectoryEntryLike = {
  isDirectory: true
  createReader: () => FileSystemDirectoryReaderLike
}

type FileSystemEntryLike =
  | FileSystemFileEntryLike
  | FileSystemDirectoryEntryLike

const readAllEntries = async (reader: FileSystemDirectoryReaderLike): Promise<FileSystemEntryLike[]> => {
  const allEntries: FileSystemEntryLike[] = []

  while (true) {
    const chunk = await new Promise<FileSystemEntryLike[]>((resolve) => {
      reader.readEntries(
        (entries) => resolve(entries),
        () => resolve([])
      )
    })

    if (!chunk.length) break
    allEntries.push(...chunk)
  }

  return allEntries
}

const readEntryFiles = async (entry: FileSystemEntryLike): Promise<ImportedFile[]> => {
  if ('isFile' in entry && entry.isFile) {
    return new Promise<ImportedFile[]>((resolve) => {
      entry.file(
        (file) => resolve([file]),
        () => resolve([])
      )
    })
  }

  if ('isDirectory' in entry && entry.isDirectory) {
    const reader = entry.createReader()
    const childEntries = await readAllEntries(reader)
    const nestedFiles = await Promise.all(childEntries.map((child) => readEntryFiles(child)))
    return nestedFiles.flat()
  }

  return []
}

const extractDroppedFiles = async (event: DragEvent): Promise<ImportedFile[]> => {
  const dataTransfer = event.dataTransfer
  if (!dataTransfer) return []

  const items = Array.from(dataTransfer.items || [])
  const entries = items
    .map((item) => (item as any).webkitGetAsEntry?.() as FileSystemEntryLike | null)
    .filter((entry): entry is FileSystemEntryLike => Boolean(entry))

  if (entries.length) {
    const filesFromEntries = (await Promise.all(entries.map((entry) => readEntryFiles(entry)))).flat()
    if (filesFromEntries.length) {
      return filesFromEntries
    }
  }

  return Array.from(dataTransfer.files || []) as ImportedFile[]
}

const validateNewName = (name: string): string | null => {
  const trimmed = name.trim()
  if (!trimmed) return '文件名不能为空'
  if (trimmed === '.' || trimmed === '..') return '文件名无效'
  if (INVALID_FILE_NAME_CHARS.test(trimmed)) return '文件名包含非法字符'
  if (WINDOWS_RESERVED_NAMES.test(trimmed)) return '文件名是系统保留名称'
  return null
}

// --- 实时预览计算 ---
const previewFiles = computed(() => {
  return applyWorkflow(files.value, workflow.value)
})

// --- 操作方法 ---
const addAction = (pluginId: string) => {
  const plugin = registry.get(pluginId)
  if (!plugin) return
  
  workflow.value.push({
    instanceId: Math.random().toString(36).substring(2, 9),
    pluginId,
    config: Object.keys(plugin.configSchema || {}).reduce((acc: any, key) => {
      acc[key] = plugin.configSchema[key].default
      return acc
    }, {}),
    enabled: true
  })
}

const removeAction = (index: number) => {
  workflow.value.splice(index, 1)
}

const moveAction = ({ from, to }: { from: number; to: number }) => {
  const length = workflow.value.length
  if (length <= 1) return
  if (from < 0 || from >= length) return

  const next = [...workflow.value]
  const [moved] = next.splice(from, 1)
  if (!moved) return

  const clampedTo = Math.min(Math.max(0, to), length)
  const insertIndex = from < clampedTo ? clampedTo - 1 : clampedTo
  next.splice(insertIndex, 0, moved)
  workflow.value = next
}

const appendImportedFiles = (importedFiles: ImportedFile[]) => {
  if (!importedFiles.length) return

  const newFiles: FileItem[] = importedFiles.map((f) => {
    const rawPath = (f.path || '').trim()
    const fallbackPath = (f.webkitRelativePath || f.name).trim()
    const resolvedPath = rawPath || fallbackPath
    const hasAbsolutePath = isAbsoluteFilePath(rawPath)

    return {
      id: Math.random().toString(36).substring(2, 9),
      originalName: f.name,
      newName: f.name,
      path: resolvedPath,
      size: f.size,
      lastModified: f.lastModified,
      isDirectory: false,
      status: hasAbsolutePath ? 'pending' : 'error',
      errorMessage: hasAbsolutePath ? undefined : '无法获取文件绝对路径，请使用“导入文件”按钮选择本地文件',
      extension: f.name.split('.').pop() || ''
    }
  })
  
  files.value = [...files.value, ...newFiles]
}

const handleImportFiles = (fileList: FileList) => {
  appendImportedFiles(Array.from(fileList) as ImportedFile[])
}

const handleImportPaths = async (filePaths: string[]) => {
  if (!filePaths.length) return

  const imported: Array<FileItem | null> = await Promise.all(filePaths.map(async (rawPath) => {
    const targetPath = (rawPath || '').trim()
    if (!targetPath || !isAbsoluteFilePath(targetPath)) {
      return null
    }

    const stats = await fsBridge.getStats(targetPath)
    if (!stats || !stats.isFile) {
      return null
    }

    const fileName = getNameFromPath(targetPath)
    return {
      id: Math.random().toString(36).substring(2, 9),
      originalName: fileName,
      newName: fileName,
      path: targetPath,
      size: stats.size,
      lastModified: stats.mtimeMs,
      isDirectory: false,
      status: 'pending',
      extension: fileName.split('.').pop() || ''
    }
  }))

  const validFiles = imported.filter((file): file is FileItem => file !== null)
  if (!validFiles.length) return

  files.value = [...files.value, ...validFiles]
}

const handlePreviewDragEnter = (event: DragEvent) => {
  event.preventDefault()
  dragDepth.value += 1
  isDragOverPreview.value = true
}

const handlePreviewDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handlePreviewDragLeave = (event: DragEvent) => {
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) {
    isDragOverPreview.value = false
  }
}

const handlePreviewDrop = async (event: DragEvent) => {
  event.preventDefault()
  dragDepth.value = 0
  isDragOverPreview.value = false

  const droppedFiles = await extractDroppedFiles(event)
  appendImportedFiles(droppedFiles)
}

const clearFiles = () => {
  files.value = []
  selectedCount.value = 0
}

const removeFileFromQueue = (fileId: string) => {
  files.value = files.value.filter((file) => file.id !== fileId)
}

const removeFilesFromQueue = (fileIds: string[]) => {
  if (fileIds.length === 0) return
  const idSet = new Set(fileIds)
  files.value = files.value.filter((file) => !idSet.has(file.id))
}

const hasCommittedRename = (file: FileItem) => {
  return Boolean(file.lastRenamedFromPath && file.lastRenamedFromName)
}

const revertCommittedRename = async (file: FileItem) => {
  const previousPath = file.lastRenamedFromPath
  const previousName = file.lastRenamedFromName

  if (!previousPath || !previousName) {
    return
  }

  if (!isAbsoluteFilePath(file.path) || !isAbsoluteFilePath(previousPath)) {
    file.status = 'error'
    file.errorMessage = '撤回失败：路径无效'
    return
  }

  const currentExists = await fsBridge.exists(file.path)
  if (!currentExists) {
    file.status = 'error'
    file.errorMessage = '撤回失败：当前文件不存在'
    return
  }

  const previousExists = await fsBridge.exists(previousPath)
  if (previousExists) {
    file.status = 'error'
    file.errorMessage = '撤回失败：目标原文件名已存在'
    return
  }

  const result = await fsBridge.rename(file.path, previousPath)
  if (!result.success) {
    file.status = 'error'
    file.errorMessage = result.error || '撤回失败'
    return
  }

  file.path = previousPath
  file.originalName = previousName
  file.newName = previousName
  file.extension = getExtension(previousName)
  file.status = 'success'
  file.errorMessage = undefined
  file.lastRenamedFromPath = undefined
  file.lastRenamedFromName = undefined
}

const revertFile = async (fileId: string) => {
  const file = files.value.find((f) => f.id === fileId)
  if (!file) return

  if (hasCommittedRename(file)) {
    await revertCommittedRename(file)
    return
  }

  file.newName = file.originalName
  file.status = 'pending'
  file.errorMessage = undefined
}

const revertFiles = async (fileIds: string[]) => {
  if (fileIds.length === 0) return
  const idSet = new Set(fileIds)

  for (const file of files.value) {
    if (idSet.has(file.id)) {
      if (hasCommittedRename(file)) {
        await revertCommittedRename(file)
      } else {
        file.newName = file.originalName
        file.status = 'pending'
        file.errorMessage = undefined
      }
    }
  }
}

const revertSelectedFiles = async () => {
  if (selectedIds.value.length === 0) return
  await revertFiles(selectedIds.value)
}

const deleteSelectedFiles = () => {
  if (selectedIds.value.length === 0) return
  removeFilesFromQueue(selectedIds.value)
}

const handleSelectionChange = (selection: { count: number; ids: string[] }) => {
  selectedCount.value = selection.count
  selectedIds.value = selection.ids
}

const runRenaming = async () => {
  const previewById = new Map(previewFiles.value.map((file) => [file.id, file]))
  const plans = files.value
    .map((sourceFile) => {
      const previewFile = previewById.get(sourceFile.id)
      if (!previewFile) return null
      return {
        source: sourceFile,
        nextName: previewFile.newName,
        targetPath: buildTargetPath(sourceFile.path, previewFile.newName)
      }
    })
    .filter((plan): plan is { source: FileItem; nextName: string; targetPath: string } => {
      return plan !== null && plan.source.originalName !== plan.nextName
    })

  if (plans.length === 0) return

  const pathSet = new Set<string>()
  const validPlans: typeof plans = []

  for (const plan of plans) {
    if (!isAbsoluteFilePath(plan.source.path)) {
      plan.source.status = 'error'
      plan.source.errorMessage = '源文件路径无效，请重新导入文件'
      continue
    }

    const sourceExists = await fsBridge.exists(plan.source.path)
    if (!sourceExists) {
      plan.source.status = 'error'
      plan.source.errorMessage = '源文件不存在，请重新导入文件'
      continue
    }

    const validationError = validateNewName(plan.nextName)
    if (validationError) {
      plan.source.status = 'error'
      plan.source.errorMessage = validationError
      continue
    }

    const normalizedTargetPath = plan.targetPath.toLowerCase()
    if (pathSet.has(normalizedTargetPath)) {
      plan.source.status = 'error'
      plan.source.errorMessage = '存在重复的目标文件名'
      continue
    }

    pathSet.add(normalizedTargetPath)
    validPlans.push(plan)
  }

  for (const plan of validPlans) {
    plan.source.status = 'pending'
    plan.source.errorMessage = undefined

    const previousPath = plan.source.path
    const previousName = plan.source.originalName

    const result = await fsBridge.rename(plan.source.path, plan.targetPath)
    if (result.success) {
      plan.source.path = plan.targetPath
      plan.source.originalName = plan.nextName
      plan.source.newName = plan.nextName
      plan.source.lastRenamedFromPath = previousPath
      plan.source.lastRenamedFromName = previousName
      plan.source.extension = getExtension(plan.nextName)
      plan.source.status = 'success'
      plan.source.errorMessage = undefined
    } else {
      plan.source.status = 'error'
      plan.source.errorMessage = result.error
    }
  }
}

onMounted(() => {
  if (theme.value === 'system') {
    systemThemeMedia.addEventListener('change', handleSystemThemeChange)
  }
  applyTheme(theme.value)
  applyBrandPreset(brandPreset.value)

  window.setTimeout(() => {
    void startOnboarding(false)
  }, 320)
})

onUnmounted(() => {
  systemThemeMedia.removeEventListener('change', handleSystemThemeChange)
})
</script>

<template>
  <div class="app-shell flex flex-col h-screen w-full bg-background text-foreground overflow-hidden font-sans select-none antialiased">
    <!-- 顶部操作栏 -->
    <ControlHeader 
      id="onboarding-header"
      :file-count="files.length"
      :selected-count="selectedCount"
      @show-settings="isSettingsOpen = true"
      @import-files="handleImportFiles"
      @import-paths="handleImportPaths"
      @clear-files="clearFiles"
      @run="runRenaming"
      @revert-files="revertSelectedFiles"
      @delete-files="deleteSelectedFiles"
      @start-guide="startOnboarding(true)"
    />

    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧工作流（流式中心 UI） -->
      <WorkflowSidebar 
        id="onboarding-workflow"
        :workflow="workflow"
        :line-style="lineStyle"
        :is-collapsed="isSidebarCollapsed"
        @add-action="addAction"
        @remove-action="removeAction"
        @move-action="moveAction"
        @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      />

      <!-- 右侧预览区域 -->
      <main
        id="onboarding-preview"
        :class="[
          'preview-stage flex-1 flex flex-col relative transition-all duration-300',
          isDragOverPreview && 'ring-2 ring-primary/40 ring-inset bg-primary/5',
        ]"
        @dragenter="handlePreviewDragEnter"
        @dragover="handlePreviewDragOver"
        @dragleave="handlePreviewDragLeave"
        @drop="handlePreviewDrop"
      >
        <div
          v-if="isDragOverPreview"
          class="pointer-events-none absolute inset-4 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/45 bg-primary/8 backdrop-blur-sm"
        >
          <div class="px-6 text-center">
            <p class="text-base font-black tracking-tight text-primary">{{ t('app.drag_import_title') }}</p>
            <p class="mt-1 text-xs font-medium text-muted-foreground">{{ t('app.drag_import_desc') }}</p>
          </div>
        </div>
        <RenamingTable :files="previewFiles" @remove-file="removeFileFromQueue" @remove-files="removeFilesFromQueue" @revert-file="revertFile" @revert-files="revertFiles" @selection-change="handleSelectionChange" />
      </main>
    </div>

    <!-- 全局设置中心 -->
    <SettingsDialog 
      v-model:open="isSettingsOpen" 
      v-model:theme="theme"
      v-model:brand-preset="brandPreset"
    />
  </div>
</template>

<style>
/* 核心平衡样式 */
body {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 隐藏滚动条但保留功能 */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* 过渡动画 */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.app-shell {
  background-image:
    radial-gradient(1200px 420px at 8% -15%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 62%),
    radial-gradient(980px 360px at 92% -10%, color-mix(in oklab, var(--info) 10%, transparent), transparent 66%);
}

.preview-stage {
  background-color: color-mix(in oklab, var(--background) 88%, var(--muted) 12%);
}

.driver-overlay {
  background: rgba(15, 23, 42, 0.38) !important;
}

.driver-popover {
  background-color: var(--popover);
  color: var(--popover-foreground);
  border-radius: 14px;
  border: 1px solid color-mix(in oklab, var(--border) 72%, transparent);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.16);
}

.driver-popover-title {
  font-weight: 800;
  color: var(--popover-foreground);
}

.driver-popover-description {
  color: color-mix(in oklab, var(--foreground) 76%, transparent);
  line-height: 1.45;
}

.driver-popover-close-btn {
  color: color-mix(in oklab, var(--foreground) 46%, transparent);
}

.driver-popover-close-btn:hover,
.driver-popover-close-btn:focus {
  color: var(--foreground);
}

.driver-popover-progress-text {
  color: color-mix(in oklab, var(--foreground) 62%, transparent);
}

.driver-popover-footer button {
  text-shadow: none;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--card) 92%, transparent);
  color: var(--foreground);
  transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.driver-popover-footer button:hover,
.driver-popover-footer button:focus {
  background: color-mix(in oklab, var(--accent) 82%, var(--card));
}

.driver-popover-next-btn {
  border-color: color-mix(in oklab, var(--primary) 36%, transparent) !important;
  background: color-mix(in oklab, var(--primary) 90%, white) !important;
  color: var(--primary-foreground) !important;
}

.driver-popover-next-btn:hover,
.driver-popover-next-btn:focus {
  background: color-mix(in oklab, var(--primary) 78%, black) !important;
}

.driver-popover-arrow {
  border-color: var(--popover);
}

.dark .driver-overlay {
  background: rgba(2, 6, 23, 0.68) !important;
}

.dark .driver-popover {
  border-color: color-mix(in oklab, var(--border) 84%, transparent);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.48);
}

.dark .driver-popover-footer button {
  background: color-mix(in oklab, var(--card) 88%, black);
  color: var(--foreground);
}

.dark .driver-popover-next-btn {
  background: color-mix(in oklab, var(--primary) 82%, black) !important;
}

@media (prefers-reduced-motion: reduce) {
  .app-shell {
    background-image: none;
  }
}
</style>
