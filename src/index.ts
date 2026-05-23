// Types: the public interface for building custom connection plugins
export type {
  ConnectionPlugin,
  McpConnection,
  ToolDefinition,
  ToolCallResult,
  TestResult,
  ConfigField,
} from './types.js'

// Errors: typed error classes for connection operations
export { PluginNotFoundError } from './errors.js'

// Registry: register and discover connection plugins
export { registry } from './registry.js'
