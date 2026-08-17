export type BrowserUseApiVersion = 'v2' | 'v3' | 'v4';

/**
 * Credentials hold a single Base URL (default `/api/v2`), while each node mode talks to its
 * own API version. Rewrite a trailing `/api/vN` to the requested version and leave any other
 * base URL untouched so custom gateways keep working.
 */
export function getVersionedBaseUrl(baseUrl: string, version: BrowserUseApiVersion): string {
	return baseUrl.replace(/\/api\/v[234]\/?$/, `/api/${version}`);
}
