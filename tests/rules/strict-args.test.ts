import { ruleTester } from '../support/rule-tester.ts'

ruleTester({
  rule: 'strict-args',
  valid: [
    // Zero params is fine
    'function foo() { return 1 }',
    'const foo = () => 1',

    // Single args with inline type
    'function foo(args: { name: string }) { return args.name }',
    'const foo = (args: { id: number; name: string }) => args.id',
    'export function createUser(args: { name: string; email: string }) { return args }',

    // No type annotation (we don't enforce types, just validate shape if present)
    'function foo(args) { return args }',

    // `this` parameter should be ignored
    'function foo(this: Context, args: { id: string }) { return args.id }',
    'function foo(this: Window) { return this }',

    // Callbacks passed as arguments are skipped
    '[1, 2, 3].map((val) => val + 1)',
    '[1, 2, 3].filter((val, index) => index > 0)',
    'items.forEach((item) => console.log(item))',
    'promise.then((result) => result.data)',

    // Object property values are skipped (framework callbacks)
    'const obj = { onMutate(input) { return input } }',
    'const obj = { onChange: (e) => e.target.value }',

    // JSX expression containers are skipped
    {
      code: 'const x = <input onChange={(e) => e.target.value} />',
      filename: 'file.tsx',
    },
    // allowedNames option: React components may use `props`
    {
      code: 'function Button(props: { label: string }) { return props.label }',
      options: [{ allowedNames: ['args', 'props'] }],
    },
    // optionalAllowedFor: optional props are correct modeling for components
    {
      code: 'function Badge(props: { label: string; className?: string }) { return props.label }',
      options: [{ allowedNames: ['args', 'props'], optionalAllowedFor: ['props'] }],
    },
    // No allowedNames: any parameter name is accepted by default
    'const getSession = (ctx: { req: string; res: string }) => ctx.req',
    'function process(input: { data: string }) { return input.data }',
  ],
  invalid: [
    // optionalAllowedFor does not exempt `args`
    {
      code: 'function createUser(args: { name: string; isAdmin?: boolean }) { return args.name }',
      options: [{ allowedNames: ['args', 'props'], optionalAllowedFor: ['props'] }],
      errors: [{ messageId: 'noOptional' }],
    },
    // Multiple params
    {
      code: 'function foo(a: string, b: number) { return a }',
      errors: [{ messageId: 'singleArg' }],
    },
    // Wrong param name: only enforced when allowedNames is provided
    {
      code: 'function foo(opts: { name: string }) { return opts.name }',
      options: [{ allowedNames: ['args'], optionalAllowedFor: [] }],
      errors: [{ messageId: 'argName' }],
    },
    // Type reference instead of inline
    {
      code: 'type Opts = { name: string }; function foo(args: Opts) { return args }',
      errors: [{ messageId: 'inlineType' }],
    },
    // Optional property
    {
      code: 'function foo(args: { name: string; age?: number }) { return args }',
      errors: [{ messageId: 'noOptional' }],
    },
    // Destructured params
    {
      code: 'function foo({ name }: { name: string }) { return name }',
      errors: [{ messageId: 'noDestructure' }],
    },
    // Arrow with destructured params
    {
      code: 'const foo = ({ id }: { id: string }) => id',
      errors: [{ messageId: 'noDestructure' }],
    },
    // Array destructuring
    {
      code: 'function foo([a, b]: [string, number]) { return a }',
      errors: [{ messageId: 'noDestructure' }],
    },
    // Rest element
    {
      code: 'function foo(...args: string[]) { return args }',
      errors: [{ messageId: 'singleArg' }],
    },
    // `this` param + multiple real params should still error
    {
      code: 'function foo(this: Context, a: string, b: number) { return a }',
      errors: [{ messageId: 'singleArg' }],
    },
    // Shape checks still apply to params with arbitrary names
    {
      code: 'type Ctx = { req: string }; function foo(ctx: Ctx) { return ctx.req }',
      errors: [{ messageId: 'inlineType' }],
    },
    {
      code: 'function foo(ctx: { req: string; res?: string }) { return ctx.req }',
      errors: [{ messageId: 'noOptional' }],
    },
  ],
})
