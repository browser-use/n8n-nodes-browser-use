const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { NodeHelpers } = require('n8n-workflow');

const { loadNode, makeCtx } = require('./helpers');

const { BrowserUse } = loadNode('BrowserUse.node.js');
const { browserUseV3Properties } = loadNode('BrowserUseV3.js');
const { browserUseV4Properties } = loadNode('BrowserUseV4.js');

const run = (ctx) => new BrowserUse().execute.call(ctx);

/**
 * Resolves stored parameters exactly as n8n's Workflow constructor does, so these
 * assertions reflect real behaviour rather than a stub's. n8n fills a missing
 * parameter with its property default, which is why the default cannot simply be
 * flipped in place without migrating every saved node.
 */
function resolveApiVersion(storedParameters, typeVersion) {
	const description = new BrowserUse().description;
	const node = {
		name: 'Browser Use',
		type: 'browserUse',
		typeVersion,
		position: [0, 0],
		parameters: storedParameters,
	};

	return NodeHelpers.getNodeParameters(
		description.properties,
		storedParameters,
		true,
		false,
		node,
		description,
	)?.apiVersion;
}

describe('API version selection', () => {
	it('declares both node versions and defaults new nodes to the newer one', () => {
		const description = new BrowserUse().description;

		assert.deepEqual(description.version, [1, 2]);
		assert.equal(description.defaultVersion, 2);
	});

	it('offers all three API versions on both node versions', () => {
		const apiVersionProperties = new BrowserUse().description.properties.filter(
			(property) => property.name === 'apiVersion',
		);

		assert.equal(apiVersionProperties.length, 2);

		for (const property of apiVersionProperties) {
			assert.deepEqual(
				property.options.map((option) => option.value),
				['v2', 'v3', 'v4'],
			);
		}
	});

	it('resolves typeVersion 1 nodes to v2 and typeVersion 2 nodes to v4', () => {
		// A node saved before the dropdown existed stores nothing at all.
		assert.equal(resolveApiVersion({}, 1), 'v2');
		// n8n omits parameters left at their default on save, so a v2 workflow saved
		// with the dropdown untouched also stores nothing.
		assert.equal(resolveApiVersion({ resource: 'task', operation: 'execute' }, 1), 'v2');
		// Explicit choices survive on either node version.
		assert.equal(resolveApiVersion({ apiVersion: 'v3' }, 1), 'v3');
		assert.equal(resolveApiVersion({ apiVersion: 'v2' }, 2), 'v2');
		// Only newly added nodes land on v4.
		assert.equal(resolveApiVersion({}, 2), 'v4');
	});

	it('gates the two apiVersion properties by node version', () => {
		const apiVersionProperties = new BrowserUse().description.properties.filter(
			(property) => property.name === 'apiVersion',
		);
		const byNodeVersion = Object.fromEntries(
			apiVersionProperties.map((property) => [
				property.displayOptions.show['@version'][0],
				property.default,
			]),
		);

		assert.deepEqual(byNodeVersion, { 1: 'v2', 2: 'v4' });
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

		assert.equal(forVersion('v3').length, browserUseV3Properties.length);
		assert.equal(forVersion('v4').length, browserUseV4Properties.length);
	});

	it('treats an unresolvable apiVersion as v2 at execution time', async () => {
		// Belt-and-braces guard behind the typeVersion gating asserted above.
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

describe('v2 model compatibility and behaviour', () => {
	it('offers Browser Use 2.0 Mini (Preview) only on the compatible v2 selectors', () => {
		const properties = new BrowserUse().description.properties;
		const collectionFor = (version, name) =>
			properties.find(
				(property) =>
					property.name === name && property.displayOptions?.show?.apiVersion?.includes(version),
			);
		const modelOptions = (collection, name) =>
			collection.options.find((option) => option.name === name).options;

		const v2AdvancedOptions = collectionFor('v2', 'advancedOptions');
		const v3SessionOptions = collectionFor('v3', 'sessionOptions');
		const v4RunOptions = collectionFor('v4', 'runOptions');

		assert.ok(v2AdvancedOptions);
		assert.ok(v3SessionOptions);
		assert.ok(v4RunOptions);

		const previewModel = modelOptions(v2AdvancedOptions, 'llm').find(
			(option) => option.value === 'bu-2-0-mini-preview',
		);

		assert.deepEqual(previewModel, {
			name: 'Browser Use 2.0 Mini (Preview)',
			value: 'bu-2-0-mini-preview',
			description: 'Cheaper and faster per token; opt in while the model is in preview',
		});
		assert.ok(
			modelOptions(v2AdvancedOptions, 'judgeLlm').some(
				(option) => option.value === 'bu-2-0-mini-preview',
			),
		);
		assert.ok(
			!modelOptions(v3SessionOptions, 'model').some(
				(option) => option.value === 'bu-2-0-mini-preview',
			),
		);
		assert.ok(
			!modelOptions(v4RunOptions, 'model').some((option) => option.value === 'bu-2-0-mini-preview'),
		);
	});

	it('serializes the exact Browser Use 2.0 Mini preview model identifier', async () => {
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
				advancedOptions: { llm: 'bu-2-0-mini-preview' },
			},
			routes: {
				'POST /tasks': { id: 't1' },
				'GET /tasks/t1': { id: 't1', status: 'finished', isSuccess: true },
			},
		});

		await run(ctx);

		assert.equal(calls[0].baseURL, 'https://api.browser-use.com/api/v2');
		assert.equal(calls[0].body.llm, 'bu-2-0-mini-preview');
	});

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
