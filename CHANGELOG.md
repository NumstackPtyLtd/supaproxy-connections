# Changelog

All notable changes to this project will be documented in this file.

## [0.2.1] - 2026-05-13

### Fixed
- HTTP plugin now applies custom auth headers during tool discovery and tool calls. Previously `connect()` and `test()` hardcoded `Content-Type` only, causing all authenticated MCP endpoints to fail with "MCP error: undefined".

## [0.2.0] - 2026-05-12

### Added
- Initial release
- Connection plugin types and registry at root export
- Built-in connection plugins at `/plugins` sub-export (HTTP, STDIO, Authenticated)
