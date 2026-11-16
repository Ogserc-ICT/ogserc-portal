import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// Brand colours are defined once, in src/app/(frontend)/globals.css (D-023). Any hex colour in
// a string, template, or JSX text elsewhere in src/ is an error, including Tailwind
// arbitrary values such as bg-[#fff].
const HEX = '/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z_-])/'
const hexMessage =
  'Do not hard-code colour values. Use a theme colour from globals.css (see docs/DECISIONS.md D-023).'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx,mjs}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=${HEX}]`, message: hexMessage },
        { selector: `TemplateElement[value.raw=${HEX}]`, message: hexMessage },
        { selector: `JSXText[value=${HEX}]`, message: hexMessage },
      ],
    },
  },
  {
    ignores: [
      '.next/',
      '.next-e2e/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'src/payload-types.ts',
      'src/app/(payload)/admin/importMap.js',
      'src/migrations/',
    ],
  },
]

export default eslintConfig
