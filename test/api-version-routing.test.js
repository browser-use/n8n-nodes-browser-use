const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadNode, makeCtx } = require('./helpers');

const { BrowserUse } = loadNode('BrowserUse.node.js');
const { BrowserUseV3 } = loadNode('BrowserUseV3.js');
const { BrowserUseV4 } = loadNode('BrowserUseV4.js');

const run = (ctx) => new BrowserUse().execute.call(ctx);

describe('API version selection', () => {
	it('defaults new nodes to v4 and offers all three versions', () => {
		const apiVersion = new BrowserUse().description.properties.find(
			(property) => property.name === 'apiVersion',
		);

		assert.equal(apiVersion.default, 'v4');
		assert.deepEqual(
			apiVersion.options.map((option) => option.value),
			['v2', 'v3', 'v4'],
		);
	});

	it('gates every non-apiVersion property behind an apiVersion', () => {
		const properties = new BrowserUse().description.properties.filter(
			(property) => property.name !== 'apiVersion',
		);

		assert.ok(properties.length > 0);

		for (const property of properties) {
			assert.ok(
				property.displayOptions?.show?.apiVersion,
				`${property.name} is not gated by apiVersion`,
			);
		}
	});

	it('contributes the full v3 and v4 property sets', () => {
		const properties = new BrowserUse().description.properties;
		const forVersion = (version) =>
			properties.filter((property) => property.displayOptions?.show?.apiVersion?.[0] === version);

		assert.equal(forVersion('v3').length, new BrowserUseV3().description.properties.length);
		assert.equal(forVersion('v4').length, new BrowserUseV4().description.properties.length);
	});

	it('falls back to v2 when a workflow has no stored apiVersion', async () => {
		// Workflows saved before the dropdown existed must not silently move to v4.
		const { ctx, calls } = makeCtx({
			params: { resource: 'task', operation: 'get', taskId: 't1' },
			routes: { 'GET /tasks/t1': { id: 't1' } },
		});

		await run(ctx);

		assert.equal(calls[0].baseURL, 'https://api.browser-use.com/api/v2');
		assert.equal(calls[0].url, '/tasks/t1');
	});

	it('routes v4 through the consolidated node', async () => {
		const { ctx, calls } = makeCtx({
			params: { apiVersion: 'v4', resource: 'run', operation: 'get', runId: 'r1' },
			routes: { 'GET /runs/r1': { id: 'r1', status: 'completed' } },
		});

		const out = await run(ctx);

		assert.equal(calls[0].baseURL, 'https://api.browser-use.com/api/v4');
		assert.equal(out[0][0].json.id, 'r1');
	});
});

describe('v2 behaviour is unchanged by the shared-helper refactor', () => {
	it('still calls the legacy /tasks endpoint on /api/v2', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				apiVersion: 'v2',
				resource: 'task',
				operation: 'execute',
				task: 'do it',
				startUrl: '',
				timeout: 10,
				enableStructuredOutput: false,
				schemaTemplate: 'custom',
				outputSchema: '',
				advancedOptions: {},
			},
			routes: {
				'POST /tasks': { id: 't1' },
				'GET /tasks/t1': { id: 't1', status: 'finished', isSuccess: true, sessionId: 's1' },
			},
		});

		const out = await run(ctx);

		assert.equal(calls[0].baseURL, 'https://api.browser-use.com/api/v2');
		assert.equal(out[0][0].json.isSuccess, true);
	});

	it('still resolves structured output templates', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				apiVersion: 'v2',
				resource: 'task',
				operation: 'execute',
				task: 'do it',
				startUrl: '',
				timeout: 10,
				enableStructuredOutput: true,
				schemaTemplate: 'product',
				outputSchema: '',
				advancedOptions: {},
			},
			routes: {
				'POST /tasks': { id: 't1' },
				'GET /tasks/t1': { id: 't1', status: 'finished', isSuccess: true },
			},
		});

		await run(ctx);

		const schema = JSON.parse(calls[0].body.structuredOutput);
		assert.ok(schema.properties.productName);
		assert.deepEqual(schema.required, ['productName', 'price']);
	});

	it('normalises a base URL saved as /api/v4 back to v2', async () => {
		const { ctx, calls } = makeCtx({
			params: { apiVersion: 'v2', resource: 'task', operation: 'get', taskId: 't1' },
			baseUrl: 'https://api.browser-use.com/api/v4',
			routes: { 'GET /tasks/t1': { id: 't1' } },
		});

		await run(ctx);

		assert.equal(calls[0].baseURL, 'https://api.browser-use.com/api/v2');
	});
});

describe('v3 behaviour is unchanged by the shared-helper refactor', () => {
	it('still posts the v3 session body to /api/v3', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				apiVersion: 'v3',
				resource: 'session',
				operation: 'create',
				task: 'do it',
				startUrl: '',
				enableStructuredOutput: false,
				schemaTemplate: 'custom',
				outputSchema: '',
				sessionOptions: { model: 'bu-max' },
			},
			routes: { 'POST /sessions': { id: 's1' } },
		});

		await run(ctx);

		assert.equal(calls[0].baseURL, 'https://api.browser-use.com/api/v3');
		assert.deepEqual(calls[0].body, { task: 'do it', model: 'bu-max' });
	});

	it('still sends outputSchema for server-side enforcement', async () => {
		const { ctx, calls } = makeCtx({
			params: {
				apiVersion: 'v3',
				resource: 'session',
				operation: 'create',
				task: 'do it',
				startUrl: '',
				enableStructuredOutput: true,
				schemaTemplate: 'company',
				outputSchema: '',
				sessionOptions: {},
			},
			routes: { 'POST /sessions': { id: 's1' } },
		});

		await run(ctx);

		assert.ok(calls[0].body.outputSchema.properties.companyName);
	});

	it('normalises a base URL saved as /api/v4 to v3', async () => {
		const { ctx, calls } = makeCtx({
			params: { apiVersion: 'v3', resource: 'session', operation: 'get', sessionId: 's1' },
			baseUrl: 'https://api.browser-use.com/api/v4',
			routes: { 'GET /sessions/s1': { id: 's1' } },
		});

		await run(ctx);

		assert.equal(calls[0].baseURL, 'https://api.browser-use.com/api/v3');
	});
});
