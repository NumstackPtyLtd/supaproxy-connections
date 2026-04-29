import pino from 'pino'
import type { ConnectionPlugin } from './types.js'

const log = pino({ name: 'connection-registry' })

class PluginRegistry {
  /** @internal */
  readonly plugins = new Map<string, ConnectionPlugin>()

  register(plugin: ConnectionPlugin): void {
    if (this.plugins.has(plugin.type)) {
      log.warn({ type: plugin.type }, 'Plugin already registered, replacing')
    }
    this.plugins.set(plugin.type, plugin)
    log.info({ type: plugin.type, name: plugin.name }, 'Connection plugin registered')
  }

  get(type: string): ConnectionPlugin {
    const plugin = this.plugins.get(type)
    if (!plugin) throw new Error(`Connection plugin not found: ${type}`)
    return plugin
  }

  has(type: string): boolean {
    return this.plugins.has(type)
  }

  types(): string[] {
    return Array.from(this.plugins.keys())
  }

  list(): ConnectionPlugin[] {
    return Array.from(this.plugins.values())
  }

  schemas(): Array<{
    type: string
    name: string
    description: string
    configSchema: ConnectionPlugin['configSchema']
  }> {
    return this.list().map((p) => ({
      type: p.type,
      name: p.name,
      description: p.description,
      configSchema: p.configSchema,
    }))
  }
}

export const registry = new PluginRegistry()
