import type { PluginActionDefinition } from '../core/types';

export const caseTransformPlugin: PluginActionDefinition = {
  id: 'case-transform',
  name: '大小写转换',
  description: '快速将文件名转换为全大写、全小写或首字母大写等格式。',
  configSchema: {
    mode: { 
      type: 'select', 
      label: '转换模式', 
      description: '选择目标命名风格，扩展名会自动保留。',
      options: [
        { label: '全部小写 (lower case)', value: 'lower' },
        { label: '全部大写 (UPPER CASE)', value: 'upper' },
        { label: '首字母大写 (Title Case)', value: 'title' },
        { label: '驼峰命名 (camelCase)', value: 'camel' },
        { label: '蛇形命名 (snake_case)', value: 'snake' }
      ],
      default: 'lower'
    }
  },
  apply: (currentName: string, config: any) => {
    const { mode } = config;
    const lastDot = currentName.lastIndexOf('.');
    const name = lastDot === -1 ? currentName : currentName.substring(0, lastDot);
    const ext = lastDot === -1 ? '' : currentName.substring(lastDot);

    let transformed = name;
    switch (mode) {
      case 'lower':
        transformed = name.toLowerCase();
        break;
      case 'upper':
        transformed = name.toUpperCase();
        break;
      case 'title':
        transformed = name.replace(/\b\w/g, char => char.toUpperCase());
        break;
      case 'camel':
        transformed = name
          .split(/[-_\s]+/)
          .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('');
        break;
      case 'snake':
        transformed = name
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/[-\s]+/g, '_')
          .toLowerCase();
        break;
    }
    return `${transformed}${ext}`;
  }
};
