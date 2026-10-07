import assert from 'node:assert/strict'
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import plugin from '../src/index.ts'
import { lintJson, makeTempDir, repoRoot } from './support/rule-tester.ts'

const roots: string[] = []

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function lintProject(args: {
  config: Record<string, unknown>
  files: Record<string, string>
  linkPackage: boolean
}) {
  const root = makeTempDir({ prefix: 'opinionated-ts-project-' })
  roots.push(root)
  if (args.linkPackage) {
    mkdirSync(join(root, 'node_modules'))
    symlinkSync(repoRoot, join(root, 'node_modules', 'oxlint-plugin-opinionated-ts'))
  }
  for (const [name, code] of Object.entries(args.files)) {
    writeFileSync(join(root, name), code)
  }
  writeFileSync(join(root, '.oxlintrc.json'), JSON.stringify(args.config))
  return lintJson({ cwd: root, argv: ['.'] })
}

describe('plugin', () => {
  it('uses the opinionated-ts namespace', () => {
    assert.equal(plugin.meta?.name, 'opinionated-ts')
  })

  it('exports the AST rules and leaves out the any-safety rules', () => {
    assert.deepEqual(Object.keys(plugin.rules).sort(), [
      'kebab-case-filename',
      'no-enum',
      'no-explicit-return-type',
      'no-type-assertion',
      'prefer-type-over-interface',
      'strict-args',
    ])
  })

  it('loads by package name from jsPlugins', () => {
    const diagnostics = lintProject({
      linkPackage: true,
      config: {
        plugins: [],
        jsPlugins: ['oxlint-plugin-opinionated-ts'],
        categories: { correctness: 'off' },
        rules: { 'opinionated-ts/no-enum': 'error' },
      },
      files: { 'status.ts': 'enum Status { On, Off }\n' },
    })
    assert.deepEqual(
      diagnostics.map((d) => d.code),
      ['opinionated-ts(no-enum)'],
    )
  })
})

// The ESLint plugin re-exported @typescript-eslint/no-explicit-any. oxlint has
// that rule built in, so these are the original cases run against it.
describe('built-in typescript/no-explicit-any replacement', () => {
  const valid = [
    'const parsedState: unknown = JSON.parse(text)',
    'type Handler = (...args: unknown[]) => unknown',
    'const value: string = "safe"',
  ]
  const invalid = ['const parsedState: any = JSON.parse(text)']
  const files = Object.fromEntries([
    ...valid.map((code, index) => [`valid-${index}.ts`, code]),
    ...invalid.map((code, index) => [`invalid-${index}.ts`, code]),
  ])

  it('flags explicit any and nothing else', () => {
    const diagnostics = lintProject({
      linkPackage: false,
      config: {
        plugins: ['typescript'],
        categories: { correctness: 'off' },
        rules: { 'typescript/no-explicit-any': 'error' },
      },
      files,
    })
    assert.deepEqual(
      diagnostics.map((d) => [d.filename, d.code]),
      [['invalid-0.ts', 'typescript(no-explicit-any)']],
    )
  })
})
