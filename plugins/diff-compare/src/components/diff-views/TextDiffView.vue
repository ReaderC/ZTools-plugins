<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { TextDiffStrategy } from "@/core/diff/text/text.ts";
import { DiffResult } from "@/core/diff/types";
import { useI18n } from "vue-i18n";
import ZSelect from "@/components/ui/base/ZSelect.vue";
import ZTooltip from "@/components/ui/base/ZTooltip.vue";
import ZButton from "@/components/ui/base/ZButton.vue";
import ZBadge from "@/components/ui/base/ZBadge.vue";
import { formatCode, detectLanguage } from "@/utils/formatter";
import { useSettingsStore } from "@/store/settings";
import { storeToRefs } from "pinia";

const { t } = useI18n();
const settingsStore = useSettingsStore();
const { autoFormat } = storeToRefs(settingsStore);

const sourceText = ref("");
const targetText = ref("");
const selectedLang = ref("auto");
const textViewMode = ref<"split" | "unified">("split");

const swapTexts = () => {
  const temp = sourceText.value;
  sourceText.value = targetText.value;
  targetText.value = temp;
};

const langOptions = computed(() => [
  { label: t("autoDetect"), value: "auto" },
  { label: "JSON", value: "json" },
  { label: "YAML", value: "yaml" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
  { label: "Java", value: "java" },
  { label: "Rust", value: "rust" },
  { label: "Go", value: "go" },
  { label: "SQL", value: "sql" },
  { label: "Markdown", value: "markdown" },
  { label: "Shell", value: "shell" },
]);

const sourceLang = computed(() => {
  if (selectedLang.value !== "auto") return selectedLang.value;
  return detectLanguage(sourceText.value);
});

const targetLang = computed(() => {
  if (selectedLang.value !== "auto") return selectedLang.value;
  return detectLanguage(targetText.value);
});

const getLangLabel = (langValue: string) => {
  const opt = langOptions.value.find(
    (o) => o.value === langValue.toLowerCase(),
  );
  return opt ? opt.label : langValue.toUpperCase() || "Text";
};

const sourceLangLabel = computed(() => getLangLabel(sourceLang.value));
const targetLangLabel = computed(() => getLangLabel(targetLang.value));

const diffStrategy = new TextDiffStrategy();
const diffResult = ref<DiffResult<string>[]>([]);
const diffChunks = computed(() => diffResult.value);
const isDiffing = ref(false);

let diffWorker: Worker | null = null;
let currentRequestId = 0;
let debounceTimer: any = null;

watch(
  [sourceText, targetText],
  ([source, target]) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (!diffWorker) {
        diffWorker = new Worker(
          new URL("../../core/diff/diff.worker.ts", import.meta.url),
          { type: "module" },
        );
        diffWorker.onmessage = (e) => {
          const { requestId, result, error } = e.data;
          if (requestId === currentRequestId) {
            if (!error) {
              diffResult.value = result;
            }
            isDiffing.value = false;
          }
        };
      }

      isDiffing.value = true;
      const requestId = ++currentRequestId;
      const sourceLines = source === '' ? [] : source.split('\n');
      const targetLines = target === '' ? [] : target.split('\n');
      diffWorker.postMessage({
        type: "text",
        source: sourceLines,
        target: targetLines,
        requestId,
      });
    }, 300); // 300ms debounce
  },
  { immediate: true },
);

onUnmounted(() => {
  if (diffWorker) {
    diffWorker.terminate();
    diffWorker = null;
  }
});

// Compute line arrays mapped strictly to text inputs splitting by \n
const sourceLineArr = computed(() =>
  sourceText.value === "" ? [] : sourceText.value.split("\n"),
);
const targetLineArr = computed(() =>
  targetText.value === "" ? [] : targetText.value.split("\n"),
);

// Left lines highlight state
const leftLinesState = computed(() => {
  const states: { type: string }[] = [];
  for (const chunk of diffChunks.value) {
    if (chunk.type === "equal") states.push({ type: "equal" });
    else if (chunk.type === "delete") states.push({ type: "delete" });
    else if (chunk.type === "modify") states.push({ type: "delete" });
  }
  return states;
});

// Right lines highlight state
const rightLinesState = computed(() => {
  const states: { type: string }[] = [];
  for (const chunk of diffChunks.value) {
    if (chunk.type === "equal") states.push({ type: "equal" });
    else if (chunk.type === "insert") states.push({ type: "insert" });
    else if (chunk.type === "modify") states.push({ type: "insert" });
  }
  return states;
});

const addedCount = computed(
  () => diffChunks.value.filter((c) => c.type === "insert" || c.type === "modify").length,
);
const removedCount = computed(
  () => diffChunks.value.filter((c) => c.type === "delete" || c.type === "modify").length,
);

// Unified view lines
const unifiedDiffLines = computed(() => {
  const lines: {
    type: string;
    value: string;
    leftNo?: number;
    rightNo?: number;
  }[] = [];
  let leftCount = 1;
  let rightCount = 1;

  for (const chunk of diffChunks.value) {
    if (chunk.type === "equal") {
      lines.push({
        type: "equal",
        value: chunk.source || "",
        leftNo: leftCount++,
        rightNo: rightCount++,
      });
    } else if (chunk.type === "delete") {
      lines.push({ type: "delete", value: chunk.source || "", leftNo: leftCount++ });
    } else if (chunk.type === "insert") {
      lines.push({ type: "insert", value: chunk.target || "", rightNo: rightCount++ });
    } else if (chunk.type === "modify") {
      lines.push({
        type: "delete",
        value: chunk.source || "",
        leftNo: leftCount++,
      });
      lines.push({
        type: "insert",
        value: chunk.target || "",
        rightNo: rightCount++,
      });
    }
  }
  return lines;
});

// Sync scrolling
const leftBack = ref<HTMLElement | null>(null);
const rightBack = ref<HTMLElement | null>(null);
const leftLineNumbers = ref<HTMLElement | null>(null);
const rightLineNumbers = ref<HTMLElement | null>(null);

const onLeftScroll = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  if (leftBack.value) {
    leftBack.value.scrollTop = target.scrollTop;
    leftBack.value.scrollLeft = target.scrollLeft;
  }
  if (leftLineNumbers.value) {
    leftLineNumbers.value.scrollTop = target.scrollTop;
  }
};

const onRightScroll = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  if (rightBack.value) {
    rightBack.value.scrollTop = target.scrollTop;
    rightBack.value.scrollLeft = target.scrollLeft;
  }
  if (rightLineNumbers.value) {
    rightLineNumbers.value.scrollTop = target.scrollTop;
  }
};

// Navigation
const changeIndices = computed(() => {
  const indices: number[] = [];
  diffChunks.value.forEach((chunk, i) => {
    if (chunk.type !== "equal") indices.push(i);
  });
  return indices;
});

const currentChangeIdx = ref(-1);

const leftTextarea = ref<HTMLTextAreaElement | null>(null);
const rightTextarea = ref<HTMLTextAreaElement | null>(null);

const goToChange = (dir: "next" | "prev") => {
  if (changeIndices.value.length === 0) return;

  if (dir === "next") {
    currentChangeIdx.value =
      (currentChangeIdx.value + 1) % changeIndices.value.length;
  } else {
    currentChangeIdx.value =
      (currentChangeIdx.value - 1 + changeIndices.value.length) %
      changeIndices.value.length;
  }

  const chunkIdx = changeIndices.value[currentChangeIdx.value];

  // Find the line number for this chunk start
  let leftLine = 0;
  let rightLine = 0;
  for (let i = 0; i < chunkIdx; i++) {
    const c = diffChunks.value[i];
    if (c.type === "equal" || c.type === "delete" || c.type === "modify") {
      leftLine += 1;
    }
    if (c.type === "equal" || c.type === "insert" || c.type === "modify") {
      rightLine += 1;
    }
  }

  const lineHeight = 24; // approximate
  if (leftTextarea.value)
    leftTextarea.value.scrollTop = leftLine * lineHeight - 100;
  if (rightTextarea.value)
    rightTextarea.value.scrollTop = rightLine * lineHeight - 100;
};

// Debounce timers
let sourceTimer: any = null;
let targetTimer: any = null;

const performAutoFormat = (side: "source" | "target") => {
  if (!autoFormat.value) return;

  if (side === "source") {
    const formatted = formatCode(sourceText.value, selectedLang.value);
    if (formatted !== sourceText.value) sourceText.value = formatted;
  } else {
    const formatted = formatCode(targetText.value, selectedLang.value);
    if (formatted !== targetText.value) targetText.value = formatted;
  }
};

// Watchers for debounced auto-format
watch(sourceText, () => {
  clearTimeout(sourceTimer);
  if (!autoFormat.value) return;
  sourceTimer = setTimeout(() => performAutoFormat("source"), 1000);
});

watch(targetText, () => {
  clearTimeout(targetTimer);
  if (!autoFormat.value) return;
  targetTimer = setTimeout(() => performAutoFormat("target"), 1000);
});

const handlePaste = (side: "source" | "target") => {
  if (!autoFormat.value) return;
  // Immediate format on paste
  setTimeout(() => performAutoFormat(side), 10);
};
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- Toolbar -->
    <div
      class="h-14 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-5 flex-shrink-0 z-30 shadow-sm relative w-full">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <ZBadge variant="surface" size="lg">{{ t("language") }}</ZBadge>
          <ZSelect v-model="selectedLang" :options="langOptions" class="min-w-[120px]" />
        </div>

        <div class="h-4 w-px bg-[var(--color-border)] mx-1"></div>

        <div class="flex bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] p-1 shadow-sm gap-1">
          <ZButton :variant="textViewMode === 'split' ? 'primary' : 'surface'" size="sm" @click="textViewMode = 'split'"
            class="!rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            {{ t("viewSplit") }}
          </ZButton>
          <ZButton :variant="textViewMode === 'unified' ? 'primary' : 'surface'" size="sm"
            @click="textViewMode = 'unified'" class="!rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            </svg>
            {{ t("viewUnified") }}
          </ZButton>
        </div>

        <div class="h-4 w-px bg-[var(--color-border)] mx-1"></div>

        <div class="flex gap-1">
          <ZTooltip :content="t('prevChange')">
            <ZButton variant="ghost" size="icon-sm" @click="goToChange('prev')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </ZButton>
          </ZTooltip>
          <ZTooltip :content="t('nextChange')">
            <ZButton variant="ghost" size="icon-sm" @click="goToChange('next')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </ZButton>
          </ZTooltip>
        </div>

        <ZTooltip :content="t('swapText')">
          <ZButton variant="ghost" size="icon-sm" @click="swapTexts">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m16 3 4 4-4 4" />
              <path d="M20 7H9a4 4 0 1 0 0 8h1" />
              <path d="m8 21-4-4 4-4" />
              <path d="M4 17h11a4 4 0 1 0 0-8h-1" />
            </svg>
          </ZButton>
        </ZTooltip>
      </div>

      <div class="flex gap-4 items-center">
        <div v-if="isDiffing" class="flex items-center">
          <ZBadge variant="primary" dot pulse size="lg">
            {{ t("computing") || "Computing" }}
          </ZBadge>
        </div>
        <div class="flex gap-2">
          <ZBadge variant="success" size="lg">+{{ addedCount }}</ZBadge>
          <ZBadge variant="danger" size="lg">-{{ removedCount }}</ZBadge>
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-[400px] overflow-hidden">
      <!-- SPLIT MODE -->
      <div v-if="textViewMode === 'split'" class="grid grid-cols-2 gap-4 h-full">
        <!-- Source Panel -->
        <div
          class="flex flex-col h-full rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm focus-within:ring-2 transition-all bg-[var(--color-background)]">
          <div
            class="bg-[var(--color-background)] px-3 py-2 border-b border-[var(--color-border)] flex justify-between items-center h-10">
            <div class="flex items-center gap-2">
              <ZBadge variant="surface" size="lg">
                <template #default>
                  <div class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                      class="opacity-70">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    {{ t("source") }}
                  </div>
                </template>
              </ZBadge>
            </div>
            <ZBadge variant="primary" dot pulse size="lg">
              {{ sourceLangLabel }}
            </ZBadge>
          </div>
          <div class="relative flex-1 overflow-hidden group w-full h-full flex mt-0">
            <!-- Line Numbers -->
            <div
              class="w-10 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-shrink-0 flex flex-col font-mono text-[10px] text-[var(--color-secondary)] opacity-40 select-none pt-4 pb-16 leading-6 text-right px-2"
              ref="leftLineNumbers">
              <div v-for="(_, i) in sourceLineArr" :key="'ln-l-' + i">
                {{ i + 1 }}
              </div>
            </div>

            <!-- Diff Highlights Backdrop -->
            <div ref="leftBack" class="absolute inset-x-10 inset-y-0 overflow-hidden pointer-events-none z-0">
              <div class="p-4 py-4 pb-16 font-mono text-sm leading-6 whitespace-pre inline-block min-w-full">
                <div v-for="(line, i) in sourceLineArr" :key="'l-' + i" :class="[
                  leftLinesState[i]?.type === 'delete'
                    ? 'bg-[var(--color-delete-bg)] text-[var(--color-delete-text)]'
                    : '',
                  'w-full',
                ]" style="min-height: 1.5rem">
                  <span class="text-transparent selection:bg-transparent">{{
                    line === "" ? " " : line
                  }}</span>
                </div>
                <div v-if="sourceLineArr.length === 0" style="min-height: 1.5rem"></div>
              </div>
            </div>
            <!-- Editable Textarea -->
            <textarea ref="leftTextarea" v-model="sourceText" @scroll="onLeftScroll" @paste="handlePaste('source')"
              class="relative block w-full h-full bg-transparent text-[var(--color-text)] caret-[var(--color-text)] p-4 py-4 pb-16 font-mono text-sm leading-6 resize-none outline-none z-10 whitespace-pre"
              wrap="off" spellcheck="false" :placeholder="t('pasteSource')">
  </textarea>
          </div>
        </div>

        <!-- Target Panel -->
        <div
          class="flex flex-col h-full rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm focus-within:ring-2 transition-all bg-[var(--color-background)]">
          <div
            class="bg-[var(--color-background)] px-3 py-2 border-b border-[var(--color-border)] flex justify-between items-center h-10">
            <div class="flex items-center gap-2">
              <ZBadge variant="surface" size="lg">
                <template #default>
                  <div class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                      class="opacity-70">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    {{ t("target") }}
                  </div>
                </template>
              </ZBadge>
            </div>
            <ZBadge variant="primary" dot pulse size="lg">
              {{ targetLangLabel }}
            </ZBadge>
          </div>
          <div class="relative flex-1 overflow-hidden group w-full h-full flex mt-0">
            <!-- Line Numbers -->
            <div
              class="w-10 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-shrink-0 flex flex-col font-mono text-[10px] text-[var(--color-secondary)] opacity-40 select-none pt-4 pb-16 leading-6 text-right px-2"
              ref="rightLineNumbers">
              <div v-for="(_, i) in targetLineArr" :key="'ln-r-' + i">
                {{ i + 1 }}
              </div>
            </div>

            <!-- Diff Highlights Backdrop -->
            <div ref="rightBack" class="absolute inset-x-10 inset-y-0 overflow-hidden pointer-events-none z-0">
              <div class="p-4 py-4 pb-16 font-mono text-sm leading-6 whitespace-pre inline-block min-w-full">
                <div v-for="(line, i) in targetLineArr" :key="'r-' + i" :class="[
                  rightLinesState[i]?.type === 'insert'
                    ? 'bg-[var(--color-insert-bg)] text-[var(--color-insert-text)]'
                    : '',
                  'w-full',
                ]" style="min-height: 1.5rem">
                  <span class="text-transparent selection:bg-transparent">{{
                    line === "" ? " " : line
                  }}</span>
                </div>
                <div v-if="targetLineArr.length === 0" style="min-height: 1.5rem"></div>
              </div>
            </div>
            <!-- Editable Textarea -->
            <textarea ref="rightTextarea" v-model="targetText" @scroll="onRightScroll" @paste="handlePaste('target')"
              class="relative block w-full h-full bg-transparent text-[var(--color-text)] caret-[var(--color-text)] p-4 py-4 pb-16 font-mono text-sm leading-6 resize-none outline-none z-10 whitespace-pre"
              wrap="off" spellcheck="false" :placeholder="t('pasteTarget')">
    </textarea>
          </div>
        </div>
      </div>

      <!-- UNIFIED MODE -->
      <div v-else
        class="h-full rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm bg-[var(--color-background)] flex flex-col">
        <div
          class="bg-[var(--color-background)] px-4 py-2 border-b border-[var(--color-border)] h-10 flex items-center">
          <ZBadge variant="surface" size="lg">{{ t("viewUnified") }}</ZBadge>
        </div>
        <div class="flex-1 overflow-auto bg-[var(--color-background)] custom-scrollbar">
          <div class="min-w-fit w-full font-mono text-sm leading-6 flex flex-col">
            <div v-for="(line, i) in unifiedDiffLines" :key="'u-' + i"
              class="flex group hover:bg-[var(--color-surface)] transition-colors">
              <div
                class="w-10 flex-shrink-0 text-right pr-2 text-[10px] text-[var(--color-secondary)] opacity-40 select-none bg-[var(--color-surface)] border-r border-[var(--color-border)]">
                {{ line.leftNo || "" }}
              </div>
              <div
                class="w-10 flex-shrink-0 text-right pr-2 text-[10px] text-[var(--color-secondary)] opacity-40 select-none bg-[var(--color-surface)] border-r border-[var(--color-border)]">
                {{ line.rightNo || "" }}
              </div>
              <div
                class="w-8 flex-shrink-0 text-center text-[var(--color-secondary)] opacity-50 select-none border-r border-[var(--color-border)] bg-[var(--color-surface)]">
                {{
                  line.type === "insert"
                    ? "+"
                    : line.type === "delete"
                      ? "-"
                      : " "
                }}
              </div>
              <div :class="[
                'flex-1 px-4 whitespace-pre',
                line.type === 'insert'
                  ? 'bg-[var(--color-insert-bg)] text-[var(--color-insert-text)]'
                  : '',
                line.type === 'delete'
                  ? 'bg-[var(--color-delete-bg)] text-[var(--color-delete-text)]'
                  : '',
              ]">
                {{ line.value }}
              </div>
            </div>
          </div>
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

.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 10px;

    &:hover {
      background: var(--color-secondary);
    }
  }
}
</style>
