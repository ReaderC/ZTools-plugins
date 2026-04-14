import type { PluginActionDefinition } from '../core/types';

export const replacePlugin: PluginActionDefinition = {
  id: 'replace',
  name: '搜索与替换',
  description: '搜索文件名中的特定文本并替换为新内容（支持正则）。',
  configSchema: {
    find: {
      type: 'string',
      label: '查找内容',
      default: '',
      description: '输入要匹配的文本，留空时将不做任何替换。'
    },
    replace: {
      type: 'string',
      label: '替换为',
      default: '',
      description: '将匹配到的内容替换为这里的文本。'
    },
    isRegex: {
      type: 'boolean',
      label: '使用正则表达式',
      default: false,
      description: '开启后可使用正则语法，例如 ^IMG_ 或 \\d+。'
    },
    caseSensitive: {
      type: 'boolean',
      label: '区分大小写',
      default: false,
      description: '关闭时会忽略大小写差异。'
    }
  },
  apply: (currentName: string, config: any) => {
    const { find, replace, isRegex, caseSensitive } = config;
    if (!find) return currentName;

    try {
      if (isRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(find, flags);
        return currentName.replace(regex, replace);
      } else {
        if (!caseSensitive) {
          // 简单的非正则不区分大小写替换
          const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedFind, 'gi');
          return currentName.replace(regex, replace);
        }
        return currentName.split(find).join(replace);
      }
    } catch (e) {
      return currentName;
    }
  }
};
