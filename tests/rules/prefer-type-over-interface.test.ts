import { ruleTester } from '../support/rule-tester.ts'

ruleTester({
  rule: 'prefer-type-over-interface',
  valid: [
    'type User = { id: string; name: string }',
    'type Callback = () => void',
    // Declaration merging is the point of interfaces inside ambient modules
    'declare global { interface Window { myGlobal: string } }',
    'declare module "some-lib" { interface Options { extra: boolean } }',
    // Ambient declaration files describe external shapes
    {
      code: 'interface External { id: string }',
      filename: 'types.d.ts',
    },
  ],
  invalid: [
    {
      code: 'interface User { id: string; name: string }',
      output: 'type User = { id: string; name: string }',
      errors: [{ messageId: 'preferType' }],
    },
    {
      code: 'export interface Config { host: string; port: number }',
      output: 'export type Config = { host: string; port: number }',
      errors: [{ messageId: 'preferType' }],
    },
    {
      code: 'interface Admin extends User { role: string }',
      output: 'type Admin = User & { role: string }',
      errors: [{ messageId: 'preferType' }],
    },
    {
      code: 'interface Row<T> extends Base<T>, Meta { value: T }',
      output: 'type Row<T> = Base<T> & Meta & { value: T }',
      errors: [{ messageId: 'preferType' }],
    },
  ],
})
