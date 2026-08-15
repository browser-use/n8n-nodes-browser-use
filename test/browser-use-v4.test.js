const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadNode, makeCtx, httpError } = require('./helpers');

const { BrowserUseV4 } = loadNode('BrowserUseV4.js');

const run = (ctx) => new BrowserUseV4().execute.call(ctx);

const CUSTOM_SCHEMA =
	'{"type":"object","properties":{"title":{"type":"string"}},"required":["title","price"]}';

describe('v4 run request body', () => {
	it('sends only documented v4 fields, with browser settings nested', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: '  Find pricing  ',
				startUrl: 'https://example.com',
				enableStructuredOutput: false,
				runOptions: {
					model: 'claude-opus-5',
					modelParams: '{"thinking":{"type":"adaptive"}}',
					sessionId: ' sess-1 ',
					workspaceId: 'ws-1',
					maxCostUsd: 2.5,
					attachedFileIds: '["f1"," f2 ",""]',
					judgeContext: 'expected: $19/mo',
					profileId: 'prof-1',
					proxyCountryCode: ' DE ',
					screenWidth: 1280,
					screenHeight: 720,
					enableRecording: true,
				},
			},
			routes: { 'POST /runs': { id: 'r1', status: 'queued' } },
		});

		await run(ctx);

		// RunCreateRequest is additionalProperties:false, so an exact match matters.
		assert.deepEqual(calls[0].body, {
			task: 'Start at https://example.com.\n\nFind pricing',
			model: 'claude-opus-5',
			modelParams: { thinking: { type: 'adaptive' } },
			sessionId: 'sess-1',
			workspaceId: 'ws-1',
			maxCostUsd: 2.5,
			attachedFileIds: ['f1', 'f2'],
			judge: { context: 'expected: $19/mo' },
			browserSettings: {
				profileId: 'prof-1',
				proxyCountryCode: 'de',
				screenWidth: 1280,
				screenHeight: 720,
				record: true,
			},
		});
		assert.equal(calls[0].baseURL, 'https://api.browser-use.com/api/v4');
	});

	it('omits empty browserSettings and judge when no options are set', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'do it',
				startUrl: '',
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: { 'POST /runs': { id: 'r1', status: 'queued' } },
		});

		await run(ctx);

		assert.deepEqual(calls[0].body, { task: 'do it' });
	});

	it('sends a null proxy country code when the proxy is disabled', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: false,
				runOptions: { disableProxy: true, proxyCountryCode: 'us' },
			},
			routes: { 'POST /runs': { id: 'r1', status: 'queued' } },
		});

		await run(ctx);

		assert.deepEqual(calls[0].body.browserSettings, { proxyCountryCode: null });
	});

	it('turns the judge on with an empty object when no context is given', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: false,
				runOptions: { judge: true },
			},
			routes: { 'POST /runs': { id: 'r1', status: 'queued' } },
		});

		await run(ctx);

		assert.deepEqual(calls[0].body.judge, {});
	});

	it('rejects an empty task', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: '   ',
				startUrl: '',
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: {},
		});

		await assert.rejects(run(ctx), /"Task" parameter is required/);
	});

	it('rejects a non-http starting URL', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: 'ftp://nope',
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: {},
		});

		await assert.rejects(run(ctx), /valid http:\/\/ or https:\/\/ URL/);
	});

	it('rejects more than 20 attached file IDs', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: false,
				runOptions: {
					attachedFileIds: JSON.stringify(Array.from({ length: 21 }, (_, i) => `f${i}`)),
				},
			},
			routes: {},
		});

		await assert.rejects(run(ctx), /at most 20 IDs/);
	});
});

describe('v4 run and wait', () => {
	it('polls the status endpoint, then fetches the full run once', async () => {
		let statusHits = 0;
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'runAndWait',
				task: 'x',
				startUrl: '',
				waitTimeout: 60,
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: {
				'POST /runs': {
					id: 'r1',
					status: 'running',
					eventsUrl: 'https://e/r1',
					missingFileIds: [],
				},
				'GET /runs/r1/status': () => {
					statusHits += 1;
					return { status: statusHits >= 2 ? 'completed' : 'running' };
				},
				'GET /runs/r1': { id: 'r1', status: 'completed', result: 'done', totalCostUsd: '0.10' },
			},
		});

		const out = await run(ctx);

		assert.equal(statusHits, 2);
		assert.equal(out[0][0].json.status, 'completed');
		assert.equal(out[0][0].json.eventsUrl, 'https://e/r1');
		assert.equal(out[0][0].json.warning, undefined);
		assert.equal(out[0][0].json.missingFileIds, undefined);
		assert.equal(calls.at(-1).url, '/runs/r1');
	});

	it('skips polling when the run is already terminal on create', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'runAndWait',
				task: 'x',
				startUrl: '',
				waitTimeout: 60,
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: {
				'POST /runs': { id: 'r1', status: 'completed', eventsUrl: 'https://e/r1' },
				'GET /runs/r1': { id: 'r1', status: 'completed', result: 'done' },
			},
		});

		await run(ctx);

		assert.ok(!calls.some((call) => call.url.endsWith('/status')));
	});

	it('warns but still returns the run when the wait times out', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'runAndWait',
				task: 'x',
				startUrl: '',
				waitTimeout: 10,
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: {
				'POST /runs': { id: 'r1', status: 'running' },
				'GET /runs/r1/status': { status: 'running' },
				'GET /runs/r1': { id: 'r1', status: 'running', result: null },
			},
		});

		const out = await run(ctx);

		assert.match(out[0][0].json.warning, /did not reach a terminal status within 10 seconds/);
		assert.equal(out[0][0].json.status, 'running');
	});

	it('rejects an out-of-range wait timeout', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'runAndWait',
				task: 'x',
				startUrl: '',
				waitTimeout: 5,
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: {},
		});

		await assert.rejects(run(ctx), /between 10 and 14400 seconds/);
	});

	it('rejects a create response with no run ID', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'runAndWait',
				task: 'x',
				startUrl: '',
				waitTimeout: 60,
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: { 'POST /runs': { status: 'queued' } },
		});

		await assert.rejects(run(ctx), /without a run ID/);
	});
});

describe('v4 structured output emulation', () => {
	const waitParams = (overrides) => ({
		resource: 'run',
		operation: 'runAndWait',
		task: 'x',
		startUrl: '',
		waitTimeout: 60,
		enableStructuredOutput: true,
		schemaTemplate: 'custom',
		outputSchema: CUSTOM_SCHEMA,
		runOptions: {},
		...overrides,
	});

	it('appends the schema to the task and parses a fenced JSON result', async () => {
		const { ctx, calls } = makeCtx({
			params: waitParams({ task: 'grab it' }),
			routes: {
				'POST /runs': { id: 'r1', status: 'completed' },
				'GET /runs/r1': {
					id: 'r1',
					status: 'completed',
					result: 'Sure!\n```json\n{"title":"A","price":"9"}\n```',
				},
			},
		});

		const out = await run(ctx);

		assert.match(
			calls[0].body.task,
			/^grab it\n\nReturn the final answer as a single JSON document/,
		);
		assert.match(calls[0].body.task, /"required"/);
		assert.deepEqual(out[0][0].json.parsedResult, { title: 'A', price: '9' });
		assert.equal(out[0][0].json.structuredOutputError, undefined);
		assert.ok(out[0][0].json.result.includes('```'), 'raw result is preserved');
	});

	it('parses a bare JSON result', async () => {
		const { ctx } = makeCtx({
			params: waitParams(),
			routes: {
				'POST /runs': { id: 'r1', status: 'completed' },
				'GET /runs/r1': { id: 'r1', status: 'completed', result: '{"title":"A","price":"9"}' },
			},
		});

		const out = await run(ctx);

		assert.deepEqual(out[0][0].json.parsedResult, { title: 'A', price: '9' });
	});

	it('reports missing required properties but keeps the parsed result', async () => {
		const { ctx } = makeCtx({
			params: waitParams(),
			routes: {
				'POST /runs': { id: 'r1', status: 'completed' },
				'GET /runs/r1': { id: 'r1', status: 'completed', result: '{"title":"A"}' },
			},
		});

		const out = await run(ctx);

		assert.deepEqual(out[0][0].json.parsedResult, { title: 'A' });
		assert.match(out[0][0].json.structuredOutputError, /missing required properties: price/);
	});

	it('does not fail the run when the result is prose', async () => {
		const { ctx } = makeCtx({
			params: waitParams(),
			routes: {
				'POST /runs': { id: 'r1', status: 'completed' },
				'GET /runs/r1': { id: 'r1', status: 'completed', result: 'I could not find the page.' },
			},
		});

		const out = await run(ctx);

		assert.equal(out[0][0].json.parsedResult, null);
		assert.match(out[0][0].json.structuredOutputError, /not valid JSON/);
		assert.equal(out[0][0].json.result, 'I could not find the page.');
	});

	it('uses a pre-built template when the schema is not custom', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: true,
				schemaTemplate: 'contact',
				outputSchema: '',
				runOptions: {},
			},
			routes: { 'POST /runs': { id: 'r1', status: 'queued' } },
		});

		await run(ctx);

		assert.match(calls[0].body.task, /companyName/);
	});

	it('rejects a task whose composed length exceeds the limit', async () => {
		// The raw task fits, but the appended schema pushes the instruction over.
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'a'.repeat(19_990),
				startUrl: '',
				enableStructuredOutput: true,
				schemaTemplate: 'custom',
				outputSchema: CUSTOM_SCHEMA,
				runOptions: {},
			},
			routes: {},
		});

		await assert.rejects(
			run(ctx),
			/composed task is \d+ characters, above the 20000 character limit/,
		);
	});

	it('accepts a union type such as ["string","null"]', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: true,
				schemaTemplate: 'custom',
				outputSchema: '{"type":["string","null"]}',
				runOptions: {},
			},
			routes: { 'POST /runs': { id: 'r1', status: 'queued' } },
		});

		await run(ctx);

		assert.match(calls[0].body.task, /"string"/);
	});

	it('accepts a result matching any branch of a union type', async () => {
		const { ctx } = makeCtx({
			params: waitParams({ outputSchema: '{"type":["string","null"]}' }),
			routes: {
				'POST /runs': { id: 'r1', status: 'completed' },
				'GET /runs/r1': { id: 'r1', status: 'completed', result: 'null' },
			},
		});

		const out = await run(ctx);

		assert.equal(out[0][0].json.parsedResult, null);
		assert.equal(out[0][0].json.structuredOutputError, undefined);
	});

	it('checks required properties even when the schema omits a type', async () => {
		const { ctx } = makeCtx({
			params: waitParams({ outputSchema: '{"required":["title","price"]}' }),
			routes: {
				'POST /runs': { id: 'r1', status: 'completed' },
				'GET /runs/r1': { id: 'r1', status: 'completed', result: '{"title":"A"}' },
			},
		});

		const out = await run(ctx);

		assert.match(out[0][0].json.structuredOutputError, /missing required properties: price/);
	});

	it('reports the expected union types when nothing matches', async () => {
		const { ctx } = makeCtx({
			params: waitParams({ outputSchema: '{"type":["string","null"]}' }),
			routes: {
				'POST /runs': { id: 'r1', status: 'completed' },
				'GET /runs/r1': { id: 'r1', status: 'completed', result: '{"a":1}' },
			},
		});

		const out = await run(ctx);

		assert.match(out[0][0].json.structuredOutputError, /expects string or null/);
	});

	it('rejects a non-string schema type rather than coercing it', async () => {
		// String(null) is "null", which is itself a valid type name, so a literal null
		// must be rejected before coercion rather than passing as the string "null".
		for (const badType of ['null', '["string", null]', '123', '{}']) {
			const { ctx } = makeCtx({
				params: {
					resource: 'run',
					operation: 'create',
					task: 'x',
					startUrl: '',
					enableStructuredOutput: true,
					schemaTemplate: 'custom',
					outputSchema: `{"type": ${badType}}`,
					runOptions: {},
				},
				routes: {},
			});

			await assert.rejects(run(ctx), /unsupported JSON Schema type/, `for type ${badType}`);
		}
	});

	it('still accepts the string "null" as a type', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: true,
				schemaTemplate: 'custom',
				outputSchema: '{"type":"null"}',
				runOptions: {},
			},
			routes: { 'POST /runs': { id: 'r1', status: 'queued' } },
		});

		await run(ctx);

		assert.match(calls[0].body.task, /"null"/);
	});

	it('rejects a genuinely unsupported schema type', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: true,
				schemaTemplate: 'custom',
				outputSchema: '{"type":["string","banana"]}',
				runOptions: {},
			},
			routes: {},
		});

		await assert.rejects(run(ctx), /unsupported JSON Schema type: "banana"/);
	});

	it('rejects a custom schema that is not valid JSON', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: true,
				schemaTemplate: 'custom',
				outputSchema: '{nope',
				runOptions: {},
			},
			routes: {},
		});

		await assert.rejects(run(ctx), /invalid JSON/);
	});
});

describe('v4 pagination', () => {
	it('follows run cursors until the server stops issuing them', async () => {
		const pages = {
			'': { runs: [{ id: 1 }, { id: 2 }], nextCursor: 'c1', hasMore: true },
			c1: { runs: [{ id: 3 }, { id: 4 }], nextCursor: 'c2', hasMore: true },
			c2: { runs: [{ id: 5 }], nextCursor: null, hasMore: false },
		};
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'run',
				operation: 'getMany',
				returnAll: true,
				limit: 50,
				runListOptions: { sessionId: 'sess-1' },
			},
			routes: {
				'GET /runs': (options) =>
					pages[new URLSearchParams(options.url.split('?')[1]).get('cursor') ?? ''],
			},
		});

		const out = await run(ctx);

		assert.equal(out[0].length, 5);
		assert.ok(calls.every((call) => call.url.includes('sessionId=sess-1')));
	});

	it('stops once the limit is reached', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'getMany',
				returnAll: false,
				limit: 3,
				runListOptions: {},
			},
			routes: {
				'GET /runs': {
					runs: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
					nextCursor: 'c',
					hasMore: true,
				},
			},
		});

		const out = await run(ctx);

		assert.equal(out[0].length, 3);
	});

	it('terminates when hasMore is true but the cursor is null', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'getMany',
				returnAll: true,
				limit: 50,
				runListOptions: {},
			},
			routes: { 'GET /runs': { runs: [{ id: 1 }], nextCursor: null, hasMore: true } },
		});

		const out = await run(ctx);

		assert.equal(out[0].length, 1);
	});

	it('walks run events using nextAfter', async () => {
		const byAfter = {
			0: { events: [{ id: 1 }, { id: 2 }], nextAfter: 2, hasMore: true },
			2: { events: [{ id: 3 }], nextAfter: null, hasMore: false },
		};
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'getEvents',
				runId: 'r1',
				returnAll: true,
				limit: 50,
				eventsOptions: {},
			},
			routes: {
				'GET /runs/r1/events': (options) =>
					byAfter[new URLSearchParams(options.url.split('?')[1]).get('after')],
			},
		});

		const out = await run(ctx);

		assert.deepEqual(
			out[0].map((item) => item.json.id),
			[1, 2, 3],
		);
	});

	it('uses page numbers for browsers and forwards the filters', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'browser',
				operation: 'getMany',
				returnAll: true,
				limit: 50,
				browserListOptions: { filterBy: 'active', agentSessionId: 'as-1' },
			},
			routes: {
				'GET /browsers': (options) => {
					const page = Number(new URLSearchParams(options.url.split('?')[1]).get('pageNumber'));
					return page === 1
						? {
								items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
								totalItems: 101,
								pageNumber: 1,
								pageSize: 100,
							}
						: { items: [{ id: 100 }], totalItems: 101, pageNumber: 2, pageSize: 100 };
				},
			},
		});

		const out = await run(ctx);

		assert.equal(out[0].length, 101);
		assert.ok(calls[0].url.includes('filterBy=active'));
		assert.ok(calls[0].url.includes('agentSessionId=as-1'));
	});

	it('forwards includeUrls when listing browser downloads', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'browser',
				operation: 'getDownloads',
				browserSessionId: 'b1',
				returnAll: false,
				limit: 10,
				downloadsOptions: { includeUrls: true },
			},
			routes: { 'GET /browsers/b1/downloads': { files: [{ path: 'a.csv' }], hasMore: false } },
		});

		const out = await run(ctx);

		assert.equal(out[0][0].json.path, 'a.csv');
		assert.ok(calls[0].url.includes('includeUrls=true'));
	});
});

describe('v4 sessions', () => {
	it('builds the queue message body', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				resource: 'session',
				operation: 'queueMessage',
				sessionId: 's1',
				message: ' next step ',
				queueOptions: { interrupt: true, attachedFileIds: '["f1"]' },
			},
			routes: { 'POST /sessions/s1/queue': { id: 7, status: 'pending' } },
		});

		await run(ctx);

		assert.deepEqual(calls[0].body, {
			text: 'next step',
			interrupt: true,
			attachedFileIds: ['f1'],
		});
	});

	it('rejects an empty queue message', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'session',
				operation: 'queueMessage',
				sessionId: 's1',
				message: '  ',
				queueOptions: {},
			},
			routes: {},
		});

		await assert.rejects(run(ctx), /"Message" parameter is required/);
	});

	it('turns a 204 purge into a success payload', async () => {
		const { ctx } = makeCtx({
			params: { resource: 'session', operation: 'purge', sessionId: 's1' },
			routes: { 'POST /sessions/s1/purge': () => undefined },
		});

		const out = await run(ctx);

		assert.deepEqual(out[0][0].json, { success: true, sessionId: 's1' });
	});

	it('rejects a non-positive queued message ID', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'session',
				operation: 'cancelQueuedMessage',
				sessionId: 's1',
				messageId: 0,
			},
			routes: {},
		});

		await assert.rejects(run(ctx), /positive whole number/);
	});

	it('unwraps the queue array', async () => {
		const { ctx } = makeCtx({
			params: { resource: 'session', operation: 'getQueue', sessionId: 's1' },
			routes: { 'GET /sessions/s1/queue': { queue: [{ id: 1 }, { id: 2 }] } },
		});

		const out = await run(ctx);

		assert.equal(out[0].length, 2);
	});

	it('returns the run ID alongside the status', async () => {
		const { ctx } = makeCtx({
			params: { resource: 'run', operation: 'getStatus', runId: 'r1' },
			routes: { 'GET /runs/r1/status': { status: 'running' } },
		});

		const out = await run(ctx);

		assert.deepEqual(out[0][0].json, { id: 'r1', status: 'running' });
	});
});

describe('v4 base URL and errors', () => {
	it('rewrites any versioned base URL to v4 and leaves custom hosts alone', async () => {
		const cases = [
			['https://api.browser-use.com/api/v2', 'https://api.browser-use.com/api/v4'],
			['https://api.browser-use.com/api/v3/', 'https://api.browser-use.com/api/v4'],
			['https://api.browser-use.com/api/v4', 'https://api.browser-use.com/api/v4'],
			['https://gateway.internal/bu', 'https://gateway.internal/bu'],
		];

		for (const [given, expected] of cases) {
			const { ctx, calls } = makeCtx({
				params: { resource: 'run', operation: 'get', runId: 'r1' },
				baseUrl: given,
				routes: { 'GET /runs/r1': { id: 'r1' } },
			});

			await run(ctx);

			assert.equal(calls[0].baseURL, expected, `for ${given}`);
		}
	});

	it('explains Zero Data Retention on a 403', async () => {
		const { ctx } = makeCtx({
			params: { resource: 'run', operation: 'get', runId: 'r1' },
			routes: { 'GET /runs/r1': () => httpError(403, { detail: 'ZDR' }) },
		});

		await assert.rejects(run(ctx), (error) =>
			/Zero Data Retention/.test(error.description ?? error.message),
		);
	});

	it('explains the one-run-per-session rule on a 409', async () => {
		const { ctx } = makeCtx({
			params: {
				resource: 'run',
				operation: 'create',
				task: 'x',
				startUrl: '',
				enableStructuredOutput: false,
				runOptions: {},
			},
			routes: {
				'POST /runs': () => httpError(409, { detail: 'The session already has an active run' }),
			},
		});

		await assert.rejects(run(ctx), (error) =>
			/one run at a time/.test(error.description ?? error.message),
		);
	});

	it('surfaces the error as item JSON when continue on fail is set', async () => {
		const { ctx } = makeCtx({
			params: { resource: 'run', operation: 'get', runId: 'r1' },
			routes: { 'GET /runs/r1': () => httpError(500, { detail: 'server exploded' }) },
		});
		ctx.continueOnFail = () => true;

		const out = await run(ctx);

		assert.ok(out[0][0].json.error);
	});

	it('emits one paired item per input item', async () => {
		const { ctx } = makeCtx({
			params: { resource: 'run', operation: 'get', runId: 'r1' },
			items: [{ json: {} }, { json: {} }, { json: {} }],
			routes: { 'GET /runs/r1': { id: 'r1' } },
		});

		const out = await run(ctx);

		assert.equal(out[0].length, 3);
		assert.deepEqual(
			out[0].map((item) => item.pairedItem.item),
			[0, 1, 2],
		);
	});
});
