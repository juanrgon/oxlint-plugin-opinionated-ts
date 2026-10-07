import type { Rule } from '@oxlint/plugins'

export const noEnum: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow enums. Use `as const` objects with derived types instead',
    },
    schema: [],
    messages: {
      noEnum:
        'Do not use enums. Use an `as const` object with a derived type instead.',
    },
  },
  create(context) {
    return {
      TSEnumDeclaration(node) {
        context.report({ node, messageId: 'noEnum' })
      },
    }
  },
}
