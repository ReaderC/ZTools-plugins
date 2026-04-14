import type { FileItem, ActionInstance, WorkflowContext } from './types';
import { registry } from './registry';

/**
 * 核心引擎：将工作流应用到文件列表
 */
export function applyWorkflow(
  files: FileItem[],
  workflow: ActionInstance[]
): FileItem[] {
  return files.map((file, index) => {
    let currentNewName = file.originalName;
    const total = files.length;
    let errorMessage: string | undefined;

    // 按顺序应用所有启用的动作
    for (const instance of workflow) {
      if (!instance.enabled) continue;

      const plugin = registry.get(instance.pluginId);
      if (!plugin) {
        console.warn(`Plugin ${instance.pluginId} not found.`);
        errorMessage = `Plugin ${instance.pluginId} not found.`;
        continue;
      }

      const context: WorkflowContext = {
        index,
        total,
        file
      };

      try {
        currentNewName = plugin.apply(currentNewName, instance.config, context);
      } catch (error) {
        console.error(`Error applying plugin ${instance.pluginId}:`, error);
        errorMessage = error instanceof Error ? error.message : String(error);
        break;
      }
    }

    const status = errorMessage
      ? 'error'
      : currentNewName === file.originalName
        ? 'pending'
        : 'warning';

    return {
      ...file,
      newName: currentNewName,
      status,
      errorMessage
    };
  });
}
