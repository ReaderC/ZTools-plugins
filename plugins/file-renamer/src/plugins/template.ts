import type { PluginActionDefinition, WorkflowContext } from '../core/types';

export const templatePlugin: PluginActionDefinition = {
  id: 'template',
  name: '模板替换',
  description: '使用占位符定义复杂的文件名结构（如 [NAME]_[INDEX]）。',
  configSchema: {
    template: { 
      type: 'string', 
      label: '模板内容', 
      default: '[NAME]_[INDEX]',
      description: '支持：[NAME], [EXT], [INDEX], [YYYY], [MM], [DD]，示例：[NAME]_[YYYY][MM][DD]_[INDEX]'
    }
  },
  apply: (currentName: string, config: any, context: WorkflowContext) => {
    const { template = '[NAME]' } = config;
    const lastDot = currentName.lastIndexOf('.');
    const name = lastDot === -1 ? currentName : currentName.substring(0, lastDot);
    const ext = lastDot === -1 ? '' : currentName.substring(lastDot);
    
    const date = new Date(context.file.lastModified);
    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');

    return template
      .replace(/\[NAME\]/gi, name)
      .replace(/\[EXT\]/gi, ext.replace(/^\./, ''))
      .replace(/\[INDEX\]/gi, (context.index + 1).toString())
      .replace(/\[YYYY\]/gi, yyyy)
      .replace(/\[MM\]/gi, mm)
      .replace(/\[DD\]/gi, dd);
  }
};
