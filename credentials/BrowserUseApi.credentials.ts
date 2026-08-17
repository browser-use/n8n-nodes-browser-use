import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class BrowserUseApi implements ICredentialType {
	name = 'browserUseApi';
	displayName = 'Browser Use API';
	documentationUrl = 'https://docs.browser-use.com/cloud';
	// The logo is a solid monochrome glyph, so each theme needs the contrasting variant.
	icon: Icon = {
		light: 'file:../nodes/BrowserUse/browseruse.svg',
		dark: 'file:../nodes/BrowserUse/browseruse-dark.svg',
	};
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your Browser Use API key',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.browser-use.com/api/v2',
			description:
				'The base URL for the Browser Use API. Leave this as the default; the node switches between v2, v3, and v4 based on the API Version field.',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Browser-Use-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.baseUrl.replace(/\\/api\\/v[34]\\/?$/, "/api/v2").replace(/\\/$/, "")}}',
			url: '/tasks',
			method: 'GET',
		},
	};
}
