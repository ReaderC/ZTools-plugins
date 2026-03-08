// OCR识别结果类型
export interface OcrTextItem {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pageNum: number;
  index: number;
}

// OCR识别器接口
export interface IOcrEngine {
  name: string;
  recognize(image: ImageData | HTMLCanvasElement | string): Promise<OcrTextItem[]>;
  isReady(): boolean;
  init?(): Promise<void>;
}

// OCR配置
export interface OcrConfig {
  engine:  'tesseract' | 'pdfjs';
  language?: string;
}

// PDF页面渲染结果
export interface RenderedPage {
  pageNum: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}
