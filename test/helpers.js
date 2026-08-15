const fs = require('node:fs');
const path = require('node:path');

const DIST = path.join(__dirname, '..', 'dist', 'nodes', 'BrowserUse');

if (!fs.existsSync(path.join(DIST, 'BrowserUse.node.js'))) {
	throw new Error('dist/ is missing or stale. Run `pnpm build` before `pnpm test`.');
}

const NODE = {
	name: 'Browser Use',
	type: 'browserUse',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

/**
 * Builds a stand-in for n8n's IExecuteFunctions so a node can be driven without a
 * live API. `routes` maps "METHOD /path" (with or without the query string) to a
 * response value or a function of the request options.
 */
function makeCtx({
	params,
	routes,
	baseUrl = 'https://api.browser-use.com/api/v2',
	items = [{ json: {} }],
}) {
	const calls = [];
	const ctx = {
		getInputData: () => items,
		getNode: () => NODE,
		continueOnFail: () => false,
		getCredentials: async () => ({ apiKey: 'bu_test', baseUrl }),
		getNodeParameter(name, _itemIndex, fallback) {
			if (Object.prototype.hasOwnProperty.call(params, name)) {
				return params[name];
			}
			if (fallback !== undefined) {
				return fallback;
			}
			throw new Error(`Test did not stub the "${name}" parameter`);
		},
		helpers: {
			async httpRequestWithAuthentication(_credentialType, options) {
				calls.push(options);
				const withQuery = `${options.method} ${options.url}`;
				const withoutQuery = `${options.method} ${options.url.split('?')[0]}`;
				const handler = routes[withQuery] ?? routes[withoutQuery];

				if (handler === undefined) {
					throw new Error(`Test did not stub the route: ${withQuery}`);
				}

				return typeof handler === 'function' ? handler(options) : handler;
			},
		},
	};

	return { ctx, calls };
}

/** Builds an error shaped like the one n8n's HTTP helper throws. */
function httpError(status, data) {
	const error = new Error(`HTTP ${status}`);
	error.response = { status, data };
	throw error;
}

function loadNode(file) {
	return require(path.join(DIST, file));
}

module.exports = { loadNode, makeCtx, httpError };
