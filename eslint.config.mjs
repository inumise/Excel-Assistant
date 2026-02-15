import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  {
    ignores: ['node_modules/**', '.next/**', 'coverage/**', 'playwright-report/**'],
  },
]

export default config
