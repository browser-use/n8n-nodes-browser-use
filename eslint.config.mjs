import { config } from '@n8n/node-cli/eslint';

export default [
	...config,
	{
		// Only the modules that handle Browser Use Cloud payloads. Their request bodies, API
		// responses and user-supplied JSON Schemas are free-form JSON that the node normalises at
		// the boundary, so mirroring every shape in TypeScript would not make them safer. Every
		// other file — credentials, helpers, and any module added later — keeps the rule on, so
		// reaching for `any` there stays a deliberate choice rather than a silent default.
		files: [
			'nodes/BrowserUse/BrowserUse.node.ts',
			'nodes/BrowserUse/BrowserUseV3.ts',
			'nodes/BrowserUse/BrowserUseV4.ts',
			'nodes/BrowserUse/SchemaTemplates.ts',
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
];
