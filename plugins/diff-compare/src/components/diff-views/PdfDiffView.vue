<script setup lang="ts">
import { toRaw, ref, shallowRef, computed, onMounted, onUnmounted, nextTick, markRaw } from "vue";
import { useI18n } from "vue-i18n";
import * as pdfjsLib from "pdfjs-dist";
import ZBadge from "@/components/ui/base/ZBadge.vue";
import ZButton from "@/components/ui/base/ZButton.vue";
import ZTooltip from "@/components/ui/base/ZTooltip.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import DiffBar from "@/components/shared/DiffBar.vue";
import DiffLegend from "@/components/shared/DiffLegend.vue";
import PrevNextButtons from "@/components/shared/PrevNextButtons.vue";
import { readFileAsArrayBuffer } from "@/utils/file";
import { extractFilesFromClipboard } from "@/utils/clipboard";
import { getNextIndex, getPrevIndex } from "@/utils/diffNavigation";
import type { IOcrEngine, OcrConfig } from "@/core/ocr";
import { createOcrEngine } from "@/core/ocr";
import { TextItem } from '@/core/diff/pdf/pdf.ts'
/**
 * 按Y坐标分组为行
 */
function groupByLine(items, tolerance = 2) {
  const lines = [];

  for (const item of items) {
    const y = item.transform[5];

    let line = lines.find(l => Math.abs(l.y - y) < tolerance);

    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }

    line.items.push(item);
  }

  return lines.map(line => {
    line.items.sort((a, b) => a.transform[4] - b.transform[4]);
    return line.items;
  });
}

/**
 * 合并一行 token
 */
function mergeLineTokens(items) {
  const noSpaceBefore = new Set(["|", ",", ".", ":", ";", ")", "]"]);
  const noSpaceAfter = new Set(["(", "["]);

  let text = "";

  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    const prev = items[i - 1];

    const str = current.str;

    if (!prev) {
      text += str;
      continue;
    }

    const prevStr = prev.str;

    const gap = current.transform[4] - (prev.transform[4] + prev.width);

    if (noSpaceBefore.has(str)) {
      text += str;
    }
    else if (noSpaceAfter.has(prevStr)) {
      text += str;
    }
    else if (gap > 2) {
      text += " " + str;
    }
    else {
      text += str;
    }
  }

  return text.trim();
}

const { t } = useI18n();

// 设置 PDF.js worker
import 'pdfjs-dist/build/pdf.worker.min.mjs'

// 差异块接口
interface DiffBlock {
  type: "equal" | "delete" | "insert" | "modified";
  sourceText: string;
  targetText: string;
  sourcePage?: number;
  targetPage?: number;
  sourceIndex?: number;
  targetIndex?: number;
}

// 差异高亮项
interface DiffHighlight {
  text: string;
  type: "delete" | "insert" | "modified";
  pageNum: number;
  bbox: { x: number; y: number; width: number; height: number };
  index: number;
}

const sourceFileName = ref("");
const targetFileName = ref("");
const loading = ref(false);
const loadError = ref("");
const ocrStatus = ref("");

// OCR配置 - 只支持pdfjs和tesseract
const ocrEngine = ref<'pdfjs' | 'tesseract'>('pdfjs');

// PDF文档引用
const sourcePdfDoc = shallowRef<pdfjsLib.PDFDocumentProxy | null>(null);
const targetPdfDoc = shallowRef<pdfjsLib.PDFDocumentProxy | null>(null);

// 文本项
const sourceTextItems = ref<TextItem[]>([]);
const targetTextItems = ref<TextItem[]>([]);

const bothLoaded = computed(() => !!sourcePdfDoc.value && !!targetPdfDoc.value);

// 差异状态
const diffBlocks = ref<DiffBlock[]>([]);
const diffHighlights = ref<{ source: DiffHighlight[]; target: DiffHighlight[] }>({
  source: [],
  target: [],
});
const isDiffing = ref(false);
const activeBlockIdx = ref(-1);
const showHighlights = ref(false);

// OCR引擎实例
let ocrEngineInstance: IOcrEngine | null = null;
let diffWorker: Worker | null = null;
let currentRequestId = 0;

// 初始化OCR引擎
async function initOcrEngine(): Promise<IOcrEngine> {
  if (ocrEngineInstance && ocrEngineInstance.name === ocrEngine.value) {
    return ocrEngineInstance;
  }

  const config: OcrConfig = {
    engine: ocrEngine.value,
    language: 'chi_sim+eng',
  };

  ocrEngineInstance = createOcrEngine(config);

  if (ocrEngineInstance.init) {
    ocrStatus.value = t('ocrInitializing') || 'Initializing OCR engine...';
    await ocrEngineInstance.init();
  }

  return ocrEngineInstance;
}

// 使用PDF.js提取文本
async function extractTextItemsFromPdf(pdf: pdfjsLib.PDFDocumentProxy): Promise<TextItem[]> {
  const items: TextItem[] = [];
  const numPages = pdf.numPages;
  let globalIndex = 0;

  console.log(`[PDF.js] Extracting text from ${numPages} pages`);

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent({
      disableNormalization: false
    });

    console.log(`[PDF.js] Page ${pageNum}: ${textContent.items.length} items`);

    const lines = groupByLine(textContent.items);

    for (const line of lines) {
      const mergedText = mergeLineTokens(line);

      if (mergedText.trim()) {
        const firstItem = line[0];
        const lastItem = line[line.length - 1];

        const transform = firstItem.transform;
        const [scaleX, skewY, skewX, scaleY, translateX, translateY] = transform || [12, 0, 0, 12, 0, 0];

        const bboxX = translateX || 0;
        const bboxY = translateY || 0;
        const bboxWidth = lastItem.transform[4] + lastItem.width - bboxX;
        const bboxHeight = Math.abs(scaleY || 12);

        items.push({
          str: mergedText,
          transform,
          pageNum,
          index: globalIndex++,
          bbox: {
            x: bboxX,
            y: bboxY,
            width: bboxWidth,
            height: bboxHeight,
          },
        });
      }
    }
  }
  console.log(`[PDF.js] Extracted ${items.length} text items`);

  items.slice(0, 5).forEach((item, i) => {
    console.log(`[PDF.js] Item ${i}: page=${item.pageNum}, str="${item.str.substring(0, 20)}...", bbox=`, item.bbox);
  });

  return items;
}

// 使用OCR识别PDF页面
async function extractTextItemsWithOcr(
  pdf: pdfjsLib.PDFDocumentProxy,
  scale: number = 1.5
): Promise<TextItem[]> {
  const items: TextItem[] = [];
  const numPages = pdf.numPages;
  let globalIndex = 0;

  console.log(`[OCR] Starting OCR for ${numPages} pages`);

  const engine = await initOcrEngine();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    ocrStatus.value = `Processing page ${pageNum}/${numPages}...`;

    // 渲染PDF页面为canvas
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    // 设置白色背景（某些PDF可能透明）
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    // 调试：检查canvas内容
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((v, i) => i % 4 !== 3 && v !== 255);
    console.log(`[OCR] Canvas size: ${canvas.width}x${canvas.height}, hasContent: ${hasContent}`);

    // 如果canvas没有内容，尝试直接传给Tesseract让它处理
    // OCR识别
    console.log(`[OCR] Recognizing page ${pageNum}...`);

    // 使用canvas.toDataURL()传递图像，Tesseract.js处理更稳定
    const imageUrl = canvas.toDataURL('image/png');
    console.log(`[OCR] Image data URL length: ${imageUrl.length}`);

    const ocrResults = await engine.recognize(imageUrl);

    console.log(`[OCR] Page ${pageNum}: Found ${ocrResults.length} text blocks`);

    // 转换为TextItem格式
    for (const ocrItem of ocrResults) {
      if (ocrItem.text.trim()) {
        items.push({
          str: ocrItem.text,
          transform: [
            ocrItem.bbox.height,
            0,
            0,
            ocrItem.bbox.height,
            ocrItem.bbox.x,
            ocrItem.bbox.y,
          ],
          pageNum,
          index: globalIndex++,
          bbox: ocrItem.bbox,
          confidence: ocrItem.confidence,
        });
      }
    }
  }

  console.log(`[OCR] Total items: ${items.length}`);
  return items;
}

// 提取文本项（根据选择的引擎）
async function extractTextItems(pdf: pdfjsLib.PDFDocumentProxy): Promise<TextItem[]> {
  if (ocrEngine.value === 'tesseract') {
    return extractTextItemsWithOcr(pdf);
  } else {
    return extractTextItemsFromPdf(pdf);
  }
}

// 渲染单个PDF页面
async function renderPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  container: HTMLElement,
  highlights: DiffHighlight[] = []
): Promise<void> {
  const page = await pdf.getPage(pageNum);
  const scale = 1.2;
  const viewport = page.getViewport({ scale });

  const pageWrapper = document.createElement("div");
  pageWrapper.className = "pdf-page-wrapper";
  pageWrapper.id = `page-${pageNum}`;
  pageWrapper.dataset.pageNum = String(pageNum);

  const canvasContainer = document.createElement("div");
  canvasContainer.className = "pdf-canvas-container";

  const canvas = document.createElement("canvas");
  canvas.className = "pdf-canvas";
  const ctx = canvas.getContext("2d")!;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  canvasContainer.appendChild(canvas);

  // 如果有高亮，在 canvas 上直接绘制
  const pageHighlights = highlights.filter((h) => h.pageNum === pageNum);
  if (pageHighlights.length > 0) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      for (const highlight of pageHighlights) {
        const { x, y, width, height } = highlight.bbox;

        // PDF坐标转换到Canvas坐标
        // PDF坐标系：左下角为原点，y轴向上
        // Canvas坐标系：左上角为原点，y轴向下
        const canvasY = viewport.height - (y + height) * scale;
        const canvasX = x * scale;
        const canvasW = width * scale;
        const canvasH = height * scale;

        if (canvasW > 0 && canvasH > 0) {
          // 绘制背景色
          if (highlight.type === 'delete') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          } else if (highlight.type === 'insert') {
            ctx.fillStyle = 'rgba(0, 200, 0, 0.3)';
          } else if (highlight.type === 'modified') {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
          }
          ctx.fillRect(canvasX, canvasY, canvasW, canvasH);

          // 绘制底部边框
          if (highlight.type === 'delete') {
            ctx.fillStyle = '#ff0000';
          } else if (highlight.type === 'insert') {
            ctx.fillStyle = '#00c800';
          } else if (highlight.type === 'modified') {
            ctx.fillStyle = '#ffa500';
          }
          ctx.fillRect(canvasX, canvasY + canvasH - 2, canvasW, 2);
        }
      }
    }
  }

  pageWrapper.appendChild(canvasContainer);
  container.appendChild(pageWrapper);
}

// 渲染整个PDF
async function renderPdf(
  pdf: pdfjsLib.PDFDocumentProxy,
  container: HTMLElement,
  highlights: DiffHighlight[] = []
): Promise<void> {
  container.innerHTML = "";
  const numPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    await renderPage(pdf, pageNum, container, highlights);
  }
}

// 计算差异并生成高亮
async function computeDiff(
  srcItems: TextItem[],
  tgtItems: TextItem[]
): Promise<void> {
  if (srcItems.length === 0 || tgtItems.length === 0) {
    diffBlocks.value = [];
    return;
  }

  isDiffing.value = true;

  if (!diffWorker) {
    diffWorker = new Worker(
      new URL("../../core/diff/diff.worker.ts", import.meta.url),
      { type: "module" }
    );
  }

  const requestId = ++currentRequestId;
  try {
    console.log("=== PDF Diff Calculation ===");

    const workerResult = await new Promise<any>((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        const { requestId: resId, result, error } = e.data;
        if (resId === requestId) {
          diffWorker!.removeEventListener("message", handler);
          if (error) reject(error);
          else resolve(result);
        }
      };
      diffWorker!.addEventListener("message", handler);
      diffWorker!.postMessage({
        type: "pdf",
        source: toRaw(srcItems),
        target: toRaw(tgtItems),
        requestId,
      });
    });

    const blocks: DiffBlock[] = [];
    const sourceHighlights: DiffHighlight[] = [];
    const targetHighlights: DiffHighlight[] = [];

    console.log('[computeDiff] Total srcItems:', srcItems.length, 'tgtItems:', tgtItems.length);
    console.log('[差异结果]', workerResult.filter((item: any) => item.type !== 'equal'));

    let srcIdx = 0;
    let tgtIdx = 0;

    for (const diff of workerResult) {
      const sourceItem = diff.source;
      const targetItem = diff.target;

      if (diff.type === 'equal') {
        blocks.push({
          type: 'equal',
          sourceText: sourceItem?.str || '',
          targetText: targetItem?.str || '',
          sourcePage: sourceItem?.pageNum,
          targetPage: targetItem?.pageNum,
          sourceIndex: srcIdx,
          targetIndex: tgtIdx,
        });
        srcIdx++;
        tgtIdx++;
      } else if (diff.type === 'delete') {
        blocks.push({
          type: 'delete',
          sourceText: sourceItem?.str || '',
          targetText: '',
          sourcePage: sourceItem?.pageNum,
          targetPage: tgtItems[tgtIdx]?.pageNum,
          sourceIndex: srcIdx,
          targetIndex: tgtIdx,
        });
        if (sourceItem) {
          sourceHighlights.push({
            text: sourceItem.str || '',
            type: 'delete',
            pageNum: sourceItem.pageNum,
            bbox: sourceItem.bbox || { x: 0, y: 0, width: 100, height: 20 },
            index: srcIdx,
          });
        }
        srcIdx++;
      } else if (diff.type === 'insert') {
        blocks.push({
          type: 'insert',
          sourceText: '',
          targetText: targetItem?.str || '',
          sourcePage: srcItems[srcIdx]?.pageNum,
          targetPage: targetItem?.pageNum,
          sourceIndex: srcIdx,
          targetIndex: tgtIdx,
        });
        if (targetItem) {
          targetHighlights.push({
            text: targetItem.str || '',
            type: 'insert',
            pageNum: targetItem.pageNum,
            bbox: targetItem.bbox || { x: 0, y: 0, width: 100, height: 20 },
            index: tgtIdx,
          });
        }
        tgtIdx++;
      } else if (diff.type === 'modify') {
        blocks.push({
          type: 'modified',
          sourceText: sourceItem?.str || '',
          targetText: targetItem?.str || '',
          sourcePage: sourceItem?.pageNum,
          targetPage: targetItem?.pageNum,
          sourceIndex: srcIdx,
          targetIndex: tgtIdx,
        });
        if (sourceItem) {
          sourceHighlights.push({
            text: sourceItem.str || '',
            type: 'modified',
            pageNum: sourceItem.pageNum,
            bbox: sourceItem.bbox || { x: 0, y: 0, width: 100, height: 20 },
            index: srcIdx,
          });
        }
        if (targetItem) {
          targetHighlights.push({
            text: targetItem.str || '',
            type: 'modified',
            pageNum: targetItem.pageNum,
            bbox: targetItem.bbox || { x: 0, y: 0, width: 100, height: 20 },
            index: tgtIdx,
          });
        }
        srcIdx++;
        tgtIdx++;
      }
    }

    diffBlocks.value = blocks;
    diffHighlights.value = { source: sourceHighlights, target: targetHighlights };

    console.log("=== Diff Results ===");
    console.log("Total blocks:", blocks.length);
    console.log("Diff blocks:", blocks.filter(b => b.type !== 'equal').length);
    console.log("Source highlights:", sourceHighlights.length);
    console.log("Target highlights:", targetHighlights.length);

    // 重新渲染PDF（不带高亮）
    await nextTick();
    if (sourceViewerRef.value && sourcePdfDoc.value) {
      await renderPdf(sourcePdfDoc.value, sourceViewerRef.value);
    }
    if (targetViewerRef.value && targetPdfDoc.value) {
      await renderPdf(targetPdfDoc.value, targetViewerRef.value);
    }

    // 如果当前显示高亮，则重新渲染高亮
    if (showHighlights.value) {
      await renderHighlights();
    }
  } catch (e) {
    console.error("PDF diff calculation failed:", e);
    loadError.value = String(e);
  } finally {
    if (requestId === currentRequestId) {
      isDiffing.value = false;
      ocrStatus.value = "";
    }
  }
}

const diffCount = computed(() => {
  return diffBlocks.value.filter((b) => b.type !== "equal").length;
});

// 切换高亮显示
async function toggleHighlights() {
  if (diffCount.value === 0) return;

  showHighlights.value = !showHighlights.value;

  if (showHighlights.value) {
    await renderHighlights();
  } else {
    // 重新渲染不带高亮的PDF
    if (sourceViewerRef.value && sourcePdfDoc.value) {
      await renderPdf(sourcePdfDoc.value, sourceViewerRef.value);
    }
    if (targetViewerRef.value && targetPdfDoc.value) {
      await renderPdf(targetPdfDoc.value, targetViewerRef.value);
    }
  }
}

// 渲染高亮
async function renderHighlights() {
  debugger
  if (!sourceViewerRef.value || !targetViewerRef.value) return;
  if (!sourcePdfDoc.value || !targetPdfDoc.value) return;

  // 保存当前滚动位置
  const sourceScrollTop = sourceViewerRef.value.parentElement?.scrollTop || 0;
  const targetScrollTop = targetViewerRef.value.parentElement?.scrollTop || 0;

  await renderPdf(sourcePdfDoc.value, sourceViewerRef.value, diffHighlights.value.source);
  await renderPdf(targetPdfDoc.value, targetViewerRef.value, diffHighlights.value.target);

  // 恢复滚动位置
  if (sourceViewerRef.value.parentElement) {
    sourceViewerRef.value.parentElement.scrollTop = sourceScrollTop;
  }
  if (targetViewerRef.value.parentElement) {
    targetViewerRef.value.parentElement.scrollTop = targetScrollTop;
  }
}

// 处理文件上传
const sourceViewerRef = ref<HTMLElement | null>(null);
const targetViewerRef = ref<HTMLElement | null>(null);
const leftPanelRef = ref<HTMLElement | null>(null);
const rightPanelRef = ref<HTMLElement | null>(null);

// 处理文件加载后的差异计算
async function processAfterFileLoad() {
  // 如果使用OCR引擎
  if (ocrEngine.value === 'tesseract') {
    // 只有当两个文件都已加载时才进行OCR识别和对比
    if (sourcePdfDoc.value && targetPdfDoc.value) {
      // 同时对两个PDF进行OCR识别
      const [items1, items2] = await Promise.all([
        extractTextItems(sourcePdfDoc.value),
        extractTextItems(targetPdfDoc.value),
      ]);
      sourceTextItems.value = items1;
      targetTextItems.value = items2;

      // 渲染PDF
      await nextTick();
      await Promise.all([
        sourceViewerRef.value ? renderPdf(sourcePdfDoc.value, sourceViewerRef.value) : Promise.resolve(),
        targetViewerRef.value ? renderPdf(targetPdfDoc.value, targetViewerRef.value) : Promise.resolve(),
      ]);

      // 计算差异
      await computeDiff(items1, items2);
    }
  } else {
    // PDF.js模式：单个文件加载后即可提取文本
    if (sourcePdfDoc.value && sourceTextItems.value.length === 0) {
      const items = await extractTextItemsFromPdf(sourcePdfDoc.value);
      sourceTextItems.value = items;
      if (sourceViewerRef.value) {
        await renderPdf(sourcePdfDoc.value, sourceViewerRef.value);
      }
    }
    if (targetPdfDoc.value && targetTextItems.value.length === 0) {
      const items = await extractTextItemsFromPdf(targetPdfDoc.value);
      targetTextItems.value = items;
      if (targetViewerRef.value) {
        await renderPdf(targetPdfDoc.value, targetViewerRef.value);
      }
    }
    // 如果两个文件都已加载，计算差异
    if (sourceTextItems.value.length > 0 && targetTextItems.value.length > 0) {
      console.log("sourcePdf内容", sourceTextItems.value)
      console.log("targetPdf内容", targetTextItems.value)
      await computeDiff(sourceTextItems.value, targetTextItems.value);
    }
  }
}

const handleFile = async (e: Event, side: "source" | "target") => {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;

  loading.value = true;
  loadError.value = "";

  try {
    if (files.length >= 2) {
      // 同时上传两个文件
      const [buf1, buf2] = await Promise.all([
        readFileAsArrayBuffer(files[0]),
        readFileAsArrayBuffer(files[1]),
      ]);
      const [pdf1, pdf2] = await Promise.all([
        pdfjsLib.getDocument({ data: buf1 }).promise,
        pdfjsLib.getDocument({ data: buf2 }).promise,
      ]);

      sourcePdfDoc.value = markRaw(pdf1);
      targetPdfDoc.value = markRaw(pdf2);
      sourceFileName.value = files[0].name;
      targetFileName.value = files[1].name;

      await processAfterFileLoad();
    } else {
      // 上传单个文件
      const buf = await readFileAsArrayBuffer(files[0]);
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

      if (side === "source") {
        sourcePdfDoc.value = markRaw(pdf);
        sourceFileName.value = files[0].name;
      } else {
        targetPdfDoc.value = markRaw(pdf);
        targetFileName.value = files[0].name;
      }

      await processAfterFileLoad();
    }
  } catch (err) {
    console.error("PDF load error:", err);
    loadError.value = (err as Error).message || t("pdfLoadFailed");
  } finally {
    loading.value = false;
    input.value = "";
  }
};

const clearItems = () => {
  sourcePdfDoc.value = null;
  targetPdfDoc.value = null;
  sourceFileName.value = "";
  targetFileName.value = "";
  loadError.value = "";
  sourceTextItems.value = [];
  targetTextItems.value = [];
  diffBlocks.value = [];
  diffHighlights.value = { source: [], target: [] };
  activeBlockIdx.value = -1;
  ocrStatus.value = "";
  if (sourceViewerRef.value) sourceViewerRef.value.innerHTML = "";
  if (targetViewerRef.value) targetViewerRef.value.innerHTML = "";
};

const handlePaste = async (e: ClipboardEvent) => {
  const files = extractFilesFromClipboard(e, (file) => /\.pdf$/i.test(file.name));
  if (files.length === 0) return;

  loading.value = true;
  loadError.value = "";
  try {
    if (files.length >= 2) {
      const [buf1, buf2] = await Promise.all([
        readFileAsArrayBuffer(files[0]),
        readFileAsArrayBuffer(files[1]),
      ]);
      const [pdf1, pdf2] = await Promise.all([
        pdfjsLib.getDocument({ data: buf1 }).promise,
        pdfjsLib.getDocument({ data: buf2 }).promise,
      ]);

      sourcePdfDoc.value = markRaw(pdf1);
      targetPdfDoc.value = markRaw(pdf2);
      sourceFileName.value = files[0].name;
      targetFileName.value = files[1].name;

      await processAfterFileLoad();
    } else {
      const buf = await readFileAsArrayBuffer(files[0]);
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

      if (!sourcePdfDoc.value) {
        sourcePdfDoc.value = markRaw(pdf);
        sourceFileName.value = files[0].name;
      } else {
        targetPdfDoc.value = markRaw(pdf);
        targetFileName.value = files[0].name;
      }

      await processAfterFileLoad();
    }
  } catch (err) {
    loadError.value = (err as Error).message || t("pdfLoadFailed");
  } finally {
    loading.value = false;
  }
};

// 导航到差异位置
const scrollToBlock = async (idx: number) => {
  activeBlockIdx.value = idx;
  const block = diffBlocks.value[idx];
  if (!block) return;

  sourceViewerRef.value?.querySelectorAll('.pdf-highlight-active').forEach(el => {
    el.classList.remove('pdf-highlight-active');
  });
  targetViewerRef.value?.querySelectorAll('.pdf-highlight-active').forEach(el => {
    el.classList.remove('pdf-highlight-active');
  });

  if (block.sourcePage) {
    const sourcePage = sourceViewerRef.value?.querySelector(`#page-${block.sourcePage}`);
    sourcePage?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (block.sourceIndex !== undefined) {
      const highlightEl = sourceViewerRef.value?.querySelector(`[data-index="${block.sourceIndex}"]`);
      highlightEl?.classList.add('pdf-highlight-active');
    }
  }

  if (block.targetPage) {
    const targetPage = targetViewerRef.value?.querySelector(`#page-${block.targetPage}`);
    targetPage?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (block.targetIndex !== undefined) {
      const highlightEl = targetViewerRef.value?.querySelector(`[data-index="${block.targetIndex}"]`);
      highlightEl?.classList.add('pdf-highlight-active');
    }
  }
};

const goToNextDiff = () => {
  const indices = diffBlocks.value
    .map((b, i) => (b.type !== "equal" ? i : -1))
    .filter((i) => i >= 0);
  const next = getNextIndex(indices, activeBlockIdx.value);
  if (next === -1) return;
  scrollToBlock(next);
};

const goToPrevDiff = () => {
  const indices = diffBlocks.value
    .map((b, i) => (b.type !== "equal" ? i : -1))
    .filter((i) => i >= 0);
  const prev = getPrevIndex(indices, activeBlockIdx.value);
  if (prev === -1) return;
  scrollToBlock(prev);
};

onMounted(() => {
  window.addEventListener("paste", handlePaste);
});

onUnmounted(() => {
  window.removeEventListener("paste", handlePaste);
  if (diffWorker) {
    diffWorker.terminate();
    diffWorker = null;
  }
});
</script>

<template>
  <div class="pdf-root flex flex-col h-full overflow-hidden">
    <!-- Toolbar -->
    <div
      class="h-11 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center gap-3 px-4 flex-shrink-0 z-30 shadow-sm">
      <!-- 左侧：源文件名 -->
      <div class="w-[180px] min-w-0 flex items-center gap-2 flex-shrink-0">
        <ZBadge v-if="sourceFileName" :title="sourceFileName" variant="surface" size="lg">
          {{ sourceFileName }}
        </ZBadge>
        <ZBadge v-else :title="t('pdfSource')" variant="surface" size="lg">
          {{ t("pdfSource") }}
        </ZBadge>
      </div>

      <!-- 中间：OCR选择 + 差异数量 + 导航 -->
      <div class="flex-1 flex items-center justify-center gap-2 min-w-0">
        <!-- OCR引擎选择 -->
        <div class="flex items-center gap-1 mr-2">
          <span class="text-xs text-[var(--color-secondary)] mr-1">OCR:</span>
          <ZTooltip content="PDF.js内置文本提取 (快速，适用于可选中文本)">
            <ZButton variant="ghost" size="sm" :active="ocrEngine === 'pdfjs'" @click="ocrEngine = 'pdfjs'"
              class="!px-2 !h-6 text-xs">
              PDF.js
            </ZButton>
          </ZTooltip>
          <ZTooltip content="Tesseract.js OCR (纯前端，需等待两个文件都加载)">
            <ZButton variant="ghost" size="sm" :active="ocrEngine === 'tesseract'" @click="ocrEngine = 'tesseract'"
              class="!px-2 !h-6 text-xs">
              Tesseract
            </ZButton>
          </ZTooltip>
        </div>

        <template v-if="bothLoaded">
          <div v-if="diffCount > 0" class="flex items-center gap-1.5">
            <ZTooltip :content="showHighlights ? t('hideHighlights') || '隐藏高亮' : t('showHighlights') || '显示高亮'">
              <ZButton variant="ghost" size="sm" :active="showHighlights" @click="toggleHighlights"
                class="!px-2 !h-6 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M12 3c-1.5 0-2 .5-2 2s.5 2 2 2 2-.5 2-2-.5-2-2-2z" />
                  <path d="M12 22c1.5 0 2-.5 2-2s-.5-2-2-2-2 .5-2 2 .5 2 2 2z" />
                  <path d="M12 14c-1.5 0-2 .5-2 2s.5 2 2 2 2-.5 2-2-.5-2-2-2z" />
                  <path d="M5 12H3" />
                  <path d="M21 12h-2" />
                  <path d="M12 5v2" />
                  <path d="M12 17v2" />
                </svg>
                {{ t("highlight") || "高亮" }}
              </ZButton>
            </ZTooltip>
            <div
              class="flex items-center gap-1.5 bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] px-2 py-1">
              <span class="text-xs font-medium text-[var(--color-cta)] cursor-pointer" @click="goToNextDiff">
                {{ t("pdfDiffCount", { n: diffCount }) }}
              </span>
              <PrevNextButtons :prev-label="t('prevChange')" :next-label="t('nextChange')" @prev="goToPrevDiff"
                @next="goToNextDiff" />
            </div>
          </div>
          <span v-else class="text-xs text-[var(--color-secondary)]">
            {{ t("pdfNoDiff") }}
          </span>
        </template>

        <ZTooltip :content="t('clearItems')" v-if="bothLoaded">
          <ZButton variant="ghost" size="icon-sm" @click="clearItems"
            class="!w-6 !h-6 text-[var(--color-secondary)] hover:text-[var(--color-text)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </ZButton>
        </ZTooltip>
      </div>

      <!-- 右侧：目标文件名 -->
      <div class="w-[180px] min-w-0 flex items-center justify-end gap-2 flex-shrink-0">
        <ZBadge v-if="targetFileName" :title="targetFileName" variant="surface" size="lg">
          {{ targetFileName }}
        </ZBadge>
        <ZBadge v-else variant="surface" size="lg" class="opacity-60">
          {{ t("pdfTarget") }}
        </ZBadge>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden relative bg-[var(--color-surface)]">
      <!-- Dropzones -->
      <div v-if="!bothLoaded" class="h-full flex gap-4 p-5">
        <FileDropzone side="source" :title="t('pdfSource')" :hint="t('uploadPdf')" :is-ready="!!sourcePdfDoc"
          :fileName="sourceFileName" accept=".pdf" @change="handleFile($event, 'source')">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
          </template>
        </FileDropzone>
        <FileDropzone side="target" :title="t('pdfTarget')" :hint="t('uploadPdf')" :is-ready="!!targetPdfDoc"
          :fileName="targetFileName" accept=".pdf" @change="handleFile($event, 'target')">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
          </template>
        </FileDropzone>
      </div>

      <!-- Error -->
      <div v-if="loadError"
        class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-red-500/20 text-red-500 text-sm border border-red-500/30 z-50">
        {{ loadError }}
      </div>

      <!-- Loading -->
      <div v-if="loading || isDiffing"
        class="absolute inset-0 flex items-center justify-center bg-[var(--color-background)]/80 z-40">
        <div class="flex flex-col items-center gap-3">
          <svg class="animate-spin h-8 w-8 text-[var(--color-cta)]" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          <span class="text-sm font-medium">{{ ocrStatus || (loading ? t("pdfRendering") : t("computingDiff")) }}</span>
        </div>
      </div>

      <!-- PDF View -->
      <div v-if="bothLoaded" class="h-full flex overflow-hidden bg-[var(--color-background)]">
        <!-- Left: Source PDF Viewer -->
        <div ref="leftPanelRef"
          class="flex-1 overflow-auto border-r border-[var(--color-border)] custom-scrollbar pdf-panel">
          <div ref="sourceViewerRef" class="pdf-viewer"></div>
        </div>

        <!-- Center: Diff Bar -->
        <DiffBar :title="t('pdfDiffShort') || t('diffResult')" :items="diffBlocks" :active-index="activeBlockIdx"
          @item-click="scrollToBlock" />

        <!-- Right: Target PDF Viewer -->
        <div ref="rightPanelRef" class="flex-1 overflow-auto custom-scrollbar pdf-panel">
          <div ref="targetViewerRef" class="pdf-viewer"></div>
        </div>
      </div>

      <!-- Footer Legend -->
      <DiffLegend v-if="bothLoaded" :items="[
        { label: t('removed'), swatchClass: 'bg-red-200 border border-red-300' },
        { label: t('modified'), swatchClass: 'bg-yellow-200 border border-yellow-300' },
        { label: t('added'), swatchClass: 'bg-green-200 border border-green-300' },
      ]" class="absolute bottom-0 left-0 right-0" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.pdf-root {
  background: var(--color-background);
}

.pdf-panel {
  background: #525659;
}

.pdf-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  gap: 16px;
  min-height: 100%;
}

::deep(.pdf-page-wrapper) {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: visible;
  position: relative;
}

::deep(.pdf-canvas-container) {
  position: relative;
  line-height: 0;
}

::deep(.pdf-highlight-layer) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
}

::deep(.pdf-canvas) {
  display: block;
  max-width: 100%;
  height: auto;
}

::deep(.pdf-highlight-layer) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

::deep(.pdf-highlight) {
  position: absolute;
  border-radius: 2px;
  transition: all 0.2s ease;
}

::deep(.pdf-highlight-delete) {
  background-color: rgba(255, 0, 0, 0.25);
  border-bottom: 2px solid #ff0000;
}

::deep(.pdf-highlight-insert) {
  background-color: rgba(0, 200, 0, 0.25);
  border-bottom: 2px solid #00c800;
}

::deep(.pdf-highlight-modified) {
  background-color: rgba(255, 165, 0, 0.25);
  border-bottom: 2px solid #ffa500;
}

::deep(.pdf-highlight-active) {
  box-shadow: 0 0 0 3px var(--color-cta);
  z-index: 10;
}

.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}
</style>
