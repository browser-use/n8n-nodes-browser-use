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

/**
 * Runs `fn` with `sleep` and `Date.now` replaced by a virtual clock, so polling loops
 * resolve instantly and deterministically. The node calls `sleep` as a property lookup
 * on the n8n-workflow module, so replacing the property is enough to intercept it.
 *
 * `fn` receives the list of requested sleep durations, which is what the capped-wait
 * behaviour actually asserts: a bounded final wait shows up as a short last entry.
 */
const MAX_VIRTUAL_SLEEPS = 1000;

async function withVirtualClock(fn) {
	const n8nWorkflow = require('n8n-workflow');
	const sleepDescriptor = Object.getOwnPropertyDescriptor(n8nWorkflow, 'sleep');
	const realSleep = n8nWorkflow.sleep;
	const realNow = Date.now;
	const requestedSleeps = [];
	let now = realNow.call(Date);

	Date.now = () => now;
	// The export is a getter with no setter, so plain assignment silently no-ops and
	// leaves the real sleep running against a frozen clock, which never terminates.
	Object.defineProperty(n8nWorkflow, 'sleep', {
		configurable: true,
		value: async (ms) => {
			requestedSleeps.push(ms);

			// Turns a runaway loop into a failure rather than a hung suite.
			if (requestedSleeps.length > MAX_VIRTUAL_SLEEPS) {
				throw new Error(
					`sleep called more than ${MAX_VIRTUAL_SLEEPS} times; loop does not terminate`,
				);
			}

			// Advancing the virtual clock is what lets the loop reach its deadline.
			now += Number.isFinite(ms) ? ms : 0;
		},
	});

	if (n8nWorkflow.sleep === realSleep) {
		Date.now = realNow;
		throw new Error('could not replace n8n-workflow sleep; the virtual clock would hang');
	}

	try {
		return await fn(requestedSleeps);
	} finally {
		Date.now = realNow;
		Object.defineProperty(n8nWorkflow, 'sleep', sleepDescriptor);
	}
}

module.exports = { loadNode, makeCtx, httpError, withVirtualClock };
