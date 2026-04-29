import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { ConnectionPlugin, McpConnection, ToolDefinition, ToolCallResult, TestResult } from '../types.js'

class StdioMcpConnection implements McpConnection {
  constructor(
    readonly tools: ToolDefinition[],
    private readonly client: Client,
    private readonly transport: StdioClientTransport,
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

async function connectStdio(command: string, args: string[], clientName: string): Promise<{ connection: StdioMcpConnection }> {
  const transport = new StdioClientTransport({
    command,
    args,
    env: process.env as Record<string, string>,
  })

  const client = new Client({ name: clientName, version: '1.0.0' })
  await client.connect(transport)

  const toolsResult = await client.listTools()
  const tools: ToolDefinition[] = toolsResult.tools.map(t => ({
    name: t.name,
    description: t.description || '',
    inputSchema: t.inputSchema,
  }))

  return { connection: new StdioMcpConnection(tools, client, transport) }
}

export const stdioPlugin: ConnectionPlugin = {
  type: 'stdio',
  name: 'Self-hosted / STDIO',
  description: 'Connect to an MCP server running as a local subprocess.',

  configSchema: {
    fields: [
      { name: 'name', label: 'Connection name', type: 'text', required: true, placeholder: 'order-service', helpText: 'A short identifier for this connection' },
      { name: 'command', label: 'Command', type: 'text', required: true, placeholder: 'node', helpText: 'The executable to spawn the MCP server process' },
      { name: 'args', label: 'Arguments', type: 'text', required: false, placeholder: '/opt/services/order-mcp/index.js', helpText: 'Space-separated arguments' },
    ],
  },

  async test(config): Promise<TestResult> {
    try {
      const args = (config.args || '').split(/\s+/).filter(Boolean)
      const { connection } = await connectStdio(config.command, args, 'supaproxy-test')
      const result: TestResult = { ok: true, tools: connection.tools.length, toolNames: connection.tools.map(t => t.name) }
      await connection.close()
      return result
    } catch (err) {
      return { ok: false, error: `Connection failed: ${(err as Error).message}` }
    }
  },

  async connect(config): Promise<McpConnection> {
    const args = (config.args || '').split(/\s+/).filter(Boolean)
    const { connection } = await connectStdio(config.command, args, config.name || 'supaproxy')
    return connection
  },
}
