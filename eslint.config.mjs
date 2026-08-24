// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withNuxt(eslintConfigPrettier, {
  rules: {
    'vue/multi-word-component-names': 'off',
    // TS optional props (`prop?: T`) already communicate optionality.
    'vue/require-default-prop': 'off',
  },
})
