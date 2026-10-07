import type { ESTree, Rule } from '@oxlint/plugins'
import { firstOptionObject, stringList } from '../options.ts'

function isThisParameter(args: { param: ESTree.ParamPattern }) {
  return args.param.type === 'Identifier' && args.param.name === 'this'
}

// Functions in callback position are exempt: their signatures are dictated by
// the caller (array methods, promise chains, event handlers, lint visitors,
// option objects). This intentionally includes every function used as an
// object-literal property value. Handler maps and returned visitor objects
// make a tighter check too noisy.
function isCallbackPosition(args: { node: ESTree.Node }) {
  const parent = args.node.parent
  if (!parent) return false

  // Direct call argument: .map(x => x), .then(x => x)
  if (parent.type === 'CallExpression') return true

  // Object property value: { onMutate(input) {...} }
  if (parent.type === 'Property') return true

  // JSX expression: onChange={(e) => ...}
  if (parent.type === 'JSXExpressionContainer') return true

  return false
}

export const strictArgs: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require functions to use a single object parameter with an inline type annotation and no optional properties',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedNames: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
          },
          optionalAllowedFor: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ optionalAllowedFor: [] }],
    messages: {
      singleArg: 'Functions with parameters must use a single object parameter.',
      argName: 'The parameter must be named {{allowed}}.',
      inlineType:
        'The parameter must have an inline object type annotation (not a type reference).',
      noOptional:
        'Properties in the `{{name}}` type must not be optional. Make all properties required.',
      noDestructure:
        'Do not destructure function parameters. Use `args.property` instead.',
    },
  },
  create(context) {
    const options = firstOptionObject({ context })
    // When omitted, any parameter name is accepted. Providing a list opts in
    // to name enforcement.
    const allowedNames = stringList({ value: options.allowedNames })
    const optionalAllowedFor =
      stringList({ value: options.optionalAllowedFor }) ?? []

    function check(args: { params: ESTree.ParamPattern[] }) {
      const params = args.params.filter((param) => !isThisParameter({ param }))

      const [param, second] = params
      if (!param) return
      if (second) {
        context.report({ node: second, messageId: 'singleArg' })
        return
      }

      if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
        context.report({ node: param, messageId: 'noDestructure' })
        return
      }

      // Rest elements, default values, and constructor parameter properties
      if (param.type !== 'Identifier') {
        context.report({ node: param, messageId: 'singleArg' })
        return
      }

      if (allowedNames && !allowedNames.includes(param.name)) {
        context.report({
          node: param,
          messageId: 'argName',
          data: { allowed: allowedNames.map((n) => `\`${n}\``).join(' or ') },
        })
        return
      }

      const typeAnnotation = param.typeAnnotation
      if (!typeAnnotation) return

      const typeNode = typeAnnotation.typeAnnotation
      if (typeNode.type !== 'TSTypeLiteral') {
        context.report({ node: typeNode, messageId: 'inlineType' })
        return
      }

      // Optionality is correct modeling for React props (`className?`), but a
      // hidden decision for function args. Configurable per parameter name.
      if (optionalAllowedFor.includes(param.name)) return

      for (const member of typeNode.members) {
        if (member.type === 'TSPropertySignature' && member.optional) {
          context.report({
            node: member,
            messageId: 'noOptional',
            data: { name: param.name },
          })
        }
      }
    }

    return {
      FunctionDeclaration(node) {
        check({ params: node.params })
      },
      ArrowFunctionExpression(node) {
        if (isCallbackPosition({ node })) return
        check({ params: node.params })
      },
      FunctionExpression(node) {
        if (isCallbackPosition({ node })) return
        check({ params: node.params })
      },
    }
  },
}
