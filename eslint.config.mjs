import { config } from '@n8n/node-cli/eslint';

export default [
	...config,
	{
		files: ['**/*.ts'],
		rules: {
			// Browser Use Cloud responses are free-form JSON that the node normalises at the
			// boundary; mirroring every response shape in TypeScript would not make that safer.
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
];
