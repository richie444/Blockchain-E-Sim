module.exports = {
	parser: '@typescript-eslint/parser',
	plugins: ['react', '@typescript-eslint', 'prettier', 'jest'],
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier',
		'plugin:jest/recommended',
	],
	rules: {
		'no-console': 1,
		'prettier/prettier': 2,
		'jest/no-disabled-tests': 'warn',
		'jest/no-focused-tests': 'error',
		'jest/no-identical-title': 'error',
		'jest/prefer-to-have-length': 'warn',
		'jest/valid-expect': 'error',
		'react/display-name': 'off',
	},
	settings: {
		react: {
			pragma: 'React',
			version: 'detect',
		},
		jest: {
			version: 29,
		},
	},
	env: {
		'jest/globals': true,
	},
	overrides: [
		{
			files: ['**/*.{ts,tsx,js,jsx,json}'],
		},
	],
};
