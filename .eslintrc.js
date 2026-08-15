module.exports = {
	root: true,
	env: {
		browser: true,
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: 'tsconfig.json',
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	plugins: ['@typescript-eslint', 'n8n-nodes-base'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:n8n-nodes-base/nodes',
	],
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'n8n-nodes-base/node-class-description-display-name-unsuffixed': 'off',
		// TypeScript types require NodeConnectionType enum, not string literals
		// The eslint-plugin-n8n-nodes-base rules are outdated
		'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
		'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
	},
	overrides: [
		{
			// Plain CommonJS tests that drive the compiled output; they are deliberately
			// outside tsconfig.json, so the type-aware parser must not run on them.
			files: ['test/**/*.js'],
			parserOptions: {
				project: null,
				sourceType: 'script',
				ecmaVersion: 2022,
			},
			rules: {
				// The package is CommonJS, so require() is the correct import style here.
				'@typescript-eslint/no-require-imports': 'off',
				'@typescript-eslint/no-var-requires': 'off',
			},
		},
	],
	ignorePatterns: [
		'.eslintrc.js',
		'dist/**',
		'gulpfile.js',
		'index.js',
		'node_modules/**',
		'package.json',
	],
};
