# Changelog

## 1.2.0

### Added

- Added **V4 Runs, Sessions, and Browsers** to the **API Version** dropdown on the **Browser Use** node.
- Added v4 **Run** operations: run and wait, create, get, get status, get many, cancel, get events, and get attachments.
- Added v4 **Session** operations for conversational follow-ups: queue message (with interrupt), get queue, cancel queued message, get, get many, and purge.
- Added v4 **Browser** operations: create, get, get many, stop, and get downloads.
- Added v4 run options for model selection, provider-native model parameters, session continuation, workspaces and attached files, judge settings, max cost, and per-run browser settings.
- Added client-side structured output for v4: the JSON Schema is appended to the task and the result is parsed into `parsedResult`, with `structuredOutputError` describing any mismatch.

### Changed

- Newly added **Browser Use** nodes now default to **v4**, which Browser Use recommends for new integrations. The node gained a second `typeVersion` to do this safely: nodes already on the canvas stay at typeVersion 1 and keep defaulting to v2, while nodes added from now on are typeVersion 2 and default to v4. Changing the default in place would have migrated saved nodes silently, because n8n resolves a missing parameter to its property default and omits default-valued parameters when saving.
- Labelled **V2 Tasks** as legacy in the **API Version** dropdown.
- Structured output on v4 now accepts JSON Schema union types such as `["string", "null"]`, checks `required` even when the schema omits `type`, and validates the task length after the starting URL and schema are appended rather than before.
- Credential testing and the v2 and v3 request paths now also normalise a Base URL saved as `/api/v4`.
- Moved the shared structured-output templates and the base URL version helper into modules shared by all three API versions, replacing three copies of the same code.

- Raised the minimum Node version from 20.19 to 22.22, matching n8n's own requirement. The development toolchain cannot install on Node 20 at all: `isolated-vm`, a transitive dependency of `n8n-workflow`, fails to compile against Node 20's V8 headers. Node 20 is also past end of life.
- Added CI running formatting, lint, build, and tests on every pull request and push to main, across Node 22.22 and 24. The repository previously had no CI; lint and build only ran during a tagged publish.
- Added a test suite covering all three API versions, run with Node's built-in test runner via `pnpm test` and added to `prepublishOnly`. It drives the compiled node against a stubbed HTTP layer, so no API key or network access is needed.
- Hardened the publish workflow: a `v*` tag whose version does not match `package.json` now fails before publishing, formatting is checked alongside lint and build, and the pnpm store is cached.

### Compatibility

- Existing v2 and v3 workflows are unaffected; their request bodies and endpoints are unchanged, and existing nodes keep their current API version rather than moving to v4.
- API v4 is not available on Zero Data Retention projects. Those workflows should stay on the v3 API Version; the node returns an explanatory error if v4 is used.

## 1.1.2

### Changed

- Consolidated API v2 and API v3 into the main **Browser Use** node with an **API Version** dropdown.
- Updated credential testing so credentials saved with `/api/v3` are tested against the compatible v2 task endpoint.

## 1.1.1

### Fixed

- Removed direct `setTimeout` usage from the Browser Use v3 polling helper to satisfy n8n community package security checks.

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
- Wrapped Browser Use API HTTP failures in `NodeApiError` so n8n receives the upstream status and response context.

### Compatibility

- Existing workflows using the **Browser Use** v2 node should continue to work unchanged.
- Existing Browser Use API credentials still default to `/api/v2`; the **Browser Use v3** node automatically switches that URL to `/api/v3` internally.
