<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DiffWorkbench from '@/components/layout/DiffWorkbench.vue'
import TextDiffView from '@/components/diff-views/TextDiffView.vue'
import ImageDiffView from '@/components/diff-views/ImageDiffView.vue'
import ExcelDiffView from '@/components/diff-views/ExcelDiffView.vue'
import WordDiffView from '@/components/diff-views/WordDiffView.vue'
import PdfDiffView from '@/components/diff-views/PdfDiffView.vue'

const currentMode = ref('text')

onMounted(() => {
  if (window.ztools) {
    window.ztools.onPluginEnter((action) => {
      // Handle any specific enter actions
      console.log('Entered diff plugin with action:', action)
      
      const code = action.code
      if (code === 'diff-text') {
        currentMode.value = 'text'
      } else if (code === 'diff-image') {
        currentMode.value = 'image'
      } else if (code === 'diff-excel') {
        currentMode.value = 'excel'
      } else if (code === 'diff-word') {
        currentMode.value = 'word'
      } else if (code === 'diff-pdf') {
        currentMode.value = 'pdf'
      } else {
        currentMode.value = 'text'
      }
    })
    window.ztools.onPluginOut(() => {
      // Handle plugin exit
    })
  }
})
</script>

<template>
  <DiffWorkbench :initial-mode="currentMode">
    <template #text>
      <TextDiffView />
    </template>
    <template #image>
      <ImageDiffView />
    </template>
    <template #excel>
      <ExcelDiffView />
    </template>
    <template #word>
      <WordDiffView />
    </template>
    <template #pdf>
      <PdfDiffView />
    </template>
  </DiffWorkbench>
</template>

<style>
/* Global styles handled by main.css / tailwind */
</style>
