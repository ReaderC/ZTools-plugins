import type { PluginActionDefinition, WorkflowContext } from '../core/types';

export const timestampPlugin: PluginActionDefinition = {
  id: 'timestamp',
  name: '按时间命名',
  description: '将文件的最后修改时间或当前时间应用到文件名。',
  configSchema: {
    format: { 
      type: 'string', 
      label: '日期格式', 
      default: 'YYYY-MM-DD_HHmmss',
      description: '支持 YYYY/MM/DD/HH/mm/ss 占位符，例如 YYYY-MM-DD。'
    },
    useCurrentTime: {
      type: 'boolean',
      label: '使用当前时间',
      default: false,
      description: '关闭时使用文件修改时间，开启时使用当前系统时间。'
    }
  },
  apply: (currentName: string, config: any, context: WorkflowContext) => {
    const { format = 'YYYY-MM-DD', useCurrentTime = false } = config;
    const date = useCurrentTime ? new Date() : new Date(context.file.lastModified);
    
    const lastDot = currentName.lastIndexOf('.');
    const ext = lastDot === -1 ? '' : currentName.substring(lastDot);

    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const yyyy = date.getFullYear().toString();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());

    const result = format
      .replace(/YYYY/g, yyyy)
      .replace(/MM/g, mm)
      .replace(/DD/g, dd)
      .replace(/HH/g, hh)
      .replace(/mm/g, min)
      .replace(/ss/g, ss);

    return `${result}${ext}`;
  }
};
