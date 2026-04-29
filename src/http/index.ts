import type { ConnectionPlugin, McpConnection, ToolDefinition, ToolCallResult, TestResult } from '../types.js'

interface JsonRpcResponse {
  jsonrpc: string
  id: number
  result?: Record<string, unknown>
  error?: { message: string; code?: number }
}

async function jsonRpc(url: string, method: string, params: Record<string, unknown>, headers: Record<string, string>): Promise<Record<string, unknown>> {
  const reqId = `sp-${method.replace('/', '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'x-moo-request-id': reqId },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    signal: AbortSignal.timeout(30000),
  })
  const data = await res.json() as JsonRpcResponse
  if (data.error) throw new Error(`MCP error: ${data.error.message}`)
  return data.result || {}
}

class HttpMcpConnection implements McpConnection {
  constructor(
    readonly tools: ToolDefinition[],
    private readonly url: string,
    private readonly headers: Record<string, string>,
  ) {}

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    const data = await jsonRpc(this.url, 'tools/call', { name, arguments: args }, this.headers)
    const result = data as unknown as ToolCallResult
    return { content: result?.content || [], isError: Boolean(result?.isError) }
  }

  async close(): Promise<void> { /* HTTP connections are stateless */ }
}

async function initAndListTools(url: string, headers: Record<string, string>, clientName: string): Promise<{ tools: ToolDefinition[]; server: string }> {
  const initResult = await jsonRpc(url, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: clientName, version: '1.0.0' },
  }, headers)

  const toolsResult = await jsonRpc(url, 'tools/list', {}, headers) as {
    tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>
  }

  const tools: ToolDefinition[] = (toolsResult.tools || []).map(t => ({
    name: t.name,
    description: t.description || '',
    inputSchema: t.inputSchema || { type: 'object', properties: {} },
  }))

  const serverInfo = initResult.serverInfo as Record<string, unknown> | undefined
  return { tools, server: (serverInfo?.name as string) || 'unknown' }
}

export const httpPlugin: ConnectionPlugin = {
  type: 'http',
  name: 'Cloud / HTTP',
  description: 'Connect to an MCP server over HTTP (Streamable HTTP transport).',

  configSchema: {
    fields: [
      { name: 'url', label: 'Server URL', type: 'text', required: true, placeholder: 'https://mcp.example.com', helpText: 'The MCP server endpoint' },
      { name: 'name', label: 'Connection name', type: 'text', required: true, placeholder: 'order-service', helpText: 'A short identifier for this connection' },
    ],
  },

  async test(config): Promise<TestResult> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const { tools, server } = await initAndListTools(config.url, headers, 'supaproxy-test')
      return { ok: true, tools: tools.length, server, toolNames: tools.map(t => t.name) }
    } catch (err) {
      return { ok: false, error: `Connection failed: ${(err as Error).message}` }
    }
  },

  async connect(config): Promise<McpConnection> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const { tools } = await initAndListTools(config.url, headers, config.name || 'supaproxy')
    return new HttpMcpConnection(tools, config.url, headers)
  },
}
