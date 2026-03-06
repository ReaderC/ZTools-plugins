<script setup lang="ts">
import { onMounted } from 'vue'
import DiffWorkbench from '@/components/layout/DiffWorkbench.vue'
import TextDiffView from '@/components/diff-views/TextDiffView.vue'
import ImageDiffView from '@/components/diff-views/ImageDiffView.vue'

onMounted(() => {
  if (window.ztools) {
    window.ztools.onPluginEnter((action) => {
      // Handle any specific enter actions
      console.log('Entered diff plugin with action:', action)
    })
    window.ztools.onPluginOut(() => {
      // Handle plugin exit
    })
  }
})
</script>

<template>
  <DiffWorkbench>
    <template #text>
      <TextDiffView />
    </template>
    <template #image>
      <ImageDiffView />
    </template>
  </DiffWorkbench>
</template>

<style>
/* Global styles handled by main.css / tailwind */
</style>
