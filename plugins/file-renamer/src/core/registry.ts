import type { PluginActionDefinition } from './types';

class PluginRegistry {
  private plugins: Map<string, PluginActionDefinition> = new Map();

  register(plugin: PluginActionDefinition) {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin with id ${plugin.id} is already registered.`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): PluginActionDefinition | undefined {
    return this.plugins.get(id);
  }

  getAll(): PluginActionDefinition[] {
    return Array.from(this.plugins.values());
  }
}

export const registry = new PluginRegistry();
