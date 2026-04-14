import type { PluginActionDefinition } from '../core/types';

export const addPrefixSuffixPlugin: PluginActionDefinition = {
  id: 'add-prefix-suffix',
  name: '添加前后缀',
  description: '在文件名的开头或结尾添加特定文本。',
  configSchema: {
    prefix: {
      type: 'string',
      label: '前缀',
      default: '',
      description: '会添加在文件名最前面，不会影响扩展名。'
    },
    suffix: {
      type: 'string',
      label: '后缀',
      default: '',
      description: '会添加在文件名末尾，并保留原扩展名。'
    }
  },
  apply: (currentName: string, config: any) => {
    const { prefix = '', suffix = '' } = config;
    // 分离文件名和扩展名（为了不给扩展名加后缀）
    const lastDot = currentName.lastIndexOf('.');
    if (lastDot === -1) return `${prefix}${currentName}${suffix}`;
    
    const name = currentName.substring(0, lastDot);
    const ext = currentName.substring(lastDot);
    return `${prefix}${name}${suffix}${ext}`;
  }
};
