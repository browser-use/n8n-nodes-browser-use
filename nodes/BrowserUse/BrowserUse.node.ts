import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { BrowserUseV3 } from './BrowserUseV3';

const SUPPORTED_MODELS = [
	{ name: 'Browser Use 2.0 (Default)', value: 'browser-use-2.0' },
	{ name: 'Browser Use LLM', value: 'browser-use-llm' },
	{ name: 'Claude Opus 4.5', value: 'claude-opus-4-5-20251101' },
	{ name: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
	{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
	{ name: 'Gemini 3 Flash Preview', value: 'gemini-3-flash-preview' },
	{ name: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview' },
	{ name: 'Gemini Flash Latest', value: 'gemini-flash-latest' },
	{ name: 'Gemini Flash Lite Latest', value: 'gemini-flash-lite-latest' },
	{ name: 'GPT-4.1', value: 'gpt-4.1' },
	{ name: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
	{ name: 'O3', value: 'o3' },
] as const;

function addApiVersionDisplayOptions(
	properties: INodeProperties[],
	apiVersion: 'v2' | 'v3',
): INodeProperties[] {
	return properties.map((property) => ({
		...property,
		displayOptions: {
			...property.displayOptions,
			show: {
				...(property.displayOptions?.show ?? {}),
				apiVersion: [apiVersion],
			},
		},
	}));
}

export class BrowserUse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browser Use',
		name: 'browserUse',
		icon: 'file:browseruse.svg',
		group: ['transform'],
		version: 1,
		description: 'Automate any web task with natural language using AI agents',
		defaults: {
			name: 'Browser Use',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'browserUseApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'V2 Tasks',
						value: 'v2',
						description: 'Use the API v2 task workflow',
					},
					{
						name: 'V3 Sessions and Browsers',
						value: 'v3',
						description: 'Use the API v3 session and computer-use browser workflows',
					},
				],
				default: 'v2',
				description: 'Choose which Browser Use Cloud API to use for this node',
			},
			...addApiVersionDisplayOptions(
				[
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						noDataExpression: true,
						options: [
							{
								name: 'Task',
								value: 'task',
							},
						],
						default: 'task',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						displayOptions: {
							show: {
								resource: ['task'],
							},
						},
						options: [
							{
								name: 'Execute',
								value: 'execute',
								description: 'Execute a task using an AI agent',
								action: 'Execute a task',
							},
							{
								name: 'Get',
								value: 'get',
								description: 'Retrieve details of a task',
								action: 'Get a task',
							},
							{
								name: 'Get Many',
								value: 'getMany',
								description: 'List all tasks in your account',
								action: 'Get many tasks',
							},
							{
								name: 'Stop',
								value: 'stop',
								description: 'Stop a running task',
								action: 'Stop a task',
							},
							{
								name: 'Update',
								value: 'update',
								description: 'Update a task',
								action: 'Update a task',
							},
						],
						default: 'execute',
					},
					{
						displayName: 'Task ID',
						name: 'taskId',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['get', 'stop', 'update'],
							},
						},
						placeholder: 'e.g. task_abc123xyz',
						description: 'The unique identifier of the task',
						required: true,
					},
					{
						displayName: 'Task Description',
						name: 'task',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
							},
						},
						placeholder: 'e.g. Go to Google and search for browser automation',
						description: 'Natural language description of what you want the AI agent to do',
						required: true,
					},
					{
						displayName: 'Starting URL',
						name: 'startUrl',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
							},
						},
						placeholder: 'e.g. https://example.com',
						description: 'The URL where the browser should start (optional)',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 300,
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
							},
						},
						description: 'Maximum time in seconds to wait for task completion (10-3600 seconds)',
						typeOptions: {
							minValue: 10,
							maxValue: 3600,
						},
					},
					{
						displayName: 'Extract Structured Data',
						name: 'enableStructuredOutput',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
							},
						},
						description: 'Whether to extract data in a specific JSON format for easier processing',
					},
					{
						displayName: 'Configure the data structure you want to extract below ↓',
						name: 'structuredOutputNotice',
						type: 'notice',
						default: '',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
								enableStructuredOutput: [true],
							},
						},
						typeOptions: {
							theme: 'info',
						},
					},
					{
						displayName: 'Data Template',
						name: 'schemaTemplate',
						type: 'options',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
								enableStructuredOutput: [true],
							},
						},
						options: [
							{
								name: 'Article/Blog Content',
								value: 'article',
								description:
									'Extracts: title, author, publishDate, content, summary, tags, readTime, category',
							},
							{
								name: 'Company Information',
								value: 'company',
								description:
									'Extracts: companyName, industry, description, foundedYear, headquarters, employees, revenue, website, contactInfo, keyPeople',
							},
							{
								name: 'Contact Information',
								value: 'contact',
								description:
									'Extracts: companyName, email, phone, address, website, socialMedia (twitter, linkedin, facebook)',
							},
							{
								name: 'Custom Format',
								value: 'custom',
								description: 'Define your own JSON schema structure',
							},
							{
								name: 'Product Information',
								value: 'product',
								description:
									'Extracts: productName, price, description, inStock, images, specifications, rating, reviews',
							},
						],
						default: 'custom',
						description: 'Choose a pre-built template or define a custom format',
					},
					{
						displayName:
							'💡 Using a pre-built template will automatically extract the fields shown above. To see the full JSON schema or create your own structure, select "Custom Format".',
						name: 'templateSchemaPreview',
						type: 'notice',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
								enableStructuredOutput: [true],
								schemaTemplate: ['product', 'contact', 'article', 'company'],
							},
						},
						default: '',
						typeOptions: {
							theme: 'info',
						},
					},
					{
						displayName: 'Custom Data Format (JSON Schema)',
						name: 'outputSchema',
						type: 'json',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
								enableStructuredOutput: [true],
								schemaTemplate: ['custom'],
							},
						},
						default:
							'{\n  "type": "object",\n  "properties": {\n    "title": {"type": "string"},\n    "description": {"type": "string"},\n    "data": {"type": "array"}\n  },\n  "required": ["title"]\n}',
						description: 'Define the exact JSON schema structure you want the AI to extract',
						placeholder: 'Define your custom JSON schema here',
					},
					{
						displayName: 'Advanced Options',
						name: 'advancedOptions',
						type: 'collection',
						placeholder: 'Add Option',
						default: {},
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['execute'],
							},
						},
						options: [
							{
								displayName: 'AI Model',
								name: 'llm',
								type: 'options',
								options: [...SUPPORTED_MODELS],
								default: 'browser-use-2.0',
								description: 'The AI model to use for executing the task',
							},
							{
								displayName: 'Allowed Domains',
								name: 'allowedDomains',
								type: 'json',
								default: '[]',
								description:
									'Limit browsing to specific domains (JSON array of strings, e.g. ["example.com","docs.example.com"])',
							},
							{
								displayName: 'Flash Mode',
								name: 'flashMode',
								type: 'boolean',
								default: false,
								description: 'Whether to enable flash mode for faster execution',
							},
							{
								displayName: 'Highlight Elements',
								name: 'highlightElements',
								type: 'boolean',
								default: false,
								description: 'Whether to highlight elements on the page during execution',
							},
							{
								displayName: 'Judge',
								name: 'judge',
								type: 'boolean',
								default: false,
								description: 'Whether to enable judging of task results',
							},
							{
								displayName: 'Judge Ground Truth',
								name: 'judgeGroundTruth',
								type: 'string',
								default: '',
								description: 'Ground truth data for judging (optional)',
							},
							{
								displayName: 'Judge LLM',
								name: 'judgeLlm',
								type: 'options',
								options: [...SUPPORTED_MODELS],
								default: 'browser-use-2.0',
								description: 'The AI model to use for judging results',
							},
							{
								displayName: 'Max Steps',
								name: 'maxSteps',
								type: 'number',
								default: 30,
								description: 'Maximum number of steps the AI agent can take to complete the task',
								typeOptions: {
									minValue: 1,
									maxValue: 200,
								},
							},
							{
								displayName: 'Metadata',
								name: 'metadata',
								type: 'json',
								default: '{}',
								description:
									'Additional metadata to attach to the task (JSON object, string values only)',
							},
							{
								displayName: 'Op Vault ID',
								name: 'opVaultId',
								type: 'string',
								default: '',
								description: 'Operation vault ID to use for this task',
							},
							{
								displayName: 'Secrets',
								name: 'secrets',
								type: 'json',
								default: '{}',
								description:
									'Secrets available to the agent during execution (JSON object, string values only)',
							},
							{
								displayName: 'Session ID',
								name: 'sessionId',
								type: 'string',
								default: '',
								description:
									'Run this task within an existing session to reuse browser state (optional)',
							},
							{
								displayName: 'System Prompt Extension',
								name: 'systemPromptExtension',
								type: 'string',
								default: '',
								description: 'Additional system prompt instructions for the agent',
							},
							{
								displayName: 'Thinking',
								name: 'thinking',
								type: 'boolean',
								default: false,
								description: 'Whether to enable reasoning visualization for the task',
							},
							{
								displayName: 'Vision',
								name: 'vision',
								type: 'options',
								options: [
									{
										name: 'Auto',
										value: 'auto',
									},
									{
										name: 'Enabled',
										value: true,
									},
									{
										name: 'Disabled',
										value: false,
									},
								],
								default: 'auto',
								description: 'Enable vision capabilities (auto, enabled, disabled)',
							},
						],
					},
					{
						displayName: 'Update Fields',
						name: 'updateFields',
						type: 'collection',
						placeholder: 'Add Field',
						default: {},
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['update'],
							},
						},
						options: [
							{
								displayName: 'Task Description',
								name: 'task',
								type: 'string',
								default: '',
								placeholder: 'e.g. Go to Google and search for browser automation',
								description: 'Update the task description',
							},
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								options: [
									{
										name: 'Running',
										value: 'running',
									},
									{
										name: 'Stopped',
										value: 'stopped',
									},
								],
								default: 'running',
								description: 'Update the task status',
							},
						],
					},
					{
						displayName: 'Return All',
						name: 'returnAll',
						type: 'boolean',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['getMany'],
							},
						},
						default: false,
						description: 'Whether to return all results or only up to a given limit',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['getMany'],
								returnAll: [false],
							},
						},
						typeOptions: {
							minValue: 1,
						},
						default: 50,
						description: 'Max number of results to return',
					},
					{
						displayName: 'Options',
						name: 'options',
						type: 'collection',
						placeholder: 'Add Option',
						default: {},
						displayOptions: {
							show: {
								resource: ['task'],
								operation: ['getMany'],
							},
						},
						options: [
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								options: [
									{
										name: 'All',
										value: 'all',
									},
									{
										name: 'Finished',
										value: 'finished',
									},
									{
										name: 'Running',
										value: 'running',
									},
									{
										name: 'Stopped',
										value: 'stopped',
									},
								],
								default: 'all',
								description: 'Filter tasks by their status',
							},
						],
					},
				],
				'v2',
			),
			...addApiVersionDisplayOptions(new BrowserUseV3().description.properties, 'v3'),
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const apiVersion = this.getNodeParameter('apiVersion', 0, 'v2') as string;

		if (apiVersion === 'v3') {
			return new BrowserUseV3().execute.call(this);
		}

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				if (resource === 'task') {
					if (operation === 'execute') {
						responseData = await executeTask.call(this, i);
					} else if (operation === 'get') {
						responseData = await getTask.call(this, i);
					} else if (operation === 'getMany') {
						responseData = await getTasks.call(this, i);
					} else if (operation === 'stop') {
						responseData = await stopTask.call(this, i);
					} else if (operation === 'update') {
						responseData = await updateTask.call(this, i);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push(...responseData);
				} else {
					returnData.push({
						json: responseData,
						pairedItem: {
							item: i,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as any).message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

async function executeTask(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const task = this.getNodeParameter('task', itemIndex) as string;
	const startUrl = this.getNodeParameter('startUrl', itemIndex) as string;
	const timeout = this.getNodeParameter('timeout', itemIndex, 300) as number;
	const enableStructuredOutput = this.getNodeParameter(
		'enableStructuredOutput',
		itemIndex,
		false,
	) as boolean;
	const schemaTemplate = this.getNodeParameter('schemaTemplate', itemIndex, 'custom') as string;
	const outputSchema = this.getNodeParameter('outputSchema', itemIndex, '') as string;
	const advancedOptions = this.getNodeParameter('advancedOptions', itemIndex, {}) as any;

	const parseJsonOption = (value: unknown, fallback: any) => {
		if (!value) {
			return fallback;
		}
		if (typeof value === 'string') {
			try {
				return JSON.parse(value);
			} catch {
				return fallback;
			}
		}
		return value;
	};

	const parsedMetadata = parseJsonOption(advancedOptions.metadata, null);
	const parsedSecrets = parseJsonOption(advancedOptions.secrets, null);
	const parsedAllowedDomains = parseJsonOption(advancedOptions.allowedDomains, null);

	const metadata = {
		source: 'n8n-node',
		...(parsedMetadata && typeof parsedMetadata === 'object' && !Array.isArray(parsedMetadata)
			? parsedMetadata
			: {}),
	};

	// Validate required parameters
	if (!task.trim()) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Task Description" parameter cannot be empty. Please provide a description of what you want the AI agent to do.',
			{ level: 'warning' },
		);
	}

	// Validate task length (1-20,000 characters as per API docs)
	if (task.trim().length > 20000) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Task Description" exceeds the maximum length of 20,000 characters. Please shorten your description.',
			{ level: 'warning' },
		);
	}

	// Validate URL format if provided
	if (startUrl && startUrl.trim()) {
		try {
			new URL(startUrl);
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				'The "Starting URL" parameter has an invalid format. Please provide a valid URL starting with http:// or https://',
				{ level: 'warning' },
			);
		}
	}

	// Validate timeout
	if (timeout < 10 || timeout > 3600) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Timeout" parameter must be between 10 and 3600 seconds. Please adjust the timeout value.',
			{ level: 'warning' },
		);
	}

	// Build request body according to v2 API
	const body: any = {
		task: task.trim(),
		...(startUrl && startUrl.trim() && { startUrl: startUrl.trim() }),
		...(advancedOptions.maxSteps && { maxSteps: advancedOptions.maxSteps }),
		llm: advancedOptions.llm || 'browser-use-2.0',
		...(advancedOptions.sessionId && {
			sessionId:
				typeof advancedOptions.sessionId === 'string'
					? advancedOptions.sessionId.trim()
					: advancedOptions.sessionId,
		}),
		...(parsedAllowedDomains && Array.isArray(parsedAllowedDomains)
			? { allowedDomains: parsedAllowedDomains }
			: {}),
		...(parsedSecrets && typeof parsedSecrets === 'object' && !Array.isArray(parsedSecrets)
			? { secrets: parsedSecrets }
			: {}),
		...(advancedOptions.opVaultId && { opVaultId: advancedOptions.opVaultId }),
		...(advancedOptions.highlightElements && {
			highlightElements: advancedOptions.highlightElements,
		}),
		...(advancedOptions.flashMode && { flashMode: advancedOptions.flashMode }),
		...(advancedOptions.thinking && { thinking: advancedOptions.thinking }),
		...(advancedOptions.vision !== undefined && { vision: advancedOptions.vision }),
		...(advancedOptions.systemPromptExtension && {
			systemPromptExtension: advancedOptions.systemPromptExtension,
		}),
		...(advancedOptions.judge && { judge: advancedOptions.judge }),
		...(advancedOptions.judgeGroundTruth && {
			judgeGroundTruth: advancedOptions.judgeGroundTruth,
		}),
		...(advancedOptions.judgeLlm && { judgeLlm: advancedOptions.judgeLlm }),
		metadata,
	};

	// Add structured output if enabled
	if (enableStructuredOutput) {
		let schema: any;

		// Handle schema templates
		if (schemaTemplate && schemaTemplate !== 'custom') {
			schema = getSchemaTemplate(schemaTemplate);
		} else if (outputSchema) {
			try {
				schema = typeof outputSchema === 'string' ? JSON.parse(outputSchema) : outputSchema;

				// Validate the parsed schema
				if (!schema || typeof schema !== 'object') {
					throw new NodeOperationError(
						this.getNode(),
						'The "Custom Data Format" must be a valid JSON object or array. Please check your JSON syntax.',
						{ level: 'warning' },
					);
				}

				// Check for common schema mistakes
				if (Array.isArray(schema)) {
					if (schema.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							'The "Custom Data Format" array cannot be empty. Please provide at least one example object to define the structure.',
							{ level: 'warning' },
						);
					}
					if (typeof schema[0] !== 'object' || schema[0] === null) {
						throw new NodeOperationError(
							this.getNode(),
							'The "Custom Data Format" array items must be objects. Example: [{"name": "string", "age": "number"}]',
							{ level: 'warning' },
						);
					}
				} else if (schema.type) {
					// If it claims to be a JSON Schema, validate basic structure
					const validTypes = ['object', 'array', 'string', 'number', 'boolean', 'null'];
					if (!validTypes.includes(schema.type)) {
						throw new NodeOperationError(
							this.getNode(),
							`The "Custom Data Format" has an unknown type "${schema.type}". Valid types are: ${validTypes.join(', ')}`,
							{ level: 'warning' },
						);
					}
					if (schema.type === 'object' && !schema.properties) {
						throw new NodeOperationError(
							this.getNode(),
							'The "Custom Data Format" object type must have a "properties" field. Please define the object structure.',
							{ level: 'warning' },
						);
					}
					if (schema.type === 'array' && !schema.items) {
						throw new NodeOperationError(
							this.getNode(),
							'The "Custom Data Format" array type must have an "items" field. Please define the array item structure.',
							{ level: 'warning' },
						);
					}
				}
			} catch (error) {
				if (error instanceof NodeOperationError) {
					throw error; // Re-throw our custom errors
				}
				throw new NodeOperationError(
					this.getNode(),
					`The "Custom Data Format" has invalid JSON syntax: ${(error as any).message}. Please check your JSON format.`,
					{ level: 'warning' },
				);
			}
		} else {
			throw new NodeOperationError(
				this.getNode(),
				'"Extract Structured Data" is enabled but no schema is provided. Please select a data template or provide a custom JSON schema.',
				{ level: 'warning' },
			);
		}

		// Validate and apply schema
		if (schema && typeof schema === 'object') {
			// Convert to proper JSON Schema format
			let validSchema = schema;

			// Helper function to convert properties to proper JSON Schema format
			const convertProperties = (properties: any): any => {
				const converted: any = {};
				for (const [key, value] of Object.entries(properties)) {
					if (typeof value === 'string') {
						// Convert simple string types like "string" to proper JSON Schema objects
						converted[key] = { type: value };
					} else if (
						value &&
						typeof value === 'object' &&
						!(value as any).type &&
						!Array.isArray(value)
					) {
						// If it's an object without a type, recursively convert it
						converted[key] = {
							type: 'object',
							properties: convertProperties(value),
						};
					} else {
						// Keep as-is if it's already properly formatted
						converted[key] = value;
					}
				}
				return converted;
			};

			if (!schema.type) {
				// If no 'type' property, wrap it in a proper JSON schema structure
				if (Array.isArray(schema)) {
					// Convert simple object to proper JSON Schema properties
					const firstItem = schema[0] || {};
					const properties = convertProperties(firstItem);

					validSchema = {
						type: 'array',
						items: {
							type: 'object',
							properties,
							required: Object.keys(firstItem),
						},
					};
				} else {
					// Convert simple object to proper JSON Schema properties
					const properties = convertProperties(schema);

					validSchema = {
						type: 'object',
						properties,
						required: Object.keys(schema),
					};
				}
			} else if (schema.type === 'object' && schema.properties) {
				// Even if it has a type, ensure all properties are properly formatted
				validSchema = {
					...schema,
					properties: convertProperties(schema.properties),
				};
			}

			// API expects stringified JSON schema
			body.structuredOutput = JSON.stringify(validSchema);
			// Enhance task description to emphasize structured output requirement
			body.task = `${body.task}\n\nIMPORTANT: Extract and return data in the exact JSON structure specified. Follow the schema strictly.`;
		}
	}

	const response = await makeApiCall.call(this, 'POST', '/tasks', body);

	if (!response.id) {
		throw new NodeOperationError(
			this.getNode(),
			'The Browser Use API returned an unexpected response without a task ID. Please try again or contact support if the issue persists.',
			{ level: 'warning' },
		);
	}

	// Poll for completion with reverse backoff
	const taskId = response.id;
	const startTime = Date.now();
	let lastStatus = '';

	while (Date.now() - startTime < timeout * 1000) {
		const taskDetails = await makeApiCall.call(this, 'GET', `/tasks/${taskId}`);

		// Log status changes for better user experience
		if (taskDetails.status !== lastStatus) {
			lastStatus = taskDetails.status;
		}

		if (taskDetails.status === 'finished') {
			// Task finished - return results regardless of isSuccess
			// isSuccess indicates if the AI agent was able to complete the task,
			// but we still return the results so users can see what happened
			return {
				...formatOutput(taskDetails),
				isSuccess: taskDetails.isSuccess,
				agentMessage: taskDetails.isSuccess
					? 'AI agent successfully completed the task'
					: 'AI agent was unable to fully complete the task',
				cloudUrl: taskDetails.sessionId
					? `https://cloud.browser-use.com/agent/${taskDetails.sessionId}`
					: null,
			};
		} else if (taskDetails.status === 'stopped') {
			throw new NodeOperationError(
				this.getNode(),
				`The task was stopped: ${taskDetails.error || taskDetails.output || 'Task execution was halted'}. Please check the task configuration and try again.`,
				{ level: 'warning' },
			);
		}

		// Continue polling without delay - API handles rate limiting
	}

	// Return partial results even if not completed
	const finalTask = await makeApiCall.call(this, 'GET', `/tasks/${taskId}`);
	return {
		...formatOutput(finalTask),
		warning: `The task did not complete within ${timeout} seconds but may still be running on the server`,
		cloudUrl: finalTask.sessionId
			? `https://cloud.browser-use.com/agent/${finalTask.sessionId}`
			: null,
	};
}

function formatOutput(taskData: any): any {
	// Always return complete task data
	return taskData;
}

async function makeApiCall(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body?: any,
): Promise<any> {
	const credentials = await this.getCredentials('browserUseApi');
	const options: any = {
		method,
		baseURL: credentials.baseUrl as string,
		url: endpoint,
		headers: {
			'Content-Type': 'application/json',
		},
		timeout: 30000,
		json: true,
	};

	if (body) {
		options.body = body;
	}

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'browserUseApi',
			options,
		);
		return response;
	} catch (error: unknown) {
		const apiError = error as JsonObject;

		if ((error as any).response) {
			const statusCode = (error as any).response.status;
			const responseData = (error as any).response.data;
			const errorMessage = extractErrorMessage(error, responseData);
			const httpCode = statusCode ? String(statusCode) : undefined;

			switch (statusCode) {
				case 400:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'The request could not be processed',
						description: `${errorMessage}. Please check your parameters and try again.`,
						httpCode,
						level: 'warning',
					});
				case 401:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'Authentication was not successful',
						description: 'Please verify your API key in the credentials is correct.',
						httpCode,
						level: 'warning',
					});
				case 404:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'The requested resource could not be found',
						description: `${errorMessage}. Please verify the resource exists.`,
						httpCode,
						level: 'warning',
					});
				case 422: {
					// Provide more detailed error message for validation errors
					let detailedMessage = 'The request parameters could not be validated: ';
					if (errorMessage) {
						detailedMessage += errorMessage;
					} else {
						detailedMessage += 'One or more parameters are invalid';
					}

					// Add helpful hints for common 422 errors
					const errorText = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';
					if (errorText.includes('schema')) {
						detailedMessage +=
							'\n\nTip: Check your JSON schema format. Properties should be objects like {"type": "string"} not just "string".';
					} else if (errorText.includes('structured')) {
						detailedMessage +=
							'\n\nTip: Ensure your structured output schema is valid JSON Schema format.';
					} else {
						detailedMessage += '\n\nTip: Check your task description, URLs, and schema format.';
					}

					throw new NodeApiError(this.getNode(), apiError, {
						message: 'The request parameters could not be validated',
						description: detailedMessage,
						httpCode,
						level: 'warning',
					});
				}
				case 429:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'Rate limit exceeded or too many concurrent sessions',
						description: 'Please try again later.',
						httpCode,
						level: 'warning',
					});
				case 500:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'The Browser Use API encountered a server issue',
						description: `${errorMessage}. Please try again later or contact support if the issue persists.`,
						httpCode,
						level: 'warning',
					});
				default:
					throw new NodeApiError(this.getNode(), apiError, {
						message: `The API request was not successful (status ${statusCode})`,
						description: `${errorMessage}. Please check your configuration and try again.`,
						httpCode,
						level: 'warning',
					});
			}
		} else if ((error as any).code === 'ECONNREFUSED') {
			throw new NodeApiError(this.getNode(), apiError, {
				message: 'Connection to the Browser Use API could not be established',
				description: 'Please verify the service is available and try again.',
				level: 'warning',
			});
		} else if ((error as any).code === 'ETIMEDOUT') {
			throw new NodeApiError(this.getNode(), apiError, {
				message: 'The request to the Browser Use API timed out',
				description: 'Please check your network connection and try again.',
				level: 'warning',
			});
		}

		throw new NodeApiError(this.getNode(), apiError, {
			message: 'An unexpected issue occurred while calling the Browser Use API',
			description: `${(error as Error).message}. Please try again or contact support if the issue persists.`,
			level: 'warning',
		});
	}
}

function extractErrorMessage(error: unknown, responseData: any): string {
	if (responseData) {
		const rawMessage =
			responseData.message ||
			responseData.error ||
			responseData.detail ||
			responseData.details ||
			(responseData.errors && Array.isArray(responseData.errors)
				? responseData.errors.join(', ')
				: '') ||
			JSON.stringify(responseData);

		return typeof rawMessage === 'string' ? rawMessage : String(rawMessage);
	}

	const fallbackMessage = (error as Error).message || 'Unknown error';
	return typeof fallbackMessage === 'string' ? fallbackMessage : String(fallbackMessage);
}

async function getTask(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const taskId = this.getNodeParameter('taskId', itemIndex) as string;

	if (!taskId || !taskId.trim()) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Task ID" parameter is required. Please provide a valid task ID.',
			{ level: 'warning' },
		);
	}

	const response = await makeApiCall.call(this, 'GET', `/tasks/${taskId.trim()}`);
	return response;
}

async function getTasks(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const options = this.getNodeParameter('options', itemIndex, {}) as any;

	let response = await makeApiCall.call(this, 'GET', '/tasks');

	// Filter by status if specified
	if (options.status && options.status !== 'all' && Array.isArray(response)) {
		response = response.filter((task: any) => task.status === options.status);
	}

	// Apply limit if not returning all
	if (!returnAll && Array.isArray(response)) {
		response = response.slice(0, limit);
	}

	// Return as array of items for n8n
	if (Array.isArray(response)) {
		return response.map((task: any) => ({
			json: task,
		}));
	}

	return response;
}

async function stopTask(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const taskId = this.getNodeParameter('taskId', itemIndex) as string;

	if (!taskId || !taskId.trim()) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Task ID" parameter is required. Please provide a valid task ID.',
			{ level: 'warning' },
		);
	}

	// For v2 API, we can use PATCH to update the status to stopped
	const body = {
		status: 'stopped',
	};

	const response = await makeApiCall.call(this, 'PATCH', `/tasks/${taskId.trim()}`, body);

	return {
		success: true,
		message: 'Task stopped successfully',
		...response,
	};
}

async function updateTask(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const taskId = this.getNodeParameter('taskId', itemIndex) as string;
	const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as any;

	if (!taskId || !taskId.trim()) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Task ID" parameter is required. Please provide a valid task ID.',
			{ level: 'warning' },
		);
	}

	if (!updateFields || Object.keys(updateFields).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'No fields to update were provided. Please add at least one field to update in the "Update Fields" collection.',
			{ level: 'warning' },
		);
	}

	const body: any = {};

	if (updateFields.task) {
		body.task = updateFields.task;
	}

	if (updateFields.status) {
		body.status = updateFields.status;
	}

	const response = await makeApiCall.call(this, 'PATCH', `/tasks/${taskId.trim()}`, body);
	return response;
}

function getSchemaTemplate(templateType: string): any {
	const templates: Record<string, any> = {
		product: {
			type: 'object',
			properties: {
				productName: { type: 'string' },
				price: { type: 'string' },
				description: { type: 'string' },
				inStock: { type: 'boolean' },
				images: {
					type: 'array',
					items: { type: 'string' },
				},
				specifications: { type: 'object' },
				rating: { type: 'number' },
				reviews: { type: 'number' },
			},
			required: ['productName', 'price'],
		},
		contact: {
			type: 'object',
			properties: {
				companyName: { type: 'string' },
				email: { type: 'string' },
				phone: { type: 'string' },
				address: { type: 'string' },
				website: { type: 'string' },
				socialMedia: {
					type: 'object',
					properties: {
						twitter: { type: 'string' },
						linkedin: { type: 'string' },
						facebook: { type: 'string' },
					},
				},
			},
			required: ['companyName'],
		},
		article: {
			type: 'object',
			properties: {
				title: { type: 'string' },
				author: { type: 'string' },
				publishDate: { type: 'string' },
				content: { type: 'string' },
				summary: { type: 'string' },
				tags: {
					type: 'array',
					items: { type: 'string' },
				},
				readTime: { type: 'string' },
				category: { type: 'string' },
			},
			required: ['title', 'content'],
		},
		company: {
			type: 'object',
			properties: {
				companyName: { type: 'string' },
				industry: { type: 'string' },
				description: { type: 'string' },
				foundedYear: { type: 'string' },
				headquarters: { type: 'string' },
				employees: { type: 'string' },
				revenue: { type: 'string' },
				website: { type: 'string' },
				contactInfo: {
					type: 'object',
					properties: {
						email: { type: 'string' },
						phone: { type: 'string' },
						address: { type: 'string' },
					},
				},
				keyPeople: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							position: { type: 'string' },
						},
					},
				},
			},
			required: ['companyName', 'description'],
		},
	};

	return templates[templateType] || templates.product;
}
