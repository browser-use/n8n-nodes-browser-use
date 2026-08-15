/* eslint-disable n8n-nodes-base/node-filename-against-convention -- Internal v4 implementation registered through BrowserUse.node.ts. */
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';

import { getVersionedBaseUrl } from './ApiVersion';
import { getSchemaTemplate } from './SchemaTemplates';

const TERMINAL_RUN_STATUSES = ['completed', 'failed', 'cancelled'];

const MAX_ATTACHED_FILES = 20;

const V4_MODELS = [
	{ name: 'Claude Fable 5', value: 'claude-fable-5' },
	{ name: 'Claude Opus 4.7', value: 'claude-opus-4.7' },
	{ name: 'Claude Opus 4.8', value: 'claude-opus-4.8' },
	{ name: 'Claude Opus 5', value: 'claude-opus-5' },
	{ name: 'Claude Sonnet 5', value: 'claude-sonnet-5' },
	{ name: 'Gemini 3 Flash', value: 'gemini-3-flash' },
	{ name: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro' },
	{ name: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
	{ name: 'Gemini 3.6 Flash', value: 'gemini-3.6-flash' },
	{ name: 'GLM 5.2', value: 'glm-5.2' },
	{ name: 'GPT-5.5', value: 'gpt-5.5' },
	{ name: 'GPT-5.6', value: 'gpt-5.6' },
	{ name: 'GPT-5.6 Luna', value: 'gpt-5.6-luna' },
	{ name: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
	{ name: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' },
	{ name: 'Grok 4.5', value: 'grok-4.5' },
	{ name: 'Kimi K3', value: 'kimi-k3' },
	{ name: 'MiniMax M3', value: 'minimax-m3' },
] as const;

export class BrowserUseV4 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browser Use v4',
		name: 'browserUseV4',
		icon: 'file:browseruse.svg',
		group: ['transform'],
		version: 1,
		description: 'Automate browsers with Browser Use Cloud API v4',
		defaults: {
			name: 'Browser Use v4',
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
						name: 'Run',
						value: 'run',
						description: 'Dispatch and inspect v4 agent runs',
					},
					{
						name: 'Session',
						value: 'session',
						description: 'Continue a v4 conversation across follow-up runs',
					},
					{
						name: 'Browser',
						value: 'browser',
						description: 'Create and manage standalone cloud browser sessions',
					},
				],
				default: 'run',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['run'],
					},
				},
				options: [
					{
						name: 'Cancel',
						value: 'cancel',
						description: 'Cancel a running run',
						action: 'Cancel a run',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Dispatch a run without waiting for it to finish',
						action: 'Create a run',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the full summary of a run',
						action: 'Get a run',
					},
					{
						name: 'Get Attachments',
						value: 'getAttachments',
						description: 'List files the agent attached to a run',
						action: 'Get run attachments',
					},
					{
						name: 'Get Events',
						value: 'getEvents',
						description: 'List the step-by-step event stream of a run',
						action: 'Get run events',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'List runs',
						action: 'Get many runs',
					},
					{
						name: 'Get Status',
						value: 'getStatus',
						description: 'Get only the status of a run, which is the cheapest poll target',
						action: 'Get run status',
					},
					{
						name: 'Run and Wait',
						value: 'runAndWait',
						description: 'Dispatch a run and poll until it reaches a terminal status',
						action: 'Run a task and wait',
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
						resource: ['session'],
					},
				},
				options: [
					{
						name: 'Cancel Queued Message',
						value: 'cancelQueuedMessage',
						description: 'Cancel a message that is still pending on the session queue',
						action: 'Cancel a queued message',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get session metadata',
						action: 'Get a session',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'List sessions, one entry per conversation',
						action: 'Get many sessions',
					},
					{
						name: 'Get Queue',
						value: 'getQueue',
						description: 'List messages waiting on the session queue',
						action: 'Get the session queue',
					},
					{
						name: 'Purge',
						value: 'purge',
						description: 'Permanently delete a session on a Zero Data Retention project',
						action: 'Purge a session',
					},
					{
						name: 'Queue Message',
						value: 'queueMessage',
						description: 'Send a follow-up message to a session',
						action: 'Queue a session message',
					},
				],
				default: 'queueMessage',
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
						name: 'Get Downloads',
						value: 'getDownloads',
						description: 'List files the browser downloaded during the session',
						action: 'Get browser session downloads',
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
						resource: ['run'],
						operation: ['create', 'runAndWait'],
					},
				},
				placeholder: 'e.g. Find the top 3 trending repositories on GitHub today',
				description: 'Natural-language task for the agent',
				required: true,
			},
			{
				displayName: 'Starting URL',
				name: 'startUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['create', 'runAndWait'],
					},
				},
				placeholder: 'e.g. https://example.com',
				description:
					'Optional URL to visit first. API v4 has no dedicated field for this, so it is prepended to the task text.',
			},
			{
				displayName: 'Run ID',
				name: 'runId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['get', 'getStatus', 'cancel', 'getEvents', 'getAttachments'],
					},
				},
				description: 'The Browser Use v4 run ID',
				required: true,
			},
			{
				displayName: 'Wait Timeout',
				name: 'waitTimeout',
				type: 'number',
				default: 900,
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['runAndWait'],
					},
				},
				description: 'Maximum time in seconds to poll for the run to finish',
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
						resource: ['run'],
						operation: ['create', 'runAndWait'],
					},
				},
				description:
					'Whether to ask the agent for JSON matching a schema. API v4 has no server-side output schema, so the schema is appended to the task and the result is parsed by this node.',
			},
			{
				displayName:
					'API v4 does not validate output schemas. The schema is added to the task as an instruction and the run result is parsed into a "parsedResult" field on a best-effort basis; the raw text always stays in "result".',
				name: 'structuredOutputNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['create', 'runAndWait'],
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
						resource: ['run'],
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
						resource: ['run'],
						operation: ['create', 'runAndWait'],
						enableStructuredOutput: [true],
						schemaTemplate: ['custom'],
					},
				},
				default:
					'{\n  "type": "object",\n  "properties": {\n    "title": {"type": "string"},\n    "description": {"type": "string"},\n    "items": {"type": "array", "items": {"type": "object"}}\n  },\n  "required": ["title"]\n}',
				description: 'JSON Schema the agent is asked to follow',
			},
			{
				displayName: 'Run Options',
				name: 'runOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['create', 'runAndWait'],
					},
				},
				options: [
					{
						displayName: 'Attached File IDs',
						name: 'attachedFileIds',
						type: 'json',
						default: '[]',
						description:
							'JSON array of workspace file IDs to attach to the run, up to 20 entries, e.g. ["1f2e…"]',
					},
					{
						displayName: 'Custom Proxy',
						name: 'customProxy',
						type: 'json',
						default:
							'{\n  "host": "proxy.example.com",\n  "port": 8080,\n  "username": "",\n  "password": ""\n}',
						description: 'Custom proxy object for the run, which overrides Proxy Country Code',
					},
					{
						displayName: 'Disable Proxy',
						name: 'disableProxy',
						type: 'boolean',
						default: false,
						description: 'Whether to run the browser without the Browser Use proxy',
					},
					{
						displayName: 'Enable Recording',
						name: 'enableRecording',
						type: 'boolean',
						default: false,
						description: 'Whether to record the browser provisioned for this run',
					},
					{
						displayName: 'Judge',
						name: 'judge',
						type: 'boolean',
						default: false,
						description:
							'Whether to have an LLM judge the finished run. The verdict appears as "judgement" once it lands, and the judging call is billed to the run.',
					},
					{
						displayName: 'Judge Context',
						name: 'judgeContext',
						type: 'string',
						default: '',
						description:
							'Extra context for the judge, such as the expected answer. Setting this turns the judge on.',
					},
					{
						displayName: 'Max Cost USD',
						name: 'maxCostUsd',
						type: 'number',
						default: 0,
						description: 'Maximum total cost in USD allowed for this run',
						typeOptions: {
							minValue: 0,
						},
					},
					{
						displayName: 'Model',
						name: 'model',
						type: 'options',
						options: [...V4_MODELS],
						default: 'gpt-5.6-luna',
						description: 'The model to use for the run',
					},
					{
						displayName: 'Model Parameters',
						name: 'modelParams',
						type: 'json',
						default: '{}',
						description:
							'Provider-native parameters forwarded unchanged, e.g. {"reasoning": {"effort": "high"}}. Supported values differ per model and an unsupported one is rejected by the API.',
					},
					{
						displayName: 'Profile ID',
						name: 'profileId',
						type: 'string',
						default: '',
						description: 'Browser profile ID to load, which persists cookies and local storage',
					},
					{
						displayName: 'Proxy Country Code',
						name: 'proxyCountryCode',
						type: 'string',
						default: 'us',
						description:
							'Two-letter proxy country code. Enable Disable Proxy instead to run without a proxy.',
					},
					{
						displayName: 'Screen Height',
						name: 'screenHeight',
						type: 'number',
						default: 1080,
						typeOptions: {
							minValue: 320,
							maxValue: 3456,
						},
						description: 'Custom browser screen height in pixels',
					},
					{
						displayName: 'Screen Width',
						name: 'screenWidth',
						type: 'number',
						default: 1920,
						typeOptions: {
							minValue: 320,
							maxValue: 6144,
						},
						description: 'Custom browser screen width in pixels',
					},
					{
						displayName: 'Session ID',
						name: 'sessionId',
						type: 'string',
						default: '',
						description:
							'Existing session to continue, which keeps the conversation and browser state of earlier runs',
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
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['get', 'getQueue', 'queueMessage', 'purge', 'cancelQueuedMessage'],
					},
				},
				description: 'The Browser Use v4 session ID',
				required: true,
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['queueMessage'],
					},
				},
				placeholder: 'e.g. Now export the same table as CSV',
				description: 'Follow-up instruction for the session',
				required: true,
			},
			{
				displayName: 'Queue Options',
				name: 'queueOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['queueMessage'],
					},
				},
				options: [
					{
						displayName: 'Attached File IDs',
						name: 'attachedFileIds',
						type: 'json',
						default: '[]',
						description: 'JSON array of workspace file IDs to attach, up to 20 entries',
					},
					{
						displayName: 'Interrupt',
						name: 'interrupt',
						type: 'boolean',
						default: false,
						description:
							'Whether to cancel the active run so this message takes effect now. Best-effort: if the cancel cannot be delivered the message runs after the current turn.',
					},
				],
			},
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						resource: ['session'],
						operation: ['cancelQueuedMessage'],
					},
				},
				description: 'The ID of the queued message to cancel',
				required: true,
			},
			{
				displayName: 'Browser Session ID',
				name: 'browserSessionId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['browser'],
						operation: ['get', 'stop', 'getDownloads'],
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
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['run', 'session', 'browser'],
						operation: ['getMany', 'getEvents', 'getDownloads'],
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
						resource: ['run', 'session', 'browser'],
						operation: ['getMany', 'getEvents', 'getDownloads'],
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
				displayName: 'Run List Options',
				name: 'runListOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Session ID',
						name: 'sessionId',
						type: 'string',
						default: '',
						description: 'Only return runs that belong to this session',
					},
				],
			},
			{
				displayName: 'Events Options',
				name: 'eventsOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['getEvents'],
					},
				},
				options: [
					{
						displayName: 'After',
						name: 'after',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: 0,
						},
						description: 'Only return events with an ID greater than this value',
					},
				],
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
						displayName: 'Agent Session ID',
						name: 'agentSessionId',
						type: 'string',
						default: '',
						description: 'Only return browsers created by this agent session',
					},
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
				displayName: 'Downloads Options',
				name: 'downloadsOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['browser'],
						operation: ['getDownloads'],
					},
				},
				options: [
					{
						displayName: 'Include URLs',
						name: 'includeUrls',
						type: 'boolean',
						default: false,
						description:
							'Whether to include presigned download URLs, which expire after 15 minutes',
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

				if (resource === 'run') {
					responseData = await executeRunOperation.call(this, operation, i);
				} else if (resource === 'session') {
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

async function executeRunOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<any> {
	if (operation === 'create') {
		return createRun.call(this, itemIndex);
	}
	if (operation === 'runAndWait') {
		return runAndWait.call(this, itemIndex);
	}
	if (operation === 'get') {
		return getRun.call(this, itemIndex);
	}
	if (operation === 'getStatus') {
		return getRunStatus.call(this, itemIndex);
	}
	if (operation === 'getMany') {
		return getRuns.call(this, itemIndex);
	}
	if (operation === 'cancel') {
		return cancelRun.call(this, itemIndex);
	}
	if (operation === 'getEvents') {
		return getRunEvents.call(this, itemIndex);
	}
	if (operation === 'getAttachments') {
		return getRunAttachments.call(this, itemIndex);
	}

	throw new NodeOperationError(this.getNode(), `Unsupported run operation: ${operation}`);
}

async function executeSessionOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<any> {
	if (operation === 'get') {
		return getSession.call(this, itemIndex);
	}
	if (operation === 'getMany') {
		return getSessions.call(this, itemIndex);
	}
	if (operation === 'queueMessage') {
		return queueSessionMessage.call(this, itemIndex);
	}
	if (operation === 'getQueue') {
		return getSessionQueue.call(this, itemIndex);
	}
	if (operation === 'cancelQueuedMessage') {
		return cancelQueuedMessage.call(this, itemIndex);
	}
	if (operation === 'purge') {
		return purgeSession.call(this, itemIndex);
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
	if (operation === 'getDownloads') {
		return getBrowserDownloads.call(this, itemIndex);
	}

	throw new NodeOperationError(this.getNode(), `Unsupported browser operation: ${operation}`);
}

async function createRun(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const { body } = buildRunRequest.call(this, itemIndex);
	return makeApiCall.call(this, 'POST', '/runs', body);
}

async function runAndWait(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const waitTimeout = this.getNodeParameter('waitTimeout', itemIndex, 900) as number;

	if (waitTimeout < 10 || waitTimeout > 14400) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Wait Timeout" parameter must be between 10 and 14400 seconds.',
			{ level: 'warning' },
		);
	}

	const { body, schema } = buildRunRequest.call(this, itemIndex);
	const created = await makeApiCall.call(this, 'POST', '/runs', body);

	if (!created.id) {
		throw new NodeOperationError(
			this.getNode(),
			'The Browser Use API returned an unexpected response without a run ID.',
			{ level: 'warning' },
		);
	}

	const startTime = Date.now();
	let status = created.status as string;

	// Poll the status endpoint rather than the full run: it is a cheap indexed lookup
	// that never carries the task or result text.
	while (!TERMINAL_RUN_STATUSES.includes(status) && Date.now() - startTime < waitTimeout * 1000) {
		await sleep(2000);
		const statusResponse = await makeApiCall.call(this, 'GET', `/runs/${created.id}/status`);
		status = statusResponse.status ?? status;
	}

	const run = await makeApiCall.call(this, 'GET', `/runs/${created.id}`);
	const timedOut = !TERMINAL_RUN_STATUSES.includes(run.status);

	return {
		...run,
		eventsUrl: created.eventsUrl,
		...(Array.isArray(created.missingFileIds) && created.missingFileIds.length > 0
			? { missingFileIds: created.missingFileIds }
			: {}),
		...applyStructuredOutput(run, schema),
		...(timedOut
			? {
					warning: `The run did not reach a terminal status within ${waitTimeout} seconds but may still be running.`,
				}
			: {}),
	};
}

function buildRunRequest(
	this: IExecuteFunctions,
	itemIndex: number,
): { body: any; schema: any | undefined } {
	const task = this.getNodeParameter('task', itemIndex, '') as string;
	const startUrl = this.getNodeParameter('startUrl', itemIndex, '') as string;
	const enableStructuredOutput = this.getNodeParameter(
		'enableStructuredOutput',
		itemIndex,
		false,
	) as boolean;
	const schemaTemplate = this.getNodeParameter('schemaTemplate', itemIndex, 'custom') as string;
	const outputSchema = this.getNodeParameter('outputSchema', itemIndex, '') as string;
	const options = this.getNodeParameter('runOptions', itemIndex, {}) as Record<string, any>;

	let schema: any;
	let instruction = buildTaskInstruction.call(this, task, startUrl);

	if (enableStructuredOutput) {
		schema =
			schemaTemplate === 'custom'
				? parseJsonParameter.call(this, outputSchema, 'Output Schema')
				: getSchemaTemplate(schemaTemplate);
		validateJsonSchema.call(this, schema, 'Output Schema');
		instruction = `${instruction}\n\n${buildStructuredOutputInstruction(schema)}`;
	}

	// RunCreateRequest rejects unknown properties, so only documented v4 fields go on the body.
	const body: any = { task: instruction };

	if (options.model) {
		body.model = options.model;
	}

	if (options.modelParams) {
		const modelParams = parseJsonParameter.call(this, options.modelParams, 'Model Parameters');

		if (modelParams === null || typeof modelParams !== 'object' || Array.isArray(modelParams)) {
			throw new NodeOperationError(
				this.getNode(),
				'The "Model Parameters" parameter must be a JSON object.',
				{ level: 'warning' },
			);
		}

		body.modelParams = modelParams;
	}

	if (options.sessionId) {
		body.sessionId = normalizeRequiredId.call(this, options.sessionId, 'Session ID');
	}

	if (options.workspaceId) {
		body.workspaceId = normalizeRequiredId.call(this, options.workspaceId, 'Workspace ID');
	}

	if (options.maxCostUsd && options.maxCostUsd > 0) {
		body.maxCostUsd = options.maxCostUsd;
	}

	const attachedFileIds = parseIdArray.call(this, options.attachedFileIds, 'Attached File IDs');

	if (attachedFileIds.length > 0) {
		body.attachedFileIds = attachedFileIds;
	}

	const judgeContext = String(options.judgeContext ?? '').trim();

	if (options.judge || judgeContext) {
		body.judge = judgeContext ? { context: judgeContext } : {};
	}

	const browserSettings = buildRunBrowserSettings.call(this, options);

	if (browserSettings) {
		body.browserSettings = browserSettings;
	}

	return { body, schema };
}

function buildRunBrowserSettings(
	this: IExecuteFunctions,
	options: Record<string, any>,
): any | undefined {
	const settings: any = {};

	if (options.profileId) {
		settings.profileId = normalizeRequiredId.call(this, options.profileId, 'Profile ID');
	}

	if (options.disableProxy) {
		settings.proxyCountryCode = null;
	} else if (options.proxyCountryCode) {
		settings.proxyCountryCode = String(options.proxyCountryCode).trim().toLowerCase();
	}

	if (options.customProxy) {
		settings.customProxy = parseJsonParameter.call(this, options.customProxy, 'Custom Proxy');
	}

	if (options.screenWidth) {
		settings.screenWidth = options.screenWidth;
	}

	if (options.screenHeight) {
		settings.screenHeight = options.screenHeight;
	}

	if (Object.prototype.hasOwnProperty.call(options, 'enableRecording')) {
		settings.record = options.enableRecording;
	}

	return Object.keys(settings).length > 0 ? settings : undefined;
}

function buildTaskInstruction(this: IExecuteFunctions, task: string, startUrl: string): string {
	const trimmedTask = task.trim();
	const trimmedStartUrl = startUrl.trim();

	if (!trimmedTask) {
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
		return `Start at ${trimmedStartUrl}.\n\n${trimmedTask}`;
	}

	return trimmedTask;
}

async function getRun(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const runId = getRunId.call(this, itemIndex);
	return makeApiCall.call(this, 'GET', `/runs/${runId}`);
}

async function getRunStatus(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const runId = getRunId.call(this, itemIndex);
	const response = await makeApiCall.call(this, 'GET', `/runs/${runId}/status`);

	return {
		id: runId,
		...response,
	};
}

async function getRuns(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const options = this.getNodeParameter('runListOptions', itemIndex, {}) as Record<string, any>;
	const sessionId = options.sessionId
		? normalizeRequiredId.call(this, options.sessionId, 'Session ID')
		: undefined;

	return collectCursorPages.call(
		this,
		'/runs',
		'runs',
		returnAll,
		limit,
		sessionId ? { sessionId } : {},
	);
}

async function cancelRun(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const runId = getRunId.call(this, itemIndex);
	return makeApiCall.call(this, 'POST', `/runs/${runId}/cancel`);
}

async function getRunEvents(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const runId = getRunId.call(this, itemIndex);
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const options = this.getNodeParameter('eventsOptions', itemIndex, {}) as Record<string, any>;
	const targetCount = returnAll ? Number.POSITIVE_INFINITY : limit;
	const pageSize = Math.min(returnAll ? 200 : limit, 200);
	const collected: any[] = [];
	let after = Number(options.after ?? 0) || 0;
	let shouldContinue = true;

	while (shouldContinue) {
		const query = new URLSearchParams({
			limit: String(pageSize),
			after: String(after),
		});
		const response = await makeApiCall.call(
			this,
			'GET',
			`/runs/${runId}/events?${query.toString()}`,
		);
		const events = Array.isArray(response.events) ? response.events : [];
		collected.push(...events);

		if (
			events.length === 0 ||
			!response.hasMore ||
			response.nextAfter === null ||
			response.nextAfter === undefined ||
			collected.length >= targetCount
		) {
			shouldContinue = false;
		} else {
			after = response.nextAfter;
		}
	}

	return returnAll ? collected : collected.slice(0, limit);
}

async function getRunAttachments(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const runId = getRunId.call(this, itemIndex);
	const response = await makeApiCall.call(this, 'GET', `/runs/${runId}/attachments`);

	return Array.isArray(response.attachments) ? response.attachments : [];
}

async function getSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const sessionId = getSessionId.call(this, itemIndex);
	return makeApiCall.call(this, 'GET', `/sessions/${sessionId}`);
}

async function getSessions(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;

	return collectCursorPages.call(this, '/sessions', 'sessions', returnAll, limit, {});
}

async function queueSessionMessage(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const sessionId = getSessionId.call(this, itemIndex);
	const message = this.getNodeParameter('message', itemIndex, '') as string;
	const options = this.getNodeParameter('queueOptions', itemIndex, {}) as Record<string, any>;
	const trimmedMessage = message.trim();

	if (!trimmedMessage) {
		throw new NodeOperationError(this.getNode(), 'The "Message" parameter is required.', {
			level: 'warning',
		});
	}

	const body: any = { text: trimmedMessage };

	if (Object.prototype.hasOwnProperty.call(options, 'interrupt')) {
		body.interrupt = options.interrupt;
	}

	const attachedFileIds = parseIdArray.call(this, options.attachedFileIds, 'Attached File IDs');

	if (attachedFileIds.length > 0) {
		body.attachedFileIds = attachedFileIds;
	}

	return makeApiCall.call(this, 'POST', `/sessions/${sessionId}/queue`, body);
}

async function getSessionQueue(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const sessionId = getSessionId.call(this, itemIndex);
	const response = await makeApiCall.call(this, 'GET', `/sessions/${sessionId}/queue`);

	return Array.isArray(response.queue) ? response.queue : [];
}

async function cancelQueuedMessage(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const sessionId = getSessionId.call(this, itemIndex);
	const messageId = this.getNodeParameter('messageId', itemIndex) as number;

	if (!Number.isInteger(messageId) || messageId <= 0) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Message ID" parameter must be a positive whole number.',
			{ level: 'warning' },
		);
	}

	return makeApiCall.call(this, 'DELETE', `/sessions/${sessionId}/queue/${messageId}`);
}

async function purgeSession(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const sessionId = getSessionId.call(this, itemIndex);
	await makeApiCall.call(this, 'POST', `/sessions/${sessionId}/purge`);

	return {
		success: true,
		sessionId,
	};
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
	const targetCount = returnAll ? Number.POSITIVE_INFINITY : limit;
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

		if (options.agentSessionId) {
			query.set(
				'agentSessionId',
				normalizeRequiredId.call(this, options.agentSessionId, 'Agent Session ID'),
			);
		}

		const response = await makeApiCall.call(this, 'GET', `/browsers?${query.toString()}`);
		const sessions = Array.isArray(response.items) ? response.items : [];
		collected.push(...sessions);

		if (
			sessions.length < pageSize ||
			collected.length >= targetCount ||
			collected.length >= response.totalItems
		) {
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

async function getBrowserDownloads(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const browserSessionId = getBrowserSessionId.call(this, itemIndex);
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const options = this.getNodeParameter('downloadsOptions', itemIndex, {}) as Record<string, any>;

	return collectCursorPages.call(
		this,
		`/browsers/${browserSessionId}/downloads`,
		'files',
		returnAll,
		limit,
		options.includeUrls ? { includeUrls: 'true' } : {},
	);
}

/**
 * Walk a keyset-paginated v4 list endpoint until the requested number of entries is
 * collected or the server stops handing out cursors.
 */
async function collectCursorPages(
	this: IExecuteFunctions,
	endpoint: string,
	collectionKey: string,
	returnAll: boolean,
	limit: number,
	extraQuery: Record<string, string>,
): Promise<any[]> {
	const targetCount = returnAll ? Number.POSITIVE_INFINITY : limit;
	const pageSize = Math.min(returnAll ? 100 : limit, 100);
	const collected: any[] = [];
	let cursor: string | undefined;
	let shouldContinue = true;

	while (shouldContinue) {
		const query = new URLSearchParams({ limit: String(pageSize), ...extraQuery });

		if (cursor) {
			query.set('cursor', cursor);
		}

		const response = await makeApiCall.call(this, 'GET', `${endpoint}?${query.toString()}`);
		const entries = Array.isArray(response[collectionKey]) ? response[collectionKey] : [];
		collected.push(...entries);
		cursor = response.hasMore ? response.nextCursor : undefined;

		if (entries.length === 0 || !cursor || collected.length >= targetCount) {
			shouldContinue = false;
		}
	}

	return returnAll ? collected : collected.slice(0, limit);
}

function getRunId(this: IExecuteFunctions, itemIndex: number): string {
	const runId = this.getNodeParameter('runId', itemIndex) as string;
	return encodeURIComponent(normalizeRequiredId.call(this, runId, 'Run ID'));
}

function getSessionId(this: IExecuteFunctions, itemIndex: number): string {
	const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
	return encodeURIComponent(normalizeRequiredId.call(this, sessionId, 'Session ID'));
}

function getBrowserSessionId(this: IExecuteFunctions, itemIndex: number): string {
	const sessionId = this.getNodeParameter('browserSessionId', itemIndex) as string;
	return encodeURIComponent(normalizeRequiredId.call(this, sessionId, 'Browser Session ID'));
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

function parseIdArray(this: IExecuteFunctions, value: unknown, displayName: string): string[] {
	if (!value) {
		return [];
	}

	const parsed = parseJsonParameter.call(this, value, displayName);

	if (!Array.isArray(parsed)) {
		throw new NodeOperationError(
			this.getNode(),
			`The "${displayName}" parameter must be a JSON array of IDs.`,
			{ level: 'warning' },
		);
	}

	const ids = parsed.map((entry) => String(entry ?? '').trim()).filter(Boolean);

	if (ids.length > MAX_ATTACHED_FILES) {
		throw new NodeOperationError(
			this.getNode(),
			`The "${displayName}" parameter accepts at most ${MAX_ATTACHED_FILES} IDs.`,
			{ level: 'warning' },
		);
	}

	return ids;
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

function buildStructuredOutputInstruction(schema: any): string {
	return [
		'Return the final answer as a single JSON document that conforms to this JSON Schema.',
		'Respond with raw JSON only: no commentary and no markdown code fences.',
		'',
		JSON.stringify(schema, null, 2),
	].join('\n');
}

/**
 * API v4 has no server-side output schema, so structured output is emulated: the schema is
 * appended to the task and the returned text is parsed here. Parsing never fails the run —
 * the raw text always remains available in `result`.
 */
function applyStructuredOutput(run: any, schema: any): Record<string, any> {
	if (!schema) {
		return {};
	}

	const raw = typeof run.result === 'string' ? run.result : '';

	if (!raw.trim()) {
		return {
			parsedResult: null,
			structuredOutputError: 'The run returned no result text to parse.',
		};
	}

	const parsed = extractJson(raw);

	if (parsed === undefined) {
		return {
			parsedResult: null,
			structuredOutputError:
				'The run result is not valid JSON. API v4 does not enforce output schemas, so the raw text is returned in "result".',
		};
	}

	const mismatch = describeSchemaMismatch(parsed, schema);

	return {
		parsedResult: parsed,
		...(mismatch ? { structuredOutputError: mismatch } : {}),
	};
}

function extractJson(raw: string): any {
	const trimmed = raw.trim();
	const candidates = [trimmed];
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

	if (fenced) {
		candidates.push(fenced[1]);
	}

	const start = trimmed.search(/[{[]/);
	const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));

	if (start !== -1 && end > start) {
		candidates.push(trimmed.slice(start, end + 1));
	}

	for (const candidate of candidates) {
		try {
			return JSON.parse(candidate);
		} catch {
			// Try the next candidate.
		}
	}

	return undefined;
}

function describeSchemaMismatch(value: any, schema: any): string | undefined {
	const expected = schema.type;

	if (expected && !matchesJsonType(value, expected)) {
		return `The run returned ${describeJsonType(value)} where the schema expects ${expected}. API v4 does not validate output schemas.`;
	}

	if (expected === 'object' && Array.isArray(schema.required)) {
		const missing = schema.required.filter(
			(key: string) => !Object.prototype.hasOwnProperty.call(value ?? {}, key),
		);

		if (missing.length > 0) {
			return `The run result is missing required properties: ${missing.join(', ')}. API v4 does not validate output schemas.`;
		}
	}

	return undefined;
}

function matchesJsonType(value: any, expected: string): boolean {
	switch (expected) {
		case 'object':
			return value !== null && typeof value === 'object' && !Array.isArray(value);
		case 'array':
			return Array.isArray(value);
		case 'string':
			return typeof value === 'string';
		case 'number':
			return typeof value === 'number' && Number.isFinite(value);
		case 'integer':
			return Number.isInteger(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'null':
			return value === null;
		default:
			return true;
	}
}

function describeJsonType(value: any): string {
	if (value === null) {
		return 'null';
	}

	return Array.isArray(value) ? 'array' : typeof value;
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
		baseURL: getVersionedBaseUrl(credentials.baseUrl as string, 'v4'),
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
						description: errorMessage,
						httpCode,
						level: 'warning',
					});
				case 401:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'Authentication failed',
						description: 'Verify that the Browser Use API key is correct.',
						httpCode,
						level: 'warning',
					});
				case 403:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'Browser Use rejected the request for this project',
						description:
							'The API key may not have access to this project, or the project has Zero Data Retention enabled, which API v4 does not support. Use the v3 API Version for Zero Data Retention projects.',
						httpCode,
						level: 'warning',
					});
				case 404:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'The requested Browser Use resource was not found',
						description: errorMessage,
						httpCode,
						level: 'warning',
					});
				case 409:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'The Browser Use resource is in a conflicting state',
						description: `${errorMessage}. A session runs one run at a time, so wait for the active run or cancel it first.`,
						httpCode,
						level: 'warning',
					});
				case 422:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'Browser Use could not validate the request',
						description: errorMessage,
						httpCode,
						level: 'warning',
					});
				case 429:
					throw new NodeApiError(this.getNode(), apiError, {
						message: 'Browser Use rate limit, queue, or concurrency limit exceeded',
						description: `${errorMessage}. Try again later.`,
						httpCode,
						level: 'warning',
					});
				default:
					throw new NodeApiError(this.getNode(), apiError, {
						message: `Browser Use API request failed with status ${statusCode}`,
						description: errorMessage,
						httpCode,
						level: 'warning',
					});
			}
		}

		throw new NodeApiError(this.getNode(), apiError, {
			message: 'Browser Use API request failed',
			description: (error as Error).message,
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
			responseData.errors ||
			responseData;

		return typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
	}

	return (error as Error).message || 'Unknown error';
}
