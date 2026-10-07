import { ruleTester } from '../support/rule-tester.ts'

ruleTester({
  rule: 'no-type-assertion',
  valid: [
    // satisfies is allowed
    'const config = { host: "localhost" } satisfies ServerConfig',
    // as const is allowed
    'const ITEMS = ["a", "b"] as const',
    'const OBJ = { a: 1 } as const',
    // no assertion at all
    'const x = 42',
  ],
  invalid: [
    {
      code: 'const config = { host: "localhost" } as ServerConfig',
      errors: [{ messageId: 'noAs' }],
    },
    {
      code: 'const x = value as string',
      errors: [{ messageId: 'noAs' }],
    },
    {
      code: 'const y = foo as unknown as Bar',
      errors: [{ messageId: 'noAs' }, { messageId: 'noAs' }],
    },
    // Angle-bracket syntax (only parses in .ts, not .tsx)
    {
      code: 'const x = <string>value',
      errors: [{ messageId: 'noAngleBracket' }],
    },
  ],
})
