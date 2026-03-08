export * from './types';
export { TesseractOcrEngine } from './tesseract';

import type { IOcrEngine, OcrConfig } from './types';
import { TesseractOcrEngine } from './tesseract';

/**
 * 创建OCR引擎实例
 */
export function createOcrEngine(config: OcrConfig): IOcrEngine {
  switch (config.engine) {
    case 'tesseract':
      return new TesseractOcrEngine(config.language);

    
    default:
      throw new Error(`Unknown OCR engine: ${config.engine}`);
  }
}
