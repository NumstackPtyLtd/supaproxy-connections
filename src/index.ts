// Types
export type {
  ConnectionPlugin,
  McpConnection,
  ToolDefinition,
  ToolCallResult,
  TestResult,
  ConfigField,
} from './types.js'

// Registry
export { registry } from './registry.js'

// Plugins
export { httpPlugin } from './http/index.js'
export { stdioPlugin } from './stdio/index.js'
export { authenticatedPlugin } from './authenticated/index.js'

// Auto-register all built-in plugins
import { registry } from './registry.js'
import { httpPlugin } from './http/index.js'
import { stdioPlugin } from './stdio/index.js'
import { authenticatedPlugin } from './authenticated/index.js'

registry.register(httpPlugin)
registry.register(stdioPlugin)
registry.register(authenticatedPlugin)
