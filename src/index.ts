import type { Plugin } from '@oxlint/plugins'
import { kebabCaseFilename } from './rules/kebab-case-filename.ts'
import { noEnum } from './rules/no-enum.ts'
import { noExplicitReturnType } from './rules/no-explicit-return-type.ts'
import { noTypeAssertion } from './rules/no-type-assertion.ts'
import { preferTypeOverInterface } from './rules/prefer-type-over-interface.ts'
import { strictArgs } from './rules/strict-args.ts'

// `no-explicit-any` and `no-unsafe-assignment` are intentionally absent.
// Use oxlint's built-in `typescript/no-explicit-any` and
// `typescript/no-unsafe-assignment` (type-aware) rules instead.
const plugin: Plugin = {
  meta: {
    name: 'opinionated-ts',
  },
  rules: {
    'strict-args': strictArgs,
    'no-explicit-return-type': noExplicitReturnType,
    'no-enum': noEnum,
    'no-type-assertion': noTypeAssertion,
    'prefer-type-over-interface': preferTypeOverInterface,
    'kebab-case-filename': kebabCaseFilename,
  },
}

export default plugin
