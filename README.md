# n8n-nodes-browser-use

An n8n community node package for Browser Use Cloud. The single **Browser Use** node supports API v4 run workflows, API v3 session-based agent workflows, and the legacy API v2 task workflows.

<p>
  <img src="https://raw.githubusercontent.com/browser-use/browser-use/main/static/browser-use.png" alt="Browser Use" width="360">
</p>

## What is Browser Use?

Browser Use Cloud lets AI agents control managed browsers for web research, data extraction, form filling, testing, and multi-step workflows.

This package includes one n8n node:

- **Browser Use**: choose **API Version** in the node UI to use v4 Runs, v3 Sessions and Browsers, or v2 Tasks

New nodes default to **v4**, which Browser Use recommends for new integrations. Existing workflows keep whichever API version they were saved with.

## Installation

Install this node using n8n's community node manager or npm.

### Via n8n

1. Go to Settings > Community Nodes
2. Search for `n8n-nodes-browser-use-cloud`
3. Install and restart n8n

### Via npm

```bash
npm install n8n-nodes-browser-use-cloud
```

## Authentication

1. Create a Browser Use account at [cloud.browser-use.com](https://cloud.browser-use.com)
2. Create an API key in the dashboard
3. In n8n, create a Browser Use API credential
4. Enter the API key

The default Base URL remains:

```text
https://api.browser-use.com/api/v2
```

Leave the credential Base URL at the default. In the **Browser Use** node, use the **API Version** dropdown to switch between **v4 Runs**, **v3 Sessions and Browsers**, and **v2 Tasks**. The node rewrites the trailing `/api/vN` segment internally, so existing credentials continue to work. The node authenticates with the `X-Browser-Use-API-Key` header.

## Choosing an API version

| Version | Use it for | Notes |
| --- | --- | --- |
| **v4** (default) | New integrations, hard or long multi-step workflows | Highest accuracy. Not available on Zero Data Retention projects. |
| **v3** | Cost- and speed-sensitive work | Session-based agents plus standalone cloud browsers. |
| **v2** | Existing workflows only | Legacy; no longer actively maintained upstream. |

## Nodes

### API Version: v4 Runs, Sessions, and Browsers

In v4 the unit of work is a **run**. Every run belongs to a **session**, and a session is a conversation: follow-up messages queued onto a session reuse its context and browser state.

#### Run

Operations:

- **Run and Wait**: Dispatch a run, poll `GET /runs/{id}/status` until it reaches `completed`, `failed`, or `cancelled`, then return the full run summary
- **Create**: Dispatch a run and return immediately with its ID, status, session ID, and events URL
- **Get**: Retrieve the full run summary including `result`, `error`, token counts, and `totalCostUsd`
- **Get Status**: Retrieve only the status, which is the cheapest way to poll from your own loop
- **Get Many**: List runs, optionally filtered to a single session
- **Cancel**: Cancel a run that is still in flight
- **Get Events**: Retrieve the step-by-step event stream for a run
- **Get Attachments**: List files the agent attached to a run

Run options:

- **Model**: `gpt-5.6-luna` (default), the rest of the GPT-5.5/5.6 family, Claude Opus 4.7/4.8/5, Claude Sonnet 5, Claude Fable 5, Gemini 3/3.1/3.5/3.6, GLM 5.2, Grok 4.5, Kimi K3, or MiniMax M3
- **Model Parameters**: Provider-native parameters forwarded unchanged, e.g. `{"reasoning": {"effort": "high"}}`
- **Session ID**: Continue an existing conversation instead of starting a new one
- **Workspace ID** and **Attached File IDs**: Persist and attach files across runs
- **Judge** and **Judge Context**: Have an LLM judge the finished run; the verdict lands in `judgement`
- **Max Cost USD**: Cap the total spend of a run
- **Profile ID**, **Proxy Country Code**, **Disable Proxy**, **Custom Proxy**, **Screen Width/Height**, **Enable Recording**: Browser settings applied when a new browser is provisioned

#### Session

Operations:

- **Queue Message**: Send a follow-up instruction; it runs immediately when the session is idle, or waits its turn. **Interrupt** cancels the active run so the message takes effect now
- **Get Queue** / **Cancel Queued Message**: Inspect and manage pending messages
- **Get** / **Get Many**: Session metadata, one entry per conversation
- **Purge**: Permanently delete a session on a Zero Data Retention project

#### Browser

Standalone cloud browsers, the same computer-use style as v3, plus:

- **Get Downloads**: List files the browser downloaded, with optional presigned URLs

#### Structured output on v4

API v4 has **no server-side output schema** — `run.result` is always a string. When **Extract Structured Data** is enabled, this node appends the JSON Schema to the task as an instruction and parses the returned text into a `parsedResult` field. This is best-effort:

- The raw text always stays in `result`
- If the text is not JSON, or does not match the schema's type or required properties, `parsedResult` is `null` or partial and `structuredOutputError` explains what happened
- The run itself is never failed by a parsing problem

Use **v3** if you need the API to enforce the schema server-side.

### API Version: v2 Tasks

The v2 mode remains available for backward compatibility. It uses the v2 `/tasks` API and keeps the same operations:

- **Execute**
- **Get**
- **Get Many**
- **Stop**
- **Update**

Use v2 mode for existing workflows that already depend on API v2 task behavior or v2-specific options such as allowed domains, secrets, max steps, judge settings, and v2 model names.

### API Version: v3 Sessions and Browsers

Use v3 mode for the new API v3 session and browser workflows.

#### Session

Use Session operations for the v3 agent API.

Operations:

- **Run and Wait**: Create or reuse a session, dispatch a task, and poll until the task completes or the session reaches `stopped`, `timed_out`, or `error`
- **Create**: Create an idle session or dispatch a task without polling
- **Get**: Retrieve session details
- **Get Many**: List sessions
- **Get Messages**: Retrieve message history for debugging or custom UIs
- **Stop**: Stop the full session or only the running task
- **Delete**: Soft-delete a session

Common options:

- **Model**: `claude-sonnet-4.6`, `claude-opus-4.6`, `gemini-3-flash`, `bu-mini`, `bu-max`, or `bu-ultra`
- **Keep Alive**: Keep the browser session idle after task completion for follow-up tasks
- **Profile ID**: Reuse cookies and browser state
- **Workspace ID**: Attach persistent files
- **Proxy Country Code**: Route traffic through a specific country, or disable proxy
- **Enable Recording**: Return recording URLs after completion
- **Extract Structured Data**: Send an `outputSchema` JSON Schema and receive structured final output

#### Browser

Use Browser operations for standalone cloud browser sessions. This is the computer-use-style mode: Browser Use provisions a managed browser and returns URLs you can use from other automation tools.

Operations:

- **Create**: Start a browser session and return `liveUrl` and `cdpUrl`
- **Get**: Retrieve browser session status and URLs
- **Get Many**: List active or stopped browser sessions
- **Stop**: Stop a browser session and refund unused time proportionally

Browser options include profile ID, proxy country code, timeout, screen size, resizing, custom proxy, and recording.

## Browser Use v4 Examples

### Run an agent task and wait

```json
{
  "apiVersion": "v4",
  "resource": "run",
  "operation": "runAndWait",
  "task": "Find the top 3 trending repositories on GitHub today and summarize why they are trending",
  "waitTimeout": 900,
  "runOptions": {
    "model": "gpt-5.6-luna",
    "maxCostUsd": 1.5
  }
}
```

The response is the full run summary: `status`, `result`, `error`, `sessionId`, `totalInputTokens`, `totalOutputTokens`, `totalCostUsd`, plus the `eventsUrl` returned when the run was created.

### Continue the same conversation

Pass the `sessionId` from the previous run to start a follow-up run with the same context and browser state.

```json
{
  "apiVersion": "v4",
  "resource": "run",
  "operation": "runAndWait",
  "task": "Open the first repository and extract its license and star count",
  "runOptions": {
    "sessionId": "SESSION_ID"
  }
}
```

To send a follow-up while a run may still be active, queue it on the session instead:

```json
{
  "apiVersion": "v4",
  "resource": "session",
  "operation": "queueMessage",
  "sessionId": "SESSION_ID",
  "message": "Actually, sort by stars gained this week instead",
  "queueOptions": {
    "interrupt": true
  }
}
```

### Request structured output

```json
{
  "apiVersion": "v4",
  "resource": "run",
  "operation": "runAndWait",
  "task": "Extract company details from this website",
  "startUrl": "https://example.com/about",
  "enableStructuredOutput": true,
  "schemaTemplate": "custom",
  "outputSchema": {
    "type": "object",
    "properties": {
      "companyName": { "type": "string" },
      "industry": { "type": "string" },
      "summary": { "type": "string" }
    },
    "required": ["companyName"]
  }
}
```

The parsed object arrives as `parsedResult`; the agent's raw text stays in `result`.

### Poll a run from your own loop

```json
{
  "apiVersion": "v4",
  "resource": "run",
  "operation": "getStatus",
  "runId": "RUN_ID"
}
```

`Get Status` returns only `{ id, status }`, so it is cheap to call on a schedule. Fetch the full summary with `Get` once the status is terminal.

## Browser Use v3 Examples

### Run an agent task and wait

```json
{
  "resource": "session",
  "operation": "runAndWait",
  "task": "Find the top 3 trending repositories on GitHub today and summarize why they are trending",
  "waitTimeout": 900,
  "sessionOptions": {
    "model": "claude-sonnet-4.6",
    "keepAlive": false
  }
}
```

### Reuse a session for follow-up work

First run a task with `keepAlive` enabled, then pass the returned `id` as **Session ID** in the next task's Session Options.

```json
{
  "resource": "session",
  "operation": "runAndWait",
  "task": "Using the same browser session, open the first result and extract the pricing page URL",
  "sessionOptions": {
    "existingSessionId": "SESSION_ID",
    "keepAlive": true
  }
}
```

### Request structured output

```json
{
  "resource": "session",
  "operation": "runAndWait",
  "task": "Extract company details from this website",
  "startUrl": "https://example.com/about",
  "enableStructuredOutput": true,
  "schemaTemplate": "custom",
  "outputSchema": {
    "type": "object",
    "properties": {
      "companyName": { "type": "string" },
      "industry": { "type": "string" },
      "summary": { "type": "string" }
    },
    "required": ["companyName"]
  }
}
```

### Create a standalone browser session

```json
{
  "resource": "browser",
  "operation": "create",
  "browserOptions": {
    "timeout": 60,
    "proxyCountryCode": "us",
    "browserScreenWidth": 1920,
    "browserScreenHeight": 1080
  }
}
```

The response includes:

- `liveUrl`: Watch or embed the live browser
- `cdpUrl`: Connect Playwright, Puppeteer, Selenium, or another computer-use controller
- `id`: Use this to get or stop the browser session

## Error Handling

The node returns clear n8n errors for authentication failures, validation errors, missing resources, rate limits, and Browser Use API server errors. With n8n's "Continue On Fail" enabled, the error message is returned as item JSON.

On v4 two statuses carry extra context:

- **403**: the API key may lack project access, or the project has Zero Data Retention enabled, which v4 does not support — switch that workflow to the v3 API Version
- **409**: a session runs one run at a time, so wait for the active run or cancel it first

## Documentation

- [Browser Use API v4 Reference](https://docs.browser-use.com/cloud/openapi/v4.json)
- [Browser Use API v3 Reference](https://docs.browser-use.com/cloud/api-reference)
- [Browser Use API v2 Reference](https://docs.browser-use.com/cloud/api-v2-overview)
- [Browser Use Dashboard](https://cloud.browser-use.com)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT License - see [LICENSE](LICENSE) for details.
