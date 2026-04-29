/** Field definition for connection config forms. */
export interface ConfigField {
  name: string
  label: string
  type: 'text' | 'password' | 'select'
  required: boolean
  placeholder?: string
  helpText?: string
  options?: string[]
}

/** Tool discovered from an MCP server. */
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

/** Result of calling a tool. */
export interface ToolCallResult {
  content: Array<{ type: string; text?: string }>
  isError: boolean
}

/** A live connection to an MCP server. */
export interface McpConnection {
  readonly tools: ToolDefinition[]
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>
  close(): Promise<void>
}

/** Test result from probing an MCP server. */
export interface TestResult {
  ok: boolean
  tools?: number
  toolNames?: string[]
  server?: string
  error?: string
}

/**
 * ConnectionPlugin — the contract every connection type must implement.
 *
 * Adding a new connection type = one file implementing this interface.
 * The dashboard auto-discovers connection types via the registry.
 */
export interface ConnectionPlugin {
  /** Unique type identifier: 'http', 'stdio', 'authenticated', 'oauth', 'sse' */
  readonly type: string

  /** Human-readable name. */
  readonly name: string

  /** Short description. */
  readonly description: string

  /** Config schema — dashboard renders forms from this. */
  readonly configSchema: { fields: ConfigField[] }

  /** Test connectivity and discover tools. */
  test(config: Record<string, string>): Promise<TestResult>

  /** Establish a live connection. */
  connect(config: Record<string, string>): Promise<McpConnection>
}
