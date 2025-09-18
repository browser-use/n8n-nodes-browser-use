# n8n-nodes-browser-use

An n8n community node to integrate with Browser Use Cloud API v2 for automated web tasks using AI agents.

![Browser Use logo](https://raw.githubusercontent.com/browser-use/n8n-nodes-browser-use/main/nodes/BrowserUse/browseruse.svg)

## What is Browser Use?

Browser Use is a powerful service that allows AI agents to control web browsers and automate complex web tasks. This n8n node provides seamless integration with the Browser Use Cloud API, enabling you to:

- **Automate Web Tasks**: Let AI agents perform complex web interactions like form filling, data extraction, and navigation
- **Smart Browser Control**: Leverage AI to understand and interact with web pages naturally
- **Scalable Automation**: Execute multiple browser tasks in parallel with cloud-based infrastructure

## Installation

You can install this node using n8n's built-in package manager or through npm.

### Via n8n

1. Go to Settings → Community Nodes
2. Search for `n8n-nodes-browser-use`
3. Install and restart n8n

### Via npm

```bash
npm install n8n-nodes-browser-use
```

## Authentication

1. Sign up for a Browser Use account at [https://cloud.browser-use.com](https://cloud.browser-use.com)
2. Get your API key from the dashboard
3. In n8n, create a new Browser Use API credential and enter your API key

## Node

### Browser Use
The main node for automating any web task with natural language using AI agents.

**Core Parameters:**
- **Task Description** (required): Describe what you want the AI agent to do in natural language (1-20,000 characters)
- **Starting URL** (optional): URL to start the task from
- **Timeout**: Maximum time to wait for completion (10-3600 seconds)
- **Extract Structured Data**: Enable to extract data in a specific JSON schema format

**Structured Data Options** (when enabled):
- **Data Template**: Choose from pre-built schemas (Product, Contact, Article, Company) or Custom Format
- **Custom Data Format**: Define your own JSON schema for data extraction

**Advanced Options:**
- **Max Steps**: Maximum number of steps the agent can take (1-200)
- **AI Model**: Choose from supported models (Gemini 2.5 Flash default, GPT-4.1, GPT-4o, O3, Claude Sonnet 4, and more)

## Example Usage

#### Basic Web Search
```json
{
  "task": "Go to Google and search for 'browser automation with AI'",
  "timeout": 300
}
```

#### Form Filling
```json
{
  "task": "Fill out the contact form with name 'John Doe', email 'john@example.com', and message 'Hello from n8n!'",
  "startUrl": "https://example.com/contact"
}
```

#### E-commerce Data Extraction with Template
```json
{
  "task": "Navigate to the products page and extract all product names and prices",
  "startUrl": "https://shop.example.com",
  "enableStructuredOutput": true,
  "schemaTemplate": "product",
  "advancedOptions": {
    "maxSteps": 50,
    "llm": "gemini-2.5-flash"
  }
}
```

#### Custom Data Extraction with JSON Schema
```json
{
  "task": "Extract company information from this website",
  "startUrl": "https://example.com/about",
  "enableStructuredOutput": true,
  "schemaTemplate": "custom",
  "outputSchema": {
    "type": "object",
    "properties": {
      "companyName": {"type": "string"},
      "industry": {"type": "string"},
      "employees": {"type": "string"},
      "foundedYear": {"type": "string"},
      "headquarters": {"type": "string"}
    },
    "required": ["companyName"]
  }
}
```

#### Advanced Scraping with Nested Schema
```json
{
  "task": "Extract all pricing information from this page and organize it by product category",
  "startUrl": "https://shop.example.com/pricing",
  "enableStructuredOutput": true,
  "schemaTemplate": "custom",
  "outputSchema": {
    "type": "object",
    "properties": {
      "categories": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "categoryName": {"type": "string"},
            "products": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "name": {"type": "string"},
                  "price": {"type": "string"},
                  "features": {"type": "array", "items": {"type": "string"}}
                }
              }
            }
          }
        }
      }
    },
    "required": ["categories"]
  },
  "advancedOptions": {
    "maxSteps": 40
  }
}
```

## Response Format

The node always returns complete task data including:
- Task ID and status
- Execution steps and results
- AI agent success status (`isSuccess`)
- Agent message explaining the outcome
- Cloud URL for session replay (when available)
- Extracted structured data (when structured output is enabled)
- Error information (if failed)

**Note**: When structured output is enabled, you get both the extracted data AND the complete task information, giving you full visibility into the AI agent's execution process.

## Error Handling

The node includes comprehensive error handling with detailed error messages for:
- **Authentication errors** (401, 403): Clear messages about API key issues
- **Validation errors** (422): Specific tips for JSON schema formatting and parameter issues
- **Rate limiting** (429): Guidance on session limits and retry timing
- **Server errors** (500): Browser Use API server issues
- **Network timeouts**: Connection and request timeout handling
- **Invalid parameters**: Detailed validation with helpful suggestions

Validation errors now include contextual tips, such as reminding users that JSON schema properties should be objects like `{"type": "string"}` rather than just `"string"`.

## Getting Started

The node includes helpful links directly in the interface:
- **Need an API key?** Sign up at [cloud.browser-use.com](https://cloud.browser-use.com)
- **Documentation** available at [docs.cloud.browser-use.com](https://docs.cloud.browser-use.com)

## Pricing

Browser Use operates on a pay-per-use model. Visit the [pricing page](https://cloud.browser-use.com/pricing) for current rates and check your account balance in the dashboard.

## Support

- [Browser Use Documentation](https://docs.cloud.browser-use.com)
- [n8n Community Forum](https://community.n8n.io)
- [GitHub Issues](https://github.com/browser-use/n8n-nodes-browser-use/issues)

## License

MIT License - see [LICENSE](LICENSE) file for details.