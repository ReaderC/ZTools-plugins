<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { TextDiffStrategy } from '@/core/diff/text/myers'
import { DiffChunk } from '@/core/diff/types'
import { useI18n } from '@/i18n'
import Select from '@/components/ui/Select.vue'

const { t } = useI18n()

const originalText = ref('')
const modifiedText = ref('')
const autoFormat = ref(true)
const selectedLang = ref('auto')

const langOptions = computed(() => [
    { label: t('autoDetect'), value: 'auto' },
    { label: 'JSON', value: 'json' },
    { label: 'YAML', value: 'yaml' },
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Python', value: 'python' },
    { label: 'C', value: 'c' },
    { label: 'C++', value: 'cpp' },
    { label: 'Java', value: 'java' },
    { label: 'Rust', value: 'rust' },
    { label: 'Go', value: 'go' },
    { label: 'SQL', value: 'sql' },
    { label: 'Markdown', value: 'markdown' },
    { label: 'Shell', value: 'shell' },
])

const diffStrategy = new TextDiffStrategy()
const diffChunks = ref<DiffChunk[]>([])

watch([originalText, modifiedText], ([orig, mod]) => {
    const result = diffStrategy.compute(orig, mod)
    diffChunks.value = result.chunks
}, { immediate: true })

// Compute line arrays mapped strictly to text inputs splitting by \n
const originalLineArr = computed(() => originalText.value === '' ? [] : originalText.value.split('\n'))
const modifiedLineArr = computed(() => modifiedText.value === '' ? [] : modifiedText.value.split('\n'))

// Left lines highlight state
const leftLinesState = computed(() => {
    const states: string[] = []
    for (const chunk of diffChunks.value) {
        if (chunk.type === 'equal') states.push('equal')
        else if (chunk.type === 'delete') states.push('delete')
    }
    return states
})

// Right lines highlight state
const rightLinesState = computed(() => {
    const states: string[] = []
    for (const chunk of diffChunks.value) {
        if (chunk.type === 'equal') states.push('equal')
        else if (chunk.type === 'insert') states.push('insert')
    }
    return states
})

const addedCount = computed(() => diffChunks.value.filter(c => c.type === 'insert').length)
const removedCount = computed(() => diffChunks.value.filter(c => c.type === 'delete').length)

// Sync scrolling
const leftBack = ref<HTMLElement | null>(null)
const rightBack = ref<HTMLElement | null>(null)

const onLeftScroll = (e: Event) => {
    if (!leftBack.value) return
    const target = e.target as HTMLTextAreaElement
    leftBack.value.scrollTop = target.scrollTop
    leftBack.value.scrollLeft = target.scrollLeft
}

const onRightScroll = (e: Event) => {
    if (!rightBack.value) return
    const target = e.target as HTMLTextAreaElement
    rightBack.value.scrollTop = target.scrollTop
    rightBack.value.scrollLeft = target.scrollLeft
}
</script>

<template>
    <div class="flex flex-col h-full gap-4">
        <!-- Toolbar -->
        <div
            class="flex justify-between items-center px-4 py-2 bg-[var(--color-background)] shadow-sm rounded-lg border border-[var(--color-border)]">
            <div class="flex gap-6 items-center">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-[var(--color-secondary)]">{{ t('language') }}</span>
                    <Select v-model="selectedLang" :options="langOptions" />
                </div>
            </div>
            <div class="text-sm font-mono font-bold text-[var(--color-cta)] px-2">
                {{ t('diffCount', { added: addedCount, removed: removedCount }) }}
            </div>
        </div>

        <!-- WYSIWYG Diff Editors -->
        <div class="grid grid-cols-2 gap-4 flex-1 min-h-[400px]">

            <!-- Original Panel -->
            <div
                class="flex flex-col h-full rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm focus-within:ring-2 ring-[var(--color-cta)] transition-all bg-[var(--color-background)]">
                <div
                    class="bg-[var(--color-background)] px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border-b border-[var(--color-border)] text-[var(--color-secondary)]">
                    {{ t('original') }}
                </div>
                <div class="relative flex-1 overflow-hidden group w-full h-full flex mt-0">
                    <!-- Diff Highlights Backdrop -->
                    <div ref="leftBack" class="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        <div class="p-4 pb-16 font-mono text-sm leading-6 whitespace-pre inline-block min-w-full">
                            <div v-for="(line, i) in originalLineArr" :key="'l-' + i"
                                :class="[leftLinesState[i] === 'delete' ? 'bg-[var(--color-delete-bg)] text-[var(--color-delete-text)]' : '', 'w-full']"
                                style="min-height: 1.5rem;">
                                <span class="text-transparent selection:bg-transparent">{{ line === '' ? ' ' : line
                                }}</span>
                            </div>
                            <div v-if="originalLineArr.length === 0" style="min-height: 1.5rem;"></div>
                        </div>
                    </div>
                    <!-- Editable Textarea -->
                    <textarea v-model="originalText" @scroll="onLeftScroll"
                        class="relative block w-full h-full bg-transparent text-[var(--color-text)] caret-[var(--color-text)] p-4 pb-16 font-mono text-sm leading-6 resize-none outline-none z-10 whitespace-pre"
                        wrap="off" spellcheck="false" :placeholder="t('pasteOriginal')">
          </textarea>
                </div>
            </div>

            <!-- Modified Panel -->
            <div
                class="flex flex-col h-full rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm focus-within:ring-2 ring-[var(--color-cta)] transition-all bg-[var(--color-background)]">
                <div
                    class="bg-[var(--color-background)] px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border-b border-[var(--color-border)] text-[var(--color-secondary)]">
                    {{ t('modified') }}
                </div>
                <div class="relative flex-1 overflow-hidden group w-full h-full flex mt-0">
                    <!-- Diff Highlights Backdrop -->
                    <div ref="rightBack" class="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        <div class="p-4 pb-16 font-mono text-sm leading-6 whitespace-pre inline-block min-w-full">
                            <div v-for="(line, i) in modifiedLineArr" :key="'r-' + i"
                                :class="[rightLinesState[i] === 'insert' ? 'bg-[var(--color-insert-bg)] text-[var(--color-insert-text)]' : '', 'w-full']"
                                style="min-height: 1.5rem;">
                                <span class="text-transparent selection:bg-transparent">{{ line === '' ? ' ' : line
                                }}</span>
                            </div>
                            <div v-if="modifiedLineArr.length === 0" style="min-height: 1.5rem;"></div>
                        </div>
                    </div>
                    <!-- Editable Textarea -->
                    <textarea v-model="modifiedText" @scroll="onRightScroll"
                        class="relative block w-full h-full bg-transparent text-[var(--color-text)] caret-[var(--color-text)] p-4 pb-16 font-mono text-sm leading-6 resize-none outline-none z-10 whitespace-pre"
                        wrap="off" spellcheck="false" :placeholder="t('pasteModified')">
          </textarea>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped lang="scss">
/* Ensure the textarea doesn't hide the background highlights underneath */
textarea {
    color: inherit;
    /* will use var(--color-text) */
    background: transparent;

    /* Scroller styling for textarea without transparent track */
    &::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(128, 128, 128, 0.1);
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: var(--color-border);
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: content-box;
    }

    &:focus::-webkit-scrollbar-thumb {
        background-color: var(--color-cta);
    }
}
</style>
