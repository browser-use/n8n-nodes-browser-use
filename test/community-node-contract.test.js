const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const { NodeApiError, NodeConnectionTypes } = require('n8n-workflow');

const { loadNode, makeCtx } = require('./helpers');

const { BrowserUse } = loadNode('BrowserUse.node.js');

const ROOT = path.join(__dirname, '..');
const NODES_DIR = path.join(ROOT, 'dist', 'nodes', 'BrowserUse');
const CREDENTIALS_DIR = path.join(ROOT, 'dist', 'credentials');

const { BrowserUseApi } = require(path.join(CREDENTIALS_DIR, 'BrowserUseApi.credentials.js'));
const packageJson = require(path.join(ROOT, 'package.json'));

/**
 * The n8n community node review rejects a package over any of these, so a regression here
 * costs a release rather than a test run. They are asserted against the compiled `dist/`,
 * which is what actually ships.
 */

// Same character classes the review's no-emoji-in-options rule matches on.
const EMOJI_REGEX = /(\p{Extended_Pictographic}|\p{Regional_Indicator})/gu;

/** Collects every user-facing label in a description, however deeply nested. */
function collectLabels(value, found = []) {
	if (Array.isArray(value)) {
		for (const entry of value) collectLabels(entry, found);
		return found;
	}

	if (!value || typeof value !== 'object') {
		return found;
	}

	for (const [key, entry] of Object.entries(value)) {
		if ((key === 'name' || key === 'displayName') && typeof entry === 'string') {
			found.push(entry);
		}
		collectLabels(entry, found);
	}

	return found;
}

/** Resolves a `file:` icon reference the way n8n does: relative to the class's own directory. */
function resolveIcon(reference, directory) {
	assert.ok(reference.startsWith('file:'), `${reference} must use the file: protocol`);
	return path.join(directory, reference.slice('file:'.length));
}

function assertThemedIcon(icon, directory, label) {
	assert.equal(typeof icon, 'object', `${label} must declare light and dark icon variants`);

	const light = resolveIcon(icon.light, directory);
	const dark = resolveIcon(icon.dark, directory);

	assert.notEqual(light, dark, `${label} must use a different file per theme`);

	for (const file of [light, dark]) {
		assert.ok(file.endsWith('.svg'), `${file} must be an SVG`);
		assert.ok(fs.existsSync(file), `${file} is missing from dist/`);
	}
}

describe('community node review contract', () => {
	const { description } = new BrowserUse();

	it('is usable as an AI agent tool', () => {
		assert.equal(description.usableAsTool, true);
	});

	it('shows the current operation as its subtitle', () => {
		assert.match(description.subtitle, /^=\{\{.*\$parameter\["operation"\]/);
	});

	it('declares connections through NodeConnectionTypes rather than string literals', () => {
		assert.deepEqual(description.inputs, [NodeConnectionTypes.Main]);
		assert.deepEqual(description.outputs, [NodeConnectionTypes.Main]);
	});

	it('ships a light and a dark icon', () => {
		assertThemedIcon(description.icon, NODES_DIR, 'BrowserUse');
	});

	it('gives the credential a themed icon that resolves inside the package', () => {
		assertThemedIcon(new BrowserUseApi().icon, CREDENTIALS_DIR, 'BrowserUseApi');
	});

	it('keeps emoji out of every user-facing label, across all three API versions', () => {
		// The v3 and v4 properties are merged into this description, so one walk covers them.
		for (const value of collectLabels(description)) {
			assert.equal(
				EMOJI_REGEX.test(value),
				false,
				`"${value}" contains an emoji, which the review gate rejects`,
			);
			EMOJI_REGEX.lastIndex = 0;
		}
	});

	it('registers every node source file it ships', () => {
		// n8n discovers nodes from package.json alone, but the review flags any unregistered
		// `*.node.ts`. The v3 and v4 modules stay plain property/execute exports for that reason.
		const sourceFiles = fs
			.readdirSync(path.join(ROOT, 'nodes', 'BrowserUse'))
			.filter((file) => file.endsWith('.node.ts'))
			.map((file) => `dist/nodes/BrowserUse/${file.replace(/\.ts$/, '.js')}`);

		assert.deepEqual(sourceFiles.sort(), [...packageJson.n8n.nodes].sort());
	});
});

describe('errors leaving a node', () => {
	const RAW_ERROR_CASES = [
		['v2', { apiVersion: 'v2', resource: 'task', operation: 'get' }],
		['v3', { apiVersion: 'v3', resource: 'session', operation: 'get' }],
		['v4', { apiVersion: 'v4', resource: 'run', operation: 'get' }],
	];

	for (const [apiVersion, params] of RAW_ERROR_CASES) {
		it(`wraps a raw ${apiVersion} failure so the UI gets node context`, async () => {
			// The ID parameter is deliberately unstubbed, so the context throws a plain Error
			// from inside execute's try block — the one path that used to escape unwrapped.
			const { ctx } = makeCtx({ params, routes: {} });

			await assert.rejects(new BrowserUse().execute.call(ctx), (error) => {
				assert.ok(error instanceof NodeApiError, `expected a NodeApiError, got ${error.name}`);
				return true;
			});
		});
	}

	it('passes an existing node error through instead of re-wrapping it', async () => {
		const { ctx } = makeCtx({
			params: { apiVersion: 'v4', resource: 'run', operation: 'get', runId: 'r1' },
			routes: { 'GET /runs/r1': () => httpNotFound() },
		});

		await assert.rejects(new BrowserUse().execute.call(ctx), (error) => {
			// The request helper already raised this with a tailored message; double-wrapping
			// would replace it with a generic one.
			assert.equal(error.message, 'The requested Browser Use resource was not found');
			return true;
		});
	});
});

function httpNotFound() {
	const error = new Error('HTTP 404');
	error.response = { status: 404, data: { detail: 'No such run' } };
	throw error;
}
