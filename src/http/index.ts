import type { ConnectionPlugin, McpConnection, ToolDefinition, ToolCallResult, TestResult } from '../types.js'

const JSONRPC_VERSION = '2.0'
const MCP_PROTOCOL_VERSION = '2024-11-05'
const DEFAULT_TIMEOUT_MS = 30_000

interface JsonRpcResponse {
  jsonrpc: string
  id: number
  result?: Record<string, unknown>
  error?: string | { message: string; code?: number }
}

interface HttpConnectionOptions {
  timeoutMs?: number
  headers?: Record<string, string>
}

function requestId(method: string): number {
  return Date.now()
}

async function jsonRpc(
  url: string,
  method: string,
  params: Record<string, unknown>,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: JSONRPC_VERSION, id: requestId(method), method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const data = await res.json() as JsonRpcResponse
  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error)
    throw new Error(`MCP error: ${msg}`)
  }
  return data.result || {}
}

class HttpMcpConnection implements McpConnection {
  constructor(
    readonly tools: ToolDefinition[],
    private readonly url: string,
    private readonly headers: Record<string, string>,
    private readonly timeoutMs: number,
  ) {}

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    const data = await jsonRpc(this.url, 'tools/call', { name, arguments: args }, this.headers, this.timeoutMs)
    const result = data as unknown as ToolCallResult
    return { content: result?.content || [], isError: Boolean(result?.isError) }
  }

  async close(): Promise<void> { /* HTTP connections are stateless */ }
}

async function initAndListTools(
  url: string,
  headers: Record<string, string>,
  clientName: string,
  timeoutMs: number,
): Promise<{ tools: ToolDefinition[]; server: string }> {
  const initResult = await jsonRpc(url, 'initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: clientName, version: '1.0.0' },
  }, headers, timeoutMs)

  const toolsResult = await jsonRpc(url, 'tools/list', {}, headers, timeoutMs) as {
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

function buildHeaders(config: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  // Parse additional headers from config (JSON string of key-value pairs)
  if (config.headers) {
    try {
      const extra = JSON.parse(config.headers) as Record<string, string>
      Object.assign(headers, extra)
    } catch {
      // Headers not valid JSON; ignore
    }
  }

  return headers
}

export const httpPlugin: ConnectionPlugin = {
  type: 'http',
  name: 'Cloud / HTTP',
  description: 'Connect to an MCP server over HTTP (Streamable HTTP transport).',

  configSchema: {
    fields: [
      { name: 'url', label: 'Server URL', type: 'text', required: true, placeholder: 'https://mcp.example.com', helpText: 'The MCP server endpoint' },
      { name: 'name', label: 'Connection name', type: 'text', required: true, placeholder: 'order-service', helpText: 'A short identifier for this connection' },
      { name: 'headers', label: 'Headers', type: 'text', required: false, placeholder: '{"Authorization": "Bearer ..."}', helpText: 'Optional JSON object of additional HTTP headers' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'text', required: false, placeholder: '30000', helpText: 'Request timeout in milliseconds' },
    ],
  },

  async test(config): Promise<TestResult> {
    try {
      const headers = buildHeaders(config)
      const timeoutMs = config.timeout ? parseInt(config.timeout, 10) : DEFAULT_TIMEOUT_MS
      const { tools, server } = await initAndListTools(config.url, headers, 'supaproxy-test', timeoutMs)
      return { ok: true, tools: tools.length, server, toolNames: tools.map(t => t.name) }
    } catch (err) {
      return { ok: false, error: `Connection failed: ${(err as Error).message}` }
    }
  },

  async connect(config): Promise<McpConnection> {
    const headers = buildHeaders(config)
    const timeoutMs = config.timeout ? parseInt(config.timeout, 10) : DEFAULT_TIMEOUT_MS
    const { tools } = await initAndListTools(config.url, headers, config.name || 'supaproxy', timeoutMs)
    return new HttpMcpConnection(tools, config.url, headers, timeoutMs)
  },
}
