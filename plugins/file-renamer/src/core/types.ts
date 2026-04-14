export interface FileItem {
  id: string;
  originalName: string;
  newName: string;
  path: string;
  lastRenamedFromName?: string;
  lastRenamedFromPath?: string;
  size: number;
  lastModified: number;
  isDirectory: boolean;
  status: 'pending' | 'success' | 'error' | 'warning';
  errorMessage?: string;
  extension: string;
}

export interface WorkflowContext {
  index: number;
  total: number;
  file: FileItem;
}

export interface PluginActionDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  // 用于 UI 渲染的配置 Schema 或组件名称
  configSchema?: any;
  // 处理逻辑
  apply: (currentName: string, config: any, context: WorkflowContext) => string;
}

export interface ActionInstance {
  instanceId: string;
  pluginId: string;
  config: any;
  enabled: boolean;
}

export interface RenamingWorkflow {
  actions: ActionInstance[];
}
