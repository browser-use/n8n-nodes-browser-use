# Changelog

## 1.1.0

### Added

- Added a new **Browser Use v3** n8n node for Browser Use Cloud API v3.
- Added v3 **Session** operations: create, run and wait, get, get many, get messages, stop, and delete.
- Added v3 **Browser** operations for standalone cloud browser sessions: create, get, get many, and stop.
- Added support for v3 browser/computer-use workflows through returned `liveUrl` and `cdpUrl` values.
- Added v3 session options for model selection, keep-alive sessions, profiles, workspaces, proxy settings, recording, scheduled tasks, skills, AgentMail, and structured output schemas.

### Changed

- Kept the existing **Browser Use** node as the API v2 `/tasks` node for backward compatibility.
- Updated README documentation to describe both the existing v2 node and the new opt-in v3 node.
- Updated package build and lint scripts to use the official `n8n-node` CLI.
- Updated the GitHub Actions publish workflow to use npm provenance.

### Compatibility

- Existing workflows using the **Browser Use** v2 node should continue to work unchanged.
- Existing Browser Use API credentials still default to `/api/v2`; the **Browser Use v3** node automatically switches that URL to `/api/v3` internally.
