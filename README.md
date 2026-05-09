# n8n-nodes-browser-use

An n8n community node package for Browser Use Cloud. The single **Browser Use** node supports both API v2 task workflows and API v3 session-based agent workflows.

<p>
  <img src="https://raw.githubusercontent.com/browser-use/browser-use/main/static/browser-use.png" alt="Browser Use" width="360">
</p>

## What is Browser Use?

Browser Use Cloud lets AI agents control managed browsers for web research, data extraction, form filling, testing, and multi-step workflows.

This package includes one n8n node:

- **Browser Use**: choose **API Version** in the node UI to use v2 Tasks or v3 Sessions and Browsers

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

Leave the credential Base URL at the default. In the **Browser Use** node, use the **API Version** dropdown to switch between **v2 Tasks** and **v3 Sessions and Browsers**. The node switches the API path internally, so existing credentials continue to work. The node authenticates with the `X-Browser-Use-API-Key` header.

## Nodes

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

## Documentation

- [Browser Use API v3 Reference](https://docs.browser-use.com/cloud/api-reference)
- [Browser Use API v2 Reference](https://docs.browser-use.com/cloud/api-v2-overview)
- [Browser Use Dashboard](https://cloud.browser-use.com)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT License - see [LICENSE](LICENSE) for details.
