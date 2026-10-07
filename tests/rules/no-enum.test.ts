import { ruleTester } from '../support/rule-tester.ts'

ruleTester({
  rule: 'no-enum',
  valid: [
    'const STATUS = { PENDING: "pending", DONE: "done" } as const',
    'type Status = "pending" | "done"',
  ],
  invalid: [
    {
      code: 'enum Status { PENDING = "pending", DONE = "done" }',
      errors: [{ messageId: 'noEnum' }],
    },
    {
      code: 'const enum Direction { Up, Down }',
      errors: [{ messageId: 'noEnum' }],
    },
  ],
})
