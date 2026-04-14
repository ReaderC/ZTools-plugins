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

function sanitizeExtension(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/^\.+/, '')
    .replace(INVALID_FILE_NAME_CHARS, '');
}

export const extensionTransformPlugin: PluginActionDefinition = {
  id: 'extension-transform',
  name: '扩展名处理',
  description: '统一扩展名大小写或直接改为指定扩展名。',
  configSchema: {
    mode: {
      type: 'select',
      label: '处理模式',
      default: 'lower',
      description: '选择扩展名的处理方式。',
      options: [
        { label: '转为小写', value: 'lower' },
        { label: '转为大写', value: 'upper' },
        { label: '改为指定扩展名', value: 'set' },
        { label: '保持不变', value: 'keep' }
      ]
    },
    customExtension: {
      type: 'string',
      label: '指定扩展名',
      default: '',
      description: '仅在“改为指定扩展名”时生效，例如 jpg 或 md。'
    }
  },
  apply: (currentName: string, config: any) => {
    const { mode = 'lower', customExtension = '' } = config || {};
    const { name, ext } = splitNameAndExt(currentName);

    if (mode === 'keep') {
      return currentName;
    }

    if (mode === 'set') {
      const sanitized = sanitizeExtension(customExtension);
      if (!sanitized) {
        return currentName;
      }
      return `${name}.${sanitized}`;
    }

    if (!ext) {
      return currentName;
    }

    const bareExt = ext.slice(1);
    if (mode === 'upper') {
      return `${name}.${bareExt.toUpperCase()}`;
    }

    return `${name}.${bareExt.toLowerCase()}`;
  }
};
