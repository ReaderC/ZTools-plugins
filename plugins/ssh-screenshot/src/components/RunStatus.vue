<script setup>
import { ref, onMounted } from 'vue'
import { useConfig } from '@/composables/useConfig'

const props = defineProps({
  // ZTools onPluginEnter param: { code, type, payload, ... }
  entry: { type: Object, default: null }
})

const { snapshot, isComplete } = useConfig()
const phase = ref('init') // init | reading | uploading | pasting | done | error
const message = ref('准备中…')
const detail = ref('')
const error = ref(null)

const emit = defineEmits(['need-config'])

function isImgEntry(entry) {
  if (!entry) return false
  if (entry.type === 'img') return true
  if (typeof entry.payload === 'string' && entry.payload.startsWith('data:image')) return true
  return false
}

async function findLatestImagePath() {
  const cb = window.ztools?.clipboard
  if (!cb) throw new Error('window.ztools.clipboard 不可用')
  const { items = [] } = await cb.getHistory(1, 20)
  const img = items.find((it) => it.type === 'image' && it.imagePath)
  if (!img) {
    throw new Error('剪贴板历史里没有图片，请先截图或复制图片再触发，或直接把图片粘贴到 ZTools 搜索框')
  }
  return img.imagePath
}

async function run() {
  try {
    if (!isComplete()) {
      emit('need-config')
      return
    }
    if (!window.sshShot) throw new Error('preload 未加载')

    const cfg = snapshot()
    let r

    if (isImgEntry(props.entry)) {
      phase.value = 'uploading'
      message.value = '上传搜索框粘贴的截图到远端…'
      detail.value = '来源：搜索框粘贴的图片'
      r = await window.sshShot.uploadDataUrl(cfg, props.entry.payload)
    } else {
      phase.value = 'reading'
      message.value = '读取剪贴板里的截图…'
      const localPath = await findLatestImagePath()
      detail.value = `本地：${localPath}`
      phase.value = 'uploading'
      message.value = '上传到远端…'
      r = await window.sshShot.uploadFile(cfg, localPath)
    }

    detail.value = `远端：${r.remotePath}`
    const shouldPaste = props.entry?.code !== 'copy-screenshot-path'
    phase.value = 'pasting'
    message.value = shouldPaste ? '写入剪贴板并粘贴远端路径…' : '写入剪贴板…'
    await window.ztools.clipboard.writeContent({ type: 'text', content: r.remotePath }, shouldPaste)

    phase.value = 'done'
    message.value = shouldPaste ? '完成（已粘贴）' : '完成（已复制路径）'

    setTimeout(() => window.ztools?.outPlugin?.(), 600)
  } catch (e) {
    phase.value = 'error'
    error.value = e?.message || String(e)
    message.value = '失败'
  }
}

onMounted(run)

function retry() { error.value = null; run() }
function openConfig() { emit('need-config') }
</script>

<template>
  <div class="card">
    <h2 style="margin-top:0">{{ message }}</h2>
    <p v-if="detail" style="color: var(--muted)">{{ detail }}</p>

    <div v-if="phase === 'error'">
      <p style="color: var(--danger); white-space: pre-wrap">{{ error }}</p>
      <div style="display:flex;gap:8px">
        <button class="primary" @click="retry">重试</button>
        <button @click="openConfig">打开配置</button>
      </div>
    </div>

    <div v-else-if="phase !== 'done'" style="color:var(--muted)">
      <span>请稍候…</span>
    </div>
  </div>
</template>
