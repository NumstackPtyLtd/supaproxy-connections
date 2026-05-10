// Types — the public interface for building custom connection plugins
export type {
  ConnectionPlugin,
  McpConnection,
  ToolDefinition,
  ToolCallResult,
  TestResult,
  ConfigField,
} from './types.js'

// Registry — register and discover connection plugins
export { registry } from './registry.js'
