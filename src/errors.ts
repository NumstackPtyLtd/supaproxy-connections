export class PluginNotFoundError extends Error {
  constructor(type: string) {
    super(`Connection plugin not found: ${type}`)
    this.name = 'PluginNotFoundError'
  }
}
