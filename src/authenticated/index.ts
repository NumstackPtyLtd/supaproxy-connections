import type { ConnectionPlugin, McpConnection, TestResult } from '../types.js'
import { httpPlugin } from '../http/index.js'

/**
 * Authenticated HTTP connection — wraps the base HTTP plugin
 * with auth header injection (Bearer, API key, or custom header).
 */
export const authenticatedPlugin: ConnectionPlugin = {
  type: 'authenticated',
  name: 'HTTP (Authenticated)',
  description: 'Connect to an MCP server requiring API key or Bearer token authentication.',

  configSchema: {
    fields: [
      { name: 'name', label: 'Connection name', type: 'text', required: true, placeholder: 'vendor-api', helpText: 'A short identifier' },
      { name: 'url', label: 'Server URL', type: 'text', required: true, placeholder: 'https://mcp.vendor.com' },
      { name: 'auth_type', label: 'Auth type', type: 'select', required: true, options: ['bearer', 'api-key', 'custom-header'], helpText: 'How to authenticate with the server' },
      { name: 'auth_value', label: 'Token / API key', type: 'password', required: true, helpText: 'The authentication credential' },
      { name: 'header_name', label: 'Header name', type: 'text', required: false, placeholder: 'Authorization', helpText: 'For custom header auth (default: Authorization)' },
    ],
  },

  async test(config): Promise<TestResult> {
    return httpPlugin.test({ ...config, ...buildHeaders(config) })
  },

  async connect(config): Promise<McpConnection> {
    return httpPlugin.connect({ ...config, ...buildHeaders(config) })
  },
}

function buildHeaders(config: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {}
  if (config.auth_type === 'bearer') {
    headers['Authorization'] = `Bearer ${config.auth_value}`
  } else if (config.auth_type === 'api-key') {
    headers['X-API-Key'] = config.auth_value
  } else if (config.auth_type === 'custom-header') {
    headers[config.header_name || 'Authorization'] = config.auth_value
  }
  return headers
}
