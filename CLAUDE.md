# @supaproxy/connections

Plugin package for SupaProxy MCP connection types. Each connection type implements the `ConnectionPlugin` interface.

## Architecture

```
src/
├── types.ts              ConnectionPlugin, McpConnection, ToolDefinition
├── registry.ts           PluginRegistry (list, get, register, schemas)
├── http/                 Standard HTTP Streamable transport
│   └── index.ts          httpPlugin
├── stdio/                Subprocess (STDIO) transport
│   └── index.ts          stdioPlugin
├── authenticated/        HTTP + auth headers (Bearer, API key, custom)
│   └── index.ts          authenticatedPlugin (wraps httpPlugin)
└── index.ts              Re-exports + auto-registration
```

## Adding a new connection type

1. Create `src/my-transport/index.ts` implementing `ConnectionPlugin`
2. Export from `src/index.ts`
3. Auto-register in `src/index.ts`

## Code rules

- Each plugin is a single exported object, not a class
- Config schemas drive dashboard form rendering
- `test()` must be non-destructive (probe only)
- `connect()` returns a live `McpConnection` with discovered tools
- Connections must handle cleanup in `close()`
