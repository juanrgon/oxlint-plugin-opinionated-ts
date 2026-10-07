# oxlint-plugin-opinionated-ts

My personal TypeScript rules as an [oxlint JS plugin](https://oxc.rs/docs/guide/usage/linter/js-plugins). It is a port of [eslint-plugin-opinionated-ts](https://github.com/juanrgon/eslint-plugin-opinionated-ts) with the same rule behavior, but it has no ESLint or typescript-eslint dependencies. In fact it has no runtime dependencies at all.

These rules encode conventions I settled on for my own projects. They are not meant to be uncontroversial.

## Install

Build the plugin once. `npm install` runs the build through `prepare`:

```sh
cd ~/github.com/juanrgon/oxlint-plugin-opinionated-ts
npm install
```

Then add it to a project from the local path. `link:` keeps a symlink, so rebuilding the plugin updates the project without reinstalling:

```sh
pnpm add -D link:$HOME/github.com/juanrgon/oxlint-plugin-opinionated-ts
# or: npm install -D ~/github.com/juanrgon/oxlint-plugin-opinionated-ts
```

Tested with oxlint 1.87.0.

## Usage

`.oxlintrc.json`:

```json
{
  "plugins": ["typescript"],
  "jsPlugins": ["oxlint-plugin-opinionated-ts"],
  "rules": {
    "opinionated-ts/strict-args": ["error", { "allowedNames": ["args", "props"], "optionalAllowedFor": ["props"] }],
    "opinionated-ts/no-explicit-return-type": ["error", { "allowExported": true }],
    "opinionated-ts/no-enum": "error",
    "opinionated-ts/no-type-assertion": "error",
    "opinionated-ts/prefer-type-over-interface": "error",
    "opinionated-ts/kebab-case-filename": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-unsafe-assignment": "error"
  }
}
```

The two `typescript/*` rules replace the ESLint plugin's any-safety rules (see below). `typescript/no-unsafe-assignment` is type-aware. It needs the `oxlint-tsgolint` package and `oxlint --type-aware` (or `"options": { "typeAware": true }`).

## Rules

| Rule | Options | Autofix |
| --- | --- | --- |
| [`strict-args`](#strict-args) | `allowedNames`, `optionalAllowedFor` | |
| [`no-explicit-return-type`](#no-explicit-return-type) | `allowExported` | yes |
| [`no-enum`](#no-enum) | | |
| [`no-type-assertion`](#no-type-assertion) | | |
| [`prefer-type-over-interface`](#prefer-type-over-interface) | | yes |
| [`kebab-case-filename`](#kebab-case-filename) | | |

### Rules from the ESLint plugin that are not here

The ESLint plugin's `no-explicit-any` and `no-unsafe-assignment` only re-exported the typescript-eslint rules. oxlint ships both rules built in, so this plugin leaves them out:

| eslint-plugin-opinionated-ts | oxlint built-in | Notes |
| --- | --- | --- |
| `opinionated-ts/no-explicit-any` | `typescript/no-explicit-any` | AST-only, no setup needed |
| `opinionated-ts/no-unsafe-assignment` | `typescript/no-unsafe-assignment` | Type-aware: needs `oxlint-tsgolint` and `--type-aware` |

`no-unsafe-assignment` could not be written as a JS plugin rule anyway, because oxlint JS plugins get no type information (`sourceCode.parserServices` is empty).

### strict-args

Functions take a single object parameter with an inline object type. No positional parameters, no destructuring, no optional properties, and no extracted type references.

```ts
// Good
export function createUser(args: { name: string; email: string; isAdmin: boolean }) {
  return db.insert({ name: args.name, email: args.email, isAdmin: args.isAdmin })
}

// Bad: positional parameters
export function createUser(name: string, email: string) {}

// Bad: destructured parameter
export function createUser({ name }: { name: string }) {}

// Bad: extracted type reference
type CreateUserArgs = { name: string }
export function createUser(args: CreateUserArgs) {}

// Bad: optional property
export function createUser(args: { name: string; isAdmin?: boolean }) {}
```

Exempt:

- Functions in callback position, because the caller sets their signature: call arguments (`items.map((item, index) => ...)`), object-literal property values (`{ onSuccess: (data) => ... }`, lint visitor objects), and JSX expressions (`onChange={(e) => ...}`).
- TypeScript `this` parameters.
- Overload signatures and `declare function` (they have no body).

Options:

- `allowedNames` (default: none, so any name is accepted). A list turns on name checks, for example `["args", "props"]`.
- `optionalAllowedFor` (default `[]`). Parameter names whose properties may be optional. Optional props are correct for React components, but on function args they hide a decision from the caller.

```ts
// With { "allowedNames": ["args", "props"], "optionalAllowedFor": ["props"] }

// Good: optional prop is correct modeling
function Badge(props: { label: string; className?: string }) {}

// Bad: wrong parameter name
function createUser(opts: { name: string }) {}

// Bad: optional on args is still flagged
function createUser(args: { name: string; isAdmin?: boolean }) {}
```

### no-explicit-return-type

No return type annotations. Let TypeScript infer them. The autofix removes the annotation.

```ts
// Good
function add(args: { a: number; b: number }) {
  return args.a + args.b
}

// Bad (autofixed to the above)
function add(args: { a: number; b: number }): number {
  return args.a + args.b
}
```

Exempt:

- Type predicates (`value is Foo`, `asserts value is Foo`). They cannot be inferred.
- Overload signatures (no body).
- Directly recursive functions, since TypeScript cannot infer them (TS7023). A named function whose body mentions its own name keeps its annotation. Mutual recursion is not detected.

Options:

- `allowExported` (default `false`). Allow annotations on exported functions (`export function`, `export default function`, `export const fn = () => ...`), where the return type is a public contract.

```ts
// With { "allowExported": true }

// Good: exported boundary
export function zodResolver<T extends z.Schema>(schema: T): Resolver<z.infer<T>> {}

// Bad: internal function
function totalWordCount(args: { chapters: Chapter[] }): number {}
```

### no-enum

No `enum` or `const enum`. Use an `as const` object with a derived type.

```ts
// Good
const STATUS = { PENDING: 'pending', COMPLETED: 'completed' } as const
type Status = (typeof STATUS)[keyof typeof STATUS]

// Bad
enum Status { PENDING = 'pending', COMPLETED = 'completed' }
```

### no-type-assertion

No `as` or angle-bracket assertions. Use `satisfies`, or parse unknown data with a schema. `as const` is allowed.

```ts
// Good
const config = { host: 'localhost', port: 8080 } satisfies ServerConfig
const TABS = ['library', 'tasks'] as const

// Bad
const config = { host: 'localhost', port: 8080 } as ServerConfig
const config = <ServerConfig>{ host: 'localhost', port: 8080 }
const bar = foo as unknown as Bar // reported twice
```

### prefer-type-over-interface

No `interface` declarations. Use `type` aliases. The autofix turns `extends` into an intersection.

```ts
// Good
type User = { id: string; name: string }

// Bad (autofixed to `type User = { id: string; name: string }`)
interface User { id: string; name: string }

// Bad (autofixed to `type Row<T> = Base<T> & Meta & { value: T }`)
interface Row<T> extends Base<T>, Meta { value: T }
```

Exempt, because declaration merging is the one job only interfaces can do:

- Interfaces inside `declare global { ... }`, `declare module "..." { ... }`, and namespaces.
- `.d.ts` files.

### kebab-case-filename

Every dot-separated part of the file name must be lowercase letters, digits, and hyphens. The message suggests the kebab-case name.

```
Good: delete-s3-image.ts, use-track-event.tsx, next-auth.d.ts, docx-to-html.test.ts
Good: pages/_app.tsx           (a single leading underscore is ignored)
Good: pages/[projectId].tsx    (Next.js dynamic routes are skipped)

Bad:  DocumentEditor.tsx       (suggests document-editor.tsx)
Bad:  useDebounce.tsx
Bad:  snake_case_file.ts
Bad:  mixed.TestHelper.ts
```

## Development

```sh
npm test       # builds, then runs every rule case through the oxlint binary
npm run lint   # lints this repo with its own rules
npm run typecheck
```

Tests use `node:test`. Each case is written to a temp folder and linted by the real oxlint 1.87.0 binary with the built plugin. The test checks the rule, the message, the number of reports, and the `--fix` output.
