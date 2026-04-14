import type { PluginActionDefinition, WorkflowContext } from '../core/types';

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

function normalizeKey(name: string, caseSensitive: boolean): string {
  return caseSensitive ? name : name.toLowerCase();
}

function buildCandidate(
  baseName: string,
  ext: string,
  serial: number,
  style: string,
  padding: number
): string {
  const serialString = String(serial).padStart(Math.max(0, padding), '0');

  if (style === 'dash') {
    return `${baseName}-${serialString}${ext}`;
  }

  if (style === 'underscore') {
    return `${baseName}_${serialString}${ext}`;
  }

  return `${baseName}(${serialString})${ext}`;
}

const runState = {
  seen: new Set<string>(),
  nextSerialByOriginal: new Map<string, number>()
};

export const uniqueifyPlugin: PluginActionDefinition = {
  id: 'uniqueify',
  name: '智能去重',
  description: '当目标文件名重复时自动追加序号，避免冲突。',
  configSchema: {
    style: {
      type: 'select',
      label: '追加样式',
      default: 'paren',
      description: '重复时序号的展示样式。',
      options: [
        { label: '(1) 样式', value: 'paren' },
        { label: '-1 样式', value: 'dash' },
        { label: '_1 样式', value: 'underscore' }
      ]
    },
    start: {
      type: 'number',
      label: '起始序号',
      default: 1,
      description: '首次冲突时使用的序号。'
    },
    padding: {
      type: 'number',
      label: '补零位数',
      default: 0,
      description: '设置为 2 时会显示 01、02。'
    },
    caseSensitive: {
      type: 'boolean',
      label: '区分大小写',
      default: false,
      description: '关闭后会把 File 和 file 视为同名。'
    }
  },
  apply: (currentName: string, config: any, context: WorkflowContext) => {
    if (context.index === 0) {
      runState.seen.clear();
      runState.nextSerialByOriginal.clear();
    }

    const {
      style = 'paren',
      start = 1,
      padding = 0,
      caseSensitive = false
    } = config || {};

    const normalizedCurrent = normalizeKey(currentName, Boolean(caseSensitive));
    if (!runState.seen.has(normalizedCurrent)) {
      runState.seen.add(normalizedCurrent);
      return currentName;
    }

    const { name, ext } = splitNameAndExt(currentName);
    const originalKey = normalizeKey(currentName, Boolean(caseSensitive));

    const safeStart = Number.isFinite(Number(start)) ? Number(start) : 1;
    const safePadding = Number.isFinite(Number(padding))
      ? Math.max(0, Math.floor(Number(padding)))
      : 0;

    let serial = runState.nextSerialByOriginal.get(originalKey) ?? safeStart;

    while (true) {
      const candidate = buildCandidate(name, ext, serial, String(style), safePadding);
      const candidateKey = normalizeKey(candidate, Boolean(caseSensitive));
      if (!runState.seen.has(candidateKey)) {
        runState.seen.add(candidateKey);
        runState.nextSerialByOriginal.set(originalKey, serial + 1);
        return candidate;
      }
      serial += 1;
    }
  }
};
