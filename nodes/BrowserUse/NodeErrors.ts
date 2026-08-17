import { INode, JsonObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

/**
 * n8n only renders rich context (status code, response body, hints) for errors that are a
 * `NodeOperationError` or a `NodeApiError`, so nothing else may escape a node's `execute`.
 *
 * Errors we raised ourselves already carry a user-facing message and are returned as-is;
 * wrapping them again would bury that message under a generic API failure. Anything else —
 * a transport failure from the HTTP helper, an unexpected runtime error — becomes a
 * `NodeApiError` so the UI still gets the request context.
 */
export function toNodeError(node: INode, error: unknown): NodeOperationError | NodeApiError {
	if (error instanceof NodeOperationError || error instanceof NodeApiError) {
		return error;
	}

	return new NodeApiError(node, error as JsonObject);
}
