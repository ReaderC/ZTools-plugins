import type { PluginActionDefinition, WorkflowContext } from '../core/types';

export const sequencePlugin: PluginActionDefinition = {
  id: 'sequence',
  name: '智能序列号',
  description: '在文件名中插入自动递增的序列号。',
  configSchema: {
    start: {
      type: 'number',
      label: '起始数字',
      default: 1,
      description: '第一个文件使用的序号。'
    },
    step: {
      type: 'number',
      label: '步长',
      default: 1,
      description: '每个文件递增的数值，例如 2 会得到 1,3,5。'
    },
    padding: {
      type: 'number',
      label: '位数补齐',
      default: 2,
      description: '不足位数时左侧补零，例如 2 位会显示为 01。'
    },
    position: { 
      type: 'select', 
      label: '插入位置', 
      description: '序号位置或直接替换。',
      options: [
        { label: '前缀', value: 'prefix' },
        { label: '后缀', value: 'suffix' },
        { label: '直接替换文件名', value: 'replace' }
      ],
      default: 'suffix'
    }
  },
  apply: (currentName: string, config: any, context: WorkflowContext) => {
    const rawStart = Number(config?.start ?? 1);
    const rawStep = Number(config?.step ?? 1);
    const rawPadding = Number(config?.padding ?? 1);
    const position = ['prefix', 'suffix', 'replace'].includes(config?.position)
      ? config.position
      : 'suffix';

    const start = Number.isFinite(rawStart) ? rawStart : 1;
    const step = Number.isFinite(rawStep) ? rawStep : 1;
    const padding = Number.isFinite(rawPadding)
      ? Math.max(1, Math.floor(rawPadding))
      : 1;

    const num = start + (context.index * step);
    const numStr = num.toString().padStart(padding, '0');

    const lastDot = currentName.lastIndexOf('.');
    const name = lastDot === -1 ? currentName : currentName.substring(0, lastDot);
    const ext = lastDot === -1 ? '' : currentName.substring(lastDot);

    if (position === 'replace') {
      return `${numStr}${ext}`;
    }

    if (position === 'prefix') {
      return `${numStr}${name}${ext}`;
    } else {
      return `${name}${numStr}${ext}`;
    }
  }
};
