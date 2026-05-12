import { describe, it, expect, beforeEach } from 'vitest'
import { registry } from './registry.js'
import type { ConnectionPlugin, McpConnection, TestResult } from './types.js'

// ── Helpers ──

function makeMockPlugin(type: string, overrides?: Partial<ConnectionPlugin>): ConnectionPlugin {
  return {
    type,
    name: `${type} Connection`,
    description: `Mock ${type} connection`,
    configSchema: {
      fields: [
        { name: 'url', label: 'Server URL', type: 'text', required: true, placeholder: 'http://localhost:3000' },
      ],
    },
    test: async (): Promise<TestResult> => ({
      ok: true,
      tools: 3,
      toolNames: ['tool_a', 'tool_b', 'tool_c'],
      server: 'mock-server',
    }),
    connect: async (): Promise<McpConnection> => ({
      tools: [
        { name: 'tool_a', description: 'Tool A', inputSchema: {} },
      ],
      callTool: async () => ({ content: [{ type: 'text', text: 'result' }], isError: false }),
      close: async () => {},
    }),
    ...overrides,
  }
}

// ── Registry tests ──

describe('ConnectionRegistry', () => {
  beforeEach(() => {
    registry.plugins.clear()
  })

  describe('register', () => {
    it('registers a plugin', () => {
      const plugin = makeMockPlugin('http-mock')
      registry.register(plugin)
      expect(registry.has('http-mock')).toBe(true)
    })

    it('replaces a plugin with the same type', () => {
      registry.register(makeMockPlugin('dup', { name: 'V1' }))
      registry.register(makeMockPlugin('dup', { name: 'V2' }))
      expect(registry.get('dup').name).toBe('V2')
    })
  })

  describe('get', () => {
    it('returns the registered plugin', () => {
      const plugin = makeMockPlugin('stdio-mock')
      registry.register(plugin)
      expect(registry.get('stdio-mock')).toBe(plugin)
    })

    it('throws for an unknown type', () => {
      expect(() => registry.get('nonexistent')).toThrow('Connection plugin not found: nonexistent')
    })
  })

  describe('has', () => {
    it('returns true for registered types', () => {
      registry.register(makeMockPlugin('present'))
      expect(registry.has('present')).toBe(true)
    })

    it('returns false for unregistered types', () => {
      expect(registry.has('missing')).toBe(false)
    })
  })

  describe('types', () => {
    it('returns empty array when empty', () => {
      expect(registry.types()).toEqual([])
    })

    it('returns all registered type strings', () => {
      registry.register(makeMockPlugin('http'))
      registry.register(makeMockPlugin('stdio'))
      registry.register(makeMockPlugin('auth'))
      expect(registry.types()).toEqual(['http', 'stdio', 'auth'])
    })
  })

  describe('list', () => {
    it('returns empty array when empty', () => {
      expect(registry.list()).toEqual([])
    })

    it('returns all plugins in insertion order', () => {
      const a = makeMockPlugin('a')
      const b = makeMockPlugin('b')
      registry.register(a)
      registry.register(b)
      expect(registry.list()).toEqual([a, b])
    })
  })

  describe('schemas', () => {
    it('returns empty array when empty', () => {
      expect(registry.schemas()).toEqual([])
    })

    it('returns schema info for all plugins', () => {
      registry.register(makeMockPlugin('http-test'))
      registry.register(makeMockPlugin('stdio-test'))
      const schemas = registry.schemas()
      expect(schemas).toHaveLength(2)
      expect(schemas[0].type).toBe('http-test')
      expect(schemas[1].type).toBe('stdio-test')
    })

    it('schema entry has all required fields', () => {
      registry.register(makeMockPlugin('full'))
      const s = registry.schemas()[0]
      expect(s).toHaveProperty('type')
      expect(s).toHaveProperty('name')
      expect(s).toHaveProperty('description')
      expect(s).toHaveProperty('configSchema')
      expect(Array.isArray(s.configSchema.fields)).toBe(true)
    })
  })
})

// ── ConnectionPlugin contract ──

describe('ConnectionPlugin contract', () => {
  it('mock plugin satisfies the interface', () => {
    const plugin = makeMockPlugin('contract')
    expect(typeof plugin.type).toBe('string')
    expect(typeof plugin.name).toBe('string')
    expect(typeof plugin.description).toBe('string')
    expect(Array.isArray(plugin.configSchema.fields)).toBe(true)
    expect(typeof plugin.test).toBe('function')
    expect(typeof plugin.connect).toBe('function')
  })

  it('test returns TestResult shape', async () => {
    const plugin = makeMockPlugin('test-shape')
    const result = await plugin.test({ url: 'http://localhost' })
    expect(typeof result.ok).toBe('boolean')
    expect(result.ok).toBe(true)
    expect(typeof result.tools).toBe('number')
    expect(Array.isArray(result.toolNames)).toBe(true)
  })

  it('connect returns McpConnection with tools and callTool', async () => {
    const plugin = makeMockPlugin('connect-shape')
    const conn = await plugin.connect({ url: 'http://localhost' })
    expect(Array.isArray(conn.tools)).toBe(true)
    expect(conn.tools.length).toBeGreaterThan(0)
    expect(typeof conn.callTool).toBe('function')
    expect(typeof conn.close).toBe('function')
  })

  it('McpConnection.callTool returns ToolCallResult shape', async () => {
    const plugin = makeMockPlugin('call-tool')
    const conn = await plugin.connect({})
    const result = await conn.callTool('tool_a', {})
    expect(Array.isArray(result.content)).toBe(true)
    expect(typeof result.isError).toBe('boolean')
    expect(result.isError).toBe(false)
  })

  it('McpConnection.close resolves without error', async () => {
    const plugin = makeMockPlugin('close-test')
    const conn = await plugin.connect({})
    await expect(conn.close()).resolves.toBeUndefined()
  })

  it('test returns error shape on failure', async () => {
    const plugin = makeMockPlugin('fail-test', {
      test: async (): Promise<TestResult> => ({ ok: false, error: 'Connection refused' }),
    })
    const result = await plugin.test({ url: 'http://bad' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Connection refused')
  })

  it('configSchema fields have valid types', () => {
    const plugin = makeMockPlugin('field-types', {
      configSchema: {
        fields: [
          { name: 'url', label: 'URL', type: 'text', required: true },
          { name: 'token', label: 'Token', type: 'password', required: false },
          { name: 'method', label: 'Method', type: 'select', required: true, options: ['GET', 'POST'] },
        ],
      },
    })
    for (const field of plugin.configSchema.fields) {
      expect(['text', 'password', 'select']).toContain(field.type)
      expect(typeof field.name).toBe('string')
      expect(typeof field.label).toBe('string')
      expect(typeof field.required).toBe('boolean')
    }
  })
})
