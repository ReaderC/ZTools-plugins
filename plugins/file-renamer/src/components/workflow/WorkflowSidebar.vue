<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { registry } from '@/core/registry'
import type { ActionInstance } from '@/core/types'
import ActionCard from './ActionCard.vue'
import { FRButton, FRTooltip } from '@/components/ui'
import { Plus, Settings2, PanelLeftClose, PanelLeftOpen, Zap } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import RulePickerPanel from './RulePickerPanel.vue'
import { ref } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  workflow: ActionInstance[]
  lineStyle: 'solid' | 'dashed' | 'none'
  isCollapsed: boolean
}>()

const emit = defineEmits<{
  (e: 'add-action', pluginId: string): void
  (e: 'remove-action', index: number): void
  (e: 'toggle-collapse'): void
}>()

const showRulePicker = ref(false)
</script>

<template>
  <aside 
    :class="cn(
      'flex flex-col border-r bg-background/50 backdrop-blur-xl h-full shadow-2xl relative z-10 transition-all duration-300',
      isCollapsed ? 'w-20' : 'w-[280px]'
    )"
  >
    <!-- Header -->
    <div :class="cn('p-4 border-b flex items-center bg-background/80 transition-all', isCollapsed ? 'justify-center' : 'justify-between')">
      <div v-if="!isCollapsed" class="flex items-center gap-2 overflow-hidden">
        <div class="p-1.5 bg-primary rounded-lg text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
          <Settings2 class="w-4 h-4" />
        </div>
        <h2 class="text-sm font-black tracking-tight truncate">{{ t('app.workflow') }}</h2>
      </div>
      
      <FRTooltip :content="isCollapsed ? t('workflow.expand') : t('workflow.collapse')">
        <FRButton 
          variant="ghost" 
          size="icon" 
          class="h-8 w-8 text-muted-foreground transition-transform" 
          @click="$emit('toggle-collapse')"
        >
          <PanelLeftClose v-if="!isCollapsed" class="w-4 h-4" />
          <PanelLeftOpen v-else class="w-4 h-4" />
        </FRButton>
      </FRTooltip>
    </div>

    <!-- Workflow List -->
    <div class="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-2">
      <div v-if="workflow.length === 0 && !isCollapsed" class="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
        <Plus class="w-6 h-6 mb-2" />
        <p class="text-[10px] font-medium">{{ t('app.no_rules') }}</p>
      </div>
      
      <div class="flex flex-col items-center gap-1">
        <ActionCard 
          v-for="(action, index) in workflow" 
          :key="action.instanceId"
          :action="action"
          :index="index"
          :total="workflow.length"
          :line-style="lineStyle"
          :is-collapsed="isCollapsed"
          @remove="$emit('remove-action', $event)"
        />
      </div>
    </div>

    <!-- Add Action Button -->
    <div class="p-4 border-t bg-background/80 relative">
      <RulePickerPanel 
        v-if="showRulePicker"
        :hide-title="isCollapsed"
        @select="$emit('add-action', $event)"
        @close="showRulePicker = false"
      />
      
      <FRButton 
        v-if="!isCollapsed"
        variant="outline"
        class="w-full justify-center gap-2 h-10 rounded-xl border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary transition-all active:scale-95 group"
        @click="showRulePicker = !showRulePicker"
      >
        <Plus :class="cn('w-4 h-4 transition-transform duration-300', showRulePicker && 'rotate-45')" />
        <span class="text-xs font-black uppercase tracking-tight">{{ t('workflow.add_rule') }}</span>
      </FRButton>
      <div v-else class="flex justify-center">
         <FRTooltip :content="t('workflow.add_rule')" side="right" content-class="whitespace-nowrap">
           <FRButton 
            variant="outline"
            size="icon"
            class="h-10 w-10 border-dashed border-primary/30 hover:border-primary text-primary rounded-xl"
            @click="showRulePicker = !showRulePicker"
          >
             <Plus :class="cn('w-5 h-5 transition-transform duration-300', showRulePicker && 'rotate-45')" />
           </FRButton>
         </FRTooltip>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
