import { ruleTester } from '../support/rule-tester.ts'

ruleTester({
  rule: 'no-explicit-return-type',
  valid: [
    'function add(args: { a: number; b: number }) { return args.a + args.b }',
    'const greet = (args: { name: string }) => `Hello ${args.name}`',
    'export function doStuff() { return 42 }',
    // Overload signatures (no body) should be allowed
    'function generate(args: { id: string }): string;',
    // Type predicates cannot be inferred. Removing them breaks narrowing
    'function isString(value: unknown): value is string { return typeof value === "string" }',
    'const isNumber = (value: unknown): value is number => typeof value === "number"',
    'function assertDefined(value: unknown): asserts value is NonNullable<unknown> { if (value == null) throw new Error() }',
    'const ids = values.filter((id): id is number => id != null)',
    'const obj = { isFoo(value: unknown): value is string { return typeof value === "string" } }',
    // Directly recursive functions cannot infer their own return type (TS7023)
    'function walk(args: { value: unknown }): string { return Array.isArray(args.value) ? args.value.map((v) => walk({ value: v })).join() : "" }',
    'const walk = (args: { value: unknown }): string => Array.isArray(args.value) ? args.value.map((v) => walk({ value: v })).join() : ""',
    // allowExported: exported functions may declare their contract
    {
      code: 'export function api(args: { id: string }): Promise<string> { return fetchThing(args.id) }',
      options: [{ allowExported: true }],
    },
    {
      code: 'export const resolver = (args: { id: string }): Resolver => makeResolver(args.id)',
      options: [{ allowExported: true }],
    },
    {
      code: 'export default function handler(): void {}',
      options: [{ allowExported: true }],
    },
  ],
  invalid: [
    // allowExported does not exempt internal functions
    {
      code: 'function helper(): number { return 1 }',
      options: [{ allowExported: true }],
      output: 'function helper() { return 1 }',
      errors: [{ messageId: 'noReturnType' }],
    },
    {
      code: 'function add(args: { a: number; b: number }): number { return args.a + args.b }',
      output: 'function add(args: { a: number; b: number }) { return args.a + args.b }',
      errors: [{ messageId: 'noReturnType' }],
    },
    {
      code: 'const greet = (args: { name: string }): string => `Hello ${args.name}`',
      output: 'const greet = (args: { name: string }) => `Hello ${args.name}`',
      errors: [{ messageId: 'noReturnType' }],
    },
    {
      code: 'const handler = { run(): void {} }',
      output: 'const handler = { run() {} }',
      errors: [{ messageId: 'noReturnType' }],
    },
    // Mentioning a *different* function is not recursion, still flagged
    {
      code: 'function outer(): string { return inner() }',
      output: 'function outer() { return inner() }',
      errors: [{ messageId: 'noReturnType' }],
    },
  ],
})
