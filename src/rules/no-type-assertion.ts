import type { ESTree, Rule } from '@oxlint/plugins'

function isConstAssertion(args: { typeAnnotation: ESTree.TSType }) {
  return (
    args.typeAnnotation.type === 'TSTypeReference' &&
    args.typeAnnotation.typeName.type === 'Identifier' &&
    args.typeAnnotation.typeName.name === 'const'
  )
}

export const noTypeAssertion: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow type assertions (`as` and angle-bracket syntax). Use `satisfies` instead',
    },
    schema: [],
    messages: {
      noAs: 'Do not use `as` for type assertions. Use `satisfies` instead.',
      noAngleBracket:
        'Do not use angle-bracket type assertions. Use `satisfies` instead.',
    },
  },
  create(context) {
    return {
      TSAsExpression(node) {
        if (isConstAssertion({ typeAnnotation: node.typeAnnotation })) return
        context.report({ node, messageId: 'noAs' })
      },
      TSTypeAssertion(node) {
        if (isConstAssertion({ typeAnnotation: node.typeAnnotation })) return
        context.report({ node, messageId: 'noAngleBracket' })
      },
    }
  },
}
