/**
 * 这是一个桥接层，用于调用注入在 window 中的 Node.js 能力。
 * 根据用户说明，这些能力通过 public/preload 注入。
 */

export interface FSBridge {
  rename: (oldPath: string, newPath: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  getStats: (path: string) => Promise<any>;
}

// 假设注入在 window.services 中
const bridge = (window as any).services as FSBridge;

export const fsBridge = {
  async rename(oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> {
    if (!bridge) {
      console.error('Bridge not found. Make sure preload script is loaded.');
      return { success: false, error: 'Bridge not found' };
    }
    try {
      await bridge.rename(oldPath, newPath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async exists(targetPath: string): Promise<boolean> {
    if (!bridge || typeof bridge.exists !== 'function') {
      return false;
    }

    try {
      return await bridge.exists(targetPath);
    } catch {
      return false;
    }
  },

  async getStats(targetPath: string): Promise<{
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
  } | null> {
    if (!bridge || typeof bridge.getStats !== 'function') {
      return null;
    }

    try {
      return await bridge.getStats(targetPath);
    } catch {
      return null;
    }
  },

  // 其他能力可以在此扩展
};
