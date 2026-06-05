import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { ConnectionPlugin, McpConnection, ToolDefinition, ToolCallResult, TestResult } from '../types.js'

class SseMcpConnection implements McpConnection {
  constructor(
    readonly tools: ToolDefinition[],
    private readonly client: Client,
    private readonly transport: SSEClientTransport,
  ) {}

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    const result = await this.client.callTool({ name, arguments: args })
    const content = result.content as Array<{ type: string; text?: string }> || []
    return { content, isError: Boolean(result.isError) }
  }

  async close(): Promise<void> {
    try { await this.client.close() } catch { /* ignore */ }
  }
}

async function connectSse(
  url: string,
  clientName: string,
  headers?: Record<string, string>,
): Promise<{ connection: SseMcpConnection }> {
  const hasHeaders = headers && Object.keys(headers).length > 0
  const requestInit: RequestInit = hasHeaders ? { headers } : {}

  // SSE GET requests need a custom fetch to inject auth headers
  const sseInit = hasHeaders
    ? { fetch: (input: string | URL | Request, init?: RequestInit) => fetch(input, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string> || {}) } }) }
    : undefined

  const transport = new SSEClientTransport(new URL(url), {
    requestInit,
    eventSourceInit: sseInit,
  })

  const client = new Client({ name: clientName, version: '1.0.0' })
  await client.connect(transport)

  const toolsResult = await client.listTools()
  const tools: ToolDefinition[] = toolsResult.tools.map(t => ({
    name: t.name,
    description: t.description || '',
    inputSchema: t.inputSchema,
  }))

  return { connection: new SseMcpConnection(tools, client, transport) }
}

function parseHeaders(config: Record<string, string>): Record<string, string> | undefined {
  if (!config.headers) return undefined
  try {
    return JSON.parse(config.headers) as Record<string, string>
  } catch {
    return undefined
  }
}

export const ssePlugin: ConnectionPlugin = {
  type: 'sse',
  name: 'SSE',
  description: 'Connect to an MCP server over Server-Sent Events (SSE transport).',

  configSchema: {
    fields: [
      { name: 'url', label: 'Server URL', type: 'text', required: true, placeholder: 'https://mcp.example.com/sse', helpText: 'The MCP SSE endpoint' },
      { name: 'name', label: 'Connection name', type: 'text', required: true, placeholder: 'order-service', helpText: 'A short identifier for this connection' },
      { name: 'headers', label: 'Headers', type: 'text', required: false, placeholder: '{"Authorization": "Bearer ..."}', helpText: 'Optional JSON object of additional HTTP headers' },
    ],
  },

  async test(config): Promise<TestResult> {
    try {
      const headers = parseHeaders(config)
      const { connection } = await connectSse(config.url, 'supaproxy-test', headers)
      const result: TestResult = { ok: true, tools: connection.tools.length, toolNames: connection.tools.map(t => t.name) }
      await connection.close()
      return result
    } catch (err) {
      const raw = (err as Error).message
      const error = raw === 'fetch failed'
        ? 'Could not reach the server. Check that the URL is correct and the service is running.'
        : `Connection failed: ${raw}`
      return { ok: false, error }
    }
  },

  async connect(config): Promise<McpConnection> {
    const headers = parseHeaders(config)
    const { connection } = await connectSse(config.url, config.name || 'supaproxy', headers)
    return connection
  },
}
