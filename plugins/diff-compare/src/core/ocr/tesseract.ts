import type { IOcrEngine, OcrTextItem } from './types';

/**
 * Tesseract.js OCR引擎 (v7+)
 * 纯前端JavaScript实现的OCR引擎
 */
export class TesseractOcrEngine implements IOcrEngine {
  name = 'tesseract';
  private ready = false;
  private worker: any = null;
  private language: string;

  constructor(language: string = 'eng+chi_sim') {
    // 语言代码转换
    this.language = language.replace('chi_sim+eng', 'eng+chi_sim');
  }

  async init(): Promise<void> {
    try {
      // 动态导入Tesseract.js
      const Tesseract = await import('tesseract.js');
      
      console.log(`[Tesseract] Initializing with language: ${this.language}`);
      
      // Tesseract.js v7 API
      this.worker = await Tesseract.createWorker(this.language, 1, {
        logger: (m: any) => {
          // 过滤掉参数警告，只显示关键状态
          if (m.status === 'loading tesseract core') {
            console.log(`[Tesseract] Loading core...`);
          } else if (m.status === 'initializing tesseract') {
            console.log(`[Tesseract] Initializing engine...`);
          } else if (m.status === 'loading language traineddata') {
            console.log(`[Tesseract] Loading language: ${m.data?.lang || ''}`);
          } else if (m.status === 'initializing api') {
            console.log(`[Tesseract] API ready`);
          } else if (m.status === 'recognizing text') {
            console.log(`[Tesseract] Recognizing: ${(m.progress * 100).toFixed(0)}%`);
          }
        },
      });
      
      this.ready = true;
      console.log('[Tesseract] OCR engine initialized successfully');
    } catch (error) {
      console.error('[Tesseract] Failed to initialize:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async recognize(image: ImageData | HTMLCanvasElement | string): Promise<OcrTextItem[]> {
    if (!this.worker) {
      await this.init();
    }

    console.log('[Tesseract] Starting recognition...');
    
    try {
      const result = await this.worker.recognize(image);
      const items: OcrTextItem[] = [];

      console.log('[Tesseract] Raw result:', result);
      
      if (result.data) {
        console.log('[Tesseract] Result data keys:', Object.keys(result.data));
        console.log('[Tesseract] Full text length:', result.data.text?.length || 0);
        console.log('[Tesseract] Text preview:', result.data.text?.substring(0, 300));
        console.log('[Tesseract] Words:', result.data.words?.length || 0);
        console.log('[Tesseract] Lines:', result.data.lines?.length || 0);
        console.log('[Tesseract] Paragraphs:', result.data.paragraphs?.length || 0);
        console.log('[Tesseract] Symbols:', result.data.symbols?.length || 0);
        
        // Tesseract.js v7: 尝试多种方式获取文本块
        let textBlocks: any[] = [];
        
        // 方式1: 使用words
        if (result.data.words && result.data.words.length > 0) {
          textBlocks = result.data.words;
          console.log('[Tesseract] Using words array');
        }
        // 方式2: 使用lines
        else if (result.data.lines && result.data.lines.length > 0) {
          textBlocks = result.data.lines;
          console.log('[Tesseract] Using lines array');
        }
        // 方式3: 使用paragraphs
        else if (result.data.paragraphs && result.data.paragraphs.length > 0) {
          textBlocks = result.data.paragraphs;
          console.log('[Tesseract] Using paragraphs array');
        }
        // 方式4: 使用symbols (字符级别)
        else if (result.data.symbols && result.data.symbols.length > 0) {
          textBlocks = result.data.symbols;
          console.log('[Tesseract] Using symbols array');
        }
        // 方式5: 从纯文本创建虚拟块
        else if (result.data.text && result.data.text.trim()) {
          console.log('[Tesseract] No structured data, creating blocks from text');
          const lines = result.data.text.split('\n').filter((l: string) => l.trim());
          let y = 50; // 从页面顶部50像素开始
          lines.forEach((line: string, index: number) => {
            textBlocks.push({
              text: line,
              bbox: { 
                x0: 50,           // 左边距50像素
                y0: y, 
                x1: 50 + line.length * 12,  // 估算宽度
                y1: y + 24        // 行高24像素
              },
              confidence: 80,
            });
            y += 30; // 行间距30像素
          });
          console.log(`[Tesseract] Created ${textBlocks.length} virtual blocks from ${lines.length} lines`);
        }
        
        textBlocks.forEach((block: any, index: number) => {
          const text = (block.text || block.value || '').trim();
          if (text) {
            // bbox格式可能是 {x0, y0, x1, y1} 或 {x, y, width, height}
            let bbox: { x: number; y: number; width: number; height: number };
            
            if (block.bbox) {
              if ('x0' in block.bbox) {
                bbox = {
                  x: block.bbox.x0,
                  y: block.bbox.y0,
                  width: (block.bbox.x1 || 0) - (block.bbox.x0 || 0),
                  height: (block.bbox.y1 || 0) - (block.bbox.y0 || 0),
                };
              } else if ('x' in block.bbox) {
                bbox = block.bbox;
              } else {
                bbox = { x: 0, y: 0, width: 100, height: 20 };
              }
            } else {
              // 没有bbox，使用默认值
              bbox = { x: 0, y: index * 25, width: text.length * 10, height: 20 };
            }

            // 确保尺寸有效
            if (bbox.width <= 0) bbox.width = text.length * 10;
            if (bbox.height <= 0) bbox.height = 20;

            items.push({
              text,
              confidence: (block.confidence || 80) / 100,
              bbox,
              pageNum: 1,
              index,
            });
          }
        });
      }

      console.log(`[Tesseract] Extracted ${items.length} text items`);
      return items;
    } catch (error) {
      console.error('[Tesseract] Recognition failed:', error);
      throw error;
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.ready = false;
      console.log('[Tesseract] Engine terminated');
    }
  }
}
