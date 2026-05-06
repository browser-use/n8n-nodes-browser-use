/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

const TERMINAL_SESSION_STATUSES = ['idle', 'stopped', 'timed_out', 'error'];

const V3_MODELS = [
	{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4.6' },
	{ name: 'Claude Opus 4.6', value: 'claude-opus-4.6' },
	{ name: 'Gemini 3 Flash', value: 'gemini-3-flash' },
	{ name: 'Browser Use Mini', value: 'bu-mini' },
	{ name: 'Browser Use Max', value: 'bu-max' },
	{ name: 'Browser Use Ultra', value: 'bu-ultra' },
] as const;

export class BrowserUseV3 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browser Use v3',
		name: 'browserUseV3',
		icon: 'file:browseruse.svg',
		group: ['transform'],
		version: 1,
		description: 'Automate browsers with Browser Use Cloud API v3',
		defaults: {
			name: 'Browser Use v3',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Session',
						value: 'session',
						description: 'Run and manage v3 agent sessions',
					},
					{
						name: 'Browser',
						value: 'browser',
						description: 'Create and manage standalone cloud browser sessions',
					},
				],
				default: 'session',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['session'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an idle session or dispatch a task',
						action: 'Create a session',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Soft-delete a session',
						action: 'Delete a session',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a session',
						action: 'Get a session',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'List sessions',
						action: 'Get many sessions',
					},
					{
						name: 'Get Messages',
						value: 'getMessages',
						description: 'List messages for a session',
						action: 'Get session messages',
					},
					{
						name: 'Run and Wait',
						value: 'runAndWait',
						description: 'Create or reuse a session, run a task, and poll until completion',
						action: 'Run a task and wait',
					},
					{
						name: 'Stop',
						value: 'stop',
						description: 'Stop a session or the current task',
						action: 'Stop a session',
					},
				],
				default: 'runAndWait',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['browser'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a standalone browser session with live and CDP URLs',
						action: 'Create a browser session',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get browser session details',
						action: 'Get a browser session',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'List browser sessions',
						action: 'Get many browser sessions',
					},
					{
						name: 'Stop',
						value: 'stop',
						description: 'Stop a browser session',
						action: 'Stop a browser session',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Task',
				name: 'task',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['create', 'runAndWait'],
					},
				},
				placeholder: 'e.g. Find the top 3 trending repositories on GitHub today',
				description:
					'Natural-language task for the agent. Required for Run and Wait. Leave empty on Create to create an idle session.',
			},
			{
				displayName: 'Starting URL',
				name: 'startUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['create', 'runAndWait'],
					},
				},
				placeholder: 'e.g. https://example.com',
				description: 'Optional URL to include at the start of the agent instruction',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['get', 'stop', 'delete', 'getMessages'],
					},
				},
				description: 'The Browser Use v3 session ID',
				required: true,
			},
			{
				displayName: 'Wait Timeout',
				name: 'waitTimeout',
				type: 'number',
				default: 900,
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['runAndWait'],
					},
				},
				description: 'Maximum time in seconds to poll for task completion',
				typeOptions: {
					minValue: 10,
					maxValue: 14400,
				},
			},
			{
				displayName: 'Extract Structured Data',
				name: 'enableStructuredOutput',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['create', 'runAndWait'],
					},
				},
				description: 'Whether to request a final output matching a JSON Schema',
			},
			{
				displayName: 'Data Template',
				name: 'schemaTemplate',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['create', 'runAndWait'],
						enableStructuredOutput: [true],
					},
				},
				options: [
					{
						name: 'Article/Blog Content',
						value: 'article',
					},
					{
						name: 'Company Information',
						value: 'company',
					},
					{
						name: 'Contact Information',
						value: 'contact',
					},
					{
						name: 'Custom JSON Schema',
						value: 'custom',
					},
					{
						name: 'Product Information',
						value: 'product',
					},
				],
				default: 'custom',
				description: 'Choose a pre-built schema or provide a custom one',
			},
			{
				displayName: 'Output Schema',
				name: 'outputSchema',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['create', 'runAndWait'],
						enableStructuredOutput: [true],
						schemaTemplate: ['custom'],
					},
				},
				default:
					'{\n  "type": "object",\n  "properties": {\n    "title": {"type": "string"},\n    "description": {"type": "string"},\n    "items": {"type": "array", "items": {"type": "object"}}\n  },\n  "required": ["title"]\n}',
				description: 'JSON Schema that the final output must conform to',
			},
			{
				displayName: 'Session Options',
				name: 'sessionOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['create', 'runAndWait'],
					},
				},
				options: [
					{
						displayName: 'AgentMail',
						name: 'agentmail',
						type: 'boolean',
						default: true,
						description: 'Whether to provision a temporary email inbox for the session',
					},
					{
						displayName: 'Cache Script',
						name: 'cacheScript',
						type: 'options',
						options: [
							{
								name: 'Auto',
								value: 'auto',
							},
							{
								name: 'Disabled',
								value: 'disabled',
							},
							{
								name: 'Enabled',
								value: 'enabled',
							},
						],
						default: 'auto',
						description: 'Whether to enable deterministic script caching',
					},
					{
						displayName: 'Disable Proxy',
						name: 'disableProxy',
						type: 'boolean',
						default: false,
						description: 'Whether to disable the Browser Use proxy for this session',
					},
					{
						displayName: 'Enable Recording',
						name: 'enableRecording',
						type: 'boolean',
						default: false,
						description: 'Whether to record the browser session',
					},
					{
						displayName: 'Enable Scheduled Tasks',
						name: 'enableScheduledTasks',
						type: 'boolean',
						default: false,
						description: 'Whether the agent can create scheduled tasks',
					},
					{
						displayName: 'Keep Alive',
						name: 'keepAlive',
						type: 'boolean',
						default: false,
						description:
							'Whether to keep the session idle after task completion for follow-up tasks',
					},
					{
						displayName: 'Max Cost USD',
						name: 'maxCostUsd',
						type: 'number',
						default: 0,
						description: 'Maximum total cost in USD allowed for this session',
						typeOptions: {
							minValue: 0,
						},
					},
					{
						displayName: 'Model',
						name: 'model',
						type: 'options',
						options: [...V3_MODELS],
						default: 'claude-sonnet-4.6',
						description: 'The model to use for the task',
					},
					{
						displayName: 'Profile ID',
						name: 'profileId',
						type: 'string',
						default: '',
						description: 'Browser profile ID to load into the session',
					},
					{
						displayName: 'Proxy Country Code',
						name: 'proxyCountryCode',
						type: 'string',
						default: 'us',
						description:
							'Two-letter proxy country code. Leave empty and enable Disable Proxy to disable proxy.',
					},
					{
						displayName: 'Session ID',
						name: 'existingSessionId',
						type: 'string',
						default: '',
						description: 'Existing idle session ID to dispatch this task to',
					},
					{
						displayName: 'Skills',
						name: 'skills',
						type: 'boolean',
						default: true,
						description: 'Whether to enable built-in agent skills',
					},
					{
						displayName: 'Workspace ID',
						name: 'workspaceId',
						type: 'string',
						default: '',
						description: 'Workspace ID to attach for persistent files',
					},
				],
			},
			{
				displayName: 'Stop Strategy',
				name: 'stopStrategy',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['stop'],
					},
				},
				options: [
					{
						name: 'Session',
						value: 'session',
						description: 'Destroy the sandbox and mark the session stopped',
					},
					{
						name: 'Task',
						value: 'task',
						description: 'Stop the running task and keep the session alive',
					},
				],
				default: 'session',
				description: 'Whether to stop the whole session or only the running task',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['session', 'browser'],
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
						resource: ['session', 'browser'],
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
				displayName: 'Browser List Options',
				name: 'browserListOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['browser'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Status',
						name: 'filterBy',
						type: 'options',
						options: [
							{
								name: 'Active',
								value: 'active',
							},
							{
								name: 'Stopped',
								value: 'stopped',
							},
						],
						default: 'active',
						description: 'Filter browser sessions by status',
					},
				],
			},
			{
				displayName: 'Messages Options',
				name: 'messagesOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['getMessages'],
					},
				},
				options: [
					{
						displayName: 'After Cursor',
						name: 'after',
						type: 'string',
						default: '',
						description: 'Return messages after this cursor',
					},
					{
						displayName: 'Before Cursor',
						name: 'before',
						type: 'string',
						default: '',
						description: 'Return messages before this cursor',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
						},
						description: 'Max number of results to return',
					},
				],
			},
			{
				displayName: 'Browser Session ID',
				name: 'browserSessionId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['browser'],
						operation: ['get', 'stop'],
					},
				},
				description: 'The standalone browser session ID',
				required: true,
			},
			{
				displayName: 'Browser Options',
				name: 'browserOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['browser'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Allow Resizing',
						name: 'allowResizing',
						type: 'boolean',
						default: false,
						description: 'Whether to allow browser resizing during the session',
					},
					{
						displayName: 'Browser Screen Height',
						name: 'browserScreenHeight',
						type: 'number',
						default: 1080,
						typeOptions: {
							minValue: 320,
							maxValue: 3456,
						},
						description: 'Custom browser screen height in pixels',
					},
					{
						displayName: 'Browser Screen Width',
						name: 'browserScreenWidth',
						type: 'number',
						default: 1920,
						typeOptions: {
							minValue: 320,
							maxValue: 6144,
						},
						description: 'Custom browser screen width in pixels',
					},
					{
						displayName: 'Custom Proxy',
						name: 'customProxy',
						type: 'json',
						default:
							'{\n  "host": "proxy.example.com",\n  "port": 8080,\n  "username": "",\n  "password": ""\n}',
						description: 'Custom proxy object to use for this browser session',
					},
					{
						displayName: 'Disable Proxy',
						name: 'disableProxy',
						type: 'boolean',
						default: false,
						description: 'Whether to disable the Browser Use proxy for this browser session',
					},
					{
						displayName: 'Enable Recording',
						name: 'enableRecording',
						type: 'boolean',
						default: false,
						description: 'Whether to record this browser session',
					},
					{
						displayName: 'Profile ID',
						name: 'profileId',
						type: 'string',
						default: '',
						description: 'Browser profile ID to load into the browser session',
					},
					{
						displayName: 'Proxy Country Code',
						name: 'proxyCountryCode',
						type: 'string',
						default: 'us',
						description: 'Two-letter proxy country code',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 60,
						typeOptions: {
							minValue: 1,
							maxValue: 240,
						},
						description: 'Browser session timeout in minutes',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				if (resource === 'session') {
					responseData = await executeSessionOperation.call(this, operation, i);
				} else if (resource === 'browser') {
					responseData = await executeBrowserOperation.call(this, operation, i);
				}

				if (Array.isArray(responseData)) {
					returnData.push(
						...responseData.map((entry) => ({
							json: entry,
							pairedItem: {
								item: i,
							},
						})),
					);
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
							error: (error as Error).message,
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

async function executeSessionOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<any> {
	if (operation === 'create') {
		return createSession.call(this, itemIndex);
	}
	if (operation === 'runAndWait') {
		return runSessionAndWait.call(this, itemIndex);
	}
	if (operation === 'get') {
		return getSession.call(this, itemIndex);
	}
	if (operation === 'getMany') {
		return getSessions.call(this, itemIndex);
	}
	if (operation === 'stop') {
		return stopSession.call(this, itemIndex);
	}
	if (operation === 'delete') {
		return deleteSession.call(this, itemIndex);
	}
	if (operation === 'getMessages') {
		return getSessionMessages.call(this, itemIndex);
	}

	throw new NodeOperationError(this.getNode(), `Unsupported session operation: ${operation}`);
}

async function executeBrowserOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<any> {
	if (operation === 'create') {
		return createBrowserSession.call(this, itemIndex);
	}
	if (operation === 'get') {
		return getBrowserSession.call(this, itemIndex);
	}
	if (operation === 'getMany') {
		return getBrowserSessions.call(this, itemIndex);
	}
	if (operation === 'stop') {
		return stopBrowserSession.call(this, itemIndex);
	}

	throw new NodeOperationError(this.getNode(), `Unsupported browser operation: ${operation}`);
}

async function createSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const body = buildSessionBody.call(this, itemIndex, false);
	return makeApiCall.call(this, 'POST', '/sessions', body);
}

async function runSessionAndWait(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const waitTimeout = this.getNodeParameter('waitTimeout', itemIndex, 900) as number;

	if (waitTimeout < 10 || waitTimeout > 14400) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Wait Timeout" parameter must be between 10 and 14400 seconds.',
			{ level: 'warning' },
		);
	}

	const response = await makeApiCall.call(
		this,
		'POST',
		'/sessions',
		buildSessionBody.call(this, itemIndex, true),
	);

	if (!response.id) {
		throw new NodeOperationError(
			this.getNode(),
			'The Browser Use API returned an unexpected response without a session ID.',
			{ level: 'warning' },
		);
	}

	const startTime = Date.now();
	let lastSession = response;

	while (Date.now() - startTime < waitTimeout * 1000) {
		lastSession = await makeApiCall.call(this, 'GET', `/sessions/${response.id}`);

		if (TERMINAL_SESSION_STATUSES.includes(lastSession.status)) {
			return {
				...lastSession,
				cloudUrl: `https://cloud.browser-use.com/agent/${lastSession.id}`,
			};
		}

		await sleep(2000);
	}

	return {
		...lastSession,
		warning: `The session did not complete within ${waitTimeout} seconds but may still be running.`,
		cloudUrl: `https://cloud.browser-use.com/agent/${response.id}`,
	};
}

function buildSessionBody(this: IExecuteFunctions, itemIndex: number, requireTask: boolean): any {
	const task = this.getNodeParameter('task', itemIndex, '') as string;
	const startUrl = this.getNodeParameter('startUrl', itemIndex, '') as string;
	const enableStructuredOutput = this.getNodeParameter(
		'enableStructuredOutput',
		itemIndex,
		false,
	) as boolean;
	const schemaTemplate = this.getNodeParameter('schemaTemplate', itemIndex, 'custom') as string;
	const outputSchema = this.getNodeParameter('outputSchema', itemIndex, '') as string;
	const options = this.getNodeParameter('sessionOptions', itemIndex, {}) as Record<string, any>;
	const body: any = {};
	const normalizedTask = buildTaskInstruction.call(this, task, startUrl, requireTask);

	if (normalizedTask) {
		body.task = normalizedTask;
	}

	if (options.model) {
		body.model = options.model;
	}

	if (options.existingSessionId) {
		body.sessionId = normalizeRequiredId.call(this, options.existingSessionId, 'Session ID');
	}

	if (Object.prototype.hasOwnProperty.call(options, 'keepAlive')) {
		body.keepAlive = options.keepAlive;
	}

	if (options.maxCostUsd && options.maxCostUsd > 0) {
		body.maxCostUsd = options.maxCostUsd;
	}

	if (options.profileId) {
		body.profileId = normalizeRequiredId.call(this, options.profileId, 'Profile ID');
	}

	if (options.workspaceId) {
		body.workspaceId = normalizeRequiredId.call(this, options.workspaceId, 'Workspace ID');
	}

	if (options.disableProxy) {
		body.proxyCountryCode = null;
	} else if (options.proxyCountryCode) {
		body.proxyCountryCode = String(options.proxyCountryCode).trim().toLowerCase();
	}

	if (Object.prototype.hasOwnProperty.call(options, 'enableScheduledTasks')) {
		body.enableScheduledTasks = options.enableScheduledTasks;
	}

	if (Object.prototype.hasOwnProperty.call(options, 'enableRecording')) {
		body.enableRecording = options.enableRecording;
	}

	if (Object.prototype.hasOwnProperty.call(options, 'skills')) {
		body.skills = options.skills;
	}

	if (Object.prototype.hasOwnProperty.call(options, 'agentmail')) {
		body.agentmail = options.agentmail;
	}

	if (options.cacheScript === 'enabled') {
		body.cacheScript = true;
	} else if (options.cacheScript === 'disabled') {
		body.cacheScript = false;
	} else if (options.cacheScript === 'auto') {
		body.cacheScript = null;
	}

	if (enableStructuredOutput) {
		body.outputSchema =
			schemaTemplate === 'custom'
				? parseJsonParameter.call(this, outputSchema, 'Output Schema')
				: getSchemaTemplate(schemaTemplate);
		validateJsonSchema.call(this, body.outputSchema, 'Output Schema');
	}

	return body;
}

function buildTaskInstruction(
	this: IExecuteFunctions,
	task: string,
	startUrl: string,
	requireTask: boolean,
): string | undefined {
	const trimmedTask = task.trim();
	const trimmedStartUrl = startUrl.trim();

	if (requireTask && !trimmedTask) {
		throw new NodeOperationError(this.getNode(), 'The "Task" parameter is required.', {
			level: 'warning',
		});
	}

	if (trimmedTask.length > 20000) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Task" parameter exceeds the maximum length of 20000 characters.',
			{ level: 'warning' },
		);
	}

	if (trimmedStartUrl) {
		validateUrl.call(this, trimmedStartUrl, 'Starting URL');
	}

	if (!trimmedTask && !trimmedStartUrl) {
		return undefined;
	}

	return [trimmedStartUrl ? `Start at ${trimmedStartUrl}.` : '', trimmedTask]
		.filter(Boolean)
		.join('\n\n');
}

async function getSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const sessionId = getSessionId.call(this, itemIndex);
	return makeApiCall.call(this, 'GET', `/sessions/${sessionId}`);
}

async function getSessions(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const pageSize = Math.min(returnAll ? 100 : limit, 100);
	const collected: any[] = [];
	let page = 1;
	let shouldContinue = true;

	while (shouldContinue) {
		const response = await makeApiCall.call(
			this,
			'GET',
			`/sessions?page=${page}&page_size=${pageSize}`,
		);
		const sessions = Array.isArray(response.sessions) ? response.sessions : [];
		collected.push(...sessions);

		if (!returnAll || sessions.length < pageSize || collected.length >= response.total) {
			shouldContinue = false;
		} else {
			page++;
		}
	}

	return returnAll ? collected : collected.slice(0, limit);
}

async function stopSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const sessionId = getSessionId.call(this, itemIndex);
	const strategy = this.getNodeParameter('stopStrategy', itemIndex, 'session') as string;

	return makeApiCall.call(this, 'POST', `/sessions/${sessionId}/stop`, { strategy });
}

async function deleteSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const sessionId = getSessionId.call(this, itemIndex);
	await makeApiCall.call(this, 'DELETE', `/sessions/${sessionId}`);

	return {
		success: true,
		id: sessionId,
	};
}

async function getSessionMessages(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const sessionId = getSessionId.call(this, itemIndex);
	const options = this.getNodeParameter('messagesOptions', itemIndex, {}) as Record<string, any>;
	const query = new URLSearchParams();

	if (options.limit) {
		query.set('limit', String(options.limit));
	}

	if (options.after) {
		query.set('after', String(options.after).trim());
	}

	if (options.before) {
		query.set('before', String(options.before).trim());
	}

	const suffix = query.toString() ? `?${query.toString()}` : '';
	return makeApiCall.call(this, 'GET', `/sessions/${sessionId}/messages${suffix}`);
}

async function createBrowserSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const options = this.getNodeParameter('browserOptions', itemIndex, {}) as Record<string, any>;
	const body: any = {};

	if (options.profileId) {
		body.profileId = normalizeRequiredId.call(this, options.profileId, 'Profile ID');
	}

	if (options.disableProxy) {
		body.proxyCountryCode = null;
	} else if (options.proxyCountryCode) {
		body.proxyCountryCode = String(options.proxyCountryCode).trim().toLowerCase();
	}

	if (options.timeout) {
		body.timeout = options.timeout;
	}

	if (options.browserScreenWidth) {
		body.browserScreenWidth = options.browserScreenWidth;
	}

	if (options.browserScreenHeight) {
		body.browserScreenHeight = options.browserScreenHeight;
	}

	if (Object.prototype.hasOwnProperty.call(options, 'allowResizing')) {
		body.allowResizing = options.allowResizing;
	}

	if (Object.prototype.hasOwnProperty.call(options, 'enableRecording')) {
		body.enableRecording = options.enableRecording;
	}

	if (options.customProxy) {
		body.customProxy = parseJsonParameter.call(this, options.customProxy, 'Custom Proxy');
	}

	return makeApiCall.call(this, 'POST', '/browsers', body);
}

async function getBrowserSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const browserSessionId = getBrowserSessionId.call(this, itemIndex);
	return makeApiCall.call(this, 'GET', `/browsers/${browserSessionId}`);
}

async function getBrowserSessions(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const options = this.getNodeParameter('browserListOptions', itemIndex, {}) as Record<string, any>;
	const pageSize = Math.min(returnAll ? 100 : limit, 100);
	const collected: any[] = [];
	let pageNumber = 1;
	let shouldContinue = true;

	while (shouldContinue) {
		const query = new URLSearchParams({
			pageSize: String(pageSize),
			pageNumber: String(pageNumber),
		});

		if (options.filterBy) {
			query.set('filterBy', options.filterBy);
		}

		const response = await makeApiCall.call(this, 'GET', `/browsers?${query.toString()}`);
		const sessions = Array.isArray(response.items) ? response.items : [];
		collected.push(...sessions);

		if (!returnAll || sessions.length < pageSize || collected.length >= response.totalItems) {
			shouldContinue = false;
		} else {
			pageNumber++;
		}
	}

	return returnAll ? collected : collected.slice(0, limit);
}

async function stopBrowserSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const browserSessionId = getBrowserSessionId.call(this, itemIndex);
	return makeApiCall.call(this, 'PATCH', `/browsers/${browserSessionId}`, { action: 'stop' });
}

function getSessionId(this: IExecuteFunctions, itemIndex: number): string {
	const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
	return normalizeRequiredId.call(this, sessionId, 'Session ID');
}

function getBrowserSessionId(this: IExecuteFunctions, itemIndex: number): string {
	const sessionId = this.getNodeParameter('browserSessionId', itemIndex) as string;
	return normalizeRequiredId.call(this, sessionId, 'Browser Session ID');
}

function normalizeRequiredId(this: IExecuteFunctions, value: unknown, displayName: string): string {
	const normalized = String(value || '').trim();

	if (!normalized) {
		throw new NodeOperationError(this.getNode(), `The "${displayName}" parameter is required.`, {
			level: 'warning',
		});
	}

	return normalized;
}

function validateUrl(this: IExecuteFunctions, value: string, displayName: string) {
	try {
		const url = new URL(value);
		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new NodeOperationError(
				this.getNode(),
				`The "${displayName}" parameter must be a valid http:// or https:// URL.`,
				{ level: 'warning' },
			);
		}
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw error;
		}

		throw new NodeOperationError(
			this.getNode(),
			`The "${displayName}" parameter must be a valid http:// or https:// URL.`,
			{ level: 'warning' },
		);
	}
}

function parseJsonParameter(this: IExecuteFunctions, value: unknown, displayName: string): any {
	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`The "${displayName}" parameter contains invalid JSON: ${(error as Error).message}`,
			{ level: 'warning' },
		);
	}
}

function validateJsonSchema(this: IExecuteFunctions, schema: any, displayName: string) {
	if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
		throw new NodeOperationError(this.getNode(), `The "${displayName}" must be a JSON object.`, {
			level: 'warning',
		});
	}

	if (
		schema.type &&
		!['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(schema.type)
	) {
		throw new NodeOperationError(
			this.getNode(),
			`The "${displayName}" has an unsupported JSON Schema type: ${schema.type}`,
			{ level: 'warning' },
		);
	}
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
		baseURL: getVersionedBaseUrl(credentials.baseUrl as string, 'v3'),
		url: endpoint,
		headers: {
			'Content-Type': 'application/json',
		},
		timeout: 30000,
		json: true,
	};

	if (body !== undefined) {
		options.body = body;
	}

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'browserUseApi',
			options,
		);
		return response || {};
	} catch (error: unknown) {
		if ((error as any).response) {
			const statusCode = (error as any).response.status;
			const responseData = (error as any).response.data;
			const errorMessage = extractErrorMessage(error, responseData);

			switch (statusCode) {
				case 400:
					throw new NodeOperationError(
						this.getNode(),
						`The request could not be processed: ${errorMessage}`,
						{ level: 'warning' },
					);
				case 401:
				case 403:
					throw new NodeOperationError(
						this.getNode(),
						'Authentication failed. Verify that the Browser Use API key is correct and has access to this project.',
						{ level: 'warning' },
					);
				case 404:
					throw new NodeOperationError(
						this.getNode(),
						`The requested Browser Use resource was not found: ${errorMessage}`,
						{ level: 'warning' },
					);
				case 422:
					throw new NodeOperationError(
						this.getNode(),
						`Browser Use could not validate the request: ${errorMessage}`,
						{ level: 'warning' },
					);
				case 429:
					throw new NodeOperationError(
						this.getNode(),
						'Browser Use rate limit or concurrent session limit exceeded. Try again later.',
						{ level: 'warning' },
					);
				default:
					throw new NodeOperationError(
						this.getNode(),
						`Browser Use API request failed with status ${statusCode}: ${errorMessage}`,
						{ level: 'warning' },
					);
			}
		}

		throw new NodeOperationError(
			this.getNode(),
			`Browser Use API request failed: ${(error as Error).message}`,
			{ level: 'warning' },
		);
	}
}

function extractErrorMessage(error: unknown, responseData: any): string {
	if (responseData) {
		const rawMessage =
			responseData.message ||
			responseData.error ||
			responseData.detail ||
			responseData.details ||
			responseData.errors ||
			responseData;

		return typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
	}

	return (error as Error).message || 'Unknown error';
}

function getVersionedBaseUrl(baseUrl: string, version: 'v2' | 'v3'): string {
	return baseUrl.replace(/\/api\/v[23]\/?$/, `/api/${version}`);
}

function sleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
