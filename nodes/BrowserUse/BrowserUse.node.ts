import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

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
		inputs: [{ type: 'main' as NodeConnectionType }],
		outputs: [{ type: 'main' as NodeConnectionType }],
		credentials: [
			{
				name: 'browserUseApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: '🚀 Get Started with Browser Use',
				name: 'getStartedNotice',
				type: 'notice',
				default: '',
				typeOptions: {
					theme: 'info',
				},
			},
			{
				displayName: 'Need an API key? Sign up at <a href="https://cloud.browser-use.com" target="_blank">cloud.browser-use.com</a>',
				name: 'signupNotice',
				type: 'notice',
				default: '',
				typeOptions: {
					theme: 'success',
				},
			},
			{
				displayName: 'Documentation: <a href="https://docs.cloud.browser-use.com" target="_blank">docs.cloud.browser-use.com</a>',
				name: 'docsNotice',
				type: 'notice',
				default: '',
				typeOptions: {
					theme: 'info',
				},
			},
			{
				displayName: 'Task Description',
				name: 'task',
				type: 'string',
				default: '',
				placeholder:
					'e.g., "Go to Google and search for browser automation" or "Fill out the contact form with my details"',
				description:
					'Describe what you want the AI agent to do in natural language (1-20,000 characters)',
				required: true,
			},
			{
				displayName: 'Starting URL (Optional)',
				name: 'startUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com',
				description: 'Starting URL for the task (optional)',
			},
			{
				displayName: 'Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Maximum time to wait for task completion (10-3600 seconds)',
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
				description: 'Extract data in a specific JSON format for easier processing',
			},
			{
				displayName: 'Configure the data structure you want to extract below ↓',
				name: 'structuredOutputNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
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
						enableStructuredOutput: [true],
					},
				},
				options: [
					{
						name: 'Custom Format',
						value: 'custom',
					},
					{
						name: 'Product Information',
						value: 'product',
					},
					{
						name: 'Contact Information',
						value: 'contact',
					},
					{
						name: 'Article/Blog Content',
						value: 'article',
					},
					{
						name: 'Company Information',
						value: 'company',
					},
				],
				default: 'custom',
				description: 'Choose a pre-built template or define custom format',
			},
			{
				displayName: 'Custom Data Format (JSON Schema)',
				name: 'outputSchema',
				type: 'json',
				displayOptions: {
					show: {
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
				options: [
					{
						displayName: 'Max Steps',
						name: 'maxSteps',
						type: 'number',
						default: 30,
						description: 'Maximum number of steps the agent can take (1-200)',
						typeOptions: {
							minValue: 1,
							maxValue: 200,
						},
					},
					{
						displayName: 'AI Model',
						name: 'llm',
						type: 'options',
						options: [
							{
								name: 'Gemini 2.5 Flash (Default)',
								value: 'gemini-2.5-flash',
							},
							{
								name: 'GPT-4.1',
								value: 'gpt-4.1',
							},
							{
								name: 'GPT-4.1 Mini',
								value: 'gpt-4.1-mini',
							},
							{
								name: 'GPT-4o',
								value: 'gpt-4o',
							},
							{
								name: 'GPT-4o Mini',
								value: 'gpt-4o-mini',
							},
							{
								name: 'O4 Mini',
								value: 'o4-mini',
							},
							{
								name: 'O3',
								value: 'o3',
							},
							{
								name: 'Gemini 2.5 Flash',
								value: 'gemini-2.5-flash',
							},
							{
								name: 'Gemini 2.5 Pro',
								value: 'gemini-2.5-pro',
							},
							{
								name: 'Claude Sonnet 4',
								value: 'claude-sonnet-4-20250514',
							},
							{
								name: 'Claude 3.7 Sonnet',
								value: 'claude-3-7-sonnet-20250219',
							},
							{
								name: 'Llama 4 Maverick',
								value: 'llama-4-maverick-17b-128e-instruct',
							},
						],
						default: 'gemini-2.5-flash',
						description: 'AI model to use for the task',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const responseData = await executeTask.call(this, i);

				returnData.push({
					json: responseData,
					pairedItem: {
						item: i,
					},
				});
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


	// Validate required parameters
	if (!task.trim()) {
		throw new NodeOperationError(
			this.getNode(),
			'Task description is required and cannot be empty',
			{ level: 'warning' },
		);
	}

	// Validate task length (1-20,000 characters as per API docs)
	if (task.trim().length > 20000) {
		throw new NodeOperationError(
			this.getNode(),
			'Task description must be 20,000 characters or less',
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
				'Invalid URL format. Please provide a valid URL starting with http:// or https://',
				{ level: 'warning' },
			);
		}
	}

	// Validate timeout
	if (timeout < 10 || timeout > 3600) {
		throw new NodeOperationError(
			this.getNode(),
			'Timeout must be between 10 and 3600 seconds (1 hour)',
			{ level: 'warning' },
		);
	}

	// Build request body according to v2 API
	const body: any = {
		task: task.trim(),
		...(startUrl && startUrl.trim() && { startUrl: startUrl.trim() }),
		...(advancedOptions.maxSteps && { maxSteps: advancedOptions.maxSteps }),
		llm: advancedOptions.llm || 'gemini-2.5-flash',
		metadata: {
			source: 'n8n-node',
		},
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
						'Invalid JSON schema: Schema must be a valid JSON object or array',
						{ level: 'warning' },
					);
				}
				
				// Check for common schema mistakes
				if (Array.isArray(schema)) {
					if (schema.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid JSON schema: Array schema cannot be empty. Please provide at least one example object.',
							{ level: 'warning' },
						);
					}
					if (typeof schema[0] !== 'object' || schema[0] === null) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid JSON schema: Array items must be objects. Example: [{"name": "string", "age": "number"}]',
							{ level: 'warning' },
						);
					}
				} else if (schema.type) {
					// If it claims to be a JSON Schema, validate basic structure
					const validTypes = ['object', 'array', 'string', 'number', 'boolean', 'null'];
					if (!validTypes.includes(schema.type)) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid JSON schema: Unknown type "${schema.type}". Valid types are: ${validTypes.join(', ')}`,
							{ level: 'warning' },
						);
					}
					if (schema.type === 'object' && !schema.properties) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid JSON schema: Object type must have "properties" field',
							{ level: 'warning' },
						);
					}
					if (schema.type === 'array' && !schema.items) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid JSON schema: Array type must have "items" field',
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
					`Invalid JSON schema: ${(error as any).message}. Please check your JSON syntax.`,
					{ level: 'warning' },
				);
			}
		} else {
				throw new NodeOperationError(
				this.getNode(),
				'Structured output is enabled but no schema is provided. Please select a template or provide a custom JSON schema.',
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
					} else if (value && typeof value === 'object' && !(value as any).type && !Array.isArray(value)) {
						// If it's an object without a type, recursively convert it
						converted[key] = {
							type: 'object',
							properties: convertProperties(value)
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
						type: "array",
						items: {
							type: "object",
							properties,
							required: Object.keys(firstItem)
						}
					};
				} else {
					// Convert simple object to proper JSON Schema properties
					const properties = convertProperties(schema);
					
					validSchema = {
						type: "object",
						properties,
						required: Object.keys(schema)
					};
				}
				} else if (schema.type === 'object' && schema.properties) {
				// Even if it has a type, ensure all properties are properly formatted
				validSchema = {
					...schema,
					properties: convertProperties(schema.properties)
				};
				}
			
			// API expects stringified JSON schema
			body.structuredOutput = JSON.stringify(validSchema);
				// Enhance task description to emphasize structured output requirement
			body.task = `${body.task}\n\nIMPORTANT: Extract and return data in the exact JSON structure specified. Follow the schema strictly.`;
		} else {
			}
	}

	const response = await makeApiCall.call(this, 'POST', '/tasks', body);

	if (!response.id) {
		throw new NodeOperationError(
			this.getNode(),
			'Invalid response from Browser Use API: missing task id',
			{ level: 'warning' },
		);
	}

	// Poll for completion with reverse backoff
	const taskId = response.id;
	const startTime = Date.now();
	let lastStatus = '';
	let pollCount = 0;

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
				`Task was stopped: ${taskDetails.error || taskDetails.output || 'Task execution was halted'}`,
				{ level: 'warning' },
			);
		}

		let pollInterval;
		pollInterval = 3000; // 3 seconds for polls

		await new Promise((resolve) => setTimeout(resolve, pollInterval));
		pollCount++;
	}

	// Return partial results even if not completed
	const finalTask = await makeApiCall.call(this, 'GET', `/tasks/${taskId}`);
	return {
		...formatOutput(finalTask),
		warning: `Task did not complete within ${timeout} seconds but may still be running`,
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
	const baseUrl = credentials.baseUrl as string;

	const options: any = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			'X-Browser-Use-API-Key': credentials.apiKey as string,
		},
		timeout: 30000,
	};

	if (body) {
		options.body = JSON.stringify(body);
	}

	try {
		const response = await this.helpers.httpRequest(options);
		return response;
	} catch (error: unknown) {
		// Handle different types of API errors
		if ((error as any).response) {
			const statusCode = (error as any).response.status;
			const responseData = (error as any).response.data;
			
			// Extract detailed error information
			let errorMessage = '';
			if (responseData) {
				// Try different common error message fields
				const rawMessage = 
					responseData.message ||
					responseData.error ||
					responseData.detail ||
					responseData.details ||
					(responseData.errors && Array.isArray(responseData.errors) ? responseData.errors.join(', ') : '') ||
					JSON.stringify(responseData);
				
				// Ensure errorMessage is always a string
				errorMessage = typeof rawMessage === 'string' ? rawMessage : String(rawMessage);
			}
			
			// Fallback to error message
			if (!errorMessage) {
				const fallbackMessage = (error as any).message || 'Unknown error';
				errorMessage = typeof fallbackMessage === 'string' ? fallbackMessage : String(fallbackMessage);
			}

			switch (statusCode) {
				case 400:
					throw new NodeOperationError(this.getNode(), `Bad request: ${errorMessage}`, {
						level: 'warning',
					});
				case 401:
					throw new NodeOperationError(
						this.getNode(),
						'Authentication failed. Please check your API key.',
						{ level: 'warning' },
					);
				case 404:
					throw new NodeOperationError(this.getNode(), `Resource not found: ${errorMessage}`, {
						level: 'warning',
					});
				case 422:
					// Provide more detailed error message for validation errors
					let detailedMessage = 'Validation error: ';
					if (errorMessage) {
						detailedMessage += errorMessage;
					} else {
						detailedMessage += 'The request parameters are invalid. ';
					}
					
					// Add helpful hints for common 422 errors
					const errorText = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';
					if (errorText.includes('schema')) {
						detailedMessage += '\n\nTip: Check your JSON schema format. Properties should be objects like {"type": "string"} not just "string".';
					} else if (errorText.includes('structured')) {
						detailedMessage += '\n\nTip: Ensure your structured output schema is valid JSON Schema format.';
					} else {
						detailedMessage += '\n\nTip: Check your task description, URLs, and schema format.';
					}
					
					throw new NodeOperationError(this.getNode(), detailedMessage, {
						level: 'warning',
					});
				case 429:
					throw new NodeOperationError(
						this.getNode(),
						'Rate limit exceeded or too many concurrent sessions. Please try again later.',
						{ level: 'warning' },
					);
				case 500:
					throw new NodeOperationError(
						this.getNode(),
						`Browser Use API server error: ${errorMessage}`,
						{ level: 'warning' },
					);
				default:
					throw new NodeOperationError(
						this.getNode(),
						`API request failed (${statusCode}): ${errorMessage}`,
						{ level: 'warning' },
					);
			}
		} else if ((error as any).code === 'ECONNREFUSED') {
			throw new NodeOperationError(
				this.getNode(),
				'Could not connect to Browser Use API. Please check if the service is available.',
				{ level: 'warning' },
			);
		} else if ((error as any).code === 'ETIMEDOUT') {
			throw new NodeOperationError(
				this.getNode(),
				'Request to Browser Use API timed out. Please try again.',
				{ level: 'warning' },
			);
		}

		throw new NodeOperationError(this.getNode(), `Unexpected error: ${(error as any).message}`, {
			level: 'warning',
		});
	}
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
