import type { PluginActionDefinition } from '../core/types';

const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

function splitNameAndExt(currentName: string): { name: string; ext: string } {
  const lastDot = currentName.lastIndexOf('.');
  if (lastDot <= 0) {
    return { name: currentName, ext: '' };
  }

  return {
    name: currentName.slice(0, lastDot),
    ext: currentName.slice(lastDot)
  };
}

export const cleanNamePlugin: PluginActionDefinition = {
  id: 'clean-name',
  name: '文件名清洗',
  description: '清理空白、非法字符和多余点号，减少重命名失败。',
  configSchema: {
    trim: {
      type: 'boolean',
      label: '去除首尾空白',
      default: true,
      description: '移除文件名前后的空格和制表符。'
    },
    collapseWhitespace: {
      type: 'boolean',
      label: '合并连续空白',
      default: true,
      description: '把多个连续空格折叠为一个空格。'
    },
    replaceIllegal: {
      type: 'boolean',
      label: '替换非法字符',
      default: true,
      description: '替换 Windows 不允许的字符（如 < > : " / \\ | ? *）。'
    },
    illegalReplacement: {
      type: 'string',
      label: '非法字符替换为',
      default: '_',
      description: '可留空表示直接删除非法字符。'
    },
    normalizeDots: {
      type: 'boolean',
      label: '规范连续点号',
      default: true,
      description: '将多个连续点号合并为一个，并清理首尾点号。'
    }
  },
  apply: (currentName: string, config: any) => {
    const {
      trim = true,
      collapseWhitespace = true,
      replaceIllegal = true,
      illegalReplacement = '_',
      normalizeDots = true
    } = config || {};

    const { name, ext } = splitNameAndExt(currentName);
    let next = name;

    if (trim) {
      next = next.trim();
    }

    if (collapseWhitespace) {
      next = next.replace(/[\s\u3000]+/g, ' ');
    }

    if (normalizeDots) {
      next = next.replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');
    }

    if (replaceIllegal) {
      const replacement = String(illegalReplacement ?? '').replace(INVALID_FILE_NAME_CHARS, '');
      next = next.replace(INVALID_FILE_NAME_CHARS, replacement);
    }

    if (!next) {
      next = 'untitled';
    }

    return `${next}${ext}`;
  }
};
