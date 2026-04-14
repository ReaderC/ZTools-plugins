<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FRButton, FRTooltip } from '@/components/ui'
import { FilePlus2, Trash2, Settings, Play, Undo2 } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{
  fileCount: number
  selectedCount: number
}>()

const emit = defineEmits<{
  (e: 'show-settings'): void
  (e: 'import-files', files: FileList): void
  (e: 'import-paths', filePaths: string[]): void
  (e: 'clear-files'): void
  (e: 'run'): void
  (e: 'revert-files'): void
  (e: 'delete-files'): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerImport() {
  if (typeof window.ztools?.showOpenDialog === 'function') {
    const selectedPaths = window.ztools.showOpenDialog({
      title: t('app.import_files'),
      properties: ['openFile', 'multiSelections']
    })

    if (selectedPaths?.length) {
      emit('import-paths', selectedPaths)
      return
    }
  }

  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    emit('import-files', input.files)
    input.value = ''
  }
}
</script>

<template>
  <header
    class="h-14 px-4 flex justify-between items-center bg-background/78 backdrop-blur-md border-b border-border/80 sticky top-0 z-40 transition-all">
    <div class="flex items-center gap-3">
      <div class="flex gap-1.5">
        <FRTooltip :content="t('app.import_files')">
          <button
            type="button"
            class="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold h-9 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/20 gap-2 active:scale-95"
            @click="triggerImport"
          >
            <FilePlus2 class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('app.import_files') }}</span>
          </button>
        </FRTooltip>
        <input ref="fileInputRef" type="file" multiple class="hidden" @change="onFileChange" />

        <FRTooltip :content="t('app.clear_all')">
          <FRButton variant="outline" size="sm" class="gap-1.5 h-9 px-3 rounded-lg" @click="$emit('clear-files')">
            <Trash2 class="w-3.5 h-3.5 opacity-70" />
            <span class="hidden sm:inline">{{ t('app.clear_all') }}</span>
          </FRButton>
        </FRTooltip>
      </div>

      <div class="h-4 w-px bg-border mx-1"></div>

      <FRTooltip :content="t('app.settings')">
        <FRButton variant="ghost" size="icon" class="rounded-full h-8 w-8 text-muted-foreground"
          @click="$emit('show-settings')">
          <Settings class="w-4 h-4" />
        </FRButton>
      </FRTooltip>
    </div>

    <div class="flex items-center gap-2">
      <FRButton
        class="gap-2 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-black h-9 text-xs transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
        :disabled="fileCount === 0" @click="$emit('run')">
        <Play class="w-4 h-4 fill-current" />
        <span>{{ t('app.start_rename') }}</span>
      </FRButton>
      <FRButton
        class="gap-1.5 rounded-lg border border-warning/35 bg-warning-soft hover:bg-warning-soft/80 text-warning-foreground font-semibold h-9 text-xs transition-all disabled:opacity-30 disabled:grayscale"
        :disabled="selectedCount === 0" @click="$emit('revert-files')">
        <Undo2 class="w-3.5 h-3.5" />
        <span>{{ t('table.revert_selected') }}</span>
      </FRButton>
      <FRButton
        class="gap-1.5 rounded-lg border border-destructive/35 bg-destructive/10 hover:bg-destructive/16 text-destructive font-semibold h-9 text-xs transition-all disabled:opacity-30 disabled:grayscale"
        :disabled="selectedCount === 0" @click="$emit('delete-files')">
        <Trash2 class="w-3.5 h-3.5" />
        <span>{{ t('table.delete_selected') }}</span>
      </FRButton>

    </div>
  </header>
</template>
