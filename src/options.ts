import type { Context } from '@oxlint/plugins'

// oxlint validates options against `meta.schema` and merges
// `meta.defaultOptions` before the rule runs. These helpers only narrow the
// JSON-typed `context.options` so the rules can read it without assertions.
export function firstOptionObject(args: { context: Context }) {
  const first = args.context.options[0]
  const options: Record<string, unknown> =
    typeof first === 'object' && first !== null && !Array.isArray(first)
      ? first
      : {}
  return options
}

export function stringList(args: { value: unknown }) {
  if (!Array.isArray(args.value)) return undefined
  return args.value.filter((item): item is string => typeof item === 'string')
}
