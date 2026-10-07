import type { ESTree, Rule } from '@oxlint/plugins'
import { firstOptionObject } from '../options.ts'

type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression

function isTypePredicate(args: { returnType: ESTree.TSTypeAnnotation }) {
  return args.returnType.typeAnnotation.type === 'TSTypePredicate'
}

function isExported(args: { node: FunctionNode }) {
  const parent = args.node.parent
  if (
    parent.type === 'ExportNamedDeclaration' ||
    parent.type === 'ExportDefaultDeclaration'
  ) {
    return true
  }
  if (
    parent.type === 'VariableDeclarator' &&
    parent.parent?.type === 'VariableDeclaration' &&
    parent.parent.parent?.type === 'ExportNamedDeclaration'
  ) {
    return true
  }
  return false
}

function functionName(args: { node: FunctionNode }) {
  if (args.node.id) return args.node.id.name
  const parent = args.node.parent
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name
  }
  return null
}

export const noExplicitReturnType: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow explicit function return type annotations. Rely on TypeScript inference instead',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowExported: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowExported: false }],
    messages: {
      noReturnType:
        'Do not annotate return types explicitly. Let TypeScript infer the return type.',
    },
    fixable: 'code',
  },
  create(context) {
    const allowExported =
      firstOptionObject({ context }).allowExported === true

    function check(args: { node: FunctionNode }) {
      const returnType = args.node.returnType
      if (!returnType) return

      // Type predicates (`x is Foo`, `asserts x is Foo`) cannot be inferred.
      // Removing them silently breaks narrowing, so they are always allowed.
      if (isTypePredicate({ returnType })) return

      // Boundary contract: inference rules inside the module, but exported
      // functions may declare what they promise.
      if (allowExported && isExported({ node: args.node })) return

      // Directly recursive functions cannot infer their own return type
      // (TS7023). Heuristic: a named function whose body mentions its own
      // name keeps its annotation.
      const name = functionName({ node: args.node })
      if (name && args.node.body) {
        const bodyText = context.sourceCode.getText(args.node.body)
        if (new RegExp(`\\b${name}\\b`).test(bodyText)) return
      }

      context.report({
        node: returnType,
        messageId: 'noReturnType',
        fix(fixer) {
          return fixer.remove(returnType)
        },
      })
    }

    return {
      FunctionDeclaration(node) {
        // Overload signatures have no body and need their return types.
        // oxlint parses them as TSDeclareFunction, so this is a safety net.
        if (!node.body) return
        check({ node })
      },
      ArrowFunctionExpression(node) {
        check({ node })
      },
      FunctionExpression(node) {
        check({ node })
      },
    }
  },
}
