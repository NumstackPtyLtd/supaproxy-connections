# @supaproxy/connections

[![npm version](https://img.shields.io/npm/v/@supaproxy/connections)](https://www.npmjs.com/package/@supaproxy/connections)
[![license](https://img.shields.io/npm/l/@supaproxy/connections)](./LICENSE)

Plugin package for [SupaProxy](https://supaproxy.com) MCP connection types. Connections are the bridge between SupaProxy and external tool servers using the [Model Context Protocol](https://modelcontextprotocol.io).

Each connection plugin handles connecting to an MCP server, discovering available tools, and calling those tools during AI conversations.

## Installation

```bash
npm install @supaproxy/connections
```

## Quick start

```typescript
import { registry } from '@supaproxy/connections'

// All built-in plugins are auto-registered on import.

// List available connection types
console.log(registry.types()) // ['http', 'stdio', 'authenticated']

// Test connectivity and discover tools
const http = registry.get('http')
const result = await http.test({ url: 'https://mcp.example.com/sse' })

if (result.ok) {
  console.log(`Found ${result.tools} tools: ${result.toolNames?.join(', ')}`)
}

// Establish a live connection
const connection = await http.connect({ url: 'https://mcp.example.com/sse' })

// Discover tools
console.log(connection.tools)

// Call a tool
const result = await connection.callTool('search', { query: 'hello' })

// Close the connection
await connection.close()
```

## API reference

### `ConnectionPlugin`

The interface every connection type must implement.

```typescript
interface ConnectionPlugin {
  readonly type: string          // Unique identifier: 'http', 'stdio', etc.
  readonly name: string          // Human-readable name
  readonly description: string   // Short description
  readonly configSchema: { fields: ConfigField[] }

  test(config: Record<string, string>): Promise<TestResult>
  connect(config: Record<string, string>): Promise<McpConnection>
}
```

### `McpConnection`

A live connection to an MCP server.

```typescript
interface McpConnection {
  readonly tools: ToolDefinition[]
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>
  close(): Promise<void>
}
```

### `ToolDefinition`

```typescript
interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
```

### `ToolCallResult`

```typescript
interface ToolCallResult {
  content: Array<{ type: string; text?: string }>
  isError: boolean
}
```

### `TestResult`

```typescript
interface TestResult {
  ok: boolean
  tools?: number          // Number of tools discovered
  toolNames?: string[]    // Names of discovered tools
  server?: string         // Server identifier
  error?: string          // Error message if test failed
}
```

### `ConfigField`

```typescript
interface ConfigField {
  name: string
  label: string
  type: 'text' | 'password' | 'select'
  required: boolean
  placeholder?: string
  helpText?: string
  options?: string[]
}
```

### Registry methods

| Method | Returns | Description |
|--------|---------|-------------|
| `registry.list()` | `ConnectionPlugin[]` | All registered plugins |
| `registry.get(type)` | `ConnectionPlugin` | Get plugin by type (throws if not found) |
| `registry.has(type)` | `boolean` | Check if a plugin type is registered |
| `registry.types()` | `string[]` | List all registered type identifiers |
| `registry.schemas()` | `Array<{type, name, description, configSchema}>` | Config schemas for dashboard forms |
| `registry.register(plugin)` | `void` | Register a custom plugin |

## Available plugins

| Plugin | Type | Description |
|--------|------|-------------|
| HTTP | `http` | Connects to MCP servers over HTTP (Streamable HTTP / SSE transport). |
| STDIO | `stdio` | Connects to MCP servers via standard input/output. For locally running tool servers. |
| Authenticated | `authenticated` | HTTP connection with authentication headers. Supports API key and bearer token auth for secured MCP servers. |

## Adding a new connection type

Create a file that implements `ConnectionPlugin`:

```typescript
import type { ConnectionPlugin, McpConnection, TestResult } from '@supaproxy/connections'

export const myPlugin: ConnectionPlugin = {
  type: 'my-transport',
  name: 'My Transport',
  description: 'Custom MCP transport',
  configSchema: {
    fields: [
      { name: 'url', label: 'Server URL', type: 'text', required: true },
    ],
  },

  async test(config) {
    // Probe the server and discover tools
    return { ok: true, tools: 3, toolNames: ['a', 'b', 'c'] }
  },

  async connect(config) {
    // Establish a live connection
    return {
      tools: [],
      async callTool(name, args) {
        return { content: [{ type: 'text', text: 'result' }], isError: false }
      },
      async close() {
        // Cleanup
      },
    }
  },
}
```

Then register it:

```typescript
import { registry } from '@supaproxy/connections'
import { myPlugin } from './my-plugin.js'

registry.register(myPlugin)
```

## Contributing

See the [SupaProxy contributing guide](https://github.com/NumstackPtyLtd/supaproxy) for development workflow, code standards, and PR process.

## Documentation

Full documentation at [docs.supaproxy.cloud](https://docs.supaproxy.cloud/plugins/connections).

## License

MIT
